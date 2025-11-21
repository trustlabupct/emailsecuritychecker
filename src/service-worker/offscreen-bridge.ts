import { HtmlHeuristics } from '../shared/types';
import { ParsedAnchor, extractAnchorsFromDocument, analyzeHtmlHeuristicsFromDocument } from '../shared/html-parsing';
import { logger } from './utils/logger';

const runtimeApi = typeof chrome !== 'undefined' ? chrome.runtime : undefined;
const OFFSCREEN_URL = runtimeApi?.getURL ? runtimeApi.getURL('offscreen.html') : undefined;

let offscreenInitPromise: Promise<void> | null = null;
let offscreenSupportWarned = false;
let domParserMissingWarned = false;

function offscreenSupported(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.offscreen && typeof OFFSCREEN_URL === 'string';
}

async function ensureOffscreenDocument(): Promise<void> {
  if (!offscreenSupported()) {
    if (!offscreenSupportWarned) {
      logger.warn('Offscreen document not available; HTML analysis will fall back to DOMParser when possible.');
      offscreenSupportWarned = true;
    }
    return;
  }

  if (!offscreenInitPromise) {
    offscreenInitPromise = (async () => {
      try {
        const hasDocument = await chrome.offscreen.hasDocument();
        if (hasDocument) return;
      } catch {
        // Ignore errors from hasDocument on older versions.
      }
      try {
        await chrome.offscreen.createDocument({
          url: OFFSCREEN_URL!,
          reasons: ['DOM_PARSER'],
          justification: 'Parse HTML content for security analysis',
        });
      } catch (error) {
        logger.error('Failed to create offscreen document; HTML analysis may be degraded.', error);
        throw error;
      }
    })();
  }

  await offscreenInitPromise;
}

function sendOffscreenMessage<T>(type: string, payload: Record<string, any>): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      await ensureOffscreenDocument();
      chrome.runtime.sendMessage({ target: 'offscreen', type, payload }, (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }
        resolve(response as T);
      });
    } catch (error) {
      logger.error('Offscreen message failed; falling back to local parsing if possible.', error);
      reject(error);
    }
  });
}

function domParserAvailable(): boolean {
  return typeof DOMParser !== 'undefined';
}

function parseLocally<T>(html: string, parser: (doc: Document) => T): T {
  const parserInstance = new DOMParser();
  const doc = parserInstance.parseFromString(html, 'text/html');
  return parser(doc);
}

export async function extractAnchorsFromHtml(html: string): Promise<ParsedAnchor[]> {
  if (offscreenSupported()) {
    try {
      return await sendOffscreenMessage<{ anchors: ParsedAnchor[] }>('PARSE_LINKS', { html }).then(res => res.anchors);
    } catch (error) {
      logger.error('Offscreen link parsing failed; attempting DOMParser fallback.', error);
    }
  }
  if (domParserAvailable()) {
    return parseLocally(html, extractAnchorsFromDocument);
  }
  if (!domParserMissingWarned) {
    logger.error('HTML link parsing skipped: no Offscreen API and DOMParser unavailable in this context.');
    domParserMissingWarned = true;
  }
  return [];
}

export async function analyzeHtmlStructure(html: string): Promise<HtmlHeuristics> {
  if (offscreenSupported()) {
    try {
      return await sendOffscreenMessage<HtmlHeuristics>('ANALYZE_HTML_HEURISTICS', { html });
    } catch (error) {
      logger.error('Offscreen HTML heuristic parsing failed; attempting DOMParser fallback.', error);
    }
  }
  if (domParserAvailable()) {
    return parseLocally(html, analyzeHtmlHeuristicsFromDocument);
  }
  if (!domParserMissingWarned) {
    logger.error('HTML heuristic analysis skipped: no Offscreen API and DOMParser unavailable in this context.');
    domParserMissingWarned = true;
  }
  return {
    hasHiddenText: false,
    hasObfuscatedStyles: false,
    hiddenTextSnippets: [],
    suspiciousStyleCount: 0,
  };
}
