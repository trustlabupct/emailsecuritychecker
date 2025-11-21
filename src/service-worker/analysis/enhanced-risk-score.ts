// src/service-worker/analysis/enhanced-risk-score.ts
import {
  EmailAnalysis,
  AuthenticationResults,
  HeaderAnalysis,
  DomainAnalysis,
  ContentAnalysis,
  RiskFactorBreakdown,
  ConfidenceMetric,
  MessageAgeAnalysis
} from '../../shared/types';
import { isTrustedDomain, LOW_IMPACT_BRANDS } from './brand-database';
import { logger } from '../utils/logger';

/**
 * Phase 4: Enhanced Risk Scoring
 * T401: Combinational weighting
 * T402: Detailed factor breakdown
 * T403: Confidence metrics
 * T404: Message age / historical trend comparisons
 */

/**
 * Calculates enhanced risk score with detailed breakdown
 */
export function calculateEnhancedRiskScore(
  authResults: AuthenticationResults,
  headerAnalysis: HeaderAnalysis,
  domainAnalysis: DomainAnalysis,
  contentAnalysis: ContentAnalysis,
  messageDate?: string
): {
  riskScore: EmailAnalysis['riskScore'];
  riskFactorBreakdown: RiskFactorBreakdown[];
  confidenceMetric: ConfidenceMetric;
  messageAgeAnalysis: MessageAgeAnalysis;
  explanation?: string[];
} {
  const breakdown: RiskFactorBreakdown[] = [];
  let totalRiskPoints = 0;

  // T404: Message age analysis
  const messageAgeAnalysis = analyzeMessageAge(messageDate, domainAnalysis);

  // ========================================
  // AUTHENTICATION SIGNALS
  // ========================================

  // DMARC failures (highest priority)
  if (authResults.dmarc.result === 'fail') {
    const points = 5;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Authentication',
      factor: 'DMARC Failure',
      points,
      weight: 'critical',
      description: 'Email failed DMARC authentication - strong indicator of spoofing'
    });
  }

  // SPF failures and alignment issues
  if (authResults.spf.result === 'fail') {
    const points = 3;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Authentication',
      factor: 'SPF Failure',
      points,
      weight: 'high',
      description: 'Sender is not authorized to send from this domain'
    });
  } else if (authResults.spf.result === 'softfail') {
    const points = 2;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Authentication',
      factor: 'SPF Soft Fail',
      points,
      weight: 'medium',
      description: 'Sender authorization is questionable'
    });
  }

  // SPF alignment issues
  if (!authResults.alignment.spfAligned && authResults.spf.result === 'pass') {
    const points = 3;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Authentication',
      factor: 'SPF Alignment Mismatch',
      points,
      weight: 'high',
      description: 'SPF passes but domain does not align with From header'
    });
  }

  // DKIM failures
  if (authResults.dkim.result === 'fail') {
    const points = 3;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Authentication',
      factor: 'DKIM Failure',
      points,
      weight: 'high',
      description: 'Email signature verification failed'
    });
  }

  // DKIM alignment issues
  if (!authResults.alignment.dkimAligned && authResults.dkim.result === 'pass') {
    const points = 3;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Authentication',
      factor: 'DKIM Alignment Mismatch',
      points,
      weight: 'high',
      description: 'DKIM passes but domain does not align with From header'
    });
  }

  // Weak DKIM algorithms
  if (authResults.dkim.signatures?.some(sig => sig.isWeak)) {
    const points = 2;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Authentication',
      factor: 'Weak DKIM Algorithm',
      points,
      weight: 'medium',
      description: 'Email uses weak cryptographic signature (SHA-1)'
    });
  }

  // ARC chain issues
  if (authResults.arc.result === 'fail') {
    const points = 2;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Authentication',
      factor: 'ARC Chain Failure',
      points,
      weight: 'medium',
      description: 'Forwarding chain verification failed'
    });
  }

  if (authResults.arc.chainDetails?.some(detail => detail.isBroken)) {
    const points = 3;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Authentication',
      factor: 'Broken ARC Chain',
      points,
      weight: 'high',
      description: 'Email forwarding chain has been broken - possible tampering'
    });
  }

  // Missing authentication
  const missingAuth =
    authResults.spf.result === 'none' &&
    authResults.dkim.result === 'none' &&
    authResults.dmarc.result === 'none';
  if (missingAuth) {
    const points = 2;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Authentication',
      factor: 'No Authentication',
      points,
      weight: 'medium',
      description: 'Email has no authentication mechanisms'
    });
  }

  // ========================================
  // HEADER ANALYSIS
  // ========================================

  // Header injection (critical security issue)
  if (headerAnalysis.injectionDetected) {
    const points = 5;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Headers',
      factor: 'Header Injection',
      points,
      weight: 'critical',
      description: 'Malicious header injection detected - active attack'
    });
  }

  // Header anomalies
  const anomalyCount = headerAnalysis.headerAnomalies.length;
  if (anomalyCount >= 3) {
    const points = 3;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Headers',
      factor: 'Multiple Header Anomalies',
      points,
      weight: 'high',
      description: `${anomalyCount} header anomalies detected`
    });
  } else if (anomalyCount > 0) {
    const points = anomalyCount;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Headers',
      factor: 'Header Anomalies',
      points,
      weight: 'low',
      description: `${anomalyCount} header anomaly detected`
    });
  }

  // High priority flag
  if (headerAnalysis.extendedHeaders?.xPriority?.toLowerCase().includes('high')) {
    const points = 1;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Headers',
      factor: 'High Priority Flag',
      points,
      weight: 'low',
      description: 'Email marked as high priority (common in phishing)'
    });
  }

  // Suspicious hop patterns
  const suspiciousHops = headerAnalysis.receivedChainDetails?.filter(detail => {
    return (detail.hopDuration && detail.hopDuration > 86400) ||
      (detail.tlsUsed === false && detail.index > 0);
  }) || [];

  if (suspiciousHops.length > 0) {
    const points = Math.min(suspiciousHops.length, 2);
    totalRiskPoints += points;
    breakdown.push({
      category: 'Headers',
      factor: 'Suspicious Routing',
      points,
      weight: 'low',
      description: `${suspiciousHops.length} suspicious routing hop(s) detected`
    });
  }

  // ========================================
  // DOMAIN ANALYSIS
  // ========================================

  // User blocklist (highest priority)
  if (domainAnalysis.isBlocked) {
    const points = 10;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Domain',
      factor: 'User Blocked Domain',
      points,
      weight: 'critical',
      description: 'Domain is on your block list'
    });
  }

  // User allowlist (reduces risk)
  if (domainAnalysis.isAllowed) {
    const points = -5;
    totalRiskPoints = Math.max(0, totalRiskPoints + points);
    breakdown.push({
      category: 'Domain',
      factor: 'User Allowed Domain',
      points,
      weight: 'high',
      description: 'Domain is on your allow list (reduces risk)'
    });
  }

  // Typosquatting (skip for trusted domains)
  if (domainAnalysis.typosquatting?.isLikelySuspicious && !isTrustedDomain(domainAnalysis.domain)) {
    const techniques = domainAnalysis.typosquatting.techniques;
    let points = 2;
    let weight: RiskFactorBreakdown['weight'] = 'medium';

    if (techniques.includes('homoglyph') || techniques.includes('homoglyph substitution')) {
      points = 4;
      weight = 'high';
    } else if (techniques.includes('single character change') || techniques.includes('insertion')) {
      points = 3;
      weight = 'high';
    }

    totalRiskPoints += points;
    breakdown.push({
      category: 'Domain',
      factor: 'Typosquatting',
      points,
      weight,
      description: `Suspicious domain similarity detected: ${techniques.join(', ')}`
    });
  }

  // Punycode (IDN homograph attacks)
  if (domainAnalysis.isPunycode) {
    const points = 4;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Domain',
      factor: 'Punycode Domain',
      points,
      weight: 'high',
      description: 'Internationalized domain (often used for spoofing)'
    });
  }

  // TLD risk
  if (domainAnalysis.tldRisk === 'high') {
    const points = 3;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Domain',
      factor: 'High-Risk TLD',
      points,
      weight: 'high',
      description: 'Domain uses high-risk top-level domain'
    });
  } else if (domainAnalysis.tldRisk === 'medium') {
    const points = 1;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Domain',
      factor: 'Medium-Risk TLD',
      points,
      weight: 'low',
      description: 'Domain uses moderately risky top-level domain'
    });
  }

  // New domain (skip for trusted)
  if (domainAnalysis.domainHistory?.isNewDomain && !isTrustedDomain(domainAnalysis.domain)) {
    const points = 1;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Domain',
      factor: 'New Domain',
      points,
      weight: 'low',
      description: 'First time receiving email from this domain'
    });
  }

  // Risk deviation from history
  if (domainAnalysis.domainHistory?.riskDeviation) {
    const points = 2;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Domain',
      factor: 'Risk Pattern Change',
      points,
      weight: 'medium',
      description: 'Domain behavior has changed significantly'
    });
  }

  if (domainAnalysis.isNewContact && authResults.dkim.result === 'pass') {
    const points = 1;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Domain',
      factor: 'New Contact Domain',
      points,
      weight: 'low',
      description: 'First interaction with this domain detected today'
    });
  }

  // Brand mismatch
  const brandMismatches = domainAnalysis.brandMismatch?.suspiciousMismatches || [];
  if (brandMismatches.length > 0) {
    const highImpactBrandMismatches = brandMismatches.filter(brand => !LOW_IMPACT_BRANDS.includes(brand.toLowerCase()));
    if (highImpactBrandMismatches.length > 0) {
      const points = 4;
      totalRiskPoints += points;
      breakdown.push({
        category: 'Domain',
        factor: 'Brand Impersonation',
        points,
        weight: 'high',
        description: `Email mentions ${highImpactBrandMismatches.join(', ')} but sender domain doesn't match`
      });
    } else {
      const points = 1;
      totalRiskPoints += points;
      breakdown.push({
        category: 'Domain',
        factor: 'Brand Mentions',
        points,
        weight: 'low',
        description: `Brand references (${brandMismatches.join(', ')}) likely social/profile links`
      });
    }
  }

  // Domain entropy
  if (domainAnalysis.reputationSignals.includes('High entropy domain name (random-looking).')) {
    const points = 2;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Domain',
      factor: 'Random Domain Name',
      points,
      weight: 'medium',
      description: 'Domain name appears randomly generated'
    });
  }

  // ========================================
  // CONTENT ANALYSIS
  // ========================================

  // Payment information
  const paymentItemCount =
    contentAnalysis.detectedIbans.length +
    (contentAnalysis.detectedRoutingNumbers?.length || 0) +
    (contentAnalysis.detectedSwiftBic?.length || 0) +
    (contentAnalysis.detectedCryptoWallets?.length || 0);

  if (paymentItemCount > 0) {
    const points = 4;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Content',
      factor: 'Payment Information',
      points,
      weight: 'high',
      description: `${paymentItemCount} payment identifier(s) detected`
    });
  }

  // Suspicious links
  if (contentAnalysis.suspiciousLinks.length > 0) {
    const hasShortened = contentAnalysis.suspiciousLinks.some(link => link.isShortened);
    const hasSensitiveParams = contentAnalysis.suspiciousLinks.some(link => link.hasSensitiveQueryParams);
    const ipBasedLinks = contentAnalysis.suspiciousLinks.filter(link =>
      link.suspicionReasons?.some(reason => reason.toLowerCase().includes('ip address instead of domain'))
    ).length;

    let points = 2;
    let weight: RiskFactorBreakdown['weight'] = 'medium';

    if (hasShortened || hasSensitiveParams) {
      points = 3;
      weight = 'high';
    }

    totalRiskPoints += points;
    breakdown.push({
      category: 'Content',
      factor: 'Suspicious Links',
      points,
      weight,
      description: `${contentAnalysis.suspiciousLinks.length} suspicious link(s) detected`
    });

    if (ipBasedLinks > 0) {
      const ipPoints = Math.min(4, ipBasedLinks * 2);
      totalRiskPoints += ipPoints;
      breakdown.push({
        category: 'Content',
        factor: 'Raw IP Links',
        points: ipPoints,
        weight: 'high',
        description: `${ipBasedLinks} link(s) point directly to an IP address`
      });
    }
  }

  // Link text mismatches
  const linkMismatches = contentAnalysis.linkTextMismatches?.length || 0;
  if (linkMismatches > 0) {
    const points = 3;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Content',
      factor: 'Link Text Mismatch',
      points,
      weight: 'high',
      description: `${linkMismatches} link(s) with misleading display text`
    });
  }

  // Brand-specific warnings (e.g., missing expected PayPal footer)
  if (contentAnalysis.brandWarnings && contentAnalysis.brandWarnings.length > 0) {
    const points = Math.min(3, contentAnalysis.brandWarnings.length);
    totalRiskPoints += points;
    breakdown.push({
      category: 'Content',
      factor: 'Brand Consistency Warnings',
      points,
      weight: 'medium',
      description: contentAnalysis.brandWarnings.join('; ')
    });
  }

  // Urgency indicators
  if (contentAnalysis.urgencyIndicators.length >= 3) {
    const points = 2;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Content',
      factor: 'Multiple Urgency Indicators',
      points,
      weight: 'medium',
      description: `${contentAnalysis.urgencyIndicators.length} urgency indicators detected`
    });
  } else if (contentAnalysis.urgencyIndicators.length > 0) {
    const points = 1;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Content',
      factor: 'Urgency Indicators',
      points,
      weight: 'low',
      description: `${contentAnalysis.urgencyIndicators.length} urgency indicator(s) detected`
    });
  }

  // NLP analysis
  if (contentAnalysis.nlpAnalysis) {
    const nlp = contentAnalysis.nlpAnalysis;

    if (nlp.tone === 'threatening') {
      const points = 3;
      totalRiskPoints += points;
      breakdown.push({
        category: 'Content',
        factor: 'Threatening Tone',
        points,
        weight: 'high',
        description: 'Email uses threatening language'
      });
    } else if (nlp.tone === 'enticing') {
      const points = 2;
      totalRiskPoints += points;
      breakdown.push({
        category: 'Content',
        factor: 'Enticing Tone',
        points,
        weight: 'medium',
        description: 'Email uses enticing language (prizes, rewards, etc.)'
      });
    } else if (nlp.tone === 'urgent') {
      const points = 2;
      totalRiskPoints += points;
      breakdown.push({
        category: 'Content',
        factor: 'Urgent Tone',
        points,
        weight: 'medium',
        description: 'Email expresses high urgency'
      });
    }

    // Risky request types
    const riskyRequests = ['payment', 'credentials', 'personal_info'];
    const detectedRiskyRequests = nlp.requestTypes.filter(req => riskyRequests.includes(req));

    if (detectedRiskyRequests.length > 0) {
      const points = detectedRiskyRequests.length * 2;
      totalRiskPoints += points;
      breakdown.push({
        category: 'Content',
        factor: 'Sensitive Information Request',
        points,
        weight: 'high',
        description: `Requests ${detectedRiskyRequests.join(', ')}`
      });
    }
  }

  // HTML heuristics
  if (contentAnalysis.htmlHeuristics?.hasHiddenText) {
    const points = 3;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Content',
      factor: 'Hidden HTML Content',
      points,
      weight: 'high',
      description: 'Email contains hidden text in HTML'
    });
  }

  if (contentAnalysis.htmlHeuristics?.hasObfuscatedStyles &&
    contentAnalysis.htmlHeuristics.suspiciousStyleCount > 3) {
    const points = 2;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Content',
      factor: 'Obfuscated HTML Styles',
      points,
      weight: 'medium',
      description: 'Email contains suspicious CSS styling patterns'
    });
  }

  // Attachment analysis
  if (contentAnalysis.attachmentAnalysis) {
    for (const attachment of contentAnalysis.attachmentAnalysis) {
      if (attachment.hasDoubleExtension) {
        const points = 4;
        totalRiskPoints += points;
        breakdown.push({
          category: 'Attachments',
          factor: 'Double File Extension',
          points,
          weight: 'high',
          description: `Attachment "${attachment.filename}" has double extension`
        });
      }

      if (attachment.isMacroEnabled) {
        const points = 3;
        totalRiskPoints += points;
        breakdown.push({
          category: 'Attachments',
          factor: 'Macro-Enabled Document',
          points,
          weight: 'high',
          description: `Attachment "${attachment.filename}" can execute macros`
        });
      }

      if (attachment.calendarInviteAnalysis?.isSuspicious) {
        const points = 2;
        totalRiskPoints += points;
        breakdown.push({
          category: 'Attachments',
          factor: 'Suspicious Calendar Invite',
          points,
          weight: 'medium',
          description: 'Calendar invite contains suspicious elements'
        });
      }

      // Generic suspicious attachment
      if (attachment.suspicionReasons.length > 0 &&
        !attachment.hasDoubleExtension &&
        !attachment.isMacroEnabled) {
        const points = Math.min(attachment.suspicionReasons.length, 3);
        totalRiskPoints += points;
        breakdown.push({
          category: 'Attachments',
          factor: 'Suspicious Attachment',
          points,
          weight: 'medium',
          description: `"${attachment.filename}": ${attachment.suspicionReasons[0]}`
        });
      }
    }
  }

  // ========================================
  // T401: COMBINATIONAL WEIGHTING
  // ========================================

  const hasDmarcFail = authResults.dmarc.result === 'fail';
  const hasSuspiciousLink = contentAnalysis.suspiciousLinks.length > 0;
  const hasTyposquatting = domainAnalysis.typosquatting?.isLikelySuspicious || false;
  const highImpactBrandMismatches = brandMismatches.filter(brand => !LOW_IMPACT_BRANDS.includes(brand.toLowerCase()));
  const hasBrandMismatch = highImpactBrandMismatches.length > 0;
  const hasPaymentInfo = paymentItemCount > 0;
  const hasHeaderInjection = headerAnalysis.injectionDetected || false;

  // Combination 1: DMARC fail + suspicious link = likely phishing
  if (hasDmarcFail && hasSuspiciousLink) {
    const points = 3;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Combinational',
      factor: 'Auth Failure + Suspicious Link',
      points,
      weight: 'critical',
      description: 'Failed authentication combined with suspicious link - phishing pattern'
    });
  }

  // Combination 2: Typosquatting + brand mismatch = targeted impersonation
  if (hasTyposquatting && hasBrandMismatch) {
    const points = 3;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Combinational',
      factor: 'Domain Spoofing + Brand Mention',
      points,
      weight: 'critical',
      description: 'Fake domain with brand impersonation - targeted attack'
    });
  }

  // Combination 3: Header injection + any other risk = sophisticated attack
  if (hasHeaderInjection && totalRiskPoints > 5) {
    const points = 3;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Combinational',
      factor: 'Active Attack Pattern',
      points,
      weight: 'critical',
      description: 'Header injection combined with other risks - sophisticated attack'
    });
  }

  // Combination 4: Payment info + urgency + suspicious link = financial scam
  if (hasPaymentInfo && contentAnalysis.urgencyIndicators.length >= 2 && hasSuspiciousLink) {
    const points = 2;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Combinational',
      factor: 'Financial Scam Pattern',
      points,
      weight: 'high',
      description: 'Payment request with urgency and suspicious link - scam pattern'
    });
  }

  // Combination 5: New domain + payment info = risky transaction
  if (domainAnalysis.domainHistory?.isNewDomain && hasPaymentInfo) {
    const points = 2;
    totalRiskPoints += points;
    breakdown.push({
      category: 'Combinational',
      factor: 'New Domain + Payment Request',
      points,
      weight: 'high',
      description: 'First email from domain requesting payment information'
    });
  }

  // ========================================
  // T403: CONFIDENCE METRIC
  // ========================================

  const confidenceMetric = calculateConfidence(
    authResults,
    headerAnalysis,
    domainAnalysis,
    contentAnalysis
  );

  // ========================================
  // FINAL RISK SCORE DETERMINATION
  // ========================================

  let riskScore: EmailAnalysis['riskScore'] = 'low';

  // Apply thresholds
  if (totalRiskPoints >= 8) {
    riskScore = 'high';
  } else if (totalRiskPoints >= 4) {
    riskScore = 'medium';
  } else {
    riskScore = 'low';
  }

  // Override: Blocked domain is always high risk
  if (domainAnalysis.isBlocked) {
    riskScore = 'high';
  }

  // Adjust based on confidence (low confidence might downgrade risk slightly)
  if (confidenceMetric.score < 50 && riskScore === 'high' && totalRiskPoints < 12) {
    // Don't downgrade if we have critical signals
    const hasCriticalSignals = breakdown.some(factor => factor.weight === 'critical');
    if (!hasCriticalSignals) {
      riskScore = 'medium';
      breakdown.push({
        category: 'Confidence',
        factor: 'Low Analysis Confidence',
        points: 0,
        weight: 'low',
        description: 'Risk adjusted due to limited signal availability'
      });
    }
  }

  const explanation = breakdown.map(
    factor => `${factor.category}: ${factor.factor} - ${factor.description}`
  );

  return {
    riskScore,
    riskFactorBreakdown: breakdown,
    confidenceMetric,
    messageAgeAnalysis,
    explanation,
  };
}

/**
 * T403: Calculates confidence metric based on available signals
 */
function calculateConfidence(
  authResults: AuthenticationResults,
  headerAnalysis: HeaderAnalysis,
  domainAnalysis: DomainAnalysis,
  contentAnalysis: ContentAnalysis
): ConfidenceMetric {
  let availableSignals = 0;
  const totalPossibleSignals = 20;
  const missingSignals: string[] = [];
  let parsingQuality: 'high' | 'medium' | 'low' = 'high';

  // Authentication signals (5 possible)
  if (authResults.spf.result !== 'none') availableSignals++;
  else missingSignals.push('SPF authentication');

  if (authResults.dkim.result !== 'none') availableSignals++;
  else missingSignals.push('DKIM authentication');

  if (authResults.dmarc.result !== 'none') availableSignals++;
  else missingSignals.push('DMARC policy');

  if (authResults.alignment.spfAligned !== undefined) availableSignals++;
  if (authResults.alignment.dkimAligned !== undefined) availableSignals++;

  // Header signals (4 possible)
  if (headerAnalysis.receivedChain.length > 0) availableSignals++;
  else missingSignals.push('Email routing chain');

  if (headerAnalysis.extendedHeaders) availableSignals++;
  else missingSignals.push('Extended header information');

  if (headerAnalysis.receivedChainDetails && headerAnalysis.receivedChainDetails.length > 0) {
    availableSignals++;
  } else {
    missingSignals.push('Routing chain details');
  }

  availableSignals++; // Header anomaly detection always runs

  // Domain signals (4 possible)
  if (domainAnalysis.typosquatting) availableSignals++;
  else missingSignals.push('Typosquatting analysis');

  if (domainAnalysis.tldRisk) availableSignals++;
  if (domainAnalysis.domainHistory) availableSignals++;
  else missingSignals.push('Domain history');

  if (domainAnalysis.brandMismatch) availableSignals++;

  // Content signals (7 possible)
  availableSignals++; // Basic content analysis always runs

  if (contentAnalysis.suspiciousLinks.length > 0 || contentAnalysis.detectedIbans.length > 0) {
    availableSignals++; // Successfully analyzed content
  }

  if (contentAnalysis.linkTextMismatches) availableSignals++;
  else missingSignals.push('Link text mismatch analysis');

  if (contentAnalysis.nlpAnalysis) availableSignals++;
  else missingSignals.push('NLP tone analysis');

  if (contentAnalysis.htmlHeuristics) availableSignals++;
  else missingSignals.push('HTML structure analysis');

  if (contentAnalysis.attachmentAnalysis) availableSignals++;
  else missingSignals.push('Attachment analysis');

  if (contentAnalysis.detectedRoutingNumbers !== undefined &&
    contentAnalysis.detectedSwiftBic !== undefined &&
    contentAnalysis.detectedCryptoWallets !== undefined) {
    availableSignals++; // Extended payment detection
  }

  // Determine parsing quality
  if (availableSignals >= 16) {
    parsingQuality = 'high';
  } else if (availableSignals >= 12) {
    parsingQuality = 'medium';
  } else {
    parsingQuality = 'low';
  }

  // Calculate confidence score (0-100)
  const score = Math.round((availableSignals / totalPossibleSignals) * 100);

  return {
    score,
    availableSignals,
    totalPossibleSignals,
    missingSignals,
    parsingQuality
  };
}

/**
 * T404: Analyzes message age and historical context
 */
function analyzeMessageAge(
  messageDate: string | undefined,
  domainAnalysis: DomainAnalysis
): MessageAgeAnalysis {
  const analysis: MessageAgeAnalysis = {
    hasHistoricalComparison: false
  };

  if (messageDate) {
    try {
      const msgDate = new Date(messageDate);
      const now = new Date();
      const ageMs = now.getTime() - msgDate.getTime();
      const ageInDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

      analysis.messageDate = messageDate;
      analysis.ageInDays = ageInDays;
      analysis.isHistorical = ageInDays > 30;
    } catch (error) {
      logger.error('Error parsing message date:', error);
    }
  }

  // Check if we have historical comparison data
  if (domainAnalysis.domainHistory) {
    analysis.hasHistoricalComparison = true;
  }

  return analysis;
}

/**
 * Generates human-readable summary of risk factors
 */
export function summarizeRiskFactors(breakdown: RiskFactorBreakdown[]): string[] {
  const criticalFactors = breakdown.filter(f => f.weight === 'critical');
  const highFactors = breakdown.filter(f => f.weight === 'high');
  const mediumFactors = breakdown.filter(f => f.weight === 'medium');

  const summary: string[] = [];

  if (criticalFactors.length > 0) {
    summary.push(`${criticalFactors.length} critical risk factor(s)`);
  }

  if (highFactors.length > 0) {
    summary.push(`${highFactors.length} high risk factor(s)`);
  }

  if (mediumFactors.length > 0) {
    summary.push(`${mediumFactors.length} medium risk factor(s)`);
  }

  return summary;
}
