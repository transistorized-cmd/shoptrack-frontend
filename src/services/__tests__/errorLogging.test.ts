import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ErrorLoggingService, errorLogger } from '../errorLogging'
import type { ErrorReport, ErrorLoggingConfig } from '../errorLogging'

// Mock environment variables
const mockEnv = {
  DEV: true,
  VITE_ERROR_LOGGING_ENDPOINT: 'https://api.example.com/errors',
  VITE_ERROR_LOGGING_API_KEY: 'test-api-key'
}

vi.mock('import.meta', () => ({
  env: mockEnv
}))

// Mock global objects
const mockFetch = vi.fn()
const mockSendBeacon = vi.fn()
const mockConsole = {
  group: vi.fn(),
  groupEnd: vi.fn(),
  error: vi.fn()
}

global.fetch = mockFetch
Object.defineProperty(navigator, 'sendBeacon', {
  writable: true,
  value: mockSendBeacon
})

Object.defineProperty(navigator, 'userAgent', {
  writable: true,
  value: 'Test User Agent'
})

Object.defineProperty(window, 'location', {
  writable: true,
  value: { href: 'https://test.example.com/page' }
})

Object.defineProperty(console, 'group', { value: mockConsole.group })
Object.defineProperty(console, 'groupEnd', { value: mockConsole.groupEnd })
Object.defineProperty(console, 'error', { value: mockConsole.error })

describe('ErrorLoggingService', () => {
  let service: ErrorLoggingService

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Reset DOM event listeners
    document.removeEventListener = vi.fn()
    document.addEventListener = vi.fn()
    window.removeEventListener = vi.fn()
    window.addEventListener = vi.fn()

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK'
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with default config', () => {
      service = new ErrorLoggingService()

      expect(document.addEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
      expect(window.addEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    })

    it('should initialize with custom config', () => {
      const config: Partial<ErrorLoggingConfig> = {
        enableConsoleLogging: false,
        enableRemoteLogging: true,
        maxRetries: 5,
        retryDelay: 2000,
        endpoint: 'https://custom.endpoint.com',
        apiKey: 'custom-key'
      }

      service = new ErrorLoggingService(config)
      expect(service).toBeInstanceOf(ErrorLoggingService)
    })

    it('should generate unique session IDs', () => {
      const service1 = new ErrorLoggingService()
      const service2 = new ErrorLoggingService()

      // Access private sessionId property for testing
      const sessionId1 = (service1 as any).sessionId
      const sessionId2 = (service2 as any).sessionId

      expect(sessionId1).toMatch(/^session_\d+_[a-z0-9]{9}$/)
      expect(sessionId2).toMatch(/^session_\d+_[a-z0-9]{9}$/)
      expect(sessionId1).not.toBe(sessionId2)
    })
  })

  describe('logError', () => {
    beforeEach(() => {
      service = new ErrorLoggingService({
        enableConsoleLogging: true,
        enableRemoteLogging: false
      })
    })

    it('should log error to console when console logging is enabled', async () => {
      const testError = new Error('Test error message')
      testError.stack = 'Error: Test error message\n    at testFunction'

      await service.logError(testError, 'Test Context', { userId: '123' })

      expect(mockConsole.group).toHaveBeenCalledWith('🔴 Error Report')
      expect(mockConsole.error).toHaveBeenCalledWith('Timestamp:', expect.any(String))
      expect(mockConsole.error).toHaveBeenCalledWith('Context:', 'Test Context')
      expect(mockConsole.error).toHaveBeenCalledWith('Error:', expect.objectContaining({
        name: 'Error',
        message: 'Test error message',
        stack: expect.any(String)
      }))
      expect(mockConsole.error).toHaveBeenCalledWith('URL:', 'https://test.example.com/page')
      expect(mockConsole.error).toHaveBeenCalledWith('Additional Info:', { userId: '123' })
      expect(mockConsole.error).toHaveBeenCalledWith('Stack trace:', expect.any(String))
      expect(mockConsole.groupEnd).toHaveBeenCalled()
    })

    it('should not log to console when console logging is disabled', async () => {
      service = new ErrorLoggingService({
        enableConsoleLogging: false,
        enableRemoteLogging: false
      })

      const testError = new Error('Test error')
      await service.logError(testError, 'Test Context')

      expect(mockConsole.group).not.toHaveBeenCalled()
      expect(mockConsole.error).not.toHaveBeenCalled()
    })

    it('should create proper error report structure', async () => {
      const testError = new Error('Test error message')
      testError.name = 'CustomError'
      testError.stack = 'Custom stack trace'

      const additionalInfo = { userId: '123', action: 'submit' }

      await service.logError(testError, 'Form Submission', additionalInfo)

      // Since we can't directly access the error report, we check console calls
      expect(mockConsole.error).toHaveBeenCalledWith('Context:', 'Form Submission')
      expect(mockConsole.error).toHaveBeenCalledWith('Error:', expect.objectContaining({
        name: 'CustomError',
        message: 'Test error message',
        stack: 'Custom stack trace'
      }))
      expect(mockConsole.error).toHaveBeenCalledWith('Additional Info:', additionalInfo)
    })

    it('should handle errors without stack trace', async () => {
      const testError = new Error('Test error')
      delete (testError as any).stack

      await service.logError(testError, 'Test Context')

      expect(mockConsole.error).toHaveBeenCalledWith('Error:', expect.objectContaining({
        name: 'Error',
        message: 'Test error',
        stack: undefined
      }))
      expect(mockConsole.error).not.toHaveBeenCalledWith('Stack trace:', expect.any(String))
    })

    it('should use default context when none provided', async () => {
      const testError = new Error('Test error')
      await service.logError(testError)

      expect(mockConsole.error).toHaveBeenCalledWith('Context:', 'Unknown')
    })

    it('should handle errors during user ID retrieval gracefully', async () => {
      const testError = new Error('Test error')

      // This should not throw even if user ID retrieval fails
      await expect(service.logError(testError, 'Test Context')).resolves.not.toThrow()
    })
  })

  describe('remote logging', () => {
    beforeEach(() => {
      service = new ErrorLoggingService({
        enableConsoleLogging: false,
        enableRemoteLogging: true,
        endpoint: 'https://api.example.com/errors',
        apiKey: 'test-key',
        maxRetries: 2,
        retryDelay: 100
      })
    })

    it('should queue errors for remote logging', async () => {
      const testError = new Error('Remote error')

      await service.logError(testError, 'Remote Context')

      // Advance timers to process queue
      await vi.runAllTimersAsync()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/errors',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-key'
          }),
          body: expect.stringContaining('"Remote Context"')
        })
      )
    })

    it('should send error reports with correct structure', async () => {
      const testError = new Error('Structured error')

      await service.logError(testError, 'API Call', { endpoint: '/users', method: 'POST' })
      await vi.runAllTimersAsync()

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)

      expect(body).toMatchObject({
        timestamp: expect.any(String),
        url: 'https://test.example.com/page',
        userAgent: 'Test User Agent',
        context: 'API Call',
        error: {
          name: 'Error',
          message: 'Structured error',
          stack: expect.any(String)
        },
        sessionId: expect.stringMatching(/^session_\d+_[a-z0-9]{9}$/),
        additionalInfo: {
          endpoint: '/users',
          method: 'POST'
        }
      })
    })

    it('should retry failed requests', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 })

      const testError = new Error('Retry test')
      await service.logError(testError, 'Retry Context')

      await vi.runAllTimersAsync()

      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should stop retrying after max retries exceeded', async () => {
      mockFetch.mockRejectedValue(new Error('Persistent network error'))

      const testError = new Error('Max retry test')
      await service.logError(testError, 'Max Retry Context')

      await vi.runAllTimersAsync()

      // Should try initial + 2 retries = 3 total attempts
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      const testError = new Error('HTTP error test')
      await service.logError(testError, 'HTTP Error Context')

      await vi.runAllTimersAsync()

      expect(mockFetch).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })

    it('should not send to remote when endpoint is not configured', async () => {
      service = new ErrorLoggingService({
        enableRemoteLogging: true,
        endpoint: undefined
      })

      const testError = new Error('No endpoint test')
      await service.logError(testError, 'No Endpoint Context')

      await vi.runAllTimersAsync()

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should send requests without API key when not configured', async () => {
      service = new ErrorLoggingService({
        enableConsoleLogging: false,
        enableRemoteLogging: true,
        endpoint: 'https://api.example.com/errors'
        // No apiKey
      })

      const testError = new Error('No API key test')
      await service.logError(testError, 'No API Key Context')

      await vi.runAllTimersAsync()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/errors',
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String)
          })
        })
      )
    })
  })

  describe('flush errors', () => {
    beforeEach(() => {
      service = new ErrorLoggingService({
        enableRemoteLogging: true,
        endpoint: 'https://api.example.com/errors'
      })
    })

    it('should flush errors using sendBeacon when available', async () => {
      mockSendBeacon.mockReturnValue(true)

      const testError = new Error('Flush test')
      await service.logError(testError, 'Flush Context')

      // Manually trigger flush
      ;(service as any).flushErrors()

      expect(mockSendBeacon).toHaveBeenCalledWith(
        'https://api.example.com/errors',
        expect.stringContaining('"Flush Context"')
      )
    })

    it('should handle sendBeacon errors gracefully', async () => {
      mockSendBeacon.mockImplementation(() => {
        throw new Error('sendBeacon failed')
      })

      const testError = new Error('SendBeacon error test')
      await service.logError(testError, 'SendBeacon Context')

      expect(() => {
        ;(service as any).flushErrors()
      }).not.toThrow()
    })

    it('should not flush when no endpoint configured', async () => {
      service = new ErrorLoggingService({
        enableRemoteLogging: true
        // No endpoint
      })

      const testError = new Error('No endpoint flush test')
      await service.logError(testError, 'No Endpoint Context')

      ;(service as any).flushErrors()

      expect(mockSendBeacon).not.toHaveBeenCalled()
    })
  })

  describe('configuration methods', () => {
    beforeEach(() => {
      service = new ErrorLoggingService()
    })

    it('should update configuration', () => {
      const newConfig = {
        maxRetries: 10,
        retryDelay: 5000
      }

      service.updateConfig(newConfig)

      // Access private config for testing
      const config = (service as any).config
      expect(config.maxRetries).toBe(10)
      expect(config.retryDelay).toBe(5000)
    })

    it('should enable remote logging with endpoint and API key', () => {
      service.enableRemoteLogging('https://new.endpoint.com', 'new-api-key')

      const config = (service as any).config
      expect(config.enableRemoteLogging).toBe(true)
      expect(config.endpoint).toBe('https://new.endpoint.com')
      expect(config.apiKey).toBe('new-api-key')
    })

    it('should enable remote logging without API key', () => {
      service.enableRemoteLogging('https://no-auth.endpoint.com')

      const config = (service as any).config
      expect(config.enableRemoteLogging).toBe(true)
      expect(config.endpoint).toBe('https://no-auth.endpoint.com')
      expect(config.apiKey).toBeUndefined()
    })

    it('should disable remote logging', () => {
      service.disableRemoteLogging()

      const config = (service as any).config
      expect(config.enableRemoteLogging).toBe(false)
    })
  })

  describe('utility methods', () => {
    beforeEach(() => {
      service = new ErrorLoggingService({
        enableConsoleLogging: true,
        enableRemoteLogging: false
      })
    })

    it('should log network errors with additional context', async () => {
      const networkError = new Error('Network timeout')

      await service.logNetworkError(networkError, 'https://api.example.com/data', 'POST')

      expect(mockConsole.error).toHaveBeenCalledWith('Context:', 'Network Error')
      expect(mockConsole.error).toHaveBeenCalledWith('Additional Info:', {
        url: 'https://api.example.com/data',
        method: 'POST'
      })
    })

    it('should use default GET method for network errors', async () => {
      const networkError = new Error('Network error')

      await service.logNetworkError(networkError, 'https://api.example.com/data')

      expect(mockConsole.error).toHaveBeenCalledWith('Additional Info:', {
        url: 'https://api.example.com/data',
        method: 'GET'
      })
    })

    it('should log validation errors with sanitized form data', async () => {
      const validationError = new Error('Validation failed')
      const formData = {
        username: 'testuser',
        password: 'secret123',
        email: 'test@example.com',
        apiKey: 'super-secret-key'
      }

      await service.logValidationError(validationError, formData)

      expect(mockConsole.error).toHaveBeenCalledWith('Context:', 'Validation Error')
      expect(mockConsole.error).toHaveBeenCalledWith('Additional Info:', {
        formData: {
          username: 'testuser',
          password: '[REDACTED]',
          email: 'test@example.com',
          apiKey: '[REDACTED]'
        }
      })
    })

    it('should log API errors with endpoint and status code', async () => {
      const apiError = new Error('API request failed')

      await service.logApiError(apiError, '/api/users', 404)

      expect(mockConsole.error).toHaveBeenCalledWith('Context:', 'API Error')
      expect(mockConsole.error).toHaveBeenCalledWith('Additional Info:', {
        endpoint: '/api/users',
        statusCode: 404
      })
    })

    it('should log API errors without status code', async () => {
      const apiError = new Error('API request failed')

      await service.logApiError(apiError, '/api/users')

      expect(mockConsole.error).toHaveBeenCalledWith('Additional Info:', {
        endpoint: '/api/users',
        statusCode: undefined
      })
    })
  })

  describe('data sanitization', () => {
    beforeEach(() => {
      service = new ErrorLoggingService({
        enableConsoleLogging: true,
        enableRemoteLogging: false
      })
    })

    it('should sanitize sensitive fields in form data', async () => {
      const validationError = new Error('Validation failed')
      const sensitiveFormData = {
        username: 'testuser',
        password: 'secret123',
        confirmPassword: 'secret123',
        authToken: 'bearer-token',
        userSecret: 'user-secret',
        apiKey: 'api-key-value',
        publicInfo: 'not sensitive'
      }

      await service.logValidationError(validationError, sensitiveFormData)

      expect(mockConsole.error).toHaveBeenCalledWith('Additional Info:', {
        formData: {
          username: 'testuser',
          password: '[REDACTED]',
          confirmPassword: '[REDACTED]',
          authToken: '[REDACTED]',
          userSecret: '[REDACTED]',
          apiKey: '[REDACTED]',
          publicInfo: 'not sensitive'
        }
      })
    })

    it('should handle case-insensitive sensitive field matching', async () => {
      const validationError = new Error('Validation failed')
      const mixedCaseData = {
        UserPassword: 'secret',
        API_KEY: 'key',
        user_token: 'token',
        MySecret: 'secret'
      }

      await service.logValidationError(validationError, mixedCaseData)

      expect(mockConsole.error).toHaveBeenCalledWith('Additional Info:', {
        formData: {
          UserPassword: '[REDACTED]',
          API_KEY: '[REDACTED]',
          user_token: '[REDACTED]',
          MySecret: '[REDACTED]'
        }
      })
    })
  })

  describe('event handlers', () => {
    it('should set up visibility change handler', () => {
      service = new ErrorLoggingService()

      expect(document.addEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    })

    it('should set up beforeunload handler', () => {
      service = new ErrorLoggingService()

      expect(window.addEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    })
  })

  describe('default instance (errorLogger)', () => {
    it('should be properly configured based on environment', () => {
      expect(errorLogger).toBeInstanceOf(ErrorLoggingService)

      // Access private config to verify environment-based configuration
      const config = (errorLogger as any).config
      expect(config.enableConsoleLogging).toBe(true) // DEV is true
      expect(config.enableRemoteLogging).toBe(true) // VITE_ERROR_LOGGING_ENDPOINT is set
      expect(config.endpoint).toBe('https://api.example.com/errors')
      expect(config.apiKey).toBe('test-api-key')
    })
  })

  describe('edge cases', () => {
    beforeEach(() => {
      service = new ErrorLoggingService({
        enableConsoleLogging: true,
        enableRemoteLogging: false
      })
    })

    it('should handle null error objects', async () => {
      const nullError = null as any

      await expect(service.logError(nullError, 'Null Error')).rejects.toThrow()
    })

    it('should handle error objects without standard properties', async () => {
      const customError = {
        toString: () => 'Custom error object'
      } as any

      await expect(service.logError(customError, 'Custom Error')).rejects.toThrow()
    })

    it('should handle very large additional info objects', async () => {
      const testError = new Error('Large info test')
      const largeAdditionalInfo = {
        largeArray: new Array(1000).fill('large data item'),
        nestedObject: {
          level1: {
            level2: {
              level3: 'deep nested value'
            }
          }
        }
      }

      await expect(
        service.logError(testError, 'Large Info Context', largeAdditionalInfo)
      ).resolves.not.toThrow()
    })

    it('should handle queue processing when already processing', async () => {
      service = new ErrorLoggingService({
        enableRemoteLogging: true,
        endpoint: 'https://api.example.com/errors'
      })

      const testError = new Error('Concurrent processing test')

      // Log multiple errors quickly
      await Promise.all([
        service.logError(testError, 'Context 1'),
        service.logError(testError, 'Context 2'),
        service.logError(testError, 'Context 3')
      ])

      await vi.runAllTimersAsync()

      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })
})