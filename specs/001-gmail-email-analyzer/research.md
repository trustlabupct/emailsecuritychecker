# Research & Decisions for TrustEmail

This document outlines the technical decisions made during the research phase of the TrustEmail project.

## 1. Testing Framework

- **Decision**: Use `Vitest` as the primary testing framework.
- **Rationale**: `Vitest` is the recommended testing framework for Vite and TypeScript projects. It offers native TypeScript support, fast execution with Hot Module Replacement (HMR), Jest-compatible API for easy migration, and built-in mocking capabilities. This aligns with our tech stack and the principle of rigorous testing.
- **Alternatives considered**: 
    - **Jest**: While a popular choice, it requires more configuration to work seamlessly with Vite. `Vitest` provides a more integrated experience.
    - **Mocha**: A flexible framework, but would require more setup for TypeScript and JSX support compared to `Vitest`.

## 2. Performance Goals

- **Decision**: Establish clear performance targets for the extension:
    - **Analysis Time**: Complete email analysis in under 3 seconds.
    - **Responsiveness**: Ensure no noticeable impact on Gmail's UI thread (e.g., scrolling, composing).
    - **Resource Consumption**: Keep the service worker's memory footprint below 20MB and minimize CPU usage during idle periods.
- **Rationale**: Adhering to these goals is critical for a positive user experience. A slow or resource-heavy extension is likely to be uninstalled. These targets are based on general best practices for high-performance Chrome extensions.
- **Alternatives considered**: No specific alternatives, as these goals are fundamental to extension quality.

## 3. Handling Malformed Email Headers

- **Decision**: Use the `postal-mime` library for parsing raw email content.
- **Rationale**: The `spec.md` requires handling of non-standard headers. `postal-mime` is a zero-dependency, RFC-compliant parser with TypeScript support. It is designed to be robust against malformed input, which is crucial for a security analysis tool that will encounter a wide variety of email formats.
- **Alternatives considered**:
    - **`mail-parser`**: A popular library, but it is designed for Node.js and may be less suitable for a browser environment.
    - **Custom Parser**: Building a custom email parser would be time-consuming and highly prone to errors, making it an impractical choice.

## 4. Internationalization (i18n)

- **Decision**: Implement internationalization using the standard `chrome.i18n` API.
- **Rationale**: The `spec.md` requires support for English and Spanish. The `chrome.i18n` API is the native, recommended solution for localizing Chrome extensions. It provides a straightforward mechanism for managing translated strings in `messages.json` files and automatically displays the correct language based on the user's browser settings.
- **Alternatives considered**: A custom i18n solution would add unnecessary complexity and would not be as efficient as the built-in API.

## 5. Build Tool and Development Environment

- **Decision**: Use Vite as the build tool, enhanced with the `vite-plugin-web-extension` plugin.
- **Rationale**: Vite is already chosen as the build tool. The `vite-plugin-web-extension` plugin will streamline the development process by handling the complexities of building for a Chrome extension target, such as managing the `manifest.json` file, handling multiple entry points (service worker, content scripts), and enabling HMR during development.
- **Alternatives considered**:
    - **Plain Vite**: Using Vite without a specialized plugin is possible, but would require more manual configuration for the extension-specific build steps.
    - **Webpack**: While powerful, Webpack is generally more complex to configure than Vite.

## 6. Gmail API Integration and Authentication

- **Decision**: Use the `chrome.identity.getAuthToken()` method for authentication and the Google API JavaScript client (`gapi`) for interacting with the Gmail API.
- **Rationale**: For Manifest V3 extensions, `chrome.identity.getAuthToken()` is the standard and most secure method for obtaining OAuth 2.0 tokens for Google services. It handles the user consent flow and token management. The `gapi` client library provides a convenient and well-supported interface for making calls to the Gmail API.
- **Alternatives considered**:
    - **`chrome.identity.launchWebAuthFlow`**: This method could be used for a manual OAuth 2.0 flow, but it is more complex to implement and maintain than `getAuthToken`.
    - **Direct HTTP requests**: Making direct HTTP requests to the Gmail API is possible, but would require manual implementation of request signing and error handling, which is already handled by the `gapi` client.