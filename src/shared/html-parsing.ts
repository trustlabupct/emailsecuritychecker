import { HtmlHeuristics } from './types';

export interface ParsedAnchor {
  href: string;
  text: string;
  normalizedText: string;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function extractAnchorsFromDocument(doc: Document): ParsedAnchor[] {
  const anchors: ParsedAnchor[] = [];
  const anchorNodes = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href]'));

  for (const anchor of anchorNodes) {
    const href = anchor.getAttribute('href');
    if (!href) continue;

    const text = anchor.textContent ?? '';
    const normalizedText = normalizeWhitespace(text);
    anchors.push({
      href,
      text,
      normalizedText,
    });
  }

  return anchors;
}

function collectHiddenTextSnippets(doc: Document): { snippets: string[]; count: number } {
  const snippets = new Set<string>();
  let count = 0;

  const elements = Array.from(doc.querySelectorAll<HTMLElement>('[style]'));
  for (const element of elements) {
    const styleAttr = element.getAttribute('style');
    if (!styleAttr) continue;
    const style = styleAttr.toLowerCase();
    const text = normalizeWhitespace(element.textContent ?? '');
    if (!text) continue;

    const matchesHidden =
      /display\s*:\s*none/.test(style) ||
      /visibility\s*:\s*hidden/.test(style) ||
      /opacity\s*:\s*0\b/.test(style) ||
      /font-size\s*:\s*0/.test(style) ||
      /height\s*:\s*0/.test(style) ||
      /width\s*:\s*0/.test(style) ||
      /text-indent\s*:\s*-\d{3,}/.test(style);

    const offscreenMatch = /position\s*:\s*absolute/.test(style) && /(?:left|top)\s*:\s*-\d+/.test(style);

    if (matchesHidden || offscreenMatch) {
      snippets.add(text.slice(0, 120));
      count += 1;
      continue;
    }

    const colorMatch = style.match(/color\s*:\s*([^;]+)/);
    const backgroundMatch = style.match(/background(?:-color)?\s*:\s*([^;]+)/);
    if (colorMatch && backgroundMatch && colorMatch[1].trim() === backgroundMatch[1].trim()) {
      snippets.add(text.slice(0, 120));
      count += 1;
    }
  }

  return { snippets: Array.from(snippets), count };
}

function countObfuscatedStyles(doc: Document): number {
  let score = 0;
  const elements = Array.from(doc.querySelectorAll<HTMLElement>('[style]'));

  for (const element of elements) {
    const styleAttr = element.getAttribute('style');
    if (!styleAttr) continue;
    const style = styleAttr.toLowerCase();

    const propertyCount = style.split(';').filter(Boolean).length;
    if (propertyCount > 10) {
      score += 1;
    }
    if ((style.match(/!\s*important/g) || []).length > 3) {
      score += 1;
    }
    if (/z-index\s*:\s*-?\d{4,}/.test(style)) {
      score += 1;
    }
    if (/clip(?:-path)?\s*:\s*(?:rect|inset)\(/.test(style)) {
      score += 1;
    }
    if (/overflow\s*:\s*hidden/.test(style) && /position\s*:\s*(?:absolute|fixed)/.test(style)) {
      score += 1;
    }
    if (/transform\s*:[^;]*scale\(0\)/.test(style)) {
      score += 1;
    }
  }

  const styleTags = Array.from(doc.querySelectorAll('style'));
  for (const tag of styleTags) {
    const content = tag.textContent?.toLowerCase() ?? '';
    if (/@media[^{]*max-width\s*:\s*0/.test(content) || /@media[^{]*print[^{]*display\s*:\s*none/.test(content)) {
      score += 2;
    }
    if (/::(?:before|after)\s*{\s*content\s*:\s*["']{1}[^"']{50,}/.test(content)) {
      score += 1;
    }
  }

  return score;
}

function countSuspiciousStructure(doc: Document): number {
  let suspicion = 0;

  const tables = Array.from(doc.querySelectorAll('table'));
  for (const table of tables) {
    let depth = 0;
    let node: Element | null = table;
    while (node) {
      const childTable: Element | null = node.querySelector('table');
      if (!childTable) break;
      depth += 1;
      node = childTable;
      if (depth >= 3) {
        suspicion += 1;
        break;
      }
    }
  }

  const iframes = doc.querySelectorAll('iframe').length;
  if (iframes > 2) suspicion += 1;

  const emptyLinks = Array.from(doc.querySelectorAll('a[href]')).filter((anchor) => {
    const hasChild = anchor.children.length > 0;
    const text = normalizeWhitespace(anchor.textContent ?? '');
    return !hasChild && !text;
  }).length;
  if (emptyLinks > 0) suspicion += 1;

  const svgCount = doc.querySelectorAll('svg').length;
  if (svgCount > 5) suspicion += 1;

  const canvasCount = doc.querySelectorAll('canvas').length;
  if (canvasCount > 0) suspicion += 1;

  const scriptCount = doc.querySelectorAll('script').length;
  if (scriptCount > 3) suspicion += 1;

  const base64Images = doc.querySelectorAll('img[src^="data:image"]').length;
  if (base64Images > 2) suspicion += 1;

  return suspicion;
}

export function analyzeHtmlHeuristicsFromDocument(doc: Document): HtmlHeuristics {
  const hidden = collectHiddenTextSnippets(doc);
  const obfuscated = countObfuscatedStyles(doc);
  const structureSuspicion = countSuspiciousStructure(doc);

  const totalSuspicion = hidden.count + obfuscated + structureSuspicion;

  return {
    hasHiddenText: hidden.snippets.length > 0,
    hasObfuscatedStyles: totalSuspicion > 0,
    hiddenTextSnippets: hidden.snippets.slice(0, 10),
    suspiciousStyleCount: totalSuspicion,
  };
}
