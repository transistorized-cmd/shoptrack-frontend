import { vi, expect } from 'vitest';
import axios, { AxiosError, AxiosResponse } from 'axios';
import MockAdapter from 'axios-mock-adapter';

// API Error Types
export enum ApiErrorType {
  NETWORK_ERROR = 'network-error',
  TIMEOUT = 'timeout',
  SERVER_ERROR = 'server-error',
  CLIENT_ERROR = 'client-error',
  AUTHENTICATION_ERROR = 'auth-error',
  AUTHORIZATION_ERROR = 'authz-error',
  RATE_LIMIT = 'rate-limit',
  MAINTENANCE = 'maintenance',
  NOT_FOUND = 'not-found',
  VALIDATION_ERROR = 'validation-error'
}

// Error Scenarios Configuration
export interface ErrorScenario {
  type: ApiErrorType;
  statusCode?: number;
  delay?: number;
  message?: string;
  headers?: Record<string, string>;
  data?: any;
  shouldRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

// Common Error Scenarios
export const ERROR_SCENARIOS: Record<ApiErrorType, ErrorScenario> = {
  [ApiErrorType.NETWORK_ERROR]: {
    type: ApiErrorType.NETWORK_ERROR,
    message: 'Network Error',
    shouldRetry: true,
    maxRetries: 3,
    retryDelay: 1000
  },
  [ApiErrorType.TIMEOUT]: {
    type: ApiErrorType.TIMEOUT,
    statusCode: 408,
    message: 'Request Timeout',
    shouldRetry: true,
    maxRetries: 2,
    retryDelay: 500
  },
  [ApiErrorType.SERVER_ERROR]: {
    type: ApiErrorType.SERVER_ERROR,
    statusCode: 500,
    message: 'Internal Server Error',
    shouldRetry: true,
    maxRetries: 3,
    retryDelay: 2000
  },
  [ApiErrorType.CLIENT_ERROR]: {
    type: ApiErrorType.CLIENT_ERROR,
    statusCode: 400,
    message: 'Bad Request',
    shouldRetry: false
  },
  [ApiErrorType.AUTHENTICATION_ERROR]: {
    type: ApiErrorType.AUTHENTICATION_ERROR,
    statusCode: 401,
    message: 'Unauthorized',
    shouldRetry: false
  },
  [ApiErrorType.AUTHORIZATION_ERROR]: {
    type: ApiErrorType.AUTHORIZATION_ERROR,
    statusCode: 403,
    message: 'Forbidden',
    shouldRetry: false
  },
  [ApiErrorType.RATE_LIMIT]: {
    type: ApiErrorType.RATE_LIMIT,
    statusCode: 429,
    message: 'Too Many Requests',
    headers: { 'Retry-After': '60' },
    shouldRetry: true,
    maxRetries: 1,
    retryDelay: 60000
  },
  [ApiErrorType.MAINTENANCE]: {
    type: ApiErrorType.MAINTENANCE,
    statusCode: 503,
    message: 'Service Unavailable',
    headers: { 'Retry-After': '300' },
    shouldRetry: true,
    maxRetries: 2,
    retryDelay: 30000
  },
  [ApiErrorType.NOT_FOUND]: {
    type: ApiErrorType.NOT_FOUND,
    statusCode: 404,
    message: 'Not Found',
    shouldRetry: false
  },
  [ApiErrorType.VALIDATION_ERROR]: {
    type: ApiErrorType.VALIDATION_ERROR,
    statusCode: 422,
    message: 'Validation Failed',
    data: {
      errors: {
        email: ['Email is required'],
        password: ['Password must be at least 8 characters']
      }
    },
    shouldRetry: false
  }
};

// Mock API Error Utility
export class ApiErrorMocker {
  private mockAdapter: MockAdapter;
  private retryAttempts: Map<string, number> = new Map();
  private errorCallbacks: Map<string, Function> = new Map();

  constructor(axiosInstance = axios) {
    this.mockAdapter = new MockAdapter(axiosInstance);
  }

  /**
   * Mock an API endpoint with error scenarios
   */
  mockEndpointWithError(
    method: 'get' | 'post' | 'put' | 'delete' | 'patch',
    url: string | RegExp,
    scenarios: ErrorScenario[],
    finalResponse?: { status: number; data: any }
  ) {
    const endpointKey = `${method.toUpperCase()}_${url}`;
    this.retryAttempts.set(endpointKey, 0);

    // Setup mock handler
    const mockMethod = this.mockAdapter[`on${method.charAt(0).toUpperCase() + method.slice(1)}`];

    mockMethod.call(this.mockAdapter, url).reply((config) => {
      const attempts = this.retryAttempts.get(endpointKey) || 0;
      this.retryAttempts.set(endpointKey, attempts + 1);

      // Check if we should return an error scenario
      if (attempts < scenarios.length) {
        const scenario = scenarios[attempts];

        // Call error callback if registered
        const callback = this.errorCallbacks.get(`${endpointKey}_${attempts}`);
        if (callback) callback(scenario);

        return this.createErrorResponse(scenario);
      }

      // Return final successful response
      if (finalResponse) {
        return [finalResponse.status, finalResponse.data];
      }

      return [200, { success: true, data: 'Mock success response' }];
    });
  }

  /**
   * Mock network error
   */
  mockNetworkError(method: 'get' | 'post' | 'put' | 'delete' | 'patch', url: string | RegExp) {
    const mockMethod = this.mockAdapter[`on${method.charAt(0).toUpperCase() + method.slice(1)}`];
    mockMethod.call(this.mockAdapter, url).networkError();
  }

  /**
   * Mock timeout error
   */
  mockTimeout(method: 'get' | 'post' | 'put' | 'delete' | 'patch', url: string | RegExp) {
    const mockMethod = this.mockAdapter[`on${method.charAt(0).toUpperCase() + method.slice(1)}`];
    mockMethod.call(this.mockAdapter, url).timeout();
  }

  /**
   * Mock intermittent failures
   */
  mockIntermittentFailure(
    method: 'get' | 'post' | 'put' | 'delete' | 'patch',
    url: string | RegExp,
    failureRate: number = 0.3, // 30% failure rate
    errorScenario: ErrorScenario = ERROR_SCENARIOS[ApiErrorType.SERVER_ERROR]
  ) {
    const mockMethod = this.mockAdapter[`on${method.charAt(0).toUpperCase() + method.slice(1)}`];

    mockMethod.call(this.mockAdapter, url).reply(() => {
      if (Math.random() < failureRate) {
        return this.createErrorResponse(errorScenario);
      }
      return [200, { success: true, data: 'Success' }];
    });
  }

  /**
   * Register callback for specific error attempt
   */
  onErrorAttempt(
    method: 'get' | 'post' | 'put' | 'delete' | 'patch',
    url: string | RegExp,
    attempt: number,
    callback: (scenario: ErrorScenario) => void
  ) {
    const endpointKey = `${method.toUpperCase()}_${url}_${attempt}`;
    this.errorCallbacks.set(endpointKey, callback);
  }

  /**
   * Get retry attempt count for endpoint
   */
  getRetryAttempts(method: 'get' | 'post' | 'put' | 'delete' | 'patch', url: string | RegExp): number {
    const endpointKey = `${method.toUpperCase()}_${url}`;
    return this.retryAttempts.get(endpointKey) || 0;
  }

  /**
   * Reset retry counters
   */
  resetRetryCounters() {
    this.retryAttempts.clear();
  }

  /**
   * Reset all mocks
   */
  reset() {
    this.mockAdapter.reset();
    this.retryAttempts.clear();
    this.errorCallbacks.clear();
  }

  /**
   * Restore original axios behavior
   */
  restore() {
    this.mockAdapter.restore();
    this.retryAttempts.clear();
    this.errorCallbacks.clear();
  }

  private createErrorResponse(scenario: ErrorScenario): [number, any, Record<string, string>?] {
    if (scenario.type === ApiErrorType.NETWORK_ERROR) {
      throw new Error('Network Error');
    }

    const status = scenario.statusCode || 500;
    const data = scenario.data || {
      error: scenario.message || 'Unknown error',
      type: scenario.type
    };
    const headers = scenario.headers;

    return [status, data, headers];
  }
}

// Retry Logic Test Utilities
export interface RetryTestOptions {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff?: boolean;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
  timeout?: number;
}

export class RetryTester {
  private attempts: number = 0;
  private errors: any[] = [];
  private timestamps: number[] = [];

  async testRetryLogic<T>(
    apiCall: () => Promise<T>,
    options: RetryTestOptions
  ): Promise<{
    success: boolean;
    result?: T;
    error?: any;
    attempts: number;
    errors: any[];
    retryDelays: number[];
    totalDuration: number;
  }> {
    this.attempts = 0;
    this.errors = [];
    this.timestamps = [Date.now()];

    try {
      const result = await this.executeWithRetry(apiCall, options);
      return {
        success: true,
        result,
        attempts: this.attempts,
        errors: this.errors,
        retryDelays: this.calculateRetryDelays(),
        totalDuration: Date.now() - this.timestamps[0]
      };
    } catch (finalError) {
      return {
        success: false,
        error: finalError,
        attempts: this.attempts,
        errors: this.errors,
        retryDelays: this.calculateRetryDelays(),
        totalDuration: Date.now() - this.timestamps[0]
      };
    }
  }

  private async executeWithRetry<T>(
    apiCall: () => Promise<T>,
    options: RetryTestOptions
  ): Promise<T> {
    while (this.attempts <= options.maxRetries) {
      this.attempts++;

      try {
        const result = await this.withTimeout(apiCall(), options.timeout);
        return result;
      } catch (error) {
        this.errors.push(error);
        this.timestamps.push(Date.now());

        // Check if we should retry
        const shouldRetry = this.attempts <= options.maxRetries &&
          (!options.retryCondition || options.retryCondition(error));

        if (!shouldRetry) {
          throw error;
        }

        // Call retry callback
        if (options.onRetry) {
          options.onRetry(this.attempts - 1, error);
        }

        // Calculate delay
        const delay = this.calculateDelay(this.attempts - 1, options);
        if (delay > 0) {
          await this.sleep(delay);
        }
      }
    }

    throw this.errors[this.errors.length - 1];
  }

  private calculateDelay(attempt: number, options: RetryTestOptions): number {
    if (options.exponentialBackoff) {
      return options.retryDelay * Math.pow(2, attempt);
    }
    return options.retryDelay;
  }

  private calculateRetryDelays(): number[] {
    const delays: number[] = [];
    for (let i = 1; i < this.timestamps.length; i++) {
      delays.push(this.timestamps[i] - this.timestamps[i - 1]);
    }
    return delays;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private withTimeout<T>(promise: Promise<T>, timeout?: number): Promise<T> {
    if (!timeout) return promise;

    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      )
    ]);
  }
}

// Error Testing Assertions
export const errorTestAssertions = {
  /**
   * Assert that retry logic was executed correctly
   */
  assertRetryBehavior(
    result: Awaited<ReturnType<RetryTester['testRetryLogic']>>,
    expectedAttempts: number,
    expectedMinDelay: number,
    expectedMaxDelay: number
  ) {
    expect(result.attempts).toBe(expectedAttempts);

    if (result.retryDelays.length > 0) {
      result.retryDelays.forEach(delay => {
        expect(delay).toBeGreaterThanOrEqual(expectedMinDelay);
        expect(delay).toBeLessThanOrEqual(expectedMaxDelay);
      });
    }
  },

  /**
   * Assert that exponential backoff was applied
   */
  assertExponentialBackoff(
    retryDelays: number[],
    baseDelay: number,
    tolerance: number = 0.1
  ) {
    retryDelays.forEach((delay, index) => {
      const expectedDelay = baseDelay * Math.pow(2, index);
      const margin = expectedDelay * tolerance;

      expect(delay).toBeGreaterThanOrEqual(expectedDelay - margin);
      expect(delay).toBeLessThanOrEqual(expectedDelay + margin);
    });
  },

  /**
   * Assert that specific error types were encountered
   */
  assertErrorTypes(
    errors: any[],
    expectedTypes: (string | number)[]
  ) {
    expectedTypes.forEach((type, index) => {
      if (index < errors.length) {
        const error = errors[index];
        if (typeof type === 'string') {
          expect(error.message || error.type).toContain(type);
        } else {
          expect(error.response?.status).toBe(type);
        }
      }
    });
  },

  /**
   * Assert that retry stopped on non-retryable error
   */
  assertStoppedOnNonRetryableError(
    result: Awaited<ReturnType<RetryTester['testRetryLogic']>>,
    nonRetryableErrorCode: number
  ) {
    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1);
    expect(result.error?.response?.status).toBe(nonRetryableErrorCode);
  },

  /**
   * Assert that final success was achieved after retries
   */
  assertEventualSuccess(
    result: Awaited<ReturnType<RetryTester['testRetryLogic']>>,
    expectedAttempts: number
  ) {
    expect(result.success).toBe(true);
    expect(result.attempts).toBe(expectedAttempts);
    expect(result.result).toBeDefined();
  }
};

// Test Data Generators
export const generateErrorTestData = {
  /**
   * Generate network connectivity scenarios
   */
  networkConnectivityScenarios(): ErrorScenario[][] {
    return [
      // Temporary network loss
      [
        ERROR_SCENARIOS[ApiErrorType.NETWORK_ERROR],
        ERROR_SCENARIOS[ApiErrorType.NETWORK_ERROR]
      ],
      // Timeout followed by success
      [
        ERROR_SCENARIOS[ApiErrorType.TIMEOUT]
      ],
      // Server errors with recovery
      [
        ERROR_SCENARIOS[ApiErrorType.SERVER_ERROR],
        ERROR_SCENARIOS[ApiErrorType.SERVER_ERROR]
      ]
    ];
  },

  /**
   * Generate authentication error scenarios
   */
  authenticationScenarios(): ErrorScenario[][] {
    return [
      // Token expiration and refresh
      [
        ERROR_SCENARIOS[ApiErrorType.AUTHENTICATION_ERROR]
      ],
      // Invalid credentials
      [
        ERROR_SCENARIOS[ApiErrorType.AUTHORIZATION_ERROR]
      ]
    ];
  },

  /**
   * Generate rate limiting scenarios
   */
  rateLimitingScenarios(): ErrorScenario[][] {
    return [
      // Rate limit with retry-after
      [
        ERROR_SCENARIOS[ApiErrorType.RATE_LIMIT]
      ],
      // Multiple rate limits
      [
        ERROR_SCENARIOS[ApiErrorType.RATE_LIMIT],
        ERROR_SCENARIOS[ApiErrorType.RATE_LIMIT]
      ]
    ];
  },

  /**
   * Generate maintenance scenarios
   */
  maintenanceScenarios(): ErrorScenario[][] {
    return [
      // Planned maintenance
      [
        ERROR_SCENARIOS[ApiErrorType.MAINTENANCE]
      ],
      // Extended maintenance
      [
        ERROR_SCENARIOS[ApiErrorType.MAINTENANCE],
        ERROR_SCENARIOS[ApiErrorType.MAINTENANCE]
      ]
    ];
  }
};

export default {
  ApiErrorMocker,
  RetryTester,
  ERROR_SCENARIOS,
  ApiErrorType,
  errorTestAssertions,
  generateErrorTestData
};