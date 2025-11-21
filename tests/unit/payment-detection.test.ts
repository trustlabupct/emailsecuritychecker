// tests/unit/payment-detection.test.ts
import { describe, it, expect } from 'vitest';
import {
  detectRoutingNumbers,
  detectSwiftBicCodes,
  detectCryptoWallets,
  detectIbans,
  detectPaymentInfo
} from '../../src/service-worker/analysis/payment-detection';

describe('Payment Detection', () => {
  describe('detectRoutingNumbers', () => {
    it('should detect valid US routing numbers', () => {
      const text = 'Please wire to routing number 021000021 for payment.';
      const result = detectRoutingNumbers(text);
      expect(result).toContain('021000021');
    });

    it('should validate routing number checksums', () => {
      const text = 'Invalid routing: 123456789. Valid routing: 021000021';
      const result = detectRoutingNumbers(text);
      expect(result).not.toContain('123456789');
      expect(result).toContain('021000021');
    });

    it('should not detect routing numbers in non-routing contexts', () => {
      const text = 'Phone number: 987654321';
      const result = detectRoutingNumbers(text);
      expect(result).toHaveLength(0);
    });

    it('should detect multiple routing numbers', () => {
      const text = 'Routing 021000021 or 011401533 are valid.';
      const result = detectRoutingNumbers(text);
      expect(result).toHaveLength(2);
    });
  });

  describe('detectSwiftBicCodes', () => {
    it('should detect 8-character SWIFT codes', () => {
      const text = 'SWIFT: CHASUS33';
      const result = detectSwiftBicCodes(text);
      expect(result).toContain('CHASUS33');
    });

    it('should detect 11-character SWIFT codes with branch', () => {
      const text = 'BIC: CHASUS33XXX';
      const result = detectSwiftBicCodes(text);
      expect(result).toContain('CHASUS33XXX');
    });

    it('should handle SWIFT codes with spaces', () => {
      const text = 'SWIFT: CHAS US 33 XXX';
      const result = detectSwiftBicCodes(text);
      expect(result).toContain('CHASUS33XXX');
    });

    it('should handle SWIFT codes with hyphens', () => {
      const text = 'BIC: CHAS-US-33';
      const result = detectSwiftBicCodes(text);
      expect(result).toContain('CHASUS33');
    });

    it('should not detect invalid SWIFT codes', () => {
      const text = 'ABCD1234'; // Too many numbers
      const result = detectSwiftBicCodes(text);
      expect(result).toHaveLength(0);
    });

    it('should detect multiple SWIFT codes', () => {
      const text = 'Wire transfer from SWIFT CHASUS33 to bank SWIFT DEUTDEFF';
      const result = detectSwiftBicCodes(text);
      expect(result).toHaveLength(2);
    });
  });

  describe('detectCryptoWallets', () => {
    it('should detect Bitcoin P2PKH addresses', () => {
      const text = 'Send BTC to 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
      const result = detectCryptoWallets(text);
      expect(result.some(w => w.type === 'bitcoin')).toBe(true);
    });

    it('should detect Bitcoin P2SH addresses', () => {
      const text = 'Address: 3J98t1WpEZ73CNmYviecrnyiWrnqRhWNLy';
      const result = detectCryptoWallets(text);
      expect(result.some(w => w.type === 'bitcoin')).toBe(true);
    });

    it('should detect Bitcoin Bech32 addresses', () => {
      const text = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
      const result = detectCryptoWallets(text);
      expect(result.some(w => w.type === 'bitcoin' && w.address.startsWith('bc1'))).toBe(true);
    });

    it('should detect Ethereum addresses', () => {
      const text = 'ETH: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
      const result = detectCryptoWallets(text);
      expect(result.some(w => w.type === 'ethereum')).toBe(true);
    });

    it('should detect multiple wallet addresses', () => {
      const text = 'BTC: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa or ETH: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
      const result = detectCryptoWallets(text);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should not detect invalid wallet addresses', () => {
      const text = '0xinvalidaddress';
      const result = detectCryptoWallets(text);
      expect(result).toHaveLength(0);
    });
  });

  describe('detectIbans', () => {
    it('should detect valid German IBAN', () => {
      const text = 'IBAN: DE89370400440532013000';
      const result = detectIbans(text);
      expect(result).toContain('DE89370400440532013000');
    });

    it('should detect valid UK IBAN', () => {
      const text = 'GB82WEST12345698765432';
      const result = detectIbans(text);
      expect(result).toContain('GB82WEST12345698765432');
    });

    it('should detect IBAN with spaces', () => {
      const text = 'IBAN: DE89 3704 0044 0532 0130 00';
      const result = detectIbans(text);
      expect(result[0]).toBe('DE89370400440532013000');
    });

    it('should validate IBAN checksums', () => {
      const text = 'Invalid: DE00370400440532013000. Valid: DE89370400440532013000';
      const result = detectIbans(text);
      expect(result).not.toContain('DE00370400440532013000');
      expect(result).toContain('DE89370400440532013000');
    });

    it('should detect multiple IBANs', () => {
      const text = 'From: DE89370400440532013000 to: GB82 WEST 1234 5698 7654 32';
      const result = detectIbans(text);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle various IBAN formats', () => {
      const text = 'FR1420041010050500013M02606';
      const result = detectIbans(text);
      expect(result).toContain('FR1420041010050500013M02606');
    });
  });

  describe('detectPaymentInfo (integrated)', () => {
    it('should detect all payment types in a single text', () => {
      const text = `
        Bank wire transfer details:
        IBAN number: DE89 3704 0044 0532 0130 00
        SWIFT code: CHASUS33
        Routing number: 021000021
        Bitcoin address: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
      `;
      const result = detectPaymentInfo(text);

      expect(result.ibans.length).toBeGreaterThanOrEqual(1);
      expect(result.swiftBic.length).toBeGreaterThanOrEqual(1);
      expect(result.routingNumbers.length).toBeGreaterThanOrEqual(1);
      expect(result.cryptoWallets.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty arrays when no payment info found', () => {
      const text = 'Just a regular email with no details.';
      const result = detectPaymentInfo(text);

      expect(result.ibans).toHaveLength(0);
      expect(result.swiftBic).toHaveLength(0);
      expect(result.routingNumbers).toHaveLength(0);
      expect(result.cryptoWallets).toHaveLength(0);
    });

    it('should handle malformed text gracefully', () => {
      const text = '!@#$%^&*()';
      const result = detectPaymentInfo(text);

      expect(result.ibans).toHaveLength(0);
      expect(result.swiftBic).toHaveLength(0);
      expect(result.routingNumbers).toHaveLength(0);
      expect(result.cryptoWallets).toHaveLength(0);
    });

    it('should deduplicate payment identifiers', () => {
      const text = 'IBAN: DE89370400440532013000. Repeat: DE89370400440532013000';
      const result = detectPaymentInfo(text);

      expect(result.ibans).toHaveLength(1);
    });
  });
});
