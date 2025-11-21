// tests/unit/headers.test.ts
import { describe, it, expect } from 'vitest';
import { analyzeHeaders } from '../../src/service-worker/analysis/headers';

const freshDate = new Date().toUTCString();

describe('analyzeHeaders', () => {
  it('should correctly extract received chain', () => {
    const headers = [
      { name: 'Received', value: 'from mail.example.com (localhost [127.0.0.1])' },
      { name: 'Received', value: 'by mx.google.com with ESMTPS id abcdefg' },
      { name: 'From', value: 'test@example.com' },
    ];
    const result = analyzeHeaders(headers);
    expect(result.receivedChain).toEqual([
      'from mail.example.com (localhost [127.0.0.1])',
      'by mx.google.com with ESMTPS id abcdefg',
    ]);
  });

  it('should detect mismatch between From and Sender headers', () => {
    const headers = [
      { name: 'From', value: 'test@example.com' },
      { name: 'Sender', value: 'spoof@example.com' },
    ];
    const result = analyzeHeaders(headers);
    expect(result.headerAnomalies).toContain('Mismatch between From and Sender headers.');
  });

  it('should detect mismatch between From and Reply-To headers', () => {
    const headers = [
      { name: 'From', value: 'test@example.com' },
      { name: 'Reply-To', value: 'reply@other.com' },
    ];
    const result = analyzeHeaders(headers);
    expect(result.headerAnomalies).toContain('Mismatch between From and Reply-To headers.');
  });

  it('should ignore Reply-To on same organization domains (including subdomains and tld variants)', () => {
    const headers = [
      { name: 'From', value: 'Grammarly <hello@mail.grammarly.com>' },
      { name: 'Reply-To', value: 'noreply@grammarly.com' },
    ];
    const headersTldVariant = [
      { name: 'From', value: 'User <hello@domain1.com>' },
      { name: 'Reply-To', value: 'no-reply@sub.domain1.net' },
    ];
    expect(analyzeHeaders(headers).headerAnomalies).not.toContain('Mismatch between From and Reply-To headers.');
    expect(analyzeHeaders(headersTldVariant).headerAnomalies).not.toContain('Mismatch between From and Reply-To headers.');
  });

  it('should flag Reply-To that moves to a different organization domain', () => {
    const headers = [
      { name: 'From', value: 'Billing <hello@domain1.com>' },
      { name: 'Reply-To', value: 'no-reply@anotherdomain.net' },
    ];
    const sneakySubdomain = [
      { name: 'From', value: 'Sales <hello@domain1.com>' },
      { name: 'Reply-To', value: 'no-reply@domain1.badactor.net' },
    ];
    const webmail = [
      { name: 'From', value: 'Finance <hello@domain1.com>' },
      { name: 'Reply-To', value: 'totallylegit@gmail.com' },
    ];
    expect(analyzeHeaders(headers).headerAnomalies).toContain('Mismatch between From and Reply-To headers.');
    expect(analyzeHeaders(sneakySubdomain).headerAnomalies).toContain('Mismatch between From and Reply-To headers.');
    expect(analyzeHeaders(webmail).headerAnomalies).toContain('Mismatch between From and Reply-To headers.');
  });

  it('should not detect anomalies if headers are consistent', () => {
    const headers = [
      { name: 'From', value: 'test@example.com' },
      { name: 'Sender', value: 'test@example.com' },
      { name: 'Reply-To', value: 'test@example.com' },
      { name: 'Message-ID', value: '<message@example.com>' },
      { name: 'Date', value: freshDate },
    ];
    const result = analyzeHeaders(headers);
    expect(result.headerAnomalies).toEqual([]);
  });

  it('should handle missing optional headers without anomalies', () => {
    const headers = [
      { name: 'From', value: 'test@example.com' },
      { name: 'Message-ID', value: '<message@example.com>' },
      { name: 'Date', value: freshDate },
    ];
    const result = analyzeHeaders(headers);
    expect(result.headerAnomalies).toEqual([]);
  });
});
