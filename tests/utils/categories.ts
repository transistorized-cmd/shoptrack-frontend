/**
 * Test categorization utilities for selective test running
 * Provides decorators and utilities to categorize tests by type, scope, and performance characteristics
 */

import { describe, it, test } from "vitest";
import {
  withPerformanceMonitoring,
  PerformanceThresholds,
} from "./performance-monitoring";

/**
 * Test categories for selective running
 */
export enum TestCategory {
  // By test type
  UNIT = "unit",
  INTEGRATION = "integration",
  PERFORMANCE = "performance",
  E2E = "e2e",

  // By component type
  COMPONENT = "component",
  VIEW = "view",
  COMPOSABLE = "composable",
  STORE = "store",
  SERVICE = "service",
  UTILITY = "utility",

  // By functionality
  AUTH = "auth",
  RECEIPTS = "receipts",
  REPORTS = "reports",
  PLUGINS = "plugins",
  SEARCH = "search",
  UPLOAD = "upload",
  NOTIFICATIONS = "notifications",

  // By execution speed
  FAST = "fast", // < 100ms
  MEDIUM = "medium", // 100ms - 1s
  SLOW = "slow", // > 1s

  // By stability
  STABLE = "stable",
  FLAKY = "flaky",
  EXPERIMENTAL = "experimental",

  // Additional categories for comprehensive testing
  ERROR_HANDLING = "error-handling",
  USER_INTERACTION = "user-interaction",
  QUEUE_MANAGEMENT = "queue-management",
  RETRY_LOGIC = "retry-logic",
  USER_EXPERIENCE = "user-experience",
  RATE_LIMIT = "rate-limit",
  TIMEOUT = "timeout",
  ACCESSIBILITY = "accessibility",

  // By environment requirements
  BROWSER = "browser",
  NODE = "node",
  NETWORK = "network",
  DATABASE = "database",

  // By testing approach
  SHALLOW = "shallow",
  FULL_MOUNT = "full-mount",
  MOCK_HEAVY = "mock-heavy",
  REAL_API = "real-api",

  // By priority
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM_PRIORITY = "medium-priority",
  LOW = "low",

  // By CI/CD stage
  PRE_COMMIT = "pre-commit",
  BUILD = "build",
  DEPLOYMENT = "deployment",
  SMOKE = "smoke",
}

/**
 * Get current test categories from environment
 */
function getTestCategories(): string[] {
  const categories = process.env.TEST_CATEGORIES;
  return categories
    ? categories
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c)
    : [];
}

/**
 * Get current excluded categories from environment
 */
function getExcludeCategories(): string[] {
  const categories = process.env.EXCLUDE_CATEGORIES;
  return categories
    ? categories
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c)
    : [];
}

/**
 * Check if a test should run based on category filters
 */
export function shouldRunTest(categories: TestCategory[]): boolean {
  const testCategories = getTestCategories();
  const excludeCategories = getExcludeCategories();

  // If no filters specified, run all tests
  if (testCategories.length === 0 && excludeCategories.length === 0) {
    return true;
  }

  // Check exclusions first
  if (excludeCategories.length > 0) {
    const hasExcludedCategory = categories.some((cat) =>
      excludeCategories.includes(cat.toString()),
    );
    if (hasExcludedCategory) {
      return false;
    }
  }

  // Check inclusions
  if (testCategories.length > 0) {
    return categories.some((cat) => testCategories.includes(cat.toString()));
  }

  return true;
}

/**
 * Categorized describe function
 */
export function categorizedDescribe(
  name: string,
  categories: TestCategory[],
  fn: () => void,
) {
  if (shouldRunTest(categories)) {
    const categoryTags = categories.map((cat) => `[${cat}]`).join("");
    describe(`${name} ${categoryTags}`, fn);
  } else {
    describe.skip(
      `${name} [SKIPPED - Categories: ${categories.join(", ")}]`,
      fn,
    );
  }
}

/**
 * Categorized it function
 */
export function categorizedIt(
  name: string,
  categories: TestCategory[],
  fn: () => void | Promise<void>,
) {
  if (shouldRunTest(categories)) {
    const categoryTags = categories.map((cat) => `[${cat}]`).join("");
    it(`${name} ${categoryTags}`, fn);
  } else {
    it.skip(`${name} [SKIPPED - Categories: ${categories.join(", ")}]`, fn);
  }
}

/**
 * Categorized test function (alias for categorizedIt)
 */
export const categorizedTest = categorizedIt;

/**
 * Quick category combinations for common use cases
 */
export const CategoryCombos = {
  // Component testing
  UNIT_COMPONENT_FAST: [
    TestCategory.UNIT,
    TestCategory.COMPONENT,
    TestCategory.FAST,
  ],
  UNIT_COMPONENT_SHALLOW: [
    TestCategory.UNIT,
    TestCategory.COMPONENT,
    TestCategory.SHALLOW,
  ],
  INTEGRATION_COMPONENT: [
    TestCategory.INTEGRATION,
    TestCategory.COMPONENT,
    TestCategory.FULL_MOUNT,
  ],

  // View testing
  UNIT_VIEW_SHALLOW: [
    TestCategory.UNIT,
    TestCategory.VIEW,
    TestCategory.SHALLOW,
  ],
  INTEGRATION_VIEW: [
    TestCategory.INTEGRATION,
    TestCategory.VIEW,
    TestCategory.FULL_MOUNT,
  ],

  // Store testing
  UNIT_STORE: [TestCategory.UNIT, TestCategory.STORE, TestCategory.FAST],
  INTEGRATION_STORE: [
    TestCategory.INTEGRATION,
    TestCategory.STORE,
    TestCategory.MEDIUM,
  ],

  // Service testing
  UNIT_SERVICE: [TestCategory.UNIT, TestCategory.SERVICE, TestCategory.FAST],
  INTEGRATION_SERVICE: [
    TestCategory.INTEGRATION,
    TestCategory.SERVICE,
    TestCategory.NETWORK,
  ],

  // Performance testing
  PERFORMANCE_COMPONENT: [
    TestCategory.PERFORMANCE,
    TestCategory.COMPONENT,
    TestCategory.SLOW,
  ],
  PERFORMANCE_API: [
    TestCategory.PERFORMANCE,
    TestCategory.SERVICE,
    TestCategory.SLOW,
  ],

  // Feature-based
  AUTH_UNIT: [TestCategory.UNIT, TestCategory.AUTH, TestCategory.FAST],
  AUTH_INTEGRATION: [
    TestCategory.INTEGRATION,
    TestCategory.AUTH,
    TestCategory.MEDIUM,
  ],

  RECEIPTS_UNIT: [TestCategory.UNIT, TestCategory.RECEIPTS, TestCategory.FAST],
  RECEIPTS_INTEGRATION: [
    TestCategory.INTEGRATION,
    TestCategory.RECEIPTS,
    TestCategory.MEDIUM,
  ],

  // CI/CD stages
  PRE_COMMIT_FAST: [
    TestCategory.PRE_COMMIT,
    TestCategory.FAST,
    TestCategory.STABLE,
  ],
  BUILD_CRITICAL: [
    TestCategory.BUILD,
    TestCategory.CRITICAL,
    TestCategory.STABLE,
  ],
  SMOKE_CRITICAL: [
    TestCategory.SMOKE,
    TestCategory.CRITICAL,
    TestCategory.FAST,
  ],
} as const;

/**
 * Test suite configuration helpers
 */
export interface TestSuiteConfig {
  categories: TestCategory[];
  timeout?: number;
  retries?: number;
  concurrent?: boolean;
}

/**
 * Configure a test suite with categories and options
 */
export function configureTestSuite(
  name: string,
  config: TestSuiteConfig,
  fn: () => void,
) {
  if (!shouldRunTest(config.categories)) {
    describe.skip(
      `${name} [SKIPPED - Categories: ${config.categories.join(", ")}]`,
      fn,
    );
    return;
  }

  const categoryTags = config.categories.map((cat) => `[${cat}]`).join("");

  describe(`${name} ${categoryTags}`, () => {
    if (config.timeout) {
      beforeEach(() => {
        vi.setConfig({ testTimeout: config.timeout });
      });
    }

    fn();
  });
}

/**
 * Helper to tag tests with performance characteristics
 * Enhanced version with comprehensive performance monitoring
 */
export function withPerformance<T extends (...args: any[]) => any>(
  testFn: T,
  expectedMaxDuration: number,
  category:
    | TestCategory.FAST
    | TestCategory.MEDIUM
    | TestCategory.SLOW = TestCategory.MEDIUM,
  testName?: string,
  categories?: TestCategory[],
  thresholds?: Partial<PerformanceThresholds>,
): T {
  // If enhanced monitoring is requested (testName provided), use comprehensive monitoring
  if (testName && categories) {
    const customThresholds = {
      maxDuration: expectedMaxDuration,
      ...thresholds,
    };
    return withPerformanceMonitoring(
      testFn,
      testName,
      categories,
      customThresholds,
    );
  }

  // Fallback to simple performance monitoring
  return (async (...args: Parameters<T>) => {
    const start = performance.now();
    const result = await testFn(...args);
    const duration = performance.now() - start;

    if (duration > expectedMaxDuration) {
      console.warn(
        `⚠️ Test exceeded expected duration: ${duration.toFixed(2)}ms > ${expectedMaxDuration}ms (category: ${category})`,
      );
    }

    return result;
  }) as T;
}

/**
 * Filter helpers for different test scenarios
 */
export const TestFilters = {
  // Speed-based filters
  onlyFast: () => shouldRunTest([TestCategory.FAST]),
  onlyMedium: () => shouldRunTest([TestCategory.MEDIUM]),
  onlySlow: () => shouldRunTest([TestCategory.SLOW]),

  // Type-based filters
  onlyUnit: () => shouldRunTest([TestCategory.UNIT]),
  onlyIntegration: () => shouldRunTest([TestCategory.INTEGRATION]),
  onlyPerformance: () => shouldRunTest([TestCategory.PERFORMANCE]),

  // Component-based filters
  onlyComponents: () => shouldRunTest([TestCategory.COMPONENT]),
  onlyViews: () => shouldRunTest([TestCategory.VIEW]),
  onlyStores: () => shouldRunTest([TestCategory.STORE]),
  onlyServices: () => shouldRunTest([TestCategory.SERVICE]),

  // Feature-based filters
  onlyAuth: () => shouldRunTest([TestCategory.AUTH]),
  onlyReceipts: () => shouldRunTest([TestCategory.RECEIPTS]),
  onlyReports: () => shouldRunTest([TestCategory.REPORTS]),
  onlyPlugins: () => shouldRunTest([TestCategory.PLUGINS]),

  // CI/CD filters
  preCommit: () => shouldRunTest([TestCategory.PRE_COMMIT]),
  buildStage: () => shouldRunTest([TestCategory.BUILD]),
  smokeTests: () => shouldRunTest([TestCategory.SMOKE]),

  // Stability filters
  onlyStable: () => shouldRunTest([TestCategory.STABLE]),
  excludeFlaky: () => !shouldRunTest([TestCategory.FLAKY]),
  excludeExperimental: () => !shouldRunTest([TestCategory.EXPERIMENTAL]),
} as const;

/**
 * Utility to create test category reporters
 */
export function createCategoryReporter() {
  const categoryStats = new Map<
    TestCategory,
    { passed: number; failed: number; skipped: number }
  >();

  return {
    onTestFinished(testResult: any) {
      // This would integrate with Vitest's reporter system
      // to track category-based statistics
    },

    generateReport() {
      return {
        totalCategories: categoryStats.size,
        categoryBreakdown: Object.fromEntries(categoryStats),
      };
    },
  };
}

/**
 * Environment-based category detection
 */
export function detectEnvironmentCategories(): TestCategory[] {
  const categories: TestCategory[] = [];

  // In test environment, happy-dom provides window
  if (typeof window !== "undefined" && window.constructor.name === "Window") {
    categories.push(TestCategory.BROWSER);
  } else {
    categories.push(TestCategory.NODE);
  }

  if (process.env.CI) {
    categories.push(TestCategory.BUILD);
  }

  if (process.env.NODE_ENV === "development") {
    categories.push(TestCategory.EXPERIMENTAL);
  }

  return categories;
}

// Export commonly used combinations as constants
export const FAST_UNIT_COMPONENT = CategoryCombos.UNIT_COMPONENT_FAST;
export const SLOW_INTEGRATION_VIEW = CategoryCombos.INTEGRATION_VIEW;
export const CRITICAL_SMOKE = CategoryCombos.SMOKE_CRITICAL;
