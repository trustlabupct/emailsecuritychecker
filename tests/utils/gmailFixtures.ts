import fs from 'node:fs/promises';
import path from 'node:path';

import fixturesIndex from '../fixtures/gmail/index.json';

export type RiskExpectation = 'high' | 'medium' | 'low';

type GmailHeader = {
  name: string;
  value: string;
};

type GmailBody = {
  size: number;
  data?: string;
  attachmentId?: string;
};

type GmailPart = {
  partId?: string;
  mimeType: string;
  filename: string;
  headers?: GmailHeader[];
  body: GmailBody;
  parts?: GmailPart[];
};

type GmailPayload = {
  partId: string;
  mimeType: string;
  filename: string;
  headers: GmailHeader[];
  body: GmailBody;
  parts?: GmailPart[];
};

export interface GmailFixtureMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: GmailPayload;
  sizeEstimate: number;
  historyId: string;
}

export interface GmailFixtureMeta {
  id: string;
  filename: string;
  name: string;
  category: string;
  riskLevel: string;
  expectedRiskScore: RiskExpectation;
  techniques: string[];
  expectedIndicators: number;
  targetBrand: string;
}

interface GmailFixtureIndex {
  testSuite: {
    name: string;
    version: string;
    totalTestCases: number;
  };
  testCases: GmailFixtureMeta[];
}

const fixtureIndex = fixturesIndex as GmailFixtureIndex;
const fixtureDirectory = path.resolve(__dirname, '../fixtures/gmail');

const metaById = new Map<string, GmailFixtureMeta>(
  fixtureIndex.testCases.map((meta) => [meta.id, meta])
);

export const allFixtureMetadata = fixtureIndex.testCases;

export function getFixtureMeta(id: string): GmailFixtureMeta {
  const meta = metaById.get(id);
  if (!meta) {
    throw new Error(`Unknown fixture id: ${id}`);
  }
  return meta;
}

export async function loadFixture(id: string): Promise<GmailFixtureMessage> {
  const meta = getFixtureMeta(id);
  const filePath = path.join(fixtureDirectory, meta.filename);
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as GmailFixtureMessage;
}

export async function loadFixtureMessage(id: string): Promise<GmailFixtureMessage> {
  return loadFixture(id);
}

function decodeBase64Url(data?: string): string {
  if (!data) return '';
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, 'base64').toString('utf8');
}

function flattenParts(parts: GmailPart[] | undefined): GmailPart[] {
  if (!parts) return [];
  const output: GmailPart[] = [];

  for (const part of parts) {
    output.push(part);
    if (part.parts && part.parts.length > 0) {
      output.push(...flattenParts(part.parts));
    }
  }

  return output;
}

function findFirstBodyData(parts: GmailPart[] | undefined, mimeTypes: string[]): string | undefined {
  if (!parts) return undefined;
  for (const mime of mimeTypes) {
    const part = flattenParts(parts).find((candidate) => candidate.mimeType === mime && candidate.body?.data);
    if (part?.body?.data) {
      return part.body.data;
    }
  }
  return undefined;
}

function extractAttachments(parts: GmailPart[] | undefined) {
  const attachments: Array<{ filename: string; mimeType: string; attachmentId?: string }> = [];
  if (!parts) return attachments;

  for (const part of flattenParts(parts)) {
    const hasAttachment = Boolean(part.filename) && part.mimeType !== 'text/plain' && part.mimeType !== 'text/html';
    if (hasAttachment) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        attachmentId: part.body?.attachmentId,
      });
    }
  }

  return attachments;
}

function getHeaderValue(headers: GmailHeader[], name: string): string | undefined {
  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header?.value;
}

export interface AnalysisInput {
  headers: { name: string; value: string }[];
  body: string;
  senderEmail: string;
  messageId: string;
  threadId: string;
  gmailUiMessageId: string;
  attachments: Array<{ filename: string; mimeType: string; content?: string }>;
}

export function buildAnalysisInput(message: GmailFixtureMessage): AnalysisInput {
  const headers = message.payload.headers.map(({ name, value }) => ({ name, value }));
  const parts = message.payload.parts;
  const bodyData = findFirstBodyData(parts, ['text/html', 'text/plain']);
  const body = decodeBase64Url(bodyData) || '';

  const fromHeader = getHeaderValue(message.payload.headers, 'From') || '';
  const messageId = getHeaderValue(message.payload.headers, 'Message-ID') || message.id;

  const attachments = extractAttachments(parts).map((attachment) => ({
    filename: attachment.filename,
    mimeType: attachment.mimeType,
  }));

  return {
    headers,
    body,
    senderEmail: fromHeader,
    messageId,
    threadId: message.threadId,
    gmailUiMessageId: message.id,
    attachments,
  };
}

export async function loadAnalysisInput(id: string): Promise<AnalysisInput> {
  const message = await loadFixtureMessage(id);
  return buildAnalysisInput(message);
}

export async function loadAllFixtures(): Promise<GmailFixtureMessage[]> {
  return Promise.all(allFixtureMetadata.map((meta) => loadFixture(meta.id)));
}

export async function loadAllAnalysisInputs(): Promise<AnalysisInput[]> {
  return Promise.all(allFixtureMetadata.map((meta) => loadAnalysisInput(meta.id)));
}
