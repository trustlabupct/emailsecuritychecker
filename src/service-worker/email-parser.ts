// src/service-worker/email-parser.ts
import PostalMime from 'postal-mime';
import { logger } from './utils/logger';

export async function parseEmail(rawEmail: string): Promise<any> {
  const parser = new PostalMime();
  try {
    const parsed = await parser.parse(rawEmail);
    return parsed;
  } catch (e) {
    logger.error("Error parsing email with postal-mime:", e);
    throw e; // Re-throw to be caught by higher-level error handling
  }
}