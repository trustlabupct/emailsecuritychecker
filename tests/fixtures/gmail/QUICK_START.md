# Quick Start Guide – Gmail Fixture Set

## Overview
This folder now contains **fifteen phishing scenarios and one legitimate control message** that mimic Gmail API `messages.get` responses. Use them to validate TrustEmail’s detectors offline and to guard against false positives.

## Fixture Summary

| # | Fixture ID | Brand / Theme | Expected Risk |
|---|------------|---------------|---------------|
| 1 | `phishing_001_paypal` | PayPal account limitation | HIGH |
| 2 | `phishing_002_amazon` | Amazon login alert | HIGH |
| 3 | `phishing_003_bank` | Wells Fargo credential harvest | CRITICAL |
| 4 | `phishing_004_google` | Google security alert with poor grammar | HIGH |
| 5 | `phishing_005_microsoft` | Microsoft invoice with `.pdf.exe` attachment | CRITICAL |
| 6 | `phishing_006_dhl` | DHL delivery fee scam | HIGH |
| 7 | `phishing_007_qr_payment` | QR-code invoice shakedown | HIGH |
| 8 | `phishing_008_ceo_wire` | CEO wire transfer BEC | HIGH |
| 9 | `phishing_009_sharepoint_login` | SharePoint credential harvest | HIGH |
| 10 | `phishing_010_security_update` | Fake security update HTML attachment | HIGH |
| 11 | `phishing_011_crypto_wallet` | Ledger wallet recovery scam | HIGH |
| 12 | `phishing_012_vendor_invoice` | Vendor thread hijack with fake remittance | HIGH |
| 13 | `phishing_013_compromised_vendor` | Compromised vendor wiring request | MEDIUM |
| 14 | `phishing_014_voicemail_zip` | Encrypted voicemail ZIP malware | HIGH |
| 15 | `phishing_015_secure_player` | Voicemail secure-player link | HIGH |
| 16 | `legit_001_google_newsletter` | Google Developer welcome email (control) | LOW |

## Loading Fixtures in Tests or Scripts
```ts
import { loadFixture, loadAnalysisInput } from '../utils/gmailFixtures';

// Raw Gmail-like message
default async function demo() {
  const message = await loadFixture('phishing_001_paypal');
  console.log(message.payload.headers.find((h) => h.name === 'Subject')?.value);

  const analysisInput = await loadAnalysisInput('phishing_001_paypal');
  console.log(analysisInput.body.slice(0, 120));
}
```

## Running the Bundled Vitest Suite
We added an integration test (`tests/integration/gmail-fixtures.test.ts`) that exercises every fixture against `analyzeEmailEnhanced`.

```bash
npm test
```

- All phishing fixtures must yield `riskScore === 'high'`.
- The legitimate control must remain `riskScore === 'low'`.

## Building Custom Assertions
Use the decoded analysis input to target specific heuristics:

```ts
const { headers, body, attachments } = await loadAnalysisInput('phishing_005_microsoft');
expect(headers.find((h) => h.name === 'Received-SPF')?.value).toContain('fail');
expect(attachments.some((att) => att.filename.endsWith('.exe'))).toBe(true);
```

## Decoding MIME Bodies Manually
`gmailFixtures.ts` already normalises Base64URL strings, but if you need to decode a body yourself:

```ts
function decodeBase64Url(data: string) {
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, 'base64').toString('utf8');
}
```

## Expected Outcomes
- **Phishing fixtures:** multiple authentication failures, domain mismatches, urgency or fear tactics, suspicious links or attachments.
- **Compromised vendor scenario:** authentication passes so the risk signal comes from reply-to mismatch and IBAN exposure—expect at least a MEDIUM score.
- **Legitimate control:** passes all authentication checks, contains unsubscribe metadata, and should *not* trigger high-risk indicators.

Aim for **100% detection** on phishing samples and **0 false positives** on the legitimate control.
