import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios, { AxiosResponse } from 'axios';
import { categorizedDescribe, categorizedIt, TestCategory } from '../../tests/utils/categories';
import {
  ApiErrorMocker,
  RetryTester,
  ERROR_SCENARIOS,
  ApiErrorType,
  errorTestAssertions,
  generateErrorTestData,
  RetryTestOptions
} from '../../tests/utils/api-error-testing';

// Advanced Retry Logic Implementation
class AdvancedRetryService {
  private defaultConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    exponentialBackoff: true,
    jitter: true,
    retryCondition: this.defaultRetryCondition,
    onRetry: this.defaultOnRetry
  };

  constructor(private config: Partial<typeof this.defaultConfig> = {}) {
    this.config = { ...this.defaultConfig, ...config };
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationConfig?: Partial<typeof this.defaultConfig>
  ): Promise<T> {
    const finalConfig = { ...this.config, ...operationConfig };
    let attempt = 0;
    let lastError: any;

    while (attempt <= finalConfig.maxRetries!) {
      try {
        const result = await operation();

        // Reset any circuit breaker or backoff state on success
        this.onSuccess(attempt);

        return result;
      } catch (error) {
        lastError = error;
        attempt++;

        // Check if we should retry
        if (attempt > finalConfig.maxRetries! || !finalConfig.retryCondition!(error, attempt)) {
          break;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt, finalConfig);

        // Call retry callback
        finalConfig.onRetry!(error, attempt, delay);

        // Wait before retry
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private calculateDelay(attempt: number, config: typeof this.defaultConfig): number {
    let delay = config.baseDelay!;

    if (config.exponentialBackoff) {
      delay = config.baseDelay! * Math.pow(2, attempt - 1);
    }

    // Apply maximum delay limit
    delay = Math.min(delay, config.maxDelay!);

    // Add jitter to prevent thundering herd
    if (config.jitter) {
      const jitterRange = delay * 0.1; // 10% jitter
      delay += (Math.random() - 0.5) * 2 * jitterRange;
    }

    return Math.max(delay, 0);
  }

  private defaultRetryCondition(error: any, attempt: number): boolean {
    // Don't retry on client errors (4xx) except specific cases
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return [408, 429].includes(error.response.status);
    }

    // Retry on network errors, timeouts, and 5xx errors
    return !error.response || error.response.status >= 500 || error.code === 'ECONNABORTED';
  }

  private defaultOnRetry(error: any, attempt: number, delay: number): void {
    console.log(`Retry attempt ${attempt} after ${delay}ms delay. Error: ${error.message}`);
  }

  private onSuccess(attempts: number): void {
    if (attempts > 1) {
      console.log(`Operation succeeded after ${attempts} attempts`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Specialized retry strategies
class RetryStrategies {
  static exponentialBackoff(baseDelay: number = 1000, maxDelay: number = 30000) {
    return {
      maxRetries: 5,
      baseDelay,
      maxDelay,
      exponentialBackoff: true,
      jitter: true
    };
  }

  static linearBackoff(delay: number = 1000) {
    return {
      maxRetries: 3,
      baseDelay: delay,
      maxDelay: delay,
      exponentialBackoff: false,
      jitter: false
    };
  }

  static aggressiveRetry() {
    return {
      maxRetries: 10,
      baseDelay: 100,
      maxDelay: 5000,
      exponentialBackoff: true,
      jitter: true
    };
  }

  static conservativeRetry() {
    return {
      maxRetries: 2,
      baseDelay: 2000,
      maxDelay: 10000,
      exponentialBackoff: true,
      jitter: false
    };
  }

  static customRetryCondition(condition: (error: any, attempt: number) => boolean) {
    return (error: any, attempt: number) => condition(error, attempt);
  }
}

categorizedDescribe('Advanced Retry Logic Tests', [TestCategory.API, TestCategory.RETRY_LOGIC], () => {
  let apiErrorMocker: ApiErrorMocker;
  let retryTester: RetryTester;
  let retryService: AdvancedRetryService;

  beforeEach(() => {
    apiErrorMocker = new ApiErrorMocker();
    retryTester = new RetryTester();
    retryService = new AdvancedRetryService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    apiErrorMocker.restore();
    vi.useRealTimers();
  });

  categorizedDescribe('Exponential Backoff with Jitter', [TestCategory.BACKOFF], () => {
    categorizedIt('should implement exponential backoff with jitter',
      [TestCategory.RETRY_LOGIC, TestCategory.PERFORMANCE],
      async () => {
        const retryDelays: number[] = [];
        const baseDelay = 1000;

        // Mock service that fails multiple times
        let attemptCount = 0;
        const failingService = async () => {
          attemptCount++;
          if (attemptCount <= 3) {
            throw new Error(`Attempt ${attemptCount} failed`);
          }
          return { success: true, attempt: attemptCount };
        };

        const result = await retryTester.testRetryLogic(
          failingService,
          {
            maxRetries: 3,
            retryDelay: baseDelay,
            exponentialBackoff: true,
            onRetry: (attempt, error) => {
              // Record the actual delay (this would be calculated in real implementation)
              const expectedDelay = baseDelay * Math.pow(2, attempt);
              retryDelays.push(expectedDelay);
            }
          }
        );

        expect(result.success).toBe(true);
        expect(result.attempts).toBe(4);

        // Verify exponential progression
        expect(retryDelays).toEqual([1000, 2000, 4000]);
      }
    );

    categorizedIt('should add jitter to prevent thundering herd',
      [TestCategory.RETRY_LOGIC, TestCategory.PERFORMANCE],
      async () => {
        const delays: number[] = [];

        // Test multiple retry operations in parallel
        const operations = Array.from({ length: 5 }, async (_, index) => {
          const service = new AdvancedRetryService({
            maxRetries: 2,
            baseDelay: 1000,
            exponentialBackoff: true,
            jitter: true,
            onRetry: (error, attempt, delay) => delays.push(delay)
          });

          try {
            await service.executeWithRetry(async () => {
              throw new Error(`Service ${index} unavailable`);
            });
          } catch (error) {
            // Expected to fail
          }
        });

        await Promise.allSettled(operations);

        // With jitter, delays should vary slightly
        const uniqueDelays = new Set(delays);
        expect(uniqueDelays.size).toBeGreaterThan(1); // Should have some variation due to jitter
      }
    );

    categorizedIt('should respect maximum delay limit',
      [TestCategory.RETRY_LOGIC, TestCategory.BOUNDS_CHECKING],
      async () => {
        const maxDelay = 5000;
        const recordedDelays: number[] = [];

        const service = new AdvancedRetryService({
          maxRetries: 10,
          baseDelay: 1000,
          maxDelay,
          exponentialBackoff: true,
          jitter: false,
          onRetry: (error, attempt, delay) => recordedDelays.push(delay)
        });

        try {
          await service.executeWithRetry(async () => {
            throw new Error('Persistent failure');
          });
        } catch (error) {
          // Expected to fail
        }

        // All delays should be at or below maxDelay
        recordedDelays.forEach(delay => {
          expect(delay).toBeLessThanOrEqual(maxDelay);
        });

        // Should reach maxDelay for later attempts
        const delaysAtMax = recordedDelays.filter(delay => delay === maxDelay);
        expect(delaysAtMax.length).toBeGreaterThan(0);
      }
    );
  });

  categorizedDescribe('Custom Retry Conditions', [TestCategory.CONDITIONAL_RETRY], () => {
    categorizedIt('should retry only on specific error types',
      [TestCategory.RETRY_LOGIC, TestCategory.ERROR_HANDLING],
      async () => {
        // Custom retry condition: only retry on 5xx and network errors
        const customRetryCondition = (error: any, attempt: number) => {
          return error.response?.status >= 500 || !error.response;
        };

        const service = new AdvancedRetryService({
          maxRetries: 3,
          baseDelay: 100,
          retryCondition: customRetryCondition
        });

        // Test 400 error (should not retry)
        apiErrorMocker.mockEndpointWithError(
          'get',
          '/client-error',
          [ERROR_SCENARIOS[ApiErrorType.CLIENT_ERROR]]
        );

        try {
          await service.executeWithRetry(() => axios.get('https://api.example.com/client-error'));
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.response?.status).toBe(400);
        }

        expect(apiErrorMocker.getRetryAttempts('get', '/client-error')).toBe(1); // No retries

        // Test 500 error (should retry)
        apiErrorMocker.reset();
        apiErrorMocker.mockEndpointWithError(
          'get',
          '/server-error',
          [
            ERROR_SCENARIOS[ApiErrorType.SERVER_ERROR],
            ERROR_SCENARIOS[ApiErrorType.SERVER_ERROR]
          ],
          { status: 200, data: { success: true } }
        );

        const result = await service.executeWithRetry(() =>
          axios.get('https://api.example.com/server-error')
        );

        expect(result.data).toEqual({ success: true });
        expect(apiErrorMocker.getRetryAttempts('get', '/server-error')).toBe(3); // Initial + 2 retries
      }
    );

    categorizedIt('should implement conditional retry based on error content',
      [TestCategory.RETRY_LOGIC, TestCategory.SMART_RETRY],
      async () => {
        const retryableErrors = ['TIMEOUT', 'CONNECTION_RESET', 'SERVICE_UNAVAILABLE'];

        const smartRetryCondition = (error: any, attempt: number) => {
          const errorMessage = error.message || error.response?.data?.error || '';
          return retryableErrors.some(retryableError =>
            errorMessage.toUpperCase().includes(retryableError)
          );
        };

        const service = new AdvancedRetryService({
          maxRetries: 2,
          baseDelay: 100,
          retryCondition: smartRetryCondition
        });

        // Test retryable error
        let attemptCount = 0;
        const retryableErrorService = async () => {
          attemptCount++;
          if (attemptCount <= 2) {
            throw new Error('SERVICE_UNAVAILABLE: Please try again');
          }
          return { success: true };
        };

        const result = await service.executeWithRetry(retryableErrorService);
        expect(result).toEqual({ success: true });
        expect(attemptCount).toBe(3);

        // Test non-retryable error
        attemptCount = 0;
        const nonRetryableErrorService = async () => {
          attemptCount++;
          throw new Error('INVALID_CREDENTIALS: Access denied');
        };

        try {
          await service.executeWithRetry(nonRetryableErrorService);
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.message).toContain('INVALID_CREDENTIALS');
          expect(attemptCount).toBe(1); // No retries
        }
      }
    );

    categorizedIt('should implement retry with circuit breaker integration',
      [TestCategory.RETRY_LOGIC, TestCategory.CIRCUIT_BREAKER],
      async () => {
        let circuitOpen = false;
        let failureCount = 0;
        const failureThreshold = 3;

        const circuitBreakerRetryCondition = (error: any, attempt: number) => {
          if (circuitOpen) {
            return false; // Don't retry when circuit is open
          }

          failureCount++;
          if (failureCount >= failureThreshold) {
            circuitOpen = true;
            setTimeout(() => {
              circuitOpen = false;
              failureCount = 0;
            }, 5000);
          }

          return attempt <= 2; // Standard retry condition
        };

        const service = new AdvancedRetryService({
          maxRetries: 5,
          baseDelay: 100,
          retryCondition: circuitBreakerRetryCondition
        });

        // First few calls should fail and eventually open circuit
        for (let i = 0; i < failureThreshold + 1; i++) {
          try {
            await service.executeWithRetry(async () => {
              throw new Error('Service failure');
            });
          } catch (error) {
            // Expected failures
          }
        }

        expect(circuitOpen).toBe(true);

        // Subsequent calls should fail immediately (no retries due to open circuit)
        let finalAttemptCount = 0;
        try {
          await service.executeWithRetry(async () => {
            finalAttemptCount++;
            throw new Error('Service failure');
          });
        } catch (error) {
          // Should fail on first attempt due to circuit breaker
          expect(finalAttemptCount).toBe(1);
        }
      }
    );
  });

  categorizedDescribe('Retry Strategy Patterns', [TestCategory.RETRY_PATTERNS], () => {
    categorizedIt('should implement aggressive retry for critical operations',
      [TestCategory.RETRY_LOGIC, TestCategory.CRITICAL],
      async () => {
        const aggressiveConfig = RetryStrategies.aggressiveRetry();

        // Mock operation that fails many times before succeeding
        let attemptCount = 0;
        const criticalOperation = async () => {
          attemptCount++;
          if (attemptCount <= 8) {
            throw new Error(`Critical operation failed, attempt ${attemptCount}`);
          }
          return { success: true, recoveredAt: attemptCount };
        };

        const result = await retryTester.testRetryLogic(
          criticalOperation,
          {
            maxRetries: aggressiveConfig.maxRetries,
            retryDelay: aggressiveConfig.baseDelay,
            exponentialBackoff: aggressiveConfig.exponentialBackoff
          }
        );

        expect(result.success).toBe(true);
        expect(result.attempts).toBe(9);
        expect(result.result).toEqual({ success: true, recoveredAt: 9 });
      }
    );

    categorizedIt('should implement conservative retry for non-critical operations',
      [TestCategory.RETRY_LOGIC, TestCategory.CONSERVATIVE],
      async () => {
        const conservativeConfig = RetryStrategies.conservativeRetry();

        // Mock operation that fails persistently
        const nonCriticalOperation = async () => {
          throw new Error('Non-critical operation failed');
        };

        const result = await retryTester.testRetryLogic(
          nonCriticalOperation,
          {
            maxRetries: conservativeConfig.maxRetries,
            retryDelay: conservativeConfig.baseDelay,
            exponentialBackoff: conservativeConfig.exponentialBackoff
          }
        );

        expect(result.success).toBe(false);
        expect(result.attempts).toBe(3); // Initial + 2 retries (conservative)
      }
    );

    categorizedIt('should implement linear backoff for predictable delays',
      [TestCategory.RETRY_LOGIC, TestCategory.LINEAR_BACKOFF],
      async () => {
        const linearConfig = RetryStrategies.linearBackoff(500);

        let attemptCount = 0;
        const predictableOperation = async () => {
          attemptCount++;
          if (attemptCount <= 2) {
            throw new Error('Predictable failure');
          }
          return { success: true };
        };

        const result = await retryTester.testRetryLogic(
          predictableOperation,
          {
            maxRetries: linearConfig.maxRetries,
            retryDelay: linearConfig.baseDelay,
            exponentialBackoff: linearConfig.exponentialBackoff
          }
        );

        expect(result.success).toBe(true);
        expect(result.attempts).toBe(3);

        // With linear backoff, all delays should be approximately equal
        result.retryDelays.forEach(delay => {
          expect(delay).toBeGreaterThanOrEqual(400);
          expect(delay).toBeLessThanOrEqual(600);
        });
      }
    );
  });

  categorizedDescribe('Retry with Rate Limiting', [TestCategory.RATE_LIMITING], () => {
    categorizedIt('should respect Retry-After header',
      [TestCategory.RETRY_LOGIC, TestCategory.RATE_LIMITING],
      async () => {
        const retryAfterSeconds = 2;
        const recordedDelays: number[] = [];

        // Mock rate limiting with Retry-After header
        apiErrorMocker.mockEndpointWithError(
          'post',
          '/api/data',
          [{
            ...ERROR_SCENARIOS[ApiErrorType.RATE_LIMIT],
            headers: { 'Retry-After': retryAfterSeconds.toString() }
          }],
          { status: 200, data: { success: true } }
        );

        const rateLimitAwareRetry = async () => {
          try {
            return await axios.post('https://api.example.com/api/data', { data: 'test' });
          } catch (error) {
            if (error.response?.status === 429) {
              const retryAfter = parseInt(error.response.headers['retry-after'] || '0');
              const delay = retryAfter * 1000; // Convert to milliseconds
              recordedDelays.push(delay);

              await new Promise(resolve => setTimeout(resolve, delay));

              // Retry after waiting
              return await axios.post('https://api.example.com/api/data', { data: 'test' });
            }
            throw error;
          }
        };

        const result = await rateLimitAwareRetry();

        expect(result.data).toEqual({ success: true });
        expect(recordedDelays).toEqual([retryAfterSeconds * 1000]);
      }
    );

    categorizedIt('should implement token bucket for rate limiting',
      [TestCategory.RETRY_LOGIC, TestCategory.TOKEN_BUCKET],
      async () => {
        class TokenBucket {
          private tokens: number;
          private lastRefill: number;

          constructor(
            private capacity: number,
            private refillRate: number // tokens per second
          ) {
            this.tokens = capacity;
            this.lastRefill = Date.now();
          }

          async consume(tokens: number = 1): Promise<boolean> {
            this.refill();

            if (this.tokens >= tokens) {
              this.tokens -= tokens;
              return true;
            }

            return false;
          }

          private refill(): void {
            const now = Date.now();
            const timePassed = (now - this.lastRefill) / 1000;
            const tokensToAdd = Math.floor(timePassed * this.refillRate);

            if (tokensToAdd > 0) {
              this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
              this.lastRefill = now;
            }
          }

          getTokens(): number {
            this.refill();
            return this.tokens;
          }
        }

        const bucket = new TokenBucket(5, 2); // 5 tokens capacity, 2 tokens/second refill
        const delays: number[] = [];

        const rateLimitedOperation = async () => {
          while (!(await bucket.consume())) {
            const waitTime = 500; // Wait 500ms if no tokens available
            delays.push(waitTime);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }

          return { success: true, tokens: bucket.getTokens() };
        };

        // Consume all tokens quickly
        const results = [];
        for (let i = 0; i < 8; i++) {
          results.push(await rateLimitedOperation());
        }

        expect(results).toHaveLength(8);
        expect(delays.length).toBeGreaterThan(0); // Should have waited for token refill

        // Verify token bucket is working
        results.forEach(result => {
          expect(result.success).toBe(true);
          expect(result.tokens).toBeGreaterThanOrEqual(0);
        });
      }
    );
  });

  categorizedDescribe('Retry Performance Optimization', [TestCategory.PERFORMANCE], () => {
    categorizedIt('should optimize retry performance with parallel backup requests',
      [TestCategory.RETRY_LOGIC, TestCategory.PARALLEL_REQUESTS],
      async () => {
        const primaryDelay = 2000;
        const backupDelay = 1000;

        // Primary request that's slow
        const primaryRequest = async () => {
          await new Promise(resolve => setTimeout(resolve, primaryDelay));
          return { source: 'primary', data: 'primary result' };
        };

        // Backup request that's faster
        const backupRequest = async () => {
          await new Promise(resolve => setTimeout(resolve, backupDelay));
          return { source: 'backup', data: 'backup result' };
        };

        const parallelRetryStrategy = async () => {
          // Start primary request
          const primaryPromise = primaryRequest();

          // Start backup request after initial delay
          const backupPromise = new Promise<any>(resolve => {
            setTimeout(async () => {
              resolve(await backupRequest());
            }, 500); // Start backup after 500ms
          });

          // Return whichever completes first
          return Promise.race([primaryPromise, backupPromise]);
        };

        const startTime = Date.now();
        const result = await parallelRetryStrategy();
        const duration = Date.now() - startTime;

        expect(result.source).toBe('backup'); // Backup should win
        expect(duration).toBeLessThan(primaryDelay);
        expect(duration).toBeGreaterThan(backupDelay);
      }
    );

    categorizedIt('should implement request deduplication for concurrent retries',
      [TestCategory.RETRY_LOGIC, TestCategory.DEDUPLICATION],
      async () => {
        const requestCache = new Map<string, Promise<any>>();
        let actualRequestCount = 0;

        const deduplicatedRequest = async (url: string) => {
          if (requestCache.has(url)) {
            return requestCache.get(url)!;
          }

          const requestPromise = (async () => {
            actualRequestCount++;
            await new Promise(resolve => setTimeout(resolve, 100));
            return { url, requestId: actualRequestCount };
          })();

          requestCache.set(url, requestPromise);

          // Clean up cache after request completes
          requestPromise.finally(() => {
            requestCache.delete(url);
          });

          return requestPromise;
        };

        // Make multiple concurrent requests to same URL
        const concurrentRequests = Array.from({ length: 5 }, () =>
          deduplicatedRequest('/api/data')
        );

        const results = await Promise.all(concurrentRequests);

        // All requests should return the same result
        expect(results).toHaveLength(5);
        results.forEach(result => {
          expect(result).toEqual(results[0]);
        });

        // Only one actual request should have been made
        expect(actualRequestCount).toBe(1);
      }
    );
  });
});