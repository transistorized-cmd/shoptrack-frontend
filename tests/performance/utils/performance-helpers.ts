import { vi } from 'vitest';

/**
 * Performance testing utilities and helpers
 */

export interface PerformanceMetrics {
  duration: number;
  memoryUsage: {
    before: number;
    after: number;
    peak: number;
    leaked: number;
  };
  renderTime?: number;
  operations?: number;
  opsPerSecond?: number;
}

export interface BenchmarkOptions {
  iterations?: number;
  warmup?: number;
  timeout?: number;
  gc?: boolean;
  memoryTracking?: boolean;
}

/**
 * Get current memory usage (approximation for browser environment)
 */
export function getCurrentMemoryUsage(): number {
  if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
    return (window.performance as any).memory.usedJSHeapSize;
  }
  // Fallback for test environment
  return process.memoryUsage?.()?.heapUsed || 0;
}

/**
 * Force garbage collection (if available)
 */
export function forceGarbageCollection(): void {
  if (typeof window !== 'undefined' && 'gc' in window) {
    (window as any).gc();
  }
  // In Node.js test environment
  if (global.gc) {
    global.gc();
  }
}

/**
 * Measure execution time and memory usage of a function
 */
export async function measurePerformance<T>(
  fn: () => T | Promise<T>,
  options: BenchmarkOptions = {}
): Promise<{ result: T; metrics: PerformanceMetrics }> {
  const { iterations = 1, warmup = 0, gc = false, memoryTracking = true } = options;

  // Warmup runs
  for (let i = 0; i < warmup; i++) {
    await fn();
  }

  if (gc) forceGarbageCollection();

  const memoryBefore = memoryTracking ? getCurrentMemoryUsage() : 0;
  let memoryPeak = memoryBefore;

  // Memory tracking during execution
  let memoryInterval: NodeJS.Timeout | null = null;
  if (memoryTracking) {
    memoryInterval = setInterval(() => {
      const current = getCurrentMemoryUsage();
      if (current > memoryPeak) {
        memoryPeak = current;
      }
    }, 10);
  }

  const startTime = performance.now();

  let result: T;
  for (let i = 0; i < iterations; i++) {
    result = await fn();
  }

  const endTime = performance.now();

  if (memoryInterval) {
    clearInterval(memoryInterval);
  }

  if (gc) forceGarbageCollection();

  const memoryAfter = memoryTracking ? getCurrentMemoryUsage() : 0;
  const duration = endTime - startTime;

  const metrics: PerformanceMetrics = {
    duration: duration / iterations, // Average duration per iteration
    memoryUsage: {
      before: memoryBefore,
      after: memoryAfter,
      peak: memoryPeak,
      leaked: Math.max(0, memoryAfter - memoryBefore),
    },
    operations: iterations,
    opsPerSecond: iterations / (duration / 1000),
  };

  return { result: result!, metrics };
}

/**
 * Benchmark component rendering performance
 */
export async function measureRenderPerformance(
  renderFn: () => void | Promise<void>,
  options: BenchmarkOptions = {}
): Promise<PerformanceMetrics> {
  const startTime = performance.now();
  const memoryBefore = getCurrentMemoryUsage();

  await renderFn();

  const renderTime = performance.now() - startTime;
  const memoryAfter = getCurrentMemoryUsage();

  return {
    duration: renderTime,
    renderTime,
    memoryUsage: {
      before: memoryBefore,
      after: memoryAfter,
      peak: memoryAfter,
      leaked: Math.max(0, memoryAfter - memoryBefore),
    },
  };
}

/**
 * Create a performance benchmark suite
 */
export class PerformanceBenchmark {
  private results: Map<string, PerformanceMetrics[]> = new Map();

  async run<T>(
    name: string,
    fn: () => T | Promise<T>,
    options: BenchmarkOptions = {}
  ): Promise<T> {
    const { result, metrics } = await measurePerformance(fn, options);

    if (!this.results.has(name)) {
      this.results.set(name, []);
    }
    this.results.get(name)!.push(metrics);

    return result;
  }

  getResults(name: string): PerformanceMetrics[] {
    return this.results.get(name) || [];
  }

  getAverageMetrics(name: string): PerformanceMetrics | null {
    const results = this.getResults(name);
    if (results.length === 0) return null;

    const avg = results.reduce(
      (acc, metrics) => ({
        duration: acc.duration + metrics.duration,
        memoryUsage: {
          before: acc.memoryUsage.before + metrics.memoryUsage.before,
          after: acc.memoryUsage.after + metrics.memoryUsage.after,
          peak: acc.memoryUsage.peak + metrics.memoryUsage.peak,
          leaked: acc.memoryUsage.leaked + metrics.memoryUsage.leaked,
        },
        operations: (acc.operations || 0) + (metrics.operations || 0),
        opsPerSecond: (acc.opsPerSecond || 0) + (metrics.opsPerSecond || 0),
        renderTime: (acc.renderTime || 0) + (metrics.renderTime || 0),
      }),
      {
        duration: 0,
        memoryUsage: { before: 0, after: 0, peak: 0, leaked: 0 },
        operations: 0,
        opsPerSecond: 0,
        renderTime: 0,
      }
    );

    const count = results.length;
    return {
      duration: avg.duration / count,
      memoryUsage: {
        before: avg.memoryUsage.before / count,
        after: avg.memoryUsage.after / count,
        peak: avg.memoryUsage.peak / count,
        leaked: avg.memoryUsage.leaked / count,
      },
      operations: avg.operations / count,
      opsPerSecond: avg.opsPerSecond / count,
      renderTime: avg.renderTime / count,
    };
  }

  clear(): void {
    this.results.clear();
  }

  summary(): Record<string, any> {
    const summary: Record<string, any> = {};

    for (const [name, results] of this.results) {
      const avgMetrics = this.getAverageMetrics(name);
      summary[name] = {
        runs: results.length,
        averages: avgMetrics,
        fastest: Math.min(...results.map(r => r.duration)),
        slowest: Math.max(...results.map(r => r.duration)),
        totalMemoryLeaked: results.reduce((sum, r) => sum + r.memoryUsage.leaked, 0),
      };
    }

    return summary;
  }
}

/**
 * Create mock timers for performance testing
 */
export function createMockPerformanceTimer() {
  const mockPerformance = {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
  };

  return mockPerformance;
}

/**
 * Simulate network latency for API tests
 */
export function simulateNetworkLatency(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a debounced function for testing debouncing performance
 */
export function createDebouncedFunction<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T & { flush: () => void; cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T>;

  const debounced = ((...args: Parameters<T>) => {
    lastArgs = args;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...lastArgs);
      timeoutId = null;
    }, delay);
  }) as T & { flush: () => void; cancel: () => void };

  debounced.flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      fn(...lastArgs);
      timeoutId = null;
    }
  };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * Memory leak detection helper
 */
export class MemoryLeakDetector {
  private baseline: number;
  private samples: number[] = [];
  private threshold: number;

  constructor(thresholdMB: number = 10) {
    this.threshold = thresholdMB * 1024 * 1024; // Convert to bytes
    this.baseline = getCurrentMemoryUsage();
  }

  sample(): void {
    this.samples.push(getCurrentMemoryUsage());
  }

  isLeaking(): boolean {
    if (this.samples.length < 2) return false;

    const latest = this.samples[this.samples.length - 1];
    const growth = latest - this.baseline;

    return growth > this.threshold;
  }

  getGrowth(): number {
    if (this.samples.length === 0) return 0;

    const latest = this.samples[this.samples.length - 1];
    return latest - this.baseline;
  }

  reset(): void {
    this.baseline = getCurrentMemoryUsage();
    this.samples = [];
  }
}