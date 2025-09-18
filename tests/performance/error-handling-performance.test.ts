import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { categorizedDescribe, categorizedIt, TestCategory } from '../../tests/utils/categories';
import { withPerformanceMonitoring, PerformanceThresholds } from '../../tests/utils/performance-monitoring';
import {
  ApiErrorMocker,
  RetryTester,
  ERROR_SCENARIOS,
  ApiErrorType,
  errorTestAssertions
} from '../../tests/utils/api-error-testing';

// Performance-focused Error Handler
class PerformanceOptimizedErrorHandler {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private requestCache: Map<string, CacheEntry> = new Map();
  private performanceMetrics: PerformanceMetrics = new PerformanceMetrics();

  async executeRequest<T>(
    key: string,
    request: () => Promise<T>,
    options: RequestOptions = {}
  ): Promise<T> {
    const startTime = performance.now();
    let cacheHit = false;
    let circuitBreakerOpen = false;

    try {
      // Check circuit breaker
      const circuitBreaker = this.getCircuitBreaker(key);
      if (circuitBreaker.isOpen()) {
        circuitBreakerOpen = true;
        throw new Error('Circuit breaker open');
      }

      // Check cache first
      if (options.cacheTTL && this.requestCache.has(key)) {
        const cached = this.requestCache.get(key)!;
        if (Date.now() - cached.timestamp < options.cacheTTL) {
          cacheHit = true;
          this.recordMetrics(key, performance.now() - startTime, true, false);
          return cached.data;
        }
      }

      // Execute request
      const result = await request();

      // Cache result if cacheable
      if (options.cacheTTL) {
        this.requestCache.set(key, {
          data: result,
          timestamp: Date.now()
        });
      }

      // Record success
      circuitBreaker.recordSuccess();
      this.recordMetrics(key, performance.now() - startTime, cacheHit, circuitBreakerOpen);

      return result;
    } catch (error) {
      // Record failure
      const circuitBreaker = this.getCircuitBreaker(key);
      circuitBreaker.recordFailure();
      this.recordMetrics(key, performance.now() - startTime, cacheHit, circuitBreakerOpen, error);

      throw error;
    }
  }

  private getCircuitBreaker(key: string): CircuitBreaker {
    if (!this.circuitBreakers.has(key)) {
      this.circuitBreakers.set(key, new CircuitBreaker());
    }
    return this.circuitBreakers.get(key)!;
  }

  private recordMetrics(
    key: string,
    duration: number,
    cacheHit: boolean,
    circuitBreakerOpen: boolean,
    error?: any
  ): void {
    this.performanceMetrics.record({
      key,
      duration,
      cacheHit,
      circuitBreakerOpen,
      error: !!error,
      timestamp: Date.now()
    });
  }

  getMetrics(): PerformanceReport {
    return this.performanceMetrics.generateReport();
  }

  clearCache(): void {
    this.requestCache.clear();
  }

  resetCircuitBreakers(): void {
    this.circuitBreakers.clear();
  }
}

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private failureThreshold = 5,
    private timeout = 60000 // 1 minute
  ) {}

  isOpen(): boolean {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): string {
    return this.state;
  }
}

interface RequestOptions {
  cacheTTL?: number;
  retries?: number;
  timeout?: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
}

interface PerformanceEntry {
  key: string;
  duration: number;
  cacheHit: boolean;
  circuitBreakerOpen: boolean;
  error: boolean;
  timestamp: number;
}

interface PerformanceReport {
  totalRequests: number;
  averageDuration: number;
  cacheHitRate: number;
  errorRate: number;
  circuitBreakerActivations: number;
  p95Duration: number;
  p99Duration: number;
  requestsPerSecond: number;
}

class PerformanceMetrics {
  private entries: PerformanceEntry[] = [];

  record(entry: PerformanceEntry): void {
    this.entries.push(entry);

    // Keep only last 10000 entries to prevent memory issues
    if (this.entries.length > 10000) {
      this.entries = this.entries.slice(-10000);
    }
  }

  generateReport(): PerformanceReport {
    if (this.entries.length === 0) {
      return {
        totalRequests: 0,
        averageDuration: 0,
        cacheHitRate: 0,
        errorRate: 0,
        circuitBreakerActivations: 0,
        p95Duration: 0,
        p99Duration: 0,
        requestsPerSecond: 0
      };
    }

    const durations = this.entries.map(e => e.duration).sort((a, b) => a - b);
    const timeSpan = this.entries[this.entries.length - 1].timestamp - this.entries[0].timestamp;

    return {
      totalRequests: this.entries.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      cacheHitRate: this.entries.filter(e => e.cacheHit).length / this.entries.length,
      errorRate: this.entries.filter(e => e.error).length / this.entries.length,
      circuitBreakerActivations: this.entries.filter(e => e.circuitBreakerOpen).length,
      p95Duration: durations[Math.floor(durations.length * 0.95)],
      p99Duration: durations[Math.floor(durations.length * 0.99)],
      requestsPerSecond: this.entries.length / (timeSpan / 1000)
    };
  }

  clear(): void {
    this.entries = [];
  }
}

// Load testing utilities
class ErrorHandlingLoadTester {
  async runConcurrentErrorScenarios(
    scenarios: Array<() => Promise<any>>,
    concurrency: number,
    duration: number
  ): Promise<LoadTestResults> {
    const results: LoadTestResults = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      responseTimes: [],
      errors: [],
      throughput: 0
    };

    const startTime = Date.now();
    const endTime = startTime + duration;
    const workers: Promise<void>[] = [];

    for (let i = 0; i < concurrency; i++) {
      workers.push(this.worker(scenarios, endTime, results));
    }

    await Promise.all(workers);

    // Calculate final metrics
    const totalDuration = Date.now() - startTime;
    results.averageResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length || 0;
    results.throughput = results.totalRequests / (totalDuration / 1000);

    return results;
  }

  private async worker(
    scenarios: Array<() => Promise<any>>,
    endTime: number,
    results: LoadTestResults
  ): Promise<void> {
    while (Date.now() < endTime) {
      const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
      const startTime = performance.now();

      try {
        await scenario();
        const duration = performance.now() - startTime;

        results.totalRequests++;
        results.successfulRequests++;
        results.responseTimes.push(duration);
        results.maxResponseTime = Math.max(results.maxResponseTime, duration);
        results.minResponseTime = Math.min(results.minResponseTime, duration);
      } catch (error) {
        const duration = performance.now() - startTime;

        results.totalRequests++;
        results.failedRequests++;
        results.responseTimes.push(duration);
        results.errors.push(error);
        results.maxResponseTime = Math.max(results.maxResponseTime, duration);
        results.minResponseTime = Math.min(results.minResponseTime, duration);
      }

      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }
}

interface LoadTestResults {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  responseTimes: number[];
  errors: any[];
  throughput: number;
}

categorizedDescribe('Error Handling Performance Tests', [TestCategory.PERFORMANCE, TestCategory.ERROR_HANDLING], () => {
  let apiErrorMocker: ApiErrorMocker;
  let errorHandler: PerformanceOptimizedErrorHandler;
  let loadTester: ErrorHandlingLoadTester;

  beforeEach(() => {
    apiErrorMocker = new ApiErrorMocker();
    errorHandler = new PerformanceOptimizedErrorHandler();
    loadTester = new ErrorHandlingLoadTester();
    vi.useFakeTimers();
  });

  afterEach(() => {
    apiErrorMocker.restore();
    vi.useRealTimers();
  });

  categorizedDescribe('Retry Logic Performance', [TestCategory.RETRY_PERFORMANCE], () => {
    categorizedIt('should maintain performance under high retry load',
      [TestCategory.PERFORMANCE, TestCategory.RETRY_LOGIC, TestCategory.LOAD_TEST],
      withPerformanceMonitoring(async () => {
        // Mock intermittent failures
        apiErrorMocker.mockIntermittentFailure('get', '/api/data', 0.3); // 30% failure rate

        const retryRequest = async () => {
          return await errorHandler.executeRequest(
            'high-load-test',
            () => axios.get('https://api.example.com/api/data'),
            { cacheTTL: 5000 }
          );
        };

        // Run high-concurrency retry scenarios
        const scenarios = [retryRequest];
        const results = await loadTester.runConcurrentErrorScenarios(
          scenarios,
          50, // 50 concurrent requests
          5000 // 5 seconds
        );

        // Performance assertions
        expect(results.throughput).toBeGreaterThan(5); // At least 5 requests/second
        expect(results.averageResponseTime).toBeLessThan(1000); // Under 1 second average
        expect(results.successfulRequests).toBeGreaterThan(results.failedRequests * 2); // More success than failures

        const metrics = errorHandler.getMetrics();
        expect(metrics.cacheHitRate).toBeGreaterThan(0.1); // Some cache efficiency
        expect(metrics.averageDuration).toBeLessThan(500); // Fast average response
      }, 'High Retry Load Performance', [TestCategory.PERFORMANCE, TestCategory.RETRY_LOGIC], {
        maxDuration: 10000,
        maxMemoryUsage: 100 * 1024 * 1024, // 100MB
        maxNetworkRequests: 1000
      })
    );

    categorizedIt('should optimize retry delays for performance',
      [TestCategory.PERFORMANCE, TestCategory.RETRY_OPTIMIZATION],
      withPerformanceMonitoring(async () => {
        const retryDelays: number[] = [];
        const retryTester = new RetryTester();

        // Test different backoff strategies
        const strategies = [
          { name: 'linear', exponential: false, baseDelay: 100 },
          { name: 'exponential', exponential: true, baseDelay: 100 },
          { name: 'exponential-capped', exponential: true, baseDelay: 100, maxDelay: 1000 }
        ];

        const performanceResults: Record<string, any> = {};

        for (const strategy of strategies) {
          // Mock consistent failures for testing backoff
          apiErrorMocker.reset();
          apiErrorMocker.mockEndpointWithError(
            'get',
            `/api/test-${strategy.name}`,
            [
              ERROR_SCENARIOS[ApiErrorType.SERVER_ERROR],
              ERROR_SCENARIOS[ApiErrorType.SERVER_ERROR],
              ERROR_SCENARIOS[ApiErrorType.SERVER_ERROR]
            ],
            { status: 200, data: { strategy: strategy.name } }
          );

          const startTime = performance.now();

          const result = await retryTester.testRetryLogic(
            () => axios.get(`https://api.example.com/api/test-${strategy.name}`),
            {
              maxRetries: 3,
              retryDelay: strategy.baseDelay,
              exponentialBackoff: strategy.exponential
            }
          );

          const totalTime = performance.now() - startTime;

          performanceResults[strategy.name] = {
            totalTime,
            attempts: result.attempts,
            success: result.success,
            retryDelays: result.retryDelays
          };
        }

        // Linear should be fastest for consistent delays
        expect(performanceResults.linear.totalTime).toBeLessThan(performanceResults.exponential.totalTime);

        // Exponential with cap should balance speed and backoff
        expect(performanceResults['exponential-capped'].totalTime).toBeLessThan(performanceResults.exponential.totalTime);

        // All should eventually succeed
        expect(performanceResults.linear.success).toBe(true);
        expect(performanceResults.exponential.success).toBe(true);
        expect(performanceResults['exponential-capped'].success).toBe(true);
      }, 'Retry Optimization', [TestCategory.PERFORMANCE, TestCategory.RETRY_OPTIMIZATION])
    );
  });

  categorizedDescribe('Circuit Breaker Performance', [TestCategory.CIRCUIT_BREAKER_PERFORMANCE], () => {
    categorizedIt('should prevent performance degradation during failures',
      [TestCategory.PERFORMANCE, TestCategory.CIRCUIT_BREAKER],
      withPerformanceMonitoring(async () => {
        // Mock consistent failures to trigger circuit breaker
        apiErrorMocker.mockNetworkError('get', '/api/failing-service');

        const requests: Array<{ duration: number; success: boolean }> = [];

        // Make requests that will trigger circuit breaker
        for (let i = 0; i < 20; i++) {
          const startTime = performance.now();
          let success = false;

          try {
            await errorHandler.executeRequest(
              'circuit-breaker-test',
              () => axios.get('https://api.example.com/api/failing-service')
            );
            success = true;
          } catch (error) {
            // Expected failures
          }

          const duration = performance.now() - startTime;
          requests.push({ duration, success });

          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Analyze performance degradation pattern
        const firstBatch = requests.slice(0, 5); // Before circuit breaker
        const lastBatch = requests.slice(-5); // After circuit breaker

        const avgFirstBatch = firstBatch.reduce((sum, r) => sum + r.duration, 0) / firstBatch.length;
        const avgLastBatch = lastBatch.reduce((sum, r) => sum + r.duration, 0) / lastBatch.length;

        // Circuit breaker should prevent long delays in later requests
        expect(avgLastBatch).toBeLessThan(avgFirstBatch * 2); // No more than 2x slower

        const metrics = errorHandler.getMetrics();
        expect(metrics.circuitBreakerActivations).toBeGreaterThan(0);
      }, 'Circuit Breaker Performance', [TestCategory.PERFORMANCE, TestCategory.CIRCUIT_BREAKER])
    );

    categorizedIt('should maintain low latency when circuit breaker is open',
      [TestCategory.PERFORMANCE, TestCategory.CIRCUIT_BREAKER_LATENCY],
      withPerformanceMonitoring(async () => {
        // Trigger circuit breaker
        for (let i = 0; i < 6; i++) {
          try {
            await errorHandler.executeRequest(
              'latency-test',
              () => { throw new Error('Service down'); }
            );
          } catch (error) {
            // Expected
          }
        }

        // Measure latency when circuit breaker is open
        const latencies: number[] = [];

        for (let i = 0; i < 10; i++) {
          const startTime = performance.now();

          try {
            await errorHandler.executeRequest(
              'latency-test',
              () => axios.get('https://api.example.com/api/data')
            );
          } catch (error) {
            // Circuit breaker should fail fast
          }

          const latency = performance.now() - startTime;
          latencies.push(latency);
        }

        const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;

        // Circuit breaker should provide very fast failures
        expect(avgLatency).toBeLessThan(10); // Under 10ms
        expect(Math.max(...latencies)).toBeLessThan(50); // No request over 50ms
      }, 'Circuit Breaker Latency', [TestCategory.PERFORMANCE, TestCategory.CIRCUIT_BREAKER_LATENCY])
    );
  });

  categorizedDescribe('Cache Performance During Errors', [TestCategory.CACHE_PERFORMANCE], () => {
    categorizedIt('should improve performance with intelligent caching during errors',
      [TestCategory.PERFORMANCE, TestCategory.CACHING],
      withPerformanceMonitoring(async () => {
        // Setup successful response for caching
        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/cached-data',
          [],
          { status: 200, data: { cached: true, timestamp: Date.now() } }
        );

        // First request - should cache
        const firstRequest = async () => {
          return await errorHandler.executeRequest(
            'cache-test',
            () => axios.get('https://api.example.com/api/cached-data'),
            { cacheTTL: 10000 } // 10 second cache
          );
        };

        const firstResult = await firstRequest();
        expect(firstResult.cached).toBe(true);

        // Now simulate service failure
        apiErrorMocker.reset();
        apiErrorMocker.mockNetworkError('get', '/api/cached-data');

        // Multiple requests should hit cache, not fail
        const cachedRequests = [];
        for (let i = 0; i < 50; i++) {
          cachedRequests.push(firstRequest());
        }

        const startTime = performance.now();
        const results = await Promise.all(cachedRequests);
        const totalTime = performance.now() - startTime;

        // All should succeed via cache
        expect(results).toHaveLength(50);
        results.forEach(result => {
          expect(result.cached).toBe(true);
        });

        // Should be very fast due to caching
        const avgTimePerRequest = totalTime / 50;
        expect(avgTimePerRequest).toBeLessThan(5); // Under 5ms per request

        const metrics = errorHandler.getMetrics();
        expect(metrics.cacheHitRate).toBeGreaterThan(0.9); // Over 90% cache hit rate
      }, 'Cache Performance During Errors', [TestCategory.PERFORMANCE, TestCategory.CACHING])
    );

    categorizedIt('should balance cache efficiency and memory usage',
      [TestCategory.PERFORMANCE, TestCategory.MEMORY_OPTIMIZATION],
      withPerformanceMonitoring(async () => {
        const initialMemory = process.memoryUsage().heapUsed;

        // Generate many different cache entries
        const promises = [];
        for (let i = 0; i < 1000; i++) {
          apiErrorMocker.mockEndpointWithError(
            'get',
            `/api/data/${i}`,
            [],
            { status: 200, data: { id: i, data: new Array(100).fill(i) } }
          );

          promises.push(
            errorHandler.executeRequest(
              `cache-memory-test-${i}`,
              () => axios.get(`https://api.example.com/api/data/${i}`),
              { cacheTTL: 60000 } // 1 minute cache
            )
          );
        }

        await Promise.all(promises);

        const afterCacheMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = afterCacheMemory - initialMemory;

        // Memory increase should be reasonable (under 50MB for 1000 entries)
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

        // Clear cache and verify memory is freed
        errorHandler.clearCache();

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        // Allow some time for GC
        await new Promise(resolve => setTimeout(resolve, 100));

        const afterClearMemory = process.memoryUsage().heapUsed;
        const memoryReclaimed = afterCacheMemory - afterClearMemory;

        // Should reclaim significant memory
        expect(memoryReclaimed).toBeGreaterThan(memoryIncrease * 0.5); // At least 50% reclaimed
      }, 'Cache Memory Optimization', [TestCategory.PERFORMANCE, TestCategory.MEMORY_OPTIMIZATION], {
        maxMemoryUsage: 100 * 1024 * 1024 // 100MB limit
      })
    );
  });

  categorizedDescribe('Error Recovery Performance', [TestCategory.RECOVERY_PERFORMANCE], () => {
    categorizedIt('should minimize recovery time after service restoration',
      [TestCategory.PERFORMANCE, TestCategory.RECOVERY_TIME],
      withPerformanceMonitoring(async () => {
        // Simulate service failure
        apiErrorMocker.mockNetworkError('get', '/api/health-check');

        const failureStartTime = performance.now();

        // Make requests during failure
        const failurePromises = [];
        for (let i = 0; i < 10; i++) {
          failurePromises.push(
            errorHandler.executeRequest(
              'recovery-test',
              () => axios.get('https://api.example.com/api/health-check')
            ).catch(() => 'failed')
          );
        }

        await Promise.all(failurePromises);

        // Simulate service restoration
        apiErrorMocker.reset();
        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/health-check',
          [],
          { status: 200, data: { healthy: true, recovered: Date.now() } }
        );

        const recoveryStartTime = performance.now();

        // Make requests after recovery
        const recoveryPromises = [];
        for (let i = 0; i < 10; i++) {
          recoveryPromises.push(
            errorHandler.executeRequest(
              'recovery-test',
              () => axios.get('https://api.example.com/api/health-check')
            )
          );
        }

        const recoveryResults = await Promise.all(recoveryPromises);
        const recoveryTime = performance.now() - recoveryStartTime;

        // All recovery requests should succeed
        expect(recoveryResults).toHaveLength(10);
        recoveryResults.forEach(result => {
          expect(result.healthy).toBe(true);
        });

        // Recovery should be fast
        expect(recoveryTime).toBeLessThan(1000); // Under 1 second total
        expect(recoveryTime / 10).toBeLessThan(100); // Under 100ms per request
      }, 'Service Recovery Performance', [TestCategory.PERFORMANCE, TestCategory.RECOVERY_TIME])
    );

    categorizedIt('should handle burst traffic after recovery efficiently',
      [TestCategory.PERFORMANCE, TestCategory.BURST_HANDLING],
      withPerformanceMonitoring(async () => {
        // Setup recovered service
        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/burst-test',
          [],
          { status: 200, data: { success: true } }
        );

        // Simulate burst of requests after recovery
        const burstSize = 200;
        const burstPromises = [];

        const burstStartTime = performance.now();

        for (let i = 0; i < burstSize; i++) {
          burstPromises.push(
            errorHandler.executeRequest(
              `burst-test-${i}`,
              () => axios.get(`https://api.example.com/api/burst-test?id=${i}`),
              { cacheTTL: 5000 }
            )
          );
        }

        const results = await Promise.all(burstPromises);
        const burstTime = performance.now() - burstStartTime;

        // All requests should succeed
        expect(results).toHaveLength(burstSize);

        // Burst should be handled efficiently
        const throughput = burstSize / (burstTime / 1000);
        expect(throughput).toBeGreaterThan(10); // At least 10 requests/second

        const avgTimePerRequest = burstTime / burstSize;
        expect(avgTimePerRequest).toBeLessThan(200); // Under 200ms per request

        const metrics = errorHandler.getMetrics();
        expect(metrics.averageDuration).toBeLessThan(100); // Fast average response
      }, 'Burst Traffic Performance', [TestCategory.PERFORMANCE, TestCategory.BURST_HANDLING], {
        maxDuration: 20000, // 20 seconds for burst test
        maxNetworkRequests: 300
      })
    );
  });

  categorizedDescribe('Memory and Resource Management', [TestCategory.RESOURCE_MANAGEMENT], () => {
    categorizedIt('should prevent memory leaks during extended error scenarios',
      [TestCategory.PERFORMANCE, TestCategory.MEMORY_LEAKS],
      withPerformanceMonitoring(async () => {
        const initialMemory = process.memoryUsage().heapUsed;
        const memoryMeasurements: number[] = [];

        // Run extended error scenario
        for (let cycle = 0; cycle < 10; cycle++) {
          // Create many failing requests
          const promises = [];
          for (let i = 0; i < 100; i++) {
            promises.push(
              errorHandler.executeRequest(
                `memory-test-${cycle}-${i}`,
                () => { throw new Error(`Test error ${i}`); }
              ).catch(() => 'expected-failure')
            );
          }

          await Promise.all(promises);

          // Measure memory after each cycle
          const currentMemory = process.memoryUsage().heapUsed;
          memoryMeasurements.push(currentMemory);

          // Clear references
          errorHandler.clearCache();
          errorHandler.resetCircuitBreakers();

          // Force GC if available
          if (global.gc) {
            global.gc();
          }

          await new Promise(resolve => setTimeout(resolve, 50));
        }

        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = finalMemory - initialMemory;

        // Memory should not continuously grow
        expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024); // Under 20MB increase

        // Check for memory leak pattern
        const firstHalf = memoryMeasurements.slice(0, 5);
        const secondHalf = memoryMeasurements.slice(5);

        const avgFirstHalf = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const avgSecondHalf = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

        // Memory should not continuously increase
        expect(avgSecondHalf).toBeLessThan(avgFirstHalf * 2); // No more than 2x growth
      }, 'Memory Leak Prevention', [TestCategory.PERFORMANCE, TestCategory.MEMORY_LEAKS], {
        maxMemoryUsage: 200 * 1024 * 1024 // 200MB limit
      })
    );

    categorizedIt('should efficiently manage concurrent error handling',
      [TestCategory.PERFORMANCE, TestCategory.CONCURRENCY],
      withPerformanceMonitoring(async () => {
        const concurrencyLevels = [10, 50, 100, 200];
        const performanceResults: Record<number, any> = {};

        for (const concurrency of concurrencyLevels) {
          // Setup mixed success/failure scenario
          apiErrorMocker.reset();
          apiErrorMocker.mockIntermittentFailure('get', `/api/concurrency-${concurrency}`, 0.3);

          const startTime = performance.now();
          const promises = [];

          for (let i = 0; i < concurrency; i++) {
            promises.push(
              errorHandler.executeRequest(
                `concurrency-test-${concurrency}-${i}`,
                () => axios.get(`https://api.example.com/api/concurrency-${concurrency}`),
                { cacheTTL: 1000 }
              ).catch(() => 'handled-error')
            );
          }

          const results = await Promise.all(promises);
          const duration = performance.now() - startTime;

          performanceResults[concurrency] = {
            duration,
            throughput: concurrency / (duration / 1000),
            successRate: results.filter(r => r !== 'handled-error').length / concurrency
          };
        }

        // Performance should scale reasonably with concurrency
        expect(performanceResults[10].throughput).toBeGreaterThan(5);
        expect(performanceResults[50].throughput).toBeGreaterThan(15);
        expect(performanceResults[100].throughput).toBeGreaterThan(25);

        // Higher concurrency should not drastically degrade performance
        const degradationRatio = performanceResults[200].throughput / performanceResults[10].throughput;
        expect(degradationRatio).toBeGreaterThan(0.3); // No more than 70% degradation
      }, 'Concurrent Error Handling', [TestCategory.PERFORMANCE, TestCategory.CONCURRENCY], {
        maxDuration: 30000, // 30 seconds for concurrency test
        maxNetworkRequests: 500
      })
    );
  });
});