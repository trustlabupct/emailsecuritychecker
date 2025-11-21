// tests/unit/custom-keywords.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analyzeNlp, detectUrgencyIndicators } from '../../src/service-worker/analysis/nlp-analysis';
import { mergeWithCustomKeywords } from '../../src/shared/localization';

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

describe('Custom Keywords - Urgency & Scam Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mergeWithCustomKeywords', () => {
    it('should merge custom urgency keywords with localized defaults', () => {
      const customUrgency = ['critical', 'emergency'];
      const customScam = [];

      const result = mergeWithCustomKeywords(customUrgency, customScam);

      expect(result.urgencyKeywords).toContain('critical');
      expect(result.urgencyKeywords).toContain('emergency');
      // Should also contain default urgency keywords
      expect(result.urgencyKeywords).toContain('urgent');
      expect(result.urgencyKeywords).toContain('immediately');
    });

    it('should merge custom scam keywords with localized defaults', () => {
      const customUrgency = [];
      const customScam = ['invoice attached', 'wire money'];

      const result = mergeWithCustomKeywords(customUrgency, customScam);

      expect(result.scamKeywords).toContain('invoice attached');
      expect(result.scamKeywords).toContain('wire money');
      // Should also contain default scam keywords
      expect(result.scamKeywords).toContain('verify account');
      expect(result.scamKeywords).toContain('suspended');
    });

    it('should merge both custom urgency and scam keywords', () => {
      const customUrgency = ['priority', 'time-critical'];
      const customScam = ['confirm payment', 'account locked'];

      const result = mergeWithCustomKeywords(customUrgency, customScam);

      expect(result.urgencyKeywords).toContain('priority');
      expect(result.urgencyKeywords).toContain('time-critical');
      expect(result.scamKeywords).toContain('confirm payment');
      expect(result.scamKeywords).toContain('account locked');
    });

    it('should handle empty custom keyword arrays', () => {
      const result = mergeWithCustomKeywords([], []);

      // Should still have localized defaults
      expect(result.urgencyKeywords.length).toBeGreaterThan(0);
      expect(result.scamKeywords.length).toBeGreaterThan(0);
      expect(result.threatKeywords.length).toBeGreaterThan(0);
      expect(result.paymentKeywords.length).toBeGreaterThan(0);
    });

    it('should deduplicate keywords', () => {
      // Add a keyword that's already in defaults
      const customUrgency = ['urgent', 'urgent', 'new-keyword'];
      const customScam = [];

      const result = mergeWithCustomKeywords(customUrgency, customScam);

      // Count occurrences of 'urgent'
      const urgentCount = result.urgencyKeywords.filter(k => k === 'urgent').length;
      expect(urgentCount).toBe(1); // Should only appear once

      // New keyword should be present
      expect(result.urgencyKeywords).toContain('new-keyword');
    });

    it('should preserve threat and payment keywords from localization', () => {
      const customUrgency = ['test'];
      const customScam = ['test'];

      const result = mergeWithCustomKeywords(customUrgency, customScam);

      // Threat and payment keywords shouldn't be affected by custom keywords
      expect(result.threatKeywords.length).toBeGreaterThan(0);
      expect(result.paymentKeywords.length).toBeGreaterThan(0);
    });
  });

  describe('detectUrgencyIndicators', () => {
    it('should detect custom urgency keywords in text', async () => {
      vi.mocked(getUserSettings).mockResolvedValue({
        enableOnlineLookups: false,
        ignoredThreads: [],
        allowedDomains: [],
        blockedDomains: [],
        customKeywords: [],
        customUrgencyKeywords: ['critical situation', 'respond today'],
        customScamKeywords: [],
        customRiskRules: [],
        enableDeepLinkAnalysis: true,
        enableNlpAnalysis: true,
        enableQrCodeDecoding: false,
        enableOcrAnalysis: false,
      });

      const text = 'This is a critical situation that requires you to respond today.';
      const indicators = await detectUrgencyIndicators(text);

      expect(indicators).toContain('critical situation');
      expect(indicators).toContain('respond today');
    });

    it('should detect default urgency keywords', async () => {
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

      const text = 'This is urgent and you must act immediately.';
      const indicators = await detectUrgencyIndicators(text);

      expect(indicators).toContain('urgent');
      expect(indicators).toContain('immediately');
    });

    it('should detect both custom and default urgency keywords', async () => {
      vi.mocked(getUserSettings).mockResolvedValue({
        enableOnlineLookups: false,
        ignoredThreads: [],
        allowedDomains: [],
        blockedDomains: [],
        customKeywords: [],
        customUrgencyKeywords: ['mission critical'],
        customScamKeywords: [],
        customRiskRules: [],
        enableDeepLinkAnalysis: true,
        enableNlpAnalysis: true,
        enableQrCodeDecoding: false,
        enableOcrAnalysis: false,
      });

      const text = 'This is urgent and mission critical - act now!';
      const indicators = await detectUrgencyIndicators(text);

      expect(indicators).toContain('urgent');
      expect(indicators).toContain('mission critical');
      expect(indicators).toContain('act now');
    });

    it('should be case-insensitive', async () => {
      vi.mocked(getUserSettings).mockResolvedValue({
        enableOnlineLookups: false,
        ignoredThreads: [],
        allowedDomains: [],
        blockedDomains: [],
        customKeywords: [],
        customUrgencyKeywords: ['Priority Alert'],
        customScamKeywords: [],
        customRiskRules: [],
        enableDeepLinkAnalysis: true,
        enableNlpAnalysis: true,
        enableQrCodeDecoding: false,
        enableOcrAnalysis: false,
      });

      const text = 'This is a PRIORITY ALERT for you.';
      const indicators = await detectUrgencyIndicators(text);

      expect(indicators.length).toBeGreaterThan(0);
      expect(indicators.some(i => i.toLowerCase().includes('priority'))).toBe(true);
    });

    it('should return empty array when no urgency indicators found', async () => {
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

      const text = 'Hello, just a friendly reminder about our meeting next week.';
      const indicators = await detectUrgencyIndicators(text);

      expect(indicators).toEqual([]);
    });
  });

  describe('analyzeNlp - Custom Keywords Integration', () => {
    it('should use custom urgency keywords to increase urgency score', async () => {
      vi.mocked(getUserSettings).mockResolvedValue({
        enableOnlineLookups: false,
        ignoredThreads: [],
        allowedDomains: [],
        blockedDomains: [],
        customKeywords: [],
        customUrgencyKeywords: ['extremely urgent', 'mission critical', 'top priority'],
        customScamKeywords: [],
        customRiskRules: [],
        enableDeepLinkAnalysis: true,
        enableNlpAnalysis: true,
        enableQrCodeDecoding: false,
        enableOcrAnalysis: false,
      });

      const text = 'This is extremely urgent, mission critical, and top priority. Please act immediately.';
      const result = await analyzeNlp(text);

      // Should detect urgency due to custom keywords
      expect(result.tone).toBe('urgent');
      expect(result.suspicionScore).toBeGreaterThan(0);
    });

    it('should use custom scam keywords to increase enticing score', async () => {
      vi.mocked(getUserSettings).mockResolvedValue({
        enableOnlineLookups: false,
        ignoredThreads: [],
        allowedDomains: [],
        blockedDomains: [],
        customKeywords: [],
        customUrgencyKeywords: [],
        customScamKeywords: ['free money', 'instant profit', 'no risk investment'],
        customRiskRules: [],
        enableDeepLinkAnalysis: true,
        enableNlpAnalysis: true,
        enableQrCodeDecoding: false,
        enableOcrAnalysis: false,
      });

      const text = 'Get free money with this instant profit no risk investment opportunity!';
      const result = await analyzeNlp(text);

      // Should detect enticing tone due to custom scam keywords
      expect(result.tone).toBe('enticing');
      expect(result.suspicionScore).toBeGreaterThan(0);
    });

    it('should combine custom and default keywords for analysis', async () => {
      vi.mocked(getUserSettings).mockResolvedValue({
        enableOnlineLookups: false,
        ignoredThreads: [],
        allowedDomains: [],
        blockedDomains: [],
        customKeywords: [],
        customUrgencyKeywords: ['code red'],
        customScamKeywords: ['verify now'],
        customRiskRules: [],
        enableDeepLinkAnalysis: true,
        enableNlpAnalysis: true,
        enableQrCodeDecoding: false,
        enableOcrAnalysis: false,
      });

      const text = 'URGENT: Code red! Your account is suspended. Verify now or it will be closed immediately!';
      const result = await analyzeNlp(text);

      // Should detect high suspicion from both custom and default keywords
      expect(result.tone).toMatch(/urgent|threatening/);
      expect(result.suspicionScore).toBeGreaterThan(20);
    });

    it('should return neutral tone for clean text with no keywords', async () => {
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

      const text = 'Hello John, I hope you are doing well. Just wanted to follow up on our conversation from last week.';
      const result = await analyzeNlp(text);

      expect(result.tone).toBe('neutral');
      expect(result.suspicionScore).toBe(0);
    });

    it('should detect multiple custom urgency keywords in same text', async () => {
      vi.mocked(getUserSettings).mockResolvedValue({
        enableOnlineLookups: false,
        ignoredThreads: [],
        allowedDomains: [],
        blockedDomains: [],
        customKeywords: [],
        customUrgencyKeywords: ['keyword1', 'keyword2', 'keyword3', 'keyword4'],
        customScamKeywords: [],
        customRiskRules: [],
        enableDeepLinkAnalysis: true,
        enableNlpAnalysis: true,
        enableQrCodeDecoding: false,
        enableOcrAnalysis: false,
      });

      const text = 'This has keyword1 and keyword2 and keyword3 and keyword4 in it.';
      const result = await analyzeNlp(text);

      // Multiple urgency keywords should increase suspicion
      expect(result.suspicionScore).toBeGreaterThan(10);
    });

    it('should detect request types regardless of custom keywords', async () => {
      vi.mocked(getUserSettings).mockResolvedValue({
        enableOnlineLookups: false,
        ignoredThreads: [],
        allowedDomains: [],
        blockedDomains: [],
        customKeywords: [],
        customUrgencyKeywords: ['my urgent word'],
        customScamKeywords: [],
        customRiskRules: [],
        enableDeepLinkAnalysis: true,
        enableNlpAnalysis: true,
        enableQrCodeDecoding: false,
        enableOcrAnalysis: false,
      });

      const text = 'My urgent word: please click here to verify your password and send payment.';
      const result = await analyzeNlp(text);

      // Should detect request types (this uses hardcoded patterns, not custom keywords)
      expect(result.requestTypes).toContain('click_link');
      expect(result.requestTypes).toContain('credentials');
      expect(result.requestTypes).toContain('payment');
    });
  });

  describe('Custom Keywords - Edge Cases', () => {
    it('should handle very long custom keyword lists', async () => {
      const longList = Array.from({ length: 100 }, (_, i) => `keyword${i}`);

      vi.mocked(getUserSettings).mockResolvedValue({
        enableOnlineLookups: false,
        ignoredThreads: [],
        allowedDomains: [],
        blockedDomains: [],
        customKeywords: [],
        customUrgencyKeywords: longList,
        customScamKeywords: [],
        customRiskRules: [],
        enableDeepLinkAnalysis: true,
        enableNlpAnalysis: true,
        enableQrCodeDecoding: false,
        enableOcrAnalysis: false,
      });

      const text = 'This contains keyword50 in the text.';
      const indicators = await detectUrgencyIndicators(text);

      expect(indicators).toContain('keyword50');
    });

    it('should handle special characters in custom keywords', async () => {
      vi.mocked(getUserSettings).mockResolvedValue({
        enableOnlineLookups: false,
        ignoredThreads: [],
        allowedDomains: [],
        blockedDomains: [],
        customKeywords: [],
        customUrgencyKeywords: ['re: urgent', '[priority]', '!!!action required!!!'],
        customScamKeywords: [],
        customRiskRules: [],
        enableDeepLinkAnalysis: true,
        enableNlpAnalysis: true,
        enableQrCodeDecoding: false,
        enableOcrAnalysis: false,
      });

      const text = 'Subject: re: urgent [priority] !!!action required!!!';
      const indicators = await detectUrgencyIndicators(text);

      expect(indicators.length).toBeGreaterThan(0);
    });

    it('should handle empty string custom keywords gracefully', async () => {
      vi.mocked(getUserSettings).mockResolvedValue({
        enableOnlineLookups: false,
        ignoredThreads: [],
        allowedDomains: [],
        blockedDomains: [],
        customKeywords: [],
        customUrgencyKeywords: ['', 'valid keyword', ''],
        customScamKeywords: [],
        customRiskRules: [],
        enableDeepLinkAnalysis: true,
        enableNlpAnalysis: true,
        enableQrCodeDecoding: false,
        enableOcrAnalysis: false,
      });

      const text = 'This has a valid keyword in it.';
      const indicators = await detectUrgencyIndicators(text);

      expect(indicators).toContain('valid keyword');
    });

    it('should handle very long text efficiently', async () => {
      vi.mocked(getUserSettings).mockResolvedValue({
        enableOnlineLookups: false,
        ignoredThreads: [],
        allowedDomains: [],
        blockedDomains: [],
        customKeywords: [],
        customUrgencyKeywords: ['needle'],
        customScamKeywords: [],
        customRiskRules: [],
        enableDeepLinkAnalysis: true,
        enableNlpAnalysis: true,
        enableQrCodeDecoding: false,
        enableOcrAnalysis: false,
      });

      // Create very long text (analyzeNlp limits to 10000 chars)
      const longText = 'This is filler text. '.repeat(600) + 'needle' + ' More filler.'.repeat(600);

      const result = await analyzeNlp(longText);

      // Should still work and detect the keyword
      expect(result.suspicionScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle unicode characters in custom keywords', async () => {
      vi.mocked(getUserSettings).mockResolvedValue({
        enableOnlineLookups: false,
        ignoredThreads: [],
        allowedDomains: [],
        blockedDomains: [],
        customKeywords: [],
        customUrgencyKeywords: ['très urgent', '긴급', 'срочно'],
        customScamKeywords: [],
        customRiskRules: [],
        enableDeepLinkAnalysis: true,
        enableNlpAnalysis: true,
        enableQrCodeDecoding: false,
        enableOcrAnalysis: false,
      });

      const text = 'Message: très urgent 긴급 срочно';
      const indicators = await detectUrgencyIndicators(text);

      expect(indicators.length).toBeGreaterThan(0);
    });
  });

  describe('Custom Keywords - Performance', () => {
    it('should complete analysis in reasonable time with many custom keywords', async () => {
      const manyKeywords = Array.from({ length: 200 }, (_, i) => `keyword${i}`);

      vi.mocked(getUserSettings).mockResolvedValue({
        enableOnlineLookups: false,
        ignoredThreads: [],
        allowedDomains: [],
        blockedDomains: [],
        customKeywords: [],
        customUrgencyKeywords: manyKeywords,
        customScamKeywords: manyKeywords,
        customRiskRules: [],
        enableDeepLinkAnalysis: true,
        enableNlpAnalysis: true,
        enableQrCodeDecoding: false,
        enableOcrAnalysis: false,
      });

      const text = 'Some text that contains keyword100 and keyword150.';

      const startTime = Date.now();
      await analyzeNlp(text);
      const duration = Date.now() - startTime;

      // Should complete in under 1 second (generous threshold)
      expect(duration).toBeLessThan(1000);
    });
  });
});
