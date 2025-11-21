# Phishing Email Test Cases for TrustGmail Extension

This directory contains fabricated phishing email test cases that simulate real Gmail API responses. These test cases are designed to help you test your extension's phishing detection capabilities locally.

## Overview

All test files follow the Gmail API message format (`format=full` or `format=raw`) and include realistic phishing indicators that your extension should detect.

## Test Cases

### 1. PayPal Urgency Scam (`phishing_paypal_urgency.json`)

**Phishing Techniques:**
- **Urgency tactics**: "URGENT", "24 hours", "permanently suspended"
- **Typosquatting domain**: `paypa1-secure.com` (number 1 instead of letter l)
- **Mismatched From/Reply-To**: From shows `service@paypal.com` but Reply-To is `support@paypa1-secure.com`
- **Failed SPF/DKIM/DMARC**: All authentication checks fail
- **Suspicious sender IP**: 185.234.219.45 (not from PayPal's infrastructure)
- **Generic greeting**: "Dear PayPal Customer"
- **Malicious link**: Points to `http://paypal-verify.suspicious-site.com`

**Key Indicators:**
```json
"Received-SPF": "fail"
"Authentication-Results": "dkim=fail", "spf=fail", "dmarc=fail"
"From": "PayPal Security <service@paypal.com>"
"Reply-To": "support@paypa1-secure.com"
```

---

### 2. Amazon Typosquatting (`phishing_amazon_typosquatting.json`)

**Phishing Techniques:**
- **Typosquatting domain**: `arnazon-security.com` (rn looks like m)
- **Urgency**: "48 hours" deadline
- **Failed authentication**: SPF, DKIM, DMARC all fail
- **Suspicious IP**: 103.45.189.234
- **Mismatched headers**: From says `amazon.com` but actual domain is `arnazon-security.com`
- **Unusual activity claims**: Login from "unrecognized device"
- **Generic greeting**: "Hello"

**Key Indicators:**
```json
"Return-Path": "<account-verify@arnazon-security.com>"
"From": "Amazon Account Services <no-reply@amazon.com>"
"Reply-To": "support@arnazon-security.com"
```

---

### 3. Bank Credential Harvesting (`phishing_bank_credential_harvest.json`)

**Phishing Techniques:**
- **Typosquatting**: `we11sfargo-secure.com` (double 1s instead of ll)
- **Extreme urgency**: "2 HOURS", "PERMANENTLY CLOSED"
- **Fear tactics**: "funds will be frozen"
- **Failed authentication**: All security checks fail
- **Suspicious geolocation**: Moscow, Russia
- **Generic greeting**: "Dear Valued Customer"
- **Multiple exclamation points and caps**: "CRITICAL"
- **Credential harvesting form**: Asks for Online ID, Password, and security questions

**Key Indicators:**
```json
"Return-Path": "<security-alerts@we11sfargo-secure.com>"
"Received-SPF": "fail"
"From": "Wells Fargo Security <alerts@wellsfargo.com>"
```

**Red Flags in Content:**
- Login attempt from suspicious location (Moscow)
- Very short time window (2 hours)
- Threats of permanent account closure

---

### 4. Google Poor Grammar (`phishing_google_poor_grammar.json`)

**Phishing Techniques:**
- **Poor grammar and spelling**: "have been compromise", "need you confirm", "will be suspended permanent"
- **Typosquatting**: `g00gle-security-team.net` (zeros instead of Os)
- **Failed authentication**: All checks fail
- **Chinese IP address**: 58.218.199.147
- **Excessive punctuation**: "!!!"
- **Generic greeting**: "Dear user"
- **Broken English**: "send automatic", "suspicious activitites", "UNTO ALSO"
- **ALL CAPS warnings**: Common in low-quality phishing attempts

**Key Indicators:**
```json
"From": "Google Security Team <noreply@google.com>"
"Reply-To": "security-support@g00gle-security-team.net"
"Subject": "Important Security Alert for Your Google Account !!!"
```

**Grammar Issues:**
- "Your Google account have been compromise" (wrong tense)
- "need you confirm your identity immediate" (missing 'to', wrong form)
- "suspicious activitities detected" (misspelling)

---

### 5. Microsoft Office 365 Malicious Attachment (`phishing_microsoft_attachment.json`)

**Phishing Techniques:**
- **Malicious attachment**: `Invoice_Nov-2025.pdf.exe` (executable disguised as PDF)
- **Typosquatting**: `micros0ft-office365.net` (zero instead of o)
- **Urgency**: "24 hours" expiration
- **Failed authentication**: All checks fail
- **Russian IP**: 91.213.8.154
- **Double extension trick**: `.pdf.exe` to fool users
- **Fear of data loss**: Threatens loss of documents, emails, OneDrive access
- **Fake invoice**: Common social engineering tactic

**Key Indicators:**
```json
"Return-Path": "<billing@micros0ft-office365.net>"
"From": "Microsoft Billing <no-reply@microsoft.com>"
"filename": "Invoice_Nov-2025.pdf.exe"
"Content-Type": "application/pdf; name=\"Invoice_Nov-2025.pdf.exe\""
```

**Attachment Red Flags:**
- Double extension (.pdf.exe)
- Executable file type disguised as document
- Unsolicited attachment claiming to be an invoice

---

### 6. QR Payment Invoice Scam (`phishing_qr_payment.json`)

**Phishing Techniques:**
- **QR code payment pressure**: Encourages scanning within 12 hours to avoid suspension
- **Typosquatting and domain mismatch**: Mixes `accounting-suite.com` with `secure-billing.info`
- **Failed SPF/DKIM/DMARC**: Spoofed infrastructure with no valid authentication
- **Malicious attachment**: PNG attachment masquerading as an embedded payment QR code
- **Suspicious links**: Directs to `https://malicious-qr.example.com/qr.png`
- **Fear tactics**: Threat of account suspension for non-payment

**Key Indicators:**
```json
"Authentication-Results": "dkim=fail ... spf=fail ... dmarc=fail"
"Reply-To": "support@secure-billing.info"
"filename": "invoice-qr.png"
"Subject": "Invoice #784512 Pending - Scan to Pay"
```

---

### 7. CEO Wire Transfer BEC (`phishing_ceo_wire_transfer.json`)

**Phishing Techniques:**
- **Executive impersonation**: Uses CEO name with display address from `global-industries.com` but routes replies to `gl0bal-industries.com`
- **Urgent financial directive**: Demands same-day wire transfer of $248,500
- **Confidentiality pressure**: Orders staff to keep instructions secret
- **Failed authentication**: SPF, DKIM, DMARC all fail
- **Lookalike domain**: Substitutes zero for “o” in the sending domain

**Key Indicators:**
```json
"From": "Michael Carter <michael.carter@global-industries.com>"
"Reply-To": "ceo@gl0bal-industries.com"
"Authentication-Results": "dkim=fail ... spf=fail ... dmarc=fail"
```

---

### 8. SharePoint Credential Harvest (`phishing_sharepoint_login.json`)

**Phishing Techniques:**
- **Fake SharePoint notification**: Promises access to “FY25 Master Contract.pdf”
- **Access expiry**: Threatens to revoke the share within six hours
- **Typosquatting**: Uses `contoso-secure.com` to mimic Contoso logistics
- **Credential trap**: CTA leads to fake login portal
- **Authentication failures**: SPF, DKIM, DMARC fail

**Key Indicators:**
```json
"Subject": "Contoso Logistics shared \"FY25 Master Contract.pdf\" with you"
"Reply-To": "files@contoso-secure.com"
"Link": "https://contoso-files.sharepoint-access.com/secure-login"
```

---

### 9. Fake Security Update HTML (`phishing_security_update_html.json`)

**Phishing Techniques:**
- **Security scare**: Claims device components are outdated and mandates patch within one hour
- **Attachment-based delivery**: Sends malicious `SecurityPatch.html`
- **Credential harvesting form**: Attachment POSTs to attacker domain
- **Microsoft impersonation**: Uses spoofed `ms-secure-patch.com`
- **Authentication failures**: SPF, DKIM, DMARC fail

**Key Indicators:**
```json
"Attachment": "SecurityPatch.html" (HTML credential form)
"Authentication-Results": "dkim=fail ... spf=fail ... dmarc=fail"
"From": "Microsoft Security <security@microsoft.com>"
```

---

### 10. Ledger Wallet Recovery Scam (`phishing_crypto_wallet_recovery.json`)

**Phishing Techniques:**
- **Crypto asset panic**: Warns that recovery window is closing in 30 minutes
- **Seed phrase theft**: Directs to fake Ledger validation page
- **Typosquatting**: `ledger-restore.io` vs legitimate `ledger.com`
- **Authentication failures**: All checks fail
- **Branded styling**: Dark-mode email mimicking Ledger branding

**Key Indicators:**
```json
"Subject": "Ledger Recovery Protocol Triggered"
"Link": "https://ledger-restore.io/account/verify"
"Reply-To": "alerts@ledger-restore.io"
```

---

### 11. Vendor Invoice Thread Hijack (`phishing_vendor_invoice_thread.json`)

**Phishing Techniques:**
- **Thread hijacking**: Replies to existing invoice conversation
- **Routing change**: Provides new bank account details inside body
- **Lookalike domain**: Spoofs `acmeparts-pay.com`
- **Malicious attachment**: Includes fake PDF remittance advice
- **Authentication failures**: SPF, DKIM, DMARC fail

**Key Indicators:**
```json
"Subject": "Re: Outstanding invoice 90877"
"Attachment": "RemittanceAdvice.pdf"
"Authentication-Results": "dkim=fail ... spf=fail ... dmarc=fail"
```

---

### 12. Compromised Vendor Update (`phishing_compromised_vendor.json`)

**Phishing Techniques:**
- **Legitimate sender**: Authentication passes for `acmeparts.com` to mimic a compromised mailbox
- **Reply-to mismatch**: Redirects responses to `acmeparts-payments.com`
- **Wire instructions**: Provides IBAN and references in body
- **Urgency**: Requests payment before close of business

**Key Indicators:**
```json
"Authentication-Results": "dkim=pass ... spf=pass ... dmarc=pass"
"Reply-To": "settlements@acmeparts-payments.com"
"Content": "IBAN: GB82 WEST 1234 5698 7654 32"
```

---

### 13. Encrypted Voicemail ZIP (`phishing_voicemail_zip.json`)

**Phishing Techniques:**
- **Voicemail lure**: Claims a new Microsoft voicemail is waiting
- **Malicious attachment**: `Voice_Message.zip` (obfuscated payload)
- **Brand impersonation**: Pretends to be Office 365 voicemail
- **Authentication failures**: SPF, DKIM, DMARC all fail

**Key Indicators:**
```json
"Subject": "Encrypted Voicemail (00:32)"
"Attachment": "Voice_Message.zip"
"Authentication-Results": "dkim=fail ... spf=fail ... dmarc=fail"
```

---

### 14. Voicemail Secure Player Link (`phishing_secure_player_link.json`)

**Phishing Techniques:**
- **Shortened URL**: Uses `https://short.sf/s32-PBX`
- **Encryption pretext**: Claims the player cannot decrypt voicemail
- **Microsoft branding**: Spoofs voicemail notification from Microsoft
- **Authentication failures**: All authentication checks fail

**Key Indicators:**
```json
"Link": "https://short.sf/s32-PBX"
"Authentication-Results": "dkim=fail ... spf=fail ... dmarc=fail"
"Return-Path": "voicemail@ms365-support.com"
```

---

### 15. Google Developer Welcome (Legitimate Control) (`legit_google_newsletter.json`)

**Legitimate Traits:**
- **Authentication passes**: SPF, DKIM, and DMARC all succeed for `google.com`
- **Consistent branding**: Sender, Return-Path, and Reply-To align with Google domains
- **Newsletter conventions**: Includes List-Unsubscribe header and neutral language
- **No urgency**: Welcoming tone with resource links rather than threats

**Why It Matters:** This control message ensures TrustEmail does not raise false positives against legitimate, well-authenticated traffic. Your detectors should return a **LOW** risk score and avoid surfacing critical indicators.

---

## Common Phishing Indicators Across All Tests

### 1. Authentication Failures
All phishing fixtures include:
- `Received-SPF: fail`
- `dkim=fail` in Authentication-Results
- `spf=fail` in Authentication-Results
- `dmarc=fail` in Authentication-Results

### 2. Domain Mismatches
- **From address** shows legitimate domain (e.g., `@paypal.com`)
- **Reply-To address** uses suspicious domain
- **Return-Path** uses typosquatted or completely different domain

### 3. Suspicious Infrastructure
- IP addresses from unexpected countries
- Hostnames that don't match claimed sender
- Mail servers with suspicious names

### 4. Social Engineering Tactics
- **Urgency**: Deadlines ranging from 30 minutes to "same day"
- **Fear**: Account suspension, irreversible fund loss, shipment delays
- **Authority**: Executive directives, IT security mandates, brand impersonation
- **Confidentiality pressure**: Instructions to bypass normal approval paths

### 5. Content Red Flags
- Generic greetings ("Dear user", "Dear Customer")
- Poor grammar and spelling (e.g., Google language scam)
- Excessive capitalization and punctuation
- Requests for credentials, seed phrases, or payment details
- Suspicious links with non-matching domains or QR redirects
- Unexpected attachments (executables, HTML credential forms, fake PDFs)

### 6. Technical Red Flags
- Mismatched email headers
- Invalid or fake DKIM signatures
- Suspicious Message-IDs
- Wrong date/time formats
- Non-standard email structure

---

## How to Use These Test Cases

### 1. Local Testing
```javascript
import { loadFixture } from '../../utils/gmailFixtures.js';

// Load a test case
const testEmail = await loadFixture('phishing_001_paypal');

// Pass it to your extension's detection logic
const result = detectPhishing(testEmail);

// Verify detection
console.assert(result.isPhishing === true);
console.log('Detected indicators:', result.indicators);
```

### 2. Integration Testing
Create a test suite that loads all test cases and verifies your extension detects them:

```javascript
import { allFixtureMetadata, loadAnalysisInput } from '../../utils/gmailFixtures.js';

for (const fixture of allFixtureMetadata.filter((meta) => meta.expectedRiskScore === 'high')) {
  const analysisInput = await loadAnalysisInput(fixture.id);
  const result = await analyzeEmail(analysisInput);

  // Each phishing sample should be detected
  expect(result.riskLevel).toBe('high');
}
```

### 3. Feature Testing
Test specific detection features:

```javascript
// Test SPF/DKIM/DMARC detection
const { headers, body } = await loadAnalysisInput('phishing_001_paypal');
expect(checkEmailAuthentication(headers)).toContain('SPF_FAIL');
expect(checkEmailAuthentication(headers)).toContain('DKIM_FAIL');

// Test domain mismatch detection
expect(checkDomainMismatch(headers)).toBe(true);

// Test typosquatting detection using the decoded body
expect(detectTyposquatting(body, 'paypal.com')).toBe(true);
```

### 4. User Interface Testing
Test how your extension displays warnings:

```javascript
// Load email in test environment
chrome.runtime.sendMessage({
  action: 'analyzeEmail',
  email: testEmail
}, response => {
  // Verify warning is displayed
  expect(response.showWarning).toBe(true);
  expect(response.riskLevel).toBe('HIGH');
  expect(response.indicators.length).toBeGreaterThan(3);
});
```

---

## Detection Checklist

Your extension should detect the following for each test case:

### PayPal Test
- [ ] SPF failure
- [ ] DKIM failure
- [ ] DMARC failure
- [ ] Domain mismatch (From vs Reply-To)
- [ ] Typosquatted domain (paypa1)
- [ ] Urgency language
- [ ] Suspicious link
- [ ] Generic greeting

### Amazon Test
- [ ] Authentication failures
- [ ] Typosquatting (arnazon)
- [ ] Domain mismatch
- [ ] Suspicious IP geolocation
- [ ] Urgency tactics
- [ ] Account verification scam pattern

### Bank Test
- [ ] Authentication failures
- [ ] Typosquatting (we11sfargo)
- [ ] Extreme urgency (2 hours)
- [ ] Suspicious geolocation (Russia)
- [ ] Fear tactics (account closure)
- [ ] Credential harvesting attempt
- [ ] ALL CAPS warnings

### Google Test
- [ ] Authentication failures
- [ ] Typosquatting (g00gle)
- [ ] Poor grammar detection
- [ ] Spelling errors
- [ ] Suspicious IP (China)
- [ ] Excessive punctuation
- [ ] Generic greeting

### Microsoft Test
- [ ] Authentication failures
- [ ] Typosquatting (micros0ft)
- [ ] Malicious attachment (.exe)
- [ ] Double extension trick
- [ ] Suspicious IP (Russia)
- [ ] Unsolicited attachment
- [ ] Invoice scam pattern

---

## Base64 Encoded Content

The email bodies in these test cases use base64 encoding (as Gmail API does). To decode:

```javascript
function decodeEmailBody(encodedData) {
  return atob(encodedData);
}

// Or in Node.js
function decodeEmailBody(encodedData) {
  return Buffer.from(encodedData, 'base64').toString('utf-8');
}
```

---

## Extending Test Cases

When adding new test cases:

1. **Follow Gmail API format**: Use the same structure as existing tests
2. **Use realistic headers**: Include all standard Gmail headers
3. **Fail authentication**: Set SPF, DKIM, DMARC to fail
4. **Use base64 encoding**: Encode email body content
5. **Include multiple indicators**: Each test should have 5+ phishing signals
6. **Document the techniques**: Update this README with new test descriptions
7. **Use appropriate timestamps**: Use realistic `internalDate` values
8. **Test both HTML and plain text**: Include both MIME parts

---

## Notes

- **These are FABRICATED emails**: None of these emails are real. They're designed to simulate Gmail API responses.
- **Suspicious domains are fake**: Domains like `paypa1-secure.com` are fictional examples.
- **IP addresses are examples**: The IP addresses used may be real but are chosen randomly for illustration.
- **No actual malware**: The "malicious attachment" in Test #5 is just metadata; there's no actual executable.
- **Safe for testing**: These files contain no actual threats and are safe to use for development and testing.

---

## Integration with Gmail API

To use these with live Gmail API for testing:

```javascript
// Instead of calling the real Gmail API
// gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' })

// Load test data
const testMessage = require('./phishing_paypal_urgency.json');

// Process as if it came from Gmail API
processEmailMessage(testMessage);
```

---

## Expected Detection Results

For a properly functioning phishing detector, each test should score:

| Test Case | Expected Risk Level | Minimum Indicators |
|-----------|---------------------|--------------------|
| PayPal Urgency | HIGH (8-10/10) | 6+ indicators |
| Amazon Typosquatting | HIGH (8-10/10) | 5+ indicators |
| Bank Credential Harvest | CRITICAL (9-10/10) | 7+ indicators |
| Google Poor Grammar | HIGH (7-9/10) | 8+ indicators |
| Microsoft Attachment | CRITICAL (9-10/10) | 6+ indicators |
| DHL Shipping Scam | HIGH (8-10/10) | 6+ indicators |
| QR Payment Invoice | HIGH (8-10/10) | 6+ indicators |
| CEO Wire Transfer BEC | HIGH (8-10/10) | 6+ indicators |
| SharePoint Credential Harvest | HIGH (8-10/10) | 6+ indicators |
| Fake Security Update HTML | HIGH (8-10/10) | 6+ indicators |
| Ledger Wallet Recovery | HIGH (8-10/10) | 6+ indicators |
| Vendor Invoice Thread Hijack | HIGH (8-10/10) | 6+ indicators |
| Compromised Vendor Update | MEDIUM (6-7/10) | 5+ indicators |
| Encrypted Voicemail ZIP | HIGH (8-10/10) | 6+ indicators |
| Voicemail Secure Player | HIGH (8-10/10) | 5+ indicators |
| Google Developer Welcome | LOW (0-3/10) | 0 indicators |

---

## Legitimate Email Comparison

To properly test, you should also create test cases for legitimate emails that should **NOT** be flagged:
- Emails with passing SPF/DKIM/DMARC
- Emails from verified senders
- Emails without urgency or fear tactics
- Emails without domain mismatches

This helps test for false positives.

---

## Contributing

When adding new test cases:
1. Create a descriptive filename (e.g., `phishing_[brand]_[technique].json`)
2. Follow the existing JSON structure
3. Document all phishing techniques used
4. Update this README with test details
5. Add detection criteria to the checklist

---

## License

These test files are provided for testing and development purposes only. They simulate phishing emails and should only be used in development/testing environments.
