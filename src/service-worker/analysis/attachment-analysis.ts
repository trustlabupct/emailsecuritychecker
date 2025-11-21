// src/service-worker/analysis/attachment-analysis.ts
import { AttachmentAnalysis, CalendarInviteAnalysis } from '../../shared/types';
import { logger } from '../utils/logger';

/**
 * T307-T308: Attachment metadata analysis
 * Analyzes file attachments for suspicious characteristics
 */

// Dangerous file extensions
const DANGEROUS_EXTENSIONS = [
  'exe', 'com', 'bat', 'cmd', 'scr', 'pif', 'vbs', 'vbe', 'js', 'jse',
  'ws', 'wsf', 'wsh', 'msi', 'msp', 'jar', 'app', 'deb', 'rpm',
  'dmg', 'pkg', 'run', 'bin', 'sh', 'bash', 'ps1', 'psm1'
];

// Macro-enabled document extensions
const MACRO_ENABLED_EXTENSIONS = [
  'docm', 'dotm', 'xlsm', 'xltm', 'xlam', 'pptm', 'potm', 'ppam', 'ppsm', 'sldm'
];

// Compressed archive extensions
const ARCHIVE_EXTENSIONS = [
  'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz', 'tbz2', 'zipx', 'cab', 'iso'
];

// Calendar/meeting extensions
const CALENDAR_EXTENSIONS = ['ics', 'vcs', 'ical', 'ifb', 'icalendar'];

// Common but potentially suspicious extensions
const SUSPICIOUS_EXTENSIONS = [
  'hta', 'chm', 'cpl', 'msc', 'jar', 'lnk', 'url', 'inf', 'reg',
  'vb', 'vba', 'application', 'gadget', 'msh', 'msh1', 'msh2',
  'mshxml', 'msh1xml', 'msh2xml', 'scf', 'sct', 'shb', 'shs', 'apk'
];

// MIME types that can contain macros
const MACRO_MIME_TYPES = [
  'application/vnd.ms-excel.sheet.macroEnabled.12',
  'application/vnd.ms-excel.template.macroEnabled.12',
  'application/vnd.ms-word.document.macroEnabled.12',
  'application/vnd.ms-word.template.macroEnabled.12',
  'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
  'application/vnd.ms-powerpoint.template.macroEnabled.12',
  'application/vnd.ms-powerpoint.slideshow.macroEnabled.12'
];

// Password-protected or encrypted archive indicators
const ENCRYPTED_ARCHIVE_INDICATORS = [
  'encrypted',
  'password-protected',
  'aes-256',
  'protected'
];

/**
 * Extracts file extension from filename
 */
function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/**
 * Gets all extensions from a filename (for double extension detection)
 */
function getAllExtensions(filename: string): string[] {
  const parts = filename.toLowerCase().split('.');
  if (parts.length <= 1) return [];
  return parts.slice(1);
}

/**
 * Checks if filename has double extension (e.g., invoice.pdf.exe)
 */
function hasDoubleExtension(filename: string): boolean {
  const extensions = getAllExtensions(filename);

  // Need at least 2 extensions
  if (extensions.length < 2) return false;

  // Check if any non-final extension looks like a document type
  const documentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'txt'];
  const finalExtension = extensions[extensions.length - 1];

  for (let i = 0; i < extensions.length - 1; i++) {
    if (documentExtensions.includes(extensions[i])) {
      // If a document-like extension is followed by executable extension
      if (DANGEROUS_EXTENSIONS.includes(finalExtension) ||
        SUSPICIOUS_EXTENSIONS.includes(finalExtension)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks if file is macro-enabled
 */
function isMacroEnabled(filename: string, mimeType: string): boolean {
  const extension = getFileExtension(filename);

  // Check extension
  if (MACRO_ENABLED_EXTENSIONS.includes(extension)) {
    return true;
  }

  // Check MIME type
  if (MACRO_MIME_TYPES.includes(mimeType)) {
    return true;
  }

  // Check for Office documents with macros in older formats
  if (mimeType.includes('application/vnd.ms-') && mimeType.includes('macro')) {
    return true;
  }

  return false;
}

/**
 * Checks if file might be an encrypted archive
 */
function isEncryptedArchive(filename: string, mimeType: string): boolean {
  const extension = getFileExtension(filename);
  const lowerFilename = filename.toLowerCase();

  // Check if it's an archive
  if (!ARCHIVE_EXTENSIONS.includes(extension)) {
    return false;
  }

  // Check filename for encryption indicators
  for (const indicator of ENCRYPTED_ARCHIVE_INDICATORS) {
    if (lowerFilename.includes(indicator)) {
      return true;
    }
  }

  // Check MIME type for encryption indicators
  const lowerMimeType = mimeType.toLowerCase();
  if (lowerMimeType.includes('encrypted') || lowerMimeType.includes('password')) {
    return true;
  }

  return false;
}

/**
 * Checks if file is a calendar invite
 */
function isCalendarInvite(filename: string, mimeType: string): boolean {
  const extension = getFileExtension(filename);

  return CALENDAR_EXTENSIONS.includes(extension) ||
    mimeType.includes('text/calendar') ||
    mimeType.includes('application/ics');
}

/**
 * Parses ICS calendar file content
 */
function parseIcsContent(icsContent: string): CalendarInviteAnalysis {
  const analysis: CalendarInviteAnalysis = {
    organizerMatchesSender: true,
    containsUrls: false,
    urls: [],
    isSuspicious: false
  };

  try {
    // Extract organizer
    const organizerMatch = icsContent.match(/ORGANIZER(?:;[^:]*)?:(?:mailto:)?([^\r\n]+)/i);
    if (organizerMatch) {
      analysis.organizer = organizerMatch[1].trim();
    }

    // Extract URLs from various fields
    const urlRegex = /https?:\/\/[^\s\r\n]+/gi;
    const urls: string[] = [];

    // Check DESCRIPTION field
    const descMatch = icsContent.match(/DESCRIPTION:([^\r\n]+(?:\r?\n\s+[^\r\n]+)*)/i);
    if (descMatch) {
      const description = descMatch[1];
      const descUrls = description.match(urlRegex);
      if (descUrls) {
        urls.push(...descUrls);
      }
    }

    // Check LOCATION field
    const locMatch = icsContent.match(/LOCATION:([^\r\n]+)/i);
    if (locMatch) {
      const location = locMatch[1];
      const locUrls = location.match(urlRegex);
      if (locUrls) {
        urls.push(...locUrls);
      }
    }

    // Check URL field
    const urlFieldMatch = icsContent.match(/URL:([^\r\n]+)/i);
    if (urlFieldMatch) {
      urls.push(urlFieldMatch[1].trim());
    }

    // Check ATTACH field
    const attachMatches = icsContent.matchAll(/ATTACH(?:;[^:]*)?:([^\r\n]+)/gi);
    for (const match of attachMatches) {
      const attachValue = match[1].trim();
      if (attachValue.startsWith('http')) {
        urls.push(attachValue);
      }
    }

    analysis.urls = [...new Set(urls)];
    analysis.containsUrls = analysis.urls.length > 0;

    // Determine if suspicious
    if (analysis.containsUrls) {
      analysis.isSuspicious = true;
    }

    // Check for suspicious patterns in event
    const summary = icsContent.match(/SUMMARY:([^\r\n]+)/i);
    if (summary) {
      const summaryText = summary[1].toLowerCase();
      const suspiciousKeywords = ['urgent', 'verify', 'confirm', 'suspended', 'locked', 'payment'];
      if (suspiciousKeywords.some(keyword => summaryText.includes(keyword))) {
        analysis.isSuspicious = true;
      }
    }

  } catch (error) {
    logger.error('Error parsing ICS content:', error);
  }

  return analysis;
}

/**
 * Analyzes a single attachment
 */
export function analyzeAttachment(
  filename: string,
  mimeType: string,
  content?: string,
  senderEmail?: string
): AttachmentAnalysis {
  const suspicionReasons: string[] = [];
  const extension = getFileExtension(filename);

  // Check for double extension
  const hasDouble = hasDoubleExtension(filename);
  if (hasDouble) {
    suspicionReasons.push('Double file extension detected (possible disguise)');
  }

  // Check for macro-enabled documents
  const hasMacros = isMacroEnabled(filename, mimeType);
  if (hasMacros) {
    suspicionReasons.push('Macro-enabled document (can execute code)');
  }

  // Check for encrypted archives
  const isEncrypted = isEncryptedArchive(filename, mimeType);
  if (isEncrypted) {
    suspicionReasons.push('Encrypted or password-protected archive');
  }

  // Check for dangerous extensions
  if (DANGEROUS_EXTENSIONS.includes(extension)) {
    suspicionReasons.push(`Executable file type (.${extension})`);
  }

  // Check for suspicious extensions
  if (SUSPICIOUS_EXTENSIONS.includes(extension)) {
    suspicionReasons.push(`Suspicious file type (.${extension})`);
  }

  // Check for calendar invites
  const isCalendar = isCalendarInvite(filename, mimeType);
  let calendarAnalysis: CalendarInviteAnalysis | undefined = undefined;

  if (isCalendar && content) {
    calendarAnalysis = parseIcsContent(content);

    // Check if organizer matches sender
    if (senderEmail && calendarAnalysis.organizer) {
      const organizerEmail = calendarAnalysis.organizer.toLowerCase();
      const sender = senderEmail.toLowerCase();

      calendarAnalysis.organizerMatchesSender =
        organizerEmail.includes(sender) || sender.includes(organizerEmail);

      if (!calendarAnalysis.organizerMatchesSender) {
        suspicionReasons.push('Calendar invite organizer does not match sender');
        calendarAnalysis.isSuspicious = true;
      }
    }

    if (calendarAnalysis.containsUrls) {
      suspicionReasons.push('Calendar invite contains URLs');
    }
  }

  // Check for misleading filenames
  const misleadingPatterns = [
    /invoice.*\.(?!pdf|doc|docx|xls|xlsx)/i,
    /receipt.*\.(?!pdf|doc|docx)/i,
    /payment.*\.(?!pdf|doc|docx)/i,
    /statement.*\.(?!pdf|doc|docx|xls|xlsx)/i,
    /secure.*\.exe/i,
    /update.*\.exe/i
  ];

  for (const pattern of misleadingPatterns) {
    if (pattern.test(filename)) {
      suspicionReasons.push('Misleading filename pattern');
      break;
    }
  }

  // Check for extremely long filenames (> 100 chars)
  if (filename.length > 100) {
    suspicionReasons.push('Unusually long filename');
  }

  // Check for Unicode or special characters in filename
  if (/[^\x00-\x7F]/.test(filename)) {
    suspicionReasons.push('Contains non-ASCII characters in filename');
  }

  // Check for multiple dots in filename (obfuscation)
  const dotCount = (filename.match(/\./g) || []).length;
  if (dotCount > 2) {
    suspicionReasons.push('Multiple dots in filename (possible obfuscation)');
  }

  // Check for spaces at end of filename (Windows trick)
  if (filename.endsWith(' ') || filename.endsWith('.')) {
    suspicionReasons.push('Filename ends with space or dot (hiding extension)');
  }

  return {
    filename,
    mimeType,
    hasDoubleExtension: hasDouble,
    isMacroEnabled: hasMacros,
    isEncryptedArchive: isEncrypted,
    isCalendarInvite: isCalendar,
    suspicionReasons,
    calendarInviteAnalysis: calendarAnalysis
  };
}

/**
 * Analyzes multiple attachments
 */
export function analyzeAttachments(
  attachments: Array<{ filename: string; mimeType: string; content?: string }>,
  senderEmail?: string
): AttachmentAnalysis[] {
  return attachments.map(att =>
    analyzeAttachment(att.filename, att.mimeType, att.content, senderEmail)
  );
}

/**
 * Quick check if attachment list contains any suspicious files
 */
export function hasSuspiciousAttachments(analyses: AttachmentAnalysis[]): boolean {
  return analyses.some(analysis => analysis.suspicionReasons.length > 0);
}

/**
 * Gets risk score for attachments (0-100)
 */
export function getAttachmentRiskScore(analyses: AttachmentAnalysis[]): number {
  let score = 0;

  for (const analysis of analyses) {
    // Each suspicion reason adds points
    score += analysis.suspicionReasons.length * 10;

    // Dangerous file types add extra points
    if (analysis.suspicionReasons.some(reason => reason.includes('Executable'))) {
      score += 30;
    }

    // Macro-enabled documents add points
    if (analysis.isMacroEnabled) {
      score += 20;
    }

    // Double extensions are very suspicious
    if (analysis.hasDoubleExtension) {
      score += 25;
    }

    // Calendar invite mismatch is suspicious
    if (analysis.calendarInviteAnalysis?.isSuspicious) {
      score += 15;
    }
  }

  return Math.min(score, 100);
}
