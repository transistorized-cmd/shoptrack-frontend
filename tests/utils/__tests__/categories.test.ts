import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TestCategory,
  shouldRunTest,
  categorizedDescribe,
  categorizedIt,
  CategoryCombos,
  configureTestSuite,
  withPerformance,
  TestFilters,
  detectEnvironmentCategories
} from '../categories';

describe('Test Categorization System', () => {
  beforeEach(() => {
    // Clear environment variables before each test
    delete process.env.TEST_CATEGORIES;
    delete process.env.EXCLUDE_CATEGORIES;
    vi.clearAllMocks();
  });

  describe('shouldRunTest', () => {
    it('should run all tests when no filters specified', () => {
      expect(shouldRunTest([TestCategory.UNIT])).toBe(true);
      expect(shouldRunTest([TestCategory.INTEGRATION])).toBe(true);
      expect(shouldRunTest([TestCategory.PERFORMANCE])).toBe(true);
    });

    it('should include tests matching TEST_CATEGORIES', () => {
      process.env.TEST_CATEGORIES = 'unit,fast';

      expect(shouldRunTest([TestCategory.UNIT])).toBe(true);
      expect(shouldRunTest([TestCategory.FAST])).toBe(true);
      expect(shouldRunTest([TestCategory.UNIT, TestCategory.FAST])).toBe(true);
      expect(shouldRunTest([TestCategory.INTEGRATION])).toBe(false);
    });

    it('should exclude tests matching EXCLUDE_CATEGORIES', () => {
      process.env.EXCLUDE_CATEGORIES = 'flaky,experimental';

      expect(shouldRunTest([TestCategory.UNIT])).toBe(true);
      expect(shouldRunTest([TestCategory.FLAKY])).toBe(false);
      expect(shouldRunTest([TestCategory.EXPERIMENTAL])).toBe(false);
      expect(shouldRunTest([TestCategory.UNIT, TestCategory.FLAKY])).toBe(false);
    });

    it('should prioritize exclusions over inclusions', () => {
      process.env.TEST_CATEGORIES = 'unit,flaky';
      process.env.EXCLUDE_CATEGORIES = 'flaky';

      expect(shouldRunTest([TestCategory.UNIT])).toBe(true);
      expect(shouldRunTest([TestCategory.FLAKY])).toBe(false);
      expect(shouldRunTest([TestCategory.UNIT, TestCategory.FLAKY])).toBe(false);
    });

    it('should handle multiple categories correctly', () => {
      process.env.TEST_CATEGORIES = 'unit,component';

      expect(shouldRunTest([TestCategory.UNIT, TestCategory.COMPONENT])).toBe(true);
      expect(shouldRunTest([TestCategory.UNIT, TestCategory.VIEW])).toBe(true); // Has unit
      expect(shouldRunTest([TestCategory.VIEW, TestCategory.INTEGRATION])).toBe(false); // Has neither
    });
  });

  describe('categorizedDescribe', () => {
    it('should use shouldRunTest logic for filtering', () => {
      // Test the underlying logic that categorizedDescribe uses
      process.env.TEST_CATEGORIES = 'unit';
      expect(shouldRunTest([TestCategory.UNIT])).toBe(true);
      expect(shouldRunTest([TestCategory.INTEGRATION])).toBe(false);
    });
  });

  describe('categorizedIt', () => {
    it('should handle test categorization logic', () => {
      // Test the underlying logic without calling it/test functions inside tests
      process.env.TEST_CATEGORIES = 'unit';
      expect(shouldRunTest([TestCategory.UNIT])).toBe(true);

      process.env.TEST_CATEGORIES = 'integration';
      expect(shouldRunTest([TestCategory.UNIT])).toBe(false);
    });
  });

  describe('CategoryCombos', () => {
    it('should provide predefined category combinations', () => {
      expect(CategoryCombos.UNIT_COMPONENT_FAST).toEqual([
        TestCategory.UNIT,
        TestCategory.COMPONENT,
        TestCategory.FAST
      ]);

      expect(CategoryCombos.INTEGRATION_VIEW).toEqual([
        TestCategory.INTEGRATION,
        TestCategory.VIEW,
        TestCategory.FULL_MOUNT
      ]);

      expect(CategoryCombos.AUTH_UNIT).toEqual([
        TestCategory.UNIT,
        TestCategory.AUTH,
        TestCategory.FAST
      ]);
    });

    it('should work with shouldRunTest', () => {
      process.env.TEST_CATEGORIES = 'unit,component';

      expect(shouldRunTest(CategoryCombos.UNIT_COMPONENT_FAST)).toBe(true);
      expect(shouldRunTest(CategoryCombos.INTEGRATION_VIEW)).toBe(false);
    });
  });

  describe('configureTestSuite', () => {
    it('should use shouldRunTest logic for suite filtering', () => {
      // Test the underlying logic that configureTestSuite uses
      process.env.TEST_CATEGORIES = 'performance';
      expect(shouldRunTest([TestCategory.PERFORMANCE, TestCategory.SLOW])).toBe(true);

      process.env.TEST_CATEGORIES = 'unit';
      expect(shouldRunTest([TestCategory.PERFORMANCE, TestCategory.SLOW])).toBe(false);
    });
  });

  describe('withPerformance', () => {
    it('should execute test function', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');
      const wrappedFn = withPerformance(mockFn, 100, TestCategory.FAST);

      const result = await wrappedFn('arg1', 'arg2');

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('result');
    });

    it('should warn when test exceeds expected duration', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const slowFn = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
        return 'result';
      });

      const wrappedFn = withPerformance(slowFn, 100, TestCategory.FAST);
      await wrappedFn();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test exceeded expected duration')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('TestFilters', () => {
    it('should provide filter functions for different scenarios', () => {
      process.env.TEST_CATEGORIES = 'fast,unit';

      expect(TestFilters.onlyFast()).toBe(true);
      expect(TestFilters.onlyUnit()).toBe(true);
      expect(TestFilters.onlySlow()).toBe(false);
      expect(TestFilters.onlyIntegration()).toBe(false);
    });

    it('should handle exclusion filters', () => {
      process.env.EXCLUDE_CATEGORIES = 'flaky';

      expect(TestFilters.excludeFlaky()).toBe(true);

      process.env.TEST_CATEGORIES = 'flaky';
      process.env.EXCLUDE_CATEGORIES = '';

      expect(TestFilters.excludeFlaky()).toBe(false);
    });

    it('should provide feature-based filters', () => {
      process.env.TEST_CATEGORIES = 'auth,receipts';

      expect(TestFilters.onlyAuth()).toBe(true);
      expect(TestFilters.onlyReceipts()).toBe(true);
      expect(TestFilters.onlyReports()).toBe(false);
    });

    it('should provide CI/CD stage filters', () => {
      process.env.TEST_CATEGORIES = 'pre-commit,build';

      expect(TestFilters.preCommit()).toBe(true);
      expect(TestFilters.buildStage()).toBe(true);
      expect(TestFilters.smokeTests()).toBe(false);
    });
  });

  describe('detectEnvironmentCategories', () => {
    it('should detect environment type', () => {
      const categories = detectEnvironmentCategories();
      // In test environment, it detects as Node
      expect(categories).toContain(TestCategory.NODE);
    });

    it('should detect CI environment', () => {
      process.env.CI = 'true';

      const categories = detectEnvironmentCategories();
      expect(categories).toContain(TestCategory.BUILD);

      delete process.env.CI;
    });

    it('should detect development environment', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const categories = detectEnvironmentCategories();
      expect(categories).toContain(TestCategory.EXPERIMENTAL);

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('TestCategory enum', () => {
    it('should contain all expected categories', () => {
      const expectedCategories = [
        'unit', 'integration', 'performance', 'e2e',
        'component', 'view', 'composable', 'store', 'service', 'utility',
        'auth', 'receipts', 'reports', 'plugins', 'search', 'upload', 'notifications',
        'fast', 'medium', 'slow',
        'stable', 'flaky', 'experimental',
        'browser', 'node', 'network', 'database',
        'shallow', 'full-mount', 'mock-heavy', 'real-api',
        'critical', 'high', 'medium-priority', 'low',
        'pre-commit', 'build', 'deployment', 'smoke'
      ];

      expectedCategories.forEach(category => {
        expect(Object.values(TestCategory)).toContain(category);
      });
    });
  });

  describe('Environment variable parsing', () => {
    it('should handle empty environment variables', () => {
      process.env.TEST_CATEGORIES = '';
      process.env.EXCLUDE_CATEGORIES = '';

      expect(shouldRunTest([TestCategory.UNIT])).toBe(true);
    });

    it('should handle comma-separated values', () => {
      process.env.TEST_CATEGORIES = 'unit,fast,stable';

      expect(shouldRunTest([TestCategory.UNIT])).toBe(true);
      expect(shouldRunTest([TestCategory.FAST])).toBe(true);
      expect(shouldRunTest([TestCategory.STABLE])).toBe(true);
      expect(shouldRunTest([TestCategory.SLOW])).toBe(false);
    });

    it('should handle whitespace in environment variables', () => {
      process.env.TEST_CATEGORIES = ' unit , fast , stable ';

      // The current implementation trims whitespace
      expect(shouldRunTest([TestCategory.UNIT])).toBe(true);
    });
  });

  describe('Integration with real test scenarios', () => {
    it('should support typical development workflow', () => {
      // Developer wants to run only fast unit tests during development
      process.env.TEST_CATEGORIES = 'unit,fast';
      process.env.EXCLUDE_CATEGORIES = 'flaky';

      expect(shouldRunTest(CategoryCombos.UNIT_COMPONENT_FAST)).toBe(true);
      expect(shouldRunTest([TestCategory.INTEGRATION, TestCategory.SLOW])).toBe(false);
      expect(shouldRunTest([TestCategory.UNIT, TestCategory.FLAKY])).toBe(false);
    });

    it('should support CI pipeline configuration', () => {
      // CI wants to run stable tests but exclude experimental features
      process.env.EXCLUDE_CATEGORIES = 'flaky,experimental';

      expect(shouldRunTest([TestCategory.UNIT, TestCategory.STABLE])).toBe(true);
      expect(shouldRunTest([TestCategory.INTEGRATION, TestCategory.STABLE])).toBe(true);
      expect(shouldRunTest([TestCategory.UNIT, TestCategory.EXPERIMENTAL])).toBe(false);
    });

    it('should support feature-specific testing', () => {
      // Testing only authentication-related features
      process.env.TEST_CATEGORIES = 'auth';

      expect(shouldRunTest(CategoryCombos.AUTH_UNIT)).toBe(true);
      expect(shouldRunTest(CategoryCombos.AUTH_INTEGRATION)).toBe(true);
      expect(shouldRunTest(CategoryCombos.RECEIPTS_UNIT)).toBe(false);
    });
  });
});