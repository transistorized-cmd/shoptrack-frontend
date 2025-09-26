/**
 * Performance Test Configuration
 */

export interface PerformanceTestConfig {
  // Global test settings
  timeout: number;
  warmupIterations: number;
  benchmarkIterations: number;
  memoryThresholdMB: number;
  gcBetweenTests: boolean;

  // Component rendering thresholds
  componentRendering: {
    maxRenderTime: number;
    maxMemoryLeakMB: number;
    maxMountUnmountTime: number;
    maxReRenderTime: number;
  };

  // Store mutation thresholds
  storeMutations: {
    maxMutationTime: number;
    maxBulkOperationTime: number;
    maxComputedPropertyTime: number;
    maxMemoryLeakMB: number;
    minOpsPerSecond: number;
  };

  // API optimization thresholds
  apiOptimization: {
    maxRequestTime: number;
    maxBatchRequestTime: number;
    minCacheHitRate: number;
    maxConcurrentRequests: number;
    maxTimeoutRate: number;
    maxPayloadSizeKB: number;
  };

  // Data generation settings
  dataGeneration: {
    smallDatasetSize: number;
    mediumDatasetSize: number;
    largeDatasetSize: number;
    xlDatasetSize: number;
    maxItemsPerReceipt: number;
    includeImages: boolean;
  };

  // Monitoring and alerting
  monitoring: {
    logResults: boolean;
    saveMetrics: boolean;
    alertOnRegression: boolean;
    regressionThreshold: number; // Percentage increase to trigger alert
    baselineFile?: string;
  };
}

export const defaultPerformanceConfig: PerformanceTestConfig = {
  // Global settings
  timeout: 30000, // 30 seconds
  warmupIterations: 3,
  benchmarkIterations: 10,
  memoryThresholdMB: 50,
  gcBetweenTests: true,

  // Component rendering thresholds (milliseconds)
  componentRendering: {
    maxRenderTime: 100,
    maxMemoryLeakMB: 5,
    maxMountUnmountTime: 50,
    maxReRenderTime: 30,
  },

  // Store mutation thresholds
  storeMutations: {
    maxMutationTime: 50,
    maxBulkOperationTime: 200,
    maxComputedPropertyTime: 10,
    maxMemoryLeakMB: 10,
    minOpsPerSecond: 100,
  },

  // API optimization thresholds
  apiOptimization: {
    maxRequestTime: 200,
    maxBatchRequestTime: 500,
    minCacheHitRate: 0.7,
    maxConcurrentRequests: 50,
    maxTimeoutRate: 0.1,
    maxPayloadSizeKB: 1024, // 1MB
  },

  // Data generation settings
  dataGeneration: {
    smallDatasetSize: 100,
    mediumDatasetSize: 500,
    largeDatasetSize: 1000,
    xlDatasetSize: 2500,
    maxItemsPerReceipt: 30,
    includeImages: false, // Set to true for memory-intensive tests
  },

  // Monitoring settings
  monitoring: {
    logResults: true,
    saveMetrics: true,
    alertOnRegression: true,
    regressionThreshold: 20, // 20% performance regression triggers alert
    baselineFile: "tests/performance/baselines.json",
  },
};

export const ciPerformanceConfig: PerformanceTestConfig = {
  ...defaultPerformanceConfig,
  // Adjust for CI environment
  warmupIterations: 1,
  benchmarkIterations: 5,
  memoryThresholdMB: 100, // More lenient in CI
  componentRendering: {
    ...defaultPerformanceConfig.componentRendering,
    maxRenderTime: 200, // More lenient in CI
    maxMemoryLeakMB: 10,
  },
  storeMutations: {
    ...defaultPerformanceConfig.storeMutations,
    maxMutationTime: 100,
    maxBulkOperationTime: 400,
    minOpsPerSecond: 50,
  },
  apiOptimization: {
    ...defaultPerformanceConfig.apiOptimization,
    maxRequestTime: 400,
    maxBatchRequestTime: 1000,
    minCacheHitRate: 0.6,
  },
};

export const developmentConfig: PerformanceTestConfig = {
  ...defaultPerformanceConfig,
  // Faster iterations for development
  warmupIterations: 1,
  benchmarkIterations: 3,
  dataGeneration: {
    ...defaultPerformanceConfig.dataGeneration,
    smallDatasetSize: 50,
    mediumDatasetSize: 200,
    largeDatasetSize: 500,
    xlDatasetSize: 1000,
  },
  monitoring: {
    ...defaultPerformanceConfig.monitoring,
    logResults: true,
    saveMetrics: false,
    alertOnRegression: false,
  },
};

/**
 * Get performance config based on environment
 */
export function getPerformanceConfig(): PerformanceTestConfig {
  const env = process.env.NODE_ENV || "test";
  const isDevelopment = process.env.VITEST_DEV === "true";
  const isCI = process.env.CI === "true";

  if (isDevelopment) {
    return developmentConfig;
  }

  if (isCI) {
    return ciPerformanceConfig;
  }

  return defaultPerformanceConfig;
}

/**
 * Environment-specific test patterns
 */
export const testPatterns = {
  development: ["**/performance/**/*.test.ts"],
  ci: [
    "**/performance/components/*.test.ts",
    "**/performance/stores/*.test.ts",
    "**/performance/api/*.test.ts",
  ],
  full: ["**/performance/**/*.test.ts"],
};

/**
 * Performance test categories for selective running
 */
export const testCategories = {
  rendering: ["tests/performance/components/rendering.performance.test.ts"],
  store: ["tests/performance/stores/mutations.performance.test.ts"],
  api: ["tests/performance/api/optimization.performance.test.ts"],
  memory: [
    // Tests that focus specifically on memory leaks
    "tests/performance/components/rendering.performance.test.ts",
    "tests/performance/stores/mutations.performance.test.ts",
  ],
  concurrency: [
    // Tests that focus on concurrent operations
    "tests/performance/api/optimization.performance.test.ts",
  ],
};

/**
 * Baseline performance metrics for regression detection
 */
export interface PerformanceBaseline {
  timestamp: string;
  environment: string;
  metrics: {
    [testName: string]: {
      duration: number;
      memoryUsage: number;
      opsPerSecond?: number;
    };
  };
}

/**
 * Helper to load baseline metrics
 */
export async function loadBaseline(
  baselineFile?: string,
): Promise<PerformanceBaseline | null> {
  const file = baselineFile || defaultPerformanceConfig.monitoring.baselineFile;
  if (!file) return null;

  try {
    const fs = await import("fs/promises");
    const data = await fs.readFile(file, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.warn(`Could not load baseline from ${file}:`, error.message);
    return null;
  }
}

/**
 * Helper to save baseline metrics
 */
export async function saveBaseline(
  metrics: PerformanceBaseline["metrics"],
  baselineFile?: string,
): Promise<void> {
  const file = baselineFile || defaultPerformanceConfig.monitoring.baselineFile;
  if (!file) return;

  const baseline: PerformanceBaseline = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "test",
    metrics,
  };

  try {
    const fs = await import("fs/promises");
    const path = await import("path");

    // Ensure directory exists
    await fs.mkdir(path.dirname(file), { recursive: true });

    await fs.writeFile(file, JSON.stringify(baseline, null, 2));
    console.log(`Baseline saved to ${file}`);
  } catch (error) {
    console.warn(`Could not save baseline to ${file}:`, error.message);
  }
}
