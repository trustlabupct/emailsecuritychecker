# Messaging API Contracts

This document defines the message-passing interface between the content script and the service worker.

## 1. Messages from Content Script to Service Worker

### `analyzeEmail`

- **Direction**: Content Script -> Service Worker
- **Description**: Initiates the analysis of an email.
- **Payload**:
  ```json
  {
    "type": "analyzeEmail",
    "messageId": "<string>"
  }
  ```

### `reanalyzeEmail`

- **Direction**: Content Script -> Service Worker
- **Description**: Triggers a re-analysis of an email.
- **Payload**:
  ```json
  {
    "type": "reanalyzeEmail",
    "messageId": "<string>"
  }
  ```

### `getSettings`

- **Direction**: Content Script -> Service Worker
- **Description**: Requests the current user settings.
- **Payload**:
  ```json
  {
    "type": "getSettings"
  }
  ```

### `updateSettings`

- **Direction**: Content Script -> Service Worker
- **Description**: Updates the user settings.
- **Payload**:
  ```json
  {
    "type": "updateSettings",
    "settings": {
      "enableOnlineLookups": "<boolean>",
      "ignoredThreads": "<string[]>"
    }
  }
  ```

### `copyReport`

- **Direction**: Content Script -> Service Worker
- **Description**: Requests a text version of the analysis report.
- **Payload**:
  ```json
  {
    "type": "copyReport",
    "messageId": "<string>"
  }
  ```

## 2. Messages from Service Worker to Content Script

### `analysisComplete`

- **Direction**: Service Worker -> Content Script
- **Description**: Sends the results of an email analysis.
- **Payload**:
  ```json
  {
    "type": "analysisComplete",
    "analysis": "<EmailAnalysis>"
  }
  ```

### `settingsUpdated`

- **Direction**: Service Worker -> Content Script
- **Description**: Notifies the content script that the settings have been updated.
- **Payload**:
  ```json
  {
    "type": "settingsUpdated",
    "settings": "<UserSettings>"
  }
  ```

### `reportCopied`

- **Direction**: Service Worker -> Content Script
- **Description**: Sends the text version of the report to be copied to the clipboard.
- **Payload**:
  ```json
  {
    "type": "reportCopied",
    "reportText": "<string>"
  }
  ```
