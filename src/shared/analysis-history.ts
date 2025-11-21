// src/shared/analysis-history.ts
// T506: Analysis history for notifications/recent activity view

import { AnalysisHistoryEntry, AnalysisHistoryStorage } from './types';

// Increased to keep a fuller 7+ day view while still well within storage quotas.
const MAX_HISTORY_ENTRIES = 1000; // Limit to prevent unbounded growth

const DEFAULT_HISTORY: AnalysisHistoryStorage = {
  entries: [],
  maxEntries: MAX_HISTORY_ENTRIES,
};

/**
 * Get analysis history from storage
 */
export async function getAnalysisHistory(): Promise<AnalysisHistoryStorage> {
  const { analysisHistory } = await chrome.storage.local.get('analysisHistory');
  return analysisHistory ?? DEFAULT_HISTORY;
}

/**
 * Add a new analysis entry to history
 * Automatically prunes old entries to stay within maxEntries limit
 */
export async function addAnalysisToHistory(entry: AnalysisHistoryEntry): Promise<void> {
  const history = await getAnalysisHistory();

  // Check if this message already exists in history (avoid duplicates)
  const existingIndex = history.entries.findIndex(e => e.messageId === entry.messageId);
  if (existingIndex !== -1) {
    // Update existing entry
    history.entries[existingIndex] = entry;
  } else {
    // Add new entry at the beginning (most recent first)
    history.entries.unshift(entry);
  }

  // Prune old entries if we exceed the limit
  if (history.entries.length > history.maxEntries) {
    history.entries = history.entries.slice(0, history.maxEntries);
  }

  await chrome.storage.local.set({ analysisHistory: history });
}

/**
 * Get recent high-risk analyses
 */
export async function getRecentHighRiskAnalyses(limit: number = 10): Promise<AnalysisHistoryEntry[]> {
  const history = await getAnalysisHistory();
  return history.entries
    .filter(entry => entry.riskScore === 'high')
    .slice(0, limit);
}

/**
 * Get analyses from the last N days
 */
export async function getRecentAnalyses(daysBack: number = 7, limit: number = 20): Promise<AnalysisHistoryEntry[]> {
  const history = await getAnalysisHistory();
  const cutoffTime = Date.now() - (daysBack * 24 * 60 * 60 * 1000);

  return history.entries
    .filter(entry => entry.timestamp >= cutoffTime)
    .slice(0, limit);
}

/**
 * Get statistics from history
 */
export async function getHistoryStats(): Promise<{
  total: number;
  lowRisk: number;
  mediumRisk: number;
  highRisk: number;
  last7Days: number;
  last24Hours: number;
}> {
  const history = await getAnalysisHistory();
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

  return {
    total: history.entries.length,
    lowRisk: history.entries.filter(e => e.riskScore === 'low').length,
    mediumRisk: history.entries.filter(e => e.riskScore === 'medium').length,
    highRisk: history.entries.filter(e => e.riskScore === 'high').length,
    last7Days: history.entries.filter(e => e.timestamp >= sevenDaysAgo).length,
    last24Hours: history.entries.filter(e => e.timestamp >= oneDayAgo).length,
  };
}

/**
 * Clear all history
 */
export async function clearAnalysisHistory(): Promise<void> {
  await chrome.storage.local.set({ analysisHistory: DEFAULT_HISTORY });
}

/**
 * Remove a specific entry from history
 */
export async function removeAnalysisFromHistory(messageId: string): Promise<void> {
  const history = await getAnalysisHistory();
  history.entries = history.entries.filter(e => e.messageId !== messageId);
  await chrome.storage.local.set({ analysisHistory: history });
}

/**
 * Get analyses grouped by risk score
 */
export async function getAnalysesByRiskScore(): Promise<{
  low: AnalysisHistoryEntry[];
  medium: AnalysisHistoryEntry[];
  high: AnalysisHistoryEntry[];
}> {
  const history = await getAnalysisHistory();

  return {
    low: history.entries.filter(e => e.riskScore === 'low'),
    medium: history.entries.filter(e => e.riskScore === 'medium'),
    high: history.entries.filter(e => e.riskScore === 'high'),
  };
}
