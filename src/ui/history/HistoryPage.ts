// src/ui/history/HistoryPage.ts
// T506: History/notification view for recent analyses

import { getAnalysisHistory, getHistoryStats, getRecentHighRiskAnalyses, clearAnalysisHistory } from '../../shared/analysis-history';
import { AnalysisHistoryEntry } from '../../shared/types';
import { getUserSettings, saveUserSettings } from '../../shared/user-settings';

export async function createHistoryPage(): Promise<HTMLElement> {
  const page = document.createElement('div');
  page.className = 'trustemail-history-page';
  page.style.cssText = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    padding: 0;
    background: #fafafa;
  `;

  // Get history data and settings
  const settings = await getUserSettings();
  const stats = await getHistoryStats();
  const recentHighRisk = await getRecentHighRiskAnalyses(5);
  const history = await getAnalysisHistory();
  const recentEntries = history.entries.slice(0, 1); // Only show the most recent analysis

  page.innerHTML = `
    <style>
      .history-section {
        margin-bottom: 16px;
      }
      .history-section h4 {
        margin: 0 0 10px 0;
        color: #424242;
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 0.3px;
      }
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        margin-bottom: 16px;
      }
      .stat-card {
        background: #ffffff;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 6px;
        padding: 12px;
        text-align: center;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }
      .stat-value {
        font-size: 22px;
        font-weight: 700;
        color: #424242;
        margin-bottom: 4px;
      }
      .stat-label {
        font-size: 10px;
        color: #757575;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 500;
      }
      .risk-summary {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
      }
      .risk-badge {
        flex: 1;
        padding: 10px 8px;
        border-radius: 4px;
        text-align: center;
        font-size: 11px;
        font-weight: 500;
      }
      .risk-badge-low {
        background: #f1f8f4;
        color: #1b5e20;
        border: 1px solid rgba(76, 175, 80, 0.3);
      }
      .risk-badge-medium {
        background: #fffbf0;
        color: #e65100;
        border: 1px solid rgba(255, 152, 0, 0.3);
      }
      .risk-badge-high {
        background: #ffebee;
        color: #c62828;
        border: 1px solid rgba(244, 67, 54, 0.3);
      }
      .risk-badge-count {
        font-size: 16px;
        font-weight: 700;
        display: block;
        margin-bottom: 2px;
      }
      .history-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .history-item {
        background: #ffffff;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 6px;
        padding: 10px 12px;
        margin-bottom: 8px;
        transition: all 0.15s ease;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }
      .history-item:hover {
        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        border-color: rgba(0, 0, 0, 0.12);
      }
      .history-item-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 6px;
      }
      .history-item-sender {
        font-weight: 600;
        font-size: 12px;
        color: #424242;
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .history-item-risk {
        padding: 3px 8px;
        border-radius: 10px;
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        white-space: nowrap;
        margin-left: 8px;
        letter-spacing: 0.3px;
      }
      .risk-low {
        background: #f1f8f4;
        color: #1b5e20;
      }
      .risk-medium {
        background: #fffbf0;
        color: #e65100;
      }
      .risk-high {
        background: #ffebee;
        color: #c62828;
      }
      .history-item-subject {
        font-size: 11px;
        color: #616161;
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .history-item-time {
        font-size: 10px;
        color: #9e9e9e;
      }
      .history-item-factors {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 6px;
      }
      .factor-chip {
        font-size: 9px;
        padding: 2px 6px;
        background: rgba(0, 0, 0, 0.04);
        color: #616161;
        border-radius: 3px;
        border: 1px solid rgba(0, 0, 0, 0.1);
        font-weight: 500;
      }
      .empty-state {
        text-align: center;
        padding: 32px 20px;
        color: #9e9e9e;
        background: #ffffff;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 6px;
      }
      .empty-state-icon {
        font-size: 40px;
        margin-bottom: 12px;
      }
      .history-controls {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }
      .history-btn {
        flex: 1;
        padding: 10px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        transition: all 0.15s ease;
        letter-spacing: 0.3px;
        text-transform: uppercase;
        border: none;
      }
      .toggle-history-btn {
        background: #e3f2fd;
        color: #1565c0;
        border: 1px solid rgba(21, 101, 192, 0.3);
      }
      .toggle-history-btn:hover {
        background: #bbdefb;
        border-color: rgba(21, 101, 192, 0.5);
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(21, 101, 192, 0.2);
      }
      .toggle-history-btn.disabled {
        background: #ffebee;
        color: #c62828;
        border: 1px solid rgba(198, 40, 40, 0.3);
      }
      .toggle-history-btn.disabled:hover {
        background: #ffcdd2;
        border-color: rgba(198, 40, 40, 0.5);
      }
      .clear-history-btn {
        background: #fff3e0;
        color: #e65100;
        border: 1px solid rgba(230, 81, 0, 0.3);
      }
      .clear-history-btn:hover {
        background: #ffe0b2;
        border-color: rgba(230, 81, 0, 0.5);
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(230, 81, 0, 0.2);
      }

      .alert-section {
        background: #ffebee;
        border: 1px solid rgba(198, 40, 40, 0.3);
        border-left: 3px solid #c62828;
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 16px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }
      .alert-section h4 {
        color: #c62828;
        font-size: 13px;
        margin: 0 0 8px 0;
        font-weight: 600;
        letter-spacing: 0.3px;
      }
      .alert-item {
        background: white;
        padding: 8px 10px;
        border-radius: 4px;
        margin-bottom: 6px;
        font-size: 11px;
        border: 1px solid rgba(0, 0, 0, 0.08);
      }
      .alert-item:last-child {
        margin-bottom: 0;
      }
      .no-alerts {
        color: #1b5e20;
        font-size: 11px;
        background: #f1f8f4;
        padding: 10px;
        border-radius: 4px;
        text-align: center;
        border: 1px solid rgba(76, 175, 80, 0.3);
        font-weight: 500;
      }
    </style>

    <div class="history-section">
      <h4>${chrome.i18n.getMessage("analysisSummaryHeading")}</h4>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${stats.last24Hours}</div>
          <div class="stat-label">${chrome.i18n.getMessage("last24HoursLabel")}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.last7Days}</div>
          <div class="stat-label">${chrome.i18n.getMessage("last7DaysLabel")}</div>
        </div>
      </div>
      <div class="risk-summary">
        <div class="risk-badge risk-badge-low">
          <span class="risk-badge-count">${stats.lowRisk}</span>
          ${chrome.i18n.getMessage("lowRiskLabel")}
        </div>
        <div class="risk-badge risk-badge-medium">
          <span class="risk-badge-count">${stats.mediumRisk}</span>
          ${chrome.i18n.getMessage("mediumRiskLabel")}
        </div>
        <div class="risk-badge risk-badge-high">
          <span class="risk-badge-count">${stats.highRisk}</span>
          ${chrome.i18n.getMessage("highRiskLabel")}
        </div>
      </div>
    </div>

    ${recentHighRisk.length > 0 ? `
    <div class="history-section alert-section">
      <h4>${chrome.i18n.getMessage("recentHighRiskHeading")}</h4>
      ${recentHighRisk.map(entry => `
        <div class="alert-item">
          <strong>${escapeHtml(entry.sender)}</strong><br>
          <span style="color: #666;">${escapeHtml(entry.subject || chrome.i18n.getMessage("noSubject"))}</span>
        </div>
      `).join('')}
    </div>
    ` : `
    <div class="history-section">
      <div class="no-alerts">${chrome.i18n.getMessage("noHighRiskDetected")}</div>
    </div>
    `}

    <div class="history-section">
      <h4>${chrome.i18n.getMessage("recentAnalysesHeading")}</h4>
      ${recentEntries.length > 0 ? `
        <ul class="history-list" id="historyList">
          ${recentEntries.map(entry => renderHistoryItem(entry)).join('')}
        </ul>
      ` : `
        <div class="empty-state">
          <div>${chrome.i18n.getMessage("noAnalysesYet")}</div>
          <div style="font-size: 12px; margin-top: 8px;">
            ${settings.enableHistoryTracking
      ? chrome.i18n.getMessage("openEmailPrompt")
      : 'History tracking is disabled. Enable it below to start tracking.'}
          </div>
        </div>
      `}

      <div class="history-controls">
        <button class="history-btn toggle-history-btn ${settings.enableHistoryTracking ? '' : 'disabled'}" id="toggleHistory">
          ${settings.enableHistoryTracking ? 'Disable Tracking' : 'Enable Tracking'}
        </button>
        <button class="history-btn clear-history-btn" id="clearHistory">Clear History</button>
      </div>
    </div>
  `;

  // Add event listener for toggle history button
  const toggleBtn = page.querySelector('#toggleHistory');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', async () => {
      const currentSettings = await getUserSettings();
      currentSettings.enableHistoryTracking = !currentSettings.enableHistoryTracking;
      await saveUserSettings(currentSettings);

      // Reload the page to reflect changes
      const newPage = await createHistoryPage();
      page.replaceWith(newPage);
    });
  }

  const clearBtn = page.querySelector('#clearHistory');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
        await clearAnalysisHistory();
        // Reload the page
        const newPage = await createHistoryPage();
        page.replaceWith(newPage);
      }
    });
  }

  return page;
}

function renderHistoryItem(entry: AnalysisHistoryEntry): string {
  const timeAgo = getTimeAgo(entry.timestamp);
  const riskClass = `risk-${entry.riskScore}`;
  const riskLabel = chrome.i18n.getMessage(`${entry.riskScore}RiskLabel`);

  return `
    <li class="history-item">
      <div class="history-item-header">
        <div class="history-item-sender">${escapeHtml(entry.sender)}</div>
        <div class="history-item-risk ${riskClass}">${riskLabel}</div>
      </div>
      <div class="history-item-subject">${escapeHtml(entry.subject || chrome.i18n.getMessage("noSubject"))}</div>
      <div class="history-item-time">${timeAgo}</div>
      ${entry.topRiskFactors && entry.topRiskFactors.length > 0 ? `
        <div class="history-item-factors">
          ${entry.topRiskFactors.slice(0, 3).map(factor =>
    `<span class="factor-chip">${escapeHtml(factor)}</span>`
  ).join('')}
        </div>
      ` : ''}
    </li>
  `;
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return days === 1
      ? chrome.i18n.getMessage("timeAgoDays", [days.toString()])
      : chrome.i18n.getMessage("timeAgoDaysPlural", [days.toString()]);
  }
  if (hours > 0) {
    return hours === 1
      ? chrome.i18n.getMessage("timeAgoHours", [hours.toString()])
      : chrome.i18n.getMessage("timeAgoHoursPlural", [hours.toString()]);
  }
  if (minutes > 0) {
    return minutes === 1
      ? chrome.i18n.getMessage("timeAgoMinutes", [minutes.toString()])
      : chrome.i18n.getMessage("timeAgoMinutesPlural", [minutes.toString()]);
  }
  return chrome.i18n.getMessage("timeAgoJustNow");
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
