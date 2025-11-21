// src/service-worker/utils/gmail-id.ts

export interface ParsedGmailIds {
  candidates: string[];
  probableThreadId?: string;
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_LOOKUP: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  for (let i = 0; i < BASE64_ALPHABET.length; i += 1) {
    map[BASE64_ALPHABET[i]] = i;
  }
  return map;
})();

function decodeBase64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLength);

  const bytes: number[] = [];

  for (let i = 0; i < padded.length; i += 4) {
    const c1 = BASE64_LOOKUP[padded[i]];
    const c2 = BASE64_LOOKUP[padded[i + 1]];
    const char3 = padded[i + 2];
    const char4 = padded[i + 3];

    const c3 = char3 === '=' ? 64 : BASE64_LOOKUP[char3];
    const c4 = char4 === '=' ? 64 : BASE64_LOOKUP[char4];

    if (c1 === undefined || c2 === undefined || c3 === undefined || c4 === undefined) {
      throw new Error('Invalid base64 character encountered while decoding Gmail ID.');
    }

    const triple = (c1 << 18) | (c2 << 12) | ((c3 & 63) << 6) | (c4 & 63);

    bytes.push((triple >> 16) & 0xff);
    if (char3 !== '=') {
      bytes.push((triple >> 8) & 0xff);
    }
    if (char4 !== '=') {
      bytes.push(triple & 0xff);
    }
  }

  return Uint8Array.from(bytes);
}

function bytesToHex(bytes: Uint8Array, start: number, length: number): string {
  let hex = '';
  const end = Math.min(start + length, bytes.length);
  for (let i = start; i < end; i += 1) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export function parseGmailUiMessageId(gmailUiId: string): ParsedGmailIds {
  const trimmed = gmailUiId.trim();
  if (!trimmed) {
    throw new Error('Empty Gmail message identifier.');
  }

  const bytes = decodeBase64UrlToBytes(trimmed);
  if (bytes.length < 8) {
    throw new Error('Unable to decode Gmail message identifier.');
  }

  const candidates: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 8) {
    if (offset + 8 <= bytes.length) {
      candidates.push(bytesToHex(bytes, offset, 8));
    }
  }

  const probableThreadId = candidates[1] ?? candidates[0];

  return { candidates, probableThreadId };
}
