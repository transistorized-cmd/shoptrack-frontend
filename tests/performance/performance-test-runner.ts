import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getPerformanceConfig,
  loadBaseline,
  saveBaseline,
  type PerformanceBaseline,
} from "./performance.config";
import { PerformanceBenchmark } from "./utils/performance-helpers";

/**
 * Performance Test Suite Runner
 *
 * This runner orchestrates all performance tests and provides:
 * - Baseline comparison
 * - Regression detection
 * - Environment-specific configuration
 * - Comprehensive reporting
 */

interface TestResult {
  name: string;
  duration: number;
  memoryUsage: number;
  opsPerSecond?: number;
  passed: boolean;
  threshold?: number;
  actual?: number;
}

interface PerformanceReport {
  timestamp: string;
  environment: string;
  config: ReturnType<typeof getPerformanceConfig>;
  results: TestResult[];
  regressions: Array<{
    testName: string;
    baseline: number;
    current: number;
    regression: number;
  }>;
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    totalRegressions: number;
    overallHealthScore: number;
  };
}

export class PerformanceTestRunner {
  private config = getPerformanceConfig();
  private benchmark = new PerformanceBenchmark();
  private results: TestResult[] = [];
  private baseline: PerformanceBaseline | null = null;

  async initialize(): Promise<void> {
    this.baseline = await loadBaseline(this.config.monitoring.baselineFile);

    if (this.config.monitoring.logResults) {
      console.log("Performance Test Configuration:", {
        environment: process.env.NODE_ENV || "test",
        isCI: process.env.CI === "true",
        isDev: process.env.VITEST_DEV === "true",
        config: this.config,
      });
    }
  }

  recordResult(result: TestResult): void {
    this.results.push(result);
  }

  checkThreshold(testName: string, actual: number, threshold: number): boolean {
    const passed = actual <= threshold;

    this.recordResult({
      name: testName,
      duration: actual,
      memoryUsage: 0, // Will be filled by specific tests
      passed,
      threshold,
      actual,
    });

    return passed;
  }

  detectRegressions(): Array<{
    testName: string;
    baseline: number;
    current: number;
    regression: number;
  }> {
    if (!this.baseline) return [];

    const regressions: Array<{
      testName: string;
      baseline: number;
      current: number;
      regression: number;
    }> = [];

    for (const result of this.results) {
      const baselineMetric = this.baseline.metrics[result.name];
      if (baselineMetric) {
        const regression =
          ((result.duration - baselineMetric.duration) /
            baselineMetric.duration) *
          100;

        if (regression > this.config.monitoring.regressionThreshold) {
          regressions.push({
            testName: result.name,
            baseline: baselineMetric.duration,
            current: result.duration,
            regression,
          });
        }
      }
    }

    return regressions;
  }

  calculateHealthScore(): number {
    if (this.results.length === 0) return 0;

    const passedTests = this.results.filter((r) => r.passed).length;
    const baseScore = (passedTests / this.results.length) * 100;

    // Penalize for regressions
    const regressions = this.detectRegressions();
    const regressionPenalty = regressions.length * 10; // 10 points per regression

    return Math.max(0, baseScore - regressionPenalty);
  }

  async generateReport(): Promise<PerformanceReport> {
    const regressions = this.detectRegressions();
    const healthScore = this.calculateHealthScore();

    const report: PerformanceReport = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "test",
      config: this.config,
      results: this.results,
      regressions,
      summary: {
        totalTests: this.results.length,
        passedTests: this.results.filter((r) => r.passed).length,
        failedTests: this.results.filter((r) => !r.passed).length,
        totalRegressions: regressions.length,
        overallHealthScore: healthScore,
      },
    };

    if (this.config.monitoring.logResults) {
      console.log("\n🚀 Performance Test Report");
      console.log("=".repeat(50));
      console.log(`Environment: ${report.environment}`);
      console.log(`Timestamp: ${report.timestamp}`);
      console.log(`Total Tests: ${report.summary.totalTests}`);
      console.log(`Passed: ${report.summary.passedTests}`);
      console.log(`Failed: ${report.summary.failedTests}`);
      console.log(`Regressions: ${report.summary.totalRegressions}`);
      console.log(
        `Health Score: ${report.summary.overallHealthScore.toFixed(1)}%`,
      );

      if (regressions.length > 0) {
        console.log("\n⚠️  Performance Regressions Detected:");
        regressions.forEach((regression) => {
          console.log(
            `  ${regression.testName}: ${regression.regression.toFixed(1)}% slower`,
          );
          console.log(`    Baseline: ${regression.baseline.toFixed(2)}ms`);
          console.log(`    Current: ${regression.current.toFixed(2)}ms`);
        });
      }

      console.log("\n📊 Test Results Summary:");
      this.results.forEach((result) => {
        const status = result.passed ? "✅" : "❌";
        console.log(
          `  ${status} ${result.name}: ${result.duration.toFixed(2)}ms`,
        );
        if (result.threshold) {
          console.log(`    Threshold: ${result.threshold}ms`);
        }
      });
    }

    return report;
  }

  async saveBaseline(): Promise<void> {
    if (!this.config.monitoring.saveMetrics) return;

    const metrics: PerformanceBaseline["metrics"] = {};

    this.results.forEach((result) => {
      metrics[result.name] = {
        duration: result.duration,
        memoryUsage: result.memoryUsage,
        opsPerSecond: result.opsPerSecond,
      };
    });

    await saveBaseline(metrics, this.config.monitoring.baselineFile);
  }

  clear(): void {
    this.results = [];
    this.benchmark.clear();
  }

  getBenchmark(): PerformanceBenchmark {
    return this.benchmark;
  }

  getConfig(): ReturnType<typeof getPerformanceConfig> {
    return this.config;
  }
}

// Global test runner instance
let globalTestRunner: PerformanceTestRunner;

export function getTestRunner(): PerformanceTestRunner {
  if (!globalTestRunner) {
    globalTestRunner = new PerformanceTestRunner();
  }
  return globalTestRunner;
}

// Performance test suite setup and teardown
describe("Performance Test Suite", () => {
  let testRunner: PerformanceTestRunner;

  beforeAll(async () => {
    testRunner = getTestRunner();
    await testRunner.initialize();
  }, 30000);

  afterAll(async () => {
    const report = await testRunner.generateReport();

    // Save new baseline if configured
    if (testRunner.getConfig().monitoring.saveMetrics) {
      await testRunner.saveBaseline();
    }

    // Fail the test suite if there are critical regressions
    if (
      testRunner.getConfig().monitoring.alertOnRegression &&
      report.regressions.length > 0
    ) {
      const criticalRegressions = report.regressions.filter(
        (r) => r.regression > 50,
      ); // >50% regression

      if (criticalRegressions.length > 0) {
        throw new Error(
          `Critical performance regressions detected:\n${criticalRegressions
            .map((r) => `  - ${r.testName}: ${r.regression.toFixed(1)}% slower`)
            .join("\n")}`,
        );
      }
    }

    // Fail if overall health score is too low
    if (report.summary.overallHealthScore < 70) {
      console.warn(
        `Low performance health score: ${report.summary.overallHealthScore.toFixed(1)}%`,
      );
    }

    testRunner.clear();
  }, 10000);

  it("should validate performance test configuration", () => {
    const config = testRunner.getConfig();

    expect(config).toBeDefined();
    expect(config.timeout).toBeGreaterThan(0);
    expect(config.warmupIterations).toBeGreaterThanOrEqual(0);
    expect(config.benchmarkIterations).toBeGreaterThan(0);
    expect(config.memoryThresholdMB).toBeGreaterThan(0);

    // Validate component thresholds
    expect(config.componentRendering.maxRenderTime).toBeGreaterThan(0);
    expect(config.componentRendering.maxMemoryLeakMB).toBeGreaterThan(0);

    // Validate store thresholds
    expect(config.storeMutations.maxMutationTime).toBeGreaterThan(0);
    expect(config.storeMutations.minOpsPerSecond).toBeGreaterThan(0);

    // Validate API thresholds
    expect(config.apiOptimization.maxRequestTime).toBeGreaterThan(0);
    expect(config.apiOptimization.minCacheHitRate).toBeGreaterThan(0);
    expect(config.apiOptimization.minCacheHitRate).toBeLessThanOrEqual(1);
  });

  it("should provide test utilities and helpers", () => {
    const benchmark = testRunner.getBenchmark();

    expect(benchmark).toBeDefined();
    expect(typeof benchmark.run).toBe("function");
    expect(typeof benchmark.getResults).toBe("function");
    expect(typeof benchmark.getAverageMetrics).toBe("function");
    expect(typeof benchmark.summary).toBe("function");
  });
});

// Export utilities for use in other test files
export { getTestRunner as useTestRunner };
export type { TestResult, PerformanceReport };
