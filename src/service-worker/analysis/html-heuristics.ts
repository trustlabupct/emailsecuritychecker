// src/service-worker/analysis/html-heuristics.ts
import { HtmlHeuristics } from '../../shared/types';
import { analyzeHtmlStructure } from '../offscreen-bridge';
import { logger } from '../utils/logger';

/**
 * Delegates HTML heuristic analysis to the offscreen DOM parser (or local DOMParser fallback).
 */
export async function analyzeHtmlHeuristics(htmlContent: string): Promise<HtmlHeuristics> {
  try {
    return await analyzeHtmlStructure(htmlContent);
  } catch (error) {
    logger.error('Error analyzing HTML heuristics:', error);
    return {
      hasHiddenText: false,
      hasObfuscatedStyles: false,
      hiddenTextSnippets: [],
      suspiciousStyleCount: 0,
    };
  }
}

export function isHtmlContent(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}

export function stripHtmlTags(html: string): string {
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&nbsp;/gi, ' ');
  text = text.replace(/&amp;/gi, '&');
  text = text.replace(/&lt;/gi, '<');
  text = text.replace(/&gt;/gi, '>');
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#39;/gi, '\'');
  return text.replace(/\s+/g, ' ').trim();
}
