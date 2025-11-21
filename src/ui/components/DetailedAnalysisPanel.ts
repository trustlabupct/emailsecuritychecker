// src/ui/components/DetailedAnalysisPanel.ts
import { EmailAnalysis } from '../../shared/types';

export function createDetailedAnalysisPanel(analysis: EmailAnalysis): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'trustemail-detailed-panel';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', 'trustemail-detailed-panel-heading');

  // Inject styles for the detailed panel
  if (!document.getElementById('trustemail-detailed-panel-styles')) {
    const style = document.createElement('style');
    style.id = 'trustemail-detailed-panel-styles';
    style.innerHTML = `
      .trustemail-detailed-panel {
        background: #ffffff !important;
        border-top: 1px solid #dee2e6 !important;
        padding: 16px 20px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif !important;
        color: #212529 !important;
        max-height: 500px !important;
        overflow-y: auto !important;
        font-size: 13px !important;
        line-height: 1.5 !important;
        width: 100% !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        position: relative !important;
        transition: opacity 0.2s ease, max-height 0.3s ease !important;
      }

      .trustemail-panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e9ecef;
      }

      .trustemail-panel-title {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #212529;
      }

      .trustemail-panel-actions {
        display: flex;
        gap: 8px;
      }

      .trustemail-action-button {
        padding: 5px 12px;
        border: 1px solid #ced4da;
        border-radius: 3px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        background: #f8f9fa;
        color: #495057;
      }

      .trustemail-action-button:hover {
        background: #e9ecef;
        border-color: #adb5bd;
      }

      .trustemail-action-button:active {
        background: #dee2e6;
      }

      .trustemail-btn-primary {
        background: #007bff;
        color: white;
        border-color: #007bff;
      }

      .trustemail-btn-primary:hover {
        background: #0056b3;
        border-color: #0056b3;
      }

      .trustemail-btn-danger {
        background: #dc3545;
        color: white;
        border-color: #dc3545;
      }

      .trustemail-btn-danger:hover {
        background: #c82333;
        border-color: #c82333;
      }

      .trustemail-metadata {
        background: #f8f9fa;
        border-left: 3px solid #6c757d;
        padding: 10px 12px;
        margin-bottom: 16px;
        font-size: 12px;
        line-height: 1.6;
        color: #495057;
      }

      .trustemail-metadata strong {
        color: #212529;
      }

      .trustemail-metadata code {
        background: #e9ecef;
        padding: 2px 6px;
        border-radius: 2px;
        font-family: 'Courier New', monospace;
        font-size: 11px;
      }

      .trustemail-section {
        margin-bottom: 16px;
      }

      .trustemail-section-title {
        font-size: 13px;
        font-weight: 600;
        color: #212529;
        margin: 0 0 10px 0;
        padding-bottom: 6px;
        border-bottom: 1px solid #e9ecef;
      }

      .trustemail-auth-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 10px;
        margin-bottom: 12px;
      }

      .trustemail-auth-card {
        background: #ffffff;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        padding: 12px;
        transition: border-color 0.2s ease;
      }

      .trustemail-auth-card:hover {
        border-color: #c0c0c0;
      }

      .trustemail-auth-card-title {
        font-weight: 600;
        font-size: 10px;
        color: #757575;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
      }

      .trustemail-auth-card-value {
        font-size: 14px;
        font-weight: 600;
      }

      .trustemail-auth-card-meta {
        font-size: 11px;
        color: #757575;
        margin-top: 6px;
        font-weight: 400;
      }

      .trustemail-auth-pass {
        color: #2e7d32;
      }

      .trustemail-auth-fail {
        color: #c62828;
      }

      .trustemail-auth-none {
        color: #9e9e9e;
      }

      .trustemail-status-indicator {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 3px;
        font-size: 11px;
        font-weight: 500;
        background: #f5f5f5;
        color: #616161;
      }

      .trustemail-status-indicator::before {
        content: '✓';
        font-size: 12px;
      }

      .trustemail-info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #f5f5f5;
        font-size: 12px;
      }

      .trustemail-info-row:last-child {
        border-bottom: none;
      }

      .trustemail-info-label {
        color: #757575;
        font-weight: 500;
      }

      .trustemail-info-value {
        color: #424242;
        font-weight: 400;
      }

      .trustemail-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .trustemail-list-item {
        background: #f8f9fa;
        border-left: 3px solid #dee2e6;
        padding: 8px 10px;
        margin-bottom: 6px;
        font-size: 12px;
      }

      .trustemail-code-block {
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        color: #212529;
        padding: 10px;
        border-radius: 3px;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-all;
        max-height: 200px;
        overflow-y: auto;
        line-height: 1.4;
      }



      .trustemail-link {
        color: #007bff;
        text-decoration: none;
        word-break: break-all;
      }

      .trustemail-link:hover {
        text-decoration: underline;
      }

      .trustemail-badge {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 2px;
        font-size: 11px;
        font-weight: 500;
        background: #e9ecef;
        color: #495057;
      }

      .trustemail-badge-success {
        background: #d4edda;
        color: #155724;
      }

      .trustemail-badge-danger {
        background: #f8d7da;
        color: #721c24;
      }

      .trustemail-badge-warning {
        background: #fff3cd;
        color: #856404;
      }

      .trustemail-subsection {
        margin-bottom: 12px;
      }

      .trustemail-subsection-title {
        font-size: 12px;
        font-weight: 600;
        color: #495057;
        margin-bottom: 6px;
      }

      @media (max-width: 768px) {
        .trustemail-panel-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
        }

        .trustemail-auth-grid {
          grid-template-columns: 1fr;
        }

        .trustemail-detailed-panel {
          padding: 12px 16px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const getAuthStatusClass = (result: string) => {
    if (result === 'pass') return 'trustemail-auth-pass';
    if (result === 'fail') return 'trustemail-auth-fail';
    return 'trustemail-auth-none';
  };

  panel.innerHTML = `
    <div class="trustemail-panel-header">
      <h3 id="trustemail-detailed-panel-heading" class="trustemail-panel-title">
        ${chrome.i18n.getMessage("detailedPanelHeading")}
      </h3>
      <div class="trustemail-panel-actions">
        <button id="trustemail-copy-report-button" class="trustemail-action-button trustemail-btn-primary" aria-label="${chrome.i18n.getMessage("copyReportAriaLabel")}">
          ${chrome.i18n.getMessage("copyReportButton")}
        </button>
        <button id="trustemail-reanalyze-button" class="trustemail-action-button" aria-label="${chrome.i18n.getMessage("reanalyzeAriaLabel")}">
          ${chrome.i18n.getMessage("reanalyzeButton")}
        </button>
        <button id="trustemail-ignore-thread-button" class="trustemail-action-button trustemail-btn-danger" aria-label="${chrome.i18n.getMessage("ignoreThreadAriaLabel")}">
          ${chrome.i18n.getMessage("ignoreButton")}
        </button>
      </div>
    </div>

    <div class="trustemail-metadata">
      <strong>${chrome.i18n.getMessage("threadIdLabel")}</strong> <code>${analysis.threadId}</code><br />
      <strong>${chrome.i18n.getMessage("messageIdLabel")}</strong> <code>${analysis.messageId}</code>
    </div>

    <div class="trustemail-section">
      <h4 class="trustemail-section-title">${chrome.i18n.getMessage("authenticationResultsHeading")}</h4>
      <div class="trustemail-auth-grid">
        <div class="trustemail-auth-card">
          <div class="trustemail-auth-card-title">${chrome.i18n.getMessage("spfLabel")}</div>
          <div class="trustemail-auth-card-value ${getAuthStatusClass(analysis.authenticationResults.spf.result)}">
            ${analysis.authenticationResults.spf.result}
          </div>
          ${analysis.authenticationResults.spf.domain ?
      `<div class="trustemail-auth-card-meta">${chrome.i18n.getMessage("domainLabel")}: ${analysis.authenticationResults.spf.domain}</div>` :
      ''}
        </div>
        <div class="trustemail-auth-card">
          <div class="trustemail-auth-card-title">${chrome.i18n.getMessage("dkimLabel")}</div>
          <div class="trustemail-auth-card-value ${getAuthStatusClass(analysis.authenticationResults.dkim.result)}">
            ${analysis.authenticationResults.dkim.result}
          </div>
          ${analysis.authenticationResults.dkim.domain ?
      `<div class="trustemail-auth-card-meta">${chrome.i18n.getMessage("domainLabel")}: ${analysis.authenticationResults.dkim.domain}</div>` :
      ''}
        </div>
        <div class="trustemail-auth-card">
          <div class="trustemail-auth-card-title">${chrome.i18n.getMessage("dmarcLabel")}</div>
          <div class="trustemail-auth-card-value ${getAuthStatusClass(analysis.authenticationResults.dmarc.result)}">
            ${analysis.authenticationResults.dmarc.result}
          </div>
        </div>
        <div class="trustemail-auth-card">
          <div class="trustemail-auth-card-title">${chrome.i18n.getMessage("arcLabel")}</div>
          <div class="trustemail-auth-card-value ${getAuthStatusClass(analysis.authenticationResults.arc.result)}">
            ${analysis.authenticationResults.arc.result}
          </div>
          ${analysis.authenticationResults.arc.sealCount > 0 ?
      `<div class="trustemail-auth-card-meta">${chrome.i18n.getMessage("sealsLabel")}: ${analysis.authenticationResults.arc.sealCount}</div>` :
      ''}
        </div>
      </div>
    </div>

    ${analysis.headerAnalysis.headerAnomalies.length > 0 ? `
      <div class="trustemail-section">
        <h4 class="trustemail-section-title">${chrome.i18n.getMessage("headerAnomaliesHeading")}</h4>
        <ul class="trustemail-list">${analysis.headerAnalysis.headerAnomalies.map(a =>
        `<li class="trustemail-list-item">${a}</li>`
      ).join('')}</ul>
      </div>
    ` : ''}

    ${analysis.headerAnalysis.receivedChain.length > 0 ? `
      <div class="trustemail-section">
        <h4 class="trustemail-section-title">${chrome.i18n.getMessage("receivedChainHeading")}</h4>
        <div class="trustemail-code-block">${analysis.headerAnalysis.receivedChain.join('\n')}</div>
      </div>
    ` : ''}

    <div class="trustemail-section">
      <h4 class="trustemail-section-title">${chrome.i18n.getMessage("domainAnalysisHeading")}</h4>
      <div style="background: #ffffff; border: 1px solid #e0e0e0; border-radius: 4px; padding: 12px;">
        <div class="trustemail-info-row">
          <span class="trustemail-info-label">${chrome.i18n.getMessage("domainLabel")}</span>
          <span class="trustemail-info-value" style="font-family: monospace;">${analysis.domainAnalysis.domain || 'N/A'}</span>
        </div>
        ${analysis.domainAnalysis.isPunycode ? `
          <div class="trustemail-info-row">
            <span class="trustemail-info-label">${chrome.i18n.getMessage("punycodeDetected")}</span>
            <span class="trustemail-badge trustemail-badge-warning">${chrome.i18n.getMessage("yes")}</span>
          </div>
        ` : ''}
        ${analysis.domainAnalysis.reputationSignals.length > 0 ? `
          <div class="trustemail-info-row" style="flex-direction: column; align-items: flex-start; gap: 8px;">
            <span class="trustemail-info-label">${chrome.i18n.getMessage("reputationIssues")}</span>
            <ul class="trustemail-list" style="width: 100%;">
              ${analysis.domainAnalysis.reputationSignals.map(s =>
        `<li class="trustemail-list-item">${s}</li>`
      ).join('')}
            </ul>
          </div>
        ` : `
          <div class="trustemail-info-row">
            <span class="trustemail-status-indicator">${chrome.i18n.getMessage("noReputationIssues")}</span>
          </div>
        `}
      </div>
    </div>

    ${(analysis.contentAnalysis.detectedIbans.length > 0 ||
      analysis.contentAnalysis.suspiciousLinks.length > 0 ||
      analysis.contentAnalysis.urgencyIndicators.length > 0) ? `
      <div class="trustemail-section">
        <h4 class="trustemail-section-title">${chrome.i18n.getMessage("contentAnalysisHeading")}</h4>

        ${analysis.contentAnalysis.detectedIbans.length > 0 ? `
          <div class="trustemail-subsection">
            <div class="trustemail-subsection-title">${chrome.i18n.getMessage("detectedIbansHeading")}</div>
            <ul class="trustemail-list">
              ${analysis.contentAnalysis.detectedIbans.map(iban =>
        `<li class="trustemail-list-item"><code>${iban}</code></li>`
      ).join('')}
            </ul>
          </div>
        ` : ''}

        ${analysis.contentAnalysis.suspiciousLinks.length > 0 ? `
          <div class="trustemail-subsection">
            <div class="trustemail-subsection-title">${chrome.i18n.getMessage("suspiciousLinksHeading")}</div>
            <ul class="trustemail-list">
              ${analysis.contentAnalysis.suspiciousLinks.map(link => `
                <li class="trustemail-list-item">
                  <a href="${link.url}" class="trustemail-link" target="_blank" rel="noopener noreferrer">${link.url}</a>
                  ${link.isShortened ? `<span class="trustemail-badge trustemail-badge-warning" style="margin-left: 6px;">${chrome.i18n.getMessage("shortenedLabel")}</span>` : ''}
                  ${link.finalUrl ? `<div style="font-size: 11px; color: #757575; margin-top: 4px;">${chrome.i18n.getMessage("finalUrlLabel")}: ${link.finalUrl}</div>` : ''}
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        ${analysis.contentAnalysis.urgencyIndicators.length > 0 ? `
          <div class="trustemail-subsection">
            <div class="trustemail-subsection-title">${chrome.i18n.getMessage("urgencyIndicatorsHeading")}</div>
            <ul class="trustemail-list">
              ${analysis.contentAnalysis.urgencyIndicators.map(ind =>
        `<li class="trustemail-list-item"><span class="trustemail-badge trustemail-badge-danger">${ind}</span></li>`
      ).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    ` : ''}
  `;

  // Add event listeners
  panel.querySelector('#trustemail-copy-report-button')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: "COPY_REPORT", messageId: analysis.messageId });
  });

  panel.querySelector('#trustemail-ignore-thread-button')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: "IGNORE_THREAD", threadId: analysis.threadId });
  });

  panel.querySelector('#trustemail-reanalyze-button')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: "REANALYZE_EMAIL", messageId: analysis.gmailUiMessageId });
  });

  return panel;
}
