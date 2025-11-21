// src/service-worker/analysis/image-analysis.ts
import { createWorker, Worker } from 'tesseract.js';
import QrScanner from 'qr-scanner';
import { QrCodeAnalysis, OcrAnalysis, SuspiciousLink } from '../../shared/types';
import { analyzeUrl } from './url-analysis';
import { logger } from '../utils/logger';

/**
 * T304: QR Code Analysis Implementation
 * Extracts and decodes QR codes from email images
 */

/**
 * T305: OCR Analysis Implementation
 * Extracts text from images using Tesseract.js
 */

// Tesseract worker singleton for reuse
let tesseractWorker: Worker | null = null;

/**
 * Initialize Tesseract worker (lazy initialization)
 */
async function getTesseractWorker(): Promise<Worker> {
  if (!tesseractWorker) {
    logger.info('Initializing Tesseract OCR worker...');

    // Build local paths so the worker never downloads from the network.
    const runtime = typeof chrome !== 'undefined' ? chrome.runtime : undefined;
    const workerPath = runtime?.getURL ? runtime.getURL('assets/worker.min.js') : undefined;
    const corePath = runtime?.getURL ? runtime.getURL('assets/tesseract-core.wasm.js') : undefined;
    const langPath = runtime?.getURL ? runtime.getURL('assets/') : undefined;

    tesseractWorker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
        }
      },
      // Force local-only assets; Chrome blocks remote CDN fetches and we must stay offline.
      ...(workerPath ? { workerPath } : {}),
      ...(corePath ? { corePath } : {}),
      ...(langPath ? { langPath } : {}),
      cacheMethod: 'none',
      gzip: false
    });
  }
  return tesseractWorker;
}

/**
 * Cleanup Tesseract worker
 */
export async function cleanupTesseractWorker(): Promise<void> {
  if (tesseractWorker) {
    logger.info('Terminating Tesseract OCR worker...');
    await tesseractWorker.terminate();
    tesseractWorker = null;
  }
}

/**
 * Extract images from HTML email content
 */
export function extractImagesFromHtml(htmlContent: string): Array<{ src: string; alt?: string }> {
  const images: Array<{ src: string; alt?: string }> = [];

  try {
    // Extract img tags - handle src and alt in any order
    const imgRegex = /<img[^>]*>/gi;
    let match;

    while ((match = imgRegex.exec(htmlContent)) !== null) {
      const imgTag = match[0];

      // Extract src
      const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
      if (!srcMatch) continue;

      const src = srcMatch[1];

      // Extract alt (optional)
      const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);
      const alt = altMatch ? altMatch[1] : undefined;

      // Only process data URIs and http/https URLs
      if (src.startsWith('data:image/') || src.startsWith('http://') || src.startsWith('https://')) {
        images.push({ src, alt });
      }
    }

    logger.info(`Extracted ${images.length} images from HTML content`);
  } catch (error) {
    logger.error('Error extracting images from HTML:', error);
  }

  return images;
}

/**
 * Decode QR code from image data URL or URL
 */
export async function decodeQrCode(imageSource: string): Promise<string | null> {
  try {
    logger.debug(`Attempting to decode QR code from image: ${imageSource.substring(0, 50)}...`);

    // QR Scanner works with data URLs and image URLs
    const result = await QrScanner.scanImage(imageSource);

    if (result) {
      logger.info(`Successfully decoded QR code: ${result}`);
      return result;
    }

    return null;
  } catch (error) {
    // QR Scanner throws if no QR code found - this is normal
    logger.debug('No QR code found in image');
    return null;
  }
}

/**
 * Perform OCR on image to extract text
 */
export async function performOcr(imageSource: string): Promise<string> {
  try {
    logger.debug(`Performing OCR on image: ${imageSource.substring(0, 50)}...`);

    const worker = await getTesseractWorker();
    const { data } = await worker.recognize(imageSource);

    const extractedText = data.text.trim();
    logger.info(`OCR extracted ${extractedText.length} characters of text`);

    return extractedText;
  } catch (error) {
    logger.error('Error performing OCR:', error);
    return '';
  }
}

/**
 * Extract URLs from text using simple regex
 */
function extractUrlsFromText(text: string): string[] {
  const urls: string[] = [];
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    urls.push(match[0]);
  }

  return [...new Set(urls)];
}

/**
 * Extract phishing-related keywords from text
 */
function extractPhishingKeywords(text: string): string[] {
  const keywords: string[] = [];
  const lowerText = text.toLowerCase();

  const phishingPatterns = [
    'verify',
    'suspend',
    'urgent',
    'password',
    'account',
    'security',
    'confirm',
    'update',
    'expire',
    'click here',
    'act now',
    'limited time',
    'unusual activity',
    'verify identity',
    'payment',
    'refund',
    'prize',
    'winner',
    'claim',
    'congratulations'
  ];

  for (const pattern of phishingPatterns) {
    if (lowerText.includes(pattern)) {
      keywords.push(pattern);
    }
  }

  return keywords;
}

/**
 * Analyze all QR codes in email images
 * T304: QR Code Analysis
 */
export async function analyzeQrCodes(
  htmlContent: string,
  enableOnlineLookups: boolean = false
): Promise<QrCodeAnalysis[]> {
  const results: QrCodeAnalysis[] = [];

  try {
    const images = extractImagesFromHtml(htmlContent);
    logger.info(`Analyzing ${images.length} images for QR codes...`);

    for (const image of images) {
      try {
        const decodedContent = await decodeQrCode(image.src);

        if (decodedContent) {
          // Check if decoded content is a URL
          let linkAnalysis: SuspiciousLink | undefined = undefined;
          let decodedUrl: string | undefined = undefined;
          let decodedText: string | undefined = undefined;
          let isSuspicious = false;

          try {
            new URL(decodedContent);
            // It's a valid URL
            decodedUrl = decodedContent;
            linkAnalysis = analyzeUrl(decodedContent, enableOnlineLookups);
            isSuspicious = linkAnalysis.suspicionReasons.length > 0;
          } catch {
            // Not a URL, just text
            decodedText = decodedContent;
            // Check if text contains phishing keywords
            const keywords = extractPhishingKeywords(decodedContent);
            isSuspicious = keywords.length > 0;
          }

          results.push({
            decodedUrl,
            decodedText,
            isSuspicious,
            linkAnalysis
          });

          logger.info(`QR code decoded: ${isSuspicious ? 'SUSPICIOUS' : 'safe'}`);
        }
      } catch (error) {
        logger.debug(`Failed to decode QR from image ${image.src.substring(0, 50)}:`, error);
        // Continue with next image
      }
    }

    logger.info(`QR code analysis complete: ${results.length} QR codes found`);
  } catch (error) {
    logger.error('Error analyzing QR codes:', error);
  }

  return results;
}

/**
 * Perform OCR analysis on all email images
 * T305: OCR Analysis
 */
export async function analyzeImagesWithOcr(
  htmlContent: string
): Promise<OcrAnalysis[]> {
  const results: OcrAnalysis[] = [];

  try {
    const images = extractImagesFromHtml(htmlContent);
    logger.info(`Performing OCR on ${images.length} images...`);

    for (const image of images) {
      try {
        const extractedText = await performOcr(image.src);

        // Only include results with meaningful text (more than 10 characters)
        if (extractedText.length > 10) {
          const detectedUrls = extractUrlsFromText(extractedText);
          const detectedKeywords = extractPhishingKeywords(extractedText);

          results.push({
            imageSource: image.src.substring(0, 100), // Truncate for storage
            extractedText: extractedText.substring(0, 1000), // Limit text length
            detectedUrls,
            detectedKeywords
          });

          logger.info(`OCR found ${detectedUrls.length} URLs and ${detectedKeywords.length} keywords`);
        }
      } catch (error) {
        logger.debug(`Failed to perform OCR on image ${image.src.substring(0, 50)}:`, error);
        // Continue with next image
      }
    }

    logger.info(`OCR analysis complete: ${results.length} images processed`);
  } catch (error) {
    logger.error('Error performing OCR analysis:', error);
  }

  return results;
}

/**
 * Combined image analysis (QR + OCR)
 * Only runs the analyses that are enabled
 */
export async function analyzeEmailImages(
  htmlContent: string,
  enableQrDecoding: boolean = false,
  enableOcr: boolean = false,
  enableOnlineLookups: boolean = false
): Promise<{
  qrCodes?: QrCodeAnalysis[];
  ocrResults?: OcrAnalysis[];
}> {
  const results: {
    qrCodes?: QrCodeAnalysis[];
    ocrResults?: OcrAnalysis[];
  } = {};

  // Only analyze if content is HTML and has images
  if (!htmlContent.includes('<img')) {
    logger.debug('No images found in content, skipping image analysis');
    return results;
  }

  try {
    // Run QR and OCR in parallel if both are enabled
    const promises: Promise<any>[] = [];

    if (enableQrDecoding) {
      logger.info('QR code decoding enabled, analyzing...');
      promises.push(
        analyzeQrCodes(htmlContent, enableOnlineLookups).then(qrCodes => {
          results.qrCodes = qrCodes;
        })
      );
    }

    if (enableOcr) {
      logger.info('OCR analysis enabled, analyzing...');
      promises.push(
        analyzeImagesWithOcr(htmlContent).then(ocrResults => {
          results.ocrResults = ocrResults;
        })
      );
    }

    await Promise.all(promises);
  } catch (error) {
    logger.error('Error in image analysis:', error);
  }

  return results;
}
