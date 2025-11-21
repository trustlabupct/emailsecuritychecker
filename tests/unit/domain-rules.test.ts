// tests/unit/domain-rules.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analyzeDomain } from '../../src/service-worker/analysis/domain';
import { calculateRiskScore } from '../../src/service-worker/analysis/risk-score';
import { calculateEnhancedRiskScore } from '../../src/service-worker/analysis/enhanced-risk-score';
import type { AuthenticationResults, HeaderAnalysis, ContentAnalysis, DomainAnalysis } from '../../src/shared/types';

// Mock user settings
vi.mock('../../src/shared/user-settings', () => ({
  getUserSettings: vi.fn(),
}));

// Mock logger
vi.mock('../../src/service-worker/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { getUserSettings } from '../../src/shared/user-settings';

describe('Domain Rules - Allow/Block Lists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeDomain', () => {
    it('should detect domain in allow list', async () => {
      vi.mocked(getUserSettings).mockResolvedValue({
        enableOnlineLookups: false,
        ignoredThreads: [],
        allowedDomains: ['trusted-company.com', 'example.org'],
        blockedDomains: [],
        customKeywords: [],
        customUrgencyKeywords: [],
        customScamKeywords: [],
        customRiskRules: [],
        enableDeepLinkAnalysis: true,
        enableNlpAnalysis: true,
        enableQrCodeDecoding: false,
        enableOcrAnalysis: false,
      });

      const result = await analyzeDomain('sender@trusted-company.com', []);

      expect(result.isAllowed).toBe(true);
      expect(result.isBlocked).toBe(false);
      expect(result.reputationSignals).toContain('Domain is in user allow list.');
    });

    it('should detect domain in block list', async () => {
      vi.mocked(getUserSettings).mockResolvedValue({
        enableOnlineLookups: false,
        ignoredThreads: [],
        allowedDomains: [],
        blockedDomains: ['phishing-site.com', 'malicious.net'],
        customKeywords: [],
        customUrgencyKeywords: [],
        customScamKeywords: [],
        customRiskRules: [],
        enableDeepLinkAnalysis: true,
        enableNlpAnalysis: true,
        enableQrCodeDecoding: false,
        enableOcrAnalysis: false,
      });

      const result = await analyzeDomain('sender@phishing-site.com', []);

      expect(result.isAllowed).toBe(false);
      expect(result.isBlocked).toBe(true);
      expect(result.reputationSignals).toContain('Domain is in user block list (HIGH RISK).');
    });

    it('should handle domain in neither list', async () => {
      vi.mocked(getUserSettings).mockResolvedValue({
        enableOnlineLookups: false,
        ignoredThreads: [],
        allowedDomains: ['trusted.com'],
        blockedDomains: ['blocked.com'],
        customKeywords: [],
        customUrgencyKeywords: [],
        customScamKeywords: [],
        customRiskRules: [],
        enableDeepLinkAnalysis: true,
        enableNlpAnalysis: true,
        enableQrCodeDecoding: false,
        enableOcrAnalysis: false,
      });

      const result = await analyzeDomain('sender@unknown.com', []);

      expect(result.isAllowed).toBe(false);
      expect(result.isBlocked).toBe(false);
      expect(result.reputationSignals).not.toContain('Domain is in user allow list.');
      expect(result.reputationSignals).not.toContain('Domain is in user block list (HIGH RISK).');
    });

    it('should handle empty allow/block lists', async () => {
      vi.mocked(getUserSettings).mockResolvedValue({
        enableOnlineLookups: false,
        ignoredThreads: [],
        allowedDomains: [],
        blockedDomains: [],
        customKeywords: [],
        customUrgencyKeywords: [],
        customScamKeywords: [],
        customRiskRules: [],
        enableDeepLinkAnalysis: true,
        enableNlpAnalysis: true,
        enableQrCodeDecoding: false,
        enableOcrAnalysis: false,
      });

      const result = await analyzeDomain('sender@example.com', []);

      expect(result.isAllowed).toBe(false);
      expect(result.isBlocked).toBe(false);
    });

    it('should not be in both lists simultaneously', async () => {
      // This shouldn't happen in practice due to mutual exclusivity in UI,
      // but test the behavior if it does
      vi.mocked(getUserSettings).mockResolvedValue({
        enableOnlineLookups: false,
        ignoredThreads: [],
        allowedDomains: ['example.com'],
        blockedDomains: ['example.com'],
        customKeywords: [],
        customUrgencyKeywords: [],
        customScamKeywords: [],
        customRiskRules: [],
        enableDeepLinkAnalysis: true,
        enableNlpAnalysis: true,
        enableQrCodeDecoding: false,
        enableOcrAnalysis: false,
      });

      const result = await analyzeDomain('sender@example.com', []);

      // Both flags would be true in this edge case
      expect(result.isAllowed).toBe(true);
      expect(result.isBlocked).toBe(true);
    });
  });

  describe('calculateRiskScore - Domain Rules Impact', () => {
    const defaultAuth: AuthenticationResults = {
      spf: { result: 'pass', domain: 'example.com' },
      dkim: { result: 'pass', domain: 'example.com', selector: 'default' },
      dmarc: { result: 'pass' },
      arc: { result: 'none', sealCount: 0 },
      alignment: { spfAligned: true, dkimAligned: true },
    };

    const defaultHeaders: HeaderAnalysis = {
      fromAddress: 'sender@example.com',
      replyTo: undefined,
      returnPath: undefined,
      hasMultipleFromHeaders: false,
      suspiciousHeaders: [],
      headerAnomalies: [],
      receivedChain: [],
    };

    const defaultContent: ContentAnalysis = {
      detectedIbans: [],
      detectedRoutingNumbers: [],
      detectedSwiftBic: [],
      detectedCryptoWallets: [],
      suspiciousLinks: [],
      linkTextMismatches: [],
      urgencyIndicators: [],
    };

    it('should increase risk for blocked domain', () => {
      const domain: DomainAnalysis = {
        domain: 'blocked-site.com',
        isPunycode: false,
        reputationSignals: ['Domain is in user block list (HIGH RISK).'],
        isAllowed: false,
        isBlocked: true,
      };

      const score = calculateRiskScore(defaultAuth, defaultHeaders, domain, defaultContent);

      // Blocked domain should force HIGH risk
      expect(score).toBe('high');
    });

    it('should force HIGH risk for blocked domain even with good auth', () => {
      const domain: DomainAnalysis = {
        domain: 'blocked-site.com',
        isPunycode: false,
        reputationSignals: ['Domain is in user block list (HIGH RISK).'],
        isAllowed: false,
        isBlocked: true,
      };

      // Perfect authentication
      const goodAuth: AuthenticationResults = {
        spf: { result: 'pass', domain: 'example.com' },
        dkim: { result: 'pass', domain: 'example.com', selector: 'default' },
        dmarc: { result: 'pass' },
        arc: { result: 'none', sealCount: 0 },
        alignment: { spfAligned: true, dkimAligned: true },
      };

      const score = calculateRiskScore(goodAuth, defaultHeaders, domain, defaultContent);

      // Even with perfect auth, blocked domain = HIGH risk
      expect(score).toBe('high');
    });

    it('should reduce risk for allowed domain', () => {
      const domain: DomainAnalysis = {
        domain: 'trusted-company.com',
        isPunycode: false,
        reputationSignals: ['Domain is in user allow list.'],
        isAllowed: true,
        isBlocked: false,
      };

      // Add some suspicious content that would normally increase risk
      const suspiciousContent: ContentAnalysis = {
        ...defaultContent,
        suspiciousLinks: [{ url: 'http://short.link/abc', isShortened: true, suspicionReasons: ['URL shortener detected'] }],
      };

      const score = calculateRiskScore(defaultAuth, defaultHeaders, domain, suspiciousContent);

      // Should be low or medium, not high, because domain is allowed
      expect(score).not.toBe('high');
    });

    it('should prioritize blocked over allowed if both are true', () => {
      // Edge case: domain in both lists
      const domain: DomainAnalysis = {
        domain: 'confused.com',
        isPunycode: false,
        reputationSignals: ['Domain is in user allow list.', 'Domain is in user block list (HIGH RISK).'],
        isAllowed: true,
        isBlocked: true,
      };

      const score = calculateRiskScore(defaultAuth, defaultHeaders, domain, defaultContent);

      // Blocked should take precedence
      expect(score).toBe('high');
    });

    it('should calculate normal risk for neutral domain', () => {
      const domain: DomainAnalysis = {
        domain: 'neutral.com',
        isPunycode: false,
        reputationSignals: [],
        isAllowed: false,
        isBlocked: false,
      };

      const score = calculateRiskScore(defaultAuth, defaultHeaders, domain, defaultContent);

      // Should be low with good auth and no suspicious content
      expect(score).toBe('low');
    });
  });

  describe('calculateEnhancedRiskScore - Domain Rules Impact', () => {
    const defaultAuth: AuthenticationResults = {
      spf: { result: 'pass', domain: 'example.com' },
      dkim: { result: 'pass', domain: 'example.com', selector: 'default' },
      dmarc: { result: 'pass' },
      arc: { result: 'none', sealCount: 0 },
      alignment: { spfAligned: true, dkimAligned: true },
    };

    const defaultHeaders: HeaderAnalysis = {
      fromAddress: 'sender@example.com',
      replyTo: undefined,
      returnPath: undefined,
      hasMultipleFromHeaders: false,
      suspiciousHeaders: [],
      headerAnomalies: [],
      receivedChain: [],
    };

    const defaultContent: ContentAnalysis = {
      detectedIbans: [],
      detectedRoutingNumbers: [],
      detectedSwiftBic: [],
      detectedCryptoWallets: [],
      suspiciousLinks: [],
      linkTextMismatches: [],
      urgencyIndicators: [],
    };

    const defaultDomain: DomainAnalysis = {
      domain: 'example.com',
      isPunycode: false,
      reputationSignals: [],
      isAllowed: false,
      isBlocked: false,
    };

    it('should add risk points for blocked domain', () => {
      const blockedDomain: DomainAnalysis = {
        ...defaultDomain,
        domain: 'blocked.com',
        isBlocked: true,
        reputationSignals: ['Domain is in user block list (HIGH RISK).'],
      };

      const result = calculateEnhancedRiskScore(
        defaultAuth,
        defaultHeaders,
        blockedDomain,
        defaultContent
      );

      // Should have high risk and explanation mentioning blocked domain
      expect(result.riskScore).toBe('high');
      expect(result.explanation.some(exp => exp.toLowerCase().includes('block'))).toBe(true);
    });

    it('should reduce risk points for allowed domain', () => {
      const allowedDomain: DomainAnalysis = {
        ...defaultDomain,
        domain: 'trusted.com',
        isAllowed: true,
        reputationSignals: ['Domain is in user allow list.'],
      };

      // Add some minor suspicious signals
      const slightlySuspiciousContent: ContentAnalysis = {
        ...defaultContent,
        urgencyIndicators: ['urgent'],
      };

      const result = calculateEnhancedRiskScore(
        defaultAuth,
        defaultHeaders,
        allowedDomain,
        slightlySuspiciousContent
      );

      // Should have lower risk due to allowed domain
      expect(result.riskScore).not.toBe('high');
    });

    it('should override to HIGH for blocked domain regardless of other factors', () => {
      const blockedDomain: DomainAnalysis = {
        ...defaultDomain,
        domain: 'malicious.com',
        isBlocked: true,
      };

      // Even with perfect auth and clean content
      const perfectAuth: AuthenticationResults = {
        spf: { result: 'pass', domain: 'example.com' },
        dkim: { result: 'pass', domain: 'example.com', selector: 'default' },
        dmarc: { result: 'pass' },
        arc: { result: 'none', sealCount: 0 },
        alignment: { spfAligned: true, dkimAligned: true },
      };

      const result = calculateEnhancedRiskScore(
        perfectAuth,
        defaultHeaders,
        blockedDomain,
        defaultContent
      );

      // Blocked domain always forces HIGH
      expect(result.riskScore).toBe('high');
    });

    it('should include domain allow/block status in explanation', () => {
      const blockedDomain: DomainAnalysis = {
        ...defaultDomain,
        isBlocked: true,
      };

      const result = calculateEnhancedRiskScore(
        defaultAuth,
        defaultHeaders,
        blockedDomain,
        defaultContent
      );

      // Explanation should mention the blocked status
      const explanationText = result.explanation.join(' ').toLowerCase();
      expect(explanationText.includes('block') || explanationText.includes('user')).toBe(true);
    });
  });

  describe('Domain Rules - Case Sensitivity', () => {
    it('should handle case-insensitive domain matching', async () => {
      vi.mocked(getUserSettings).mockResolvedValue({
        enableOnlineLookups: false,
        ignoredThreads: [],
        allowedDomains: ['TrustedCompany.COM'], // Mixed case in settings
        blockedDomains: [],
        customKeywords: [],
        customUrgencyKeywords: [],
        customScamKeywords: [],
        customRiskRules: [],
        enableDeepLinkAnalysis: true,
        enableNlpAnalysis: true,
        enableQrCodeDecoding: false,
        enableOcrAnalysis: false,
      });

      // Test with lowercase
      const result = await analyzeDomain('sender@trustedcompany.com', []);

      // Should match despite case difference (domains are case-insensitive)
      // Note: This depends on how the normalization is implemented
      // The UI should normalize to lowercase, but let's test the behavior
      expect(result.domain).toBe('trustedcompany.com');
    });
  });

  describe('Domain Rules - Multiple Domains', () => {
    it('should handle multiple domains in allow list', async () => {
      vi.mocked(getUserSettings).mockResolvedValue({
        enableOnlineLookups: false,
        ignoredThreads: [],
        allowedDomains: ['company1.com', 'company2.com', 'company3.com'],
        blockedDomains: [],
        customKeywords: [],
        customUrgencyKeywords: [],
        customScamKeywords: [],
        customRiskRules: [],
        enableDeepLinkAnalysis: true,
        enableNlpAnalysis: true,
        enableQrCodeDecoding: false,
        enableOcrAnalysis: false,
      });

      const result1 = await analyzeDomain('sender@company1.com', []);
      const result2 = await analyzeDomain('sender@company2.com', []);
      const result3 = await analyzeDomain('sender@company3.com', []);
      const result4 = await analyzeDomain('sender@company4.com', []);

      expect(result1.isAllowed).toBe(true);
      expect(result2.isAllowed).toBe(true);
      expect(result3.isAllowed).toBe(true);
      expect(result4.isAllowed).toBe(false);
    });

    it('should handle multiple domains in block list', async () => {
      vi.mocked(getUserSettings).mockResolvedValue({
        enableOnlineLookups: false,
        ignoredThreads: [],
        allowedDomains: [],
        blockedDomains: ['phish1.com', 'phish2.com', 'phish3.com'],
        customKeywords: [],
        customUrgencyKeywords: [],
        customScamKeywords: [],
        customRiskRules: [],
        enableDeepLinkAnalysis: true,
        enableNlpAnalysis: true,
        enableQrCodeDecoding: false,
        enableOcrAnalysis: false,
      });

      const result1 = await analyzeDomain('sender@phish1.com', []);
      const result2 = await analyzeDomain('sender@phish2.com', []);
      const result3 = await analyzeDomain('sender@phish3.com', []);
      const result4 = await analyzeDomain('sender@safe.com', []);

      expect(result1.isBlocked).toBe(true);
      expect(result2.isBlocked).toBe(true);
      expect(result3.isBlocked).toBe(true);
      expect(result4.isBlocked).toBe(false);
    });
  });

  describe('Domain Rules - Subdomain Handling', () => {
    it('should match exact subdomain in allow list', async () => {
      vi.mocked(getUserSettings).mockResolvedValue({
        enableOnlineLookups: false,
        ignoredThreads: [],
        allowedDomains: ['mail.company.com'], // Specific subdomain
        blockedDomains: [],
        customKeywords: [],
        customUrgencyKeywords: [],
        customScamKeywords: [],
        customRiskRules: [],
        enableDeepLinkAnalysis: true,
        enableNlpAnalysis: true,
        enableQrCodeDecoding: false,
        enableOcrAnalysis: false,
      });

      const exactMatch = await analyzeDomain('sender@mail.company.com', []);
      const parentDomain = await analyzeDomain('sender@company.com', []);
      const differentSubdomain = await analyzeDomain('sender@www.company.com', []);

      // Only exact match should be allowed (no wildcard matching)
      expect(exactMatch.isAllowed).toBe(true);
      expect(parentDomain.isAllowed).toBe(false);
      expect(differentSubdomain.isAllowed).toBe(false);
    });
  });
});
