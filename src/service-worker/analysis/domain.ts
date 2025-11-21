// src/service-worker/analysis/domain.ts
import { DomainAnalysis, TyposquattingResult, TldRiskLevel, DomainHistory, BrandMismatchResult, DomainHistoryStorage } from '../../shared/types';
import { getUserSettings } from '../../shared/user-settings';
import {
  POPULAR_BRANDS,
  HIGH_RISK_TLDS,
  MEDIUM_RISK_TLDS,
  LOW_RISK_TLDS,
  normalizeHomoglyphs,
  containsHomoglyphs,
  normalizeDomainForComparison,
  isTrustedDomain,
  LOW_IMPACT_BRANDS
} from './brand-database';
import { logger } from '../utils/logger';

const DOMAIN_HISTORY_KEY = 'domainHistory';
const inMemoryDomainHistory: DomainHistoryStorage = {};

function hasChromeLocalStorage(): boolean {
  return typeof chrome !== 'undefined' && !!chrome?.storage?.local;
}

function isSameDay(a: number, b: number): boolean {
  const dateA = new Date(a);
  const dateB = new Date(b);
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

async function readDomainHistoryStorage(): Promise<DomainHistoryStorage> {
  if (hasChromeLocalStorage()) {
    const result = await chrome.storage.local.get(DOMAIN_HISTORY_KEY);
    return (result?.[DOMAIN_HISTORY_KEY] as DomainHistoryStorage) || {};
  }
  return inMemoryDomainHistory;
}

async function writeDomainHistoryStorage(history: DomainHistoryStorage): Promise<void> {
  if (hasChromeLocalStorage()) {
    await chrome.storage.local.set({ [DOMAIN_HISTORY_KEY]: history });
  } else {
    Object.assign(inMemoryDomainHistory, history);
  }
}

/**
 * T201-T205: Enhanced domain analysis with typosquatting, TLD risk, history, and brand detection
 */
export async function analyzeDomain(senderEmail: string, contentBrands?: string[], messageDate?: string): Promise<DomainAnalysis> {
  const defaultDomainAnalysis: DomainAnalysis = {
    domain: '',
    isPunycode: false,
    reputationSignals: [],
  };

  if (!senderEmail) {
    return defaultDomainAnalysis;
  }

  const match = senderEmail.match(/@([^>]+)/);
  if (!match || !match[1]) {
    return defaultDomainAnalysis;
  }

  const domain = match[1].toLowerCase();
  const reputationSignals: string[] = [];
  let isPunycode = false;

  // Check for Punycode
  if (domain.startsWith('xn--')) {
    isPunycode = true;
    reputationSignals.push('Punycode domain detected.');
  }

  // T201: Check allow/block lists
  const settings = await getUserSettings();
  const isAllowed = settings.allowedDomains?.includes(domain) || false;
  const isBlocked = settings.blockedDomains?.includes(domain) || false;

  if (isAllowed) {
    reputationSignals.push('Domain is in user allow list.');
  }
  if (isBlocked) {
    reputationSignals.push('Domain is in user block list (HIGH RISK).');
  }

  // Simple heuristics
  const domainLabels = domain.split('.').map(part => part.trim()).filter(Boolean);
  const registrableLabels = domainLabels.length > 1 ? domainLabels.slice(0, -1) : domainLabels;
  const ignoreShortLabels = new Set(['co', 'com', 'net', 'org', 'gov', 'edu', 'ac']);
  let registrableLabel = '';
  for (let i = registrableLabels.length - 1; i >= 0; i--) {
    const candidate = registrableLabels[i];
    if (!ignoreShortLabels.has(candidate)) {
      registrableLabel = candidate;
      break;
    }
  }
  if (!registrableLabel && registrableLabels.length > 0) {
    registrableLabel = registrableLabels[registrableLabels.length - 1];
  }

  if (registrableLabel) {
    let effectiveLabelLength = registrableLabel.length;
    if (registrableLabel.startsWith('xn--')) {
      const punycodeCore = registrableLabel.slice(4);
      if (punycodeCore.length > 0) {
        effectiveLabelLength = punycodeCore.length;
      }
    }
    if (effectiveLabelLength <= 2) {
      reputationSignals.push('Very short domain name.');
    }
  }

  // T203: TLD risk categorization
  const tldRisk = categorizeTldRisk(domain);
  if (tldRisk === 'high') {
    reputationSignals.push('High-risk TLD detected.');
  } else if (tldRisk === 'medium') {
    reputationSignals.push('Medium-risk TLD detected.');
  }

  // High entropy (random-looking) domains
  const entropy = calculateEntropy(domain);
  if (entropy > 3.5) {
    reputationSignals.push('High entropy domain name (random-looking).');
  }

  // T202: Typosquatting detection (skip for trusted domains)
  let typosquatting: TyposquattingResult | undefined;
  if (!isTrustedDomain(domain)) {
    typosquatting = detectTyposquatting(domain);
    if (typosquatting.isLikelySuspicious) {
      reputationSignals.push(`Possible typosquatting detected (similar to: ${typosquatting.similarBrands.join(', ')})`);
    }
  } else {
    // Trusted domain - no typosquatting check needed
    typosquatting = {
      isLikelySuspicious: false,
      similarBrands: [],
      techniques: [],
    };
  }

  // T204: Domain history tracking (skip "first time" warning for trusted domains)
  const domainHistory = await getDomainHistory(domain, messageDate);
  if (domainHistory.isNewDomain && !isTrustedDomain(domain)) {
    reputationSignals.push('First time seeing this domain.');
  }
  if (domainHistory.riskDeviation) {
    reputationSignals.push('Risk level has changed significantly from previous emails.');
  }
  if (domainHistory.isNewContact && !isTrustedDomain(domain)) {
    reputationSignals.push('New contact observed from this domain today.');
  }

  // T205: Brand mismatch detection
  let brandMismatch: BrandMismatchResult | undefined;
  if (contentBrands && contentBrands.length > 0) {
    brandMismatch = detectBrandMismatch(domain, contentBrands);
    if (brandMismatch.suspiciousMismatches.length > 0) {
      const highImpactBrands = brandMismatch.suspiciousMismatches
        .filter(brand => !LOW_IMPACT_BRANDS.includes(brand.toLowerCase()));
      if (highImpactBrands.length > 0) {
        reputationSignals.push(`Email mentions brands (${highImpactBrands.join(', ')}) not matching sender domain.`);
      }
    }
  }

  return {
    domain,
    isPunycode,
    reputationSignals,
    typosquatting,
    tldRisk,
    domainHistory,
    brandMismatch,
    isAllowed,
    isBlocked,
    isNewContact: domainHistory.isNewContact,
  };
}

/**
 * T202: Detect typosquatting using multiple techniques
 */
function detectTyposquatting(domain: string): TyposquattingResult {
  const result: TyposquattingResult = {
    isLikelySuspicious: false,
    similarBrands: [],
    techniques: [],
  };

  const normalized = normalizeDomainForComparison(domain);

  // Check for homoglyphs
  if (containsHomoglyphs(normalized)) {
    result.techniques.push('homoglyph');
  }

  // Normalize homoglyphs for comparison
  const homoglyphNormalized = normalizeHomoglyphs(normalized);

  let minDistance = Infinity;

  // Compare against known brands
  for (const brand of POPULAR_BRANDS) {
    // Direct match after homoglyph normalization
    if (homoglyphNormalized === brand) {
      result.isLikelySuspicious = true;
      result.similarBrands.push(brand);
      result.techniques.push('homoglyph substitution');
      continue;
    }

    // Levenshtein distance check
    const distance = levenshteinDistance(homoglyphNormalized, brand);

    if (distance < minDistance) {
      minDistance = distance;
    }

    // Threshold based on brand length (shorter brands = stricter)
    const threshold = Math.max(2, Math.floor(brand.length * 0.3));

    if (distance <= threshold && distance > 0) {
      result.isLikelySuspicious = true;
      if (!result.similarBrands.includes(brand)) {
        result.similarBrands.push(brand);
      }

      // Determine technique
      if (distance === 1) {
        result.techniques.push('single character change');
      } else if (distance === 2) {
        result.techniques.push('character transposition or substitution');
      } else {
        result.techniques.push('multiple character changes');
      }
    }

    // Check for insertion/addition attacks (e.g., "paypal-security.com")
    if (normalized.includes(brand) || normalized.includes(brand.replace(/\s/g, ''))) {
      result.isLikelySuspicious = true;
      if (!result.similarBrands.includes(brand)) {
        result.similarBrands.push(brand);
      }
      if (!result.techniques.includes('insertion')) {
        result.techniques.push('insertion');
      }
    }

    // Check for substring matches with hyphens
    const domainParts = normalized.split(/[-_]/);
    for (const part of domainParts) {
      if (part === brand) {
        result.isLikelySuspicious = true;
        if (!result.similarBrands.includes(brand)) {
          result.similarBrands.push(brand);
        }
        if (!result.techniques.includes('hyphenation')) {
          result.techniques.push('hyphenation');
        }
      }
    }
  }

  result.levenshteinDistance = minDistance;

  // Remove duplicate techniques
  result.techniques = [...new Set(result.techniques)];

  return result;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * T203: Categorize TLD risk level
 */
function categorizeTldRisk(domain: string): TldRiskLevel {
  const lowerDomain = domain.toLowerCase();

  // Check high-risk TLDs
  for (const tld of HIGH_RISK_TLDS) {
    if (lowerDomain.endsWith(tld)) {
      return 'high';
    }
  }

  // Check medium-risk TLDs
  for (const tld of MEDIUM_RISK_TLDS) {
    if (lowerDomain.endsWith(tld)) {
      return 'medium';
    }
  }

  // Check low-risk TLDs
  for (const tld of LOW_RISK_TLDS) {
    if (lowerDomain.endsWith(tld)) {
      return 'low';
    }
  }

  return 'unknown';
}

/**
 * T204: Get and update domain history
 */
async function getDomainHistory(domain: string, messageDate?: string): Promise<DomainHistory> {
  try {
    const history = await readDomainHistoryStorage();

    const now = new Date().toISOString();
    const existingEntry = history[domain];
    const messageTimestamp = messageDate ? new Date(messageDate).getTime() : Date.now();

    if (!existingEntry) {
      // First time seeing this domain
      const newEntry = {
        firstSeen: now,
        messageCount: 1,
        lastSeen: now,
        isNewDomain: true,
      };
      history[domain] = newEntry;
      await writeDomainHistoryStorage(history);

      return {
        firstSeen: now,
        messageCount: 1,
        isNewDomain: true,
        isNewContact: true,
        lastSeen: now,
      };
    }

    // Update existing entry
    const previousCount = existingEntry.messageCount;
    existingEntry.messageCount += 1;
    existingEntry.lastSeen = now;
    await writeDomainHistoryStorage(history);

    let isNewContact = false;
    if (existingEntry.firstSeen && Number.isFinite(messageTimestamp)) {
      const firstSeenTime = new Date(existingEntry.firstSeen).getTime();
      if (isSameDay(firstSeenTime, messageTimestamp) && previousCount === 1) {
        isNewContact = true;
      }
    }

    return {
      firstSeen: existingEntry.firstSeen,
      messageCount: existingEntry.messageCount,
      lastRiskScore: existingEntry.lastRiskScore,
      isNewDomain: false,
      isNewContact,
      lastSeen: existingEntry.lastSeen,
    };
  } catch (error) {
    logger.error('Error accessing domain history:', error);
    return {
      messageCount: 0,
      isNewDomain: true,
    };
  }
}

/**
 * Update domain history with risk score
 */
export async function updateDomainRiskHistory(domain: string, riskScore: 'low' | 'medium' | 'high'): Promise<void> {
  try {
    const history = await readDomainHistoryStorage();

    if (history[domain]) {
      const previousRisk = history[domain].lastRiskScore;
      history[domain].lastRiskScore = riskScore;
      await writeDomainHistoryStorage(history);

      // Check for risk deviation
      if (previousRisk && previousRisk !== riskScore) {
        logger.info(`Risk deviation detected for ${domain}: ${previousRisk} -> ${riskScore}`);
      }
    }
  } catch (error) {
    logger.error('Error updating domain risk history:', error);
  }
}

/**
 * T205: Detect brand name mismatches
 */
function detectBrandMismatch(domain: string, contentBrands: string[]): BrandMismatchResult {
  const normalized = normalizeDomainForComparison(domain);
  const result: BrandMismatchResult = {
    detectedInContent: contentBrands,
    matchesSenderDomain: false,
    suspiciousMismatches: [],
  };

  for (const brand of contentBrands) {
    const brandNormalized = brand.toLowerCase().trim();

    // Check if brand matches sender domain
    if (normalized.includes(brandNormalized) || brandNormalized.includes(normalized)) {
      result.matchesSenderDomain = true;
    } else {
      // Brand mentioned but doesn't match sender - potential phishing
      result.suspiciousMismatches.push(brand);
    }
  }

  return result;
}

/**
 * Simple entropy calculation (Shannon entropy)
 */
function calculateEntropy(s: string): number {
  const frequencies: { [key: string]: number } = {};
  for (const char of s) {
    frequencies[char] = (frequencies[char] || 0) + 1;
  }

  let entropy = 0;
  const totalChars = s.length;
  for (const char in frequencies) {
    const probability = frequencies[char] / totalChars;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}

/**
 * T201: Export domain lists for user management
 */
export async function exportDomainLists(): Promise<{ allowed: string[]; blocked: string[] }> {
  try {
    const settings = await getUserSettings();
    return {
      allowed: settings.allowedDomains || [],
      blocked: settings.blockedDomains || [],
    };
  } catch (error) {
    logger.error('Error exporting domain lists:', error);
    return { allowed: [], blocked: [] };
  }
}

/**
 * T201: Import domain lists
 */
export async function importDomainLists(allowed: string[], blocked: string[]): Promise<void> {
  try {
    const settings = await getUserSettings();
    settings.allowedDomains = [...new Set([...(settings.allowedDomains || []), ...allowed])];
    settings.blockedDomains = [...new Set([...(settings.blockedDomains || []), ...blocked])];
    await chrome.storage.sync.set({ userSettings: settings });
    logger.info('Domain lists imported successfully');
  } catch (error) {
    logger.error('Error importing domain lists:', error);
    throw error;
  }
}

/**
 * T201: Add domain to allow list
 */
export async function addToAllowList(domain: string): Promise<void> {
  try {
    const settings = await getUserSettings();
    if (!settings.allowedDomains) {
      settings.allowedDomains = [];
    }
    if (!settings.allowedDomains.includes(domain)) {
      settings.allowedDomains.push(domain);
      await chrome.storage.sync.set({ userSettings: settings });
      logger.info(`Added ${domain} to allow list`);
    }
  } catch (error) {
    logger.error('Error adding to allow list:', error);
    throw error;
  }
}

/**
 * T201: Add domain to block list
 */
export async function addToBlockList(domain: string): Promise<void> {
  try {
    const settings = await getUserSettings();
    if (!settings.blockedDomains) {
      settings.blockedDomains = [];
    }
    if (!settings.blockedDomains.includes(domain)) {
      settings.blockedDomains.push(domain);
      await chrome.storage.sync.set({ userSettings: settings });
      logger.info(`Added ${domain} to block list`);
    }
  } catch (error) {
    logger.error('Error adding to block list:', error);
    throw error;
  }
}

/**
 * T201: Remove domain from allow list
 */
export async function removeFromAllowList(domain: string): Promise<void> {
  try {
    const settings = await getUserSettings();
    if (settings.allowedDomains) {
      settings.allowedDomains = settings.allowedDomains.filter(d => d !== domain);
      await chrome.storage.sync.set({ userSettings: settings });
      logger.info(`Removed ${domain} from allow list`);
    }
  } catch (error) {
    logger.error('Error removing from allow list:', error);
    throw error;
  }
}

/**
 * T201: Remove domain from block list
 */
export async function removeFromBlockList(domain: string): Promise<void> {
  try {
    const settings = await getUserSettings();
    if (settings.blockedDomains) {
      settings.blockedDomains = settings.blockedDomains.filter(d => d !== domain);
      await chrome.storage.sync.set({ userSettings: settings });
      logger.info(`Removed ${domain} from block list`);
    }
  } catch (error) {
    logger.error('Error removing from block list:', error);
    throw error;
  }
}
