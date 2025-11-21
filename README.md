# TrustEmail — Gmail Security Analyzer

TrustEmail is a Chrome extension that inspects Gmail threads for phishing and fraud risk, surfacing a risk score, header authentication details, and deep content analysis directly inside Gmail.

## Features
- SPF/DKIM/DMARC and ARC header checks plus punycode and received-chain anomaly detection
- Domain reputation signals, payment detail/IBAN spotting, suspicious link tracing (incl. shorteners and deep links)
- NLP tone analysis and optional image/QR scanning (OCR) for attachment risk
- Analysis history, ignore-list controls, and configurable performance-sensitive features

## Develop
- Install dependencies: `npm install`
- Run locally: `npm run dev` (Vite)  
- Build production bundle: `npm run build` → output in `dist/` (load as an unpacked extension in Chrome; stay signed in so Gmail OAuth works)
- Tests: `npm test`

## Pack (.crx)
- Build first: `npm run build`
- In Chrome: `chrome://extensions` → enable Developer mode → Pack extension → choose the `dist/` folder
- Keep the generated `.pem` safe to preserve the same extension ID when re-packing

## Release Prep (Web Store/GitHub)
- Bump version in `public/manifest.json` (Chrome uses this)
- Run tests: `npm test`
- Build: `npm run build`
- Create upload zip: `cd dist && zip -r ../trustemail-webstore.zip .`
- Publish: push code (without `dist/` or `node_modules/`), host `PRIVACY.md`/`TERMS.md` on http://trustlab.upct.es, then upload the zip in the Chrome Web Store dashboard
