// src/service-worker/analysis/content.ts
import { ContentAnalysis } from '../../shared/types';
import { getUserSettings } from '../../shared/user-settings';
import { logger } from '../utils/logger';
import { BRAND_KEYWORD_PATTERNS } from './brand-database';
import { detectPaymentInfo } from './payment-detection';
import { analyzeUrls, detectLinkMismatches } from './url-analysis';
import { analyzeNlp, detectUrgencyIndicators } from './nlp-analysis';
import { analyzeHtmlHeuristics, isHtmlContent, stripHtmlTags } from './html-heuristics';
import { analyzeAttachments } from './attachment-analysis';
import { analyzeEmailImages } from './image-analysis';

/**
 * Enhanced content analysis integrating all Phase 3 modules
 * T301: Extended payment detection
 * T302-T303: Enhanced URL analysis with link mismatches
 * T304: QR code analysis (placeholder for future implementation)
 * T305: OCR analysis (placeholder for future implementation)
 * T306: NLP tone and request analysis
 * T307-T308: Attachment analysis
 * T309: HTML structure heuristics
 */

/**
 * Main content analysis function with all Phase 3 enhancements
 */
export async function analyzeContent(
  body: string,
  attachments?: Array<{ filename: string; mimeType: string; content?: string }>,
  senderEmail?: string
): Promise<ContentAnalysis> {
  try {
    const settings = await getUserSettings();

    // Determine if content is HTML or plain text
    const isHtml = isHtmlContent(body);
    const plainTextBody = isHtml ? stripHtmlTags(body) : body;

    // T301: Extended payment detection
    logger.info('Analyzing payment information...');
    const paymentInfo = detectPaymentInfo(plainTextBody);

    // T302: Enhanced URL analysis
    logger.info('Analyzing URLs...');
    const suspiciousLinks = analyzeUrls(plainTextBody, settings.enableOnlineLookups, settings.enableDeepLinkAnalysis);

    // T303: Link text vs href mismatch detection (only for HTML)
    let linkTextMismatches: ContentAnalysis['linkTextMismatches'] = [];
    if (isHtml) {
      logger.info('Detecting link text mismatches...');
      linkTextMismatches = await detectLinkMismatches(body);
    }

    // T306: NLP analysis for tone and request detection (opt-in)
    let nlpAnalysis: ContentAnalysis['nlpAnalysis'] = undefined;
    let urgencyIndicators: string[] = [];
    if (settings.enableNlpAnalysis) {
      logger.info('Performing NLP analysis...');
      nlpAnalysis = await analyzeNlp(plainTextBody);

      // Enhanced urgency detection using NLP
      urgencyIndicators = await detectUrgencyIndicators(plainTextBody);
    }

    // T309: HTML structure heuristics (only for HTML content)
    let htmlHeuristics: ContentAnalysis['htmlHeuristics'] = undefined;
    if (isHtml) {
      logger.info('Analyzing HTML structure...');
      htmlHeuristics = await analyzeHtmlHeuristics(body);
    }

    // T307-T308: Attachment analysis
    let attachmentAnalysis: ContentAnalysis['attachmentAnalysis'] = undefined;
    if (attachments && attachments.length > 0) {
      logger.info('Analyzing attachments...');
      attachmentAnalysis = analyzeAttachments(attachments, senderEmail);
    }

    // Brand detection (existing functionality)
    logger.info('Detecting brands...');
    const detectedBrands = detectBrandsInContent(plainTextBody);
    const brandWarnings: string[] = [];

    if (detectedBrands.some(brand => brand.includes('paypal'))) {
      const hasPaypalCopyright = /copyright\s*©?\s*1999[\s-–—]?\s*\d{4}\s*paypal/i.test(plainTextBody.toLowerCase());
      if (!hasPaypalCopyright) {
        brandWarnings.push('PayPal branding footer missing (expected "Copyright © 1999-YYYY PayPal").');
      }
    }

    // T304 & T305: Image analysis (QR code + OCR) - only for HTML content
    let qrCodes: ContentAnalysis['qrCodes'] = undefined;
    let ocrResults: ContentAnalysis['ocrResults'] = undefined;

    if (isHtml && (settings.enableQrCodeDecoding || settings.enableOcrAnalysis)) {
      logger.info('Performing image analysis...');
      const imageAnalysis = await analyzeEmailImages(
        body,
        settings.enableQrCodeDecoding,
        settings.enableOcrAnalysis,
        settings.enableOnlineLookups
      );
      qrCodes = imageAnalysis.qrCodes;
      ocrResults = imageAnalysis.ocrResults;
    }

    return {
      // T301: Extended payment detection
      detectedIbans: paymentInfo.ibans,
      detectedRoutingNumbers: paymentInfo.routingNumbers,
      detectedSwiftBic: paymentInfo.swiftBic,
      detectedCryptoWallets: paymentInfo.cryptoWallets,

      // T302-T303: Enhanced URL analysis
      suspiciousLinks,
      linkTextMismatches,

      // Legacy urgency indicators (now enhanced with NLP)
      urgencyIndicators,

      // T304: QR code analysis (opt-in)
      qrCodes,

      // T305: OCR analysis (opt-in)
      ocrResults,

      // T306: NLP analysis
      nlpAnalysis,

      // T307-T308: Attachment analysis
      attachmentAnalysis,

      // T309: HTML structure heuristics
      htmlHeuristics,

      // Brand detection (for domain analysis integration)
      detectedBrands,
      brandWarnings
    };
  } catch (error) {
    logger.error('Error in content analysis:', error);

    // Return minimal safe analysis on error
    return {
      detectedIbans: [],
      detectedRoutingNumbers: [],
      detectedSwiftBic: [],
      detectedCryptoWallets: [],
      suspiciousLinks: [],
      linkTextMismatches: [],
      urgencyIndicators: [],
      detectedBrands: [],
      brandWarnings: []
    };
  }
}

/**
 * Detects brand names in content using keyword patterns
 */
function detectBrandsInContent(text: string): string[] {
  const brandSet = new Set<string>();

  for (const pattern of BRAND_KEYWORD_PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[0]) {
        const brand = match[0].trim().toLowerCase();
        brandSet.add(brand);
      }
    }
  }

  return Array.from(brandSet);
}

/**
 * Quick content risk assessment (0-100)
 */
export function getContentRiskScore(analysis: ContentAnalysis): number {
  let score = 0;

  // Payment information detected
  score += analysis.detectedIbans.length * 15;
  score += analysis.detectedRoutingNumbers.length * 15;
  score += analysis.detectedSwiftBic.length * 15;
  score += analysis.detectedCryptoWallets.length * 20;

  // Suspicious links
  score += Math.min(analysis.suspiciousLinks.length * 10, 30);

  // Link mismatches
  score += (analysis.linkTextMismatches?.length || 0) * 15;

  // NLP suspicion score
  if (analysis.nlpAnalysis) {
    score += analysis.nlpAnalysis.suspicionScore * 0.3; // Scale down since it's already 0-100
  }

  // HTML heuristics
  if (analysis.htmlHeuristics?.hasHiddenText) {
    score += 20;
  }
  if (analysis.htmlHeuristics?.hasObfuscatedStyles) {
    score += 15;
  }

  // Attachment risks
  if (analysis.attachmentAnalysis) {
    for (const att of analysis.attachmentAnalysis) {
      score += att.suspicionReasons.length * 10;
      if (att.hasDoubleExtension) score += 20;
      if (att.isMacroEnabled) score += 15;
    }
  }

  // QR codes with suspicious content
  if (analysis.qrCodes) {
    score += analysis.qrCodes.filter(qr => qr.isSuspicious).length * 15;
  }

  // OCR-detected suspicious content
  if (analysis.ocrResults) {
    score += analysis.ocrResults.filter(ocr => ocr.detectedUrls.length > 0).length * 10;
  }

  return Math.min(score, 100);
}

/**
 * Generates a human-readable summary of content analysis findings
 */
export function summarizeContentFindings(analysis: ContentAnalysis): string[] {
  const findings: string[] = [];

  // Payment info
  const totalPaymentItems =
    analysis.detectedIbans.length +
    analysis.detectedRoutingNumbers.length +
    analysis.detectedSwiftBic.length +
    analysis.detectedCryptoWallets.length;

  if (totalPaymentItems > 0) {
    findings.push(`${totalPaymentItems} payment identifier(s) detected`);
  }

  // Links
  if (analysis.suspiciousLinks.length > 0) {
    findings.push(`${analysis.suspiciousLinks.length} suspicious link(s)`);
  }

  if (analysis.linkTextMismatches && analysis.linkTextMismatches.length > 0) {
    findings.push(`${analysis.linkTextMismatches.length} link text mismatch(es)`);
  }

  // NLP findings
  if (analysis.nlpAnalysis) {
    if (analysis.nlpAnalysis.tone !== 'neutral') {
      findings.push(`Tone: ${analysis.nlpAnalysis.tone}`);
    }
    if (analysis.nlpAnalysis.requestTypes.length > 0) {
      findings.push(`Requests: ${analysis.nlpAnalysis.requestTypes.join(', ')}`);
    }
  }

  // HTML heuristics
  if (analysis.htmlHeuristics?.hasHiddenText) {
    findings.push('Hidden text detected in HTML');
  }

  // Attachments
  if (analysis.attachmentAnalysis) {
    const suspiciousAttachments = analysis.attachmentAnalysis.filter(
      att => att.suspicionReasons.length > 0
    );
    if (suspiciousAttachments.length > 0) {
      findings.push(`${suspiciousAttachments.length} suspicious attachment(s)`);
    }
  }

  return findings;
}
