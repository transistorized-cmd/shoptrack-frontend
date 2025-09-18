import { test, expect } from '@playwright/test';

// Basic Performance Tests - Tests that work with actual app structure
test.describe('Basic Vue Application Performance', () => {
  test.beforeEach(async ({ page }) => {
    // Setup performance monitoring
    await page.addInitScript(() => {
      window.performanceMetrics = {
        renderTimes: [],
        componentMounts: [],
        networkRequests: [],
        memorySnapshots: [],
        startTime: performance.now()
      };

      // Track network requests
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const startTime = performance.now();
        window.performanceMetrics.networkRequests.push({
          url: args[0],
          startTime,
          method: args[1]?.method || 'GET'
        });

        try {
          const response = await originalFetch.apply(this, args);
          const endTime = performance.now();
          const requestIndex = window.performanceMetrics.networkRequests.length - 1;
          window.performanceMetrics.networkRequests[requestIndex].endTime = endTime;
          window.performanceMetrics.networkRequests[requestIndex].duration = endTime - startTime;
          window.performanceMetrics.networkRequests[requestIndex].status = response.status;
          return response;
        } catch (error) {
          const endTime = performance.now();
          const requestIndex = window.performanceMetrics.networkRequests.length - 1;
          window.performanceMetrics.networkRequests[requestIndex].endTime = endTime;
          window.performanceMetrics.networkRequests[requestIndex].duration = endTime - startTime;
          window.performanceMetrics.networkRequests[requestIndex].error = error.message;
          throw error;
        }
      };

      // Track memory usage periodically
      setInterval(() => {
        if (performance.memory) {
          window.performanceMetrics.memorySnapshots.push({
            timestamp: performance.now(),
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
          });
        }
      }, 1000);
    });
  });

  test('should measure Vue app initial load performance', async ({ page }) => {
    const navigationStart = Date.now();

    // Navigate to the app
    await page.goto('/');

    // Wait for Vue app to mount (look for the basic app structure)
    await page.waitForSelector('#app', { timeout: 15000 });

    const navigationTime = Date.now() - navigationStart;

    // Get performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const paintEntries = performance.getEntriesByType('paint');
      const navigationEntries = performance.getEntriesByType('navigation');

      return {
        navigationTime,
        firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        domContentLoaded: navigationEntries[0]?.domContentLoadedEventEnd || 0,
        loadComplete: navigationEntries[0]?.loadEventEnd || 0,
        memoryUsage: performance.memory ? {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        } : null,
        networkRequests: window.performanceMetrics?.networkRequests.length || 0
      };
    });

    // Performance assertions
    expect(navigationTime).toBeLessThan(10000); // Should load within 10 seconds
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(5000); // FCP within 5 seconds

    console.log('📊 Vue App Load Performance:');
    console.log(`  Navigation Time: ${navigationTime}ms`);
    console.log(`  First Paint: ${performanceMetrics.firstPaint}ms`);
    console.log(`  First Contentful Paint: ${performanceMetrics.firstContentfulPaint}ms`);
    console.log(`  DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
    console.log(`  Load Complete: ${performanceMetrics.loadComplete}ms`);
    console.log(`  Network Requests: ${performanceMetrics.networkRequests}`);

    if (performanceMetrics.memoryUsage) {
      console.log(`  Memory Usage: ${performanceMetrics.memoryUsage.used}MB / ${performanceMetrics.memoryUsage.total}MB`);
      expect(performanceMetrics.memoryUsage.used).toBeLessThan(100); // Should use less than 100MB initially
    }

    // Take screenshot for visual validation
    await page.screenshot({
      path: `test-results/performance/vue-app-load-${Date.now()}.png`,
      fullPage: true
    });
  });

  test('should measure component reactivity performance', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#app');

    // Setup reactivity tracking
    await page.evaluate(() => {
      window.reactivityMetrics = {
        rerenderCount: 0,
        mutationCount: 0,
        lastMutation: 0
      };

      // Track DOM mutations as proxy for re-renders
      const observer = new MutationObserver((mutations) => {
        window.reactivityMetrics.mutationCount += mutations.length;
        window.reactivityMetrics.rerenderCount++;
        window.reactivityMetrics.lastMutation = performance.now();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });

      window.mutationObserver = observer;
    });

    // Test theme toggle reactivity (this should exist in the app)
    const themeToggleStart = Date.now();

    // Look for theme toggle button
    const themeButton = page.locator('button').filter({ hasText: /theme|dark|light/i }).first();

    if (await themeButton.count() > 0) {
      await themeButton.click();

      // Wait for theme change to complete
      await page.waitForTimeout(500);

      const themeToggleTime = Date.now() - themeToggleStart;

      // Theme toggle should be fast
      expect(themeToggleTime).toBeLessThan(1000);

      console.log(`  Theme Toggle Performance: ${themeToggleTime}ms`);
    }

    // Test mobile menu reactivity if available
    const mobileMenuButton = page.locator('button').filter({ hasText: /menu/i }).first();

    if (await mobileMenuButton.count() > 0) {
      const menuToggleStart = Date.now();

      await mobileMenuButton.click();
      await page.waitForTimeout(300);

      const menuToggleTime = Date.now() - menuToggleStart;

      // Menu toggle should be fast
      expect(menuToggleTime).toBeLessThan(500);

      console.log(`  Mobile Menu Toggle: ${menuToggleTime}ms`);
    }

    // Get reactivity metrics
    const reactivityMetrics = await page.evaluate(() => {
      if (window.mutationObserver) {
        window.mutationObserver.disconnect();
      }
      return window.reactivityMetrics;
    });

    console.log('📊 Reactivity Performance:');
    console.log(`  Total Re-renders: ${reactivityMetrics.rerenderCount}`);
    console.log(`  Total Mutations: ${reactivityMetrics.mutationCount}`);

    // Should not have excessive re-renders for simple interactions
    expect(reactivityMetrics.rerenderCount).toBeLessThan(20);
  });

  test('should measure memory usage over time', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#app');

    // Run for 10 seconds and track memory usage
    const testDuration = 10000; // 10 seconds
    const startTime = Date.now();

    // Simulate some user interactions over time
    const interactionInterval = setInterval(async () => {
      if (Date.now() - startTime > testDuration) {
        clearInterval(interactionInterval);
        return;
      }

      try {
        // Try clicking various elements to simulate user activity
        const clickableElements = await page.locator('button, a, [role="button"]').all();
        if (clickableElements.length > 0) {
          const randomElement = clickableElements[Math.floor(Math.random() * clickableElements.length)];
          if (await randomElement.isVisible()) {
            await randomElement.click();
            await page.waitForTimeout(100);
          }
        }
      } catch (error) {
        // Ignore interaction errors
      }
    }, 1000);

    // Wait for test duration
    await page.waitForTimeout(testDuration);

    // Get memory analysis
    const memoryAnalysis = await page.evaluate(() => {
      const snapshots = window.performanceMetrics?.memorySnapshots || [];

      if (snapshots.length === 0) {
        return null;
      }

      const usedMemory = snapshots.map(s => s.used);
      const initialMemory = usedMemory[0];
      const finalMemory = usedMemory[usedMemory.length - 1];
      const peakMemory = Math.max(...usedMemory);
      const minMemory = Math.min(...usedMemory);

      return {
        initialMB: Math.round(initialMemory / 1024 / 1024),
        finalMB: Math.round(finalMemory / 1024 / 1024),
        peakMB: Math.round(peakMemory / 1024 / 1024),
        minMB: Math.round(minMemory / 1024 / 1024),
        memoryGrowth: Math.round((finalMemory - initialMemory) / 1024 / 1024),
        memoryVariance: Math.round((peakMemory - minMemory) / 1024 / 1024),
        snapshotCount: snapshots.length
      };
    });

    if (memoryAnalysis) {
      console.log('📊 Memory Usage Analysis:');
      console.log(`  Initial Memory: ${memoryAnalysis.initialMB}MB`);
      console.log(`  Final Memory: ${memoryAnalysis.finalMB}MB`);
      console.log(`  Peak Memory: ${memoryAnalysis.peakMB}MB`);
      console.log(`  Memory Growth: ${memoryAnalysis.memoryGrowth}MB`);
      console.log(`  Memory Variance: ${memoryAnalysis.memoryVariance}MB`);
      console.log(`  Snapshots Taken: ${memoryAnalysis.snapshotCount}`);

      // Memory should not grow excessively during normal usage
      expect(memoryAnalysis.memoryGrowth).toBeLessThan(50); // Less than 50MB growth
      expect(memoryAnalysis.peakMB).toBeLessThan(150); // Peak should be reasonable
    }
  });

  test('should measure bundle size and loading performance', async ({ page }) => {
    // Track resource loading
    const resourceMetrics = {
      jsFiles: [],
      cssFiles: [],
      totalSize: 0,
      loadTimes: []
    };

    page.on('response', async (response) => {
      const url = response.url();
      const size = parseInt(response.headers()['content-length'] || '0');

      if (url.includes('.js')) {
        resourceMetrics.jsFiles.push({ url, size });
        resourceMetrics.totalSize += size;
      } else if (url.includes('.css')) {
        resourceMetrics.cssFiles.push({ url, size });
        resourceMetrics.totalSize += size;
      }
    });

    const loadStart = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - loadStart;

    // Analyze bundle performance
    const bundleAnalysis = {
      totalJSSize: resourceMetrics.jsFiles.reduce((sum, file) => sum + file.size, 0),
      totalCSSSize: resourceMetrics.cssFiles.reduce((sum, file) => sum + file.size, 0),
      totalBundleSize: resourceMetrics.totalSize,
      jsFileCount: resourceMetrics.jsFiles.length,
      cssFileCount: resourceMetrics.cssFiles.length,
      loadTime
    };

    console.log('📊 Bundle Performance Analysis:');
    console.log(`  Total Load Time: ${bundleAnalysis.loadTime}ms`);
    console.log(`  JS Bundle Size: ${(bundleAnalysis.totalJSSize / 1024).toFixed(1)}KB`);
    console.log(`  CSS Bundle Size: ${(bundleAnalysis.totalCSSSize / 1024).toFixed(1)}KB`);
    console.log(`  Total Bundle Size: ${(bundleAnalysis.totalBundleSize / 1024).toFixed(1)}KB`);
    console.log(`  JS Files: ${bundleAnalysis.jsFileCount}`);
    console.log(`  CSS Files: ${bundleAnalysis.cssFileCount}`);

    // Bundle size assertions
    expect(bundleAnalysis.totalJSSize).toBeLessThan(2 * 1024 * 1024); // Less than 2MB JS
    expect(bundleAnalysis.totalCSSSize).toBeLessThan(500 * 1024); // Less than 500KB CSS
    expect(bundleAnalysis.loadTime).toBeLessThan(8000); // Load within 8 seconds
  });

  test('should measure Vue component mounting performance', async ({ page }) => {
    await page.goto('/');

    // Track component mounting
    await page.evaluate(() => {
      window.vuePerformance = {
        componentMounts: [],
        mountTimes: []
      };

      // Try to hook into Vue's component mounting if possible
      if (window.Vue) {
        const originalCreateApp = window.Vue.createApp;
        if (originalCreateApp) {
          window.Vue.createApp = function(...args) {
            const startTime = performance.now();
            const app = originalCreateApp.apply(this, args);

            const originalMount = app.mount;
            app.mount = function(container) {
              const mountStart = performance.now();
              const result = originalMount.call(this, container);
              const mountTime = performance.now() - mountStart;

              window.vuePerformance.componentMounts.push({
                container: typeof container === 'string' ? container : container.tagName,
                mountTime,
                timestamp: performance.now()
              });

              return result;
            };

            return app;
          };
        }
      }
    });

    // Wait for components to mount
    await page.waitForSelector('#app');
    await page.waitForTimeout(2000); // Give time for components to mount

    const vueMetrics = await page.evaluate(() => window.vuePerformance);

    console.log('📊 Vue Component Performance:');
    console.log(`  Component Mounts: ${vueMetrics.componentMounts.length}`);

    if (vueMetrics.componentMounts.length > 0) {
      const totalMountTime = vueMetrics.componentMounts.reduce((sum, mount) => sum + mount.mountTime, 0);
      const averageMountTime = totalMountTime / vueMetrics.componentMounts.length;

      console.log(`  Total Mount Time: ${totalMountTime.toFixed(2)}ms`);
      console.log(`  Average Mount Time: ${averageMountTime.toFixed(2)}ms`);

      // Component mounting should be efficient
      expect(averageMountTime).toBeLessThan(100); // Less than 100ms average
    }
  });

  test('should generate comprehensive performance report', async ({ page }) => {
    const testStart = Date.now();

    await page.goto('/');
    await page.waitForSelector('#app');
    await page.waitForLoadState('networkidle');

    const testEnd = Date.now();
    const totalTestTime = testEnd - testStart;

    // Generate final performance report
    const performanceReport = await page.evaluate((testTime) => {
      const metrics = window.performanceMetrics || {};
      const paintEntries = performance.getEntriesByType('paint');
      const navigationEntries = performance.getEntriesByType('navigation');
      const resourceEntries = performance.getEntriesByType('resource');

      const jsResources = resourceEntries.filter(r => r.name.includes('.js'));
      const cssResources = resourceEntries.filter(r => r.name.includes('.css'));

      return {
        testDuration: testTime,
        timing: {
          firstPaint: paintEntries.find(e => e.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime || 0,
          domContentLoaded: navigationEntries[0]?.domContentLoadedEventEnd || 0,
          loadComplete: navigationEntries[0]?.loadEventEnd || 0
        },
        resources: {
          totalRequests: resourceEntries.length,
          jsRequests: jsResources.length,
          cssRequests: cssResources.length,
          totalTransferSize: resourceEntries.reduce((sum, r) => sum + (r.transferSize || 0), 0)
        },
        memory: performance.memory ? {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
        } : null,
        networkRequests: metrics.networkRequests?.length || 0,
        memorySnapshots: metrics.memorySnapshots?.length || 0
      };
    }, totalTestTime);

    console.log('📊 Comprehensive Performance Report:');
    console.log('='.repeat(50));
    console.log(`🔍 Test Overview:`);
    console.log(`  Total Test Duration: ${performanceReport.testDuration}ms`);
    console.log(`  Memory Snapshots: ${performanceReport.memorySnapshots}`);

    console.log(`\n⏱️  Timing Metrics:`);
    console.log(`  First Paint: ${performanceReport.timing.firstPaint.toFixed(1)}ms`);
    console.log(`  First Contentful Paint: ${performanceReport.timing.firstContentfulPaint.toFixed(1)}ms`);
    console.log(`  DOM Content Loaded: ${performanceReport.timing.domContentLoaded.toFixed(1)}ms`);
    console.log(`  Load Complete: ${performanceReport.timing.loadComplete.toFixed(1)}ms`);

    console.log(`\n📦 Resource Analysis:`);
    console.log(`  Total Requests: ${performanceReport.resources.totalRequests}`);
    console.log(`  JavaScript Files: ${performanceReport.resources.jsRequests}`);
    console.log(`  CSS Files: ${performanceReport.resources.cssRequests}`);
    console.log(`  Total Transfer Size: ${(performanceReport.resources.totalTransferSize / 1024).toFixed(1)}KB`);

    if (performanceReport.memory) {
      console.log(`\n💾 Memory Usage:`);
      console.log(`  Used Memory: ${performanceReport.memory.used}MB`);
      console.log(`  Total Memory: ${performanceReport.memory.total}MB`);
    }

    console.log(`\n🌐 Network Activity:`);
    console.log(`  API Requests: ${performanceReport.networkRequests}`);

    // Performance grade
    let grade = 'A';
    let issues = [];

    if (performanceReport.timing.firstContentfulPaint > 3000) {
      grade = 'B';
      issues.push('Slow First Contentful Paint');
    }
    if (performanceReport.timing.loadComplete > 8000) {
      grade = 'C';
      issues.push('Slow Load Complete');
    }
    if (performanceReport.memory && performanceReport.memory.used > 100) {
      grade = 'B';
      issues.push('High Memory Usage');
    }
    if (performanceReport.resources.totalTransferSize > 2 * 1024 * 1024) {
      grade = 'C';
      issues.push('Large Bundle Size');
    }

    console.log(`\n🎯 Performance Grade: ${grade}`);
    if (issues.length > 0) {
      console.log(`⚠️  Issues Found:`);
      issues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log(`✅ No significant performance issues detected`);
    }

    // Save performance data for trending
    await page.evaluate((report) => {
      const performanceData = {
        timestamp: new Date().toISOString(),
        ...report,
        userAgent: navigator.userAgent
      };
      localStorage.setItem('performance-baseline', JSON.stringify(performanceData));
    }, performanceReport);

    // Performance should meet basic requirements
    expect(performanceReport.timing.firstContentfulPaint).toBeLessThan(5000);
    expect(performanceReport.timing.loadComplete).toBeLessThan(10000);
    if (performanceReport.memory) {
      expect(performanceReport.memory.used).toBeLessThan(150);
    }
  });
});

// Add global types for TypeScript
declare global {
  interface Window {
    performanceMetrics: {
      renderTimes: any[];
      componentMounts: any[];
      networkRequests: any[];
      memorySnapshots: any[];
      startTime: number;
    };
    reactivityMetrics: {
      rerenderCount: number;
      mutationCount: number;
      lastMutation: number;
    };
    vuePerformance: {
      componentMounts: any[];
      mountTimes: any[];
    };
    mutationObserver: MutationObserver;
    Vue: any;
  }
}