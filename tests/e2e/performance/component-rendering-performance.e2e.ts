import { test, expect, Page } from "@playwright/test";
import {
  AuthPage,
  DashboardPage,
  ReceiptsPage,
  TEST_USERS,
  waitForPageLoad,
  expectElementVisible,
  expectElementText,
  mockApiResponse,
} from "../utils/test-helpers";

// Component Rendering Performance E2E Tests
test.describe("Component Rendering Performance", () => {
  let authPage: AuthPage;
  let dashboardPage: DashboardPage;
  let receiptsPage: ReceiptsPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);
    receiptsPage = new ReceiptsPage(page);

    // Login to access components
    await authPage.goto();
    await authPage.login(
      TEST_USERS.STANDARD_USER.email,
      TEST_USERS.STANDARD_USER.password,
    );
    await page.waitForSelector('[data-testid="dashboard"]');

    // Setup performance monitoring
    await page.addInitScript(() => {
      window.performanceMetrics = {
        renderTimes: [],
        componentMounts: [],
        reactivityUpdates: [],
        memoryUsage: [],
        startTime: performance.now(),
      };

      // Override console.time for component timing
      const originalTime = console.time;
      const originalTimeEnd = console.timeEnd;

      console.time = function (label) {
        window.performanceMetrics.renderTimes.push({
          label,
          start: performance.now(),
          type: "start",
        });
        return originalTime.call(this, label);
      };

      console.timeEnd = function (label) {
        const endTime = performance.now();
        const startEntry = window.performanceMetrics.renderTimes.find(
          (entry) => entry.label === label && entry.type === "start",
        );
        if (startEntry) {
          window.performanceMetrics.renderTimes.push({
            label,
            duration: endTime - startEntry.start,
            end: endTime,
            type: "end",
          });
        }
        return originalTimeEnd.call(this, label);
      };
    });
  });

  test.describe("Initial Load Performance", () => {
    test("should measure dashboard component initial rendering time", async ({
      page,
    }) => {
      // Clear any existing metrics
      await page.evaluate(() => {
        window.performanceMetrics = {
          renderTimes: [],
          componentMounts: [],
          reactivityUpdates: [],
          memoryUsage: [],
          startTime: performance.now(),
        };
      });

      // Mock dashboard data
      await mockApiResponse(page, "**/api/dashboard/summary", {
        totalSpending: 1250.99,
        receiptCount: 45,
        monthlyBudget: 2000.0,
        recentReceipts: Array.from({ length: 5 }, (_, i) => ({
          id: `receipt-${i}`,
          merchant: `Store ${i}`,
          total: Math.random() * 100,
          date: new Date().toISOString(),
        })),
      });

      const navigationStart = Date.now();

      // Navigate to dashboard and measure rendering
      await page.goto("/dashboard");

      // Wait for all dashboard components to load
      await page.waitForSelector('[data-testid="dashboard-loaded"]', {
        timeout: 15000,
      });

      const navigationEnd = Date.now();
      const totalNavigationTime = navigationEnd - navigationStart;

      // Measure specific component render times
      const renderMetrics = await page.evaluate(() => {
        const metrics = window.performanceMetrics;
        const paintEntries = performance.getEntriesByType("paint");
        const navigationEntries = performance.getEntriesByType("navigation");

        return {
          totalNavigationTime: navigationEntries[0]?.loadEventEnd || 0,
          firstPaint:
            paintEntries.find((entry) => entry.name === "first-paint")
              ?.startTime || 0,
          firstContentfulPaint:
            paintEntries.find(
              (entry) => entry.name === "first-contentful-paint",
            )?.startTime || 0,
          customRenderTimes: metrics.renderTimes,
          memoryUsed: performance.memory
            ? {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
              }
            : null,
        };
      });

      // Performance assertions
      expect(totalNavigationTime).toBeLessThan(5000); // Should load within 5 seconds
      expect(renderMetrics.firstContentfulPaint).toBeLessThan(2000); // FCP within 2 seconds

      // Log performance metrics for analysis
      console.log("📊 Dashboard Rendering Performance:");
      console.log(`  Navigation Time: ${totalNavigationTime}ms`);
      console.log(`  First Paint: ${renderMetrics.firstPaint}ms`);
      console.log(
        `  First Contentful Paint: ${renderMetrics.firstContentfulPaint}ms`,
      );

      if (renderMetrics.memoryUsed) {
        const memoryMB = Math.round(
          renderMetrics.memoryUsed.usedJSHeapSize / 1024 / 1024,
        );
        console.log(`  Memory Usage: ${memoryMB}MB`);
        expect(memoryMB).toBeLessThan(50); // Should use less than 50MB initially
      }

      // Take screenshot for visual validation
      await page.screenshot({
        path: `test-results/performance/dashboard-render-${Date.now()}.png`,
        fullPage: true,
      });
    });

    test("should measure receipt list component rendering with large datasets", async ({
      page,
    }) => {
      // Generate large dataset for stress testing
      const largeReceiptDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `receipt-${i}`,
        merchant: `Store ${i % 50}`, // 50 different stores
        total: Math.round((Math.random() * 200 + 10) * 100) / 100,
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        category: ["groceries", "dining", "fuel", "shopping", "utilities"][
          i % 5
        ],
        status: ["processed", "pending", "failed"][i % 3],
      }));

      await mockApiResponse(page, "**/api/receipts**", {
        receipts: largeReceiptDataset,
        total: largeReceiptDataset.length,
        page: 1,
        limit: 50, // Paginated
        hasMore: true,
      });

      const renderStart = Date.now();

      // Navigate to receipts page
      await page.goto("/receipts");

      // Wait for initial render (first page)
      await page.waitForSelector('[data-testid="receipts-list-loaded"]', {
        timeout: 10000,
      });

      const initialRenderTime = Date.now() - renderStart;

      // Verify initial page renders within acceptable time
      expect(initialRenderTime).toBeLessThan(3000); // 3 seconds for first page

      // Test virtual scrolling performance
      const scrollStart = Date.now();

      // Scroll through list to trigger virtual scrolling
      await page.evaluate(() => {
        const container = document.querySelector(
          '[data-testid="receipts-scroll-container"]',
        );
        if (container) {
          container.scrollTop = 5000; // Scroll down significantly
        }
      });

      // Wait for new items to render
      await page.waitForTimeout(500);

      const scrollRenderTime = Date.now() - scrollStart;

      // Virtual scrolling should be fast
      expect(scrollRenderTime).toBeLessThan(1000); // 1 second for scroll updates

      // Measure memory usage after large dataset
      const memoryUsage = await page.evaluate(() => {
        return performance.memory
          ? {
              usedJSHeapSize: performance.memory.usedJSHeapSize,
              totalJSHeapSize: performance.memory.totalJSHeapSize,
            }
          : null;
      });

      if (memoryUsage) {
        const memoryMB = Math.round(memoryUsage.usedJSHeapSize / 1024 / 1024);
        console.log("📊 Large Dataset Performance:");
        console.log(`  Initial Render: ${initialRenderTime}ms`);
        console.log(`  Scroll Performance: ${scrollRenderTime}ms`);
        console.log(`  Memory Usage: ${memoryMB}MB`);

        // Should not exceed 100MB even with large dataset
        expect(memoryMB).toBeLessThan(100);
      }

      // Test search performance with large dataset
      const searchStart = Date.now();

      await page.fill('[data-testid="receipts-search"]', "Store 1");
      await page.waitForSelector('[data-testid="search-results-updated"]');

      const searchTime = Date.now() - searchStart;

      // Search should be responsive even with large dataset
      expect(searchTime).toBeLessThan(2000); // 2 seconds for search

      console.log(`  Search Performance: ${searchTime}ms`);
    });
  });

  test.describe("Dynamic Rendering Performance", () => {
    test("should measure component re-rendering performance during data updates", async ({
      page,
    }) => {
      await page.goto("/dashboard");
      await page.waitForSelector('[data-testid="dashboard-loaded"]');

      // Setup performance monitoring for re-renders
      await page.evaluate(() => {
        window.rerenderCount = 0;
        window.rerenderTimes = [];

        // Monitor DOM mutations as proxy for re-renders
        const observer = new MutationObserver((mutations) => {
          window.rerenderCount++;
          window.rerenderTimes.push({
            time: performance.now(),
            mutations: mutations.length,
          });
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeOldValue: true,
        });

        window.mutationObserver = observer;
      });

      // Trigger multiple data updates to test re-rendering
      for (let i = 1; i <= 10; i++) {
        await mockApiResponse(page, "**/api/dashboard/summary", {
          totalSpending: 1000 + i * 50,
          receiptCount: 40 + i,
          monthlyBudget: 2000.0,
          lastUpdated: new Date().toISOString(),
        });

        // Trigger refresh
        await page.click('[data-testid="refresh-dashboard"]');
        await page.waitForSelector('[data-testid="dashboard-updated"]', {
          timeout: 3000,
        });

        // Verify data updated
        await expectElementText(
          page,
          '[data-testid="total-spending"]',
          `$${(1000 + i * 50).toFixed(2)}`,
        );
      }

      // Analyze re-rendering performance
      const rerenderMetrics = await page.evaluate(() => {
        window.mutationObserver?.disconnect();

        return {
          totalRerenders: window.rerenderCount,
          rerenderTimes: window.rerenderTimes,
          averageRerenderTime:
            window.rerenderTimes.length > 1
              ? (window.rerenderTimes[window.rerenderTimes.length - 1].time -
                  window.rerenderTimes[0].time) /
                window.rerenderTimes.length
              : 0,
        };
      });

      console.log("📊 Re-rendering Performance:");
      console.log(`  Total Re-renders: ${rerenderMetrics.totalRerenders}`);
      console.log(
        `  Average Re-render Time: ${rerenderMetrics.averageRerenderTime.toFixed(2)}ms`,
      );

      // Re-renders should be efficient
      expect(rerenderMetrics.averageRerenderTime).toBeLessThan(100); // Less than 100ms average

      // Should not have excessive re-renders (Vue should optimize)
      expect(rerenderMetrics.totalRerenders).toBeLessThan(50); // Reasonable for 10 updates
    });

    test("should measure chart component rendering performance", async ({
      page,
    }) => {
      // Mock chart data
      const chartData = {
        spendingTrend: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          amount: Math.random() * 100 + 20,
        })),
        categoryBreakdown: [
          { category: "Groceries", amount: 450.0, percentage: 35 },
          { category: "Dining", amount: 320.0, percentage: 25 },
          { category: "Transportation", amount: 260.0, percentage: 20 },
          { category: "Shopping", amount: 200.0, percentage: 15 },
          { category: "Utilities", amount: 65.0, percentage: 5 },
        ],
      };

      await mockApiResponse(page, "**/api/analytics/charts", chartData);

      const chartRenderStart = Date.now();

      // Navigate to reports page with charts
      await page.goto("/reports/analytics");

      // Wait for charts to render
      await page.waitForSelector(
        '[data-testid="spending-trend-chart-loaded"]',
        { timeout: 15000 },
      );
      await page.waitForSelector('[data-testid="category-chart-loaded"]', {
        timeout: 15000,
      });

      const chartRenderTime = Date.now() - chartRenderStart;

      // Charts should render within reasonable time
      expect(chartRenderTime).toBeLessThan(8000); // 8 seconds for complex charts

      // Test chart interaction performance
      const interactionStart = Date.now();

      // Hover over chart elements to test responsiveness
      await page.hover('[data-testid="chart-data-point-0"]');
      await page.waitForSelector('[data-testid="chart-tooltip"]', {
        timeout: 2000,
      });

      const interactionTime = Date.now() - interactionStart;

      // Chart interactions should be responsive
      expect(interactionTime).toBeLessThan(500); // 500ms for tooltip

      // Test chart resize performance
      const resizeStart = Date.now();

      // Simulate window resize
      await page.setViewportSize({ width: 800, height: 600 });
      await page.waitForTimeout(500); // Allow for resize handling

      const resizeTime = Date.now() - resizeStart;

      // Chart resize should be smooth
      expect(resizeTime).toBeLessThan(1000); // 1 second for resize

      console.log("📊 Chart Rendering Performance:");
      console.log(`  Initial Render: ${chartRenderTime}ms`);
      console.log(`  Interaction Time: ${interactionTime}ms`);
      console.log(`  Resize Time: ${resizeTime}ms`);

      // Measure chart animation performance
      await page.click('[data-testid="animate-chart-btn"]');

      const animationMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          const startTime = performance.now();
          let frameCount = 0;

          const countFrames = () => {
            frameCount++;
            if (performance.now() - startTime < 1000) {
              // Count for 1 second
              requestAnimationFrame(countFrames);
            } else {
              resolve({
                fps: frameCount,
                duration: performance.now() - startTime,
              });
            }
          };

          requestAnimationFrame(countFrames);
        });
      });

      console.log(`  Animation FPS: ${animationMetrics.fps}`);

      // Should maintain reasonable FPS during animations
      expect(animationMetrics.fps).toBeGreaterThan(30); // At least 30 FPS
    });
  });

  test.describe("Component Lifecycle Performance", () => {
    test("should measure component mount and unmount performance", async ({
      page,
    }) => {
      // Track component lifecycle timing
      await page.addInitScript(() => {
        window.componentLifecycle = {
          mounts: [],
          unmounts: [],
          currentComponents: new Set(),
        };

        // Mock Vue component lifecycle hooks for monitoring
        const originalCreateApp = window.Vue?.createApp;
        if (originalCreateApp) {
          window.Vue.createApp = function (...args) {
            const app = originalCreateApp.apply(this, args);

            const originalMount = app.mount;
            app.mount = function (container) {
              const startTime = performance.now();
              const result = originalMount.call(this, container);
              const endTime = performance.now();

              window.componentLifecycle.mounts.push({
                container: container,
                mountTime: endTime - startTime,
                timestamp: endTime,
              });

              return result;
            };

            return app;
          };
        }
      });

      // Test rapid navigation between components
      const routes = [
        "/dashboard",
        "/receipts",
        "/reports",
        "/settings",
        "/upload",
      ];
      const navigationTimes = [];

      for (const route of routes) {
        const navStart = Date.now();

        await page.goto(route);
        await waitForPageLoad(page);

        const navTime = Date.now() - navStart;
        navigationTimes.push({ route, time: navTime });

        // Each navigation should be reasonably fast
        expect(navTime).toBeLessThan(4000); // 4 seconds per route
      }

      // Test back and forth navigation (component caching)
      const cacheTestStart = Date.now();

      await page.goto("/dashboard");
      await waitForPageLoad(page);

      await page.goto("/receipts");
      await waitForPageLoad(page);

      await page.goBack();
      await waitForPageLoad(page);

      const cacheTestTime = Date.now() - cacheTestStart;

      // Cached navigation should be faster
      expect(cacheTestTime).toBeLessThan(2000); // 2 seconds for cached navigation

      console.log("📊 Component Lifecycle Performance:");
      navigationTimes.forEach(({ route, time }) => {
        console.log(`  ${route}: ${time}ms`);
      });
      console.log(`  Cache Navigation: ${cacheTestTime}ms`);

      // Get lifecycle metrics
      const lifecycleMetrics = await page.evaluate(
        () => window.componentLifecycle,
      );

      if (lifecycleMetrics.mounts.length > 0) {
        const avgMountTime =
          lifecycleMetrics.mounts.reduce(
            (sum, mount) => sum + mount.mountTime,
            0,
          ) / lifecycleMetrics.mounts.length;
        console.log(`  Average Mount Time: ${avgMountTime.toFixed(2)}ms`);

        // Component mounts should be efficient
        expect(avgMountTime).toBeLessThan(50); // Less than 50ms average mount time
      }
    });

    test("should measure lazy component loading performance", async ({
      page,
    }) => {
      // Test lazy-loaded components (like heavy chart components)
      const lazyLoadStart = Date.now();

      await page.goto("/reports/advanced-analytics");

      // Wait for lazy component to load
      await page.waitForSelector('[data-testid="lazy-component-loaded"]', {
        timeout: 10000,
      });

      const lazyLoadTime = Date.now() - lazyLoadStart;

      // Lazy loading should complete within reasonable time
      expect(lazyLoadTime).toBeLessThan(8000); // 8 seconds for lazy loading

      // Test that subsequent loads are faster (cached)
      await page.goto("/dashboard");
      await waitForPageLoad(page);

      const cachedLoadStart = Date.now();

      await page.goto("/reports/advanced-analytics");
      await page.waitForSelector('[data-testid="lazy-component-loaded"]', {
        timeout: 5000,
      });

      const cachedLoadTime = Date.now() - cachedLoadStart;

      // Cached lazy component should load faster
      expect(cachedLoadTime).toBeLessThan(lazyLoadTime * 0.5); // At least 50% faster

      console.log("📊 Lazy Loading Performance:");
      console.log(`  Initial Load: ${lazyLoadTime}ms`);
      console.log(`  Cached Load: ${cachedLoadTime}ms`);
      console.log(
        `  Improvement: ${(((lazyLoadTime - cachedLoadTime) / lazyLoadTime) * 100).toFixed(1)}%`,
      );
    });
  });

  test.describe("Memory and Resource Performance", () => {
    test("should monitor memory usage during component operations", async ({
      page,
    }) => {
      // Initial memory baseline
      const initialMemory = await page.evaluate(() => {
        return performance.memory
          ? {
              used: performance.memory.usedJSHeapSize,
              total: performance.memory.totalJSHeapSize,
            }
          : null;
      });

      if (!initialMemory) {
        test.skip("Memory API not available");
        return;
      }

      await page.goto("/dashboard");
      await waitForPageLoad(page);

      // Perform memory-intensive operations
      const operations = [
        async () => {
          // Load large receipt list
          await page.goto("/receipts");
          await page.waitForSelector('[data-testid="receipts-list-loaded"]');
        },
        async () => {
          // Load charts
          await page.goto("/reports/analytics");
          await page.waitForSelector('[data-testid="charts-loaded"]');
        },
        async () => {
          // Rapid navigation
          for (let i = 0; i < 5; i++) {
            await page.goto(`/receipts?page=${i + 1}`);
            await waitForPageLoad(page);
          }
        },
      ];

      const memorySnapshots = [initialMemory];

      for (const operation of operations) {
        await operation();

        const currentMemory = await page.evaluate(() => {
          return performance.memory
            ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
              }
            : null;
        });

        if (currentMemory) {
          memorySnapshots.push(currentMemory);
        }

        // Force garbage collection if available
        await page.evaluate(() => {
          if (window.gc) {
            window.gc();
          }
        });
      }

      // Analyze memory usage
      const memoryAnalysis = memorySnapshots.map((snapshot, index) => ({
        step: index,
        usedMB: Math.round(snapshot.used / 1024 / 1024),
        totalMB: Math.round(snapshot.total / 1024 / 1024),
      }));

      console.log("📊 Memory Usage Analysis:");
      memoryAnalysis.forEach(({ step, usedMB, totalMB }) => {
        console.log(`  Step ${step}: ${usedMB}MB used / ${totalMB}MB total`);
      });

      // Memory should not grow excessively
      const maxMemory = Math.max(...memoryAnalysis.map((m) => m.usedMB));
      const initialMemoryMB = memoryAnalysis[0].usedMB;
      const memoryGrowth = maxMemory - initialMemoryMB;

      console.log(`  Memory Growth: ${memoryGrowth}MB`);

      // Should not grow more than 150MB during operations
      expect(memoryGrowth).toBeLessThan(150);

      // Final memory should not be more than 3x initial
      const finalMemoryMB = memoryAnalysis[memoryAnalysis.length - 1].usedMB;
      expect(finalMemoryMB).toBeLessThan(initialMemoryMB * 3);
    });

    test("should measure component cleanup and garbage collection", async ({
      page,
    }) => {
      // Create many components and then navigate away to test cleanup
      await page.goto("/receipts");
      await waitForPageLoad(page);

      // Open many receipt details (simulating heavy component usage)
      for (let i = 0; i < 10; i++) {
        await page.click(`[data-testid="receipt-item-${i}"]`);
        await page.waitForSelector('[data-testid="receipt-detail-loaded"]');
        await page.goBack();
        await waitForPageLoad(page);
      }

      const beforeCleanup = await page.evaluate(() => {
        return performance.memory
          ? {
              used: performance.memory.usedJSHeapSize,
              total: performance.memory.totalJSHeapSize,
            }
          : null;
      });

      // Navigate away to trigger component cleanup
      await page.goto("/dashboard");
      await waitForPageLoad(page);

      // Force garbage collection
      await page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
      });

      // Wait for cleanup
      await page.waitForTimeout(1000);

      const afterCleanup = await page.evaluate(() => {
        return performance.memory
          ? {
              used: performance.memory.usedJSHeapSize,
              total: performance.memory.totalJSHeapSize,
            }
          : null;
      });

      if (beforeCleanup && afterCleanup) {
        const beforeMB = Math.round(beforeCleanup.used / 1024 / 1024);
        const afterMB = Math.round(afterCleanup.used / 1024 / 1024);
        const cleaned = beforeMB - afterMB;

        console.log("📊 Cleanup Performance:");
        console.log(`  Before Cleanup: ${beforeMB}MB`);
        console.log(`  After Cleanup: ${afterMB}MB`);
        console.log(`  Memory Freed: ${cleaned}MB`);

        // Should free at least some memory during cleanup
        expect(cleaned).toBeGreaterThan(0);

        // Should not retain excessive memory
        expect(afterMB).toBeLessThan(beforeMB * 1.5);
      }
    });
  });

  test.describe("Performance Regression Detection", () => {
    test("should establish performance baselines and detect regressions", async ({
      page,
    }) => {
      const performanceBaselines = {
        dashboardLoad: 3000, // 3 seconds
        receiptListLoad: 2500, // 2.5 seconds
        chartRender: 5000, // 5 seconds
        searchResponse: 1000, // 1 second
        memoryUsage: 80, // 80MB
      };

      const measurements = {};

      // Dashboard load performance
      const dashboardStart = Date.now();
      await page.goto("/dashboard");
      await page.waitForSelector('[data-testid="dashboard-loaded"]');
      measurements.dashboardLoad = Date.now() - dashboardStart;

      // Receipt list load performance
      const receiptListStart = Date.now();
      await page.goto("/receipts");
      await page.waitForSelector('[data-testid="receipts-list-loaded"]');
      measurements.receiptListLoad = Date.now() - receiptListStart;

      // Chart render performance
      const chartStart = Date.now();
      await page.goto("/reports/analytics");
      await page.waitForSelector('[data-testid="charts-loaded"]');
      measurements.chartRender = Date.now() - chartStart;

      // Search response performance
      const searchStart = Date.now();
      await page.fill('[data-testid="search-input"]', "walmart");
      await page.waitForSelector('[data-testid="search-results-loaded"]');
      measurements.searchResponse = Date.now() - searchStart;

      // Memory usage
      const memory = await page.evaluate(() => {
        return performance.memory
          ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)
          : null;
      });
      if (memory) {
        measurements.memoryUsage = memory;
      }

      // Compare against baselines
      const regressions = [];

      Object.entries(performanceBaselines).forEach(([metric, baseline]) => {
        const measured = measurements[metric];
        if (measured && measured > baseline) {
          const regression = (((measured - baseline) / baseline) * 100).toFixed(
            1,
          );
          regressions.push({
            metric,
            baseline,
            measured,
            regression: `${regression}%`,
          });
        }
      });

      console.log("📊 Performance Baseline Comparison:");
      Object.entries(measurements).forEach(([metric, value]) => {
        const baseline = performanceBaselines[metric];
        const status = value <= baseline ? "✅" : "❌";
        const unit = metric === "memoryUsage" ? "MB" : "ms";
        console.log(
          `  ${status} ${metric}: ${value}${unit} (baseline: ${baseline}${unit})`,
        );
      });

      if (regressions.length > 0) {
        console.log("🚨 Performance Regressions Detected:");
        regressions.forEach(({ metric, baseline, measured, regression }) => {
          console.log(
            `  ${metric}: ${measured} vs ${baseline} baseline (+${regression})`,
          );
        });
      }

      // Fail test if critical regressions are detected
      const criticalRegressions = regressions.filter(
        (r) => r.metric === "dashboardLoad" || r.metric === "memoryUsage",
      );

      expect(criticalRegressions.length).toBe(0);

      // Save performance data for trend analysis
      await page.evaluate(
        (data) => {
          const perfData = {
            timestamp: new Date().toISOString(),
            measurements: data.measurements,
            regressions: data.regressions,
            userAgent: navigator.userAgent,
          };

          localStorage.setItem("performance-data", JSON.stringify(perfData));
        },
        { measurements, regressions },
      );
    });
  });
});
