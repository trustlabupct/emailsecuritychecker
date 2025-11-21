// src/service-worker/auth.ts

import { logger } from './utils/logger';

export async function getGmailAuthToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        logger.error("Error getting auth token:", JSON.stringify(chrome.runtime.lastError));
        if (chrome.runtime.lastError.message?.includes("The user turned off browser signin")) {
          reject(new Error("BROWSER_SIGNIN_REQUIRED"));
        } else {
          reject(new Error("Failed to get Gmail auth token."));
        }
      } else if (token) {
        logger.info("Gmail Auth Token obtained.");
        resolve(token as string);
      } else {
        reject(new Error("Token is empty or undefined."));
      }
    });
  });
}