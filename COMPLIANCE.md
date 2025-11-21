# TrustEmail — Chrome Web Store Submission Notes

Use this file when filling the Chrome Web Store listing and answering the data use questionnaire. All fields are derived from the current codebase (MV3, Gmail-only).

## Package to Upload
- Build: `npm run build`
- Zip for store: from repo root `cd dist && zip -r ../trustemail-webstore.zip .`
- Icons in package: `assets/icon-16/32/48/128.png` (1024px available for promo/press)

## Listing Text
- Short description (max 132 chars): `Analyze Gmail threads for phishing and fraud risk with in-context SPF/DKIM/DMARC checks and content analysis.`
- Full description (paste blocks as paragraphs):
  - `TrustEmail analyzes Gmail threads locally to highlight phishing and fraud risk. It surfaces SPF/DKIM/DMARC/ARC results, punycode and received-chain anomalies, suspicious links, payment/IBAN cues, and optional OCR/QR decoding for attachments.`
  - `Features: header authentication checks; domain reputation signals; payment/IBAN spotting; suspicious link expansion (incl. shorteners/deep links); NLP tone analysis; optional OCR/QR; history view and ignore-list controls; on-device storage.`
  - `Permissions are limited to Gmail read-only access to fetch the selected message for analysis. No third-party sharing or tracking.`

## Permissions & Justifications (manifest)
- `identity`: required for Google OAuth to obtain a Gmail access token.
- `storage`: save user settings (feature toggles, domain allow/block lists, ignored threads) and analysis history in `chrome.storage.local`.
- `scripting`: inject content and UI scripts into Gmail pages (`https://mail.google.com/*`).
- `offscreen`: run OCR/QR decoding off the main thread for performance/privacy.
- Host permissions: `https://mail.google.com/` (inject UI and receive thread context), `https://*.googleapis.com/` (call Gmail API).
- OAuth scope: `https://www.googleapis.com/auth/gmail.readonly` (fetch message/thread contents to analyze; no send/modify).

## Data Use Disclosures (for the questionnaire)
- Collection: reads selected Gmail message content and headers via Gmail API solely to compute risk analysis; no data sent to non-Google endpoints.
- Storage: user settings and analysis history stored locally in `chrome.storage.local` (bounded to 1000 entries). User can clear history from the UI; data is removed on uninstall.
- Sharing: none with third parties. Network calls go only to Gmail API endpoints using the user’s token.
- Purpose: detection, prevention, and security of the user’s Gmail experience.
- Retention: local only; bounded history; no background exfiltration or profiling.
- Optional features: OCR/QR and NLP run locally; online lookups default to off.

## Required External Links
- Privacy Policy: `<add URL hosted on your verified domain>`
- Terms of Service (optional but recommended): `<add URL>`
- Support contact: `<email or link>`

## Assets Checklist (store listing)
- 128x128 icon: `public/assets/icon-128.png`
- Screenshots (min 1280×800): home, analysis panel, history, settings
- Optional: promo tile 440×280, marquee 1400×560, high-res icon 1024×1024 (`public/assets/icon-1024.png`)

## Release Checklist
- Bump `version` in `public/manifest.json`
- `npm test`
- `npm run build`
- Zip `dist/` → `trustemail-webstore.zip`
- Confirm only required permissions/scopes remain; no source maps or secrets shipped
- Verify privacy policy URL and OAuth consent screen match the scope (`gmail.readonly`)

## Notes on Review Sensitivities
- Gmail scope is “sensitive”; expect Google to request a short video/screenshot showing the extension in use and linking to the published privacy policy.
- Keep the generated Web Store zip archived to track what was submitted. Google will re-sign the package on their side.
