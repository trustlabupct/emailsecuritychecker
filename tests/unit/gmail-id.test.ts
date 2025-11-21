// tests/unit/gmail-id.test.ts
import { describe, it, expect } from 'vitest';
import { parseGmailUiMessageId } from '../../src/service-worker/utils/gmail-id';

describe('parseGmailUiMessageId', () => {
  it('should extract message and thread IDs from a Gmail UI identifier', () => {
    const uiId = 'FMfcgzQcqbVqNTsRdCWHXmRjdZmwrJNv';
    const result = parseGmailUiMessageId(uiId);

    expect(result.candidates).toEqual([
      '14c7dc83341ca9b5',
      '6a353b117425875e',
      '64637599b0ac936f',
    ]);
    expect(result.probableThreadId).toBe('6a353b117425875e');
  });

  it('should decode other Gmail IDs consistently', () => {
    const result = parseGmailUiMessageId('FMfcgzQbgJQhkdJmsGctJnmzcrRbQnnG');
    expect(result.candidates).toEqual([
      '14c7dc83341b8094',
      '2191d266b0672d26',
      '79b372b45b4279c6',
    ]);
    expect(result.probableThreadId).toBe('2191d266b0672d26');
  });

  it('should throw for an empty identifier', () => {
    expect(() => parseGmailUiMessageId('')).toThrowError('Empty Gmail message identifier.');
  });
});
