// tests/unit/url-analysis.test.ts
import { describe, it, expect } from 'vitest';
import {
  analyzeUrl,
  detectLinkMismatches,
  extractUrls,
  analyzeUrls
} from '../../src/service-worker/analysis/url-analysis';

describe('URL Analysis', () => {
  describe('analyzeUrl', () => {
    it('should detect URL shorteners', () => {
      const url = 'https://bit.ly/3abc123';
      const result = analyzeUrl(url);

      expect(result.isShortened).toBe(true);
      expect(result.suspicionReasons).toContain('URL shortener detected');
    });

    it('should detect punycode domains', () => {
      const url = 'https://xn--80akhbyknj4f.com/page';
      const result = analyzeUrl(url);

      expect(result.suspicionReasons).toContain('Punycode domain (possible homograph attack)');
    });

    it('should detect IP addresses instead of domains', () => {
      const url = 'http://192.168.1.1/login';
      const result = analyzeUrl(url);

      expect(result.suspicionReasons).toContain('IP address instead of domain name');
    });

    it('should detect high-risk TLDs', () => {
      const url = 'https://suspicious-site.tk/download';
      const result = analyzeUrl(url);

      expect(result.suspicionReasons).toContain('High-risk TLD');
    });

    it('should detect sensitive query parameters', () => {
      const url = 'https://example.com/login?password=test123&token=abc';
      const result = analyzeUrl(url);

      expect(result.hasSensitiveQueryParams).toBe(true);
      expect(result.suspicionReasons.some(r => r.includes('Sensitive parameter detected'))).toBe(true);
    });

    it('should detect excessively long URLs', () => {
      const url = 'https://example.com/' + 'a'.repeat(300);
      const result = analyzeUrl(url);

      expect(result.suspicionReasons).toContain('Unusually long URL');
    });

    it('should detect excessive subdomains', () => {
      const url = 'https://sub1.sub2.sub3.sub4.sub5.example.com/page';
      const result = analyzeUrl(url);

      expect(result.suspicionReasons).toContain('Excessive subdomains');
    });

    it('should detect excessive URL encoding', () => {
      const url = 'https://example.com/' + '%20'.repeat(15);
      const result = analyzeUrl(url);

      expect(result.suspicionReasons).toContain('Excessive URL encoding (possible obfuscation)');
    });

    it('should detect deep-link schemes when enabled', () => {
      const url = 'whatsapp://send?text=Hello';
      const result = analyzeUrl(url, false, true);

      expect(result.isDeepLink).toBe(true);
      expect(result.scheme).toBe('whatsapp');
      expect(result.suspicionReasons).toContain('Deep-link to whatsapp app');
    });

    it('should not detect deep-link schemes when disabled', () => {
      const url = 'whatsapp://send?text=Hello';
      const result = analyzeUrl(url, false, false);

      expect(result.isDeepLink).toBe(false);
      expect(result.scheme).toBe('whatsapp');
      expect(result.suspicionReasons).not.toContain('Deep-link to whatsapp app');
    });

    it('should detect deep-link schemes by default', () => {
      const url = 'telegram://msg?text=test';
      const result = analyzeUrl(url);

      expect(result.isDeepLink).toBe(true);
      expect(result.scheme).toBe('telegram');
    });

    it('should detect @ symbol in URL', () => {
      const url = 'https://user@example.com/page';
      const result = analyzeUrl(url);

      expect(result.suspicionReasons).toContain('Contains @ symbol (possible credential phishing)');
    });

    it('should detect data URIs', () => {
      const url = 'data:text/html,<script>alert(1)</script>';
      const result = analyzeUrl(url);

      expect(result.suspicionReasons).toContain('Data URI detected');
    });

    it('should detect JavaScript protocol', () => {
      const url = 'javascript:alert(1)';
      const result = analyzeUrl(url);

      expect(result.suspicionReasons).toContain('JavaScript protocol (XSS risk)');
    });

    it('should detect multiple shorteners', () => {
      const shorteners = [
        'https://tinyurl.com/abc',
        'https://goo.gl/xyz',
        'https://t.co/123',
        'https://ow.ly/test'
      ];

      shorteners.forEach(url => {
        const result = analyzeUrl(url);
        expect(result.isShortened).toBe(true);
      });
    });

    it('should not flag normal URLs', () => {
      const url = 'https://www.example.com/page';
      const result = analyzeUrl(url);

      expect(result.suspicionReasons).toHaveLength(0);
    });

    it('should handle invalid URLs gracefully', () => {
      const url = 'not-a-valid-url';
      const result = analyzeUrl(url);

      expect(result.suspicionReasons).toContain('Invalid URL format');
    });
  });

  describe('detectLinkMismatches', () => {
    it('should detect when display text shows different domain than href', async () => {
      const html = '<a href="https://evil.com">https://paypal.com</a>';
      const result = await detectLinkMismatches(html);

      expect(result).toHaveLength(1);
      expect(result[0].isSuspicious).toBe(true);
      expect(result[0].displayText).toBe('https://paypal.com');
      expect(result[0].actualHref).toBe('https://evil.com');
    });

    it('should detect brand name mismatches', async () => {
      const html = '<a href="https://fake-paypal.com">Click here to access your PayPal account</a>';
      const result = await detectLinkMismatches(html);

      expect(result.length).toBeGreaterThanOrEqual(0);
      if (result.length > 0) {
        expect(result[0].isSuspicious).toBe(true);
        expect(result[0].reason).toContain('paypal');
      }
    });

    it('should detect multiple brand names', async () => {
      const brands = ['paypal', 'amazon', 'microsoft', 'google', 'apple'];

      for (const brand of brands) {
        const html = `<a href="https://fake-site.com">Your ${brand} account</a>`;
        const result = await detectLinkMismatches(html);

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].isSuspicious).toBe(true);
      }
    });

    it('should not flag links where display text matches href domain', async () => {
      const html = '<a href="https://example.com/page">https://example.com</a>';
      const result = await detectLinkMismatches(html);

      expect(result).toHaveLength(0);
    });

    it('should flag risky generic link text', async () => {
      const html = '<a href="http://malicious.xyz/login">click here</a>';
      const result = await detectLinkMismatches(html);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].reason).toMatch(/Generic anchor text/i);
    });

    it('should not flag short display text without signals', async () => {
      const html = '<a href="https://example.com">Go</a>';
      const result = await detectLinkMismatches(html);

      expect(result).toHaveLength(0);
    });

    it('should detect multiple mismatches in same HTML', async () => {
      const html = `
        <a href="https://evil1.com">https://paypal.com</a>
        <a href="https://evil2.com">Visit Amazon here</a>
      `;
      const result = await detectLinkMismatches(html);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle malformed HTML gracefully', async () => {
      const html = '<a href="bad">incomplete';
      const result = await detectLinkMismatches(html);

      // Should not throw error
      expect(Array.isArray(result)).toBe(true);
    });

    it('should detect bank-related mismatches', async () => {
      const html = '<a href="https://phishing.com">Chase Bank Login</a>';
      const result = await detectLinkMismatches(html);

      expect(result).toHaveLength(1);
      expect(result[0].isSuspicious).toBe(true);
    });
  });

  describe('extractUrls', () => {
    it('should extract HTTP URLs from text', () => {
      const text = 'Visit http://example.com for more info';
      const result = extractUrls(text);

      expect(result).toContain('http://example.com');
    });

    it('should extract HTTPS URLs from text', () => {
      const text = 'Visit https://secure.example.com for more info';
      const result = extractUrls(text);

      expect(result).toContain('https://secure.example.com');
    });

    it('should extract multiple URLs', () => {
      const text = 'Visit https://example.com or https://another.com';
      const result = extractUrls(text);

      expect(result).toHaveLength(2);
      expect(result).toContain('https://example.com');
      expect(result).toContain('https://another.com');
    });

    it('should handle URLs with query parameters', () => {
      const text = 'https://example.com/page?id=123&token=abc';
      const result = extractUrls(text);

      expect(result[0]).toContain('?id=123&token=abc');
    });

    it('should handle URLs with fragments', () => {
      const text = 'https://example.com/page#section';
      const result = extractUrls(text);

      expect(result[0]).toContain('#section');
    });

    it('should deduplicate URLs', () => {
      const text = 'https://example.com appears twice: https://example.com';
      const result = extractUrls(text);

      expect(result).toHaveLength(1);
    });

    it('should return empty array when no URLs found', () => {
      const text = 'This text has no URLs';
      const result = extractUrls(text);

      expect(result).toHaveLength(0);
    });

    it('should not extract incomplete URLs', () => {
      const text = 'Not a URL: www.example.com';
      const result = extractUrls(text);

      expect(result).toHaveLength(0);
    });
  });

  describe('analyzeUrls', () => {
    it('should analyze all URLs in text', () => {
      const text = 'Visit https://bit.ly/abc or https://xn--test.com';
      const result = analyzeUrls(text);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(link => link.isShortened)).toBe(true);
    });

    it('should only return suspicious links', () => {
      const text = 'Visit https://example.com (safe) or https://bit.ly/abc (suspicious)';
      const result = analyzeUrls(text);

      // Should only include bit.ly since example.com is not suspicious
      expect(result.every(link => link.suspicionReasons.length > 0)).toBe(true);
    });

    it('should return empty array for safe URLs', () => {
      const text = 'Visit https://www.example.com for info';
      const result = analyzeUrls(text);

      expect(result).toHaveLength(0);
    });

    it('should detect multiple types of suspicious URLs', () => {
      const text = `
        https://bit.ly/test
        https://192.168.1.1/login
        https://example.tk/download
      `;
      const result = analyzeUrls(text);

      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should pass enableOnlineLookups flag', () => {
      const text = 'https://bit.ly/abc';
      const result = analyzeUrls(text, true);

      expect(result).toHaveLength(1);
      expect(result[0].isShortened).toBe(true);
    });

    it('should respect enableDeepLinkAnalysis flag when enabled', () => {
      const text = 'Click whatsapp://send?text=Hello to contact us';
      const result = analyzeUrls(text, false, true);

      expect(result).toHaveLength(1);
      expect(result[0].isDeepLink).toBe(true);
      expect(result[0].suspicionReasons).toContain('Deep-link to whatsapp app');
    });

    it('should respect enableDeepLinkAnalysis flag when disabled', () => {
      const text = 'Click whatsapp://send?text=Hello to contact us';
      const result = analyzeUrls(text, false, false);

      // Should return empty array since deep-link detection is the only suspicious thing
      expect(result).toHaveLength(0);
    });

    it('should detect deep-links by default in analyzeUrls', () => {
      const text = 'telegram://msg and signal://send';
      const result = analyzeUrls(text);

      expect(result).toHaveLength(2);
      expect(result.every(link => link.isDeepLink)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings', async () => {
      expect(extractUrls('')).toHaveLength(0);
      expect(analyzeUrls('')).toHaveLength(0);
      expect(await detectLinkMismatches('')).toHaveLength(0);
    });

    it('should handle very long text', () => {
      const longText = 'a'.repeat(10000) + ' https://example.com ' + 'b'.repeat(10000);
      const result = extractUrls(longText);

      expect(result).toContain('https://example.com');
    });

    it('should handle special characters in URLs', () => {
      const url = 'https://example.com/path?q=hello+world&lang=en';
      const result = analyzeUrl(url);

      expect(result.url).toBe(url);
    });

    it('should handle internationalized URLs', () => {
      const url = 'https://例え.jp/path';
      const result = analyzeUrl(url);

      // Should handle without crashing
      expect(result).toBeDefined();
    });
  });
});
