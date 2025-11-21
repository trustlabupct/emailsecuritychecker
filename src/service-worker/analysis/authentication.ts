// src/service-worker/analysis/authentication.ts
import { AuthenticationResults, DkimSignature, ArcChainDetail, AlignmentResults, BimiResults } from '../../shared/types';
import { logger } from '../utils/logger';

function splitAuthSegments(value: string): string[] {
  const segments: string[] = [];
  let current = '';
  let parenDepth = 0;
  let inQuote = false;

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];

    if (char === '"' && value[i - 1] !== '\\') {
      inQuote = !inQuote;
    } else if (!inQuote) {
      if (char === '(') {
        parenDepth += 1;
      } else if (char === ')' && parenDepth > 0) {
        parenDepth -= 1;
      }
    }

    if (char === ';' && parenDepth === 0 && !inQuote) {
      const trimmed = current.trim();
      if (trimmed) {
        segments.push(trimmed);
      }
      current = '';
    } else {
      current += char;
    }
  }

  const finalTrimmed = current.trim();
  if (finalTrimmed) {
    segments.push(finalTrimmed);
  }

  return segments;
}

export function parseAuthenticationResults(
  headers: { name: string; value: string }[],
  fromHeader?: string
): AuthenticationResults {
  // Filter out any malformed headers
  const validHeaders = headers.filter(h => h && typeof h.name === 'string' && typeof h.value === 'string');

  // DEBUG: Log all header names to see what we have
  logger.info("All headers available:", validHeaders.map(h => h.name).join(', '));

  const authResultsHeader = validHeaders.find(h => h.name.toLowerCase() === 'authentication-results');

  const defaultAuthResults: AuthenticationResults = {
    spf: { result: 'none', domain: '' },
    dkim: { result: 'none', domain: '', selector: '', signatures: [] },
    dmarc: { result: 'none' },
    arc: { result: 'none', sealCount: 0, chainDetails: [] },
    alignment: { spfAligned: false, dkimAligned: false },
  };

  if (!authResultsHeader) {
    logger.warn("Authentication-Results header not found.");
    logger.warn("Available headers count:", validHeaders.length);
    logger.warn("Sample headers (first 10):", validHeaders.slice(0, 10).map(h => ({ name: h.name, valuePreview: h.value.substring(0, 50) })));
    return defaultAuthResults;
  }

  logger.info("Found Authentication-Results header:", authResultsHeader.value);

  const value = authResultsHeader.value;
  const results: AuthenticationResults = { ...defaultAuthResults };

  // T102: Parse SPF with qualifiers
  parseSPF(value, results, validHeaders);

  // T103: Parse multiple DKIM signatures
  parseDKIM(value, results, validHeaders);

  // Parse DMARC
  parseDMARC(value, results, validHeaders);

  // T104: Parse ARC chain
  parseARC(results, validHeaders);

  // T105: Parse BIMI
  results.bimi = parseBIMI(validHeaders);

  // T101: Compute alignment
  if (fromHeader) {
    results.alignment = computeAlignment(results, fromHeader);
  }

  return results;
}

/**
 * T102: Parse SPF with qualifiers and authorized sender info
 */
function parseSPF(
  authValue: string,
  results: AuthenticationResults,
  headers: { name: string; value: string }[]
): void {
  const segments = splitAuthSegments(authValue);

  for (const segment of segments) {
    const lowerSegment = segment.toLowerCase();

    if (lowerSegment.startsWith('spf=')) {
      const spfResultMatch = segment.match(/spf=([a-z]+)/i);
      if (spfResultMatch) {
        results.spf.result = spfResultMatch[1].toLowerCase() as AuthenticationResults['spf']['result'];
      }

      const mailFromMatch = segment.match(/smtp\.mailfrom=([^\s;]+)/i);
      if (mailFromMatch) {
        results.spf.domain = extractDomain(mailFromMatch[1]);
      } else {
        const domainOfMatch = segment.match(/domain of ([^)\s]+)/i);
        if (domainOfMatch) {
          results.spf.domain = extractDomain(domainOfMatch[1]);
        }
      }

      // T102: Extract SPF qualifier
      // Qualifiers: + (pass), - (fail), ~ (softfail), ? (neutral)
      const qualifierMatch = segment.match(/qualifier=([+\-~?])/i);
      if (qualifierMatch) {
        results.spf.qualifier = qualifierMatch[1];
      } else {
        // Infer qualifier from result
        switch (results.spf.result) {
          case 'pass':
            results.spf.qualifier = '+';
            break;
          case 'fail':
            results.spf.qualifier = '-';
            break;
          case 'softfail':
            results.spf.qualifier = '~';
            break;
          case 'neutral':
            results.spf.qualifier = '?';
            break;
        }
      }
    }
  }

  // T102: Extract authorized senders from Received-SPF header
  const receivedSpfHeader = headers.find(h => h.name.toLowerCase() === 'received-spf');
  if (receivedSpfHeader) {
    const authorizedSenders: string[] = [];
    const ipMatch = receivedSpfHeader.value.match(/client-ip=([^\s;]+)/i);
    if (ipMatch) {
      authorizedSenders.push(ipMatch[1]);
    }
    const identityMatch = receivedSpfHeader.value.match(/identity=([^\s;]+)/i);
    if (identityMatch) {
      authorizedSenders.push(identityMatch[1]);
    }
    if (authorizedSenders.length > 0) {
      results.spf.authorizedSenders = authorizedSenders;
    }
  }
}

/**
 * T103: Parse multiple DKIM signatures
 */
function parseDKIM(
  authValue: string,
  results: AuthenticationResults,
  headers: { name: string; value: string }[]
): void {
  const segments = splitAuthSegments(authValue);

  const signatures: DkimSignature[] = [];

  // Parse from Authentication-Results
  for (const segment of segments) {
    const lowerSegment = segment.toLowerCase();

    if (lowerSegment.startsWith('dkim=')) {
      const dkimResultMatch = segment.match(/dkim=([a-z]+)/i);
      const headerIMatch = segment.match(/header\.i=([^\s;]+)/i);
      const selectorMatch = segment.match(/header\.s=([^\s;]+)/i);
      const algorithmMatch = segment.match(/header\.a=([^\s;]+)/i);

      const signature: DkimSignature = {
        domain: headerIMatch ? extractDomain(headerIMatch[1]) : '',
        selector: selectorMatch ? selectorMatch[1] : '',
        algorithm: algorithmMatch ? algorithmMatch[1] : undefined,
        result: dkimResultMatch ? dkimResultMatch[1].toLowerCase() as DkimSignature['result'] : 'none',
      };

      // T103: Flag weak algorithms (SHA1 is considered weak)
      if (signature.algorithm && signature.algorithm.toLowerCase().includes('sha1')) {
        signature.isWeak = true;
      }

      signatures.push(signature);

      // Set primary DKIM result
      if (!results.dkim.domain) {
        results.dkim.result = signature.result;
        results.dkim.domain = signature.domain;
        results.dkim.selector = signature.selector;
      }
    }
  }

  // T103: Also check for DKIM-Signature headers directly
  const dkimSignatureHeaders = headers.filter(h => h.name.toLowerCase() === 'dkim-signature');
  for (const dkimHeader of dkimSignatureHeaders) {
    const domainMatch = dkimHeader.value.match(/d=([^\s;]+)/i);
    const selectorMatch = dkimHeader.value.match(/s=([^\s;]+)/i);
    const algorithmMatch = dkimHeader.value.match(/a=([^\s;]+)/i);

    if (domainMatch) {
      // Check if we already have this signature
      const domain = domainMatch[1].trim();
      const selector = selectorMatch ? selectorMatch[1].trim() : '';
      const existing = signatures.find(s => s.domain === domain && s.selector === selector);

      if (!existing) {
        const signature: DkimSignature = {
          domain,
          selector,
          algorithm: algorithmMatch ? algorithmMatch[1].trim() : undefined,
          result: 'none', // We don't know the result from the header alone
        };

        if (signature.algorithm && signature.algorithm.toLowerCase().includes('sha1')) {
          signature.isWeak = true;
        }

        signatures.push(signature);
      }
    }
  }

  results.dkim.signatures = signatures;
}

/**
 * Parse DMARC with policy information
 */
function parseDMARC(
  authValue: string,
  results: AuthenticationResults,
  _headers: { name: string; value: string }[]
): void {
  const segments = splitAuthSegments(authValue);

  for (const segment of segments) {
    const lowerSegment = segment.toLowerCase();

    if (lowerSegment.startsWith('dmarc=')) {
      const dmarcResultMatch = segment.match(/dmarc=([a-z]+)/i);
      if (dmarcResultMatch) {
        results.dmarc.result = dmarcResultMatch[1].toLowerCase() as AuthenticationResults['dmarc']['result'];
      }

      // T105: Parse DMARC policy (p=)
      const policyMatch = segment.match(/policy\.(\w+)=([^\s;]+)/i);
      if (policyMatch) {
        results.dmarc.policy = policyMatch[2];
      }

      // T101: Parse alignment mode
      const alignmentMatch = segment.match(/policy\.(dkim|spf)-align=([^\s;]+)/i);
      if (alignmentMatch) {
        results.dmarc.alignmentMode = alignmentMatch[2];
      }
    }
  }
}

/**
 * T104: Parse ARC chain with verification details
 */
function parseARC(
  results: AuthenticationResults,
  _headers: { name: string; value: string }[]
): void {
  const arcSealHeaders = _headers.filter(h => h.name.toLowerCase() === 'arc-seal');
  const chainDetails: ArcChainDetail[] = [];

  // Parse ARC-Seal headers
  for (const sealHeader of arcSealHeaders) {
    const indexMatch = sealHeader.value.match(/i=(\d+)/i);
    const domainMatch = sealHeader.value.match(/d=([^\s;]+)/i);
    const cvMatch = sealHeader.value.match(/cv=([^\s;]+)/i);

    if (indexMatch) {
      const index = parseInt(indexMatch[1], 10);
      const detail: ArcChainDetail = {
        index,
        domain: domainMatch ? domainMatch[1].trim() : undefined,
        result: 'none',
      };

      // cv (chain validation) can be 'none', 'fail', or 'pass'
      if (cvMatch) {
        const cv = cvMatch[1].toLowerCase();
        if (cv === 'fail') {
          detail.result = 'fail';
          detail.isBroken = true;
        } else if (cv === 'pass') {
          detail.result = 'pass';
        }
      }

      chainDetails.push(detail);
    }
  }

  // Sort by index to ensure proper order
  chainDetails.sort((a, b) => a.index - b.index);

  // T104: Detect chain breaks - check if indices are sequential
  if (chainDetails.length > 0) {
    for (let i = 0; i < chainDetails.length - 1; i++) {
      if (chainDetails[i + 1].index !== chainDetails[i].index + 1) {
        chainDetails[i].isBroken = true;
      }
    }

    // Set overall ARC result based on chain
    const lastSeal = chainDetails[chainDetails.length - 1];
    results.arc.result = lastSeal.result;
    results.arc.sealCount = chainDetails.length;
  }

  results.arc.chainDetails = chainDetails;
}

/**
 * T105: Parse BIMI-related headers
 */
function parseBIMI(headers: { name: string; value: string }[]): BimiResults | undefined {
  const bimiSelectorHeader = headers.find(h => h.name.toLowerCase() === 'bimi-selector');
  const bimiIndicatorHeader = headers.find(h => h.name.toLowerCase() === 'bimi-indicator');
  const bimiLocationHeader = headers.find(h => h.name.toLowerCase() === 'bimi-location');

  if (bimiSelectorHeader || bimiIndicatorHeader || bimiLocationHeader) {
    return {
      selector: bimiSelectorHeader?.value.trim(),
      indicator: bimiIndicatorHeader?.value.trim() || bimiLocationHeader?.value.trim(),
      hasValidBimi: !!(bimiIndicatorHeader || bimiLocationHeader),
    };
  }

  return undefined;
}

/**
 * T101: Compute alignment between SPF/DKIM domains and From header
 */
function computeAlignment(results: AuthenticationResults, fromHeader: string): AlignmentResults {
  const fromDomain = extractDomain(fromHeader);
  const alignment: AlignmentResults = {
    spfAligned: false,
    dkimAligned: false,
  };

  // SPF alignment
  if (results.spf.domain && fromDomain) {
    alignment.spfAligned = domainsAlign(results.spf.domain, fromDomain);
    if (!alignment.spfAligned) {
      alignment.spfFromMismatch = `SPF domain '${results.spf.domain}' does not align with From domain '${fromDomain}'`;
    }
  }

  // DKIM alignment
  if (results.dkim.domain && fromDomain) {
    alignment.dkimAligned = domainsAlign(results.dkim.domain, fromDomain);
    if (!alignment.dkimAligned) {
      alignment.dkimFromMismatch = `DKIM domain '${results.dkim.domain}' does not align with From domain '${fromDomain}'`;
    }
  }

  // Check if any DKIM signature aligns
  if (results.dkim.signatures && results.dkim.signatures.length > 0) {
    for (const sig of results.dkim.signatures) {
      if (sig.domain && domainsAlign(sig.domain, fromDomain)) {
        alignment.dkimAligned = true;
        alignment.dkimFromMismatch = undefined;
        break;
      }
    }
  }

  return alignment;
}

/**
 * Check if two domains align (relaxed or strict)
 * Relaxed: organizational domains match (e.g., mail.example.com aligns with example.com)
 * Strict: domains must match exactly
 */
function domainsAlign(domain1: string, domain2: string): boolean {
  const d1 = domain1.toLowerCase().trim();
  const d2 = domain2.toLowerCase().trim();

  // Strict alignment
  if (d1 === d2) {
    return true;
  }

  // Relaxed alignment - check if organizational domains match
  const org1 = getOrganizationalDomain(d1);
  const org2 = getOrganizationalDomain(d2);

  return org1 === org2;
}

/**
 * Extract organizational domain (e.g., mail.google.com -> google.com)
 */
function getOrganizationalDomain(domain: string): string {
  const parts = domain.split('.');
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  return domain;
}

function extractDomain(identifier: string): string {
  const cleaned = identifier.replace(/^<?mailto:/i, '').replace(/[<>]/g, '');
  const atIndex = cleaned.indexOf('@');
  if (atIndex >= 0) {
    return cleaned.slice(atIndex + 1).toLowerCase();
  }
  return cleaned.toLowerCase();
}
