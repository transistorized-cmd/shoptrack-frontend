import type { Page } from "@playwright/test";

export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: {
    used: number;
    total: number;
    limit: number;
  } | null;
  networkRequests: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
}

export interface ComponentPerformanceConfig {
  maxRenderTime: number;
  maxMemoryUsage: number; // in MB
  maxNetworkRequests: number;
  maxFirstPaint: number;
  maxFirstContentfulPaint: number;
  maxLargestContentfulPaint: number;
  maxCumulativeLayoutShift: number;
  maxFirstInputDelay: number;
}

export const DEFAULT_PERFORMANCE_CONFIG: ComponentPerformanceConfig = {
  maxRenderTime: 3000, // 3 seconds
  maxMemoryUsage: 50, // 50 MB
  maxNetworkRequests: 20, // 20 requests
  maxFirstPaint: 1000, // 1 second
  maxFirstContentfulPaint: 1500, // 1.5 seconds
  maxLargestContentfulPaint: 2500, // 2.5 seconds
  maxCumulativeLayoutShift: 0.1, // 0.1 CLS score
  maxFirstInputDelay: 100, // 100ms
};

/**
 * Initialize performance monitoring on a page
 */
export async function initializePerformanceMonitoring(
  page: Page,
): Promise<void> {
  await page.addInitScript(() => {
    // Initialize performance tracking object
    window.performanceTracker = {
      startTime: performance.now(),
      renderTimes: new Map(),
      networkRequests: [],
      componentMounts: [],
      rerenderCount: 0,
      memorySnapshots: [],
      interactions: [],
    };

    // Track network requests
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const startTime = performance.now();
      window.performanceTracker.networkRequests.push({
        url: args[0],
        startTime,
        method: args[1]?.method || "GET",
      });

      try {
        const response = await originalFetch.apply(this, args);
        const endTime = performance.now();

        const requestIndex =
          window.performanceTracker.networkRequests.length - 1;
        window.performanceTracker.networkRequests[requestIndex].endTime =
          endTime;
        window.performanceTracker.networkRequests[requestIndex].duration =
          endTime - startTime;
        window.performanceTracker.networkRequests[requestIndex].status =
          response.status;

        return response;
      } catch (error) {
        const endTime = performance.now();
        const requestIndex =
          window.performanceTracker.networkRequests.length - 1;
        window.performanceTracker.networkRequests[requestIndex].endTime =
          endTime;
        window.performanceTracker.networkRequests[requestIndex].duration =
          endTime - startTime;
        window.performanceTracker.networkRequests[requestIndex].error =
          error.message;

        throw error;
      }
    };

    // Track DOM mutations as proxy for re-renders
    const mutationObserver = new MutationObserver((mutations) => {
      if (mutations.length > 0) {
        window.performanceTracker.rerenderCount++;
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    window.performanceTracker.mutationObserver = mutationObserver;

    // Track user interactions
    ["click", "input", "scroll"].forEach((eventType) => {
      document.addEventListener(eventType, (event) => {
        window.performanceTracker.interactions.push({
          type: eventType,
          timestamp: performance.now(),
          target: event.target?.tagName || "unknown",
        });
      });
    });

    // Periodic memory snapshots
    setInterval(() => {
      if (performance.memory) {
        window.performanceTracker.memorySnapshots.push({
          timestamp: performance.now(),
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit,
        });
      }
    }, 1000); // Every second
  });
}

/**
 * Measure component rendering performance
 */
export async function measureComponentRender(
  page: Page,
  componentSelector: string,
  config: Partial<ComponentPerformanceConfig> = {},
): Promise<PerformanceMetrics> {
  const mergedConfig = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };

  const startTime = Date.now();

  // Wait for component to be visible
  await page.waitForSelector(componentSelector, {
    timeout: mergedConfig.maxRenderTime,
  });

  const renderTime = Date.now() - startTime;

  // Get comprehensive performance metrics
  const metrics = await page.evaluate(() => {
    const paintEntries = performance.getEntriesByType("paint");
    const navigationEntries = performance.getEntriesByType("navigation");
    const layoutShiftEntries = performance.getEntriesByType("layout-shift");

    // Calculate Web Vitals
    const firstPaint =
      paintEntries.find((entry) => entry.name === "first-paint")?.startTime ||
      0;
    const firstContentfulPaint =
      paintEntries.find((entry) => entry.name === "first-contentful-paint")
        ?.startTime || 0;

    // LCP - get largest contentful paint
    const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
    const largestContentfulPaint =
      lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : 0;

    // CLS - cumulative layout shift
    const cumulativeLayoutShift = layoutShiftEntries.reduce(
      (cls, entry) => cls + entry.value,
      0,
    );

    // FID - first input delay (approximated)
    const firstInputDelay =
      window.performanceTracker?.interactions.length > 0
        ? window.performanceTracker.interactions[0].timestamp -
          window.performanceTracker.startTime
        : 0;

    // Memory usage
    const memoryUsage = performance.memory
      ? {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit,
        }
      : null;

    // Network request count
    const networkRequests =
      window.performanceTracker?.networkRequests.length || 0;

    return {
      firstPaint,
      firstContentfulPaint,
      largestContentfulPaint,
      cumulativeLayoutShift,
      firstInputDelay,
      memoryUsage,
      networkRequests,
    };
  });

  return {
    renderTime,
    ...metrics,
  };
}

/**
 * Assert performance metrics against configuration
 */
export function assertPerformanceMetrics(
  metrics: PerformanceMetrics,
  config: Partial<ComponentPerformanceConfig> = {},
): void {
  const mergedConfig = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };

  const assertions = [
    {
      name: "Render Time",
      value: metrics.renderTime,
      max: mergedConfig.maxRenderTime,
      unit: "ms",
    },
    {
      name: "Network Requests",
      value: metrics.networkRequests,
      max: mergedConfig.maxNetworkRequests,
      unit: "requests",
    },
    {
      name: "First Paint",
      value: metrics.firstPaint,
      max: mergedConfig.maxFirstPaint,
      unit: "ms",
    },
    {
      name: "First Contentful Paint",
      value: metrics.firstContentfulPaint,
      max: mergedConfig.maxFirstContentfulPaint,
      unit: "ms",
    },
    {
      name: "Largest Contentful Paint",
      value: metrics.largestContentfulPaint,
      max: mergedConfig.maxLargestContentfulPaint,
      unit: "ms",
    },
    {
      name: "Cumulative Layout Shift",
      value: metrics.cumulativeLayoutShift,
      max: mergedConfig.maxCumulativeLayoutShift,
      unit: "CLS score",
    },
    {
      name: "First Input Delay",
      value: metrics.firstInputDelay,
      max: mergedConfig.maxFirstInputDelay,
      unit: "ms",
    },
  ];

  if (metrics.memoryUsage) {
    const memoryUsageMB = Math.round(metrics.memoryUsage.used / 1024 / 1024);
    assertions.push({
      name: "Memory Usage",
      value: memoryUsageMB,
      max: mergedConfig.maxMemoryUsage,
      unit: "MB",
    });
  }

  console.log("📊 Performance Metrics:");

  const failures: string[] = [];

  assertions.forEach(({ name, value, max, unit }) => {
    const status = value <= max ? "✅" : "❌";
    const percentage = ((value / max) * 100).toFixed(1);

    console.log(
      `  ${status} ${name}: ${value}${unit} (${percentage}% of max ${max}${unit})`,
    );

    if (value > max) {
      failures.push(`${name} exceeded limit: ${value}${unit} > ${max}${unit}`);
    }
  });

  if (failures.length > 0) {
    throw new Error(`Performance assertions failed:\n${failures.join("\n")}`);
  }
}

/**
 * Measure and assert component performance in one call
 */
export async function measureAndAssertComponentPerformance(
  page: Page,
  componentSelector: string,
  config: Partial<ComponentPerformanceConfig> = {},
): Promise<PerformanceMetrics> {
  const metrics = await measureComponentRender(page, componentSelector, config);
  assertPerformanceMetrics(metrics, config);
  return metrics;
}

/**
 * Create a performance budget for different component types
 */
export const COMPONENT_PERFORMANCE_BUDGETS = {
  dashboard: {
    maxRenderTime: 2000,
    maxMemoryUsage: 30,
    maxNetworkRequests: 15,
    maxFirstContentfulPaint: 1200,
  },

  receiptList: {
    maxRenderTime: 1500,
    maxMemoryUsage: 40,
    maxNetworkRequests: 10,
    maxFirstContentfulPaint: 1000,
  },

  charts: {
    maxRenderTime: 4000,
    maxMemoryUsage: 60,
    maxNetworkRequests: 8,
    maxFirstContentfulPaint: 2000,
    maxLargestContentfulPaint: 3000,
  },

  forms: {
    maxRenderTime: 800,
    maxMemoryUsage: 20,
    maxNetworkRequests: 5,
    maxFirstContentfulPaint: 600,
    maxFirstInputDelay: 50,
  },

  search: {
    maxRenderTime: 1000,
    maxMemoryUsage: 25,
    maxNetworkRequests: 12,
    maxFirstInputDelay: 100,
  },
};

/**
 * Monitor long-term performance trends
 */
export async function capturePerformanceTrend(
  page: Page,
  testName: string,
  metrics: PerformanceMetrics,
): Promise<void> {
  await page.evaluate(
    (data) => {
      const { testName, metrics } = data;

      // Get existing trends
      const existingTrends = JSON.parse(
        localStorage.getItem("performance-trends") || "{}",
      );

      if (!existingTrends[testName]) {
        existingTrends[testName] = [];
      }

      // Add new measurement
      existingTrends[testName].push({
        timestamp: new Date().toISOString(),
        ...metrics,
      });

      // Keep only last 50 measurements per test
      if (existingTrends[testName].length > 50) {
        existingTrends[testName] = existingTrends[testName].slice(-50);
      }

      localStorage.setItem(
        "performance-trends",
        JSON.stringify(existingTrends),
      );
    },
    { testName, metrics },
  );
}

/**
 * Analyze performance trends and detect regressions
 */
export async function analyzePerformanceTrends(
  page: Page,
  testName: string,
): Promise<{
  trend: "improving" | "stable" | "degrading";
  averageChange: number;
  recommendation: string;
}> {
  return await page.evaluate((testName) => {
    const trends = JSON.parse(
      localStorage.getItem("performance-trends") || "{}",
    );
    const testData = trends[testName] || [];

    if (testData.length < 5) {
      return {
        trend: "stable",
        averageChange: 0,
        recommendation: "Insufficient data for trend analysis",
      };
    }

    // Analyze last 10 measurements
    const recentData = testData.slice(-10);
    const renderTimes = recentData.map((d) => d.renderTime);

    // Calculate trend using linear regression
    const n = renderTimes.length;
    const sumX = (n * (n - 1)) / 2; // 0 + 1 + 2 + ... + (n-1)
    const sumY = renderTimes.reduce((sum, time) => sum + time, 0);
    const sumXY = renderTimes.reduce(
      (sum, time, index) => sum + index * time,
      0,
    );
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6; // 0² + 1² + 2² + ... + (n-1)²

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const averageChange = (slope / (sumY / n)) * 100; // Percentage change

    let trend: "improving" | "stable" | "degrading";
    let recommendation: string;

    if (Math.abs(averageChange) < 5) {
      trend = "stable";
      recommendation = "Performance is stable";
    } else if (averageChange < -5) {
      trend = "improving";
      recommendation = "Performance is improving";
    } else {
      trend = "degrading";
      recommendation = `Performance is degrading by ${averageChange.toFixed(1)}% per test run`;
    }

    return { trend, averageChange, recommendation };
  }, testName);
}

/**
 * Generate performance report
 */
export async function generatePerformanceReport(page: Page): Promise<{
  summary: string;
  details: any;
  recommendations: string[];
}> {
  const reportData = await page.evaluate(() => {
    const tracker = window.performanceTracker;
    if (!tracker) {
      return null;
    }

    const totalDuration = performance.now() - tracker.startTime;
    const memoryPeak =
      tracker.memorySnapshots.length > 0
        ? Math.max(...tracker.memorySnapshots.map((s) => s.used))
        : 0;

    const networkStats = {
      total: tracker.networkRequests.length,
      failed: tracker.networkRequests.filter((r) => r.error).length,
      avgDuration:
        tracker.networkRequests.length > 0
          ? tracker.networkRequests.reduce(
              (sum, r) => sum + (r.duration || 0),
              0,
            ) / tracker.networkRequests.length
          : 0,
    };

    return {
      duration: totalDuration,
      memoryPeak: Math.round(memoryPeak / 1024 / 1024),
      rerenderCount: tracker.rerenderCount,
      networkStats,
      interactionCount: tracker.interactions.length,
    };
  });

  if (!reportData) {
    return {
      summary: "Performance tracking not initialized",
      details: {},
      recommendations: ["Initialize performance monitoring before testing"],
    };
  }

  const recommendations: string[] = [];

  if (reportData.memoryPeak > 100) {
    recommendations.push(
      "Consider optimizing memory usage - peak exceeded 100MB",
    );
  }

  if (reportData.rerenderCount > 50) {
    recommendations.push(
      "High re-render count detected - check for unnecessary reactive updates",
    );
  }

  if (reportData.networkStats.avgDuration > 500) {
    recommendations.push(
      "Network requests are slow - consider caching or API optimization",
    );
  }

  if (reportData.networkStats.failed > 0) {
    recommendations.push(
      `${reportData.networkStats.failed} network requests failed - check error handling`,
    );
  }

  const summary = `
Performance Summary:
- Test Duration: ${(reportData.duration / 1000).toFixed(2)}s
- Memory Peak: ${reportData.memoryPeak}MB
- Re-renders: ${reportData.rerenderCount}
- Network Requests: ${reportData.networkStats.total}
- User Interactions: ${reportData.interactionCount}
  `.trim();

  return {
    summary,
    details: reportData,
    recommendations,
  };
}

// Declare global types for TypeScript
declare global {
  interface Window {
    performanceTracker: {
      startTime: number;
      renderTimes: Map<string, number>;
      networkRequests: Array<{
        url: string;
        startTime: number;
        endTime?: number;
        duration?: number;
        method: string;
        status?: number;
        error?: string;
      }>;
      componentMounts: Array<{
        component: string;
        mountTime: number;
        timestamp: number;
      }>;
      rerenderCount: number;
      memorySnapshots: Array<{
        timestamp: number;
        used: number;
        total: number;
        limit: number;
      }>;
      interactions: Array<{
        type: string;
        timestamp: number;
        target: string;
      }>;
      mutationObserver?: MutationObserver;
    };
  }
}
