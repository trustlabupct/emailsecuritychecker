// tests/unit/risk-score.test.ts
import { describe, it, expect } from 'vitest';
import { calculateRiskScore } from '../../src/service-worker/analysis/risk-score';
import { AuthenticationResults, HeaderAnalysis, DomainAnalysis, ContentAnalysis } from '../../src/shared/types';

describe('calculateRiskScore', () => {
  const defaultAuth: AuthenticationResults = {
    spf: { result: 'pass', domain: 'example.com' },
    dkim: { result: 'pass', domain: 'example.com', selector: 's1' },
    dmarc: { result: 'pass' },
    arc: { result: 'none', sealCount: 0 },
    alignment: { spfAligned: true, dkimAligned: true },
  };
  const defaultHeaders: HeaderAnalysis = {
    receivedChain: [],
    headerAnomalies: [],
  };
  const defaultDomain: DomainAnalysis = {
    domain: 'example.com',
    isPunycode: false,
    reputationSignals: [],
  };
  const defaultContent: ContentAnalysis = {
    detectedIbans: [],
    suspiciousLinks: [],
    linkTextMismatches: [],
    urgencyIndicators: [],
  };

  it('should return "low" for a clean email', () => {
    const score = calculateRiskScore(defaultAuth, defaultHeaders, defaultDomain, defaultContent);
    expect(score).toBe('low');
  });

  it('should raise medium risk for DMARC fail', () => {
    const auth: AuthenticationResults = { ...defaultAuth, dmarc: { result: 'fail' } };
    const score = calculateRiskScore(auth, defaultHeaders, defaultDomain, defaultContent);
    expect(score).toBe('medium');
  });

  it('should keep SPF fail alone at low risk', () => {
    const auth: AuthenticationResults = { ...defaultAuth, spf: { result: 'fail', domain: 'example.com' } };
    const score = calculateRiskScore(auth, defaultHeaders, defaultDomain, defaultContent);
    expect(score).toBe('low');
  });

  it('should raise medium risk for punycode domain', () => {
    const domain: DomainAnalysis = { ...defaultDomain, isPunycode: true };
    const score = calculateRiskScore(defaultAuth, defaultHeaders, domain, defaultContent);
    expect(score).toBe('medium');
  });

  it('should elevate risk when IBANs are detected', () => {
    const content: ContentAnalysis = { ...defaultContent, detectedIbans: ['DE123'] };
    const score = calculateRiskScore(defaultAuth, defaultHeaders, defaultDomain, content);
    expect(score).toBe('medium');
  });

  it('should combine high-impact factors to reach high risk', () => {
    const auth: AuthenticationResults = { ...defaultAuth, dmarc: { result: 'fail' } };
    const domain: DomainAnalysis = { ...defaultDomain, isBlocked: true };
    const content: ContentAnalysis = {
      ...defaultContent,
      suspiciousLinks: [{ url: 'http://malicious.example', isShortened: false, suspicionReasons: [] }],
    };
    const score = calculateRiskScore(auth, defaultHeaders, domain, content);
    expect(score).toBe('high');
  });

  it('should combine low risk inputs without exceeding low', () => {
    const auth: AuthenticationResults = { ...defaultAuth, spf: { result: 'none', domain: 'example.com' } }; // +1
    const headers: HeaderAnalysis = { ...defaultHeaders, headerAnomalies: ['Mismatch'] }; // +2
    const score = calculateRiskScore(auth, headers, defaultDomain, defaultContent);
    expect(score).toBe('low');
  });

  it('should keep isolated suspicious links below medium risk', () => {
    const content: ContentAnalysis = { ...defaultContent, suspiciousLinks: [{ url: 'bit.ly/abc', isShortened: true, suspicionReasons: ['URL shortener detected'] }] };
    const score = calculateRiskScore(defaultAuth, defaultHeaders, defaultDomain, content);
    expect(score).toBe('low');
  });

  it('should downweight social brand mentions to low impact', () => {
    const domain: DomainAnalysis = {
      ...defaultDomain,
      brandMismatch: { detectedInContent: ['facebook'], matchesSenderDomain: false, suspiciousMismatches: ['facebook'] }
    };
    const score = calculateRiskScore(defaultAuth, defaultHeaders, domain, defaultContent);
    expect(score).toBe('low');
  });

  it('should still elevate for high-impact brand impersonation', () => {
    const domain: DomainAnalysis = {
      ...defaultDomain,
      brandMismatch: { detectedInContent: ['paypal'], matchesSenderDomain: false, suspiciousMismatches: ['paypal'] }
    };
    const score = calculateRiskScore(defaultAuth, defaultHeaders, domain, defaultContent);
    expect(score).toBe('medium');
  });

  it('should treat raw IP links as higher risk', () => {
    const content: ContentAnalysis = {
      ...defaultContent,
      suspiciousLinks: [{
        url: 'http://127.0.0.1/login',
        isShortened: false,
        suspicionReasons: ['IP address instead of domain name']
      }]
    };
    const score = calculateRiskScore(defaultAuth, defaultHeaders, defaultDomain, content);
    expect(score).toBe('medium');
  });
});
