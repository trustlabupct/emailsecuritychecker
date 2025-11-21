// src/service-worker/utils/logger.ts

export const logger = {
  debug: (...args: any[]) => console.debug("[TrustEmail Debug]", ...args),
  info: (...args: any[]) => console.info("[TrustEmail Info]", ...args),
  warn: (...args: any[]) => console.warn("[TrustEmail Warn]", ...args),
  error: (...args: any[]) => console.error("[TrustEmail Error]", ...args),
};