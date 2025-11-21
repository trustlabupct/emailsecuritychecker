// src/service-worker/analysis/nlp-analysis.ts
import { NlpAnalysis } from '../../shared/types';
import { logger } from '../utils/logger';
import { getUserSettings } from '../../shared/user-settings';
import { mergeWithCustomKeywords } from '../../shared/localization';
import nlpPatterns from '../../shared/nlp-patterns.json';

/**
 * T306: NLP-based tone and request analysis using lightweight patterns
 * Note: compromise library will be lazy-loaded to avoid performance impact
 */

type LocaleCode = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt';

interface RequestPatternSet {
  payment: string[];
  credentials: string[];
  personal_info: string[];
  download: string[];
  click_link: string[];
  reply: string[];
}

interface ModalityKeywords {
  must: string[];
  should: string[];
  command: string[];
}

interface LocalePatterns {
  requestPatterns: RequestPatternSet;
  modalityKeywords: ModalityKeywords;
}

function normalizeForMatch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getCurrentLocale(): LocaleCode {
  const locale =
    typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage
      ? chrome.i18n.getUILanguage().split('-')[0].toLowerCase()
      : 'en';
  const supported: LocaleCode[] = ['en', 'es', 'fr', 'de', 'it', 'pt'];
  return supported.includes(locale as LocaleCode) ? (locale as LocaleCode) : 'en';
}

// Loaded patterns from JSON (see src/shared/nlp-patterns.json)
const NLP_PATTERNS: Record<LocaleCode, LocalePatterns> = nlpPatterns as Record<LocaleCode, LocalePatterns>;

function getLocalePatterns(locale: LocaleCode): LocalePatterns {
  const fallback = NLP_PATTERNS.en || (Object.values(NLP_PATTERNS)[0] as LocalePatterns | undefined);
  if (NLP_PATTERNS[locale]) {
    return NLP_PATTERNS[locale];
  }
  if (fallback) {
    return fallback;
  }
  return {
    requestPatterns: {
      payment: [],
      credentials: [],
      personal_info: [],
      download: [],
      click_link: [],
      reply: [],
    },
    modalityKeywords: {
      must: [],
      should: [],
      command: [],
    },
  };
}

/**
 * Analyzes text for urgency indicators
 */
function detectUrgency(text: string, urgencyKeywords: string[]): number {
  const normalizedText = normalizeForMatch(text);
  let urgencyScore = 0;

  for (const pattern of urgencyKeywords) {
    if (normalizedText.includes(normalizeForMatch(pattern))) {
      urgencyScore += 1;
    }
  }

  return urgencyScore;
}

/**
 * Analyzes text for threatening language
 */
function detectThreatening(text: string, threatKeywords: string[]): number {
  const normalizedText = normalizeForMatch(text);
  let threateningScore = 0;

  for (const pattern of threatKeywords) {
    if (normalizedText.includes(normalizeForMatch(pattern))) {
      threateningScore += 1;
    }
  }

  return threateningScore;
}

/**
 * Analyzes text for enticing language
 */
function detectEnticing(text: string, scamKeywords: string[]): number {
  const normalizedText = normalizeForMatch(text);
  let enticingScore = 0;

  for (const pattern of scamKeywords) {
    if (normalizedText.includes(normalizeForMatch(pattern))) {
      enticingScore += 1;
    }
  }

  return enticingScore;
}

/**
 * Detects request types in the text
 */
function detectRequestTypes(text: string, patterns: RequestPatternSet): string[] {
  const normalizedText = normalizeForMatch(text);
  const detectedTypes: string[] = [];

  for (const [requestType, patternList] of Object.entries(patterns)) {
    for (const pattern of patternList) {
      if (normalizedText.includes(normalizeForMatch(pattern))) {
        detectedTypes.push(requestType);
        break;
      }
    }
  }

  return [...new Set(detectedTypes)];
}

/**
 * Detects modality indicators (commands, obligations)
 */
function detectModality(text: string, keywords: ModalityKeywords): string[] {
  const normalizedText = normalizeForMatch(text);
  const indicators: string[] = [];

  // Count must/have to occurrences
  let mustCount = 0;
  for (const keyword of keywords.must) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = normalizedText.match(regex);
    if (matches) {
      mustCount += matches.length;
    }
  }
  if (mustCount > 0) {
    indicators.push(`${mustCount} obligation statement(s)`);
  }

  // Count should occurrences
  let shouldCount = 0;
  for (const keyword of keywords.should) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = normalizedText.match(regex);
    if (matches) {
      shouldCount += matches.length;
    }
  }
  if (shouldCount > 0) {
    indicators.push(`${shouldCount} recommendation statement(s)`);
  }

  // Count imperative verbs (commands)
  let commandCount = 0;
  for (const verb of keywords.command) {
    // Look for verb at start of sentence or after punctuation
    const regex = new RegExp(`(?:^|[.!?]\\s+)${verb}\\b`, 'gi');
    const matches = normalizedText.match(regex);
    if (matches) {
      commandCount += matches.length;
    }
  }
  if (commandCount > 0) {
    indicators.push(`${commandCount} imperative command(s)`);
  }

  return indicators;
}

/**
 * Determines overall tone based on linguistic patterns
 */
function determineTone(urgencyScore: number, threateningScore: number, enticingScore: number): NlpAnalysis['tone'] {
  // Threatening takes precedence
  if (threateningScore >= 2) {
    return 'threatening';
  }

  // Enticing is second priority
  if (enticingScore >= 3) {
    return 'enticing';
  }

  // Urgent
  if (urgencyScore >= 3) {
    return 'urgent';
  }

  // Neutral if low scores
  return 'neutral';
}

/**
 * Calculates an overall suspicion score based on NLP analysis
 */
function calculateSuspicionScore(
  urgencyScore: number,
  threateningScore: number,
  enticingScore: number,
  requestTypes: string[],
  modalityIndicators: string[]
): number {
  let score = 0;

  // Urgency contributes
  score += Math.min(urgencyScore * 5, 20);

  // Threatening language contributes heavily
  score += Math.min(threateningScore * 10, 40);

  // Enticing language contributes
  score += Math.min(enticingScore * 5, 20);

  // Risky request types contribute
  const riskyRequests = ['payment', 'credentials', 'personal_info'];
  const riskyRequestCount = requestTypes.filter(req => riskyRequests.includes(req)).length;
  score += riskyRequestCount * 10;

  // High modality (commands/obligations) contributes
  const modalityCount = modalityIndicators.length;
  score += Math.min(modalityCount * 5, 15);

  // Cap at 100
  return Math.min(score, 100);
}

/**
 * Performs NLP analysis on email content
 */
export async function analyzeNlp(text: string): Promise<NlpAnalysis> {
  try {
    const locale = getCurrentLocale();
    const localePatterns = getLocalePatterns(locale);
    const requestPatterns = localePatterns.requestPatterns;
    const modalityKeywords = localePatterns.modalityKeywords;

    // Fetch user settings and merge with localized keywords
    const settings = await getUserSettings();
    const keywords = mergeWithCustomKeywords(
      settings.customUrgencyKeywords,
      settings.customScamKeywords
    );

    // Limit text length for performance (analyze first 10000 chars)
    const analyzedText = text.slice(0, 10000);

    const urgencyScore = detectUrgency(analyzedText, keywords.urgencyKeywords);
    const threateningScore = detectThreatening(analyzedText, keywords.threatKeywords);
    const enticingScore = detectEnticing(analyzedText, keywords.scamKeywords);
    const requestTypes = detectRequestTypes(analyzedText, requestPatterns);
    const modalityIndicators = detectModality(analyzedText, modalityKeywords);
    const tone = determineTone(urgencyScore, threateningScore, enticingScore);
    const suspicionScore = calculateSuspicionScore(
      urgencyScore,
      threateningScore,
      enticingScore,
      requestTypes,
      modalityIndicators
    );

    return {
      tone,
      requestTypes,
      modalityIndicators,
      suspicionScore
    };
  } catch (error) {
    logger.error('Error in NLP analysis:', error);
    return {
      tone: 'neutral',
      requestTypes: [],
      modalityIndicators: [],
      suspicionScore: 0
    };
  }
}

/**
 * Enhanced urgency detection that returns specific indicators found
 */
export async function detectUrgencyIndicators(text: string): Promise<string[]> {
  const normalizedText = normalizeForMatch(text);
  const indicators: string[] = [];

  // Fetch user settings and merge with localized keywords
  const settings = await getUserSettings();
  const keywords = mergeWithCustomKeywords(
    settings.customUrgencyKeywords,
    settings.customScamKeywords
  );

  for (const pattern of keywords.urgencyKeywords) {
    if (normalizedText.includes(normalizeForMatch(pattern))) {
      indicators.push(pattern);
    }
  }

  return indicators;
}
