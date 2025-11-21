// src/service-worker/analysis/headers.ts
import { HeaderAnalysis, ReceivedChainDetail, ExtendedHeaderInfo } from '../../shared/types';
import { logger } from '../utils/logger';

const COMMON_WEBMAIL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'icloud.com',
  'proton.me',
  'protonmail.com',
  'tutanota.com'
];

function extractEmailDomain(value?: string): string | undefined {
  if (!value) return undefined;
  const emailMatch = value.match(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return emailMatch ? emailMatch[2].toLowerCase() : undefined;
}

function getBaseDomain(domain: string): string {
  const normalized = domain.toLowerCase();
  const parts = normalized.split('.').filter(Boolean);
  if (parts.length <= 2) return normalized;

  const publicSuffixes = new Set([
    'co.uk', 'gov.uk', 'gov.au', 'com.au', 'org.uk', 'edu.au', 'gov.es'
  ]);

  const suffix = parts.slice(-2).join('.');
  if (publicSuffixes.has(suffix) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }

  return suffix;
}

function getRootLabel(domain: string): string | undefined {
  const base = getBaseDomain(domain);
  const parts = base.split('.');
  return parts.length > 0 ? parts[0] : undefined;
}

function sameOrganizationDomain(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const baseA = getBaseDomain(a);
  const baseB = getBaseDomain(b);
  if (baseA === baseB || a.endsWith(`.${baseB}`) || b.endsWith(`.${baseA}`)) {
    return true;
  }
  const rootA = getRootLabel(a);
  const rootB = getRootLabel(b);
  return !!rootA && rootA === rootB;
}

export function analyzeHeaders(headers: { name: string; value: string }[]): HeaderAnalysis {
  // Filter out any malformed headers
  const validHeaders = headers.filter(h => h && typeof h.name === 'string' && typeof h.value === 'string');

  const receivedChain: string[] = validHeaders
    .filter(h => h.name.toLowerCase() === 'received')
    .map(h => h.value);

  const headerAnomalies: string[] = [];

  const fromHeader = validHeaders.find(h => h.name.toLowerCase() === 'from')?.value;
  const senderHeader = validHeaders.find(h => h.name.toLowerCase() === 'sender')?.value;
  const replyToHeader = validHeaders.find(h => h.name.toLowerCase() === 'reply-to')?.value;

  // Check consistency between From, Sender, Reply-To
  if (fromHeader && senderHeader && fromHeader !== senderHeader) {
    headerAnomalies.push('Mismatch between From and Sender headers.');
  }
  if (fromHeader && replyToHeader) {
    const fromDomain = extractEmailDomain(fromHeader);
    const replyDomain = extractEmailDomain(replyToHeader);

    if (fromDomain && replyDomain) {
      const sameOrg = sameOrganizationDomain(fromDomain, replyDomain);
      const fromIsWebmail = COMMON_WEBMAIL_DOMAINS.some(domain =>
        fromDomain === domain || fromDomain.endsWith(`.${domain}`)
      );
      const replyIsWebmail = COMMON_WEBMAIL_DOMAINS.some(domain =>
        replyDomain === domain || replyDomain.endsWith(`.${domain}`)
      );

      if (!sameOrg || (replyIsWebmail && !fromIsWebmail && fromDomain !== replyDomain)) {
        headerAnomalies.push('Mismatch between From and Reply-To headers.');
      }
    } else if (fromHeader !== replyToHeader) {
      // Fallback to simple string comparison if domains cannot be parsed
      headerAnomalies.push('Mismatch between From and Reply-To headers.');
    }
  }

  // T107: Detect header injection
  const injectionDetected = detectHeaderInjection(validHeaders, headerAnomalies);

  // T106: Parse extended headers
  const extendedHeaders = parseExtendedHeaders(validHeaders, headerAnomalies);

  // T108: Perform received chain forensics
  const receivedChainDetails = parseReceivedChainForensics(receivedChain);

  return {
    receivedChain,
    receivedChainDetails,
    headerAnomalies,
    extendedHeaders,
    injectionDetected,
  };
}

/**
 * T106: Parse extended header information
 */
function parseExtendedHeaders(
  headers: { name: string; value: string }[],
  anomalies: string[]
): ExtendedHeaderInfo {
  const extendedInfo: ExtendedHeaderInfo = {};

  // Return-Path
  const returnPath = headers.find(h => h.name.toLowerCase() === 'return-path');
  if (returnPath) {
    extendedInfo.returnPath = returnPath.value.trim();
  }

  // List-ID
  const listId = headers.find(h => h.name.toLowerCase() === 'list-id');
  if (listId) {
    extendedInfo.listId = listId.value.trim();
  }

  // X-Original-Authentication-Results
  const xOriginalAuthResults = headers.find(h => h.name.toLowerCase() === 'x-original-authentication-results');
  if (xOriginalAuthResults) {
    extendedInfo.xOriginalAuthResults = xOriginalAuthResults.value.trim();
  }

  // X-Originating-IP
  const xOriginatingIp = headers.find(h =>
    h.name.toLowerCase() === 'x-originating-ip' ||
    h.name.toLowerCase() === 'x-sender-ip'
  );
  if (xOriginatingIp) {
    extendedInfo.xOriginatingIp = xOriginatingIp.value.trim();
  }

  // X-Mailer
  const xMailer = headers.find(h => h.name.toLowerCase() === 'x-mailer' || h.name.toLowerCase() === 'user-agent');
  if (xMailer) {
    extendedInfo.xMailer = xMailer.value.trim();
  }

  // X-Priority
  const xPriority = headers.find(h =>
    h.name.toLowerCase() === 'x-priority' ||
    h.name.toLowerCase() === 'priority' ||
    h.name.toLowerCase() === 'importance'
  );
  if (xPriority) {
    extendedInfo.xPriority = xPriority.value.trim();
    // Flag high priority as potentially suspicious if combined with other factors
    if (xPriority.value.toLowerCase().includes('high') || xPriority.value === '1') {
      anomalies.push('Email marked as high priority.');
    }
  }

  // List-Unsubscribe
  const listUnsubscribe = headers.find(h => h.name.toLowerCase() === 'list-unsubscribe');
  if (listUnsubscribe) {
    extendedInfo.listUnsubscribe = listUnsubscribe.value.trim();
  }

  // Message-ID
  const messageId = headers.find(h => h.name.toLowerCase() === 'message-id');
  if (messageId) {
    extendedInfo.messageId = messageId.value.trim();

    // Validate Message-ID format
    if (!isValidMessageId(messageId.value)) {
      anomalies.push('Malformed Message-ID header.');
    }
  } else {
    anomalies.push('Missing Message-ID header.');
  }

  // Date
  const dateHeader = headers.find(h => h.name.toLowerCase() === 'date');
  if (dateHeader) {
    extendedInfo.date = dateHeader.value.trim();
    extendedInfo.dateAnomalies = validateDateHeader(dateHeader.value);
    if (extendedInfo.dateAnomalies.length > 0) {
      anomalies.push(...extendedInfo.dateAnomalies);
    }
  } else {
    anomalies.push('Missing Date header.');
  }

  return extendedInfo;
}

/**
 * T107: Detect header injection attacks
 */
function detectHeaderInjection(
  headers: { name: string; value: string }[],
  anomalies: string[]
): boolean {
  let injectionDetected = false;

  // Check for duplicate critical headers (From, Subject, Message-ID)
  const criticalHeaders = ['from', 'subject', 'message-id', 'date'];
  const headerCounts = new Map<string, number>();

  for (const header of headers) {
    const lowerName = header.name.toLowerCase();
    if (criticalHeaders.includes(lowerName)) {
      const count = (headerCounts.get(lowerName) || 0) + 1;
      headerCounts.set(lowerName, count);
      if (count > 1) {
        anomalies.push(`Duplicate ${header.name} header detected (header injection).`);
        injectionDetected = true;
      }
    }
  }

  // Check for conflicting Message-IDs
  const messageIds = headers.filter(h => h.name.toLowerCase() === 'message-id');
  if (messageIds.length > 1) {
    const uniqueIds = new Set(messageIds.map(h => h.value.trim()));
    if (uniqueIds.size > 1) {
      anomalies.push('Conflicting Message-ID headers detected.');
      injectionDetected = true;
    }
  }

  // Check for malformed header folding (CRLF injection)
  for (const header of headers) {
    // Check for unfolded newlines (potential injection)
    if (header.value.includes('\n') && !header.value.match(/\r?\n[ \t]/)) {
      anomalies.push(`Suspicious newline in ${header.name} header (possible injection).`);
      injectionDetected = true;
    }

    // Check for null bytes
    if (header.value.includes('\0') || header.name.includes('\0')) {
      anomalies.push(`Null byte detected in ${header.name} header (injection attack).`);
      injectionDetected = true;
    }

    // Check for suspicious control characters
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(header.value)) {
      anomalies.push(`Control characters detected in ${header.name} header.`);
      injectionDetected = true;
    }
  }

  return injectionDetected;
}

/**
 * T108: Parse received chain for forensic analysis
 */
function parseReceivedChainForensics(receivedChain: string[]): ReceivedChainDetail[] {
  const details: ReceivedChainDetail[] = [];
  const timestamps: Date[] = [];

  for (let i = 0; i < receivedChain.length; i++) {
    const received = receivedChain[i];
    const detail: ReceivedChainDetail = {
      index: i,
    };

    // Parse 'from' field
    const fromMatch = received.match(/from\s+([^\s(]+)/i);
    if (fromMatch) {
      detail.from = fromMatch[1].trim();
    }

    // Parse 'by' field
    const byMatch = received.match(/by\s+([^\s(]+)/i);
    if (byMatch) {
      detail.by = byMatch[1].trim();
    }

    // Parse timestamp
    const timestampMatch = received.match(/;\s*(.+)$/);
    if (timestampMatch) {
      detail.timestamp = timestampMatch[1].trim();
      try {
        const date = new Date(detail.timestamp);
        if (!isNaN(date.getTime())) {
          timestamps.push(date);

          // Calculate hop duration
          if (i > 0 && timestamps.length > 1) {
            const prevDate = timestamps[timestamps.length - 2];
            detail.hopDuration = Math.abs(date.getTime() - prevDate.getTime()) / 1000;

            // Flag suspicious hop durations
            if (detail.hopDuration < 0) {
              logger.warn(`Negative hop duration at index ${i}: ${detail.hopDuration}s`);
            } else if (detail.hopDuration > 86400) { // More than 1 day
              logger.warn(`Very long hop duration at index ${i}: ${detail.hopDuration}s`);
            }
          }
        }
      } catch (e) {
        logger.warn(`Failed to parse timestamp: ${detail.timestamp}`);
      }
    }

    // Parse protocol
    const protocolMatch = received.match(/with\s+([A-Z]+)/i);
    if (protocolMatch) {
      detail.protocol = protocolMatch[1].toUpperCase();
    }

    // Check for TLS/encryption
    detail.tlsUsed = /\b(TLS|SSL|STARTTLS|ESMTPS|SMTPS)\b/i.test(received);

    // Extract IP address
    const ipMatch = received.match(/\[?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]?/) ||
      received.match(/\[?((?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4})\]?/);
    if (ipMatch) {
      detail.ipAddress = ipMatch[1];

      // T108: Rough geo heuristics
      detail.geoHeuristic = getGeoHeuristic(detail.ipAddress);
    }

    details.push(detail);
  }

  return details;
}

/**
 * T108: Rough geographic heuristic based on IP address ranges
 * This is a very basic implementation - production would use a GeoIP database
 */
function getGeoHeuristic(ip: string): string | undefined {
  // Check for private/local IP ranges
  if (isPrivateIP(ip)) {
    return 'Local/Private';
  }

  // Check for known cloud provider ranges (very basic)
  const firstOctet = parseInt(ip.split('.')[0]);

  // AWS IP ranges (sample)
  if ([3, 13, 15, 18, 35, 52, 54].includes(firstOctet)) {
    return 'Cloud Provider (likely AWS)';
  }

  // Google Cloud (sample)
  if ([34, 35].includes(firstOctet)) {
    return 'Cloud Provider (likely GCP)';
  }

  // This would be replaced with actual GeoIP lookup in production
  return 'Unknown';
}

/**
 * Check if IP is in private range
 */
function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(p => parseInt(p));
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }

  // 10.0.0.0/8
  if (parts[0] === 10) return true;

  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;

  // 127.0.0.0/8 (loopback)
  if (parts[0] === 127) return true;

  return false;
}

/**
 * Validate Message-ID format (RFC 5322)
 */
function isValidMessageId(messageId: string): boolean {
  const trimmed = messageId.trim();

  // Message-ID should be in format: <id@domain>
  const pattern = /^<[^@\s]+@[^@\s>]+>$/;
  return pattern.test(trimmed);
}

/**
 * Validate Date header and detect anomalies
 */
function validateDateHeader(dateValue: string): string[] {
  const anomalies: string[] = [];

  try {
    const emailDate = new Date(dateValue);
    const now = new Date();

    if (isNaN(emailDate.getTime())) {
      anomalies.push('Date header could not be parsed.');
      return anomalies;
    }

    // Check if date is in the future
    if (emailDate > now) {
      const diffMinutes = (emailDate.getTime() - now.getTime()) / (1000 * 60);
      if (diffMinutes > 5) { // Allow 5 minutes for clock skew
        anomalies.push(`Email date is in the future by ${Math.round(diffMinutes)} minutes.`);
      }
    }

    // Check if date is very old (more than 1 year)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (emailDate < oneYearAgo) {
      anomalies.push('Email date is more than 1 year old.');
    }

    // Check if date is suspiciously old (before email was common, pre-1990)
    const epoch = new Date('1990-01-01');
    if (emailDate < epoch) {
      anomalies.push('Email date is before 1990 (highly suspicious).');
    }

  } catch (e) {
    anomalies.push('Date header parsing error.');
  }

  return anomalies;
}
