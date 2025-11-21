// src/shared/types.ts
export interface UserSettings {
  enableOnlineLookups: boolean;
  ignoredThreads: string[];
  allowedDomains: string[];
  blockedDomains: string[];
  customKeywords: string[];
  // Phase 5: Custom urgency/scam keywords
  customUrgencyKeywords: string[];
  customScamKeywords: string[];
  // Phase 5: Custom risk overrides
  customRiskRules: CustomRiskRule[];
  // Phase 3 opt-in features
  enableQrCodeDecoding: boolean;
  enableOcrAnalysis: boolean;
  enableNlpAnalysis: boolean;
  enableDeepLinkAnalysis: boolean;
  // History tracking
  enableHistoryTracking: boolean;
}

// T502: User-defined risk override rules
export interface CustomRiskRule {
  id: string;
  type: 'domain' | 'sender' | 'keyword';
  pattern: string;
  action: 'flag' | 'allow' | 'override-risk';
  riskLevel?: 'low' | 'medium' | 'high';
  enabled: boolean;
  createdAt: string;
  description?: string;
}

export interface EmailAnalysis {
  messageId: string;
  threadId: string;
  gmailUiMessageId: string;
  riskScore: "low" | "medium" | "high";
  authenticationResults: AuthenticationResults;
  headerAnalysis: HeaderAnalysis;
  domainAnalysis: DomainAnalysis;
  contentAnalysis: ContentAnalysis;
}

// Phase 1: Extended Authentication Results
export interface AuthenticationResults {
  spf: {
    result: "pass" | "fail" | "neutral" | "softfail" | "permerror" | "temperror" | "none";
    domain: string;
    qualifier?: string; // T102: SPF qualifier (-, ~, ?, +)
    authorizedSenders?: string[]; // T102: List of authorized sender IPs/domains
  };
  dkim: {
    result: "pass" | "fail" | "neutral" | "none";
    domain: string;
    selector: string;
    signatures?: DkimSignature[]; // T103: Multiple DKIM signatures
  };
  dmarc: {
    result: "pass" | "fail" | "none";
    policy?: string; // T105: DMARC policy (none, quarantine, reject)
    alignmentMode?: string; // T101: DMARC alignment mode (relaxed/strict)
  };
  arc: {
    result: "pass" | "fail" | "none";
    sealCount: number;
    chainDetails?: ArcChainDetail[]; // T104: ARC chain verification details
  };
  alignment: AlignmentResults; // T101: Alignment between SPF/DKIM and From header
  bimi?: BimiResults; // T105: BIMI-related information
}

// T103: Multiple DKIM signature support
export interface DkimSignature {
  domain: string;
  selector: string;
  algorithm?: string; // e.g., rsa-sha256, rsa-sha1 (weak)
  result: "pass" | "fail" | "neutral" | "none";
  isWeak?: boolean; // Flag for weak algorithms like sha1
}

// T104: ARC chain verification
export interface ArcChainDetail {
  index: number;
  result: "pass" | "fail" | "none";
  domain?: string;
  isBroken?: boolean; // Chain break detection
}

// T101: Alignment between authentication domains and From header
export interface AlignmentResults {
  spfAligned: boolean;
  dkimAligned: boolean;
  spfFromMismatch?: string; // Description of mismatch if any
  dkimFromMismatch?: string; // Description of mismatch if any
}

// T105: BIMI support
export interface BimiResults {
  selector?: string;
  indicator?: string; // URL to logo
  hasValidBimi: boolean;
}

// Phase 1: Extended Header Analysis
export interface HeaderAnalysis {
  receivedChain: string[];
  receivedChainDetails?: ReceivedChainDetail[]; // T108: Forensic analysis
  headerAnomalies: string[];
  extendedHeaders?: ExtendedHeaderInfo; // T106: Additional header information
  injectionDetected?: boolean; // T107: Header injection detection
}

// T108: Received chain forensics
export interface ReceivedChainDetail {
  index: number;
  from?: string;
  by?: string;
  timestamp?: string;
  hopDuration?: number; // Time since previous hop in seconds
  protocol?: string; // SMTP, ESMTP, HTTP, etc.
  tlsUsed?: boolean;
  ipAddress?: string;
  geoHeuristic?: string; // Rough geographic location if detected
}

// T106: Extended header information
export interface ExtendedHeaderInfo {
  returnPath?: string;
  listId?: string;
  xOriginalAuthResults?: string;
  xOriginatingIp?: string;
  xMailer?: string;
  xPriority?: string;
  listUnsubscribe?: string;
  messageId?: string;
  date?: string;
  dateAnomalies?: string[]; // Date parsing issues or suspicious timestamps
}

// Phase 2: Extended Domain Analysis
export interface DomainAnalysis {
  domain: string;
  isPunycode: boolean;
  reputationSignals: string[];
  typosquatting?: TyposquattingResult; // T202: Typosquatting detection
  tldRisk?: TldRiskLevel; // T203: TLD categorization
  domainHistory?: DomainHistory; // T204: Historical tracking
  brandMismatch?: BrandMismatchResult; // T205: Brand name mismatch
  isAllowed?: boolean; // T201: User allowlist
  isBlocked?: boolean; // T201: User blocklist
  isNewContact?: boolean;
}

// T202: Typosquatting detection
export interface TyposquattingResult {
  isLikelySuspicious: boolean;
  similarBrands: string[]; // Brands this domain resembles
  techniques: string[]; // e.g., "character substitution", "homoglyph", "insertion"
  levenshteinDistance?: number;
}

// T203: TLD risk categorization
export type TldRiskLevel = "low" | "medium" | "high" | "unknown";

// T204: Domain history tracking
export interface DomainHistory {
  firstSeen?: string; // ISO date string
  lastSeen?: string;
  messageCount: number;
  lastRiskScore?: "low" | "medium" | "high";
  isNewDomain?: boolean; // First time seeing this domain
  riskDeviation?: boolean; // Current risk significantly different from historical
  isNewContact?: boolean;
}

// T205: Brand name mismatch detection
export interface BrandMismatchResult {
  detectedInContent: string[]; // Brand names found in email body
  matchesSenderDomain: boolean;
  suspiciousMismatches: string[]; // Brands mentioned that don't match sender
}

export interface ContentAnalysis {
  // T301: Extended payment detection
  detectedIbans: string[];
  detectedRoutingNumbers: string[];
  detectedSwiftBic: string[];
  detectedCryptoWallets: CryptoWallet[];

  // T302-T303: Enhanced URL analysis
  suspiciousLinks: SuspiciousLink[];
  linkTextMismatches: LinkMismatch[];

  // Legacy fields
  urgencyIndicators: string[];

  // Brand signals
  detectedBrands?: string[];
  brandWarnings?: string[];

  // T304: QR code analysis
  qrCodes?: QrCodeAnalysis[];

  // T305: OCR analysis
  ocrResults?: OcrAnalysis[];

  // T306: NLP analysis
  nlpAnalysis?: NlpAnalysis;

  // T307-T308: Attachment analysis
  attachmentAnalysis?: AttachmentAnalysis[];

  // T309: HTML structure heuristics
  htmlHeuristics?: HtmlHeuristics;
}

// T301: Crypto wallet detection
export interface CryptoWallet {
  address: string;
  type: 'bitcoin' | 'ethereum' | 'other';
}

// T302: Enhanced suspicious link structure
export interface SuspiciousLink {
  url: string;
  isShortened: boolean;
  finalUrl?: string;
  hasSensitiveQueryParams?: boolean;
  isDeepLink?: boolean;
  scheme?: string;
  suspicionReasons: string[];
}

// T303: Link text vs href mismatch
export interface LinkMismatch {
  displayText: string;
  actualHref: string;
  isSuspicious: boolean;
  reason: string;
}

// T304: QR code analysis
export interface QrCodeAnalysis {
  decodedUrl?: string;
  decodedText?: string;
  isSuspicious: boolean;
  linkAnalysis?: SuspiciousLink;
}

// T305: OCR analysis results
export interface OcrAnalysis {
  imageSource: string;
  extractedText: string;
  detectedUrls: string[];
  detectedKeywords: string[];
}

// T306: NLP tone and request analysis
export interface NlpAnalysis {
  tone: 'neutral' | 'urgent' | 'threatening' | 'enticing';
  requestTypes: string[];
  modalityIndicators: string[];
  suspicionScore: number;
}

// T307: Attachment metadata analysis
export interface AttachmentAnalysis {
  filename: string;
  mimeType: string;
  hasDoubleExtension: boolean;
  isMacroEnabled: boolean;
  isEncryptedArchive: boolean;
  isCalendarInvite: boolean;
  suspicionReasons: string[];
  calendarInviteAnalysis?: CalendarInviteAnalysis;
}

// T308: Calendar invite inspection
export interface CalendarInviteAnalysis {
  organizer?: string;
  organizerMatchesSender: boolean;
  containsUrls: boolean;
  urls: string[];
  isSuspicious: boolean;
}

// T309: HTML structure heuristics
export interface HtmlHeuristics {
  hasHiddenText: boolean;
  hasObfuscatedStyles: boolean;
  hiddenTextSnippets: string[];
  suspiciousStyleCount: number;
}

// T201: Domain list storage format
export interface DomainListStorage {
  allowed: string[];
  blocked: string[];
  lastUpdated: string;
}

// T204: Domain history storage format
export interface DomainHistoryStorage {
  [domain: string]: {
    firstSeen: string;
    messageCount: number;
    lastRiskScore?: "low" | "medium" | "high";
    lastSeen: string;
    isNewDomain?: boolean;
  };
}

// T506: Analysis history for notifications view
export interface AnalysisHistoryEntry {
  messageId: string;
  threadId: string;
  timestamp: number;
  sender: string;
  subject: string;
  riskScore: "low" | "medium" | "high";
  topRiskFactors: string[];
}

export interface AnalysisHistoryStorage {
  entries: AnalysisHistoryEntry[];
  maxEntries: number; // Limit to prevent unbounded growth
}

// Phase 4: Risk scoring enhancements

// T402: Detailed risk factor breakdown
export interface RiskFactorBreakdown {
  category: string;
  factor: string;
  points: number;
  weight: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

// T403: Confidence metric
export interface ConfidenceMetric {
  score: number; // 0-100
  availableSignals: number;
  totalPossibleSignals: number;
  missingSignals: string[];
  parsingQuality: 'high' | 'medium' | 'low';
}

// T404: Message age analysis
export interface MessageAgeAnalysis {
  messageDate?: string;
  ageInDays?: number;
  isHistorical?: boolean;
  hasHistoricalComparison: boolean;
}

// T405: Analysis cache entry
export interface AnalysisCacheEntry {
  messageId: string;
  timestamp: number;
  inputHash: string;
  intermediateResults: {
    authenticationResults?: any;
    headerAnalysis?: any;
    domainAnalysis?: any;
    contentAnalysis?: any;
  };
  finalAnalysis?: EmailAnalysis;
}

// Enhanced EmailAnalysis with Phase 4 features
export interface EnhancedEmailAnalysis extends EmailAnalysis {
  riskFactorBreakdown?: RiskFactorBreakdown[];
  confidenceMetric?: ConfidenceMetric;
  messageAgeAnalysis?: MessageAgeAnalysis;
  explanation?: string[];
}
