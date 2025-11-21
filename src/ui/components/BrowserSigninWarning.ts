// src/ui/components/BrowserSigninWarning.ts

export function createBrowserSigninWarning(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'trustemail-analysis-container';
  container.className = 'trustemail-banner-container';

  const banner = document.createElement('div');
  banner.className = 'trustemail-risk-banner trustemail-banner-warning';
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');

  banner.innerHTML = `
    <div class="trustemail-banner-content" style="justify-content: center; text-align: center;">
      <strong>${chrome.i18n.getMessage("authenticationFailed")}</strong>
      <span>${chrome.i18n.getMessage("browserSigninRequired")}</span>
    </div>
  `;

  container.appendChild(banner);
  return container;
}
