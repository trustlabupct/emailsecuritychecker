# Feature Specification: TrustEmail: Gmail Email Analyzer

**Feature Branch**: `001-gmail-email-analyzer`  
**Created**: 2025-10-22  
**Status**: Draft  
**Input**: User description: "Build a Gmail-focused browser extension (Manifest V3, TypeScript) named “TrustEmail” that analyzes the currently viewed message/thread in the Gmail web UI. The extension must run fully client-side by default (no data leaves the device) and present a clear risk summary plus detailed evidence..."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Core Email Analysis (Priority: P1)

As a user, I want to see a clear risk summary of the email I'm currently viewing in Gmail, so that I can quickly assess its legitimacy.

**Why this priority**: This is the core functionality of the extension and provides the most immediate value to the user.

**Independent Test**: Can be tested by opening an email in Gmail and verifying that the extension displays a risk score and a summary of authentication results (SPF, DKIM, DMARC).

**Acceptance Scenarios**:

1.  **Given** an email with valid SPF, DKIM, and DMARC, **When** I view the email, **Then** the extension shows a "Low Risk" score and indicates that all authentication checks passed.
2.  **Given** an email with a failed DMARC policy, **When** I view the email, **Then** the extension shows a "High Risk" score and highlights the DMARC failure.
3.  **Given** an email containing a known suspicious link, **When** I view the email, **Then** the extension highlights the link and shows a warning.

---

### User Story 2 - Detailed Analysis View (Priority: P2)

As a user, I want to be able to expand the extension's UI to view detailed evidence for the risk assessment, so that I can understand why an email was flagged.

**Why this priority**: This provides transparency and allows users to make more informed decisions.

**Independent Test**: Can be tested by clicking the "expand" button on the risk summary banner and verifying that a detailed panel with "Authentication," "Headers," "Domain," and "Content" sections is displayed.

**Acceptance Scenarios**:

1.  **Given** the risk summary banner is visible, **When** I click the "expand" button, **Then** a detailed view with multiple sections is shown.
2.  **Given** the detailed view is open, **When** I click the "Copy report" button, **Then** a text version of the analysis is copied to my clipboard.

---

### User Story 3 - Optional Online Lookups (Priority: P3)

As a security-conscious user, I want the option to enable online lookups for more in-depth analysis, with the understanding that this will send some data to external services.

**Why this priority**: This provides enhanced security for users who are willing to trade a small amount of privacy for more powerful analysis.

**Independent Test**: Can be tested by enabling the "online lookup" option in the extension's settings and verifying that links are resolved to their final destination.

**Acceptance Scenarios**:

1.  **Given** online lookups are disabled, **When** I view an email with a shortened link, **Then** the extension identifies the shortener but does not show the final URL.
2.  **Given** online lookups are enabled, **When** I view an email with a shortened link, **Then** the extension displays the final destination URL of the link.

---

## Clarifications

### Session 2025-10-22

- Q: How should the extension behave when an email lacks an `Authentication-Results` header? → A: Display "Authentication results not found" and assign a "Medium" risk score.
- Q: What should be displayed while the extension is analyzing an email? → A: A subtle loading spinner or animation in the banner.

---

### Edge Cases

- If an email lacks an `Authentication-Results` header, the extension will display "Authentication results not found" and assign a "Medium" risk score.
- How does the system handle emails with non-standard or malformed headers?
- What is the behavior when viewing an email in a language other than English or Spanish?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST analyze the currently viewed email in the Gmail web UI.
- **FR-002**: The system MUST run fully client-side by default.
- **FR-003**: The system MUST display a compact banner with a risk score (low/medium/high) and SPF/DKIM/DMARC status.
- **FR-004**: The system MUST display a subtle loading spinner or animation in the banner while analyzing an email.
- **FR-005**: The system MUST provide an expandable panel with detailed analysis sections: "Authentication," "Headers," "Domain," and "Content."
- **FR-006**: The system MUST parse and display SPF, DKIM, DMARC, and ARC results.
- **FR-007**: The system MUST analyze the `Received` header chain for anomalies.
- **FR-008**: The system MUST check for consistency across `From`, `Sender`, `Reply-To`, and `Return-Path` headers.
- **FR-009**: The system MUST apply local heuristics for domain reputation (length, entropy, TLD, punycode).
- **FR-010**: The system MUST detect and validate IBANs.
- **FR-011**: The system MUST detect and flag suspicious links (punycode, shorteners).
- **FR-012**: The system MUST allow users to optionally enable safe resolution of shortened links.
- **FR-013**: The system MUST provide options to "Copy report," "Ignore this thread," and "Reanalyze."
- **FR-014**: The user interface MUST be accessible (ARIA, keyboard navigation, high contrast).
- **FR-015**: The system MUST support internationalization for English and Spanish.

### Key Entities *(include if feature involves data)*

- **EmailAnalysis**: Represents the analysis results for a single email, including:
    - `riskScore`: "low", "medium", or "high".
    - `authenticationResults`: Status of SPF, DKIM, DMARC, ARC.
    - `headerAnalysis`: Anomalies found in the `Received` chain and other headers.
    - `domainAnalysis`: Reputation signals for the sender's domain.
    - `contentAnalysis`: Detected IBANs, suspicious links, and urgency indicators.
- **UserSettings**: User-configurable settings, including:
    - `enableOnlineLookups`: Boolean, defaults to `false`.
    - `ignoredThreads`: A list of thread IDs to ignore.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a thread with valid `Authentication-Results`, the banner shows the real SPF/DKIM/DMARC status and explains failures.
- **SC-002**: The system correctly detects and flags discrepancies between `From` and `Reply-To`/`Return-Path`, and domains with punycode.
- **SC-003**: The system highlights at least 10 common shorteners and shows the destination URL (if resolution is enabled) without automatic navigation.
- **SC-004**: The system correctly recognizes ES and common EU IBAN formats, validates their checksums, and redacts them in the report.
- **SC-005**: The analysis report can be exported in both JSON and human-readable text format, without sensitive data by default.
- **SC-006**: All primary functions operate offline; any online features require explicit user consent.