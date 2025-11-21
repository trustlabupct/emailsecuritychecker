// tests/unit/domain.test.ts
import { describe, it, expect } from 'vitest';
import { analyzeDomain } from '../../src/service-worker/analysis/domain';
import { isTrustedDomain } from '../../src/service-worker/analysis/brand-database';

describe('analyzeDomain', () => {
  it('should return default analysis for empty sender email', async () => {
    const result = await analyzeDomain('');
    expect(result.domain).toBe('');
    expect(result.isPunycode).toBe(false);
    expect(result.reputationSignals).toEqual([]);
  });

  it('should correctly extract domain from sender email', async () => {
    const result = await analyzeDomain('Sender Name <test@example.com>');
    expect(result.domain).toBe('example.com');
  });

  it('should detect punycode domains', async () => {
    const result = await analyzeDomain('test@xn--example-g03a.com');
    expect(result.isPunycode).toBe(true);
    expect(result.reputationSignals).toContain('Punycode domain detected.');
  });

  it('should detect very short domains', async () => {
    const result = await analyzeDomain('test@a.com');
    expect(result.reputationSignals).toContain('Very short domain name.');
  });

  it('should detect potentially suspicious TLDs', async () => {
    const result = await analyzeDomain('test@example.xyz');
    expect(result.reputationSignals).toContain('High-risk TLD detected.');
  });

  it('should detect high entropy domains', async () => {
    // A domain with high entropy (random-looking)
    const result = await analyzeDomain('test@asdfghjkl.com');
    expect(result.reputationSignals).toContain('High entropy domain name (random-looking).');
  });

  it('should combine multiple reputation signals', async () => {
    const result = await analyzeDomain('test@xn--a.xyz');
    expect(result.isPunycode).toBe(true);
    expect(result.reputationSignals).toContain('Punycode domain detected.');
    expect(result.reputationSignals).toContain('Very short domain name.');
    expect(result.reputationSignals).toContain('High-risk TLD detected.');
  });

  it('should treat key senders (.gov, facebookmail, instagram) as trusted domains', () => {
    expect(isTrustedDomain('agency.gov')).toBe(true);
    expect(isTrustedDomain('agency.gov.es')).toBe(true);
    expect(isTrustedDomain('facebookmail.com')).toBe(true);
    expect(isTrustedDomain('instagram.com')).toBe(true);
  });
});
