// tests/integration/messaging.test.ts
import { describe, it, expect, vi } from 'vitest';

// Mock Chrome APIs for testing in Node.js environment
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
    },
    getURL: vi.fn((resource: string) => resource),
  },
  tabs: {
    sendMessage: vi.fn(),
  },
  identity: {
    getAuthToken: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn(async () => ({})),
      set: vi.fn(async () => undefined),
    },
  },
};

// Replace global chrome with mockChrome for testing purposes
// This is a simplified approach; a proper setup would involve a test environment
// that correctly mocks Chrome APIs for service workers and content scripts.
(global as any).chrome = mockChrome;


describe('Integration: Message Passing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('content script should send CONTENT_SCRIPT_LOADED message on load', async () => {
    // Simulate content script loading
    await import('../../src/content/index');
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'CONTENT_SCRIPT_LOADED' });
  });

  it('service worker should respond to CONTENT_SCRIPT_LOADED with SERVICE_WORKER_READY', async () => {
    // Simulate service worker loading
    await import('../../src/service-worker/index');

    // Simulate content script sending message
    const onMessageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
    const mockSendResponse = vi.fn();
    await onMessageListener({ type: 'CONTENT_SCRIPT_LOADED' }, { tab: { id: 123 } }, mockSendResponse);

    expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(123, { type: 'SERVICE_WORKER_READY' });
    expect(mockSendResponse).toHaveBeenCalledWith({ status: 'ACK' });
  });

  // More tests would go here for ANALYZE_EMAIL, COPY_REPORT, IGNORE_THREAD, etc.
  // These would involve mocking the Gmail API responses and verifying the analysis flow.
});
