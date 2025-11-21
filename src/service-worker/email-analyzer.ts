// src/service-worker/email-analyzer.ts
import { EmailAnalysis, EnhancedEmailAnalysis } from '../shared/types';
import { parseAuthenticationResults } from './analysis/authentication';
import { analyzeHeaders } from './analysis/headers';
import { analyzeDomain, updateDomainRiskHistory } from './analysis/domain';
import { analyzeContent } from './analysis/content';
import { calculateRiskScore } from './analysis/risk-score';
import { calculateEnhancedRiskScore } from './analysis/enhanced-risk-score';
import { logger } from './utils/logger';

export async function analyzeEmailContent(
  rawHeaders: { name: string; value: string }[],
  rawBody: string,
  senderEmail: string,
  messageId: string,
  threadId: string,
  gmailUiMessageId: string,
  attachments?: Array<{ filename: string; mimeType: string; content?: string }>,
  useEnhancedScoring: boolean = true
): Promise<EmailAnalysis | EnhancedEmailAnalysis> {
  try {
    // T106: Extract From header for alignment checking
    const fromHeader = rawHeaders.find(h => h.name.toLowerCase() === 'from')?.value || senderEmail;

    // Extract message date for T404 (message age analysis)
    const dateHeader = rawHeaders.find(h => h.name.toLowerCase() === 'date')?.value;

    // Phase 1: Enhanced authentication parsing with alignment
    // T101: Pass From header for alignment computation
    logger.info('Analyzing authentication results...');
    const authenticationResults = parseAuthenticationResults(rawHeaders, fromHeader);

    // Phase 1: Enhanced header analysis
    // T106-T108: Extended headers, injection detection, received chain forensics
    logger.info('Analyzing email headers...');
    const headerAnalysis = analyzeHeaders(rawHeaders);

    // Phase 3: Enhanced content analysis with all new modules
    // T301-T309: Payment detection, URL analysis, NLP, HTML heuristics, attachments
    logger.info('Analyzing email content...');
    const contentAnalysis = await analyzeContent(rawBody, attachments, senderEmail);

    // Phase 2: Enhanced domain analysis with typosquatting, TLD risk, and brand mismatch
    // T201-T205: Pass detected brands for brand mismatch detection
    logger.info('Analyzing sender domain...');
    const domainAnalysis = await analyzeDomain(
      senderEmail,
      contentAnalysis.detectedBrands,
      dateHeader
    );

    // Phase 4: Enhanced risk scoring with detailed breakdown and confidence
    let riskScore: EmailAnalysis['riskScore'];
    let enhancedAnalysis: Partial<EnhancedEmailAnalysis> = {};

    if (useEnhancedScoring) {
      logger.info('Calculating enhanced risk score...');
      const enhanced = calculateEnhancedRiskScore(
        authenticationResults,
        headerAnalysis,
        domainAnalysis,
        contentAnalysis,
        dateHeader
      );

      riskScore = enhanced.riskScore;
      enhancedAnalysis = {
        riskFactorBreakdown: enhanced.riskFactorBreakdown,
        confidenceMetric: enhanced.confidenceMetric,
        messageAgeAnalysis: enhanced.messageAgeAnalysis
      };

      logger.info(`Risk score: ${riskScore}, Confidence: ${enhanced.confidenceMetric.score}%, Factors: ${enhanced.riskFactorBreakdown.length}`);
    } else {
      // Fallback to basic risk scoring
      logger.info('Calculating basic risk score...');
      riskScore = calculateRiskScore(
        authenticationResults,
        headerAnalysis,
        domainAnalysis,
        contentAnalysis
      );
    }

    // T204: Update domain history with current risk score
    const domain = domainAnalysis.domain;
    if (domain) {
      updateDomainRiskHistory(domain, riskScore).catch(err => {
        logger.error('Failed to update domain risk history:', err);
      });
    }

    const baseAnalysis: EmailAnalysis = {
      messageId,
      riskScore,
      authenticationResults,
      headerAnalysis,
      domainAnalysis,
      contentAnalysis,
      threadId,
      gmailUiMessageId,
    };

    // Return enhanced analysis if requested
    if (useEnhancedScoring) {
      return {
        ...baseAnalysis,
        ...enhancedAnalysis
      } as EnhancedEmailAnalysis;
    }

    return baseAnalysis;
  } catch (error) {
    logger.error('Error in analyzeEmailContent:', error);
    throw error;
  }
}

/**
 * Analyzes email with enhanced scoring enabled by default
 */
export async function analyzeEmailEnhanced(
  rawHeaders: { name: string; value: string }[],
  rawBody: string,
  senderEmail: string,
  messageId: string,
  threadId: string,
  gmailUiMessageId: string,
  attachments?: Array<{ filename: string; mimeType: string; content?: string }>
): Promise<EnhancedEmailAnalysis> {
  return analyzeEmailContent(
    rawHeaders,
    rawBody,
    senderEmail,
    messageId,
    threadId,
    gmailUiMessageId,
    attachments,
    true
  ) as Promise<EnhancedEmailAnalysis>;
}

/**
 * Quick risk check without full analysis (for performance)
 */
export async function quickRiskCheck(
  senderEmail: string,
  rawHeaders: { name: string; value: string }[]
): Promise<{ riskScore: EmailAnalysis['riskScore']; reason: string }> {
  try {
    // Quick checks only
    const fromHeader = rawHeaders.find(h => h.name.toLowerCase() === 'from')?.value || senderEmail;
    const authResults = parseAuthenticationResults(rawHeaders, fromHeader);

    // Check for critical failures
    if (authResults.dmarc.result === 'fail') {
      return { riskScore: 'high', reason: 'DMARC authentication failed' };
    }

    // Check user blocklist
    const domainAnalysis = await analyzeDomain(senderEmail, []);
    if (domainAnalysis.isBlocked) {
      return { riskScore: 'high', reason: 'Domain is blocked' };
    }

    if (domainAnalysis.isAllowed) {
      return { riskScore: 'low', reason: 'Domain is allowed' };
    }

    return { riskScore: 'low', reason: 'No immediate risks detected' };
  } catch (error) {
    logger.error('Error in quick risk check:', error);
    return { riskScore: 'medium', reason: 'Analysis error' };
  }
}
