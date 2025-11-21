// src/shared/analysis-timeouts.ts
// T604: Timeout/guardrails for heavy analysis stages with partial-analysis notifications

export interface AnalysisStageConfig {
  name: string;
  timeoutMs: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface AnalysisStageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  timedOut: boolean;
  duration: number;
  stage: string;
}

export interface PartialAnalysisResult {
  completedStages: string[];
  failedStages: string[];
  timedOutStages: string[];
  partialData: any;
  isComplete: boolean;
  warnings: string[];
}

// Default timeout configurations for different analysis stages
export const DEFAULT_STAGE_TIMEOUTS: { [key: string]: AnalysisStageConfig } = {
  authentication: {
    name: 'Authentication Analysis',
    timeoutMs: 2000, // 2 seconds - critical for basic security
    priority: 'critical',
  },
  headers: {
    name: 'Header Analysis',
    timeoutMs: 1500, // 1.5 seconds - important for routing analysis
    priority: 'high',
  },
  domain: {
    name: 'Domain Analysis',
    timeoutMs: 3000, // 3 seconds - may involve lookups
    priority: 'high',
  },
  contentBasic: {
    name: 'Basic Content Analysis',
    timeoutMs: 2000, // 2 seconds - links, IBANs, basic patterns
    priority: 'high',
  },
  nlp: {
    name: 'NLP Analysis',
    timeoutMs: 3000, // 3 seconds - text analysis
    priority: 'medium',
  },
  qrCode: {
    name: 'QR Code Decoding',
    timeoutMs: 5000, // 5 seconds - image processing
    priority: 'low',
  },
  ocr: {
    name: 'OCR Analysis',
    timeoutMs: 10000, // 10 seconds - heavy computation
    priority: 'low',
  },
  attachments: {
    name: 'Attachment Analysis',
    timeoutMs: 4000, // 4 seconds - file inspection
    priority: 'medium',
  },
  urlLookup: {
    name: 'URL Reputation Lookup',
    timeoutMs: 5000, // 5 seconds - network call
    priority: 'low',
  },
};

/**
 * Execute an analysis stage with timeout protection
 */
export async function executeWithTimeout<T>(
  stageName: string,
  operation: () => Promise<T>,
  config?: AnalysisStageConfig
): Promise<AnalysisStageResult<T>> {
  const stageConfig = config || DEFAULT_STAGE_TIMEOUTS[stageName];
  const startTime = performance.now();

  if (!stageConfig) {
    console.warn(`[Timeout Guard] No config for stage: ${stageName}, using default 5s timeout`);
  }

  const timeoutMs = stageConfig?.timeoutMs || 5000;

  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout: ${stageName} exceeded ${timeoutMs}ms`));
      }, timeoutMs);
    });

    // Race between operation and timeout
    const data = await Promise.race([operation(), timeoutPromise]);

    const duration = performance.now() - startTime;

    return {
      success: true,
      data,
      timedOut: false,
      duration,
      stage: stageName,
    };
  } catch (error) {
    const duration = performance.now() - startTime;
    const isTimeout = error instanceof Error && error.message.includes('Timeout');

    console.warn(`[Timeout Guard] Stage "${stageName}" ${isTimeout ? 'timed out' : 'failed'}:`, error);

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timedOut: isTimeout,
      duration,
      stage: stageName,
    };
  }
}

/**
 * Execute multiple analysis stages with timeout protection
 * Returns partial results if some stages fail/timeout
 */
export async function executeMultipleStages<T extends { [key: string]: any }>(
  stages: { [K in keyof T]: { operation: () => Promise<T[K]>; config?: AnalysisStageConfig } }
): Promise<PartialAnalysisResult> {
  const completedStages: string[] = [];
  const failedStages: string[] = [];
  const timedOutStages: string[] = [];
  const partialData: any = {};
  const warnings: string[] = [];

  // Execute all stages concurrently
  const stageEntries = Object.entries(stages);
  const results = await Promise.allSettled(
    stageEntries.map(async ([stageName, { operation, config }]) => {
      const result = await executeWithTimeout(stageName, operation, config);
      return { stageName, result };
    })
  );

  // Process results
  for (const promiseResult of results) {
    if (promiseResult.status === 'fulfilled') {
      const { stageName, result } = promiseResult.value;

      if (result.success && result.data !== undefined) {
        completedStages.push(stageName);
        partialData[stageName] = result.data;

        // Log slow operations
        if (result.duration > 2000) {
          warnings.push(`Stage "${stageName}" was slow (${Math.round(result.duration)}ms)`);
        }
      } else if (result.timedOut) {
        timedOutStages.push(stageName);
        warnings.push(`Stage "${stageName}" timed out after ${result.duration.toFixed(0)}ms`);
      } else {
        failedStages.push(stageName);
        warnings.push(`Stage "${stageName}" failed: ${result.error}`);
      }
    } else {
      // Promise itself was rejected (shouldn't happen with executeWithTimeout, but handle it)
      const stageName = stageEntries.find(([name]) => name)?.[0] || 'unknown';
      failedStages.push(stageName);
      warnings.push(`Stage "${stageName}" promise rejected: ${promiseResult.reason}`);
    }
  }

  const isComplete = failedStages.length === 0 && timedOutStages.length === 0;

  return {
    completedStages,
    failedStages,
    timedOutStages,
    partialData,
    isComplete,
    warnings,
  };
}

/**
 * Execute stages in priority order (critical first)
 * Stop if critical stages fail, continue for optional stages
 */
export async function executeStagesWithPriority<T extends { [key: string]: any }>(
  stages: { [K in keyof T]: { operation: () => Promise<T[K]>; config: AnalysisStageConfig } }
): Promise<PartialAnalysisResult> {
  const completedStages: string[] = [];
  const failedStages: string[] = [];
  const timedOutStages: string[] = [];
  const partialData: any = {};
  const warnings: string[] = [];

  // Group stages by priority
  const priorityGroups: { [key: string]: Array<[string, any]> } = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };

  for (const [stageName, stageInfo] of Object.entries(stages)) {
    const priority = stageInfo.config.priority;
    priorityGroups[priority].push([stageName, stageInfo]);
  }

  // Execute in priority order
  const priorityOrder = ['critical', 'high', 'medium', 'low'];
  let shouldContinue = true;

  for (const priority of priorityOrder) {
    if (!shouldContinue) {
      // Skip remaining stages if critical ones failed
      for (const [stageName] of priorityGroups[priority]) {
        warnings.push(`Stage "${stageName}" skipped due to critical failure`);
      }
      continue;
    }

    const groupStages = priorityGroups[priority];
    if (groupStages.length === 0) continue;

    // Execute all stages in this priority group concurrently
    const results = await Promise.allSettled(
      groupStages.map(async ([stageName, { operation, config }]) => {
        const result = await executeWithTimeout(stageName, operation, config);
        return { stageName, result };
      })
    );

    // Process results
    for (const promiseResult of results) {
      if (promiseResult.status === 'fulfilled') {
        const { stageName, result } = promiseResult.value;

        if (result.success && result.data !== undefined) {
          completedStages.push(stageName);
          partialData[stageName] = result.data;
        } else if (result.timedOut) {
          timedOutStages.push(stageName);
          warnings.push(`Stage "${stageName}" timed out after ${result.duration.toFixed(0)}ms`);

          // Stop if critical stage times out
          if (priority === 'critical') {
            shouldContinue = false;
            warnings.push('Critical stage timed out - skipping remaining analysis');
          }
        } else {
          failedStages.push(stageName);
          warnings.push(`Stage "${stageName}" failed: ${result.error}`);

          // Stop if critical stage fails
          if (priority === 'critical') {
            shouldContinue = false;
            warnings.push('Critical stage failed - skipping remaining analysis');
          }
        }
      }
    }
  }

  const isComplete = failedStages.length === 0 && timedOutStages.length === 0;

  return {
    completedStages,
    failedStages,
    timedOutStages,
    partialData,
    isComplete,
    warnings,
  };
}

/**
 * Create a notification message for partial analysis
 */
export function formatPartialAnalysisNotification(result: PartialAnalysisResult): string {
  if (result.isComplete) {
    return 'Analysis completed successfully';
  }

  const parts: string[] = ['Analysis completed with warnings:'];

  if (result.timedOutStages.length > 0) {
    parts.push(`- ${result.timedOutStages.length} stage(s) timed out: ${result.timedOutStages.join(', ')}`);
  }

  if (result.failedStages.length > 0) {
    parts.push(`- ${result.failedStages.length} stage(s) failed: ${result.failedStages.join(', ')}`);
  }

  parts.push(`- ${result.completedStages.length} stage(s) completed successfully`);

  return parts.join('\n');
}

/**
 * Determine if partial results are sufficient for risk assessment
 */
export function hasMinimumRequiredData(result: PartialAnalysisResult): {
  sufficient: boolean;
  missing: string[];
} {
  const requiredStages = ['authentication', 'headers', 'domain', 'contentBasic'];
  const missing = requiredStages.filter(stage => !result.completedStages.includes(stage));

  return {
    sufficient: missing.length === 0,
    missing,
  };
}

/**
 * Get recommended action based on partial analysis
 */
export function getPartialAnalysisRecommendation(result: PartialAnalysisResult): {
  canProceed: boolean;
  recommendation: string;
  confidence: 'high' | 'medium' | 'low';
} {
  const { sufficient, missing } = hasMinimumRequiredData(result);

  if (sufficient) {
    return {
      canProceed: true,
      recommendation: 'Core analysis completed. Optional features may be incomplete.',
      confidence: 'high',
    };
  }

  if (missing.some(stage => ['authentication', 'domain'].includes(stage))) {
    return {
      canProceed: false,
      recommendation: 'Critical security checks failed. Cannot provide reliable risk assessment.',
      confidence: 'low',
    };
  }

  return {
    canProceed: true,
    recommendation: 'Partial analysis available. Some security checks incomplete.',
    confidence: 'medium',
  };
}
