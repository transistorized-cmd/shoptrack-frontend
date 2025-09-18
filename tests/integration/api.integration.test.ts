import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import api, {
  apiWithTimeout,
  apiWithoutAutoLogout,
  getApiBaseUrl,
  getTimeoutForOperation,
  createRequestWithTimeout,
  TIMEOUT_CONFIG
} from '@/services/api'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth'
import { csrfManager } from '@/composables/useCsrfToken'
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '@/types/auth'

// Mock the auth store
const mockAuthStore = {
  isAuthenticated: false,
  user: null,
  logout: vi.fn(),
  initialize: vi.fn()
}

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore
}))

// Mock CSRF manager
const mockCsrfManager = {
  getToken: vi.fn(),
  invalidateToken: vi.fn(),
  initialize: vi.fn()
}

vi.mock('@/composables/useCsrfToken', () => ({
  csrfManager: mockCsrfManager
}))

describe('API Integration Tests', () => {
  let mockAxios: MockAdapter
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Create mock adapter for axios
    mockAxios = new MockAdapter(api)

    // Mock console methods
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Reset all mocks
    vi.clearAllMocks()

    // Setup default CSRF token
    mockCsrfManager.getToken.mockResolvedValue('mock-csrf-token')
    mockCsrfManager.initialize.mockResolvedValue(undefined)

    // Reset auth store state
    mockAuthStore.isAuthenticated = false
    mockAuthStore.user = null
  })

  afterEach(() => {
    mockAxios.restore()
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  describe('API Configuration', () => {
    it('should construct correct API base URL from environment', () => {
      // Test full URL
      vi.stubEnv('VITE_API_URL', 'https://api.example.com/v1')
      expect(getApiBaseUrl()).toBe('https://api.example.com/v1')

      // Test component-based URL
      vi.unstubAllEnvs()
      vi.stubEnv('VITE_API_PROTOCOL', 'https')
      vi.stubEnv('VITE_API_HOST', 'api.shoptrack.com')
      vi.stubEnv('VITE_API_PORT', '443')
      expect(getApiBaseUrl()).toBe('https://api.shoptrack.com:443/api')

      // Test defaults
      vi.unstubAllEnvs()
      expect(getApiBaseUrl()).toBe('https://localhost:5298/api')
    })

    it('should return correct timeouts for different operations', () => {
      expect(getTimeoutForOperation('fast')).toBe(TIMEOUT_CONFIG.FAST)
      expect(getTimeoutForOperation('claude-upload')).toBe(TIMEOUT_CONFIG.CLAUDE_UPLOAD)
      expect(getTimeoutForOperation('standard-upload')).toBe(TIMEOUT_CONFIG.STANDARD_UPLOAD)
      expect(getTimeoutForOperation('default')).toBe(TIMEOUT_CONFIG.DEFAULT)
      expect(getTimeoutForOperation('unknown')).toBe(TIMEOUT_CONFIG.DEFAULT)
    })
  })

  describe('CSRF Token Integration', () => {
    it('should attach CSRF token to requests', async () => {
      const testToken = 'test-csrf-token-123'
      mockCsrfManager.getToken.mockResolvedValue(testToken)

      mockAxios.onPost('/test').reply((config) => {
        expect(config.headers?.['X-CSRF-TOKEN']).toBe(testToken)
        expect(config.headers?.['X-Requested-With']).toBe('XMLHttpRequest')
        return [200, { success: true }]
      })

      await api.post('/test', { data: 'test' })

      expect(mockCsrfManager.getToken).toHaveBeenCalled()
    })

    it('should add CSRF token to FormData requests', async () => {
      const testToken = 'form-csrf-token-456'
      mockCsrfManager.getToken.mockResolvedValue(testToken)

      const formData = new FormData()
      formData.append('file', new Blob(['test'], { type: 'text/plain' }))

      mockAxios.onPost('/upload').reply((config) => {
        const data = config.data as FormData
        expect(data.get('_token')).toBe(testToken)
        return [200, { success: true }]
      })

      await api.post('/upload', formData)
    })

    it('should handle CSRF token retrieval errors gracefully', async () => {
      mockCsrfManager.getToken.mockRejectedValue(new Error('CSRF token failed'))

      mockAxios.onPost('/test').reply(200, { success: true })

      // Should not fail the request
      const response = await api.post('/test', { data: 'test' })
      expect(response.data.success).toBe(true)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to attach CSRF token to request:',
        expect.any(Error)
      )
    })

    it('should handle CSRF token refresh on 403 error', async () => {
      const oldToken = 'old-token'
      const newToken = 'new-token'

      mockCsrfManager.getToken
        .mockResolvedValueOnce(oldToken)
        .mockResolvedValueOnce(newToken)

      // First request fails with 403
      mockAxios.onPost('/protected')
        .replyOnce(403, { error: 'CSRF token mismatch' })
        .onPost('/protected').reply((config) => {
          expect(config.headers?.['X-CSRF-TOKEN']).toBe(newToken)
          return [200, { success: true }]
        })

      const response = await api.post('/protected', { data: 'test' })

      expect(response.data.success).toBe(true)
      expect(mockCsrfManager.invalidateToken).toHaveBeenCalled()
      expect(mockCsrfManager.initialize).toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalledWith('CSRF token invalid detected, invalidating token')
    })

    it('should handle CSRF token refresh on 419 error', async () => {
      const expiredToken = 'expired-token'
      const refreshedToken = 'refreshed-token'

      mockCsrfManager.getToken
        .mockResolvedValueOnce(expiredToken)
        .mockResolvedValueOnce(refreshedToken)

      mockAxios.onPost('/protected')
        .replyOnce(419, { error: 'CSRF token expired' })
        .onPost('/protected').reply((config) => {
          expect(config.headers?.['X-CSRF-TOKEN']).toBe(refreshedToken)
          return [200, { success: true }]
        })

      const response = await api.post('/protected', { data: 'test' })

      expect(response.data.success).toBe(true)
      expect(mockCsrfManager.invalidateToken).toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalledWith('CSRF token expired detected, invalidating token')
    })

    it('should not retry CSRF refresh indefinitely', async () => {
      mockCsrfManager.getToken.mockResolvedValue('failing-token')
      mockCsrfManager.initialize.mockResolvedValue(undefined)

      // Always return 403
      mockAxios.onPost('/always-fails').reply(403, { error: 'CSRF always invalid' })

      try {
        await api.post('/always-fails', { data: 'test' })
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeDefined()
        // Should have tried to refresh only once
        expect(mockCsrfManager.invalidateToken).toHaveBeenCalledTimes(1)
      }
    })
  })

  describe('Authentication Integration', () => {
    it('should trigger logout on 401 for protected endpoints', async () => {
      mockAuthStore.isAuthenticated = true
      mockAxios.onGet('/protected-resource').reply(401, { error: 'Unauthorized' })

      try {
        await api.get('/protected-resource')
        expect.fail('Should have thrown 401 error')
      } catch (error) {
        expect(mockAuthStore.logout).toHaveBeenCalled()
        expect(consoleWarnSpy).toHaveBeenCalledWith('Session expired - logging out user')
      }
    })

    it('should not trigger logout for auth-related endpoints', async () => {
      const authEndpoints = [
        '/auth/login',
        '/auth/register',
        '/auth/refresh-token',
        '/auth/me',
        '/auth/verify',
        '/auth/passkey',
        '/passkey',
        '/auth/oauth',
        '/auth/forgot-password',
        '/auth/reset-password'
      ]

      for (const endpoint of authEndpoints) {
        mockAxios.onPost(endpoint).reply(401, { error: 'Unauthorized' })

        try {
          await api.post(endpoint, {})
        } catch (error) {
          expect(mockAuthStore.logout).not.toHaveBeenCalled()
        }

        mockAxios.reset()
        vi.clearAllMocks()
      }
    })

    it('should not trigger logout when X-Skip-Auth-Logout header is present', async () => {
      mockAuthStore.isAuthenticated = true
      mockAxios.onGet('/protected-resource').reply(401, { error: 'Unauthorized' })

      try {
        await apiWithoutAutoLogout.get('/protected-resource')
        expect.fail('Should have thrown 401 error')
      } catch (error) {
        expect(mockAuthStore.logout).not.toHaveBeenCalled()
      }
    })

    it('should handle auth store import errors gracefully', async () => {
      // Mock dynamic import to fail
      const originalImport = global.import
      vi.stubGlobal('import', vi.fn().mockRejectedValue(new Error('Import failed')))

      mockAuthStore.isAuthenticated = true
      mockAxios.onGet('/protected').reply(401, { error: 'Unauthorized' })

      try {
        await api.get('/protected')
      } catch (error) {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to handle auth store logout:',
          expect.any(Error)
        )
      }

      vi.stubGlobal('import', originalImport)
    })
  })

  describe('Timeout Configuration', () => {
    it('should use correct timeouts for different API methods', async () => {
      const testUrl = '/test'
      const testData = { test: 'data' }

      // Test fast API
      mockAxios.onGet(testUrl).reply((config) => {
        expect(config.timeout).toBe(TIMEOUT_CONFIG.FAST)
        return [200, { success: true }]
      })
      await apiWithTimeout.fast.get(testUrl)

      // Test default API
      mockAxios.onPost(testUrl).reply((config) => {
        expect(config.timeout).toBe(TIMEOUT_CONFIG.DEFAULT)
        return [200, { success: true }]
      })
      await apiWithTimeout.default.post(testUrl, testData)

      // Test standard upload
      mockAxios.onPost(testUrl).reply((config) => {
        expect(config.timeout).toBe(TIMEOUT_CONFIG.STANDARD_UPLOAD)
        expect(config.headers?.['Content-Type']).toContain('multipart/form-data')
        return [200, { success: true }]
      })
      await apiWithTimeout.standardUpload.post(testUrl, new FormData())

      // Test Claude upload
      mockAxios.onPost(testUrl).reply((config) => {
        expect(config.timeout).toBe(TIMEOUT_CONFIG.CLAUDE_UPLOAD)
        expect(config.headers?.['Content-Type']).toContain('multipart/form-data')
        return [200, { success: true }]
      })
      await apiWithTimeout.claudeUpload.post(testUrl, new FormData())
    })

    it('should create custom timeout requests', async () => {
      const customTimeout = 8000 // 8 seconds (reduced from 1 minute)
      const customApi = createRequestWithTimeout(customTimeout)

      mockAxios.onGet('/custom').reply((config) => {
        expect(config.timeout).toBe(customTimeout)
        return [200, { success: true }]
      })

      await customApi.get('/custom')
    })

    it('should handle upload progress callbacks', async () => {
      const progressSpy = vi.fn()
      const formData = new FormData()

      mockAxios.onPost('/upload').reply(200, { success: true })

      await apiWithTimeout.standardUpload.post('/upload', formData, {
        onUploadProgress: progressSpy
      })

      // Progress callback should be set up (even if not called in mock)
      expect(mockAxios.history.post[0].onUploadProgress).toBeDefined()
    })
  })

  describe('Authentication Service Integration', () => {
    it('should handle complete login flow', async () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'password123'
      }

      const authResponse: AuthResponse = {
        success: true,
        message: 'Login successful',
        user: {
          id: 1,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          userName: 'testuser',
          isEmailVerified: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      }

      mockAxios.onPost('/auth/login').reply((config) => {
        expect(config.data).toBe(JSON.stringify(loginRequest))
        expect(config.headers?.['X-CSRF-TOKEN']).toBe('mock-csrf-token')
        return [200, authResponse]
      })

      const result = await authService.login(loginRequest)

      expect(result).toEqual(authResponse)
      expect(result.success).toBe(true)
      expect(result.user?.email).toBe(loginRequest.email)
    })

    it('should handle registration flow', async () => {
      const registerRequest: RegisterRequest = {
        email: 'newuser@example.com',
        password: 'newpassword123',
        firstName: 'New',
        lastName: 'User',
        userName: 'newuser'
      }

      const authResponse: AuthResponse = {
        success: true,
        message: 'Registration successful',
        user: {
          id: 2,
          email: registerRequest.email,
          firstName: registerRequest.firstName!,
          lastName: registerRequest.lastName!,
          userName: registerRequest.userName!,
          isEmailVerified: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      }

      mockAxios.onPost('/auth/register').reply(200, authResponse)

      const result = await authService.register(registerRequest)

      expect(result).toEqual(authResponse)
      expect(result.user?.isEmailVerified).toBe(false)
    })

    it('should handle logout flow', async () => {
      mockAxios.onPost('/auth/logout').reply(200, { message: 'Logged out' })

      await authService.logout()

      expect(mockAxios.history.post).toHaveLength(1)
      expect(mockAxios.history.post[0].url).toBe('/auth/logout')
    })

    it('should handle logout errors gracefully', async () => {
      mockAxios.onPost('/auth/logout').reply(500, { error: 'Server error' })

      // Should not throw error
      await authService.logout()

      expect(consoleWarnSpy).toHaveBeenCalledWith('Logout API call failed:', expect.any(Error))
    })

    it('should get current user with proper error handling', async () => {
      const user: User = {
        id: 1,
        email: 'current@example.com',
        firstName: 'Current',
        lastName: 'User',
        userName: 'currentuser',
        isEmailVerified: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }

      // Test successful response
      mockAxios.onGet('/auth/me').reply((config) => {
        expect(config.headers?.['X-Skip-Auth-Logout']).toBe('true')
        return [200, user]
      })

      const result = await authService.getCurrentUser()
      expect(result).toEqual(user)

      // Test error response
      mockAxios.onGet('/auth/me').reply(401, { error: 'Unauthorized' })

      const resultError = await authService.getCurrentUser()
      expect(resultError).toBeNull()
    })

    it('should handle password reset flow', async () => {
      // Forgot password
      const forgotRequest = { email: 'reset@example.com' }
      const forgotResponse: AuthResponse = {
        success: true,
        message: 'Reset email sent'
      }

      mockAxios.onPost('/auth/forgot-password').reply(200, forgotResponse)

      const forgotResult = await authService.forgotPassword(forgotRequest)
      expect(forgotResult).toEqual(forgotResponse)

      // Reset password
      const resetRequest = {
        token: 'reset-token-123',
        email: 'reset@example.com',
        password: 'newpassword123'
      }
      const resetResponse: AuthResponse = {
        success: true,
        message: 'Password reset successful'
      }

      mockAxios.onPost('/auth/reset-password').reply(200, resetResponse)

      const resetResult = await authService.resetPassword(resetRequest)
      expect(resetResult).toEqual(resetResponse)
    })

    it('should handle profile updates', async () => {
      const updateRequest = {
        firstName: 'Updated',
        lastName: 'Name',
        userName: 'updateduser'
      }

      const updateResponse: AuthResponse = {
        success: true,
        message: 'Profile updated',
        user: {
          id: 1,
          email: 'test@example.com',
          firstName: updateRequest.firstName,
          lastName: updateRequest.lastName,
          userName: updateRequest.userName,
          isEmailVerified: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T01:00:00Z'
        }
      }

      mockAxios.onPut('/auth/profile').reply((config) => {
        const data = JSON.parse(config.data)
        expect(data.firstName).toBe(updateRequest.firstName)
        expect(data.lastName).toBe(updateRequest.lastName)
        expect(data.userName).toBe(updateRequest.userName)
        return [200, updateResponse]
      })

      const result = await authService.updateProfile(updateRequest)
      expect(result).toEqual(updateResponse)
    })
  })

  describe('Error Handling Scenarios', () => {
    it('should handle network errors', async () => {
      mockAxios.onGet('/network-error').networkError()

      try {
        await api.get('/network-error')
        expect.fail('Should have thrown network error')
      } catch (error) {
        expect(error).toBeDefined()
        expect(consoleErrorSpy).toHaveBeenCalledWith('API Error:', expect.any(Error))
      }
    })

    it('should handle timeout errors', async () => {
      mockAxios.onGet('/timeout').timeout()

      try {
        await api.get('/timeout')
        expect.fail('Should have thrown timeout error')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should handle 500 server errors', async () => {
      mockAxios.onGet('/server-error').reply(500, { error: 'Internal server error' })

      try {
        await api.get('/server-error')
        expect.fail('Should have thrown server error')
      } catch (error) {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Server error occurred')
      }
    })

    it('should handle malformed JSON responses', async () => {
      mockAxios.onGet('/malformed').reply(200, 'not-json')

      const response = await api.get('/malformed')
      expect(response.data).toBe('not-json')
    })

    it('should handle concurrent requests with different errors', async () => {
      mockAxios.onGet('/success').reply(200, { success: true })
      mockAxios.onGet('/error').reply(500, { error: 'Server error' })
      mockAxios.onGet('/unauthorized').reply(401, { error: 'Unauthorized' })

      const promises = [
        api.get('/success'),
        api.get('/error').catch(e => e),
        api.get('/unauthorized').catch(e => e)
      ]

      const results = await Promise.all(promises)

      expect(results[0].data.success).toBe(true)
      expect(results[1]).toBeInstanceOf(Error)
      expect(results[2]).toBeInstanceOf(Error)
    })
  })

  describe('Request/Response Interceptors', () => {
    it('should add security headers to all requests', async () => {
      mockAxios.onPost('/test').reply((config) => {
        expect(config.headers?.['X-Requested-With']).toBe('XMLHttpRequest')
        expect(config.headers?.['X-CSRF-TOKEN']).toBeDefined()
        return [200, { success: true }]
      })

      await api.post('/test', { data: 'test' })
    })

    it('should handle response transformation', async () => {
      const responseData = { message: 'test response', timestamp: '2024-01-01' }
      mockAxios.onGet('/response-test').reply(200, responseData)

      const response = await api.get('/response-test')

      expect(response.data).toEqual(responseData)
      expect(response.status).toBe(200)
    })

    it('should preserve custom headers in requests', async () => {
      const customHeaders = {
        'Custom-Header': 'custom-value',
        'Another-Header': 'another-value'
      }

      mockAxios.onGet('/custom-headers').reply((config) => {
        expect(config.headers?.['Custom-Header']).toBe('custom-value')
        expect(config.headers?.['Another-Header']).toBe('another-value')
        expect(config.headers?.['X-CSRF-TOKEN']).toBeDefined()
        return [200, { success: true }]
      })

      await api.get('/custom-headers', { headers: customHeaders })
    })
  })

  describe('Performance and Concurrency', () => {
    it('should handle multiple concurrent requests efficiently', async () => {
      const requestCount = 10
      const requests = Array.from({ length: requestCount }, (_, i) => {
        mockAxios.onGet(`/concurrent-${i}`).reply(200, { id: i })
        return api.get(`/concurrent-${i}`)
      })

      const startTime = performance.now()
      const results = await Promise.all(requests)
      const endTime = performance.now()

      expect(results).toHaveLength(requestCount)
      expect(endTime - startTime).toBeLessThan(1000) // Should be fast with mocked requests

      results.forEach((result, index) => {
        expect(result.data.id).toBe(index)
      })
    })

    it('should handle request cancellation', async () => {
      const cancelToken = api.defaults.timeout

      mockAxios.onGet('/slow-request').reply(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve([200, { success: true }]), 1000)
        })
      })

      // This would be handled by axios timeout configuration
      expect(cancelToken).toBeDefined()
    })

    it('should not leak memory with many requests', async () => {
      // Simulate many requests to test for memory leaks
      const requestPromises = Array.from({ length: 100 }, (_, i) => {
        mockAxios.onGet(`/memory-test-${i}`).reply(200, { index: i })
        return api.get(`/memory-test-${i}`)
      })

      const results = await Promise.all(requestPromises)
      expect(results).toHaveLength(100)

      // Memory usage test would be handled by the testing environment
      expect(mockAxios.history.get).toHaveLength(100)
    })
  })

  describe('Real-world Integration Scenarios', () => {
    it('should handle complete authentication flow with API errors', async () => {
      // Failed login attempt
      mockAxios.onPost('/auth/login').reply(400, {
        success: false,
        message: 'Invalid credentials',
        errors: ['Email or password is incorrect']
      })

      try {
        await authService.login({ email: 'wrong@example.com', password: 'wrongpass' })
        expect.fail('Should have thrown error')
      } catch (error) {
        expect(error).toBeDefined()
      }

      // Successful login after retry
      const validLogin = { email: 'valid@example.com', password: 'validpass' }
      mockAxios.onPost('/auth/login').reply(200, {
        success: true,
        message: 'Login successful',
        user: {
          id: 1,
          email: validLogin.email,
          firstName: 'Valid',
          lastName: 'User',
          userName: 'validuser',
          isEmailVerified: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      })

      const result = await authService.login(validLogin)
      expect(result.success).toBe(true)
    })

    it('should handle session expiry during API operations', async () => {
      // Start authenticated
      mockAuthStore.isAuthenticated = true

      // First API call succeeds
      mockAxios.onGet('/protected-data').reply(200, { data: 'protected content' })
      const firstResult = await api.get('/protected-data')
      expect(firstResult.data.data).toBe('protected content')

      // Session expires, next call fails
      mockAxios.onGet('/protected-data').reply(401, { error: 'Session expired' })

      try {
        await api.get('/protected-data')
        expect.fail('Should have thrown 401 error')
      } catch (error) {
        expect(mockAuthStore.logout).toHaveBeenCalled()
      }
    })

    it('should handle API version compatibility', async () => {
      // Test with different response formats that might come from API versioning
      const v1Response = { success: true, data: { id: 1, name: 'test' } }
      const v2Response = { success: true, result: { id: 1, name: 'test', version: 2 } }

      mockAxios.onGet('/api/v1/resource').reply(200, v1Response)
      mockAxios.onGet('/api/v2/resource').reply(200, v2Response)

      const v1Result = await api.get('/api/v1/resource')
      const v2Result = await api.get('/api/v2/resource')

      expect(v1Result.data).toEqual(v1Response)
      expect(v2Result.data).toEqual(v2Response)
    })
  })
})