// src/service-worker/analysis/risk-score.ts
import { EmailAnalysis, AuthenticationResults, HeaderAnalysis, DomainAnalysis, ContentAnalysis } from '../../shared/types';
import { isTrustedDomain, LOW_IMPACT_BRANDS } from './brand-database';

export function calculateRiskScore(
  authResults: AuthenticationResults,
  headerAnalysis: HeaderAnalysis,
  domainAnalysis: DomainAnalysis,
  contentAnalysis: ContentAnalysis
): EmailAnalysis['riskScore'] {
  let score: EmailAnalysis['riskScore'] = 'low';
  let riskFactors = 0;

  // ========================================
  // Phase 1: Enhanced Authentication Signals
  // ========================================

  // T101: Alignment failures (high priority)
  if (!authResults.alignment.spfAligned && authResults.spf.result === 'pass') {
    riskFactors += 3; // SPF passes but doesn't align with From - suspicious
  }
  if (!authResults.alignment.dkimAligned && authResults.dkim.result === 'pass') {
    riskFactors += 3; // DKIM passes but doesn't align with From - suspicious
  }

  // DMARC failures (highest priority for authentication)
  if (authResults.dmarc.result === 'fail') {
    riskFactors += 5; // Very high impact - DMARC is designed to catch spoofing
  }

  // SPF and DKIM failures
  if (authResults.spf.result === 'fail') {
    riskFactors += 3; // High impact
  } else if (authResults.spf.result === 'softfail') {
    riskFactors += 2; // Medium impact - T102
  } else if (authResults.spf.result === 'neutral') {
    riskFactors += 1; // Low impact
  }

  if (authResults.dkim.result === 'fail') {
    riskFactors += 3; // High impact
  }

  // T103: Check for weak DKIM algorithms
  if (authResults.dkim.signatures && authResults.dkim.signatures.length > 0) {
    const hasWeakAlgorithm = authResults.dkim.signatures.some(sig => sig.isWeak);
    if (hasWeakAlgorithm) {
      riskFactors += 2; // Weak crypto is a moderate risk
    }

    // Multiple DKIM failures
    const failedSignatures = authResults.dkim.signatures.filter(sig => sig.result === 'fail');
    if (failedSignatures.length > 0) {
      riskFactors += Math.min(failedSignatures.length, 2); // Cap at 2 extra points
    }
  }

  // T104: ARC chain issues
  if (authResults.arc.result === 'fail') {
    riskFactors += 2; // Medium impact - indicates forwarding issues or tampering
  }
  if (authResults.arc.chainDetails && authResults.arc.chainDetails.length > 0) {
    const hasBrokenChain = authResults.arc.chainDetails.some(detail => detail.isBroken);
    if (hasBrokenChain) {
      riskFactors += 3; // High impact - chain break suggests manipulation
    }
  }

  // Missing authentication data
  const missingAuthData =
    authResults.spf.result === 'none' &&
    authResults.dkim.result === 'none' &&
    authResults.dmarc.result === 'none';
  if (missingAuthData) {
    riskFactors += 2; // Medium risk - no authentication at all
  }

  // ========================================
  // Phase 1: Enhanced Header Analysis
  // ========================================

  // T107: Header injection detected
  if (headerAnalysis.injectionDetected) {
    riskFactors += 5; // Very high impact - clear attack indicator
  }

  // T106: Extended header anomalies
  if (headerAnalysis.headerAnomalies.length > 0) {
    // Weight by number of anomalies
    const anomalyCount = headerAnalysis.headerAnomalies.length;
    if (anomalyCount >= 3) {
      riskFactors += 3; // Multiple anomalies = high risk
    } else {
      riskFactors += anomalyCount; // 1-2 anomalies
    }
  }

  // T106: Check for high priority flag (often used in phishing)
  if (headerAnalysis.extendedHeaders?.xPriority) {
    const priority = headerAnalysis.extendedHeaders.xPriority.toLowerCase();
    if (priority.includes('high') || priority === '1') {
      riskFactors += 1; // Low impact alone, but contributes
    }
  }

  // T108: Received chain forensics
  if (headerAnalysis.receivedChainDetails && headerAnalysis.receivedChainDetails.length > 0) {
    // Check for suspicious hop patterns
    const suspiciousHops = headerAnalysis.receivedChainDetails.filter(detail => {
      // Very long delays between hops
      if (detail.hopDuration && detail.hopDuration > 86400) return true; // > 1 day
      // No TLS in modern email is suspicious
      if (detail.tlsUsed === false && detail.index > 0) return true;
      return false;
    });

    if (suspiciousHops.length > 0) {
      riskFactors += Math.min(suspiciousHops.length, 2); // Cap at 2 points
    }
  }

  // ========================================
  // Phase 2: Enhanced Domain Analysis
  // ========================================

  // T201: Domain blocklist (highest priority user signal)
  if (domainAnalysis.isBlocked) {
    riskFactors += 10; // Immediate high risk - user has explicitly blocked
  }

  // T201: Domain allowlist (overrides most other signals)
  if (domainAnalysis.isAllowed) {
    // Reduce risk significantly but don't eliminate entirely
    riskFactors = Math.max(0, riskFactors - 5);
  }

  // T202: Typosquatting detection (skip for trusted domains)
  if (domainAnalysis.typosquatting?.isLikelySuspicious && !isTrustedDomain(domainAnalysis.domain)) {
    const techniques = domainAnalysis.typosquatting.techniques;

    // Homoglyph attacks are particularly deceptive
    if (techniques.includes('homoglyph') || techniques.includes('homoglyph substitution')) {
      riskFactors += 4; // High impact
    } else if (techniques.includes('single character change')) {
      riskFactors += 3; // High impact
    } else if (techniques.includes('insertion') || techniques.includes('hyphenation')) {
      riskFactors += 3; // High impact - common phishing technique
    } else {
      riskFactors += 2; // Medium impact for other typosquatting
    }
  }

  // Punycode domains (IDN homograph attacks)
  if (domainAnalysis.isPunycode) {
    riskFactors += 4; // High impact - often used for spoofing
  }

  // T203: TLD risk level
  if (domainAnalysis.tldRisk === 'high') {
    riskFactors += 3; // High impact
  } else if (domainAnalysis.tldRisk === 'medium') {
    riskFactors += 1; // Low impact
  }

  // T204: New domain (first time seen) - skip for trusted domains
  if (domainAnalysis.domainHistory?.isNewDomain && !isTrustedDomain(domainAnalysis.domain)) {
    riskFactors += 1; // Low impact - new isn't always bad, but worth noting
  }

  // T204: Risk deviation from history
  if (domainAnalysis.domainHistory?.riskDeviation) {
    riskFactors += 2; // Medium impact - significant change in behavior
  }

  if (domainAnalysis.isNewContact && authResults.dkim.result === 'pass') {
    riskFactors += 1; // Low impact - first time contacting us
  }

  // T205: Brand mismatch detection
  const brandMismatches = domainAnalysis.brandMismatch?.suspiciousMismatches || [];
  if (brandMismatches.length > 0) {
    const highImpactBrandMismatches = brandMismatches.filter(brand => !LOW_IMPACT_BRANDS.includes(brand.toLowerCase()));
    if (highImpactBrandMismatches.length > 0) {
      riskFactors += 4; // High impact - classic phishing indicator
    } else {
      riskFactors += 1; // Low impact - likely social/profile links
    }
  }

  // Domain entropy (random-looking)
  if (domainAnalysis.reputationSignals.includes('High entropy domain name (random-looking).')) {
    riskFactors += 2; // Medium impact
  }

  // Very short domain name
  if (domainAnalysis.reputationSignals.includes('Very short domain name.')) {
    riskFactors += 1; // Low impact
  }

  // ========================================
  // Content Analysis
  // ========================================

  // Financial information (IBANs)
  if (contentAnalysis.detectedIbans.length > 0) {
    riskFactors += 4; // High impact - requests for banking info are suspicious
  }

  // Suspicious or shortened links
  if (contentAnalysis.suspiciousLinks.length > 0) {
    const hasShortened = contentAnalysis.suspiciousLinks.some(link => link.isShortened);
    const hasIpLinks = contentAnalysis.suspiciousLinks.some(link =>
      link.suspicionReasons?.some(reason => reason.toLowerCase().includes('ip address instead of domain'))
    );
    if (hasShortened) {
      riskFactors += 3; // High impact - link obfuscation
    } else {
      riskFactors += 2; // Medium impact - other suspicious links
    }
    if (hasIpLinks) {
      riskFactors += 2; // Additional weight for raw IP destinations
    }
  }

  // Urgency indicators (social engineering)
  if (contentAnalysis.urgencyIndicators.length > 0) {
    if (contentAnalysis.urgencyIndicators.length >= 3) {
      riskFactors += 2; // Multiple urgency indicators
    } else {
      riskFactors += 1; // Low impact - one urgency indicator
    }
  }

  // Brand-specific warnings (e.g., missing expected PayPal footer)
  if (contentAnalysis.brandWarnings && contentAnalysis.brandWarnings.length > 0) {
    riskFactors += Math.min(contentAnalysis.brandWarnings.length, 2);
  }

  // ========================================
  // Combinational Analysis (Phase 4 preview)
  // ========================================

  // High-risk combinations that amplify risk
  const hasDmarcFail = authResults.dmarc.result === 'fail';
  const hasSuspiciousLink = contentAnalysis.suspiciousLinks.length > 0;
  const hasTyposquatting = domainAnalysis.typosquatting?.isLikelySuspicious || false;
  const hasBrandMismatch = (domainAnalysis.brandMismatch?.suspiciousMismatches || [])
    .some(b => !LOW_IMPACT_BRANDS.includes(b.toLowerCase()));

  // DMARC fail + suspicious link = likely phishing
  if (hasDmarcFail && hasSuspiciousLink) {
    riskFactors += 2; // Amplification factor
  }

  // Typosquatting + brand mismatch = targeted brand impersonation
  if (hasTyposquatting && hasBrandMismatch) {
    riskFactors += 2; // Amplification factor
  }

  // Header injection + any other risk = active attack
  if (headerAnalysis.injectionDetected && riskFactors > 5) {
    riskFactors += 3; // Amplification - sophisticated attack
  }

  // ========================================
  // Score Determination
  // ========================================

  // Apply thresholds with Phase 1/2 enhancements
  if (riskFactors >= 8) {
    score = 'high';
  } else if (riskFactors >= 4) {
    score = 'medium';
  } else {
    score = 'low';
  }

  // Override: Blocked domain is always high risk
  if (domainAnalysis.isBlocked) {
    score = 'high';
  }

  return score;
}
