# Performance Test Suite

This comprehensive performance test suite for the ShopTrack Vue frontend application provides benchmarking and performance monitoring across three key areas:

## 🚀 Test Categories

### 1. Component Rendering Performance (`components/rendering.performance.test.ts`)

Tests component rendering efficiency and memory management:

- **Large List Rendering**: Tests rendering performance with 100-10,000 receipts
- **Virtual Scrolling**: Benchmarks virtual scrolling implementation
- **Mount/Unmount Cycles**: Measures component lifecycle performance
- **Memory Leak Detection**: Monitors memory usage across component lifecycles
- **Re-render Optimization**: Tests prop change re-rendering performance
- **Complex Component Trees**: Evaluates nested component rendering

**Key Metrics:**
- Render time (target: <500ms for large datasets)
- Memory usage (target: <50MB leakage in test environment)
- Mount/unmount time (target: <200ms average)

### 2. Store Mutation Performance (`stores/mutations.performance.test.ts`)

Benchmarks Pinia store operations and reactivity:

- **Large Dataset Mutations**: Tests store performance with 1000+ receipts
- **Bulk Operations**: Measures batch insert/update performance
- **Computed Properties**: Benchmarks reactive computed performance
- **Reactive Updates**: Tests performance with multiple watchers
- **Concurrent Mutations**: Evaluates thread-safe operations
- **Cache Performance**: Measures hit rates and efficiency
- **Memory Management**: Detects leaks in store operations

**Key Metrics:**
- Mutation time (target: <200ms for large datasets)
- Operations per second (target: >100 ops/sec)
- Memory growth (target: <100MB in test environment)

### 3. API Call Optimization (`api/optimization.performance.test.ts`)

Tests API communication and optimization strategies:

- **Request Batching**: Measures batch operation efficiency
- **Debouncing**: Tests debounced API call performance
- **Response Caching**: Evaluates cache hit rates and TTL
- **Concurrent Requests**: Benchmarks high-concurrency scenarios
- **Network Simulation**: Tests various network conditions
- **Payload Optimization**: Compares payload sizes and compression
- **Timeout Handling**: Measures graceful timeout behavior

**Key Metrics:**
- Request time (target: <200ms average)
- Cache hit rate (target: >70%)
- Timeout rate (target: <10%)
- Concurrent request handling (up to 100 simultaneous)

## 🛠 Test Utilities

### Performance Helpers (`utils/performance-helpers.ts`)

- `measurePerformance()`: Core performance measurement function
- `PerformanceBenchmark`: Comprehensive benchmarking class
- `MemoryLeakDetector`: Memory usage monitoring
- `simulateNetworkLatency()`: Network condition simulation

### Test Data Generators (`utils/test-data-generators.ts`)

- `generateLargeDataset()`: Creates realistic test data
- `generateScenarioData()`: Specific performance scenarios
- `createDataBatches()`: Batch operation test data
- `generateConcurrentScenarios()`: Concurrent operation patterns

## ⚙️ Configuration

### Performance Config (`performance.config.ts`)

Environment-specific configurations:

```typescript
// Default thresholds
componentRendering: {
  maxRenderTime: 100,        // ms
  maxMemoryLeakMB: 5,       // MB
  maxMountUnmountTime: 50,  // ms
}

storeMutations: {
  maxMutationTime: 50,      // ms
  minOpsPerSecond: 100,     // ops/sec
  maxMemoryLeakMB: 10,      // MB
}

apiOptimization: {
  maxRequestTime: 200,      // ms
  minCacheHitRate: 0.7,     // 70%
  maxTimeoutRate: 0.1,      // 10%
}
```

### Environment Variations

- **Development**: Faster iterations, smaller datasets
- **CI**: More lenient thresholds, medium datasets
- **Production**: Strict thresholds, full test coverage

## 🏃‍♂️ Running Tests

### Individual Test Categories

```bash
# Component rendering tests
npm run nvm:test:run tests/performance/components/

# Store mutation tests
npm run nvm:test:run tests/performance/stores/

# API optimization tests
npm run nvm:test:run tests/performance/api/
```

### All Performance Tests

```bash
# Run all performance tests
npm run nvm:test:run tests/performance/

# With coverage
npm run test:coverage -- tests/performance/
```

### Test Modes

```bash
# Development mode (faster, smaller datasets)
VITEST_DEV=true npm run test tests/performance/

# CI mode (medium datasets, lenient thresholds)
CI=true npm run test:run tests/performance/

# Production baseline (strict thresholds)
NODE_ENV=production npm run test:run tests/performance/
```

## 📊 Performance Monitoring

### Baseline Tracking

The test suite automatically:
- Captures performance baselines
- Detects regressions >20% slower than baseline
- Saves metrics to `tests/performance/baselines.json`
- Provides health score (0-100%)

### Metrics Dashboard

Each test run outputs:
- Execution time per test
- Memory usage patterns
- Cache hit rates
- Regression alerts
- Overall health score

### CI Integration

The test suite integrates with CI/CD:
- Fails build on critical regressions (>50% slower)
- Warns on health scores <70%
- Exports metrics for monitoring dashboards
- Maintains baseline history

## 🎯 Performance Targets

### Production Targets

- **Page Load**: <2 seconds initial render
- **List Rendering**: <100ms for 100 items
- **API Response**: <200ms average
- **Memory Growth**: <5MB per user session
- **Cache Hit Rate**: >80% for repeated requests

### Test Environment Adjustments

Test environment thresholds are more lenient due to:
- Node.js overhead vs browser optimization
- Test mocking and instrumentation costs
- Lack of browser-specific optimizations
- Memory management differences

## 🚨 Troubleshooting

### Common Issues

1. **Memory Leak Warnings**: Expected in test environment, indicates detection is working
2. **Timeout Errors**: Increase timeout for slower CI environments
3. **NaN Metrics**: Usually indicates missing benchmark data
4. **Flaky Tests**: Network simulation timing can vary

### Debugging Tips

```bash
# Verbose logging
DEBUG=true npm run test tests/performance/

# Single test debugging
npm run test -- tests/performance/components/ --reporter=verbose

# Memory profiling
npm run test -- tests/performance/stores/ --reporter=verbose
```

## 🔄 Maintenance

### Regular Tasks

- Review baseline metrics monthly
- Update thresholds based on feature changes
- Monitor for performance regressions in CI
- Adjust test data sizes for realistic scenarios

### Performance Budget

- Add new performance tests for major features
- Remove obsolete tests for deprecated code
- Update thresholds as application grows
- Maintain 80%+ test coverage for critical paths

## 📈 Future Enhancements

Planned improvements:
- Real browser performance testing
- Visual regression detection
- Bundle size monitoring
- Core Web Vitals integration
- Automated performance reports