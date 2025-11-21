// tests/unit/authentication.test.ts
import { describe, it, expect } from 'vitest';
import { parseAuthenticationResults } from '../../src/service-worker/analysis/authentication';

describe('parseAuthenticationResults', () => {
  it('should return default results if Authentication-Results header is missing', () => {
    const headers = [{ name: 'From', value: 'test@example.com' }];
    const result = parseAuthenticationResults(headers);
    expect(result.spf.result).toBe('none');
    expect(result.dkim.result).toBe('none');
    expect(result.dmarc.result).toBe('none');
    expect(result.arc.result).toBe('none');
  });

  it('should correctly parse SPF results', () => {
    const headers = [{ name: 'Authentication-Results', value: 'mx.google.com; spf=pass (google.com: domain of test@example.com designates 1.2.3.4 as permitted sender) smtp.mailfrom=test@example.com' }];
    const result = parseAuthenticationResults(headers);
    expect(result.spf.result).toBe('pass');
    expect(result.spf.domain).toBe('example.com');
  });

  it('should correctly parse DKIM results', () => {
    const headers = [{ name: 'Authentication-Results', value: 'mx.google.com; dkim=pass header.i=@example.com header.s=default header.b=abcdefg' }];
    const result = parseAuthenticationResults(headers);
    expect(result.dkim.result).toBe('pass');
    expect(result.dkim.domain).toBe('example.com');
    expect(result.dkim.selector).toBe('default');
  });

  it('should correctly parse DMARC results', () => {
    const headers = [{ name: 'Authentication-Results', value: 'mx.google.com; dmarc=pass (p=none dis=none) header.from=example.com' }];
    const result = parseAuthenticationResults(headers);
    expect(result.dmarc.result).toBe('pass');
  });

  it('should correctly parse ARC results', () => {
    const headers = [
      { name: 'Authentication-Results', value: 'mx.google.com; arc=pass (i=1)' },
      { name: 'ARC-Seal', value: 'i=1; a=rsa-sha256; cv=pass; d=google.com; s=arc-20240605; b=abc123' },
      { name: 'ARC-Message-Signature', value: 'i=1; a=rsa-sha256; d=google.com; s=arc-20240605; b=def456' },
      { name: 'ARC-Authentication-Results', value: 'i=1; mx.google.com; spf=pass smtp.mailfrom=test@example.com' },
    ];
    const result = parseAuthenticationResults(headers);
    expect(result.arc.result).toBe('pass');
    expect(result.arc.sealCount).toBe(1);
  });

  it('should handle multiple authentication results in one header', () => {
    const headers = [
      { name: 'Authentication-Results', value: 'mx.google.com; spf=pass (google.com: domain of test@example.com designates 1.2.3.4 as permitted sender) smtp.mailfrom=test@example.com; dkim=pass header.i=@example.com header.s=default header.b=abcdefg; dmarc=pass (p=none dis=none) header.from=example.com' },
      { name: 'ARC-Seal', value: 'i=1; a=rsa-sha256; cv=pass; d=google.com; s=arc-20240605; b=abc123' },
      { name: 'ARC-Message-Signature', value: 'i=1; a=rsa-sha256; d=google.com; s=arc-20240605; b=def456' },
      { name: 'ARC-Authentication-Results', value: 'i=1; mx.google.com; spf=pass smtp.mailfrom=test@example.com' },
    ];
    const result = parseAuthenticationResults(headers);
    expect(result.spf.result).toBe('pass');
    expect(result.dkim.result).toBe('pass');
    expect(result.dmarc.result).toBe('pass');
    expect(result.arc.result).toBe('pass');
    expect(result.arc.sealCount).toBe(1);
  });

  it('should handle missing specific authentication results', () => {
    const headers = [{ name: 'Authentication-Results', value: 'mx.google.com; spf=pass' }];
    const result = parseAuthenticationResults(headers);
    expect(result.spf.result).toBe('pass');
    expect(result.dkim.result).toBe('none');
    expect(result.dmarc.result).toBe('none');
  });
});
