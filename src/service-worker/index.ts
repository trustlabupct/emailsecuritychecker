// src/service-worker/index.ts

import { getGmailAuthToken } from './auth';
import { getLatestMessageInThread } from './gmail-api';
import { parseEmail } from './email-parser';
import { analyzeEmailContent } from './email-analyzer';
import { generateReportText } from './report-generator';
import { addIgnoredThread, removeIgnoredThread, isThreadIgnored } from '../shared/user-settings';
import { addAnalysisToHistory } from '../shared/analysis-history';
import { EmailAnalysis, AnalysisHistoryEntry } from '../shared/types';
import { logger } from './utils/logger';

logger.info("Service worker loaded.");

// Store analysis results temporarily (e.g., by messageId) with a bounded cache
const MAX_CACHE_SIZE = 50;
const emailAnalysisCache: Map<string, EmailAnalysis> = new Map();

const redact = (value: string): string => {
  if (!value) return '';
  return value.length <= 3 ? '***' : `${value.slice(0, 3)}***`;
};

function safeBase64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const binaryString = atob(normalized);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

// Function to perform email analysis
async function performEmailAnalysis(threadId: string, senderTabId: number | undefined) {
  try {
    // Check if thread is ignored
    if (await isThreadIgnored(threadId)) {
      logger.info(`Thread ${threadId} is ignored. Skipping analysis.`);
      if (senderTabId) {
        chrome.tabs.sendMessage(senderTabId, { type: "ANALYSIS_SKIPPED", message: "Thread is ignored." });
      }
      return { status: "SKIPPED", message: "Thread is ignored." };
    }

    const accessToken = await getGmailAuthToken();

    // If authentication is successful, notify the content script to show the loading banner
    if (senderTabId) {
      chrome.tabs.sendMessage(senderTabId, { type: "ANALYSIS_IN_PROGRESS" });
    }

    const gmailMessage = await getLatestMessageInThread(accessToken, threadId);
    const rawEmail = gmailMessage.raw; // Assuming 'raw' format is requested
    const messageId = gmailMessage.id;

    // Decode base64url to string
    const decodedEmail = safeBase64UrlDecode(rawEmail);

    const parsedEmail = await parseEmail(decodedEmail);

    // Debug logging for headers structure
    logger.info("Parsed email structure:", {
      hasHeaders: !!parsedEmail.headers,
      headersType: typeof parsedEmail.headers,
      headersLength: parsedEmail.headers?.length,
      isArray: Array.isArray(parsedEmail.headers),
      firstHeader: parsedEmail.headers?.[0],
      from: parsedEmail.from
    });

    // Log the actual headers object to see its structure
    if (parsedEmail.headers) {
      logger.info("Headers object type:", Object.prototype.toString.call(parsedEmail.headers));
      logger.info("Headers object keys (if object):", Object.keys(parsedEmail.headers).slice(0, 20));

      // If it's an array, log first 5 headers
      if (Array.isArray(parsedEmail.headers)) {
        logger.info("First 5 headers (array):", parsedEmail.headers.slice(0, 5));
      }

      // If it's an object (key-value pairs), check for authentication-results
      if (!Array.isArray(parsedEmail.headers)) {
        logger.info("Headers as object - checking for Authentication-Results");
        const authHeader = parsedEmail.headers['authentication-results'] ||
          parsedEmail.headers['Authentication-Results'];
        logger.info("Authentication-Results found:", authHeader);
      }
    }

    // Extract sender email and name from parsed email headers
    // postal-mime returns 'from' as an object with 'address' and 'name' properties
    let senderEmail = '';
    let senderName = '';
    if (parsedEmail.from && parsedEmail.from.address) {
      senderEmail = parsedEmail.from.address;
      senderName = parsedEmail.from.name || parsedEmail.from.address;
    } else if (typeof parsedEmail.from === 'string') {
      senderEmail = parsedEmail.from;
      senderName = parsedEmail.from;
    } else if (Array.isArray(parsedEmail.from) && parsedEmail.from.length > 0) {
      senderEmail = parsedEmail.from[0].address || parsedEmail.from[0].email || '';
      senderName = parsedEmail.from[0].name || senderEmail;
    }

    // Extract subject
    const subject = parsedEmail.subject || '';

    logger.info("Extracted sender email:", redact(senderEmail));
    logger.info("Extracted sender name:", redact(senderName));
    logger.info("Extracted subject:", subject ? `${subject.slice(0, 20)}${subject.length > 20 ? '…' : ''}` : '');

    // Convert headers to array format if needed
    let headersArray: { name: string; value: string }[];

    if (!parsedEmail.headers) {
      logger.error("No headers found in parsed email");
      throw new Error("Parsed email does not contain headers");
    }

    if (Array.isArray(parsedEmail.headers)) {
      logger.info("Headers are already in array format");
      // postal-mime returns headers with 'key' property, not 'name'
      // Convert {key, value} to {name, value} format
      headersArray = parsedEmail.headers.map((h: any) => ({
        name: h.key || h.name,
        value: h.value
      }));
      logger.info("Converted headers array length:", headersArray.length);
      logger.info("Sample converted headers:", headersArray.slice(0, 5).map(h => h.name));
    } else if (typeof parsedEmail.headers === 'object') {
      logger.info("Converting headers object to array format");
      // postal-mime might return headers as an object {key: value}
      headersArray = Object.entries(parsedEmail.headers).map(([name, value]) => ({
        name,
        value: Array.isArray(value) ? value.join(', ') : String(value)
      }));
      logger.info("Converted headers array length:", headersArray.length);
      logger.info("Sample converted headers:", headersArray.slice(0, 5).map(h => h.name));
    } else {
      logger.error("Invalid headers structure:", typeof parsedEmail.headers);
      throw new Error("Parsed email headers are in unexpected format");
    }

    // Check for malformed headers
    const malformedHeaders = headersArray.filter((h: any) => !h || typeof h.name !== 'string' || typeof h.value !== 'string');
    if (malformedHeaders.length > 0) {
      logger.warn("Found malformed headers:", malformedHeaders);
    }

    const analysis: EmailAnalysis = await analyzeEmailContent(
      headersArray, // postal-mime provides headers in {name, value} format or as object
      parsedEmail.text || parsedEmail.html || '',
      senderEmail || 'unknown@unknown.com', // Provide default to prevent undefined errors
      messageId,
      threadId,
      threadId // Using threadId as gmailUiMessageId for now
    );

    // Cache the analysis with LRU eviction
    emailAnalysisCache.delete(messageId);
    emailAnalysisCache.set(messageId, analysis);
    if (emailAnalysisCache.size > MAX_CACHE_SIZE) {
      const oldestKey = emailAnalysisCache.keys().next().value as string | undefined;
      if (oldestKey) {
        emailAnalysisCache.delete(oldestKey);
      }
    }

    // Persist a light-weight history entry (fire-and-forget)
    const historyEntry: AnalysisHistoryEntry = {
      messageId: analysis.messageId,
      threadId: analysis.threadId,
      timestamp: Date.now(),
      sender: senderEmail,
      subject: subject,
      riskScore: analysis.riskScore,
      topRiskFactors: (analysis as any).riskFactorBreakdown
        ? (analysis as any).riskFactorBreakdown.slice(0, 3).map((f: any) => f.description || f.factor || '')
        : [],
    };
    addAnalysisToHistory(historyEntry).catch(err => {
      logger.error("Failed to save analysis history:", err);
    });

    if (senderTabId) {
      chrome.tabs.sendMessage(senderTabId, {
        type: "ANALYSIS_COMPLETE",
        analysis,
        senderName,
        subject
      });
    }
    return { status: "ACK" };
  } catch (error) {
    logger.error("Error during email analysis:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage === "BROWSER_SIGNIN_REQUIRED") {
      if (senderTabId) {
        chrome.tabs.sendMessage(senderTabId, { type: "AUTH_ERROR_BROWSER_SIGNIN" });
      }
      return { status: "ERROR", message: "Browser sign-in required." };
    } else {
      if (senderTabId) {
        chrome.tabs.sendMessage(senderTabId, { type: "ANALYSIS_ERROR", error: errorMessage });
      }
      return { status: "ERROR", message: errorMessage };
    }
  }
}


// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  logger.info("Service worker received message:", message);
  const senderTabId = sender.tab?.id;

  if (message.type === "CONTENT_SCRIPT_LOADED") {
    logger.info("Content script loaded message received.");
    if (senderTabId) {
      chrome.tabs.sendMessage(senderTabId, { type: "SERVICE_WORKER_READY" });
    }
    sendResponse({ status: "ACK" });
  } else if (message.type === "ANALYZE_EMAIL" && message.messageId) {
    const response = await performEmailAnalysis(message.messageId, senderTabId);
    sendResponse(response);
  } else if (message.type === "REANALYZE_EMAIL" && message.messageId) {
    logger.info("Reanalyzing email with ID:", message.messageId);
    const response = await performEmailAnalysis(message.messageId, senderTabId);
    sendResponse(response);
  } else if (message.type === "COPY_REPORT" && message.messageId) {
    logger.info("Generating report for message ID:", message.messageId);
    const analysis = emailAnalysisCache.get(message.messageId);
    if (analysis) {
      const reportText = generateReportText(analysis);
      if (senderTabId) {
        chrome.tabs.sendMessage(senderTabId, { type: "REPORT_COPIED", reportText });
      }
      sendResponse({ status: "ACK" });
    }
    else {
      logger.error("Analysis not found in cache for message ID:", message.messageId);
      if (senderTabId) {
        chrome.tabs.sendMessage(senderTabId, { type: "ANALYSIS_ERROR", error: "Analysis not found for report generation." });
      }
      sendResponse({ status: "ERROR", message: "Analysis not found." });
    }
  } else if (message.type === "IGNORE_THREAD" && message.threadId) {
    logger.info("Ignoring thread:", message.threadId);
    await addIgnoredThread(message.threadId);
    if (senderTabId) {
      chrome.tabs.sendMessage(senderTabId, { type: "THREAD_IGNORED", threadId: message.threadId });
    }
    sendResponse({ status: "ACK" });
  } else if (message.type === "UNIGNORE_THREAD" && message.threadId) {
    logger.info("Unignoring thread:", message.threadId);
    await removeIgnoredThread(message.threadId);
    if (senderTabId) {
      chrome.tabs.sendMessage(senderTabId, { type: "THREAD_UNIGNORED", threadId: message.threadId });
    }
    sendResponse({ status: "ACK" });
  }
});
