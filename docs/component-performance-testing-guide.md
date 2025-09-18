# Vue 3 Component Performance Testing Guide

This guide provides comprehensive strategies for testing Vue 3 component rendering performance in the ShopTrack application.

## Overview

The performance testing suite focuses on:

1. **Initial Rendering Performance** - Measuring component load times
2. **Dynamic Rendering Performance** - Re-render efficiency during updates
3. **Memory Management** - Component lifecycle and cleanup
4. **Vue 3 Optimization Features** - v-memo, Suspense, KeepAlive
5. **Large Dataset Handling** - Virtual scrolling and infinite scroll
6. **Performance Regression Detection** - Trend analysis and baselines

## Performance Testing Architecture

### Core Testing Files

```
tests/e2e/performance/
├── component-rendering-performance.e2e.ts    # Main performance tests
├── component-optimization.e2e.ts             # Vue 3 optimization tests
└── utils/
    └── performance-helpers.ts                # Performance utilities
```

### Performance Metrics Tracked

```typescript
interface PerformanceMetrics {
  renderTime: number;                    // Component render duration
  memoryUsage: {                        // Memory consumption
    used: number;
    total: number;
    limit: number;
  };
  networkRequests: number;              // API calls made
  firstPaint: number;                   // Browser first paint time
  firstContentfulPaint: number;         // First meaningful content
  largestContentfulPaint: number;       // Largest content element
  cumulativeLayoutShift: number;        // Layout stability
  firstInputDelay: number;              // Interaction responsiveness
}
```

## Testing Strategies

### 1. Initial Load Performance

Tests how quickly components render on first load:

```typescript
test('should measure dashboard component initial rendering time', async ({ page }) => {
  await initializePerformanceMonitoring(page);

  const navigationStart = Date.now();
  await page.goto('/dashboard');
  await page.waitForSelector('[data-testid="dashboard-loaded"]');
  const totalNavigationTime = Date.now() - navigationStart;

  // Performance assertions
  expect(totalNavigationTime).toBeLessThan(5000); // 5 seconds max

  const metrics = await measureComponentRender(page, '[data-testid="dashboard"]');
  assertPerformanceMetrics(metrics, COMPONENT_PERFORMANCE_BUDGETS.dashboard);
});
```

**Key Metrics:**
- **Total Navigation Time**: Complete page load
- **First Contentful Paint**: Time to meaningful content
- **Component Render Time**: Vue component mounting
- **Memory Usage**: Initial memory footprint

### 2. Large Dataset Performance

Tests component efficiency with substantial data:

```typescript
test('should measure receipt list with large datasets', async ({ page }) => {
  // Generate 1000 receipts for stress testing
  const largeReceiptDataset = Array.from({ length: 1000 }, (_, i) => ({
    id: `receipt-${i}`,
    merchant: `Store ${i % 50}`,
    total: Math.round((Math.random() * 200 + 10) * 100) / 100,
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
  }));

  await mockApiResponse(page, '**/api/receipts**', {
    receipts: largeReceiptDataset,
    total: largeReceiptDataset.length
  });

  const renderStart = Date.now();
  await page.goto('/receipts');
  await page.waitForSelector('[data-testid="receipts-list-loaded"]');
  const initialRenderTime = Date.now() - renderStart;

  expect(initialRenderTime).toBeLessThan(3000); // 3 seconds for first page
});
```

**Optimization Techniques Tested:**
- **Virtual Scrolling**: Only render visible items
- **Pagination**: Limit initial dataset size
- **Lazy Loading**: Load data on demand
- **Memory Efficiency**: Prevent memory leaks

### 3. Re-rendering Performance

Tests how efficiently components update when data changes:

```typescript
test('should measure component re-rendering during data updates', async ({ page }) => {
  await page.evaluate(() => {
    window.rerenderCount = 0;
    const observer = new MutationObserver(() => window.rerenderCount++);
    observer.observe(document.body, { childList: true, subtree: true });
  });

  // Trigger multiple data updates
  for (let i = 1; i <= 10; i++) {
    await mockApiResponse(page, '**/api/dashboard/summary', {
      totalSpending: 1000 + (i * 50),
      receiptCount: 40 + i
    });

    await page.click('[data-testid="refresh-dashboard"]');
    await page.waitForSelector('[data-testid="dashboard-updated"]');
  }

  const rerenderCount = await page.evaluate(() => window.rerenderCount);
  expect(rerenderCount).toBeLessThan(50); // Reasonable for 10 updates
});
```

**Vue 3 Features Tested:**
- **Reactive Updates**: Efficient re-rendering
- **Component Caching**: Prevent unnecessary renders
- **Computed Properties**: Cached calculations
- **v-memo Directive**: Memoized rendering

### 4. Vue 3 Optimization Features

#### v-memo Performance

```typescript
test('should validate v-memo optimization performance', async ({ page }) => {
  // Test v-memo with large list
  await page.goto('/components/optimized-list');

  const initialMetrics = await measureComponentRender(page, '[data-testid="v-memo-list"]');

  // Update single item (should only re-render that item)
  const updateStart = Date.now();
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('update-item', { detail: { id: 0, value: 999 } }));
  });

  await page.waitForSelector('[data-testid="item-0-updated"]');
  const updateTime = Date.now() - updateStart;

  expect(updateTime).toBeLessThan(100); // Very fast with v-memo
});
```

#### Suspense Performance

```typescript
test('should validate Suspense lazy loading performance', async ({ page }) => {
  await page.goto('/components/suspense-demo');

  // Measure fallback display time
  const fallbackStart = Date.now();
  await page.waitForSelector('[data-testid="suspense-fallback"]');
  const fallbackTime = Date.now() - fallbackStart;

  expect(fallbackTime).toBeLessThan(50); // Immediate fallback

  // Measure async component load time
  const asyncStart = Date.now();
  await page.waitForSelector('[data-testid="async-component-loaded"]');
  const asyncTime = Date.now() - asyncStart;

  expect(asyncTime).toBeLessThan(5000); // Reasonable async load
});
```

#### KeepAlive Caching

```typescript
test('should validate KeepAlive component caching', async ({ page }) => {
  // First navigation to heavy component
  const firstLoadStart = Date.now();
  await page.click('[data-testid="nav-heavy-component"]');
  await page.waitForSelector('[data-testid="heavy-component-loaded"]');
  const firstLoadTime = Date.now() - firstLoadStart;

  // Navigate away and back (should use cache)
  await page.click('[data-testid="nav-light-component"]');
  await page.click('[data-testid="nav-heavy-component"]');
  const cachedLoadTime = Date.now() - firstLoadStart;

  expect(cachedLoadTime).toBeLessThan(firstLoadTime * 0.3); // 70% faster
});
```

## Performance Budgets

### Component-Specific Budgets

```typescript
export const COMPONENT_PERFORMANCE_BUDGETS = {
  dashboard: {
    maxRenderTime: 2000,        // 2 seconds
    maxMemoryUsage: 30,         // 30 MB
    maxNetworkRequests: 15,     // 15 requests
    maxFirstContentfulPaint: 1200 // 1.2 seconds
  },

  receiptList: {
    maxRenderTime: 1500,        // 1.5 seconds
    maxMemoryUsage: 40,         // 40 MB
    maxNetworkRequests: 10,     // 10 requests
    maxFirstContentfulPaint: 1000 // 1 second
  },

  charts: {
    maxRenderTime: 4000,        // 4 seconds
    maxMemoryUsage: 60,         // 60 MB
    maxNetworkRequests: 8,      // 8 requests
    maxLargestContentfulPaint: 3000 // 3 seconds
  }
};
```

### Usage Example

```typescript
test('should meet performance budget', async ({ page }) => {
  await initializePerformanceMonitoring(page);

  const metrics = await measureAndAssertComponentPerformance(
    page,
    '[data-testid="dashboard"]',
    COMPONENT_PERFORMANCE_BUDGETS.dashboard
  );

  console.log('📊 Performance Results:', metrics);
});
```

## Memory Management Testing

### Memory Leak Detection

```typescript
test('should validate component cleanup and memory management', async ({ page }) => {
  const initialMemory = await page.evaluate(() => performance.memory.usedJSHeapSize);

  // Create and destroy multiple components
  for (let i = 0; i < 10; i++) {
    await page.goto(`/components/dynamic-component?id=${i}`);
    await page.click('[data-testid="create-heavy-objects"]');
  }

  const peakMemory = await page.evaluate(() => performance.memory.usedJSHeapSize);

  // Navigate to simple page and force GC
  await page.goto('/components/minimal');
  await page.evaluate(() => window.gc && window.gc());

  const finalMemory = await page.evaluate(() => performance.memory.usedJSHeapSize);

  const recoveryRate = ((peakMemory - finalMemory) / (peakMemory - initialMemory)) * 100;
  expect(recoveryRate).toBeGreaterThan(70); // 70% memory recovery
});
```

### Memory Monitoring

```typescript
// Continuous memory tracking
await page.addInitScript(() => {
  setInterval(() => {
    if (performance.memory) {
      window.performanceTracker.memorySnapshots.push({
        timestamp: performance.now(),
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize
      });
    }
  }, 1000);
});
```

## Virtual Scrolling Performance

### Large Dataset Testing

```typescript
test('should validate virtual scrolling with 10k items', async ({ page }) => {
  const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    title: `Item ${i}`,
    description: `Description for item ${i}`.repeat(10)
  }));

  await mockApiResponse(page, '**/api/large-dataset', { items: largeDataset });

  // Measure render time (should be fast despite large dataset)
  const metrics = await measureComponentRender(page, '[data-testid="virtual-scroll-container"]');
  expect(metrics.renderTime).toBeLessThan(2000);

  // Test scroll performance
  const scrollTests = [1000, 5000, 10000, 50000, 0]; // Different scroll positions

  for (const scrollTo of scrollTests) {
    const scrollStart = Date.now();

    await page.evaluate((position) => {
      document.querySelector('[data-testid="virtual-scroll-container"]').scrollTop = position;
    }, scrollTo);

    await page.waitForSelector('[data-testid="virtual-scroll-updated"]');
    const scrollTime = Date.now() - scrollStart;

    expect(scrollTime).toBeLessThan(500); // Fast scrolling
  }
});
```

## Performance Regression Detection

### Trend Analysis

```typescript
// Capture performance trends over time
await capturePerformanceTrend(page, 'dashboard-performance', metrics);

// Analyze trends for regressions
const trendAnalysis = await analyzePerformanceTrends(page, 'dashboard-performance');

if (trendAnalysis.trend === 'degrading' && Math.abs(trendAnalysis.averageChange) > 10) {
  console.warn(`🚨 Performance regression: ${trendAnalysis.averageChange.toFixed(1)}%`);
}
```

### Baseline Comparison

```typescript
const performanceBaselines = {
  dashboardLoad: 3000,    // 3 seconds
  receiptListLoad: 2500,  // 2.5 seconds
  chartRender: 5000,      // 5 seconds
  memoryUsage: 80         // 80MB
};

// Compare current performance against baselines
Object.entries(performanceBaselines).forEach(([metric, baseline]) => {
  const measured = measurements[metric];
  if (measured > baseline) {
    const regression = ((measured - baseline) / baseline * 100).toFixed(1);
    console.warn(`Performance regression in ${metric}: +${regression}%`);
  }
});
```

## Stress Testing

### High Load Scenarios

```typescript
test('should maintain performance under stress', async ({ page }) => {
  const stressTests = [
    {
      name: 'High Memory Usage',
      action: () => page.evaluate(() => {
        window.memoryStress = Array.from({ length: 100000 }, () =>
          new Array(1000).fill(Math.random())
        );
      })
    },
    {
      name: 'CPU Intensive Operations',
      action: () => page.evaluate(() => {
        const start = performance.now();
        while (performance.now() - start < 1000) {
          Math.random() * Math.random(); // 1 second of CPU work
        }
      })
    }
  ];

  for (const stressTest of stressTests) {
    await stressTest.action();

    const stressStart = Date.now();
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="dashboard-loaded"]');
    const stressTime = Date.now() - stressStart;

    expect(stressTime).toBeLessThan(8000); // 8 seconds under stress
  }
});
```

## Best Practices

### 1. Performance Monitoring Setup

```typescript
// Initialize monitoring at the start of each test
test.beforeEach(async ({ page }) => {
  await initializePerformanceMonitoring(page);
});
```

### 2. Realistic Test Data

```typescript
// Use realistic data sizes and complexity
const realisticReceiptData = Array.from({ length: 100 }, (_, i) => ({
  id: `receipt-${i}`,
  merchant: merchants[i % merchants.length],
  items: Array.from({ length: Math.floor(Math.random() * 10) + 1 },
    () => generateRealisticItem()
  ),
  total: calculateTotal(),
  date: generateRecentDate()
}));
```

### 3. Environment Consistency

```typescript
// Ensure consistent test environment
test.beforeEach(async ({ page }) => {
  // Clear cache and reset state
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Set consistent viewport
  await page.setViewportSize({ width: 1280, height: 720 });
});
```

### 4. Performance Assertions

```typescript
// Use helper functions for consistent assertions
await measureAndAssertComponentPerformance(
  page,
  '[data-testid="component"]',
  COMPONENT_PERFORMANCE_BUDGETS.componentType
);
```

## Troubleshooting Performance Issues

### Common Performance Problems

1. **Excessive Re-renders**
   - Check for unnecessary reactive dependencies
   - Use v-memo for expensive list items
   - Implement proper computed property caching

2. **Memory Leaks**
   - Ensure proper component cleanup
   - Remove event listeners in onUnmounted
   - Clear intervals and timeouts

3. **Large Initial Bundles**
   - Implement code splitting with defineAsyncComponent
   - Use Suspense for lazy loading
   - Optimize build configuration

4. **Slow Data Loading**
   - Implement virtual scrolling for large lists
   - Use pagination and infinite scroll
   - Optimize API response sizes

### Debugging Tools

```typescript
// Performance debugging utilities
const debugPerformance = async (page: Page) => {
  const report = await generatePerformanceReport(page);
  console.log('Performance Debug Report:');
  console.log(report.summary);
  console.log('Recommendations:', report.recommendations);
};
```

## Conclusion

This comprehensive performance testing approach ensures that Vue 3 components in the ShopTrack application:

- **Render efficiently** under various load conditions
- **Manage memory properly** without leaks
- **Utilize Vue 3 optimizations** effectively
- **Scale well** with large datasets
- **Maintain performance** over time
- **Meet established budgets** for user experience

Regular performance testing prevents regressions and ensures optimal user experience across all application components.