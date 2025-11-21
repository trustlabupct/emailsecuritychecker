// src/service-worker/report-generator.ts
import { EmailAnalysis } from '../shared/types';

export function generateReportText(analysis: EmailAnalysis): string {
  let report = `--- TrustEmail Analysis Report ---

`;
  report += `Message ID: ${analysis.messageId}
`;
  report += `Thread ID: ${analysis.threadId}
`;
  report += `Gmail UI ID: ${analysis.gmailUiMessageId}
`;
  report += `Overall Risk Score: ${analysis.riskScore.toUpperCase()}

`;

  report += `--- Authentication Results ---
`;
  report += `SPF: ${analysis.authenticationResults.spf.result} (Domain: ${analysis.authenticationResults.spf.domain})
`;
  report += `DKIM: ${analysis.authenticationResults.dkim.result} (Domain: ${analysis.authenticationResults.dkim.domain}, Selector: ${analysis.authenticationResults.dkim.selector})
`;
  report += `DMARC: ${analysis.authenticationResults.dmarc.result}
`;
  report += `ARC: ${analysis.authenticationResults.arc.result} (Seal Count: ${analysis.authenticationResults.arc.sealCount})

`;

  report += `--- Header Analysis ---
`;
  if (analysis.headerAnalysis.headerAnomalies.length > 0) {
    report += `Header Anomalies:
`;
    analysis.headerAnalysis.headerAnomalies.forEach(anomaly => report += `- ${anomaly}
`);
  } else {
    report += `No significant header anomalies detected.
`;
  }
  report += `Received Chain (last to first):
`;
  analysis.headerAnalysis.receivedChain.forEach(header => report += `  - ${header}
`);
  report += `
`;

  report += `--- Domain Analysis ---
`;
  report += `Domain: ${analysis.domainAnalysis.domain}
`;
  report += `Punycode: ${analysis.domainAnalysis.isPunycode ? 'Yes' : 'No'}
`;
  if (analysis.domainAnalysis.reputationSignals.length > 0) {
    report += `Reputation Signals:
`;
    analysis.domainAnalysis.reputationSignals.forEach(signal => report += `- ${signal}
`);
  } else {
    report += `No specific reputation signals.
`;
  }
  report += `
`;

  report += `--- Content Analysis ---
`;
  if (analysis.contentAnalysis.detectedIbans.length > 0) {
    report += `Detected IBANs: ${analysis.contentAnalysis.detectedIbans.join(', ')}
`;
  } else {
    report += `No IBANs detected.
`;
  }
  if (analysis.contentAnalysis.suspiciousLinks.length > 0) {
    report += `Suspicious Links:
`;
    analysis.contentAnalysis.suspiciousLinks.forEach(link => {
      report += `- ${link.url} (Shortened: ${link.isShortened ? 'Yes' : 'No'}`;
      if (link.finalUrl) report += `, Final: ${link.finalUrl}`;
      report += `)
`;
    });
  } else {
    report += `No suspicious links detected.
`;
  }
  if (analysis.contentAnalysis.urgencyIndicators.length > 0) {
    report += `Urgency Indicators: ${analysis.contentAnalysis.urgencyIndicators.join(', ')}
`;
  } else {
    report += `No urgency indicators detected.
`;
  }
  report += `
`;

  report += `--- End of Report ---
`;

  return report;
}
