// src/ui/components/RiskSummaryBanner.ts
import { EmailAnalysis } from '../../shared/types';
import { createDetailedAnalysisPanel } from './DetailedAnalysisPanel';

// Inject global styles for the banners
export function injectStyles() {
  if (document.getElementById('trustemail-banner-styles')) return;

  const style = document.createElement('style');
  style.id = 'trustemail-banner-styles';
  style.innerHTML = `
    @keyframes slideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes fadeOut {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .trustemail-banner-container {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      width: 100% !important;
      z-index: 2147483647 !important;
      animation: slideDown 0.3s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      pointer-events: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      transform: none !important;
      max-width: 100% !important;
      min-height: auto !important;
    }

    body.trustemail-banner-active {
      --trustemail-banner-height: 0px;
    }

    .trustemail-risk-banner {
      padding: 12px 20px !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      transition: all 0.2s ease;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
      font-size: 13px !important;
      line-height: 1.5 !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
      width: 100% !important;
      box-sizing: border-box !important;
      margin: 0 !important;
      position: relative !important;
      visibility: visible !important;
    }

    .trustemail-risk-banner.removing {
      animation: fadeOut 0.2s ease-out forwards;
    }

    .trustemail-loading {
      background: #fafafa;
      color: #616161;
      border-bottom: 2px solid #9e9e9e;
    }

    .trustemail-risk-low {
      background: #f1f8f4;
      color: #1b5e20;
      border-bottom: 2px solid #4caf50;
    }

    .trustemail-risk-medium {
      background: #fffbf0;
      color: #e65100;
      border-bottom: 2px solid #ff9800;
    }

    .trustemail-risk-high {
      background: #ffebee;
      color: #b71c1c;
      border-bottom: 2px solid #f44336;
    }

    .trustemail-banner-warning {
      background: #fff8e1;
      color: #5f370e;
      border-bottom: 2px solid #ffa000;
    }

    .trustemail-banner-error {
      background: #fdecea;
      color: #7f1d1d;
      border-bottom: 2px solid #f44336;
    }

    .trustemail-banner-info {
      background: #f1f8ff;
      color: #0b5394;
      border-bottom: 2px solid #2196f3;
    }

    .trustemail-banner-content {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
    }

    .trustemail-risk-badge {
      font-weight: 600;
      font-size: 11px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 3px;
      background: rgba(0, 0, 0, 0.06);
    }

    .trustemail-auth-results {
      display: flex;
      gap: 16px;
      font-size: 12px;
    }

    .trustemail-auth-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .trustemail-auth-label {
      font-weight: 500;
      color: #757575;
      font-size: 11px;
    }

    .trustemail-auth-value {
      font-weight: 600;
      font-size: 12px;
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

    .trustemail-expand-button {
      background: rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(0, 0, 0, 0.15);
      color: #424242;
      padding: 5px 14px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .trustemail-expand-button:hover {
      background: rgba(0, 0, 0, 0.08);
      border-color: rgba(0, 0, 0, 0.25);
    }

    .trustemail-expand-button:active {
      background: rgba(0, 0, 0, 0.12);
    }

    .trustemail-spinner {
      border: 2px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      border-top-color: #616161;
      width: 14px;
      height: 14px;
      animation: spin 0.8s linear infinite;
      display: inline-block;
      vertical-align: middle;
    }

    .trustemail-loading-text {
      font-weight: 500;
      color: #616161;
      font-size: 13px;
    }

    @media (max-width: 768px) {
      .trustemail-banner-content {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .trustemail-auth-results {
        flex-wrap: wrap;
        gap: 8px;
      }

      .trustemail-risk-banner {
        padding: 8px 16px;
      }
    }
  `;
  document.head.appendChild(style);
}

export function showLoadingBanner(): HTMLElement {
  injectStyles();

  const container = document.createElement('div');
  container.className = 'trustemail-banner-container';
  container.id = 'trustemail-analysis-container';

  const banner = document.createElement('div');
  banner.className = 'trustemail-risk-banner trustemail-loading';
  banner.id = 'trustemail-risk-banner';
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');

  banner.innerHTML = `
    <div class="trustemail-banner-content" style="justify-content: center;">
      <div class="trustemail-spinner"></div>
      <span class="trustemail-loading-text">${chrome.i18n.getMessage("analyzingEmailSecurity")}</span>
    </div>
  `;

  container.appendChild(banner);
  return container;
}

export function createRiskSummaryBanner(analysis: EmailAnalysis): HTMLElement {
  injectStyles();

  const container = document.createElement('div');
  container.className = 'trustemail-banner-container';
  container.id = 'trustemail-analysis-container';

  const banner = document.createElement('div');
  banner.className = `trustemail-risk-banner trustemail-risk-${analysis.riskScore}`;
  banner.id = 'trustemail-risk-banner';
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');

  // Format authentication results
  const spfStatus = analysis.authenticationResults.spf.result;
  const dkimStatus = analysis.authenticationResults.dkim.result;
  const dmarcStatus = analysis.authenticationResults.dmarc.result;

  // Get status class
  const getAuthClass = (result: string) => {
    if (result === 'pass') return 'trustemail-auth-pass';
    if (result === 'fail') return 'trustemail-auth-fail';
    return 'trustemail-auth-none';
  };

  banner.innerHTML = `
    <div class="trustemail-banner-content">
      <div style="display: flex; align-items: center; gap: 14px;">
        <div class="trustemail-risk-badge">
          ${chrome.i18n.getMessage("riskLabel")}: ${analysis.riskScore}
        </div>
        <div class="trustemail-auth-results">
          <div class="trustemail-auth-item">
            <span class="trustemail-auth-label">${chrome.i18n.getMessage("spfLabel")}</span>
            <span class="trustemail-auth-value ${getAuthClass(spfStatus)}">${spfStatus}</span>
          </div>
          <div class="trustemail-auth-item">
            <span class="trustemail-auth-label">${chrome.i18n.getMessage("dkimLabel")}</span>
            <span class="trustemail-auth-value ${getAuthClass(dkimStatus)}">${dkimStatus}</span>
          </div>
          <div class="trustemail-auth-item">
            <span class="trustemail-auth-label">${chrome.i18n.getMessage("dmarcLabel")}</span>
            <span class="trustemail-auth-value ${getAuthClass(dmarcStatus)}">${dmarcStatus}</span>
          </div>
        </div>
      </div>
    </div>

    <button
      id="trustemail-expand-button"
      class="trustemail-expand-button"
      aria-expanded="false"
      aria-controls="trustemail-detailed-panel"
    >
      ${chrome.i18n.getMessage("detailsButton")}
    </button>
  `;

  const detailedPanel = createDetailedAnalysisPanel(analysis);
  detailedPanel.id = 'trustemail-detailed-panel';
  detailedPanel.style.display = 'none';

  const expandButton = banner.querySelector('#trustemail-expand-button') as HTMLButtonElement;
  expandButton?.addEventListener('click', () => {
    const isExpanded = detailedPanel.style.display !== 'none';

    if (isExpanded) {
      // Collapsing
      expandButton.textContent = chrome.i18n.getMessage("detailsButton");
      expandButton.setAttribute('aria-expanded', 'false');
      detailedPanel.style.display = 'none';

      // Trigger layout adjustment immediately and after a frame for accuracy
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('trustemail-banner-resize'));
        requestAnimationFrame(() => {
          window.dispatchEvent(new Event('trustemail-banner-resize'));
        });
      });
    } else {
      // Expanding
      expandButton.textContent = chrome.i18n.getMessage("hideButton");
      expandButton.setAttribute('aria-expanded', 'true');
      detailedPanel.style.display = 'block';

      // Trigger layout adjustment immediately and after rendering completes
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('trustemail-banner-resize'));
        // Double-check after panel is fully rendered
        requestAnimationFrame(() => {
          window.dispatchEvent(new Event('trustemail-banner-resize'));
        });
      });
    }
  });

  container.appendChild(banner);
  container.appendChild(detailedPanel);

  return container;
}
