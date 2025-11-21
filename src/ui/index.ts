// src/ui/index.ts
import { createSettingsPage } from './settings/SettingsPage';
import { createHistoryPage } from './history/HistoryPage';

// Main app container
const appContainer = document.getElementById('app');

if (!appContainer) {
  throw new Error('App container not found');
}

// Set base styles for the popup
appContainer.style.cssText = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  width: 400px;
  background: #fafafa;
  box-sizing: border-box;
  overflow: hidden;
`;


// Create home page
function createHomePage(): HTMLElement {
  const home = document.createElement('div');
  home.className = 'trustemail-home';
  home.style.cssText = `
    padding: 20px;
  `;

  home.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="margin: 0 0 6px 0; color: #1a73e8; font-size: 20px; font-weight: 600; letter-spacing: 0.3px;">
        ${chrome.i18n.getMessage("extensionName")}
      </h2>
      <p style="margin: 0; color: #757575; font-size: 12px; line-height: 1.5;">
        ${chrome.i18n.getMessage("extensionDescription")}
      </p>
    </div>

    <div style="background: #f1f8f4; border: 1px solid rgba(76, 175, 80, 0.3); border-left: 3px solid #4caf50; border-radius: 4px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
      <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #1b5e20; letter-spacing: 0.3px;">
        ${chrome.i18n.getMessage("protectionStatusHeading")}
      </h3>
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 26px; color: #2e7d32; line-height: 1;">&#x2713;</span>
        <div>
          <div style="font-weight: 600; color: #1b5e20; font-size: 13px;">${chrome.i18n.getMessage("activeStatus")}</div>
          <div style="font-size: 11px; color: #2e7d32; margin-top: 2px;">${chrome.i18n.getMessage("monitoringInbox")}</div>
        </div>
      </div>
    </div>

    <div style="background: #ffffff; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 4px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
      <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #424242; letter-spacing: 0.3px;">
        ${chrome.i18n.getMessage("activeFeaturesHeading")}
      </h3>
      <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #616161; line-height: 2;">
        <li>${chrome.i18n.getMessage("featureAuthenticationAnalysis")}</li>
        <li>${chrome.i18n.getMessage("featureDomainReputation")}</li>
        <li>${chrome.i18n.getMessage("featurePaymentDetection")}</li>
        <li>${chrome.i18n.getMessage("featureSuspiciousLinks")}</li>
        <li>${chrome.i18n.getMessage("featureToneAnalysis")}</li>
        <li>${chrome.i18n.getMessage("featureAttachmentRisk")}</li>
      </ul>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
      <button id="openHistory" style="
        padding: 14px 12px;
        background: rgba(0, 0, 0, 0.04);
        color: #424242;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: 4px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      ">
        ${chrome.i18n.getMessage("historyButton")}
      </button>
      <button id="openSettings" style="
        padding: 14px 12px;
        background: rgba(0, 0, 0, 0.04);
        color: #424242;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: 4px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      ">
        ${chrome.i18n.getMessage("settingsHeading")}
      </button>
    </div>

    <div style="text-align: center; font-size: 11px; color: #9e9e9e; padding: 12px 0; border-top: 1px solid rgba(0, 0, 0, 0.08);">
      v0.3.0
    </div>
  `;

  // Add event listeners
  const openHistoryBtn = home.querySelector('#openHistory') as HTMLButtonElement;
  const openSettingsBtn = home.querySelector('#openSettings') as HTMLButtonElement;

  openHistoryBtn.addEventListener('click', () => {
    showHistory();
  });

  openHistoryBtn.addEventListener('mouseenter', (e) => {
    (e.target as HTMLButtonElement).style.background = 'rgba(0, 0, 0, 0.08)';
    (e.target as HTMLButtonElement).style.borderColor = 'rgba(0, 0, 0, 0.25)';
  });

  openHistoryBtn.addEventListener('mouseleave', (e) => {
    (e.target as HTMLButtonElement).style.background = 'rgba(0, 0, 0, 0.04)';
    (e.target as HTMLButtonElement).style.borderColor = 'rgba(0, 0, 0, 0.15)';
  });

  openSettingsBtn.addEventListener('click', () => {
    showSettings();
  });

  openSettingsBtn.addEventListener('mouseenter', (e) => {
    (e.target as HTMLButtonElement).style.background = 'rgba(0, 0, 0, 0.08)';
    (e.target as HTMLButtonElement).style.borderColor = 'rgba(0, 0, 0, 0.25)';
  });

  openSettingsBtn.addEventListener('mouseleave', (e) => {
    (e.target as HTMLButtonElement).style.background = 'rgba(0, 0, 0, 0.04)';
    (e.target as HTMLButtonElement).style.borderColor = 'rgba(0, 0, 0, 0.15)';
  });

  return home;
}

// Create settings page wrapper with back button
async function createSettingsPageWrapper(): Promise<HTMLElement> {
  const wrapper = document.createElement('div');
  wrapper.className = 'trustemail-settings-wrapper';
  wrapper.style.cssText = `
    padding: 12px;
    max-height: 600px;
    overflow-y: auto;
    box-sizing: border-box;
  `;

  // Header with back button
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    padding: 10px 12px;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  `;

  header.innerHTML = `
    <button id="backButton" style="
      background: rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(0, 0, 0, 0.15);
      font-size: 16px;
      cursor: pointer;
      padding: 6px 12px;
      margin-right: 10px;
      border-radius: 4px;
      transition: all 0.15s ease;
      color: #424242;
      font-weight: 600;
    ">
      &larr;
    </button>
    <h3 style="margin: 0; color: #1a73e8; font-size: 16px; font-weight: 600; letter-spacing: 0.3px;">${chrome.i18n.getMessage("settingsHeading")}</h3>
  `;

  wrapper.appendChild(header);

  // Add settings page content
  const settingsPage = await createSettingsPage();
  wrapper.appendChild(settingsPage);

  // Back button functionality
  const backButton = header.querySelector('#backButton') as HTMLButtonElement;
  backButton.addEventListener('click', () => {
    showHome();
  });

  backButton.addEventListener('mouseenter', (e) => {
    (e.target as HTMLButtonElement).style.background = 'rgba(0, 0, 0, 0.08)';
    (e.target as HTMLButtonElement).style.borderColor = 'rgba(0, 0, 0, 0.25)';
  });

  backButton.addEventListener('mouseleave', (e) => {
    (e.target as HTMLButtonElement).style.background = 'rgba(0, 0, 0, 0.04)';
    (e.target as HTMLButtonElement).style.borderColor = 'rgba(0, 0, 0, 0.15)';
  });

  return wrapper;
}

// Create history page wrapper with back button
async function createHistoryPageWrapper(): Promise<HTMLElement> {
  const wrapper = document.createElement('div');
  wrapper.className = 'trustemail-history-wrapper';
  wrapper.style.cssText = `
    padding: 12px;
    max-height: 600px;
    overflow-y: auto;
    box-sizing: border-box;
  `;

  // Header with back button
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    padding: 10px 12px;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  `;

  header.innerHTML = `
    <button id="backButton" style="
      background: rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(0, 0, 0, 0.15);
      font-size: 16px;
      cursor: pointer;
      padding: 6px 12px;
      margin-right: 10px;
      border-radius: 4px;
      transition: all 0.15s ease;
      color: #424242;
      font-weight: 600;
    ">
      &larr;
    </button>
    <h3 style="margin: 0; color: #1a73e8; font-size: 16px; font-weight: 600; letter-spacing: 0.3px;">${chrome.i18n.getMessage("historyHeading")}</h3>
  `;

  wrapper.appendChild(header);

  // Add history page content
  const historyPage = await createHistoryPage();
  wrapper.appendChild(historyPage);

  // Back button functionality
  const backButton = header.querySelector('#backButton') as HTMLButtonElement;
  backButton.addEventListener('click', () => {
    showHome();
  });

  backButton.addEventListener('mouseenter', (e) => {
    (e.target as HTMLButtonElement).style.background = 'rgba(0, 0, 0, 0.08)';
    (e.target as HTMLButtonElement).style.borderColor = 'rgba(0, 0, 0, 0.25)';
  });

  backButton.addEventListener('mouseleave', (e) => {
    (e.target as HTMLButtonElement).style.background = 'rgba(0, 0, 0, 0.04)';
    (e.target as HTMLButtonElement).style.borderColor = 'rgba(0, 0, 0, 0.15)';
  });

  return wrapper;
}

// Navigation functions
function showHome() {
  if (!appContainer) return;
  appContainer.innerHTML = '';
  const homePage = createHomePage();
  appContainer.appendChild(homePage);
}

async function showSettings() {
  if (!appContainer) return;
  appContainer.innerHTML = '';
  const settingsWrapper = await createSettingsPageWrapper();
  appContainer.appendChild(settingsWrapper);
}

async function showHistory() {
  if (!appContainer) return;
  appContainer.innerHTML = '';
  const historyWrapper = await createHistoryPageWrapper();
  appContainer.appendChild(historyWrapper);
}

// Initialize the app
async function init() {
  try {
    // Show home page by default
    showHome();
  } catch (error) {
    console.error('Error initializing TrustEmail popup:', error);
    if (appContainer) {
      appContainer.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #d32f2f;">
          <h3>${chrome.i18n.getMessage("errorHeading")}</h3>
          <p>${chrome.i18n.getMessage("initializationError")}</p>
          <p style="font-size: 12px; color: #666;">${error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      `;
    }
  }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
