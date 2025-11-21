// src/ui/settings/SettingsPage.ts
import { getUserSettings, saveUserSettings, addCustomKeyword, removeCustomKeyword, addAllowedDomain, removeAllowedDomain, addBlockedDomain, removeBlockedDomain } from '../../shared/user-settings';
import { UserSettings } from '../../shared/types';

export async function createSettingsPage(): Promise<HTMLElement> {
  const settings = await getUserSettings();

  const page = document.createElement('div');
  page.className = 'trustemail-settings-page';
  page.style.cssText = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    padding: 0;
    background: #fafafa;
  `;

  page.innerHTML = `
    <style>
      .trustemail-settings-page {
        background: #fafafa;
      }
      .settings-section {
        margin-bottom: 12px;
        padding: 16px;
        background: #ffffff;
        border-radius: 6px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
      }
      .settings-section::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
        background: linear-gradient(180deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.05) 100%);
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      .settings-section:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        border-color: rgba(0, 0, 0, 0.12);
      }
      .settings-section:hover::before {
        opacity: 1;
      }
      .settings-section:last-child {
        margin-bottom: 0;
      }
      .settings-section h4 {
        margin: 0 0 12px 0;
        padding-bottom: 10px;
        color: #424242;
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 0.3px;
        display: flex;
        align-items: center;
        gap: 8px;
        border-bottom: 2px solid rgba(0, 0, 0, 0.06);
      }
      .tooltip {
        display: inline-block;
        width: 16px;
        height: 16px;
        background: rgba(0, 0, 0, 0.06);
        color: #424242;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: 50%;
        text-align: center;
        font-size: 12px;
        line-height: 14px;
        cursor: help;
        position: relative;
        transition: all 0.15s ease;
      }
      .tooltip:hover {
        background: rgba(0, 0, 0, 0.08);
        border-color: rgba(0, 0, 0, 0.25);
      }
      .tooltip:hover::after {
        content: attr(data-tooltip);
        position: absolute;
        left: 50%;
        bottom: 125%;
        transform: translateX(-50%);
        background: #424242;
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 11px;
        white-space: nowrap;
        z-index: 1000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        font-weight: 500;
      }
      .checkbox-item {
        margin-bottom: 8px;
        padding: 8px 10px;
        border-radius: 4px;
        transition: all 0.15s ease;
        border: 1px solid transparent;
      }
      .checkbox-item:hover {
        background: rgba(0, 0, 0, 0.03);
        border-color: rgba(0, 0, 0, 0.08);
      }
      .checkbox-item input[type="checkbox"] {
        margin-right: 8px;
        cursor: pointer;
      }
      .checkbox-item label {
        cursor: pointer;
        font-size: 13px;
        color: #424242;
        font-weight: 500;
      }
      .checkbox-description {
        font-size: 11px;
        color: #757575;
        margin: 4px 0 0 28px;
        line-height: 1.5;
      }
      .checkbox-description .performance-indicator {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 10px;
        font-weight: 700;
        margin-right: 6px;
        letter-spacing: 0.3px;
        text-transform: uppercase;
      }
      .checkbox-description .performance-indicator.fast {
        background: #f1f8f4;
        color: #2e7d32;
      }
      .checkbox-description .performance-indicator.moderate {
        background: #fffbf0;
        color: #e65100;
      }
      .checkbox-description .performance-indicator.slow {
        background: #ffebee;
        color: #c62828;
      }
      .input-group {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }
      .input-group input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: 4px;
        font-size: 13px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        transition: all 0.15s ease;
        background: #fafafa;
      }
      .input-group input:focus {
        outline: none;
        border-color: rgba(0, 0, 0, 0.3);
        background: #ffffff;
        box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.02);
      }
      .input-group input::placeholder {
        color: #9e9e9e;
      }
      .input-group button {
        padding: 8px 16px;
        background: rgba(0, 0, 0, 0.06);
        color: #424242;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        transition: all 0.15s ease;
        white-space: nowrap;
        letter-spacing: 0.3px;
      }
      .input-group button:hover {
        background: rgba(0, 0, 0, 0.1);
        border-color: rgba(0, 0, 0, 0.25);
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .input-group button:active {
        background: rgba(0, 0, 0, 0.12);
        transform: translateY(0);
        box-shadow: none;
      }
      .chip-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
        min-height: 28px;
        padding: 6px;
        background: rgba(0, 0, 0, 0.02);
        border-radius: 4px;
        border: 1px dashed rgba(0, 0, 0, 0.1);
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: #ffffff;
        color: #424242;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: 16px;
        font-size: 11px;
        font-weight: 500;
        transition: all 0.15s ease;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }
      .chip:hover {
        background: #fafafa;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        transform: translateY(-1px);
      }
      .chip button {
        background: none;
        border: none;
        color: #757575;
        cursor: pointer;
        font-size: 14px;
        padding: 0;
        line-height: 1;
        transition: color 0.15s ease;
      }
      .chip button:hover {
        color: #c62828;
      }
      .empty-state {
        color: #9e9e9e;
        font-size: 12px;
        font-style: italic;
        padding: 8px 0;
      }
      .warning-box {
        background: #fffbf0;
        border: 1px solid rgba(255, 152, 0, 0.3);
        border-left: 3px solid #ff9800;
        border-radius: 4px;
        padding: 10px 12px;
        margin-bottom: 12px;
        font-size: 11px;
        color: #e65100;
        line-height: 1.5;
      }
      .save-button {
        width: 100%;
        margin-top: 16px;
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.06) 0%, rgba(0, 0, 0, 0.04) 100%);
        color: #424242;
        border: 1px solid rgba(0, 0, 0, 0.15);
        padding: 12px 20px;
        cursor: pointer;
        border-radius: 6px;
        font-weight: 600;
        font-size: 13px;
        transition: all 0.2s ease;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
      }
      .save-button:hover {
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.08) 100%);
        border-color: rgba(0, 0, 0, 0.25);
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
      }
      .save-button:active {
        background: rgba(0, 0, 0, 0.12);
        transform: translateY(0);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
      }
      .save-button.saved {
        background: linear-gradient(135deg, #f1f8f4 0%, #e8f5e9 100%);
        color: #1b5e20;
        border-color: #4caf50;
        box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);
      }


      .domain-section-title {
        font-weight: 600;
        margin-bottom: 8px;
        margin-top: 16px;
        font-size: 13px;
      }
      .allowed-domain {
        color: #2e7d32;
      }
      .blocked-domain {
        color: #c62828;
      }
    </style>



    <!-- Content Analysis Features -->
    <div class="settings-section">
      <h4>
        ${chrome.i18n.getMessage("contentAnalysisFeaturesHeading")}
        <span class="tooltip" data-tooltip="${chrome.i18n.getMessage("contentAnalysisFeaturesHeading")}">?</span>
      </h4>

      <div class="checkbox-item">
        <input type="checkbox" id="enableNlpAnalysis" ${settings.enableNlpAnalysis ? 'checked' : ''}>
        <label for="enableNlpAnalysis">${chrome.i18n.getMessage("nlpAnalysisLabel")}</label>
        <p class="checkbox-description"><span class="performance-indicator fast">${chrome.i18n.getMessage("performanceIndicatorFast")}</span> ${chrome.i18n.getMessage("nlpAnalysisDescription")}</p>
      </div>

      <div class="checkbox-item">
        <input type="checkbox" id="enableDeepLinkAnalysis" ${settings.enableDeepLinkAnalysis ? 'checked' : ''}>
        <label for="enableDeepLinkAnalysis">${chrome.i18n.getMessage("deepLinkAnalysisLabel")}</label>
        <p class="checkbox-description"><span class="performance-indicator fast">${chrome.i18n.getMessage("performanceIndicatorFast")}</span> ${chrome.i18n.getMessage("deepLinkAnalysisDescription")}</p>
      </div>

      <div class="warning-box">
        ${chrome.i18n.getMessage("performanceWarning")}
      </div>

      <div class="checkbox-item">
        <input type="checkbox" id="enableQrCodeDecoding" ${settings.enableQrCodeDecoding ? 'checked' : ''}>
        <label for="enableQrCodeDecoding">${chrome.i18n.getMessage("qrCodeDecodingLabel")}</label>
        <p class="checkbox-description"><span class="performance-indicator moderate">${chrome.i18n.getMessage("performanceIndicatorModerate")}</span> ${chrome.i18n.getMessage("qrCodeDecodingDescription")}</p>
      </div>

      <div class="checkbox-item">
        <input type="checkbox" id="enableOcrAnalysis" ${settings.enableOcrAnalysis ? 'checked' : ''}>
        <label for="enableOcrAnalysis">${chrome.i18n.getMessage("ocrAnalysisLabel")}</label>
        <p class="checkbox-description"><span class="performance-indicator slow">${chrome.i18n.getMessage("performanceIndicatorSlow")}</span> ${chrome.i18n.getMessage("ocrAnalysisDescription")}</p>
      </div>
    </div>

    <!-- Custom Keywords Management -->
    <div class="settings-section">
      <h4>
        ${chrome.i18n.getMessage("customKeywordsHeading")}
        <span class="tooltip" data-tooltip="${chrome.i18n.getMessage("customKeywordsHeading")}">?</span>
      </h4>

      <label style="font-size: 13px; font-weight: 500; display: block; margin-bottom: 8px;">${chrome.i18n.getMessage("urgencyKeywordsLabel")}</label>
      <p class="checkbox-description" style="margin-left: 0; margin-bottom: 8px;">${chrome.i18n.getMessage("urgencyKeywordsDescription")}</p>
      <div class="input-group">
        <input type="text" id="urgencyKeywordInput" placeholder="${chrome.i18n.getMessage("addKeywordPlaceholder")}">
        <button id="addUrgencyKeyword">${chrome.i18n.getMessage("addButton")}</button>
      </div>
      <div class="chip-list" id="urgencyKeywordList"></div>

      <label style="font-size: 13px; font-weight: 500; display: block; margin: 16px 0 8px 0;">${chrome.i18n.getMessage("scamKeywordsLabel")}</label>
      <p class="checkbox-description" style="margin-left: 0; margin-bottom: 8px;">${chrome.i18n.getMessage("scamKeywordsDescription")}</p>
      <div class="input-group">
        <input type="text" id="scamKeywordInput" placeholder="${chrome.i18n.getMessage("addKeywordPlaceholder")}">
        <button id="addScamKeyword">${chrome.i18n.getMessage("addButton")}</button>
      </div>
      <div class="chip-list" id="scamKeywordList"></div>
    </div>

    <!-- Domain Management -->
    <div class="settings-section">
      <h4>
        ${chrome.i18n.getMessage("domainRulesHeading")}
        <span class="tooltip" data-tooltip="${chrome.i18n.getMessage("domainRulesHeading")}">?</span>
      </h4>

      <label class="domain-section-title allowed-domain">${chrome.i18n.getMessage("allowedDomainsLabel")}</label>
      <p class="checkbox-description" style="margin-left: 0; margin-bottom: 8px;">${chrome.i18n.getMessage("allowedDomainsDescription")}</p>
      <div class="input-group">
        <input type="text" id="allowedDomainInput" placeholder="${chrome.i18n.getMessage("domainPlaceholder")}">
        <button id="addAllowedDomain">${chrome.i18n.getMessage("allowButton")}</button>
      </div>
      <div class="chip-list" id="allowedDomainList"></div>

      <label class="domain-section-title blocked-domain" style="display: block; margin-top: 16px;">${chrome.i18n.getMessage("blockedDomainsLabel")}</label>
      <p class="checkbox-description" style="margin-left: 0; margin-bottom: 8px;">${chrome.i18n.getMessage("blockedDomainsDescription")}</p>
      <div class="input-group">
        <input type="text" id="blockedDomainInput" placeholder="${chrome.i18n.getMessage("domainPlaceholder")}">
        <button id="addBlockedDomain" style="background: #ffebee; color: #c62828; border-color: rgba(198, 40, 40, 0.3);">${chrome.i18n.getMessage("blockButton")}</button>
</invoke>
      </div>
      <div class="chip-list" id="blockedDomainList"></div>
    </div>

    <button class="save-button" id="saveSettings">${chrome.i18n.getMessage("saveSettingsButton")}</button>
  `;

  // Helper function to render chip lists
  function renderChipList(containerId: string, items: string[], onRemove: (item: string) => void) {
    const container = page.querySelector(`#${containerId}`) as HTMLElement;
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `<div class="empty-state">${chrome.i18n.getMessage("noItemsAdded")}</div>`;
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="chip">
        <span>${escapeHtml(item)}</span>
        <button data-item="${escapeHtml(item)}" aria-label="${chrome.i18n.getMessage("removeItemAriaLabel", [item])}">×</button>
      </div>
    `).join('');

    // Add event listeners to remove buttons
    container.querySelectorAll('.chip button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = (e.target as HTMLElement).getAttribute('data-item');
        if (item) onRemove(item);
      });
    });
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Render functions for each list
  const renderUrgencyList = async () => {
    const currentSettings = await getUserSettings();
    renderChipList('urgencyKeywordList', currentSettings.customUrgencyKeywords, async (keyword) => {
      await removeCustomKeyword(keyword, 'urgency');
      await renderUrgencyList();
    });
  };

  const renderScamList = async () => {
    const currentSettings = await getUserSettings();
    renderChipList('scamKeywordList', currentSettings.customScamKeywords, async (keyword) => {
      await removeCustomKeyword(keyword, 'scam');
      await renderScamList();
    });
  };

  const renderAllowedList = async () => {
    const currentSettings = await getUserSettings();
    renderChipList('allowedDomainList', currentSettings.allowedDomains, async (domain) => {
      await removeAllowedDomain(domain);
      await renderAllowedList();
      await renderBlockedList(); // Refresh blocked list in case domain was moved
    });
  };

  const renderBlockedList = async () => {
    const currentSettings = await getUserSettings();
    renderChipList('blockedDomainList', currentSettings.blockedDomains, async (domain) => {
      await removeBlockedDomain(domain);
      await renderBlockedList();
      await renderAllowedList(); // Refresh allowed list in case domain was moved
    });
  };

  // Initial render of chip lists
  await renderUrgencyList();
  await renderScamList();
  await renderAllowedList();
  await renderBlockedList();

  // Add urgency keyword
  const urgencyInput = page.querySelector('#urgencyKeywordInput') as HTMLInputElement;
  const addUrgencyBtn = page.querySelector('#addUrgencyKeyword') as HTMLButtonElement;

  const addUrgencyKeyword = async () => {
    const keyword = urgencyInput.value.trim();
    if (keyword) {
      await addCustomKeyword(keyword, 'urgency');
      urgencyInput.value = '';
      await renderUrgencyList();
    }
  };

  addUrgencyBtn.addEventListener('click', addUrgencyKeyword);
  urgencyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addUrgencyKeyword();
  });

  // Add scam keyword
  const scamInput = page.querySelector('#scamKeywordInput') as HTMLInputElement;
  const addScamBtn = page.querySelector('#addScamKeyword') as HTMLButtonElement;

  const addScamKeywordFunc = async () => {
    const keyword = scamInput.value.trim();
    if (keyword) {
      await addCustomKeyword(keyword, 'scam');
      scamInput.value = '';
      await renderScamList();
    }
  };

  addScamBtn.addEventListener('click', addScamKeywordFunc);
  scamInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addScamKeywordFunc();
  });

  // Add allowed domain
  const allowedInput = page.querySelector('#allowedDomainInput') as HTMLInputElement;
  const addAllowedBtn = page.querySelector('#addAllowedDomain') as HTMLButtonElement;

  const addAllowedDomainFunc = async () => {
    const domain = allowedInput.value.trim();
    if (domain) {
      await addAllowedDomain(domain);
      allowedInput.value = '';
      await renderAllowedList();
      await renderBlockedList();
    }
  };

  addAllowedBtn.addEventListener('click', addAllowedDomainFunc);
  allowedInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addAllowedDomainFunc();
  });

  // Add blocked domain
  const blockedInput = page.querySelector('#blockedDomainInput') as HTMLInputElement;
  const addBlockedBtn = page.querySelector('#addBlockedDomain') as HTMLButtonElement;

  const addBlockedDomainFunc = async () => {
    const domain = blockedInput.value.trim();
    if (domain) {
      await addBlockedDomain(domain);
      blockedInput.value = '';
      await renderBlockedList();
      await renderAllowedList();
    }
  };

  addBlockedBtn.addEventListener('click', addBlockedDomainFunc);
  blockedInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addBlockedDomainFunc();
  });

  // Get all checkboxes
  const enableNlpAnalysisCheckbox = page.querySelector('#enableNlpAnalysis') as HTMLInputElement;
  const enableDeepLinkAnalysisCheckbox = page.querySelector('#enableDeepLinkAnalysis') as HTMLInputElement;
  const enableQrCodeDecodingCheckbox = page.querySelector('#enableQrCodeDecoding') as HTMLInputElement;
  const enableOcrAnalysisCheckbox = page.querySelector('#enableOcrAnalysis') as HTMLInputElement;
  const saveSettingsButton = page.querySelector('#saveSettings') as HTMLButtonElement;

  // Save settings
  saveSettingsButton.addEventListener('click', async () => {
    const currentSettings = await getUserSettings();
    const updatedSettings: UserSettings = {
      ...currentSettings,
      enableNlpAnalysis: enableNlpAnalysisCheckbox.checked,
      enableDeepLinkAnalysis: enableDeepLinkAnalysisCheckbox.checked,
      enableQrCodeDecoding: enableQrCodeDecodingCheckbox.checked,
      enableOcrAnalysis: enableOcrAnalysisCheckbox.checked,
    };
    await saveUserSettings(updatedSettings);

    // Visual feedback
    saveSettingsButton.textContent = chrome.i18n.getMessage("savedSuccessfully");
    saveSettingsButton.className = 'save-button saved';
    setTimeout(() => {
      saveSettingsButton.textContent = chrome.i18n.getMessage("saveSettingsButton");
      saveSettingsButton.className = 'save-button';
    }, 2000);
  });

  return page;
}
