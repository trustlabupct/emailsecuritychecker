# Quickstart Guide for TrustEmail

This guide provides instructions on how to set up and run the TrustEmail extension for development.

## Prerequisites

-   Node.js (v18 or later)
-   npm (v9 or later)

## 1. Installation

Clone the repository and install the dependencies:

```bash
git clone <repository-url>
cd TrustEmail
npm install
```

## 2. Development

To run the extension in development mode with hot-reloading, use the following command:

```bash
npm run dev
```

This will create a `dist` directory with the unpacked extension files.

## 3. Loading the Extension in Chrome

1.  Open Chrome and navigate to `chrome://extensions`.
2.  Enable "Developer mode" in the top right corner.
3.  Click "Load unpacked".
4.  Select the `dist` directory from the project folder.

The extension will now be loaded and active. When you make changes to the source code, the `npm run dev` command will automatically rebuild the extension, and you can reload the extension from the `chrome://extensions` page.

## 4. Building for Production

To create a production-ready build of the extension, run:

```bash
npm run build
```

This will generate an optimized and minified version of the extension in the `dist` directory, which can be packaged for submission to the Chrome Web Store.