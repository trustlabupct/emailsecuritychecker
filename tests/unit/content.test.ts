// tests/unit/content.test.ts
import { describe, it, expect, vi } from 'vitest';
import { analyzeContent } from '../../src/service-worker/analysis/content';
import * as UserSettings from '../../src/shared/user-settings';

// Mock getUserSettings
vi.mock('../../src/shared/user-settings', () => ({
  getUserSettings: vi.fn(() => Promise.resolve({
    enableOnlineLookups: false,
    enableNlpAnalysis: true,
    enableDeepLinkAnalysis: true,
    enableQrCodeDecoding: false,
    enableOcrAnalysis: false,
    ignoredThreads: []
  })),
}));

describe('analyzeContent', () => {
  it('should detect IBANs in the content', async () => {
    const body = "Please send payment to DE89370400440532013000.";
    const result = await analyzeContent(body);
    expect(result.detectedIbans).toContain('DE89370400440532013000');
  });

  it('should detect suspicious shortened links', async () => {
    const body = "Click here: https://bit.ly/malicious-link";
    const result = await analyzeContent(body);
    expect(result.suspiciousLinks.length).toBe(1);
    expect(result.suspiciousLinks[0].url).toBe('https://bit.ly/malicious-link');
    expect(result.suspiciousLinks[0].isShortened).toBe(true);
    expect(result.suspiciousLinks[0].finalUrl).toBeUndefined();
  });

  it('should resolve shortened links if online lookups are enabled', async () => {
    vi.mocked(UserSettings.getUserSettings).mockResolvedValueOnce({
      enableOnlineLookups: true,
      enableNlpAnalysis: true,
      enableDeepLinkAnalysis: true,
      enableQrCodeDecoding: false,
      enableOcrAnalysis: false,
      ignoredThreads: []
    });
    const body = "Click here: https://bit.ly/malicious-link";
    const result = await analyzeContent(body);
    expect(result.suspiciousLinks.length).toBe(1);
    expect(result.suspiciousLinks[0].url).toBe('https://bit.ly/malicious-link');
    expect(result.suspiciousLinks[0].isShortened).toBe(true);
    expect(result.suspiciousLinks[0].finalUrl).toBe('https://resolved.example.com/bitly-destination');
  });

  it('should detect urgency indicators', async () => {
    const body = "Action required immediately! Your account will be suspended.";
    const result = await analyzeContent(body);
    expect(result.urgencyIndicators).toContain('action required');
    expect(result.urgencyIndicators).toContain('immediately');
  });

  it('should handle content with no suspicious elements', async () => {
    const body = "Hello, this is a normal email.";
    const result = await analyzeContent(body);
    expect(result.detectedIbans).toEqual([]);
    expect(result.suspiciousLinks).toEqual([]);
    expect(result.urgencyIndicators).toEqual([]);
  });

  it('should perform NLP analysis when enableNlpAnalysis is true', async () => {
    vi.mocked(UserSettings.getUserSettings).mockResolvedValueOnce({
      enableOnlineLookups: false,
      enableNlpAnalysis: true,
      enableDeepLinkAnalysis: true,
      enableQrCodeDecoding: false,
      enableOcrAnalysis: false,
      ignoredThreads: []
    });
    const body = "URGENT! Act now or your account will be closed! Send money immediately!";
    const result = await analyzeContent(body);
    expect(result.nlpAnalysis).toBeDefined();
    expect(result.urgencyIndicators.length).toBeGreaterThan(0);
  });

  it('should skip NLP analysis when enableNlpAnalysis is false', async () => {
    vi.mocked(UserSettings.getUserSettings).mockResolvedValueOnce({
      enableOnlineLookups: false,
      enableNlpAnalysis: false,
      enableDeepLinkAnalysis: true,
      enableQrCodeDecoding: false,
      enableOcrAnalysis: false,
      ignoredThreads: []
    });
    const body = "URGENT! Act now or your account will be closed! Send money immediately!";
    const result = await analyzeContent(body);
    expect(result.nlpAnalysis).toBeUndefined();
    expect(result.urgencyIndicators).toEqual([]);
  });

  it('should flag missing PayPal branding footer when PayPal is mentioned', async () => {
    const body = `
      Dear user,
      We detected unusual activity in your PayPal account.
      Please verify at http://127.0.0.1:8080
    `;
    const result = await analyzeContent(body);
    expect(result.brandWarnings).toContain(
      'PayPal branding footer missing (expected "Copyright © 1999-YYYY PayPal").'
    );
  });
});
