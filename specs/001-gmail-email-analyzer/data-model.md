# Data Model for TrustEmail

This document defines the key data entities used in the TrustEmail extension.

## 1. EmailAnalysis

Represents the complete analysis results for a single email message.

| Field                 | Type                               | Description                                                                                             |
| --------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `messageId`           | `string`                           | The unique ID of the Gmail message that was analyzed.                                                   |
| `riskScore`           | `"low" \| "medium" \| "high"`      | The overall risk assessment for the email.                                                              |
| `authenticationResults` | `AuthenticationResults`            | An object containing the results of email authentication checks.                                        |
| `headerAnalysis`      | `HeaderAnalysis`                   | An object containing the analysis of the email's headers.                                               |
| `domainAnalysis`      | `DomainAnalysis`                   | An object containing the analysis of the sender's domain.                                               |
| `contentAnalysis`     | `ContentAnalysis`                  | An object containing the analysis of the email's body content.                                          |

### 1.1. AuthenticationResults

| Field    | Type                               | Description                                                              |
| -------- | ---------------------------------- | ------------------------------------------------------------------------ |
| `spf`    | `{ result: "pass" \| "fail" \| "neutral" \| "softfail" \| "permerror" \| "temperror", domain: string }` | The result of the SPF check.                                             |
| `dkim`   | `{ result: "pass" \| "fail" \| "neutral", domain: string, selector: string }` | The result of the DKIM check.                                            |
| `dmarc`  | `{ result: "pass" \| "fail" \| "none" }`      | The result of the DMARC check.                                           |
| `arc`    | `{ result: "pass" \| "fail" \| "none", sealCount: number }` | The result of the ARC seal validation.                                   |

### 1.2. HeaderAnalysis

| Field              | Type       | Description                                                                    |
| ------------------ | ---------- | ------------------------------------------------------------------------------ |
| `receivedChain`    | `string[]` | An array of the `Received` headers, from last to first.                        |
| `headerAnomalies`  | `string[]` | A list of detected anomalies, such as mismatches in `From` and `Reply-To`.     |

### 1.3. DomainAnalysis

| Field             | Type       | Description                                                              |
| ----------------- | ---------- | ------------------------------------------------------------------------ |
| `domain`          | `string`   | The sender's domain.                                                     |
| `isPunycode`      | `boolean`  | Whether the domain is a punycode domain.                                 |
| `reputationSignals` | `string[]` | A list of reputation signals (e.g., "new domain", "suspicious TLD").     |

### 1.4. ContentAnalysis

| Field               | Type         | Description                                                              |
| ------------------- | ------------ | ------------------------------------------------------------------------ |
| `detectedIbans`     | `string[]`   | A list of detected and validated IBANs.                                  |
| `suspiciousLinks`   | `{ url: string, isShortened: boolean, finalUrl?: string }[]` | A list of detected suspicious links.                                     |
| `urgencyIndicators` | `string[]`   | A list of phrases or keywords indicating urgency (e.g., "urgent", "action required"). |

## 2. UserSettings

Represents the user's configurable settings for the extension, stored in `chrome.storage.local`.

| Field                 | Type       | Default     | Description                                                              |
| --------------------- | ---------- | ----------- | ------------------------------------------------------------------------ |
| `enableOnlineLookups` | `boolean`  | `false`     | If `true`, the extension is allowed to make external network requests to resolve shortened links. |
| `ignoredThreads`      | `string[]` | `[]`        | A list of Gmail thread IDs that the user has chosen to ignore.           |