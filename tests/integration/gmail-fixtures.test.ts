import { beforeAll, describe, expect, it, vi } from 'vitest';

import { analyzeEmailEnhanced } from '../../src/service-worker/email-analyzer';
import { allFixtureMetadata, loadAnalysisInput } from '../utils/gmailFixtures';

beforeAll(() => {
  const chromeMock: any = {
    storage: {
      local: {
        get: vi.fn(async (key: string | string[]) => {
          if (typeof key === 'string') {
            return { [key]: undefined };
          }
          return {};
        }),
        set: vi.fn(async () => undefined),
      },
      sync: {
        set: vi.fn(async () => undefined),
      },
    },
  } as unknown;

  // @ts-expect-error - provide minimal chrome shim for tests
  globalThis.chrome = chromeMock;
});

const severityOrder: Record<string, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

describe('Gmail fixture analyses', () => {
  const phishingFixtures = allFixtureMetadata.filter((meta) => meta.expectedRiskScore !== 'low');
  const lowRiskFixtures = allFixtureMetadata.filter((meta) => meta.expectedRiskScore === 'low');

  it.each(phishingFixtures)('produces at least expected severity for %s', async (meta) => {
    const input = await loadAnalysisInput(meta.id);
    const analysis = await analyzeEmailEnhanced(
      input.headers,
      input.body,
      input.senderEmail,
      input.messageId,
      input.threadId,
      input.gmailUiMessageId,
      input.attachments
    );

    expect(severityOrder[analysis.riskScore]).toBeGreaterThanOrEqual(severityOrder[meta.expectedRiskScore]);
    expect(analysis.riskFactorBreakdown?.length).toBeGreaterThan(0);
  });

  it.each(lowRiskFixtures)('keeps %s as low risk', async (meta) => {
    const input = await loadAnalysisInput(meta.id);
    const analysis = await analyzeEmailEnhanced(
      input.headers,
      input.body,
      input.senderEmail,
      input.messageId,
      input.threadId,
      input.gmailUiMessageId,
      input.attachments
    );

    expect(analysis.riskScore).toBe('low');
    expect(analysis.riskFactorBreakdown?.length ?? 0).toBeLessThanOrEqual(1);
  });
});
