// src/service-worker/analysis/brand-database.ts
// T202: Brand database for typosquatting detection

export const POPULAR_BRANDS = [
  // Tech companies
  'google', 'gmail', 'microsoft', 'outlook', 'apple', 'amazon', 'facebook', 'meta',
  'twitter', 'instagram', 'linkedin', 'youtube', 'netflix', 'adobe', 'oracle',
  'salesforce', 'dropbox', 'spotify', 'slack', 'zoom', 'cisco', 'intel', 'nvidia',
  'paypal', 'ebay', 'alibaba', 'tencent', 'baidu', 'yahoo', 'tumblr', 'reddit',
  'pinterest', 'snapchat', 'tiktok', 'whatsapp', 'telegram', 'signal', 'discord',
  'twitch', 'github', 'gitlab', 'bitbucket', 'stackoverflow', 'wordpress', 'shopify',

  // Financial institutions
  'visa', 'mastercard', 'amex', 'discover', 'chase', 'wellsfargo', 'bankofamerica',
  'citibank', 'hsbc', 'barclays', 'santander', 'jpmorgan', 'goldmansachs',
  'morganstanley', 'schwab', 'fidelity', 'vanguard', 'robinhood', 'coinbase',
  'binance', 'kraken', 'revolut', 'wise', 'stripe', 'square', 'venmo', 'cashapp',

  // Retail and services
  'walmart', 'target', 'costco', 'homedepot', 'lowes', 'bestbuy', 'fedex', 'ups',
  'dhl', 'usps', 'starbucks', 'mcdonalds', 'subway', 'nike', 'adidas', 'ikea',

  // Cloud and enterprise
  'aws', 'azure', 'cloudflare', 'digitalocean', 'heroku', 'mongodb', 'redis',
  'postgresql', 'mysql', 'atlassian', 'jira', 'confluence', 'asana', 'trello',
  'notion', 'airtable', 'zapier', 'hubspot', 'mailchimp', 'sendgrid', 'twilio',

  // Security and identity
  'okta', 'auth0', 'duo', 'lastpass', 'onepassword', 'dashlane', 'bitwarden',
  'nordvpn', 'expressvpn', 'protonmail', 'tutanota',

  // Government and services
  'irs', 'uscis', 'socialsecurity', 'medicaid', 'medicare', 'usps',

  // Telecom
  'verizon', 'att', 'tmobile', 'sprint', 'comcast', 'xfinity', 'spectrum',
  'vodafone', 'orange', 'telekom', 'o2', 'three',
];

// Common domain suffixes for brands
export const COMMON_BRAND_SUFFIXES = [
  'mail', 'support', 'help', 'team', 'service', 'notification', 'noreply',
  'info', 'contact', 'admin', 'security', 'account', 'verify', 'alert',
];

// Homoglyph mappings for visual similarity detection
export const HOMOGLYPH_MAP: { [key: string]: string[] } = {
  'a': ['à', 'á', 'â', 'ã', 'ä', 'å', 'ā', 'ă', 'ą', 'α', 'а', 'ａ'],
  'b': ['ḃ', 'ḅ', 'ḇ', 'ƅ', 'ɓ', 'б', 'ｂ'],
  'c': ['ç', 'ć', 'ĉ', 'ċ', 'č', 'ƈ', 'с', 'ｃ'],
  'd': ['ď', 'đ', 'ḋ', 'ḍ', 'ḏ', 'ḑ', 'ḓ', 'ԁ', 'ｄ'],
  'e': ['è', 'é', 'ê', 'ë', 'ē', 'ĕ', 'ė', 'ę', 'ě', 'е', 'ｅ'],
  'f': ['ƒ', 'ḟ', 'ｆ'],
  'g': ['ĝ', 'ğ', 'ġ', 'ģ', 'ǥ', 'ɠ', 'ɡ', 'ｇ'],
  'h': ['ĥ', 'ħ', 'ḣ', 'ḥ', 'ḧ', 'ḩ', 'ḫ', 'һ', 'ｈ'],
  'i': ['ì', 'í', 'î', 'ï', 'ĩ', 'ī', 'ĭ', 'į', 'ı', 'і', 'ｉ'],
  'j': ['ĵ', 'ǰ', 'ј', 'ｊ'],
  'k': ['ķ', 'ḱ', 'ḳ', 'ḵ', 'ƙ', 'κ', 'ｋ'],
  'l': ['ĺ', 'ļ', 'ľ', 'ŀ', 'ł', 'ḷ', 'ḹ', 'ḻ', 'ḽ', 'ӏ', 'ｌ', '1', 'і'],
  'm': ['ḿ', 'ṁ', 'ṃ', 'м', 'ｍ', 'rn'], // 'rn' can look like 'm'
  'n': ['ñ', 'ń', 'ņ', 'ň', 'ŉ', 'ṅ', 'ṇ', 'ṉ', 'ṋ', 'н', 'ｎ'],
  'o': ['ò', 'ó', 'ô', 'õ', 'ö', 'ø', 'ō', 'ŏ', 'ő', 'ο', 'о', 'ｏ', '0'],
  'p': ['ṕ', 'ṗ', 'р', 'ｐ'],
  'q': ['ԛ', 'ｑ'],
  'r': ['ŕ', 'ŗ', 'ř', 'ṙ', 'ṛ', 'ṝ', 'ṟ', 'г', 'ｒ'],
  's': ['ś', 'ŝ', 'ş', 'š', 'ṡ', 'ṣ', 'ṥ', 'ṧ', 'ṩ', 'ѕ', 'ｓ', '$'],
  't': ['ţ', 'ť', 'ŧ', 'ṫ', 'ṭ', 'ṯ', 'ṱ', 'т', 'ｔ'],
  'u': ['ù', 'ú', 'û', 'ü', 'ũ', 'ū', 'ŭ', 'ů', 'ű', 'ų', 'υ', 'и', 'ｕ'],
  'v': ['ṽ', 'ṿ', 'ν', 'ѵ', 'ｖ'],
  'w': ['ŵ', 'ẁ', 'ẃ', 'ẅ', 'ẇ', 'ẉ', 'ѡ', 'ｗ', 'vv'],
  'x': ['ẋ', 'ẍ', 'х', 'ｘ'],
  'y': ['ý', 'ÿ', 'ŷ', 'ẏ', 'ẙ', 'ỳ', 'ỵ', 'у', 'ｙ'],
  'z': ['ź', 'ż', 'ž', 'ẑ', 'ẓ', 'ẕ', 'ｚ'],
  'A': ['Α', 'А', 'Ꭺ', 'ꓮ', '𝔄'],
  'B': ['Β', 'В', 'Ᏼ', 'ꓐ', 'ᗷ'],
  'C': ['Ϲ', 'С', 'Ꮯ', '𝐂'],
  'D': ['Ꭰ', 'ꓓ', '𝐃'],
  'E': ['Ε', 'Е', 'Ꭼ', 'ꓰ'],
  'F': ['ꓝ', '𝐅'],
  'G': ['ɢ', 'Ԍ', 'Ꮐ', '𝐆'],
  'H': ['Η', 'Н', 'Ꮋ', 'ꓧ'],
  'I': ['Ι', 'І', 'Ⅰ', 'Ꮖ', 'l'],
  'J': ['Ј', 'Ꭻ', 'ꓙ'],
  'K': ['Κ', 'К', 'Ꮶ', 'ꓗ'],
  'L': ['Ꮮ', 'ꓡ', '𝐋'],
  'M': ['Μ', 'М', 'Ꮇ', 'ᛖ', 'ꓟ'],
  'N': ['Ν', 'Ｎ', 'Ⲛ', 'ꓠ'],
  'O': ['Ο', 'О', '0', 'Ꮎ', 'ꓳ'],
  'P': ['Ρ', 'Р', 'Ꮲ', 'ꓑ'],
  'Q': ['ℚ', 'ꓭ'],
  'R': ['Ꭱ', 'Ꮢ', 'ꓣ'],
  'S': ['Ѕ', 'Ꮪ', '$'],
  'T': ['Τ', 'Т', 'Ꭲ', '߮'],
  'U': ['⋃', 'Ս', 'Ꮼ'],
  'V': ['∨', 'Ѵ', 'Ꮩ'],
  'W': ['Ѡ', 'Ꮃ', 'ꓪ'],
  'X': ['Χ', 'Х', 'ᚷ'],
  'Y': ['Υ', 'У', 'Ɏ'],
  'Z': ['Ζ', 'Ꮓ', '乙'],
  '0': ['O', 'o', 'Ο', 'О', '०', '〇'],
  '1': ['l', 'I', 'ᛁ', '１', 'ߊ'],
  '2': ['Ƨ', 'ᒿ'],
  '3': ['Ɛ', 'З', 'Ȝ'],
  '4': ['Ꮞ', '٤'],
  '5': ['Ѕ', 'Ƽ', '５'],
  '6': ['Ꮾ', 'б'],
  '7': ['Ꮞ', '७'],
  '8': ['ॻ', 'ȣ'],
  '9': ['୨', '९'],
};

// Character substitution patterns for typosquatting
export const SUBSTITUTION_PATTERNS: { [key: string]: string[] } = {
  'a': ['@', '4'],
  'e': ['3'],
  'i': ['1', 'l', '!'],
  'o': ['0'],
  's': ['5', '$'],
  't': ['7', '+'],
  'l': ['1', 'i'],
  'g': ['9'],
  'b': ['8'],
};

// High-risk TLDs commonly used in phishing
export const HIGH_RISK_TLDS = [
  '.xyz', '.top', '.bid', '.win', '.loan', '.club', '.online', '.site', '.work',
  '.click', '.link', '.download', '.stream', '.racing', '.cricket', '.review',
  '.trade', '.party', '.science', '.accountant', '.date', '.faith', '.zip',
  '.mov', '.country', '.kim', '.gq', '.ml', '.cf', '.ga', '.tk',
];

// Medium-risk TLDs (newer or less established)
export const MEDIUM_RISK_TLDS = [
  '.info', '.biz', '.pw', '.cc', '.ws', '.cn', '.ru', '.in', '.su', '.nu',
  '.co', '.me', '.to', '.tv', '.io', '.ai', '.app', '.dev', '.page',
];

// Low-risk TLDs (well-established and commonly legitimate)
export const LOW_RISK_TLDS = [
  '.com', '.org', '.net', '.edu', '.gov', '.mil', '.int', '.uk', '.de', '.fr',
  '.ca', '.au', '.jp', '.nl', '.it', '.es', '.se', '.no', '.dk', '.fi',
  '.nz', '.ch', '.at', '.be', '.pl', '.br', '.mx', '.za', '.kr', '.sg',
];

// Trusted domains that should be excluded from typosquatting detection
// These are legitimate services that may contain brand names in their domains
export const TRUSTED_DOMAINS = [
  // Google services
  'google.com', 'accounts.google.com', 'gmail.com', 'gaia.bounces.google.com',
  'mail.google.com', 'drive.google.com', 'docs.google.com', 'cloud.google.com',
  'googleapis.com', 'googlemail.com', 'youtube.com', 'android.com',

  // Microsoft services
  'microsoft.com', 'outlook.com', 'live.com', 'hotmail.com', 'office.com',
  'office365.com', 'microsoftonline.com', 'azure.com', 'windows.com',

  // Apple services
  'apple.com', 'icloud.com', 'me.com', 'mac.com', 'itunes.com', 'appstore.com',

  // Amazon services
  'amazon.com', 'aws.amazon.com', 'amazonaws.com', 'awsstatic.com',

  // Meta/Facebook services
  'facebook.com', 'meta.com', 'instagram.com', 'whatsapp.com', 'fb.com',

  // Other major tech
  'twitter.com', 'x.com', 'linkedin.com', 'github.com', 'gitlab.com',
  'dropbox.com', 'salesforce.com', 'adobe.com', 'zoom.us', 'slack.com',

  // Financial institutions (major)
  'paypal.com', 'stripe.com', 'square.com', 'venmo.com',

  // Major social senders for notifications
  'facebookmail.com', 'instagram.com',

  // Email service providers
  'protonmail.com', 'tutanota.com', 'mailchimp.com', 'sendgrid.com',
];

// Brands commonly referenced for social links; mismatches here are usually low impact
export const LOW_IMPACT_BRANDS = [
  'facebook',
  'instagram',
  'whatsapp',
  'telegram',
  'youtube',
  'twitter',
  'x',
  'linkedin',
  'google',
  'gmail'
];

// Keywords commonly found in brand names within email content
export const BRAND_KEYWORD_PATTERNS = [
  // Payment/Financial keywords
  /\b(paypal|venmo|zelle|cash\s*app|apple\s*pay|google\s*pay)\b/gi,
  /\b(visa|mastercard|amex|american\s*express|discover)\b/gi,
  /\b(bank\s*of\s*america|wells\s*fargo|chase|citibank)\b/gi,

  // Tech company keywords
  /\b(google|microsoft|apple|amazon|facebook|meta)\b/gi,
  /\b(netflix|spotify|adobe|dropbox|zoom)\b/gi,

  // Shipping/Delivery
  /\b(fedex|ups|dhl|usps|amazon\s*prime)\b/gi,

  // Government
  /\b(irs|social\s*security|medicare|medicaid)\b/gi,
];

/**
 * Normalize a domain for comparison (remove common prefixes/suffixes)
 */
export function normalizeDomainForComparison(domain: string): string {
  let normalized = domain.toLowerCase().trim();

  // Remove common email prefixes
  const prefixes = ['mail.', 'email.', 'smtp.', 'webmail.', 'secure.'];
  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.substring(prefix.length);
    }
  }

  // Remove TLD for comparison
  const lastDot = normalized.lastIndexOf('.');
  if (lastDot > 0) {
    normalized = normalized.substring(0, lastDot);
  }

  return normalized;
}

/**
 * Check if a domain is in the trusted list
 */
export function isTrustedDomain(domain: string): boolean {
  const normalized = domain.toLowerCase().trim();

  // Gov domains (including ccTLD variants)
  if (/.+\.gov(\.[a-z]{2,})?$/.test(normalized)) {
    return true;
  }

  // Check exact match
  if (TRUSTED_DOMAINS.includes(normalized)) {
    return true;
  }

  // Check if it's a subdomain of a trusted domain
  for (const trustedDomain of TRUSTED_DOMAINS) {
    if (normalized.endsWith('.' + trustedDomain) || normalized === trustedDomain) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a string contains homoglyphs
 */
export function containsHomoglyphs(text: string): boolean {
  for (const char of text) {
    for (const [_, homoglyphs] of Object.entries(HOMOGLYPH_MAP)) {
      if (homoglyphs.includes(char)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Convert homoglyphs to their ASCII equivalents
 */
export function normalizeHomoglyphs(text: string): string {
  let normalized = text.toLowerCase();

  for (const [ascii, homoglyphs] of Object.entries(HOMOGLYPH_MAP)) {
    for (const homoglyph of homoglyphs) {
      normalized = normalized.replace(new RegExp(homoglyph, 'g'), ascii);
    }
  }

  return normalized;
}
