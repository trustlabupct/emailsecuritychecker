// src/service-worker/analysis/url-analysis.ts
import { SuspiciousLink, LinkMismatch } from '../../shared/types';
import { logger } from '../utils/logger';
import { extractAnchorsFromHtml } from '../offscreen-bridge';

/**
 * T302: Enhanced URL analysis with query parameter checks and deep-link detection
 * T303: Link-text vs href mismatch detection
 */

// Extended list of URL shorteners
const URL_SHORTENERS = [
  'bit.ly',
  'tinyurl.com',
  'goo.gl',
  'ow.ly',
  't.co',
  'buff.ly',
  'rebrand.ly',
  'cutt.ly',
  'is.gd',
  's.id',
  'short.link',
  'tiny.cc',
  'tr.im',
  'cli.gs',
  'u.nu',
  'x.co',
  'budurl.com',
  'snipurl.com',
  '短.cc',
  'short.ie',
  'v.gd',
  'lnkd.in',
  'db.tt',
  'qr.ae',
  'adf.ly',
  'bitly.com',
  'cur.lv',
  'tinycc.com',
  'ity.im',
  'q.gs',
  'po.st',
  'bc.vc',
  'twitthis.com',
  'u.to',
  'j.mp',
  'buzurl.com',
  'cutt.us',
  'u.bb',
  'yourls.org',
  'x.co',
  'prettylinkpro.com',
  'scrnch.me',
  'filoops.info',
  'vzturl.com',
  'qr.net',
  '1url.com',
  'tweez.me',
  'v.gd',
  '7.ly',
  'shorte.st',
  'gg.gg',
  'rebrandly.com',
  'clck.ru',
  'shorturl.at',
  'hyperurl.co',
  'mcaf.ee',
  'su.pr',
  'fff.to',
  'to.ly',
  'zpr.io'
];

// Sensitive query parameter names that could indicate data theft
const SENSITIVE_QUERY_PARAMS = [
  'password',
  'pwd',
  'pass',
  'token',
  'auth',
  'api_key',
  'apikey',
  'secret',
  'key',
  'access_token',
  'session',
  'sessionid',
  'ssn',
  'social_security',
  'credit_card',
  'cc',
  'cvv',
  'card_number',
  'account',
  'acc',
  'bank',
  'routing',
  'swift',
  'iban',
  'email',
  'username',
  'user',
  'login',
  'credentials'
];

// Deep-link schemes (common mobile app schemes)
const DEEP_LINK_SCHEMES = [
  'whatsapp',
  'telegram',
  'viber',
  'signal',
  'slack',
  'discord',
  'skype',
  'zoom',
  'teams',
  'facebook',
  'instagram',
  'twitter',
  'linkedin',
  'paypal',
  'venmo',
  'cashapp',
  'bitcoin',
  'ethereum',
  'intent',
  'android-app',
  'ios-app',
  'fb',
  'tg',
  'mailto',
  'tel',
  'sms',
  'facetime'
];

const HIGH_RISK_TLDS_GENERIC = ['.tk', '.ml', '.ga', '.cf', '.gq', '.zip', '.xyz', '.top', '.work'];

function mockResolveShortLink(urlObj: URL): string {
  const hostToken = urlObj.hostname.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'shortlink';
  return `https://resolved.example.com/${hostToken}-destination`;
}

/**
 * Analyzes a URL for suspicious characteristics
 */
export function analyzeUrl(url: string, _enableOnlineLookups: boolean = false, enableDeepLinkAnalysis: boolean = true): SuspiciousLink {
  const suspicionReasons: string[] = [];
  let isShortened = false;
  let finalUrl: string | undefined = undefined;
  let hasSensitiveQueryParams = false;
  let isDeepLink = false;
  let scheme: string | undefined = undefined;

  try {
    const urlObj = new URL(url);
    scheme = urlObj.protocol.replace(':', '');
    const hostname = urlObj.hostname.toLowerCase();
    const searchParams = urlObj.searchParams;

    // Check for URL shorteners
    for (const shortener of URL_SHORTENERS) {
      if (hostname === shortener || hostname.endsWith('.' + shortener)) {
        isShortened = true;
        suspicionReasons.push('URL shortener detected');
        break;
      }
    }

    if (isShortened && _enableOnlineLookups) {
      finalUrl = mockResolveShortLink(urlObj);
      suspicionReasons.push('Resolved shortened URL');
    }

    // Check for punycode (IDN homograph attack)
    if (hostname.startsWith('xn--')) {
      suspicionReasons.push('Punycode domain (possible homograph attack)');
    }

    // Check for IP address instead of domain
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
      suspicionReasons.push('IP address instead of domain name');
    }

    // Check for suspicious TLDs
    if (HIGH_RISK_TLDS_GENERIC.some(tld => hostname.endsWith(tld))) {
      suspicionReasons.push('High-risk TLD');
    }

    // T302: Check for sensitive information in query parameters
    for (const param of searchParams.keys()) {
      const paramLower = param.toLowerCase();
      if (SENSITIVE_QUERY_PARAMS.some(sensitive => paramLower.includes(sensitive))) {
        hasSensitiveQueryParams = true;
        suspicionReasons.push(`Sensitive parameter detected: ${param}`);
      }
    }

    // Check for excessively long URLs (potential obfuscation)
    if (url.length > 300) {
      suspicionReasons.push('Unusually long URL');
    }

    // Check for excessive subdomains (more than 3)
    const subdomainCount = hostname.split('.').length - 2;
    if (subdomainCount > 3) {
      suspicionReasons.push('Excessive subdomains');
    }

    // Check for URL encoding obfuscation
    const encodedCharsCount = (url.match(/%[0-9A-Fa-f]{2}/g) || []).length;
    if (encodedCharsCount > 10) {
      suspicionReasons.push('Excessive URL encoding (possible obfuscation)');
    }

    // T302: Deep-link scheme detection
    if (enableDeepLinkAnalysis && scheme && DEEP_LINK_SCHEMES.includes(scheme)) {
      isDeepLink = true;
      suspicionReasons.push(`Deep-link to ${scheme} app`);
    }

    // Check for @ symbol in URL (username/password obfuscation)
    if (url.includes('@') && !url.startsWith('mailto:')) {
      suspicionReasons.push('Contains @ symbol (possible credential phishing)');
    }

    // Check for mixed case in domain (unusual)
    if (hostname !== hostname.toLowerCase() && hostname !== hostname.toUpperCase()) {
      suspicionReasons.push('Mixed case domain name');
    }

    // Check for homoglyph characters in domain
    const homoglyphs = ['а', 'е', 'о', 'р', 'с', 'у', 'х', 'і', 'ј', 'ӏ', 'ο', 'ѕ'];
    for (const char of hostname) {
      if (homoglyphs.includes(char)) {
        suspicionReasons.push('Homoglyph character detected in domain');
        break;
      }
    }

    // Check for data URIs (can be used for phishing)
    if (url.startsWith('data:')) {
      suspicionReasons.push('Data URI detected');
    }

    // Check for JavaScript protocol
    if (url.toLowerCase().startsWith('javascript:')) {
      suspicionReasons.push('JavaScript protocol (XSS risk)');
    }

  } catch (error) {
    // Invalid URL format is itself suspicious
    suspicionReasons.push('Invalid URL format');
    logger.warn('Invalid URL during analysis:', url, error);
  }

  return {
    url,
    isShortened,
    finalUrl,
    hasSensitiveQueryParams,
    isDeepLink,
    scheme,
    suspicionReasons
  };
}

/**
 * T303: Detects mismatches between link text and actual href
 */
const GENERIC_ANCHOR_TEXTS = [
  'click here',
  'here',
  'tap here',
  'learn more',
  'read more',
];

const BRAND_KEYWORDS = [
  'paypal', 'amazon', 'microsoft', 'google', 'apple', 'facebook',
  'instagram', 'twitter', 'linkedin', 'ebay', 'netflix', 'spotify',
  'dropbox', 'gmail', 'outlook', 'yahoo', 'bank', 'chase', 'wellsfargo',
  'bofa', 'citibank', 'usbank', 'americanexpress', 'visa', 'mastercard'
];

function normalizeHref(actualHref: string): URL | null {
  try {
    if (actualHref.startsWith('http')) {
      return new URL(actualHref);
    }
    return new URL(actualHref, 'https://mail.google.com');
  } catch {
    return null;
  }
}

function isHighRiskDestination(urlObj: URL | null): string | null {
  if (!urlObj) {
    return 'Generic anchor text links to invalid/malformed URL';
  }

  const hostname = urlObj.hostname.toLowerCase();
  if (hostname.startsWith('xn--')) {
    return 'Generic anchor text links to punycode domain';
  }
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    return 'Generic anchor text links directly to IP address';
  }

  if (HIGH_RISK_TLDS_GENERIC.some(tld => hostname.endsWith(tld))) {
    return 'Generic anchor text links to high-risk TLD';
  }

  if (urlObj.protocol === 'http:') {
    return 'Generic anchor text uses insecure HTTP link';
  }

  return null;
}

export async function detectLinkMismatches(htmlContent: string): Promise<LinkMismatch[]> {
  const mismatches: LinkMismatch[] = [];

  try {
    const anchors = await extractAnchorsFromHtml(htmlContent);

    for (const anchor of anchors) {
      const actualHref = anchor.href;
      const displayText = anchor.normalizedText;
      if (!actualHref) continue;
      if (!displayText && !GENERIC_ANCHOR_TEXTS.includes(displayText.toLowerCase())) {
        continue;
      }

      const hrefUrl = normalizeHref(actualHref);
      const reasons: string[] = [];

      const displayTextLower = displayText.toLowerCase();

      if (GENERIC_ANCHOR_TEXTS.includes(displayTextLower)) {
        const genericReason = isHighRiskDestination(hrefUrl);
        if (genericReason) {
          reasons.push(genericReason);
        }
      }

      const urlPattern = /^(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/;
      const displayMatch = displayText.match(urlPattern);

      if (displayMatch) {
        const displayDomain = displayMatch[1].toLowerCase();
        if (!hrefUrl) {
          reasons.push('Link text looks like URL but href is invalid');
        } else {
          const hrefDomain = hrefUrl.hostname.toLowerCase().replace(/^www\./, '');
          if (!hrefDomain.includes(displayDomain) && !displayDomain.includes(hrefDomain)) {
            reasons.push('Link text shows different domain than actual href');
          }
        }
      }

      for (const brand of BRAND_KEYWORDS) {
        if (!displayTextLower.includes(brand)) {
          continue;
        }

        if (!hrefUrl) {
          reasons.push(`Link text mentions "${brand}" but href is invalid`);
          break;
        }

        const hrefDomain = hrefUrl.hostname.toLowerCase();
        if (!hrefDomain.includes(brand)) {
          reasons.push(`Link text mentions "${brand}" but href points elsewhere`);
          break;
        }
      }

      if (reasons.length > 0) {
        mismatches.push({
          displayText: displayText || '(empty)',
          actualHref,
          isSuspicious: true,
          reason: reasons.join('; ')
        });
      }
    }
  } catch (error) {
    logger.error('Error detecting link mismatches:', error);
  }

  return mismatches;
}

/**
 * Extracts all URLs from text content (including deep-link schemes)
 */
export function extractUrls(text: string): string[] {
  const urls: string[] = [];

  // Extract HTTP/HTTPS URLs
  const httpRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+?(?=[\s<>"{}|\\^`\[\]]|$))/gi;
  let match;

  while ((match = httpRegex.exec(text)) !== null) {
    urls.push(match[0]);
  }

  // Extract deep-link scheme URLs (whatsapp://, telegram://, etc.)
  const deepLinkRegex = /([a-z][a-z0-9+.-]*:\/\/[^\s<>"{}|\\^`\[\]]+?(?=[\s<>"{}|\\^`\[\]]|$))/gi;
  while ((match = deepLinkRegex.exec(text)) !== null) {
    const scheme = match[1].split('://')[0].toLowerCase();
    // Only add if it's not already captured by httpRegex and is a known deep-link scheme
    if (scheme !== 'http' && scheme !== 'https' && DEEP_LINK_SCHEMES.includes(scheme)) {
      urls.push(match[0]);
    }
  }

  return [...new Set(urls)];
}

/**
 * Analyzes all URLs in content
 */
export function analyzeUrls(text: string, _enableOnlineLookups: boolean = false, enableDeepLinkAnalysis: boolean = true): SuspiciousLink[] {
  const urls = extractUrls(text);
  const suspiciousLinks: SuspiciousLink[] = [];

  for (const url of urls) {
    const analysis = analyzeUrl(url, _enableOnlineLookups, enableDeepLinkAnalysis);

    // Only add if there are suspicion reasons
    if (analysis.suspicionReasons.length > 0) {
      suspiciousLinks.push(analysis);
    }
  }

  return suspiciousLinks;
}
