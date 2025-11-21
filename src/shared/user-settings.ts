// src/shared/user-settings.ts
import { UserSettings } from './types';

const DEFAULT_SETTINGS: UserSettings = {
  enableOnlineLookups: false,
  ignoredThreads: [],
  allowedDomains: [],
  blockedDomains: [],
  customKeywords: [],
  // Phase 5: Custom keyword lists
  customUrgencyKeywords: [],
  customScamKeywords: [],
  // Phase 5: Custom risk rules
  customRiskRules: [],
  // Phase 3 opt-in features (disabled by default for performance)
  enableQrCodeDecoding: false,
  enableOcrAnalysis: false,
  enableNlpAnalysis: true, // NLP is lightweight, enabled by default
  enableDeepLinkAnalysis: true, // Deep-link detection is lightweight
  // History tracking
  enableHistoryTracking: true, // Enabled by default
};

const inMemorySettings: UserSettings = { ...DEFAULT_SETTINGS };

function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && !!chrome?.storage?.local;
}

async function readStoredSettings(): Promise<UserSettings | undefined> {
  if (hasChromeStorage()) {
    const { userSettings } = await chrome.storage.local.get('userSettings');
    return userSettings as UserSettings | undefined;
  }
  return inMemorySettings;
}

async function writeStoredSettings(settings: UserSettings): Promise<void> {
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ userSettings: settings });
  } else {
    Object.assign(inMemorySettings, settings);
  }
}

export async function getUserSettings(): Promise<UserSettings> {
  const stored = await readStoredSettings();
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  await writeStoredSettings(settings);
}

export async function addIgnoredThread(threadId: string): Promise<void> {
  const settings = await getUserSettings();
  if (!settings.ignoredThreads.includes(threadId)) {
    settings.ignoredThreads.push(threadId);
    await saveUserSettings(settings);
  }
}

export async function removeIgnoredThread(threadId: string): Promise<void> {
  const settings = await getUserSettings();
  settings.ignoredThreads = settings.ignoredThreads.filter(id => id !== threadId);
  await saveUserSettings(settings);
}

export async function isThreadIgnored(threadId: string): Promise<boolean> {
  const settings = await getUserSettings();
  return settings.ignoredThreads.includes(threadId);
}

// T501: Custom keyword management
export async function addCustomKeyword(keyword: string, type: 'urgency' | 'scam'): Promise<void> {
  const settings = await getUserSettings();
  const list = type === 'urgency' ? settings.customUrgencyKeywords : settings.customScamKeywords;
  if (!list.includes(keyword.toLowerCase())) {
    list.push(keyword.toLowerCase());
    await saveUserSettings(settings);
  }
}

export async function removeCustomKeyword(keyword: string, type: 'urgency' | 'scam'): Promise<void> {
  const settings = await getUserSettings();
  if (type === 'urgency') {
    settings.customUrgencyKeywords = settings.customUrgencyKeywords.filter(k => k !== keyword);
  } else {
    settings.customScamKeywords = settings.customScamKeywords.filter(k => k !== keyword);
  }
  await saveUserSettings(settings);
}

// T502: Domain list management
export async function addAllowedDomain(domain: string): Promise<void> {
  const settings = await getUserSettings();
  const normalizedDomain = domain.toLowerCase().trim();
  if (!settings.allowedDomains.includes(normalizedDomain)) {
    settings.allowedDomains.push(normalizedDomain);
    // Remove from blocked list if present
    settings.blockedDomains = settings.blockedDomains.filter(d => d !== normalizedDomain);
    await saveUserSettings(settings);
  }
}

export async function removeAllowedDomain(domain: string): Promise<void> {
  const settings = await getUserSettings();
  settings.allowedDomains = settings.allowedDomains.filter(d => d !== domain.toLowerCase());
  await saveUserSettings(settings);
}

export async function addBlockedDomain(domain: string): Promise<void> {
  const settings = await getUserSettings();
  const normalizedDomain = domain.toLowerCase().trim();
  if (!settings.blockedDomains.includes(normalizedDomain)) {
    settings.blockedDomains.push(normalizedDomain);
    // Remove from allowed list if present
    settings.allowedDomains = settings.allowedDomains.filter(d => d !== normalizedDomain);
    await saveUserSettings(settings);
  }
}

export async function removeBlockedDomain(domain: string): Promise<void> {
  const settings = await getUserSettings();
  settings.blockedDomains = settings.blockedDomains.filter(d => d !== domain.toLowerCase());
  await saveUserSettings(settings);
}
