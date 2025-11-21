import { ParsedAnchor, extractAnchorsFromDocument, analyzeHtmlHeuristicsFromDocument } from '../shared/html-parsing';

const domParser = new DOMParser();

function parseDocument(html: string): Document {
  return domParser.parseFromString(html, 'text/html');
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.target !== 'offscreen') {
    return false;
  }

  const { type, payload } = message;

  try {
    if (type === 'PARSE_LINKS') {
      const document = parseDocument(payload.html as string);
      const anchors: ParsedAnchor[] = extractAnchorsFromDocument(document);
      sendResponse({ anchors });
      return true;
    }

    if (type === 'ANALYZE_HTML_HEURISTICS') {
      const document = parseDocument(payload.html as string);
      const heuristics = analyzeHtmlHeuristicsFromDocument(document);
      sendResponse(heuristics);
      return true;
    }
  } catch (error) {
    sendResponse({ error: (error as Error).message });
    return true;
  }

  return false;
});
