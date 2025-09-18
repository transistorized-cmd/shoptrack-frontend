import { test, expect } from '@playwright/test';

// Working Performance Tests - Focus on what actually loads
test.describe('Working Vue Application Performance Tests', () => {
  test('should analyze bundle loading and performance metrics', async ({ page }) => {
    console.log('🚀 Starting Vue App Performance Analysis...');

    // Track all resources loaded
    const resourceMetrics = {
      jsFiles: [],
      cssFiles: [],
      imageFiles: [],
      fontFiles: [],
      totalSize: 0,
      loadTimes: []
    };

    const loadStart = Date.now();

    // Listen to all network responses
    page.on('response', async (response) => {
      const url = response.url();
      const size = parseInt(response.headers()['content-length'] || '0');
      const timing = response.timing();

      const resource = {
        url: url.split('/').pop() || url,
        fullUrl: url,
        size,
        status: response.status(),
        contentType: response.headers()['content-type'] || '',
        timing: timing.responseEnd - timing.requestStart
      };

      if (url.includes('.js') || url.includes('javascript')) {
        resourceMetrics.jsFiles.push(resource);
      } else if (url.includes('.css') || url.includes('stylesheet')) {
        resourceMetrics.cssFiles.push(resource);
      } else if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg') || url.includes('.ico')) {
        resourceMetrics.imageFiles.push(resource);
      } else if (url.includes('.woff') || url.includes('.ttf') || url.includes('font')) {
        resourceMetrics.fontFiles.push(resource);
      }

      resourceMetrics.totalSize += size;
      if (timing) {
        resourceMetrics.loadTimes.push(timing.responseEnd - timing.requestStart);
      }
    });

    // Navigate and wait for basic load
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - loadStart;

    // Get performance timing
    const performanceMetrics = await page.evaluate(() => {
      const paintEntries = performance.getEntriesByType('paint');
      const navigationEntries = performance.getEntriesByType('navigation');
      const resourceEntries = performance.getEntriesByType('resource');

      return {
        firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        domContentLoaded: navigationEntries[0]?.domContentLoadedEventEnd || 0,
        loadComplete: navigationEntries[0]?.loadEventEnd || 0,
        memoryUsage: performance.memory ? {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        } : null,
        resourceCount: resourceEntries.length,
        documentReadyState: document.readyState,
        vueDetected: !!(window as any).__VUE__ || !!(window as any).Vue,
        hasContent: document.body.children.length > 0
      };
    });

    // Analyze bundle composition
    const bundleAnalysis = {
      totalJSSize: resourceMetrics.jsFiles.reduce((sum, file) => sum + file.size, 0),
      totalCSSSize: resourceMetrics.cssFiles.reduce((sum, file) => sum + file.size, 0),
      totalImageSize: resourceMetrics.imageFiles.reduce((sum, file) => sum + file.size, 0),
      totalFontSize: resourceMetrics.fontFiles.reduce((sum, file) => sum + file.size, 0),
      jsFileCount: resourceMetrics.jsFiles.length,
      cssFileCount: resourceMetrics.cssFiles.length,
      imageFileCount: resourceMetrics.imageFiles.length,
      fontFileCount: resourceMetrics.fontFiles.length,
      averageLoadTime: resourceMetrics.loadTimes.length > 0
        ? resourceMetrics.loadTimes.reduce((sum, time) => sum + time, 0) / resourceMetrics.loadTimes.length
        : 0
    };

    // Generate comprehensive report
    console.log('📊 Vue Application Performance Report');
    console.log('='.repeat(60));

    console.log(`\n🔍 Load Overview:`);
    console.log(`  Total Load Time: ${loadTime}ms`);
    console.log(`  Document Ready State: ${performanceMetrics.documentReadyState}`);
    console.log(`  Vue Detected: ${performanceMetrics.vueDetected ? 'Yes' : 'No'}`);
    console.log(`  Has Content: ${performanceMetrics.hasContent ? 'Yes' : 'No'}`);

    console.log(`\n⏱️  Timing Metrics:`);
    console.log(`  First Paint: ${performanceMetrics.firstPaint.toFixed(1)}ms`);
    console.log(`  First Contentful Paint: ${performanceMetrics.firstContentfulPaint.toFixed(1)}ms`);
    console.log(`  DOM Content Loaded: ${performanceMetrics.domContentLoaded.toFixed(1)}ms`);
    console.log(`  Load Complete: ${performanceMetrics.loadComplete.toFixed(1)}ms`);

    console.log(`\n📦 Bundle Analysis:`);
    console.log(`  JavaScript: ${bundleAnalysis.jsFileCount} files, ${(bundleAnalysis.totalJSSize / 1024).toFixed(1)}KB`);
    console.log(`  CSS: ${bundleAnalysis.cssFileCount} files, ${(bundleAnalysis.totalCSSSize / 1024).toFixed(1)}KB`);
    console.log(`  Images: ${bundleAnalysis.imageFileCount} files, ${(bundleAnalysis.totalImageSize / 1024).toFixed(1)}KB`);
    console.log(`  Fonts: ${bundleAnalysis.fontFileCount} files, ${(bundleAnalysis.totalFontSize / 1024).toFixed(1)}KB`);
    console.log(`  Total Bundle: ${(resourceMetrics.totalSize / 1024).toFixed(1)}KB`);
    console.log(`  Average Resource Load Time: ${bundleAnalysis.averageLoadTime.toFixed(1)}ms`);

    if (performanceMetrics.memoryUsage) {
      console.log(`\n💾 Memory Usage:`);
      console.log(`  Used: ${performanceMetrics.memoryUsage.used}MB`);
      console.log(`  Total: ${performanceMetrics.memoryUsage.total}MB`);
      console.log(`  Limit: ${performanceMetrics.memoryUsage.limit}MB`);
    }

    console.log(`\n🌐 Resource Details:`);
    console.log(`  Total HTTP Requests: ${performanceMetrics.resourceCount}`);
    console.log(`  Network Resources Tracked: ${resourceMetrics.jsFiles.length + resourceMetrics.cssFiles.length + resourceMetrics.imageFiles.length + resourceMetrics.fontFiles.length}`);

    // Performance assessment
    let performanceGrade = 'A';
    const issues = [];
    const recommendations = [];

    if (performanceMetrics.firstContentfulPaint > 3000) {
      performanceGrade = 'B';
      issues.push('Slow First Contentful Paint (>3s)');
      recommendations.push('Optimize critical rendering path');
    }

    if (bundleAnalysis.totalJSSize > 1024 * 1024) { // 1MB
      performanceGrade = 'B';
      issues.push('Large JavaScript bundle (>1MB)');
      recommendations.push('Implement code splitting and lazy loading');
    }

    if (performanceMetrics.memoryUsage && performanceMetrics.memoryUsage.used > 100) {
      performanceGrade = 'B';
      issues.push('High initial memory usage (>100MB)');
      recommendations.push('Optimize component initialization');
    }

    if (bundleAnalysis.jsFileCount > 20) {
      performanceGrade = 'C';
      issues.push('Too many JavaScript files');
      recommendations.push('Bundle optimization needed');
    }

    if (loadTime > 5000) {
      performanceGrade = 'C';
      issues.push('Slow overall load time (>5s)');
      recommendations.push('Optimize server response and resource loading');
    }

    console.log(`\n🎯 Performance Assessment:`);
    console.log(`  Overall Grade: ${performanceGrade}`);

    if (issues.length > 0) {
      console.log(`  Issues Found: ${issues.length}`);
      issues.forEach((issue, index) => {
        console.log(`    ${index + 1}. ${issue}`);
      });
    } else {
      console.log(`  ✅ No significant performance issues detected`);
    }

    if (recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      recommendations.forEach((rec, index) => {
        console.log(`    ${index + 1}. ${rec}`);
      });
    }

    // Top resource consumers
    console.log(`\n🔝 Largest Resources:`);
    const allResources = [
      ...resourceMetrics.jsFiles,
      ...resourceMetrics.cssFiles,
      ...resourceMetrics.imageFiles,
      ...resourceMetrics.fontFiles
    ].sort((a, b) => b.size - a.size).slice(0, 5);

    allResources.forEach((resource, index) => {
      console.log(`    ${index + 1}. ${resource.url}: ${(resource.size / 1024).toFixed(1)}KB`);
    });

    // Save performance baseline
    await page.evaluate((data) => {
      const performanceBaseline = {
        timestamp: new Date().toISOString(),
        loadTime: data.loadTime,
        firstContentfulPaint: data.performanceMetrics.firstContentfulPaint,
        bundleSize: data.bundleAnalysis.totalJSSize + data.bundleAnalysis.totalCSSSize,
        memoryUsage: data.performanceMetrics.memoryUsage?.used || 0,
        resourceCount: data.performanceMetrics.resourceCount,
        grade: data.performanceGrade
      };

      localStorage.setItem('vue-performance-baseline', JSON.stringify(performanceBaseline));
    }, { loadTime, performanceMetrics, bundleAnalysis, performanceGrade });

    // Take performance screenshot
    await page.screenshot({
      path: `test-results/performance/vue-performance-${Date.now()}.png`,
      fullPage: true
    });

    // Performance assertions
    expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(5000); // FCP within 5 seconds
    expect(bundleAnalysis.totalJSSize).toBeLessThan(2 * 1024 * 1024); // JS < 2MB
    expect(bundleAnalysis.totalCSSSize).toBeLessThan(512 * 1024); // CSS < 512KB

    if (performanceMetrics.memoryUsage) {
      expect(performanceMetrics.memoryUsage.used).toBeLessThan(150); // Memory < 150MB
    }

    // Return metrics for further analysis
    return {
      loadTime,
      performanceMetrics,
      bundleAnalysis,
      performanceGrade,
      issues,
      recommendations
    };
  });

  test('should measure progressive loading performance', async ({ page }) => {
    console.log('🔄 Testing Progressive Loading Performance...');

    const progressiveMetrics = {
      timeToFirstByte: 0,
      timeToFirstPaint: 0,
      timeToFirstContentfulPaint: 0,
      timeToInteractive: 0,
      resources: []
    };

    let navigationStartTime = Date.now();

    // Track resource loading progression
    page.on('response', async (response) => {
      const timing = response.timing();
      progressiveMetrics.resources.push({
        url: response.url().split('/').pop(),
        size: parseInt(response.headers()['content-length'] || '0'),
        timing: timing ? timing.responseEnd - timing.requestStart : 0,
        timestamp: Date.now() - navigationStartTime
      });
    });

    // Start navigation
    navigationStartTime = Date.now();
    await page.goto('/');

    // Measure progressive milestones
    const milestones = await page.evaluate(() => {
      const paintEntries = performance.getEntriesByType('paint');
      const navigationEntries = performance.getEntriesByType('navigation');

      return {
        navigationStart: 0,
        firstByte: navigationEntries[0]?.responseStart || 0,
        firstPaint: paintEntries.find(e => e.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime || 0,
        domContentLoaded: navigationEntries[0]?.domContentLoadedEventEnd || 0,
        loadComplete: navigationEntries[0]?.loadEventEnd || 0
      };
    });

    // Wait for complete loading
    await page.waitForLoadState('networkidle');

    const totalLoadTime = Date.now() - navigationStartTime;

    console.log('📈 Progressive Loading Analysis:');
    console.log(`  Time to First Byte: ${milestones.firstByte.toFixed(1)}ms`);
    console.log(`  Time to First Paint: ${milestones.firstPaint.toFixed(1)}ms`);
    console.log(`  Time to First Contentful Paint: ${milestones.firstContentfulPaint.toFixed(1)}ms`);
    console.log(`  DOM Content Loaded: ${milestones.domContentLoaded.toFixed(1)}ms`);
    console.log(`  Load Complete: ${milestones.loadComplete.toFixed(1)}ms`);
    console.log(`  Total Load Time: ${totalLoadTime}ms`);

    // Analyze loading phases
    const phases = {
      serverResponse: milestones.firstByte,
      initialRender: milestones.firstPaint - milestones.firstByte,
      contentRender: milestones.firstContentfulPaint - milestones.firstPaint,
      domProcessing: milestones.domContentLoaded - milestones.firstContentfulPaint,
      resourceLoading: milestones.loadComplete - milestones.domContentLoaded
    };

    console.log('\n⏳ Loading Phase Breakdown:');
    console.log(`  Server Response: ${phases.serverResponse.toFixed(1)}ms`);
    console.log(`  Initial Render: ${phases.initialRender.toFixed(1)}ms`);
    console.log(`  Content Render: ${phases.contentRender.toFixed(1)}ms`);
    console.log(`  DOM Processing: ${phases.domProcessing.toFixed(1)}ms`);
    console.log(`  Resource Loading: ${phases.resourceLoading.toFixed(1)}ms`);

    // Identify performance bottlenecks
    const bottlenecks = [];
    if (phases.serverResponse > 1000) bottlenecks.push('Slow server response');
    if (phases.initialRender > 500) bottlenecks.push('Slow initial render');
    if (phases.contentRender > 1000) bottlenecks.push('Slow content rendering');
    if (phases.domProcessing > 2000) bottlenecks.push('Slow DOM processing');
    if (phases.resourceLoading > 3000) bottlenecks.push('Slow resource loading');

    if (bottlenecks.length > 0) {
      console.log('\n🚨 Performance Bottlenecks:');
      bottlenecks.forEach((bottleneck, index) => {
        console.log(`  ${index + 1}. ${bottleneck}`);
      });
    } else {
      console.log('\n✅ No significant bottlenecks in loading phases');
    }

    // Progressive loading should meet performance targets
    expect(milestones.firstByte).toBeLessThan(2000); // TTFB < 2s
    expect(milestones.firstContentfulPaint).toBeLessThan(4000); // FCP < 4s
    expect(totalLoadTime).toBeLessThan(8000); // Total < 8s
  });
});