import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { categorizedDescribe, categorizedIt, TestCategory } from '../../tests/utils/categories';
import {
  ApiErrorMocker,
  RetryTester,
  ERROR_SCENARIOS,
  ApiErrorType,
  errorTestAssertions,
  generateErrorTestData
} from '../../tests/utils/api-error-testing';

// Mock API service for testing
class TestApiService {
  private baseURL = 'https://api.example.com';
  private retryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true
  };

  async getData(endpoint: string): Promise<any> {
    try {
      const response = await this.executeWithRetry(() =>
        axios.get(`${this.baseURL}${endpoint}`)
      );
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  async postData(endpoint: string, data: any): Promise<any> {
    try {
      const response = await this.executeWithRetry(() =>
        axios.post(`${this.baseURL}${endpoint}`, data)
      );
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  async uploadFile(endpoint: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await this.executeWithRetry(() =>
        axios.post(`${this.baseURL}${endpoint}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000 // 30 second timeout for uploads
        })
      );
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  private async executeWithRetry<T>(
    apiCall: () => Promise<T>,
    customConfig?: Partial<typeof this.retryConfig>
  ): Promise<T> {
    const config = { ...this.retryConfig, ...customConfig };
    let attempt = 0;

    while (attempt <= config.maxRetries) {
      try {
        return await apiCall();
      } catch (error) {
        attempt++;

        if (!this.shouldRetry(error) || attempt > config.maxRetries) {
          throw error;
        }

        const delay = config.exponentialBackoff
          ? config.retryDelay * Math.pow(2, attempt - 1)
          : config.retryDelay;

        await this.sleep(delay);
      }
    }

    throw new Error('Max retries exceeded');
  }

  private shouldRetry(error: any): boolean {
    // Don't retry client errors (4xx) except for specific cases
    if (error.response?.status >= 400 && error.response?.status < 500) {
      // Retry on 408 (timeout), 429 (rate limit)
      return [408, 429].includes(error.response.status);
    }

    // Retry on network errors, timeouts, and 5xx errors
    return !error.response || error.response.status >= 500 || error.code === 'ECONNABORTED';
  }

  private handleApiError(error: any): Error {
    if (error.response) {
      return new Error(`API Error ${error.response.status}: ${error.response.data?.message || error.message}`);
    } else if (error.request) {
      return new Error('Network Error: No response received');
    } else {
      return new Error(`Request Error: ${error.message}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

categorizedDescribe('Network Error Handling Tests', [TestCategory.API, TestCategory.ERROR_HANDLING], () => {
  let apiErrorMocker: ApiErrorMocker;
  let retryTester: RetryTester;
  let apiService: TestApiService;

  beforeEach(() => {
    apiErrorMocker = new ApiErrorMocker();
    retryTester = new RetryTester();
    apiService = new TestApiService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    apiErrorMocker.restore();
    vi.useRealTimers();
  });

  categorizedDescribe('Network Connectivity Errors', [TestCategory.NETWORK], () => {
    categorizedIt('should handle complete network failure',
      [TestCategory.ERROR_HANDLING, TestCategory.CRITICAL],
      async () => {
        // Mock complete network failure
        apiErrorMocker.mockNetworkError('get', '/data');

        const result = await retryTester.testRetryLogic(
          () => apiService.getData('/data'),
          {
            maxRetries: 3,
            retryDelay: 100,
            exponentialBackoff: true
          }
        );

        expect(result.success).toBe(false);
        expect(result.attempts).toBe(4); // Initial + 3 retries
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain('Network Error');

        errorTestAssertions.assertRetryBehavior(result, 4, 50, 1000);
      }
    );

    categorizedIt('should recover from temporary network issues',
      [TestCategory.ERROR_HANDLING, TestCategory.NETWORK],
      async () => {
        // Mock temporary network failure followed by success
        apiErrorMocker.mockEndpointWithError(
          'get',
          '/data',
          [
            ERROR_SCENARIOS[ApiErrorType.NETWORK_ERROR],
            ERROR_SCENARIOS[ApiErrorType.NETWORK_ERROR]
          ],
          { status: 200, data: { success: true, data: 'recovered' } }
        );

        const result = await retryTester.testRetryLogic(
          () => apiService.getData('/data'),
          {
            maxRetries: 3,
            retryDelay: 100,
            exponentialBackoff: true
          }
        );

        errorTestAssertions.assertEventualSuccess(result, 3);
        expect(result.result).toEqual({ success: true, data: 'recovered' });
      }
    );

    categorizedIt('should handle intermittent connectivity',
      [TestCategory.ERROR_HANDLING, TestCategory.FLAKY],
      async () => {
        // Mock intermittent failures (30% failure rate)
        apiErrorMocker.mockIntermittentFailure('get', '/data', 0.7); // 70% failure rate for testing

        const results = await Promise.allSettled([
          retryTester.testRetryLogic(() => apiService.getData('/data'), { maxRetries: 5, retryDelay: 50 }),
          retryTester.testRetryLogic(() => apiService.getData('/data'), { maxRetries: 5, retryDelay: 50 }),
          retryTester.testRetryLogic(() => apiService.getData('/data'), { maxRetries: 5, retryDelay: 50 })
        ]);

        const successCount = results.filter(r => r.status === 'fulfilled').length;
        expect(successCount).toBeGreaterThan(0); // At least some should succeed eventually
      }
    );
  });

  categorizedDescribe('Timeout Handling', [TestCategory.TIMEOUT], () => {
    categorizedIt('should handle request timeouts with retry',
      [TestCategory.ERROR_HANDLING, TestCategory.TIMEOUT],
      async () => {
        // Mock timeout errors
        apiErrorMocker.mockTimeout('post', '/upload');

        const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

        const result = await retryTester.testRetryLogic(
          () => apiService.uploadFile('/upload', testFile),
          {
            maxRetries: 2,
            retryDelay: 200,
            timeout: 1000
          }
        );

        expect(result.success).toBe(false);
        expect(result.attempts).toBe(3); // Initial + 2 retries
        errorTestAssertions.assertRetryBehavior(result, 3, 100, 500);
      }
    );

    categorizedIt('should recover from timeout on retry',
      [TestCategory.ERROR_HANDLING, TestCategory.TIMEOUT],
      async () => {
        // Mock timeout followed by success
        apiErrorMocker.mockEndpointWithError(
          'post',
          '/data',
          [ERROR_SCENARIOS[ApiErrorType.TIMEOUT]],
          { status: 200, data: { id: 123, created: true } }
        );

        const result = await retryTester.testRetryLogic(
          () => apiService.postData('/data', { name: 'test' }),
          {
            maxRetries: 3,
            retryDelay: 100
          }
        );

        errorTestAssertions.assertEventualSuccess(result, 2);
        expect(result.result).toEqual({ id: 123, created: true });
      }
    );

    categorizedIt('should handle progressive timeout increases',
      [TestCategory.ERROR_HANDLING, TestCategory.PERFORMANCE],
      async () => {
        const timeouts: number[] = [];
        let attemptCount = 0;

        const testApiCall = async () => {
          attemptCount++;
          const timeout = 100 * attemptCount; // Progressive timeout
          timeouts.push(timeout);

          if (attemptCount < 3) {
            throw new Error('Request timeout');
          }

          return { success: true, attempt: attemptCount };
        };

        const result = await retryTester.testRetryLogic(
          testApiCall,
          {
            maxRetries: 3,
            retryDelay: 50
          }
        );

        expect(result.success).toBe(true);
        expect(timeouts).toEqual([100, 200, 300]);
        expect(result.result).toEqual({ success: true, attempt: 3 });
      }
    );
  });

  categorizedDescribe('Exponential Backoff', [TestCategory.RETRY_LOGIC], () => {
    categorizedIt('should implement exponential backoff correctly',
      [TestCategory.ERROR_HANDLING, TestCategory.PERFORMANCE],
      async () => {
        // Mock multiple server errors
        apiErrorMocker.mockEndpointWithError(
          'get',
          '/data',
          [
            ERROR_SCENARIOS[ApiErrorType.SERVER_ERROR],
            ERROR_SCENARIOS[ApiErrorType.SERVER_ERROR],
            ERROR_SCENARIOS[ApiErrorType.SERVER_ERROR]
          ],
          { status: 200, data: { success: true } }
        );

        const result = await retryTester.testRetryLogic(
          () => apiService.getData('/data'),
          {
            maxRetries: 3,
            retryDelay: 100,
            exponentialBackoff: true
          }
        );

        errorTestAssertions.assertEventualSuccess(result, 4);
        errorTestAssertions.assertExponentialBackoff(result.retryDelays, 100, 0.2);
      }
    );

    categorizedIt('should use linear backoff when configured',
      [TestCategory.ERROR_HANDLING, TestCategory.RETRY_LOGIC],
      async () => {
        // Mock multiple errors
        apiErrorMocker.mockEndpointWithError(
          'get',
          '/data',
          [
            ERROR_SCENARIOS[ApiErrorType.SERVER_ERROR],
            ERROR_SCENARIOS[ApiErrorType.SERVER_ERROR]
          ],
          { status: 200, data: { success: true } }
        );

        const result = await retryTester.testRetryLogic(
          () => apiService.getData('/data'),
          {
            maxRetries: 2,
            retryDelay: 200,
            exponentialBackoff: false
          }
        );

        errorTestAssertions.assertEventualSuccess(result, 3);

        // All delays should be approximately equal (linear)
        result.retryDelays.forEach(delay => {
          expect(delay).toBeGreaterThanOrEqual(150);
          expect(delay).toBeLessThanOrEqual(250);
        });
      }
    );

    categorizedIt('should cap maximum retry delay',
      [TestCategory.ERROR_HANDLING, TestCategory.PERFORMANCE],
      async () => {
        const maxDelay = 1000;
        const retryDelays: number[] = [];

        const testApiCall = async () => {
          throw new Error('Persistent error');
        };

        const customRetryLogic = async () => {
          let attempt = 0;
          const maxRetries = 10;
          const baseDelay = 100;

          while (attempt <= maxRetries) {
            try {
              return await testApiCall();
            } catch (error) {
              attempt++;

              if (attempt > maxRetries) throw error;

              // Calculate delay with cap
              const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
              const cappedDelay = Math.min(exponentialDelay, maxDelay);
              retryDelays.push(cappedDelay);

              await new Promise(resolve => setTimeout(resolve, cappedDelay));
            }
          }
        };

        try {
          await customRetryLogic();
        } catch (error) {
          // Expected to fail
        }

        // Check that delays are capped
        const delaysOverCap = retryDelays.filter(delay => delay > maxDelay);
        expect(delaysOverCap).toHaveLength(0);

        // Check that we reach the cap
        const cappedDelays = retryDelays.filter(delay => delay === maxDelay);
        expect(cappedDelays.length).toBeGreaterThan(0);
      }
    );
  });

  categorizedDescribe('Concurrent Error Handling', [TestCategory.CONCURRENCY], () => {
    categorizedIt('should handle multiple concurrent requests with errors',
      [TestCategory.ERROR_HANDLING, TestCategory.CONCURRENCY],
      async () => {
        // Mock different error scenarios for different endpoints
        apiErrorMocker.mockEndpointWithError(
          'get',
          '/endpoint1',
          [ERROR_SCENARIOS[ApiErrorType.SERVER_ERROR]],
          { status: 200, data: { id: 1 } }
        );

        apiErrorMocker.mockEndpointWithError(
          'get',
          '/endpoint2',
          [ERROR_SCENARIOS[ApiErrorType.NETWORK_ERROR]],
          { status: 200, data: { id: 2 } }
        );

        apiErrorMocker.mockEndpointWithError(
          'get',
          '/endpoint3',
          [ERROR_SCENARIOS[ApiErrorType.TIMEOUT]],
          { status: 200, data: { id: 3 } }
        );

        const promises = [
          retryTester.testRetryLogic(() => apiService.getData('/endpoint1'), { maxRetries: 2, retryDelay: 50 }),
          retryTester.testRetryLogic(() => apiService.getData('/endpoint2'), { maxRetries: 2, retryDelay: 50 }),
          retryTester.testRetryLogic(() => apiService.getData('/endpoint3'), { maxRetries: 2, retryDelay: 50 })
        ];

        const results = await Promise.allSettled(promises);

        // All should eventually succeed
        results.forEach((result, index) => {
          expect(result.status).toBe('fulfilled');
          if (result.status === 'fulfilled') {
            expect(result.value.success).toBe(true);
            expect(result.value.result).toEqual({ id: index + 1 });
          }
        });
      }
    );

    categorizedIt('should handle rate limiting across concurrent requests',
      [TestCategory.ERROR_HANDLING, TestCategory.RATE_LIMITING],
      async () => {
        // Mock rate limiting
        apiErrorMocker.mockEndpointWithError(
          'get',
          /\/api\/data/,
          [ERROR_SCENARIOS[ApiErrorType.RATE_LIMIT]],
          { status: 200, data: { success: true } }
        );

        const concurrentRequests = 5;
        const promises = Array.from({ length: concurrentRequests }, (_, i) =>
          retryTester.testRetryLogic(
            () => apiService.getData(`/api/data/${i}`),
            {
              maxRetries: 1,
              retryDelay: 100
            }
          )
        );

        const results = await Promise.allSettled(promises);

        // Some should be rate limited initially but succeed on retry
        const successfulResults = results.filter(r => r.status === 'fulfilled');
        expect(successfulResults.length).toBeGreaterThan(0);
      }
    );
  });

  categorizedDescribe('Error Recovery Patterns', [TestCategory.RECOVERY], () => {
    categorizedIt('should implement circuit breaker pattern',
      [TestCategory.ERROR_HANDLING, TestCategory.CIRCUIT_BREAKER],
      async () => {
        let failureCount = 0;
        let circuitOpen = false;
        const failureThreshold = 3;
        const recoveryTimeout = 1000;

        const circuitBreakerApiCall = async () => {
          if (circuitOpen) {
            throw new Error('Circuit breaker open');
          }

          try {
            // Simulate API call that fails initially
            if (failureCount < failureThreshold) {
              failureCount++;
              throw new Error('Service unavailable');
            }

            // Reset failure count on success
            failureCount = 0;
            return { success: true, data: 'Circuit closed' };
          } catch (error) {
            if (failureCount >= failureThreshold) {
              circuitOpen = true;
              setTimeout(() => {
                circuitOpen = false;
                failureCount = 0;
              }, recoveryTimeout);
            }
            throw error;
          }
        };

        // First three calls should fail and open circuit
        for (let i = 0; i < failureThreshold; i++) {
          try {
            await circuitBreakerApiCall();
          } catch (error) {
            expect(error.message).toBe('Service unavailable');
          }
        }

        expect(circuitOpen).toBe(true);

        // Next call should fail with circuit open
        try {
          await circuitBreakerApiCall();
        } catch (error) {
          expect(error.message).toBe('Circuit breaker open');
        }

        // Wait for circuit to close
        vi.advanceTimersByTime(recoveryTimeout);

        // Should succeed after circuit closes
        const result = await circuitBreakerApiCall();
        expect(result).toEqual({ success: true, data: 'Circuit closed' });
      }
    );

    categorizedIt('should implement fallback mechanism',
      [TestCategory.ERROR_HANDLING, TestCategory.FALLBACK],
      async () => {
        const fallbackData = { fallback: true, data: 'Fallback response' };

        const apiCallWithFallback = async () => {
          try {
            return await apiService.getData('/primary-endpoint');
          } catch (primaryError) {
            try {
              return await apiService.getData('/secondary-endpoint');
            } catch (secondaryError) {
              // Return fallback data
              return fallbackData;
            }
          }
        };

        // Mock both endpoints to fail
        apiErrorMocker.mockNetworkError('get', '/primary-endpoint');
        apiErrorMocker.mockNetworkError('get', '/secondary-endpoint');

        const result = await apiCallWithFallback();
        expect(result).toEqual(fallbackData);
      }
    );

    categorizedIt('should handle graceful degradation',
      [TestCategory.ERROR_HANDLING, TestCategory.DEGRADATION],
      async () => {
        let serviceLevel = 'full';
        const degradedData = { degraded: true, basicData: 'Limited functionality' };

        const gracefulDegradationCall = async () => {
          try {
            if (serviceLevel === 'full') {
              // Try full service
              return await apiService.getData('/full-service');
            } else {
              // Return degraded service
              return degradedData;
            }
          } catch (error) {
            // Degrade service level
            serviceLevel = 'degraded';
            return degradedData;
          }
        };

        // Mock full service failure
        apiErrorMocker.mockNetworkError('get', '/full-service');

        const result = await gracefulDegradationCall();
        expect(result).toEqual(degradedData);
        expect(serviceLevel).toBe('degraded');
      }
    );
  });
});