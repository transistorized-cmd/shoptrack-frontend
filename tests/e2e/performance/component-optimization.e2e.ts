import { test, expect } from '@playwright/test';
import {
  initializePerformanceMonitoring,
  measureAndAssertComponentPerformance,
  COMPONENT_PERFORMANCE_BUDGETS,
  capturePerformanceTrend,
  analyzePerformanceTrends,
  generatePerformanceReport
} from '../utils/performance-helpers';
import {
  AuthPage,
  DashboardPage,
  ReceiptsPage,
  TEST_USERS,
  waitForPageLoad,
  mockApiResponse
} from '../utils/test-helpers';

// Component Performance Optimization E2E Tests
test.describe('Component Performance Optimization', () => {
  let authPage: AuthPage;
  let dashboardPage: DashboardPage;
  let receiptsPage: ReceiptsPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);
    receiptsPage = new ReceiptsPage(page);

    // Initialize performance monitoring
    await initializePerformanceMonitoring(page);

    // Login to access components
    await authPage.goto();
    await authPage.login(TEST_USERS.STANDARD_USER.email, TEST_USERS.STANDARD_USER.password);
    await page.waitForSelector('[data-testid="dashboard"]');
  });

  test.describe('Vue 3 Optimization Features', () => {
    test('should validate v-memo optimization performance', async ({ page }) => {
      // Test v-memo directive performance with large lists
      const largeDataset = Array.from({ length: 500 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random() * 100,
        category: ['A', 'B', 'C'][i % 3],
        lastUpdated: new Date(Date.now() - i * 1000).toISOString()
      }));

      await mockApiResponse(page, '**/api/items**', {
        items: largeDataset,
        total: largeDataset.length
      });

      // Navigate to component that uses v-memo
      await page.goto('/components/optimized-list');

      // Measure initial render performance
      const initialMetrics = await measureAndAssertComponentPerformance(
        page,
        '[data-testid="v-memo-list"]',
        COMPONENT_PERFORMANCE_BUDGETS.receiptList
      );

      // Test re-render performance when data changes
      const updateStart = Date.now();

      // Update one item (should only re-render that item with v-memo)
      await page.evaluate(() => {
        // Simulate updating one item in the dataset
        window.dispatchEvent(new CustomEvent('update-item', {
          detail: { id: 0, value: 999 }
        }));
      });

      await page.waitForSelector('[data-testid="item-0-updated"]');

      const updateTime = Date.now() - updateStart;

      // With v-memo, update should be very fast
      expect(updateTime).toBeLessThan(100); // Less than 100ms

      console.log('📊 v-memo Performance:');
      console.log(`  Initial Render: ${initialMetrics.renderTime}ms`);
      console.log(`  Update Time: ${updateTime}ms`);

      // Capture trend data
      await capturePerformanceTrend(page, 'v-memo-optimization', {
        ...initialMetrics,
        updateTime
      });
    });

    test('should validate Suspense component lazy loading performance', async ({ page }) => {
      // Test Suspense with lazy-loaded components
      await page.goto('/components/suspense-demo');

      // Measure time to show fallback
      const fallbackStart = Date.now();
      await page.waitForSelector('[data-testid="suspense-fallback"]');
      const fallbackTime = Date.now() - fallbackStart;

      // Fallback should appear immediately
      expect(fallbackTime).toBeLessThan(50); // Less than 50ms

      // Measure time for async component to load
      const asyncLoadStart = Date.now();
      await page.waitForSelector('[data-testid="async-component-loaded"]', { timeout: 10000 });
      const asyncLoadTime = Date.now() - asyncLoadStart;

      // Async component should load within reasonable time
      expect(asyncLoadTime).toBeLessThan(5000); // Less than 5 seconds

      // Test nested Suspense performance
      await page.click('[data-testid="load-nested-component"]');

      const nestedStart = Date.now();
      await page.waitForSelector('[data-testid="nested-async-loaded"]');
      const nestedTime = Date.now() - nestedStart;

      // Nested loading should be efficient
      expect(nestedTime).toBeLessThan(3000); // Less than 3 seconds

      console.log('📊 Suspense Performance:');
      console.log(`  Fallback Display: ${fallbackTime}ms`);
      console.log(`  Async Load: ${asyncLoadTime}ms`);
      console.log(`  Nested Load: ${nestedTime}ms`);
    });

    test('should validate computed property optimization', async ({ page }) => {
      // Test computed property caching and reactivity performance
      await page.goto('/components/computed-demo');

      // Setup large dataset for computed calculations
      await page.evaluate(() => {
        window.testData = {
          items: Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            price: Math.random() * 100,
            quantity: Math.floor(Math.random() * 10) + 1,
            category: ['A', 'B', 'C', 'D', 'E'][i % 5]
          }))
        };
      });

      // Trigger computed calculations
      const computedStart = Date.now();

      await page.click('[data-testid="calculate-totals"]');
      await page.waitForSelector('[data-testid="computed-results-ready"]');

      const computedTime = Date.now() - computedStart;

      // Computed calculations should be efficient
      expect(computedTime).toBeLessThan(1000); // Less than 1 second

      // Test computed caching by triggering same calculation
      const cachedStart = Date.now();

      await page.click('[data-testid="calculate-totals"]');
      await page.waitForSelector('[data-testid="computed-results-ready"]');

      const cachedTime = Date.now() - cachedStart;

      // Cached computation should be much faster
      expect(cachedTime).toBeLessThan(computedTime * 0.1); // At least 90% faster

      // Test reactive updates to computed
      const reactiveStart = Date.now();

      await page.fill('[data-testid="price-input-0"]', '999');
      await page.waitForSelector('[data-testid="computed-updated"]');

      const reactiveTime = Date.now() - reactiveStart;

      // Reactive updates should be fast
      expect(reactiveTime).toBeLessThan(200); // Less than 200ms

      console.log('📊 Computed Property Performance:');
      console.log(`  Initial Calculation: ${computedTime}ms`);
      console.log(`  Cached Access: ${cachedTime}ms`);
      console.log(`  Reactive Update: ${reactiveTime}ms`);
      console.log(`  Cache Efficiency: ${((computedTime - cachedTime) / computedTime * 100).toFixed(1)}%`);
    });
  });

  test.describe('Component Lifecycle Optimization', () => {
    test('should validate KeepAlive component caching performance', async ({ page }) => {
      // Test KeepAlive component preservation
      await page.goto('/components/keep-alive-demo');

      // First navigation to heavy component
      const firstLoadStart = Date.now();

      await page.click('[data-testid="nav-heavy-component"]');
      await page.waitForSelector('[data-testid="heavy-component-loaded"]');

      const firstLoadTime = Date.now() - firstLoadStart;

      // Navigate away
      await page.click('[data-testid="nav-light-component"]');
      await page.waitForSelector('[data-testid="light-component-loaded"]');

      // Navigate back (should use KeepAlive cache)
      const cachedLoadStart = Date.now();

      await page.click('[data-testid="nav-heavy-component"]');
      await page.waitForSelector('[data-testid="heavy-component-loaded"]');

      const cachedLoadTime = Date.now() - cachedLoadStart;

      // Cached load should be significantly faster
      expect(cachedLoadTime).toBeLessThan(firstLoadTime * 0.3); // At least 70% faster

      // Verify component state is preserved
      const statePreserved = await page.evaluate(() => {
        const component = document.querySelector('[data-testid="heavy-component"]');
        return component?.getAttribute('data-state-preserved') === 'true';
      });

      expect(statePreserved).toBe(true);

      console.log('📊 KeepAlive Performance:');
      console.log(`  First Load: ${firstLoadTime}ms`);
      console.log(`  Cached Load: ${cachedLoadTime}ms`);
      console.log(`  Performance Gain: ${((firstLoadTime - cachedLoadTime) / firstLoadTime * 100).toFixed(1)}%`);
    });

    test('should validate component cleanup and memory management', async ({ page }) => {
      // Test proper component cleanup
      const initialMemory = await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : null;
      });

      if (!initialMemory) {
        test.skip('Memory API not available');
        return;
      }

      // Create and destroy multiple components
      for (let i = 0; i < 10; i++) {
        await page.goto(`/components/dynamic-component?id=${i}`);
        await page.waitForSelector('[data-testid="dynamic-component-loaded"]');

        // Trigger heavy operations in component
        await page.click('[data-testid="create-heavy-objects"]');
        await page.waitForSelector('[data-testid="objects-created"]');
      }

      const peakMemory = await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : null;
      });

      // Navigate to simple page to trigger cleanup
      await page.goto('/components/minimal');
      await page.waitForSelector('[data-testid="minimal-component"]');

      // Force garbage collection
      await page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
      });

      await page.waitForTimeout(1000);

      const finalMemory = await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : null;
      });

      if (initialMemory && peakMemory && finalMemory) {
        const initialMB = Math.round(initialMemory / 1024 / 1024);
        const peakMB = Math.round(peakMemory / 1024 / 1024);
        const finalMB = Math.round(finalMemory / 1024 / 1024);

        const memoryGrowth = peakMB - initialMB;
        const memoryRecovered = peakMB - finalMB;
        const recoveryRate = (memoryRecovered / memoryGrowth) * 100;

        console.log('📊 Memory Management:');
        console.log(`  Initial Memory: ${initialMB}MB`);
        console.log(`  Peak Memory: ${peakMB}MB`);
        console.log(`  Final Memory: ${finalMB}MB`);
        console.log(`  Memory Recovery: ${recoveryRate.toFixed(1)}%`);

        // Should recover at least 70% of allocated memory
        expect(recoveryRate).toBeGreaterThan(70);

        // Final memory should not be more than 50% above initial
        expect(finalMB).toBeLessThan(initialMB * 1.5);
      }
    });
  });

  test.describe('Virtual Scrolling and Large Lists', () => {
    test('should validate virtual scrolling performance with large datasets', async ({ page }) => {
      // Generate very large dataset
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        title: `Item ${i}`,
        description: `Description for item ${i}`.repeat(10),
        value: Math.random() * 1000,
        timestamp: new Date(Date.now() - i * 1000).toISOString()
      }));

      await mockApiResponse(page, '**/api/large-dataset', {
        items: largeDataset,
        total: largeDataset.length
      });

      // Navigate to virtual scroll component
      await page.goto('/components/virtual-scroll');

      // Measure initial render (should only render visible items)
      const renderMetrics = await measureAndAssertComponentPerformance(
        page,
        '[data-testid="virtual-scroll-container"]',
        {
          maxRenderTime: 2000, // Should be fast despite large dataset
          maxMemoryUsage: 80    // Should not load all items into memory
        }
      );

      // Test scroll performance
      const scrollTests = [
        { scrollTo: 1000, description: 'Small scroll' },
        { scrollTo: 5000, description: 'Medium scroll' },
        { scrollTo: 10000, description: 'Large scroll' },
        { scrollTo: 50000, description: 'Jump to middle' },
        { scrollTo: 0, description: 'Back to top' }
      ];

      const scrollPerformance = [];

      for (const { scrollTo, description } of scrollTests) {
        const scrollStart = Date.now();

        await page.evaluate((position) => {
          const container = document.querySelector('[data-testid="virtual-scroll-container"]');
          if (container) {
            container.scrollTop = position;
          }
        }, scrollTo);

        // Wait for virtual scroll to update
        await page.waitForSelector('[data-testid="virtual-scroll-updated"]');

        const scrollTime = Date.now() - scrollStart;
        scrollPerformance.push({ description, time: scrollTime });

        // Each scroll should be responsive
        expect(scrollTime).toBeLessThan(500); // Less than 500ms
      }

      console.log('📊 Virtual Scrolling Performance:');
      console.log(`  Initial Render: ${renderMetrics.renderTime}ms`);
      scrollPerformance.forEach(({ description, time }) => {
        console.log(`  ${description}: ${time}ms`);
      });

      // Test memory efficiency
      const memoryUsageMB = renderMetrics.memoryUsage
        ? Math.round(renderMetrics.memoryUsage.used / 1024 / 1024)
        : 0;

      console.log(`  Memory Usage: ${memoryUsageMB}MB for 10k items`);

      // Should use minimal memory despite large dataset
      if (renderMetrics.memoryUsage) {
        expect(memoryUsageMB).toBeLessThan(100); // Less than 100MB for 10k items
      }
    });

    test('should validate infinite scroll performance', async ({ page }) => {
      // Test infinite scroll implementation
      await page.goto('/components/infinite-scroll');

      const loadTimes = [];
      let currentPage = 1;

      // Measure multiple page loads
      while (currentPage <= 5) {
        const loadStart = Date.now();

        // Scroll to bottom to trigger next page load
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        await page.waitForSelector(`[data-testid="page-${currentPage + 1}-loaded"]`, { timeout: 5000 });

        const loadTime = Date.now() - loadStart;
        loadTimes.push(loadTime);

        // Each page load should be efficient
        expect(loadTime).toBeLessThan(3000); // Less than 3 seconds

        currentPage++;
      }

      console.log('📊 Infinite Scroll Performance:');
      loadTimes.forEach((time, index) => {
        console.log(`  Page ${index + 2} Load: ${time}ms`);
      });

      const averageLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
      console.log(`  Average Load Time: ${averageLoadTime.toFixed(0)}ms`);

      // Performance should remain consistent across pages
      const maxLoadTime = Math.max(...loadTimes);
      const minLoadTime = Math.min(...loadTimes);
      const loadTimeVariance = ((maxLoadTime - minLoadTime) / minLoadTime) * 100;

      expect(loadTimeVariance).toBeLessThan(100); // Less than 100% variance
    });
  });

  test.describe('Performance Regression Testing', () => {
    test('should detect performance regressions across test runs', async ({ page }) => {
      // Run standardized performance test
      await page.goto('/dashboard');

      const testName = 'dashboard-performance-regression';

      // Measure current performance
      const currentMetrics = await measureAndAssertComponentPerformance(
        page,
        '[data-testid="dashboard"]',
        COMPONENT_PERFORMANCE_BUDGETS.dashboard
      );

      // Capture in trend data
      await capturePerformanceTrend(page, testName, currentMetrics);

      // Analyze trends
      const trendAnalysis = await analyzePerformanceTrends(page, testName);

      console.log('📊 Performance Trend Analysis:');
      console.log(`  Trend: ${trendAnalysis.trend}`);
      console.log(`  Average Change: ${trendAnalysis.averageChange.toFixed(1)}%`);
      console.log(`  Recommendation: ${trendAnalysis.recommendation}`);

      // Alert on significant performance degradation
      if (trendAnalysis.trend === 'degrading' && Math.abs(trendAnalysis.averageChange) > 10) {
        console.warn('🚨 Significant performance regression detected!');
        console.warn(`Performance has degraded by ${trendAnalysis.averageChange.toFixed(1)}%`);
      }

      // Generate comprehensive performance report
      const performanceReport = await generatePerformanceReport(page);

      console.log('📊 Performance Report:');
      console.log(performanceReport.summary);

      if (performanceReport.recommendations.length > 0) {
        console.log('💡 Recommendations:');
        performanceReport.recommendations.forEach(rec => {
          console.log(`  - ${rec}`);
        });
      }

      // Fail test if critical performance regression is detected
      if (trendAnalysis.trend === 'degrading' && Math.abs(trendAnalysis.averageChange) > 25) {
        throw new Error(`Critical performance regression: ${trendAnalysis.averageChange.toFixed(1)}% degradation`);
      }
    });

    test('should validate performance under stress conditions', async ({ page }) => {
      // Test performance under various stress conditions
      const stressTests = [
        {
          name: 'High Memory Usage',
          action: async () => {
            // Simulate high memory usage
            await page.evaluate(() => {
              window.memoryStressTest = Array.from({ length: 100000 }, () => ({
                data: new Array(1000).fill(Math.random())
              }));
            });
          }
        },
        {
          name: 'High CPU Usage',
          action: async () => {
            // Simulate CPU-intensive operations
            await page.evaluate(() => {
              const startTime = performance.now();
              while (performance.now() - startTime < 1000) {
                // CPU-intensive loop for 1 second
                Math.random() * Math.random();
              }
            });
          }
        },
        {
          name: 'Many DOM Mutations',
          action: async () => {
            // Simulate many DOM changes
            await page.evaluate(() => {
              const container = document.body;
              for (let i = 0; i < 1000; i++) {
                const div = document.createElement('div');
                div.textContent = `Stress test element ${i}`;
                container.appendChild(div);
              }
            });
          }
        }
      ];

      for (const stressTest of stressTests) {
        console.log(`🔥 Running stress test: ${stressTest.name}`);

        // Apply stress condition
        await stressTest.action();

        // Measure component performance under stress
        const stressStart = Date.now();

        await page.goto('/dashboard');
        await page.waitForSelector('[data-testid="dashboard-loaded"]');

        const stressTime = Date.now() - stressStart;

        console.log(`  Performance under ${stressTest.name}: ${stressTime}ms`);

        // Should still meet basic performance requirements under stress
        expect(stressTime).toBeLessThan(8000); // 8 seconds under stress

        // Clean up stress test
        await page.evaluate(() => {
          if (window.memoryStressTest) {
            delete window.memoryStressTest;
          }
          // Remove stress test DOM elements
          document.querySelectorAll('div').forEach(div => {
            if (div.textContent?.includes('Stress test element')) {
              div.remove();
            }
          });
        });
      }
    });
  });
});