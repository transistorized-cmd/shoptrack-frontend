/**
 * Performance monitoring utilities for integration tests
 * Provides comprehensive performance tracking, metrics collection, and reporting
 */

import { TestCategory } from "./categories";

// Extend Performance interface for Chrome-specific memory API
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: PerformanceMemory;
}

// Extend globalThis for test metrics storage
declare global {
  // eslint-disable-next-line no-var
  var testMetrics: PerformanceMetrics[] | undefined;
}

// Performance metrics interface
export interface PerformanceMetrics {
  testName: string;
  category: TestCategory[];
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage?: {
    initial: number;
    peak: number;
    final: number;
    delta: number;
  };
  networkMetrics?: {
    requestCount: number;
    totalBytes: number;
    averageResponseTime: number;
    slowestRequest: number;
  };
  renderMetrics?: {
    componentsRendered: number;
    rerenderCount: number;
    domUpdates: number;
  };
  userInteractionMetrics?: {
    clicksPerformed: number;
    inputsChanged: number;
    navigationEvents: number;
  };
  thresholds: PerformanceThresholds;
  violations: PerformanceViolation[];
  passed: boolean;
}

// Performance thresholds configuration
export interface PerformanceThresholds {
  maxDuration: number;
  maxMemoryUsage: number;
  maxNetworkRequests: number;
  maxResponseTime: number;
  maxRerenders: number;
}

// Performance violation details
export interface PerformanceViolation {
  metric: string;
  threshold: number;
  actual: number;
  severity: "warning" | "error" | "critical";
  message: string;
}

// Network request tracking
interface NetworkRequest {
  url: string;
  method: string;
  startTime: number;
  endTime: number;
  duration: number;
  size: number;
  status: number;
}

// Render tracking
interface RenderInfo {
  componentName: string;
  renderTime: number;
  isRerender: boolean;
  props: any;
}

// Performance monitoring class
export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private networkRequests: NetworkRequest[] = [];
  private renderInfo: RenderInfo[] = [];
  private memorySnapshots: number[] = [];
  private userInteractions: { type: string; timestamp: number }[] = [];
  private originalFetch: typeof fetch;
  private performanceObserver?: PerformanceObserver;

  constructor(
    testName: string,
    categories: TestCategory[],
    thresholds?: Partial<PerformanceThresholds>,
  ) {
    this.metrics = {
      testName,
      category: categories,
      startTime: 0,
      endTime: 0,
      duration: 0,
      thresholds: {
        maxDuration: this.getDefaultThreshold("duration", categories),
        maxMemoryUsage: this.getDefaultThreshold("memory", categories),
        maxNetworkRequests: this.getDefaultThreshold("network", categories),
        maxResponseTime: this.getDefaultThreshold("response", categories),
        maxRerenders: this.getDefaultThreshold("rerenders", categories),
        ...thresholds,
      },
      violations: [],
      passed: false,
    };

    this.originalFetch = globalThis.fetch;
    this.setupNetworkMonitoring();
    this.setupPerformanceObserver();
  }

  // Start performance monitoring
  start(): void {
    this.metrics.startTime = performance.now();
    this.takeMemorySnapshot();

    // Mark test start for performance timeline
    performance.mark(`test-start-${this.metrics.testName}`);

    console.log(
      `🚀 Performance monitoring started for: ${this.metrics.testName}`,
    );
  }

  // Stop performance monitoring and calculate metrics
  stop(): PerformanceMetrics {
    this.metrics.endTime = performance.now();
    this.metrics.duration = this.metrics.endTime - this.metrics.startTime;

    performance.mark(`test-end-${this.metrics.testName}`);
    performance.measure(
      `test-duration-${this.metrics.testName}`,
      `test-start-${this.metrics.testName}`,
      `test-end-${this.metrics.testName}`,
    );

    this.takeMemorySnapshot();
    this.calculateNetworkMetrics();
    this.calculateRenderMetrics();
    this.calculateUserInteractionMetrics();
    this.calculateMemoryMetrics();
    this.evaluatePerformance();
    this.cleanup();

    this.logResults();
    return this.metrics;
  }

  // Track user interactions
  trackUserInteraction(type: string): void {
    this.userInteractions.push({
      type,
      timestamp: performance.now(),
    });
  }

  // Track component render
  trackRender(componentName: string, props: any, isRerender = false): void {
    this.renderInfo.push({
      componentName,
      renderTime: performance.now(),
      isRerender,
      props,
    });
  }

  // Get default performance thresholds based on test categories
  private getDefaultThreshold(
    type: string,
    categories: TestCategory[],
  ): number {
    const isFast = categories.includes(TestCategory.FAST);
    const isSlow = categories.includes(TestCategory.SLOW);
    const isIntegration = categories.includes(TestCategory.INTEGRATION);
    const isPerformance = categories.includes(TestCategory.PERFORMANCE);

    switch (type) {
      case "duration":
        if (isFast) return 500; // 500ms for fast tests
        if (isSlow || isPerformance) return 10000; // 10s for slow/performance tests
        if (isIntegration) return 3000; // 3s for integration tests
        return 1000; // 1s default

      case "memory":
        if (isPerformance) return 100 * 1024 * 1024; // 100MB for performance tests
        if (isIntegration) return 50 * 1024 * 1024; // 50MB for integration tests
        return 20 * 1024 * 1024; // 20MB default

      case "network":
        if (isPerformance) return 50; // Up to 50 requests for performance tests
        if (isIntegration) return 20; // Up to 20 requests for integration tests
        return 10; // 10 requests default

      case "response":
        if (isFast) return 100; // 100ms for fast tests
        if (isPerformance) return 2000; // 2s for performance tests
        return 500; // 500ms default

      case "rerenders":
        if (isPerformance) return 20; // Up to 20 rerenders for performance tests
        return 10; // 10 rerenders default

      default:
        return 1000;
    }
  }

  // Setup network request monitoring
  private setupNetworkMonitoring(): void {
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method || "GET";
      const startTime = performance.now();

      try {
        const response = await this.originalFetch(input, init);
        const endTime = performance.now();

        // Calculate response size (approximation)
        const contentLength = response.headers.get("content-length");
        const size = contentLength ? parseInt(contentLength, 10) : 0;

        this.networkRequests.push({
          url,
          method,
          startTime,
          endTime,
          duration: endTime - startTime,
          size,
          status: response.status,
        });

        return response;
      } catch (error) {
        const endTime = performance.now();

        this.networkRequests.push({
          url,
          method,
          startTime,
          endTime,
          duration: endTime - startTime,
          size: 0,
          status: 0, // Error status
        });

        throw error;
      }
    };
  }

  // Setup performance observer for additional metrics
  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver !== "undefined") {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === "navigation") {
            console.log("📊 Navigation timing:", entry);
          } else if (entry.entryType === "paint") {
            console.log("🎨 Paint timing:", entry.name, entry.startTime);
          }
        });
      });

      try {
        this.performanceObserver.observe({
          entryTypes: ["navigation", "paint", "measure"],
        });
      } catch (error) {
        console.warn("Performance observer not fully supported:", error);
      }
    }
  }

  // Take memory usage snapshot
  private takeMemorySnapshot(): void {
    const perf = performance as PerformanceWithMemory;
    if (perf.memory) {
      this.memorySnapshots.push(perf.memory.usedJSHeapSize);
    }
  }

  // Calculate network performance metrics
  private calculateNetworkMetrics(): void {
    if (this.networkRequests.length === 0) {
      this.metrics.networkMetrics = {
        requestCount: 0,
        totalBytes: 0,
        averageResponseTime: 0,
        slowestRequest: 0,
      };
      return;
    }

    const totalBytes = this.networkRequests.reduce(
      (sum, req) => sum + req.size,
      0,
    );
    const totalDuration = this.networkRequests.reduce(
      (sum, req) => sum + req.duration,
      0,
    );
    const slowestRequest = Math.max(
      ...this.networkRequests.map((req) => req.duration),
    );

    this.metrics.networkMetrics = {
      requestCount: this.networkRequests.length,
      totalBytes,
      averageResponseTime: totalDuration / this.networkRequests.length,
      slowestRequest,
    };
  }

  // Calculate render performance metrics
  private calculateRenderMetrics(): void {
    const componentsRendered = new Set(
      this.renderInfo.map((r) => r.componentName),
    ).size;
    const rerenderCount = this.renderInfo.filter((r) => r.isRerender).length;

    this.metrics.renderMetrics = {
      componentsRendered,
      rerenderCount,
      domUpdates: this.renderInfo.length,
    };
  }

  // Calculate user interaction metrics
  private calculateUserInteractionMetrics(): void {
    const clicksPerformed = this.userInteractions.filter(
      (i) => i.type === "click",
    ).length;
    const inputsChanged = this.userInteractions.filter(
      (i) => i.type === "input",
    ).length;
    const navigationEvents = this.userInteractions.filter(
      (i) => i.type === "navigation",
    ).length;

    this.metrics.userInteractionMetrics = {
      clicksPerformed,
      inputsChanged,
      navigationEvents,
    };
  }

  // Calculate memory usage metrics
  private calculateMemoryMetrics(): void {
    if (this.memorySnapshots.length < 2) {
      return;
    }

    const initial = this.memorySnapshots[0];
    const final = this.memorySnapshots[this.memorySnapshots.length - 1];
    const peak = Math.max(...this.memorySnapshots);
    const delta = final - initial;

    this.metrics.memoryUsage = {
      initial,
      peak,
      final,
      delta,
    };
  }

  // Evaluate performance against thresholds
  private evaluatePerformance(): void {
    this.metrics.violations = [];

    // Check duration threshold
    if (this.metrics.duration > this.metrics.thresholds.maxDuration) {
      this.metrics.violations.push({
        metric: "duration",
        threshold: this.metrics.thresholds.maxDuration,
        actual: this.metrics.duration,
        severity:
          this.metrics.duration > this.metrics.thresholds.maxDuration * 2
            ? "critical"
            : "error",
        message: `Test duration ${this.metrics.duration.toFixed(2)}ms exceeds threshold ${this.metrics.thresholds.maxDuration}ms`,
      });
    }

    // Check memory usage threshold
    if (
      this.metrics.memoryUsage &&
      this.metrics.memoryUsage.delta > this.metrics.thresholds.maxMemoryUsage
    ) {
      this.metrics.violations.push({
        metric: "memory",
        threshold: this.metrics.thresholds.maxMemoryUsage,
        actual: this.metrics.memoryUsage.delta,
        severity: "warning",
        message: `Memory usage delta ${(this.metrics.memoryUsage.delta / 1024 / 1024).toFixed(2)}MB exceeds threshold ${(this.metrics.thresholds.maxMemoryUsage / 1024 / 1024).toFixed(2)}MB`,
      });
    }

    // Check network requests threshold
    if (
      this.metrics.networkMetrics &&
      this.metrics.networkMetrics.requestCount >
        this.metrics.thresholds.maxNetworkRequests
    ) {
      this.metrics.violations.push({
        metric: "network",
        threshold: this.metrics.thresholds.maxNetworkRequests,
        actual: this.metrics.networkMetrics.requestCount,
        severity: "warning",
        message: `Network request count ${this.metrics.networkMetrics.requestCount} exceeds threshold ${this.metrics.thresholds.maxNetworkRequests}`,
      });
    }

    // Check response time threshold
    if (
      this.metrics.networkMetrics &&
      this.metrics.networkMetrics.slowestRequest >
        this.metrics.thresholds.maxResponseTime
    ) {
      this.metrics.violations.push({
        metric: "response",
        threshold: this.metrics.thresholds.maxResponseTime,
        actual: this.metrics.networkMetrics.slowestRequest,
        severity: "error",
        message: `Slowest request ${this.metrics.networkMetrics.slowestRequest.toFixed(2)}ms exceeds threshold ${this.metrics.thresholds.maxResponseTime}ms`,
      });
    }

    // Check rerender threshold
    if (
      this.metrics.renderMetrics &&
      this.metrics.renderMetrics.rerenderCount >
        this.metrics.thresholds.maxRerenders
    ) {
      this.metrics.violations.push({
        metric: "rerenders",
        threshold: this.metrics.thresholds.maxRerenders,
        actual: this.metrics.renderMetrics.rerenderCount,
        severity: "warning",
        message: `Rerender count ${this.metrics.renderMetrics.rerenderCount} exceeds threshold ${this.metrics.thresholds.maxRerenders}`,
      });
    }

    // Determine if test passed
    const criticalViolations = this.metrics.violations.filter(
      (v) => v.severity === "critical",
    );
    const errorViolations = this.metrics.violations.filter(
      (v) => v.severity === "error",
    );

    this.metrics.passed =
      criticalViolations.length === 0 && errorViolations.length === 0;
  }

  // Log performance results
  private logResults(): void {
    const emoji = this.metrics.passed ? "✅" : "❌";
    const status = this.metrics.passed ? "PASSED" : "FAILED";

    console.log(
      `\n${emoji} Performance Test ${status}: ${this.metrics.testName}`,
    );
    console.log(
      `📊 Duration: ${this.metrics.duration.toFixed(2)}ms (threshold: ${this.metrics.thresholds.maxDuration}ms)`,
    );

    if (this.metrics.networkMetrics) {
      console.log(
        `🌐 Network: ${this.metrics.networkMetrics.requestCount} requests, avg ${this.metrics.networkMetrics.averageResponseTime.toFixed(2)}ms`,
      );
    }

    if (this.metrics.renderMetrics) {
      console.log(
        `🔄 Renders: ${this.metrics.renderMetrics.componentsRendered} components, ${this.metrics.renderMetrics.rerenderCount} rerenders`,
      );
    }

    if (this.metrics.memoryUsage) {
      console.log(
        `💾 Memory: ${(this.metrics.memoryUsage.delta / 1024 / 1024).toFixed(2)}MB delta`,
      );
    }

    if (this.metrics.violations.length > 0) {
      console.log("\n⚠️  Performance Violations:");
      this.metrics.violations.forEach((violation) => {
        const severityEmoji =
          violation.severity === "critical"
            ? "🔥"
            : violation.severity === "error"
              ? "❌"
              : "⚠️";
        console.log(`  ${severityEmoji} ${violation.message}`);
      });
    }

    console.log(""); // Empty line for readability
  }

  // Cleanup monitoring
  private cleanup(): void {
    globalThis.fetch = this.originalFetch;

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }
}

// Enhanced withPerformance wrapper with comprehensive monitoring
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  testFn: T,
  testName: string,
  categories: TestCategory[],
  thresholds?: Partial<PerformanceThresholds>,
): T {
  return (async (...args: Parameters<T>) => {
    const monitor = new PerformanceMonitor(testName, categories, thresholds);

    monitor.start();

    try {
      const result = await testFn(...args);
      const metrics = monitor.stop();

      // Store metrics for reporting
      if (globalThis.testMetrics) {
        globalThis.testMetrics.push(metrics);
      } else {
        globalThis.testMetrics = [metrics];
      }

      // Fail test if there are critical violations
      const criticalViolations = metrics.violations.filter(
        (v) => v.severity === "critical",
      );
      if (criticalViolations.length > 0) {
        throw new Error(
          `Performance test failed with critical violations: ${criticalViolations.map((v) => v.message).join(", ")}`,
        );
      }

      return result;
    } catch (error) {
      monitor.stop();
      throw error;
    }
  }) as T;
}

// Performance test report generator
export function generatePerformanceReport(): void {
  const metrics: PerformanceMetrics[] = globalThis.testMetrics || [];

  if (metrics.length === 0) {
    console.log("📊 No performance metrics collected");
    return;
  }

  console.log("\n📊 PERFORMANCE TEST REPORT");
  console.log("=".repeat(50));

  const totalTests = metrics.length;
  const passedTests = metrics.filter((m) => m.passed).length;
  const failedTests = totalTests - passedTests;

  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(
    `Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`,
  );

  // Performance summary
  const avgDuration =
    metrics.reduce((sum, m) => sum + m.duration, 0) / totalTests;
  const totalNetworkRequests = metrics.reduce(
    (sum, m) => sum + (m.networkMetrics?.requestCount || 0),
    0,
  );
  const totalMemoryDelta = metrics.reduce(
    (sum, m) => sum + (m.memoryUsage?.delta || 0),
    0,
  );

  console.log(`\nAverage Duration: ${avgDuration.toFixed(2)}ms`);
  console.log(`Total Network Requests: ${totalNetworkRequests}`);
  console.log(
    `Total Memory Delta: ${(totalMemoryDelta / 1024 / 1024).toFixed(2)}MB`,
  );

  // Slowest tests
  const slowestTests = metrics
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5);

  console.log("\n🐌 Slowest Tests:");
  slowestTests.forEach((test, index) => {
    console.log(
      `  ${index + 1}. ${test.testName}: ${test.duration.toFixed(2)}ms`,
    );
  });

  // Tests with violations
  const testsWithViolations = metrics.filter((m) => m.violations.length > 0);
  if (testsWithViolations.length > 0) {
    console.log("\n⚠️  Tests with Performance Issues:");
    testsWithViolations.forEach((test) => {
      console.log(
        `  • ${test.testName}: ${test.violations.length} violation(s)`,
      );
    });
  }

  console.log("=".repeat(50));
}

// Clear performance metrics (useful for test cleanup)
export function clearPerformanceMetrics(): void {
  globalThis.testMetrics = [];
}

// Export default enhanced withPerformance function
export { withPerformanceMonitoring as withPerformance };
