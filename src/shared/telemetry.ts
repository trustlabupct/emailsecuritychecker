// src/shared/telemetry.ts
// T606: Telemetry for Gmail integration resilience and DOM strategy tracking

export interface TelemetryEvent {
  timestamp: number;
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: { [key: string]: any };
}

export interface DomStrategyEvent {
  strategy: string;
  success: boolean;
  fallbackUsed: boolean;
  attemptNumber: number;
  duration: number;
  errorMessage?: string;
}

export interface AnalysisPerformanceMetrics {
  totalDuration: number;
  stageMetrics: {
    [stageName: string]: {
      duration: number;
      success: boolean;
      attempts: number;
    };
  };
  parsingQuality: 'high' | 'medium' | 'low';
  dataCompleteness: number; // 0-100
}

export interface GmailIntegrationMetrics {
  threadIdExtractionSuccess: boolean;
  threadIdExtractionAttempts: number;
  threadIdExtractionMethod: string;
  domMutationCount: number;
  gmailApiCalls: number;
  gmailApiErrors: number;
}

/**
 * Telemetry storage and collection system
 * All data is stored locally only (privacy-first)
 */
class TelemetryManager {
  private events: TelemetryEvent[] = [];
  private maxEvents = 500; // Limit storage
  private enabled = true;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Record a telemetry event
   */
  async recordEvent(
    category: string,
    action: string,
    label?: string,
    value?: number,
    metadata?: { [key: string]: any }
  ): Promise<void> {
    if (!this.enabled) return;

    const event: TelemetryEvent = {
      timestamp: Date.now(),
      category,
      action,
      label,
      value,
      metadata,
    };

    this.events.push(event);

    // Prune old events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Persist to storage
    await this.persist();

    // Log in development (can be enabled via browser console)
    // console.log('[Telemetry]', category, action, { label, value, metadata });
  }

  /**
   * Record DOM strategy attempt for Gmail integration
   */
  async recordDomStrategy(event: DomStrategyEvent): Promise<void> {
    await this.recordEvent('gmail_integration', 'dom_strategy', event.strategy, undefined, {
      success: event.success,
      fallbackUsed: event.fallbackUsed,
      attemptNumber: event.attemptNumber,
      duration: event.duration,
      errorMessage: event.errorMessage,
    });
  }

  /**
   * Record analysis performance metrics
   */
  async recordAnalysisPerformance(metrics: AnalysisPerformanceMetrics): Promise<void> {
    await this.recordEvent('analysis', 'performance', undefined, metrics.totalDuration, {
      stageMetrics: metrics.stageMetrics,
      parsingQuality: metrics.parsingQuality,
      dataCompleteness: metrics.dataCompleteness,
    });
  }

  /**
   * Record Gmail integration metrics
   */
  async recordGmailIntegration(metrics: GmailIntegrationMetrics): Promise<void> {
    await this.recordEvent('gmail_integration', 'metrics', undefined, undefined, metrics);
  }

  /**
   * Record parsing failure for diagnostics
   */
  async recordParsingFailure(stage: string, errorMessage: string, context?: any): Promise<void> {
    await this.recordEvent('parsing', 'failure', stage, undefined, {
      errorMessage,
      context: sanitizeContext(context),
    });
  }

  /**
   * Record user action
   */
  async recordUserAction(action: string, metadata?: any): Promise<void> {
    await this.recordEvent('user', 'action', action, undefined, metadata);
  }

  /**
   * Get events by category
   */
  async getEventsByCategory(category: string, limit?: number): Promise<TelemetryEvent[]> {
    const filtered = this.events.filter(e => e.category === category);
    return limit ? filtered.slice(-limit) : filtered;
  }

  /**
   * Get DOM strategy success rate
   */
  async getDomStrategyStats(): Promise<{
    totalAttempts: number;
    successfulAttempts: number;
    successRate: number;
    strategyBreakdown: { [strategy: string]: { attempts: number; successes: number } };
  }> {
    const domEvents = await this.getEventsByCategory('gmail_integration');
    const strategyEvents = domEvents.filter(e => e.action === 'dom_strategy');

    const strategyBreakdown: { [strategy: string]: { attempts: number; successes: number } } = {};
    let totalAttempts = 0;
    let successfulAttempts = 0;

    for (const event of strategyEvents) {
      const strategy = event.label || 'unknown';
      const success = event.metadata?.success || false;

      if (!strategyBreakdown[strategy]) {
        strategyBreakdown[strategy] = { attempts: 0, successes: 0 };
      }

      strategyBreakdown[strategy].attempts++;
      totalAttempts++;

      if (success) {
        strategyBreakdown[strategy].successes++;
        successfulAttempts++;
      }
    }

    return {
      totalAttempts,
      successfulAttempts,
      successRate: totalAttempts > 0 ? successfulAttempts / totalAttempts : 0,
      strategyBreakdown,
    };
  }

  /**
   * Get analysis performance statistics
   */
  async getAnalysisPerformanceStats(): Promise<{
    averageDuration: number;
    p95Duration: number;
    averageCompleteness: number;
    parsingQualityDistribution: { high: number; medium: number; low: number };
  }> {
    const analysisEvents = await this.getEventsByCategory('analysis');
    const perfEvents = analysisEvents.filter(e => e.action === 'performance');

    if (perfEvents.length === 0) {
      return {
        averageDuration: 0,
        p95Duration: 0,
        averageCompleteness: 0,
        parsingQualityDistribution: { high: 0, medium: 0, low: 0 },
      };
    }

    // Calculate average duration
    const durations = perfEvents.map(e => e.value || 0);
    const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

    // Calculate p95 duration
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedDurations.length * 0.95);
    const p95Duration = sortedDurations[p95Index] || 0;

    // Calculate average completeness
    const completeness = perfEvents
      .map(e => e.metadata?.dataCompleteness || 0)
      .filter(c => c > 0);
    const averageCompleteness =
      completeness.length > 0 ? completeness.reduce((a, b) => a + b, 0) / completeness.length : 0;

    // Parsing quality distribution
    const qualityDist = { high: 0, medium: 0, low: 0 };
    for (const event of perfEvents) {
      const quality = event.metadata?.parsingQuality;
      if (quality && quality in qualityDist) {
        qualityDist[quality as keyof typeof qualityDist]++;
      }
    }

    return {
      averageDuration,
      p95Duration,
      averageCompleteness,
      parsingQualityDistribution: qualityDist,
    };
  }

  /**
   * Get parsing failure statistics
   */
  async getParsingFailureStats(): Promise<{
    totalFailures: number;
    failuresByStage: { [stage: string]: number };
    commonErrors: Array<{ message: string; count: number }>;
  }> {
    const parsingEvents = await this.getEventsByCategory('parsing');
    const failureEvents = parsingEvents.filter(e => e.action === 'failure');

    const failuresByStage: { [stage: string]: number } = {};
    const errorCounts: { [error: string]: number } = {};

    for (const event of failureEvents) {
      const stage = event.label || 'unknown';
      const errorMessage = event.metadata?.errorMessage || 'unknown error';

      failuresByStage[stage] = (failuresByStage[stage] || 0) + 1;
      errorCounts[errorMessage] = (errorCounts[errorMessage] || 0) + 1;
    }

    // Get top 10 common errors
    const commonErrors = Object.entries(errorCounts)
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalFailures: failureEvents.length,
      failuresByStage,
      commonErrors,
    };
  }

  /**
   * Get health report
   */
  async getHealthReport(): Promise<{
    overallHealth: 'good' | 'degraded' | 'poor';
    domStrategyHealth: number; // 0-100
    analysisPerformanceHealth: number; // 0-100
    parsingHealth: number; // 0-100
    recommendations: string[];
  }> {
    const domStats = await this.getDomStrategyStats();
    const perfStats = await this.getAnalysisPerformanceStats();
    const failureStats = await getParsingFailureStats();

    // Calculate health scores
    const domStrategyHealth = Math.round(domStats.successRate * 100);
    const analysisPerformanceHealth = Math.min(
      100,
      Math.round((1 - perfStats.averageDuration / 10000) * 100)
    );
    const parsingHealth = Math.max(0, 100 - failureStats.totalFailures);

    // Overall health
    const avgHealth = (domStrategyHealth + analysisPerformanceHealth + parsingHealth) / 3;
    let overallHealth: 'good' | 'degraded' | 'poor';
    if (avgHealth >= 80) overallHealth = 'good';
    else if (avgHealth >= 50) overallHealth = 'degraded';
    else overallHealth = 'poor';

    // Generate recommendations
    const recommendations: string[] = [];
    if (domStrategyHealth < 80) {
      recommendations.push('DOM extraction reliability is low - Gmail UI may have changed');
    }
    if (analysisPerformanceHealth < 70) {
      recommendations.push('Analysis is slow - consider disabling heavy features (OCR, QR)');
    }
    if (parsingHealth < 80) {
      recommendations.push('Parsing failures detected - email parsing may need improvements');
    }
    if (perfStats.averageCompleteness < 70) {
      recommendations.push('Data completeness is low - check postal-mime fallbacks');
    }

    return {
      overallHealth,
      domStrategyHealth,
      analysisPerformanceHealth,
      parsingHealth,
      recommendations,
    };
  }

  /**
   * Persist events to storage
   */
  private async persist(): Promise<void> {
    if (this.saveTimeout) return;

    this.saveTimeout = setTimeout(async () => {
      try {
        await chrome.storage.local.set({ telemetryEvents: this.events });
      } catch (error) {
        console.error('[Telemetry] Failed to persist events:', error);
      } finally {
        this.saveTimeout = null;
      }
    }, 2000); // Batch writes to avoid thrashing storage
  }

  /**
   * Load events from storage
   */
  async load(): Promise<void> {
    try {
      const { telemetryEvents } = await chrome.storage.local.get('telemetryEvents');
      if (telemetryEvents && Array.isArray(telemetryEvents)) {
        this.events = telemetryEvents;
      }
    } catch (error) {
      console.error('[Telemetry] Failed to load events:', error);
    }
  }

  /**
   * Clear all telemetry data
   */
  async clear(): Promise<void> {
    this.events = [];
    await chrome.storage.local.remove('telemetryEvents');
  }

  /**
   * Enable or disable telemetry
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Export telemetry data for debugging
   */
  async exportData(): Promise<string> {
    const stats = {
      domStrategy: await this.getDomStrategyStats(),
      performance: await this.getAnalysisPerformanceStats(),
      failures: await this.getParsingFailureStats(),
      health: await this.getHealthReport(),
      recentEvents: this.events.slice(-50),
    };

    return JSON.stringify(stats, null, 2);
  }
}

// Singleton instance
export const telemetry = new TelemetryManager();

// Helper function for parsing failures
async function getParsingFailureStats() {
  return await telemetry.getParsingFailureStats();
}

function sanitizeContext(context: any): any {
  if (!context) return undefined;
  try {
    if (typeof context === 'string') {
      return context.length > 200 ? `${context.slice(0, 200)}…` : context;
    }
    if (typeof context === 'object') {
      // Avoid storing raw bodies/headers; only keep shallow keys
      const shallowCopy: Record<string, any> = {};
      Object.keys(context).slice(0, 10).forEach(key => {
        const value = context[key];
        if (typeof value === 'string') {
          shallowCopy[key] = value.length > 100 ? `${value.slice(0, 100)}…` : value;
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          shallowCopy[key] = value;
        } else {
          shallowCopy[key] = '[redacted]';
        }
      });
      return shallowCopy;
    }
  } catch {
    // fall through
  }
  return undefined;
}

// Initialize telemetry on module load
telemetry.load();

/**
 * Helper function to wrap DOM extraction with telemetry
 */
export async function trackDomExtraction<T>(
  strategy: string,
  operation: () => T | Promise<T>,
  attemptNumber: number = 1
): Promise<T | null> {
  const startTime = performance.now();
  let success = false;
  let result: T | null = null;
  let errorMessage: string | undefined;

  try {
    result = await Promise.resolve(operation());
    success = result !== null && result !== undefined;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  } finally {
    const duration = performance.now() - startTime;

    await telemetry.recordDomStrategy({
      strategy,
      success,
      fallbackUsed: attemptNumber > 1,
      attemptNumber,
      duration,
      errorMessage,
    });
  }

  return result;
}

/**
 * Helper function to track analysis stage performance
 */
export async function trackAnalysisStage<T>(
  stageName: string,
  operation: () => Promise<T>
): Promise<{ result: T | null; duration: number; success: boolean }> {
  const startTime = performance.now();
  let success = false;
  let result: T | null = null;

  try {
    result = await operation();
    success = true;
  } catch (error) {
    console.error(`[Telemetry] Stage ${stageName} failed:`, error);
    await telemetry.recordParsingFailure(
      stageName,
      error instanceof Error ? error.message : String(error)
    );
  }

  const duration = performance.now() - startTime;

  return { result, duration, success };
}
