// src/content/index.ts
import { createRiskSummaryBanner, showLoadingBanner, injectStyles } from '../ui/components/RiskSummaryBanner';
import { createBrowserSigninWarning } from '../ui/components/BrowserSigninWarning';
import { EmailAnalysis } from '../shared/types';
import { addAnalysisToHistory } from '../shared/analysis-history';
import { getUserSettings } from '../shared/user-settings';

console.log("Content script loaded.");

// Inject the page context script to access Gmail's internal API
function injectPageScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('gmail-injected.js');
  script.onload = function () {
    console.log("Page context script injected successfully");
    script.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// Inject the script as early as possible
injectPageScript();

// Example: Send a message to the service worker
chrome.runtime.sendMessage({ type: "CONTENT_SCRIPT_LOADED" });

type StyleProperty = 'top' | 'paddingTop';
type StatusVariant = 'error' | 'warning' | 'info';

const FIXED_ELEMENT_SELECTORS: string[] = [
  '#gb',
  'header[role="banner"]',
  'div[role="banner"]',
  'div[aria-label="Primary navigation"]',
  'header.gb_Qd',
  '.gb_Qd',
  'header.gb_Od',
  '.gb_hc',
  '.gb_Vd',
  'header.gb_Vd',
  '.nH.bkL',
  '.nH .no',
  'header.gmail-header',
  'div.gmail-header',
  '.ata-asE',
  '.wl',
  '.wq',
  '.wp',
  '.wo',
  '.wn',
  '.w-asK',
  '.w-atd'
];



const MAIN_ELEMENT_SELECTORS: string[] = ['body'];

let bannerLayoutFrame: number | null = null;
let bannerResizeObserver: ResizeObserver | null = null;
let observedBannerElement: HTMLElement | null = null;
let lastAdjustmentTime: number = 0;
const ADJUSTMENT_DEBOUNCE_MS = 50;

function createStatusBanner(message: string, variant: StatusVariant): HTMLElement {
  injectStyles();
  const container = document.createElement('div');
  container.id = 'trustemail-analysis-container';
  container.className = 'trustemail-banner-container';

  const banner = document.createElement('div');
  const variantClass =
    variant === 'error' ? 'trustemail-banner-error' :
      variant === 'warning' ? 'trustemail-banner-warning' :
        'trustemail-banner-info';

  banner.className = `trustemail-risk-banner ${variantClass}`;
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  banner.innerHTML = `
    <div class="trustemail-banner-content" style="justify-content: center; text-align: center;">
      <span>${message}</span>
    </div>
  `;

  container.appendChild(banner);
  return container;
}

function applyOffsetToElements(selectors: string[], property: StyleProperty, offset: number, onlyFirst: boolean = false): boolean {
  const uniqueElements = new Set<HTMLElement>();
  const foundSelectors: string[] = [];

  selectors.forEach((selector) => {
    const elements = document.querySelectorAll<HTMLElement>(selector);
    if (elements.length > 0) {
      foundSelectors.push(`${selector} (${elements.length})`);
      if (onlyFirst && elements.length > 0) {
        // Only add the first element found
        uniqueElements.add(elements[0]);
      } else {
        elements.forEach((element) => {
          uniqueElements.add(element);
        });
      }
    }
  });

  console.log(`[TrustEmail Layout] Found ${uniqueElements.size} elements for ${property} adjustment:`, foundSelectors);

  if (uniqueElements.size === 0) {
    console.warn(`[TrustEmail Layout] No elements found for ${property} adjustment with selectors:`, selectors);
    return false;
  }

  let adjustedCount = 0;

  uniqueElements.forEach((element) => {
    // Skip if this element is a child of another element we're adjusting
    if (onlyFirst && property === 'paddingTop') {
      let skip = false;
      uniqueElements.forEach((otherElement) => {
        if (otherElement !== element && otherElement.contains(element)) {
          skip = true;
        }
      });
      if (skip) {
        console.log(`[TrustEmail Layout] Skipping nested element:`, element.tagName, element.className);
        return;
      }
    }

    const inlineKey = property === 'top'
      ? 'trustemailOriginalTopInline'
      : 'trustemailOriginalPaddingTopInline';
    const computedKey = property === 'top'
      ? 'trustemailOriginalTopComputed'
      : 'trustemailOriginalPaddingTopComputed';
    const cssProperty = property === 'top' ? 'top' : 'padding-top';

    if (!(inlineKey in element.dataset)) {
      element.dataset[inlineKey] = property === 'top' ? element.style.top : element.style.paddingTop;
    }

    if (!(computedKey in element.dataset)) {
      const computedValue = window.getComputedStyle(element)[property];
      element.dataset[computedKey] = computedValue === 'auto' ? '0px' : computedValue;
    }

    const originalInline = element.dataset[inlineKey] ?? '';
    const baseValue = element.dataset[computedKey] ?? '0px';

    if (offset === 0) {
      element.style.removeProperty(cssProperty);
      if (originalInline) {
        element.style.setProperty(cssProperty, originalInline, 'important');
      }
      delete element.dataset[inlineKey];
      delete element.dataset[computedKey];
      return;
    }

    const nextValue = !baseValue || baseValue === '0px' || baseValue === 'auto'
      ? `${offset}px`
      : `calc(${baseValue} + ${offset}px)`;

    element.style.setProperty(cssProperty, nextValue, 'important');
    adjustedCount++;
  });

  console.log(`[TrustEmail Layout] Applied ${property} offset of ${offset}px to ${adjustedCount} elements`);
  return true;
}

function applyBannerLayoutAdjustments() {
  const bannerElement = document.getElementById('trustemail-analysis-container') as HTMLElement | null;
  const body = document.body;

  if (!body) {
    return;
  }

  const totalHeight = bannerElement ? Math.ceil(bannerElement.getBoundingClientRect().height) : 0;
  const summaryElement = bannerElement?.querySelector('.trustemail-risk-banner') as HTMLElement | null;
  const summaryHeight = summaryElement ? Math.ceil(summaryElement.getBoundingClientRect().height) : totalHeight;
  const offset = Math.max(0, summaryHeight);

  console.log('[TrustEmail Layout]', {
    bannerExists: !!bannerElement,
    bannerHeight: totalHeight,
    summaryHeight: offset,
    bannerTop: bannerElement?.getBoundingClientRect().top,
    bannerZIndex: bannerElement ? window.getComputedStyle(bannerElement).zIndex : 'N/A',
    bodyPaddingTop: window.getComputedStyle(body).paddingTop
  });

  if (offset > 0) {
    body.classList.add('trustemail-banner-active');
    body.style.setProperty('--trustemail-banner-height', `${offset}px`);
    document.documentElement.style.setProperty('scroll-padding-top', `${offset}px`);
    console.log('[TrustEmail Layout] Applied banner offset:', offset + 'px');
  } else {
    body.classList.remove('trustemail-banner-active');
    body.style.removeProperty('--trustemail-banner-height');
    document.documentElement.style.removeProperty('scroll-padding-top');
    console.log('[TrustEmail Layout] Removed banner adjustments');
  }

  applyOffsetToElements(FIXED_ELEMENT_SELECTORS, 'top', offset);
  // Only apply padding to body to avoid cumulative padding from nested elements
  applyOffsetToElements(['body'], 'paddingTop', offset);

  if (typeof ResizeObserver !== 'undefined') {
    if (!bannerResizeObserver) {
      bannerResizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          console.log('[TrustEmail Layout] ResizeObserver triggered, new height:',
            Math.ceil(entry.contentRect.height));
        }
        scheduleBannerLayoutAdjustments();
      });
    }

    if (observedBannerElement !== bannerElement) {
      bannerResizeObserver.disconnect();
      observedBannerElement = bannerElement;
      if (bannerElement) {
        bannerResizeObserver.observe(bannerElement);
        console.log('[TrustEmail Layout] Now observing banner element');
      }
    }
  }
}

function scheduleBannerLayoutAdjustments() {
  const now = Date.now();
  const timeSinceLastAdjustment = now - lastAdjustmentTime;

  if (bannerLayoutFrame !== null) {
    cancelAnimationFrame(bannerLayoutFrame);
  }

  // Apply debouncing to prevent excessive adjustments
  if (timeSinceLastAdjustment < ADJUSTMENT_DEBOUNCE_MS) {
    console.log('[TrustEmail Layout] Debouncing adjustment request');
  }

  bannerLayoutFrame = requestAnimationFrame(() => {
    bannerLayoutFrame = null;
    lastAdjustmentTime = Date.now();
    applyBannerLayoutAdjustments();
  });
}

// Set up MutationObserver to reapply adjustments when Gmail modifies the DOM
let domObserver: MutationObserver | null = null;

function setupDOMObserver() {
  if (domObserver) {
    domObserver.disconnect();
  }

  domObserver = new MutationObserver((mutations) => {
    let needsReapply = false;

    for (const mutation of mutations) {
      // Check if Gmail modified any elements we're adjusting
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const target = mutation.target as HTMLElement;
        if (target.matches(FIXED_ELEMENT_SELECTORS.join(',')) ||
          target.matches(MAIN_ELEMENT_SELECTORS.join(',')) ||
          target === document.body) {
          needsReapply = true;
          break;
        }
      } else if (mutation.type === 'childList') {
        // Check if Gmail added new elements that need adjustment
        const addedNodes = Array.from(mutation.addedNodes).filter(node => node.nodeType === Node.ELEMENT_NODE) as HTMLElement[];
        for (const node of addedNodes) {
          if (node.matches && (node.matches(FIXED_ELEMENT_SELECTORS.join(',')) || node.matches(MAIN_ELEMENT_SELECTORS.join(',')))) {
            needsReapply = true;
            break;
          }
        }
      }
      if (needsReapply) break;
    }

    if (needsReapply) {
      scheduleBannerLayoutAdjustments();
    }
  });

  // Observe the entire document for changes
  domObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });

  console.log('[TrustEmail] DOM observer initialized');
}

window.addEventListener('trustemail-banner-resize', (_event: Event) => {
  console.log('[TrustEmail Layout] Banner resize event received');
  scheduleBannerLayoutAdjustments();
});

window.addEventListener('resize', () => {
  scheduleBannerLayoutAdjustments();
});

// Initialize DOM observer after a short delay to let Gmail load
setTimeout(() => {
  setupDOMObserver();
}, 2000);

// Track pending banner update timeout to prevent race conditions
let pendingBannerUpdate: number | null = null;

// Function to inject or update the banner with smooth transition
function updateBanner(bannerElement: HTMLElement) {
  const existingContainer = document.getElementById('trustemail-analysis-container');
  console.log('[TrustEmail] Updating banner, existing:', !!existingContainer);

  // Cancel any pending banner update to avoid race conditions
  if (pendingBannerUpdate !== null) {
    clearTimeout(pendingBannerUpdate);
    pendingBannerUpdate = null;
    console.log('[TrustEmail] Canceled pending banner update');
  }

  if (existingContainer) {
    // Immediate replacement without animation to avoid race conditions
    // (Analysis often completes before fade animation finishes)
    existingContainer.replaceWith(bannerElement);
    scheduleBannerLayoutAdjustments();
    console.log('[TrustEmail] Banner replaced and adjustments scheduled');
  } else {
    if (document.body) {
      document.body.prepend(bannerElement);
      console.log('[TrustEmail] Banner prepended to body');
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.body?.prepend(bannerElement);
        scheduleBannerLayoutAdjustments();
        console.log('[TrustEmail] Banner prepended after DOMContentLoaded');
      }, { once: true });
      return;
    }
    scheduleBannerLayoutAdjustments();
  }
}

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log("Content script received message:", message);
  if (message.type === "SERVICE_WORKER_READY") {
    console.log("Service worker is ready!");
    sendResponse({ status: "ACK" });
  } else if (message.type === "ANALYSIS_IN_PROGRESS") {
    updateBanner(showLoadingBanner());
    sendResponse({ status: "ACK" });
  } else if (message.type === "ANALYSIS_COMPLETE" && message.analysis) {
    console.log("Analysis complete message received:", message.analysis);
    const analysis = message.analysis as EmailAnalysis;
    const senderName = message.senderName || 'Unknown Sender';
    const subject = message.subject || '';

    // Extract top risk factors from enhanced analysis
    const enhancedAnalysis = analysis as any;
    let topRiskFactors: string[] = [];
    if (enhancedAnalysis.riskFactorBreakdown && Array.isArray(enhancedAnalysis.riskFactorBreakdown)) {
      topRiskFactors = enhancedAnalysis.riskFactorBreakdown
        .slice(0, 3)
        .map((f: any) => f.factor || f.description);
    }

    // Save to history if enabled (async but don't block UI)
    getUserSettings().then(settings => {
      if (settings.enableHistoryTracking) {
        return addAnalysisToHistory({
          messageId: analysis.messageId,
          threadId: analysis.threadId,
          timestamp: Date.now(),
          sender: senderName,
          subject: subject,
          riskScore: analysis.riskScore,
          topRiskFactors: topRiskFactors
        });
      }
    }).then(() => {
      console.log("Analysis saved to history:", { sender: senderName, subject, riskScore: analysis.riskScore });
    }).catch(error => {
      console.error("Failed to save analysis to history:", error);
    });

    // Replace loading banner with analysis results
    const banner = createRiskSummaryBanner(analysis);
    updateBanner(banner);
    sendResponse({ status: "ACK" });
  } else if (message.type === "AUTH_ERROR_BROWSER_SIGNIN") {
    const warningBanner = createBrowserSigninWarning();
    updateBanner(warningBanner);
    sendResponse({ status: "ACK" });
  } else if (message.type === "ANALYSIS_ERROR") {
    console.error("Analysis error received:", message.error);
    const errorBanner = createStatusBanner(`TrustEmail Error: ${message.error}`, 'error');
    updateBanner(errorBanner);
    sendResponse({ status: "ACK" });
  } else if (message.type === "REPORT_COPIED" && message.reportText) {
    console.log("Report text received, copying to clipboard.");
    navigator.clipboard.writeText(message.reportText)
      .then(() => console.log("Report copied to clipboard!"))
      .catch(err => console.error("Failed to copy report:", err));
    sendResponse({ status: "ACK" });
  } else if (message.type === "ANALYSIS_SKIPPED") {
    console.log("Analysis skipped:", message.message);
    const skippedBanner = createStatusBanner(`TrustEmail: ${message.message}`, 'info');
    updateBanner(skippedBanner);
    sendResponse({ status: "ACK" });
  }
});

// Store the latest thread ID from the injected script
let latestThreadId: string | null = null;
let threadIdPromiseResolvers: { [key: string]: (threadId: string | null) => void } = {};
// Listen for messages from the injected page script
window.addEventListener('message', (event) => {

  // T601: Secure postMessage - validate source origin
  if (event.source !== window) return;
  if (event.origin !== 'https://mail.google.com') return;

  // ONLY process messages that are objects with our TRUSTEMAIL_ prefix
  // This filters out all Gmail internal messages and other extensions
  if (!event.data || typeof event.data !== 'object' || typeof event.data.type !== 'string') {
    return; // Silently ignore non-object or non-typed messages
  }

  // Only process messages that start with TRUSTEMAIL_
  if (!event.data.type.startsWith('TRUSTEMAIL_')) {
    return; // Silently ignore messages from other sources (Gmail, other extensions)
  }

  if (event.data.type === 'TRUSTEMAIL_THREAD_ID_RESPONSE') {
    console.log("[TrustEmail Content] Received thread ID response:", event.data.threadId);
    const resolver = threadIdPromiseResolvers[event.data.requestId];
    if (resolver) {
      resolver(event.data.threadId);
      delete threadIdPromiseResolvers[event.data.requestId];
    }
  } else if (event.data.type === 'TRUSTEMAIL_THREAD_ID_CHANGED') {
    console.log("[TrustEmail Content] Thread ID changed:", event.data.threadId);
    latestThreadId = event.data.threadId;
    handleThreadIdChange(event.data.threadId);
  }
});

// Function to request thread ID from injected script
function getGmailMessageId(): Promise<string | null> {
  return new Promise((resolve) => {
    // If we have a recent thread ID, return it immediately
    if (latestThreadId) {
      resolve(latestThreadId);
      return;
    }

    // Otherwise, request it from the injected script
    const requestId = `req_${Date.now()}_${Math.random()}`;
    threadIdPromiseResolvers[requestId] = resolve;

    // T601: Specify target origin for security
    window.postMessage({
      type: 'TRUSTEMAIL_GET_THREAD_ID',
      requestId: requestId
    }, 'https://mail.google.com');

    // Timeout after 2 seconds
    setTimeout(() => {
      if (threadIdPromiseResolvers[requestId]) {
        console.warn("Thread ID request timed out");
        resolve(null);
        delete threadIdPromiseResolvers[requestId];
      }
    }, 2000);
  });
}

// Fallback function to extract thread ID from DOM (if injected script fails)
function getGmailMessageIdFromDOM(): string | null {
  // Method 1: Look for the data-thread-id attribute on the email container
  const emailContainer = document.querySelector('[data-thread-id]');
  if (emailContainer) {
    const threadId = emailContainer.getAttribute('data-thread-id');
    if (threadId) {
      console.log("Found thread ID from data-thread-id:", threadId);
      return threadId;
    }
  }

  // Method 2: Look for thread ID in the email view's data attributes
  const emailView = document.querySelector('.aDh[data-legacy-thread-id]');
  if (emailView) {
    const threadId = emailView.getAttribute('data-legacy-thread-id');
    if (threadId) {
      console.log("Found thread ID from data-legacy-thread-id:", threadId);
      return threadId;
    }
  }

  // Method 3: Extract thread ID from URL
  // Gmail thread IDs are 16-character hex strings (lowercase)
  const url = window.location.href;
  const hashMatch = url.match(/#(?:inbox|label|all|search)\/([a-f0-9]{16})(?:[/?#]|$)/);
  if (hashMatch && hashMatch[1]) {
    console.log("Found thread ID from URL:", hashMatch[1]);
    return hashMatch[1];
  }

  console.warn("Could not find Gmail thread ID from DOM");
  return null;
}

// Handle thread ID changes
let currentMessageId: string | null = null;
function handleThreadIdChange(threadId: string | null) {
  // Handle null threadId (inbox view) - clear banner and reset state
  if (threadId === null) {
    console.log("Navigated to inbox/list view (no thread ID), clearing banner");
    currentMessageId = null;

    // Show neutral banner for inbox view
    const neutralBanner = createStatusBanner(
      chrome.i18n.getMessage("selectEmailPrompt") || "Select an email to analyze its security",
      'info'
    );
    updateBanner(neutralBanner);
    return;
  }

  // Handle valid threadId - analyze if different from current
  if (threadId && threadId !== currentMessageId) {
    currentMessageId = threadId;
    console.log("New Gmail message ID detected:", currentMessageId);
    chrome.runtime.sendMessage({ type: "ANALYZE_EMAIL", messageId: currentMessageId });
  }
}

// Initial check after a delay to allow injected script to initialize
setTimeout(async () => {
  // Check if we're on inbox/list view first
  const hash = window.location.hash;
  const isViewingEmail = /#(inbox|label|all|search|starred|sent|drafts|spam|trash)\/[a-zA-Z0-9_-]+/.test(hash);

  if (!isViewingEmail) {
    // We're on inbox/list view - show neutral banner
    console.log("Initial load: inbox/list view detected, showing neutral banner");
    const neutralBanner = createStatusBanner(
      chrome.i18n.getMessage("selectEmailPrompt") || "Select an email to analyze its security",
      'info'
    );
    updateBanner(neutralBanner);
    return;
  }

  // We're viewing an email - try to get thread ID
  let threadId = await getGmailMessageId();

  // If the injected script didn't work, try DOM extraction as fallback
  if (!threadId) {
    console.log("Falling back to DOM extraction");
    threadId = getGmailMessageIdFromDOM();
  }

  if (threadId) {
    currentMessageId = threadId;
    console.log("Initial Gmail message ID:", currentMessageId);
    chrome.runtime.sendMessage({ type: "ANALYZE_EMAIL", messageId: currentMessageId });
  } else {
    // Couldn't find thread ID even though URL suggests we're viewing an email
    console.log("Initial load: viewing email but couldn't find thread ID, showing neutral banner");
    const neutralBanner = createStatusBanner(
      chrome.i18n.getMessage("selectEmailPrompt") || "Select an email to analyze its security",
      'info'
    );
    updateBanner(neutralBanner);
  }
}, 1500);
