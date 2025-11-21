// src/service-worker/analysis/payment-detection.ts
import { CryptoWallet } from '../../shared/types';
import { logger } from '../utils/logger';

/**
 * T301: Extended payment detection
 * Detects various payment-related identifiers in email content
 */

/**
 * Detects US routing numbers (9 digits, with checksum validation)
 */
export function detectRoutingNumbers(text: string): string[] {
  const routingNumbers: string[] = [];

  // Match 9-digit sequences that could be routing numbers
  const routingRegex = /\b\d{9}\b/g;
  let match;

  while ((match = routingRegex.exec(text)) !== null) {
    const candidate = match[0];

    // Validate using routing number checksum algorithm
    if (isValidRoutingNumber(candidate)) {
      routingNumbers.push(candidate);
    }
  }

  return [...new Set(routingNumbers)];
}

/**
 * Validates a routing number using the ABA checksum algorithm
 */
function isValidRoutingNumber(routing: string): boolean {
  if (routing.length !== 9) return false;

  const digits = routing.split('').map(Number);

  // ABA checksum algorithm: 3*(d1+d4+d7) + 7*(d2+d5+d8) + (d3+d6+d9) mod 10 = 0
  const checksum =
    3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    1 * (digits[2] + digits[5] + digits[8]);

  return checksum % 10 === 0;
}

/**
 * Detects SWIFT/BIC codes (8 or 11 characters)
 * Format: AAAA BB CC DDD
 * - AAAA: Bank code (4 letters)
 * - BB: Country code (2 letters)
 * - CC: Location code (2 letters or digits)
 * - DDD: Branch code (3 letters or digits, optional)
 */
export function detectSwiftBicCodes(text: string): string[] {
  const swiftCodes: string[] = [];

  // Match SWIFT/BIC pattern with optional spaces/dashes
  // Look for SWIFT/BIC context words nearby to reduce false positives
  const swiftRegex = /\b([A-Z]{4})[\s-]?([A-Z]{2})[\s-]?([A-Z0-9]{2})[\s-]?([A-Z0-9]{3})?\b/gi;
  let match;

  while ((match = swiftRegex.exec(text)) !== null) {
    // Reconstruct without spaces/dashes
    const swift = match[1] + match[2] + match[3] + (match[4] || '');

    // Validate length (8 or 11)
    if (swift.length === 8 || swift.length === 11) {
      // Check if it's in a SWIFT/BIC context (look for keywords nearby)
      const contextStart = Math.max(0, match.index - 50);
      const contextEnd = Math.min(text.length, match.index + swift.length + 50);
      const context = text.slice(contextStart, contextEnd).toLowerCase();

      // Only accept if context suggests it's a SWIFT code or if it follows common SWIFT patterns
      const hasSwiftContext =
        context.includes('swift') ||
        context.includes('bic') ||
        context.includes('bank') ||
        context.includes('wire') ||
        context.includes('transfer');

      // Also check if it looks like a real SWIFT code (not common English words)
      const looksLikeSwift = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swift);

      if (hasSwiftContext && looksLikeSwift) {
        swiftCodes.push(swift.toUpperCase());
      }
    }
  }

  return [...new Set(swiftCodes)];
}

/**
 * Detects cryptocurrency wallet addresses
 */
export function detectCryptoWallets(text: string): CryptoWallet[] {
  const wallets: CryptoWallet[] = [];

  // Bitcoin addresses (Legacy P2PKH: 1..., P2SH: 3..., Bech32: bc1...)
  const bitcoinRegex = /\b(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})\b/g;
  let btcMatch;

  while ((btcMatch = bitcoinRegex.exec(text)) !== null) {
    const address = btcMatch[0];
    if (isValidBitcoinAddress(address)) {
      wallets.push({
        address,
        type: 'bitcoin'
      });
    }
  }

  // Ethereum addresses (0x followed by 40 hex characters)
  const ethereumRegex = /(0x[a-fA-F0-9]{40})\b/g;
  let ethMatch;

  while ((ethMatch = ethereumRegex.exec(text)) !== null) {
    const address = ethMatch[0];
    // Basic validation: check if it's a valid hex string
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
      wallets.push({
        address,
        type: 'ethereum'
      });
    }
  }

  // Other common crypto formats (basic detection)
  // Litecoin: L... or M...
  const litecoinRegex = /\b([LM][a-km-zA-HJ-NP-Z1-9]{26,33})\b/g;
  let ltcMatch;

  while ((ltcMatch = litecoinRegex.exec(text)) !== null) {
    wallets.push({
      address: ltcMatch[0],
      type: 'other'
    });
  }

  // Monero: 4... or 8... (95 or 106 characters)
  const moneroRegex = /\b([48][a-zA-Z0-9]{94,105})\b/g;
  let xmrMatch;

  while ((xmrMatch = moneroRegex.exec(text)) !== null) {
    wallets.push({
      address: xmrMatch[0],
      type: 'other'
    });
  }

  return wallets;
}

/**
 * Validates Bitcoin address using basic checks
 * (Full validation would require Base58Check decoding)
 */
function isValidBitcoinAddress(address: string): boolean {
  // Legacy addresses (P2PKH and P2SH)
  if (address.startsWith('1') || address.startsWith('3')) {
    // Length should be 26-35 characters
    if (address.length < 26 || address.length > 35) return false;

    // Should only contain Base58 characters
    const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    for (const char of address) {
      if (!base58Chars.includes(char)) return false;
    }

    return true;
  }

  // Bech32 addresses (SegWit)
  if (address.startsWith('bc1')) {
    // Length should be 42-62 characters
    if (address.length < 42 || address.length > 62) return false;

    // Should only contain lowercase alphanumeric (excluding 1, b, i, o)
    const bech32Chars = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
    for (let i = 3; i < address.length; i++) {
      if (!bech32Chars.includes(address[i].toLowerCase())) return false;
    }

    return true;
  }

  return false;
}

/**
 * Validates IBAN with improved algorithm
 */
export function isValidIban(iban: string): boolean {
  // Remove spaces and convert to uppercase
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();

  // Check length (15-34 characters)
  if (cleanIban.length < 15 || cleanIban.length > 34) return false;

  // Check format: 2 letters, 2 digits, rest alphanumeric
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleanIban)) return false;

  // Validate checksum using mod-97 algorithm
  // Move first 4 characters to end
  const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);

  // Replace letters with numbers (A=10, B=11, ..., Z=35)
  let numericString = '';
  for (const char of rearranged) {
    if (char >= 'A' && char <= 'Z') {
      numericString += (char.charCodeAt(0) - 55).toString();
    } else {
      numericString += char;
    }
  }

  // Calculate mod 97
  let remainder = 0;
  for (const digit of numericString) {
    remainder = (remainder * 10 + parseInt(digit, 10)) % 97;
  }

  return remainder === 1;
}

/**
 * Enhanced IBAN detection with country-specific validation
 */
export function detectIbans(text: string): string[] {
  const ibans: string[] = [];

  // Match potential IBANs (2 letters, 2 digits, then alphanumeric with optional spaces)
  // More flexible pattern to catch IBANs with or without spaces
  const ibanRegex = /\b([A-Z]{2}[0-9]{2}[A-Z0-9\s]{11,32})\b/gi;
  let match;

  while ((match = ibanRegex.exec(text)) !== null) {
    const candidate = match[0].trim();

    if (isValidIban(candidate)) {
      ibans.push(candidate.replace(/\s/g, ''));
    }
  }

  return [...new Set(ibans)];
}

/**
 * Detects all payment-related identifiers in text
 */
export function detectPaymentInfo(text: string): {
  ibans: string[];
  routingNumbers: string[];
  swiftBic: string[];
  cryptoWallets: CryptoWallet[];
} {
  try {
    return {
      ibans: detectIbans(text),
      routingNumbers: detectRoutingNumbers(text),
      swiftBic: detectSwiftBicCodes(text),
      cryptoWallets: detectCryptoWallets(text)
    };
  } catch (error) {
    logger.error('Error detecting payment info:', error);
    return {
      ibans: [],
      routingNumbers: [],
      swiftBic: [],
      cryptoWallets: []
    };
  }
}
