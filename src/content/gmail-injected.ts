// src/content/gmail-injected.ts
// This script runs in the page context to access Gmail's internal API

(function () {
  'use strict';

  console.log('[TrustEmail Injected] Script loaded in page context');

  function getThreadIdFromUrl(): string | null {
    const hash = window.location.hash;
    const match = hash.match(/#(?:inbox|label\/[^\/]+|all|sent|imp|starred|drafts|spam|trash|category\/[^\/]+)\/([a-f0-9]{16})/);
    return match ? match[1] : null;
  }

  // Function to extract thread ID from Gmail's internal data and DOM
  function getThreadIdFromGmail(): string | null {
    try {
      const urlThreadId = getThreadIdFromUrl();
      console.log('[TrustEmail Injected] URL Thread ID:', urlThreadId);

      // Method 1: Gmail globals (most stable when fresh)
      if (typeof (window as any).GM_VIEW_DATA !== 'undefined') {
        const viewData = (window as any).GM_VIEW_DATA;
        if (viewData && viewData[4] && viewData[4][0]) {
          const threadId = viewData[4][0];
          if (/^[a-f0-9]{16}$/.test(threadId)) {
            if (!urlThreadId || threadId === urlThreadId) {
              console.log('[TrustEmail Injected] Found thread ID from GM_VIEW_DATA:', threadId);
              return threadId;
            } else {
              console.warn('[TrustEmail Injected] GM_VIEW_DATA thread ID stale vs URL, continuing to DOM.');
            }
          }
        }
      }

      // Method 2: VIEW_DATA fallback
      if (typeof (window as any).VIEW_DATA !== 'undefined') {
        const viewData = (window as any).VIEW_DATA;
        if (viewData && viewData.thread_id) {
          const threadId = viewData.thread_id;
          if (/^[a-f0-9]{16}$/.test(threadId)) {
            if (!urlThreadId || threadId === urlThreadId) {
              console.log('[TrustEmail Injected] Found thread ID from VIEW_DATA:', threadId);
              return threadId;
            } else {
              console.warn('[TrustEmail Injected] VIEW_DATA thread ID stale vs URL, continuing to DOM.');
            }
          }
        }
      }

      // Method 3: Main email view container (visible)
      const emailViewContainer = document.querySelector('.nH.if');
      if (emailViewContainer) {
        const allElements = emailViewContainer.querySelectorAll('[data-thread-id]');
        for (const el of Array.from(allElements)) {
          const threadId = el.getAttribute('data-thread-id');
          if (threadId && /^[a-f0-9]{16}$/.test(threadId)) {
            const rect = el.getBoundingClientRect();
            const isVisible = rect.width > 0 && rect.height > 0 &&
              window.getComputedStyle(el).display !== 'none' &&
              window.getComputedStyle(el).visibility !== 'hidden';
            const matchesUrl = !urlThreadId || threadId === urlThreadId;
            if (isVisible && matchesUrl) {
              console.log('[TrustEmail Injected] Found thread ID from visible email view container:', threadId);
              return threadId;
            }
          }
        }
      }

      // Method 4: Visible conversation view
      const conversationViews = document.querySelectorAll('[data-legacy-thread-id]');
      for (const view of Array.from(conversationViews)) {
        const threadId = view.getAttribute('data-legacy-thread-id');
        if (threadId && /^[a-f0-9]{16}$/.test(threadId)) {
          const rect = (view as Element).getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0 &&
            window.getComputedStyle(view as Element).display !== 'none' &&
            window.getComputedStyle(view as Element).visibility !== 'hidden';
          const matchesUrl = !urlThreadId || threadId === urlThreadId;
          if (isVisible && matchesUrl) {
            console.log('[TrustEmail Injected] Found thread ID from visible conversation view:', threadId);
            return threadId;
          }
        }
      }

      // Method 5: Email header parent
      const headerElement = document.querySelector('.adn.ads');
      if (headerElement) {
        const parent = headerElement.closest('[data-thread-id]');
        if (parent) {
          const threadId = parent.getAttribute('data-thread-id');
          if (threadId && /^[a-f0-9]{16}$/.test(threadId)) {
            const matchesUrl = !urlThreadId || threadId === urlThreadId;
            if (matchesUrl) {
              console.log('[TrustEmail Injected] Found thread ID from header parent:', threadId);
              return threadId;
            }
          }
        }
      }

      // Method 6: Any visible data-thread-id
      const allThreadElements = document.querySelectorAll('[data-thread-id]');
      for (const el of Array.from(allThreadElements)) {
        const threadId = el.getAttribute('data-thread-id');
        if (threadId && /^[a-f0-9]{16}$/.test(threadId)) {
          const rect = el.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0 &&
            window.getComputedStyle(el).display !== 'none' &&
            window.getComputedStyle(el).visibility !== 'hidden';
          const matchesUrl = !urlThreadId || threadId === urlThreadId;
          if (isVisible && matchesUrl) {
            console.log('[TrustEmail Injected] Found thread ID from visible DOM element:', threadId);
            return threadId;
          }
        }
      }

      // Method 7: Action bar/menu
      const actionBar = document.querySelector('[data-thread-id][role="menu"]');
      if (actionBar) {
        const threadId = actionBar.getAttribute('data-thread-id');
        if (threadId && /^[a-f0-9]{16}$/.test(threadId)) {
          const matchesUrl = !urlThreadId || threadId === urlThreadId;
          if (matchesUrl) {
            console.log('[TrustEmail Injected] Found thread ID from action bar:', threadId);
            return threadId;
          }
        }
      }

      // Method 8: URL fallback (last resort)
      if (urlThreadId) {
        console.log('[TrustEmail Injected] Falling back to URL Thread ID');
        return urlThreadId;
      }

      console.warn('[TrustEmail Injected] Could not find valid thread ID (16-char hex)');
      return null;
    } catch (error) {
      console.error('[TrustEmail Injected] Error extracting thread ID:', error);
      return null;
    }
  }

  // Listen for requests from the content script
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

    if (event.data.type === 'TRUSTEMAIL_GET_THREAD_ID') {
      console.log('[TrustEmail Injected] Received request for thread ID');
      const threadId = getThreadIdFromGmail();

      // T601: Send response with specific target origin
      window.postMessage({
        type: 'TRUSTEMAIL_THREAD_ID_RESPONSE',
        threadId: threadId,
        requestId: event.data.requestId
      }, 'https://mail.google.com');
    }
  });

  function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function isInboxView(): boolean {
    const hash = window.location.hash;
    return !/#(inbox|label|all|search|starred|sent|drafts|spam|trash)\/[a-zA-Z0-9_-]+/.test(hash);
  }

  function isGmailLoading(): boolean {
    return !!document.querySelector('[role="progressbar"]');
  }

  async function fetchStableThreadId(): Promise<string | null> {
    for (let attempt = 1; attempt <= 5; attempt++) {
      const candidate = getThreadIdFromGmail();
      if (candidate) {
        return candidate;
      }
      await delay(100 * attempt);
    }
    return null;
  }

  async function ensureGmailViewReady(): Promise<void> {
    let waits = 0;
    while (isGmailLoading() && waits < 10) {
      await delay(100);
      waits++;
    }
  }

  // Function to handle URL changes and notify content script
  async function handleUrlChange() {
    console.log('[TrustEmail Injected] URL changed, checking for thread ID');

    if (isInboxView()) {
      console.log('[TrustEmail Injected] Inbox/list view detected, sending null thread ID');
      window.postMessage({
        type: 'TRUSTEMAIL_THREAD_ID_CHANGED',
        threadId: null
      }, 'https://mail.google.com');
      return;
    }

    await ensureGmailViewReady();
    const threadId = await fetchStableThreadId();

    if (threadId) {
      window.postMessage({
        type: 'TRUSTEMAIL_THREAD_ID_CHANGED',
        threadId
      }, 'https://mail.google.com');
    } else {
      console.warn('[TrustEmail Injected] Unable to verify thread ID after multiple attempts');
      window.postMessage({
        type: 'TRUSTEMAIL_THREAD_ID_CHANGED',
        threadId: null
      }, 'https://mail.google.com');
    }
  }

  // Listen for hash changes (Gmail uses hash-based routing)
  window.addEventListener('hashchange', () => {
    console.log('[TrustEmail Injected] Hash changed:', window.location.hash);
    void handleUrlChange();
  });

  // Listen for popstate events (back/forward navigation)
  window.addEventListener('popstate', () => {
    console.log('[TrustEmail Injected] Popstate event');
    void handleUrlChange();
  });

  // Also observe DOM changes as a fallback (Gmail sometimes updates without hash change)
  let lastUrl = window.location.href;
  const urlObserver = new MutationObserver(() => {
    if (lastUrl !== window.location.href) {
      console.log('[TrustEmail Injected] URL changed via DOM mutation:', window.location.href);
      lastUrl = window.location.href;
      void handleUrlChange();
    }
  });

  urlObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Send initial thread ID check (including null for inbox)
  setTimeout(() => {
    console.log('[TrustEmail Injected] Initial URL check');
    void handleUrlChange();
  }, 1000);

  console.log('[TrustEmail Injected] Initialized and listening for messages');
})();
