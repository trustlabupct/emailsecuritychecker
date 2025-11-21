// src/service-worker/gmail-api.ts
import { logger } from './utils/logger';

const GMAIL_API_BASE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';

async function gmailApiFetch(accessToken: string, endpoint: string) {
  const response = await fetch(`${GMAIL_API_BASE_URL}/${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorBody = await response.json();
    logger.error("Error response from Gmail API:", JSON.stringify(errorBody, null, 2));
    throw new Error(`Google API request failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorBody)}`);
  }

  return response.json();
}

// Function to get the most recent message from inbox
async function getLatestInboxMessage(accessToken: string): Promise<any> {
  try {
    logger.info("Fetching latest message from inbox as fallback");

    // Get list of messages (just the most recent one)
    const listResponse = await gmailApiFetch(accessToken, 'messages?maxResults=1&labelIds=INBOX');

    if (!listResponse.messages || listResponse.messages.length === 0) {
      throw new Error("No messages found in inbox.");
    }

    const messageId = listResponse.messages[0].id;
    logger.info("Latest inbox message ID:", messageId);

    const message = await gmailApiFetch(accessToken, `messages/${messageId}?format=raw`);
    return message;

  } catch (error: any) {
    logger.error("Failed to fetch latest inbox message:", error);
    throw error;
  }
}

export async function getLatestMessageInThread(accessToken: string, threadId: string): Promise<any> {
  try {
    logger.info("Fetching thread with ID:", threadId);

    // First, try to fetch the thread directly
    try {
      const thread = await gmailApiFetch(accessToken, `threads/${threadId}`);

      if (!thread.messages || thread.messages.length === 0) {
        throw new Error("Thread contains no messages.");
      }

      // Get the most recent message from the thread
      const latestMessage = thread.messages[thread.messages.length - 1];
      const messageId = latestMessage.id;

      logger.info("Requesting Gmail message with ID:", messageId);
      const message = await gmailApiFetch(accessToken, `messages/${messageId}?format=raw`);

      return message;

    } catch (threadError: any) {
      // If the thread ID is invalid (400 error), fall back to getting the latest message
      if (threadError.message && threadError.message.includes('400')) {
        logger.warn("Invalid thread ID, falling back to latest inbox message");
        return await getLatestInboxMessage(accessToken);
      }
      throw threadError;
    }

  } catch (error: any) {
    logger.error("Failed to fetch Gmail message:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
}
