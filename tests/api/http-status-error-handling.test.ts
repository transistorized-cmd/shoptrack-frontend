import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { categorizedDescribe, categorizedIt, TestCategory } from '../../tests/utils/categories';
import {
  ApiErrorMocker,
  RetryTester,
  ERROR_SCENARIOS,
  ApiErrorType,
  errorTestAssertions
} from '../../tests/utils/api-error-testing';

// HTTP Status Code Handler
class HttpStatusErrorHandler {
  private statusHandlers: Map<number, (error: AxiosError) => Promise<any>> = new Map();
  private rangeHandlers: Map<string, (error: AxiosError) => Promise<any>> = new Map();

  constructor() {
    this.setupDefaultHandlers();
  }

  /**
   * Register handler for specific status code
   */
  onStatus(statusCode: number, handler: (error: AxiosError) => Promise<any>): void {
    this.statusHandlers.set(statusCode, handler);
  }

  /**
   * Register handler for status code range (e.g., '4xx', '5xx')
   */
  onStatusRange(range: string, handler: (error: AxiosError) => Promise<any>): void {
    this.rangeHandlers.set(range, handler);
  }

  /**
   * Handle error based on status code
   */
  async handleError(error: AxiosError): Promise<any> {
    if (!error.response) {
      throw error; // Network error, not HTTP status error
    }

    const status = error.response.status;

    // Check for specific status handler
    const specificHandler = this.statusHandlers.get(status);
    if (specificHandler) {
      return await specificHandler(error);
    }

    // Check for range handlers
    const statusRange = this.getStatusRange(status);
    const rangeHandler = this.rangeHandlers.get(statusRange);
    if (rangeHandler) {
      return await rangeHandler(error);
    }

    // No handler found, re-throw error
    throw error;
  }

  private setupDefaultHandlers(): void {
    // 401 Unauthorized - Attempt token refresh
    this.onStatus(401, async (error) => {
      const refreshed = await this.attemptTokenRefresh();
      if (refreshed) {
        // Retry original request with new token
        return await this.retryOriginalRequest(error);
      }
      throw new Error('Authentication failed - please login again');
    });

    // 403 Forbidden - Check permissions
    this.onStatus(403, async (error) => {
      throw new Error('Access denied - insufficient permissions');
    });

    // 404 Not Found - Handle gracefully
    this.onStatus(404, async (error) => {
      return { notFound: true, message: 'Resource not found' };
    });

    // 409 Conflict - Provide resolution options
    this.onStatus(409, async (error) => {
      const conflictData = error.response?.data;
      throw new Error(`Conflict detected: ${conflictData?.message || 'Resource conflict'}`);
    });

    // 422 Validation Error - Extract validation errors
    this.onStatus(422, async (error) => {
      const validationErrors = this.extractValidationErrors(error.response?.data);
      throw new Error(`Validation failed: ${JSON.stringify(validationErrors)}`);
    });

    // 429 Rate Limited - Respect retry-after
    this.onStatus(429, async (error) => {
      const retryAfter = this.getRetryAfterDelay(error.response);
      await this.sleep(retryAfter);
      return await this.retryOriginalRequest(error);
    });

    // 5xx Server Errors - Retry with backoff
    this.onStatusRange('5xx', async (error) => {
      throw error; // Let retry logic handle server errors
    });
  }

  private getStatusRange(status: number): string {
    const firstDigit = Math.floor(status / 100);
    return `${firstDigit}xx`;
  }

  private async attemptTokenRefresh(): Promise<boolean> {
    try {
      // Mock token refresh logic
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return false;

      const response = await axios.post('/auth/refresh', { refreshToken });
      const newToken = response.data.accessToken;

      localStorage.setItem('accessToken', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

      return true;
    } catch (error) {
      return false;
    }
  }

  private async retryOriginalRequest(error: AxiosError): Promise<any> {
    if (!error.config) throw error;

    // Update authorization header
    const token = localStorage.getItem('accessToken');
    if (token) {
      error.config.headers = {
        ...error.config.headers,
        Authorization: `Bearer ${token}`
      };
    }

    return await axios.request(error.config);
  }

  private extractValidationErrors(data: any): Record<string, string[]> {
    if (data?.errors) return data.errors;
    if (data?.validationErrors) return data.validationErrors;
    return { general: [data?.message || 'Validation failed'] };
  }

  private getRetryAfterDelay(response?: AxiosResponse): number {
    const retryAfter = response?.headers['retry-after'];
    if (retryAfter) {
      const delay = parseInt(retryAfter);
      return isNaN(delay) ? 60000 : delay * 1000; // Convert to milliseconds
    }
    return 60000; // Default 1 minute
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// API Client with Status Code Handling
class ApiClientWithStatusHandling {
  private statusHandler: HttpStatusErrorHandler;
  private baseURL: string;

  constructor(baseURL: string = 'https://api.example.com') {
    this.baseURL = baseURL;
    this.statusHandler = new HttpStatusErrorHandler();
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Response interceptor to handle errors
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response) {
          try {
            return await this.statusHandler.handleError(error);
          } catch (handledError) {
            throw handledError;
          }
        }
        throw error;
      }
    );
  }

  async get(endpoint: string): Promise<any> {
    const response = await axios.get(`${this.baseURL}${endpoint}`);
    return response.data;
  }

  async post(endpoint: string, data: any): Promise<any> {
    const response = await axios.post(`${this.baseURL}${endpoint}`, data);
    return response.data;
  }

  async put(endpoint: string, data: any): Promise<any> {
    const response = await axios.put(`${this.baseURL}${endpoint}`, data);
    return response.data;
  }

  async delete(endpoint: string): Promise<any> {
    const response = await axios.delete(`${this.baseURL}${endpoint}`);
    return response.data;
  }

  // Allow custom status handlers
  onStatus(statusCode: number, handler: (error: AxiosError) => Promise<any>): void {
    this.statusHandler.onStatus(statusCode, handler);
  }

  onStatusRange(range: string, handler: (error: AxiosError) => Promise<any>): void {
    this.statusHandler.onStatusRange(range, handler);
  }
}

categorizedDescribe('HTTP Status Code Error Handling Tests', [TestCategory.API, TestCategory.HTTP_STATUS], () => {
  let apiErrorMocker: ApiErrorMocker;
  let statusHandler: HttpStatusErrorHandler;
  let apiClient: ApiClientWithStatusHandling;

  beforeEach(() => {
    apiErrorMocker = new ApiErrorMocker();
    statusHandler = new HttpStatusErrorHandler();
    apiClient = new ApiClientWithStatusHandling();

    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn()
    };

    vi.useFakeTimers();
  });

  afterEach(() => {
    apiErrorMocker.restore();
    axios.interceptors.response.clear();
    vi.useRealTimers();
  });

  categorizedDescribe('4xx Client Errors', [TestCategory.CLIENT_ERROR], () => {
    categorizedIt('should handle 400 Bad Request errors',
      [TestCategory.HTTP_STATUS, TestCategory.VALIDATION],
      async () => {
        apiErrorMocker.mockEndpointWithError(
          'post',
          '/api/users',
          [ERROR_SCENARIOS[ApiErrorType.CLIENT_ERROR]]
        );

        try {
          await apiClient.post('/api/users', { invalidData: true });
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.message).toContain('Bad Request');
        }
      }
    );

    categorizedIt('should handle 401 Unauthorized with token refresh',
      [TestCategory.HTTP_STATUS, TestCategory.AUTH],
      async () => {
        // Mock token refresh success
        (localStorage.getItem as any).mockImplementation((key: string) => {
          if (key === 'refreshToken') return 'valid-refresh-token';
          if (key === 'accessToken') return 'new-access-token';
          return null;
        });

        // Mock refresh endpoint
        apiErrorMocker.mockEndpointWithError(
          'post',
          '/auth/refresh',
          [],
          { status: 200, data: { accessToken: 'new-access-token' } }
        );

        // Mock protected endpoint that fails once then succeeds
        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/protected',
          [ERROR_SCENARIOS[ApiErrorType.AUTHENTICATION_ERROR]],
          { status: 200, data: { message: 'Access granted' } }
        );

        const result = await apiClient.get('/api/protected');

        expect(result).toEqual({ message: 'Access granted' });
        expect(localStorage.setItem).toHaveBeenCalledWith('accessToken', 'new-access-token');
      }
    );

    categorizedIt('should handle 401 Unauthorized with failed token refresh',
      [TestCategory.HTTP_STATUS, TestCategory.AUTH_FAILURE],
      async () => {
        // Mock no refresh token
        (localStorage.getItem as any).mockReturnValue(null);

        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/protected',
          [ERROR_SCENARIOS[ApiErrorType.AUTHENTICATION_ERROR]]
        );

        try {
          await apiClient.get('/api/protected');
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.message).toContain('Authentication failed - please login again');
        }
      }
    );

    categorizedIt('should handle 403 Forbidden errors',
      [TestCategory.HTTP_STATUS, TestCategory.AUTHORIZATION],
      async () => {
        apiErrorMocker.mockEndpointWithError(
          'delete',
          '/api/admin/users/123',
          [ERROR_SCENARIOS[ApiErrorType.AUTHORIZATION_ERROR]]
        );

        try {
          await apiClient.delete('/api/admin/users/123');
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.message).toContain('Access denied - insufficient permissions');
        }
      }
    );

    categorizedIt('should handle 404 Not Found gracefully',
      [TestCategory.HTTP_STATUS, TestCategory.NOT_FOUND],
      async () => {
        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/users/nonexistent',
          [ERROR_SCENARIOS[ApiErrorType.NOT_FOUND]]
        );

        const result = await apiClient.get('/api/users/nonexistent');

        expect(result).toEqual({
          notFound: true,
          message: 'Resource not found'
        });
      }
    );

    categorizedIt('should handle 409 Conflict errors',
      [TestCategory.HTTP_STATUS, TestCategory.CONFLICT],
      async () => {
        const conflictScenario = {
          ...ERROR_SCENARIOS[ApiErrorType.CLIENT_ERROR],
          statusCode: 409,
          data: {
            error: 'Conflict',
            message: 'Email already exists',
            conflictingField: 'email'
          }
        };

        apiErrorMocker.mockEndpointWithError(
          'post',
          '/api/users',
          [conflictScenario]
        );

        try {
          await apiClient.post('/api/users', { email: 'existing@example.com' });
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.message).toContain('Conflict detected: Email already exists');
        }
      }
    );

    categorizedIt('should handle 422 Validation errors',
      [TestCategory.HTTP_STATUS, TestCategory.VALIDATION],
      async () => {
        apiErrorMocker.mockEndpointWithError(
          'post',
          '/api/users',
          [ERROR_SCENARIOS[ApiErrorType.VALIDATION_ERROR]]
        );

        try {
          await apiClient.post('/api/users', { invalidData: true });
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.message).toContain('Validation failed');
          expect(error.message).toContain('Email is required');
          expect(error.message).toContain('Password must be at least 8 characters');
        }
      }
    );

    categorizedIt('should handle 429 Rate Limiting with retry-after',
      [TestCategory.HTTP_STATUS, TestCategory.RATE_LIMITING],
      async () => {
        const rateLimitScenario = {
          ...ERROR_SCENARIOS[ApiErrorType.RATE_LIMIT],
          headers: { 'retry-after': '2' } // 2 seconds
        };

        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/data',
          [rateLimitScenario],
          { status: 200, data: { success: true } }
        );

        const startTime = Date.now();
        const result = await apiClient.get('/api/data');

        // Should have waited for retry-after delay
        vi.advanceTimersByTime(2000);

        expect(result).toEqual({ success: true });
      }
    );
  });

  categorizedDescribe('5xx Server Errors', [TestCategory.SERVER_ERROR], () => {
    categorizedIt('should handle 500 Internal Server Error',
      [TestCategory.HTTP_STATUS, TestCategory.SERVER_ERROR],
      async () => {
        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/data',
          [ERROR_SCENARIOS[ApiErrorType.SERVER_ERROR]]
        );

        try {
          await apiClient.get('/api/data');
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.response?.status).toBe(500);
        }
      }
    );

    categorizedIt('should handle 502 Bad Gateway',
      [TestCategory.HTTP_STATUS, TestCategory.GATEWAY_ERROR],
      async () => {
        const badGatewayScenario = {
          ...ERROR_SCENARIOS[ApiErrorType.SERVER_ERROR],
          statusCode: 502,
          message: 'Bad Gateway'
        };

        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/data',
          [badGatewayScenario]
        );

        try {
          await apiClient.get('/api/data');
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.response?.status).toBe(502);
        }
      }
    );

    categorizedIt('should handle 503 Service Unavailable',
      [TestCategory.HTTP_STATUS, TestCategory.MAINTENANCE],
      async () => {
        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/data',
          [ERROR_SCENARIOS[ApiErrorType.MAINTENANCE]]
        );

        try {
          await apiClient.get('/api/data');
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.response?.status).toBe(503);
        }
      }
    );

    categorizedIt('should handle 504 Gateway Timeout',
      [TestCategory.HTTP_STATUS, TestCategory.TIMEOUT],
      async () => {
        const gatewayTimeoutScenario = {
          ...ERROR_SCENARIOS[ApiErrorType.SERVER_ERROR],
          statusCode: 504,
          message: 'Gateway Timeout'
        };

        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/data',
          [gatewayTimeoutScenario]
        );

        try {
          await apiClient.get('/api/data');
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.response?.status).toBe(504);
        }
      }
    );
  });

  categorizedDescribe('Custom Status Handlers', [TestCategory.CUSTOM_HANDLERS], () => {
    categorizedIt('should allow custom status code handlers',
      [TestCategory.HTTP_STATUS, TestCategory.CUSTOMIZATION],
      async () => {
        let customHandlerCalled = false;
        const customData = { custom: true, handled: 'by custom handler' };

        // Register custom handler for 418 (I'm a teapot)
        apiClient.onStatus(418, async (error) => {
          customHandlerCalled = true;
          return customData;
        });

        const teapotScenario = {
          type: ApiErrorType.CLIENT_ERROR,
          statusCode: 418,
          message: "I'm a teapot"
        };

        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/coffee',
          [teapotScenario]
        );

        const result = await apiClient.get('/api/coffee');

        expect(customHandlerCalled).toBe(true);
        expect(result).toEqual(customData);
      }
    );

    categorizedIt('should allow custom range handlers',
      [TestCategory.HTTP_STATUS, TestCategory.RANGE_HANDLERS],
      async () => {
        let rangeHandlerCalled = false;
        const rangeData = { range: '3xx', redirected: true };

        // Register custom handler for 3xx redirects
        apiClient.onStatusRange('3xx', async (error) => {
          rangeHandlerCalled = true;
          return rangeData;
        });

        const redirectScenario = {
          type: ApiErrorType.CLIENT_ERROR,
          statusCode: 301,
          message: 'Moved Permanently'
        };

        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/moved',
          [redirectScenario]
        );

        const result = await apiClient.get('/api/moved');

        expect(rangeHandlerCalled).toBe(true);
        expect(result).toEqual(rangeData);
      }
    );

    categorizedIt('should prioritize specific handlers over range handlers',
      [TestCategory.HTTP_STATUS, TestCategory.HANDLER_PRIORITY],
      async () => {
        let specificHandlerCalled = false;
        let rangeHandlerCalled = false;

        // Register range handler for 4xx
        apiClient.onStatusRange('4xx', async (error) => {
          rangeHandlerCalled = true;
          return { handler: 'range' };
        });

        // Register specific handler for 404
        apiClient.onStatus(404, async (error) => {
          specificHandlerCalled = true;
          return { handler: 'specific' };
        });

        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/missing',
          [ERROR_SCENARIOS[ApiErrorType.NOT_FOUND]]
        );

        const result = await apiClient.get('/api/missing');

        expect(specificHandlerCalled).toBe(true);
        expect(rangeHandlerCalled).toBe(false);
        expect(result).toEqual({ handler: 'specific' });
      }
    );
  });

  categorizedDescribe('Status Code Edge Cases', [TestCategory.EDGE_CASES], () => {
    categorizedIt('should handle unknown status codes gracefully',
      [TestCategory.HTTP_STATUS, TestCategory.UNKNOWN_STATUS],
      async () => {
        const unknownStatusScenario = {
          type: ApiErrorType.CLIENT_ERROR,
          statusCode: 999,
          message: 'Unknown Status Code'
        };

        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/unknown',
          [unknownStatusScenario]
        );

        try {
          await apiClient.get('/api/unknown');
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.response?.status).toBe(999);
          expect(error.message).toContain('Unknown Status Code');
        }
      }
    );

    categorizedIt('should handle malformed error responses',
      [TestCategory.HTTP_STATUS, TestCategory.MALFORMED_RESPONSE],
      async () => {
        const malformedScenario = {
          type: ApiErrorType.SERVER_ERROR,
          statusCode: 500,
          data: 'This is not valid JSON' // String instead of object
        };

        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/malformed',
          [malformedScenario]
        );

        try {
          await apiClient.get('/api/malformed');
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.response?.status).toBe(500);
          expect(error.response?.data).toBe('This is not valid JSON');
        }
      }
    );

    categorizedIt('should handle missing error message gracefully',
      [TestCategory.HTTP_STATUS, TestCategory.MISSING_MESSAGE],
      async () => {
        const noMessageScenario = {
          type: ApiErrorType.CLIENT_ERROR,
          statusCode: 400,
          data: {} // Empty object, no message
        };

        apiErrorMocker.mockEndpointWithError(
          'post',
          '/api/validate',
          [noMessageScenario]
        );

        try {
          await apiClient.post('/api/validate', { data: 'test' });
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.response?.status).toBe(400);
          // Should handle missing message gracefully
        }
      }
    );

    categorizedIt('should handle concurrent status code errors',
      [TestCategory.HTTP_STATUS, TestCategory.CONCURRENT_ERRORS],
      async () => {
        // Mock different status codes for different endpoints
        const scenarios = [
          { endpoint: '/api/endpoint1', status: 401 },
          { endpoint: '/api/endpoint2', status: 403 },
          { endpoint: '/api/endpoint3', status: 404 },
          { endpoint: '/api/endpoint4', status: 429 },
          { endpoint: '/api/endpoint5', status: 500 }
        ];

        scenarios.forEach(({ endpoint, status }) => {
          const scenario = {
            ...ERROR_SCENARIOS[ApiErrorType.CLIENT_ERROR],
            statusCode: status
          };
          apiErrorMocker.mockEndpointWithError('get', endpoint, [scenario]);
        });

        const promises = scenarios.map(({ endpoint }) =>
          apiClient.get(endpoint).catch(error => ({ endpoint, error }))
        );

        const results = await Promise.allSettled(promises);

        expect(results).toHaveLength(scenarios.length);

        // Verify each endpoint returned appropriate error or handled response
        results.forEach((result, index) => {
          const scenario = scenarios[index];
          expect(result.status).toBe('fulfilled');

          if (result.status === 'fulfilled') {
            const { endpoint, error } = result.value as any;

            if (scenario.status === 404) {
              // 404 should be handled gracefully
              expect(result.value).toEqual({
                notFound: true,
                message: 'Resource not found'
              });
            } else {
              // Other errors should be thrown
              expect(error).toBeDefined();
            }
          }
        });
      }
    );
  });
});