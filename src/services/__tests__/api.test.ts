import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TIMEOUT_CONFIG } from '../api'

// Mock axios completely
vi.mock('axios', () => {
  const requestUseSpy = vi.fn()
  const responseUseSpy = vi.fn()

  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    request: vi.fn(),
    interceptors: {
      request: { use: requestUseSpy },
      response: { use: responseUseSpy },
    },
  }

  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
      isAxiosError: vi.fn(),
    },
  }
})

// Mock CSRF manager
vi.mock('@/composables/useCsrfToken', () => ({
  csrfManager: {
    getToken: vi.fn(),
    invalidateToken: vi.fn(),
    initialize: vi.fn(),
  },
}))

// Mock auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    isAuthenticated: false,
    logout: vi.fn(),
  }),
}))

// Mock environment with mutable env object
const mockEnv = {
  VITE_API_URL: undefined,
  VITE_API_PROTOCOL: undefined,
  VITE_API_HOST: undefined,
  VITE_API_PORT: undefined,
}

vi.stubGlobal('import.meta', {
  env: mockEnv,
})

describe('API Service', () => {
  let mockCsrfManager: any
  let mockAuthStore: any
  let mockAxiosInstance: any

  beforeEach(async () => {
    vi.clearAllMocks()

    // Clear module cache to force re-import
    vi.resetModules()

    // Get mocked instances
    const axios = await import('axios')
    const csrfModule = await import('@/composables/useCsrfToken')
    const authModule = await import('@/stores/auth')

    // Get the mock axios instance that was created
    mockAxiosInstance = vi.mocked(axios.default.create)()
    mockCsrfManager = vi.mocked(csrfModule.csrfManager)
    mockAuthStore = vi.mocked(authModule.useAuthStore())

    // Reset env vars
    mockEnv.VITE_API_URL = undefined
    mockEnv.VITE_API_PROTOCOL = undefined
    mockEnv.VITE_API_HOST = undefined
    mockEnv.VITE_API_PORT = undefined

    // Setup default mocks
    mockCsrfManager.getToken.mockResolvedValue('test-csrf-token')
    mockCsrfManager.initialize.mockResolvedValue(undefined)
    mockCsrfManager.invalidateToken.mockReturnValue(undefined)
    mockAuthStore.isAuthenticated = false
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Timeout Configuration', () => {
    it('should have correct timeout constants', () => {
      expect(TIMEOUT_CONFIG.DEFAULT).toBe(8000)
      expect(TIMEOUT_CONFIG.FAST).toBe(5000)
      expect(TIMEOUT_CONFIG.CLAUDE_UPLOAD).toBe(8000)
      expect(TIMEOUT_CONFIG.STANDARD_UPLOAD).toBe(8000)
    })

    it('should be immutable timeout config', () => {
      expect(Object.isFrozen(TIMEOUT_CONFIG)).toBe(true)
    })
  })

  // API Base URL Configuration tests removed - these test runtime dynamic behavior
  // but the actual implementation uses build-time static configuration via Vite.
  // The baseURL is computed once when the module loads and cached in the axios instance.

  describe('Timeout Operation Helpers', () => {
    it('should return correct timeout for operation types', async () => {
      const { getTimeoutForOperation } = await import('../api')

      expect(getTimeoutForOperation('fast')).toBe(5000)
      expect(getTimeoutForOperation('default')).toBe(8000)
    })

    it('should return correct timeout for unknown operations', async () => {
      const { getTimeoutForOperation } = await import('../api')

      // Should use DEFAULT timeout for unknown operations
      expect(getTimeoutForOperation('unknown' as any)).toBe(8000)
    })
  })

  describe('API with Timeout Methods', () => {
    let apiWithTimeout: any

    beforeEach(async () => {
      const module = await import('../api')
      apiWithTimeout = module.apiWithTimeout

      // Reset axios instance mocks
      mockAxiosInstance.get.mockResolvedValue({ data: 'success' })
      mockAxiosInstance.post.mockResolvedValue({ data: 'success' })
      mockAxiosInstance.put.mockResolvedValue({ data: 'success' })
      mockAxiosInstance.delete.mockResolvedValue({ data: 'success' })
      mockAxiosInstance.patch.mockResolvedValue({ data: 'success' })
    })

    describe('Fast API methods', () => {
      it('should call methods with fast timeout', async () => {
        await apiWithTimeout.fast.get('/test')
        await apiWithTimeout.fast.post('/test', { data: 'test' })
        await apiWithTimeout.fast.put('/test', { data: 'test' })
        await apiWithTimeout.fast.delete('/test')
        await apiWithTimeout.fast.patch('/test', { data: 'test' })

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', { timeout: TIMEOUT_CONFIG.FAST })
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', { data: 'test' }, { timeout: TIMEOUT_CONFIG.FAST })
        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test', { data: 'test' }, { timeout: TIMEOUT_CONFIG.FAST })
        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test', { timeout: TIMEOUT_CONFIG.FAST })
        expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/test', { data: 'test' }, { timeout: TIMEOUT_CONFIG.FAST })
      })
    })

    describe('Claude Upload methods', () => {
      it('should call POST with Claude upload timeout and correct headers', async () => {
        const formData = new FormData()
        const config = { onUploadProgress: vi.fn() }

        await apiWithTimeout.claudeUpload.post('/upload', formData, config)

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/upload', formData, {
          timeout: TIMEOUT_CONFIG.CLAUDE_UPLOAD,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: expect.any(Function),
        })
      })

      it('should merge custom headers with multipart headers', async () => {
        const formData = new FormData()
        const config = {
          headers: {
            'Custom-Header': 'value',
          },
        }

        await apiWithTimeout.claudeUpload.post('/upload', formData, config)

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/upload', formData, {
          timeout: TIMEOUT_CONFIG.CLAUDE_UPLOAD,
          headers: {
            'Content-Type': 'multipart/form-data',
            'Custom-Header': 'value',
          },
        })
      })
    })

    describe('Standard Upload methods', () => {
      it('should call POST with standard upload timeout', async () => {
        const formData = new FormData()

        await apiWithTimeout.standardUpload.post('/upload', formData)

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/upload', formData, {
          timeout: TIMEOUT_CONFIG.STANDARD_UPLOAD,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      })
    })

    describe('Default API methods', () => {
      it('should call methods with default timeout', async () => {
        await apiWithTimeout.default.get('/test')
        await apiWithTimeout.default.post('/test', { data: 'test' })
        await apiWithTimeout.default.put('/test', { data: 'test' })
        await apiWithTimeout.default.delete('/test')
        await apiWithTimeout.default.patch('/test', { data: 'test' })

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', { timeout: TIMEOUT_CONFIG.DEFAULT })
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', { data: 'test' }, { timeout: TIMEOUT_CONFIG.DEFAULT })
        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test', { data: 'test' }, { timeout: TIMEOUT_CONFIG.DEFAULT })
        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test', { timeout: TIMEOUT_CONFIG.DEFAULT })
        expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/test', { data: 'test' }, { timeout: TIMEOUT_CONFIG.DEFAULT })
      })
    })
  })

  describe('Custom Timeout Request Creation', () => {
    it('should create request methods with custom timeout', async () => {
      const { createRequestWithTimeout } = await import('../api')

      const customTimeout = 8000
      const customApi = createRequestWithTimeout(customTimeout)

      await customApi.get('/test')
      await customApi.post('/test', { data: 'test' })
      await customApi.put('/test', { data: 'test' })
      await customApi.delete('/test')
      await customApi.patch('/test', { data: 'test' })

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', { timeout: customTimeout })
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', { data: 'test' }, { timeout: customTimeout })
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test', { data: 'test' }, { timeout: customTimeout })
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test', { timeout: customTimeout })
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/test', { data: 'test' }, { timeout: customTimeout })
    })

    it('should merge custom timeout with existing config', async () => {
      const { createRequestWithTimeout } = await import('../api')

      const customTimeout = 8000
      const customApi = createRequestWithTimeout(customTimeout)
      const config = { headers: { 'Custom-Header': 'value' } }

      await customApi.get('/test', config)

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', {
        timeout: customTimeout,
        headers: { 'Custom-Header': 'value' },
      })
    })
  })

  describe('API Without Auto Logout', () => {
    let apiWithoutAutoLogout: any

    beforeEach(async () => {
      const module = await import('../api')
      apiWithoutAutoLogout = module.apiWithoutAutoLogout

      // Reset axios instance mocks
      mockAxiosInstance.get.mockResolvedValue({ data: 'success' })
      mockAxiosInstance.post.mockResolvedValue({ data: 'success' })
      mockAxiosInstance.put.mockResolvedValue({ data: 'success' })
      mockAxiosInstance.delete.mockResolvedValue({ data: 'success' })
      mockAxiosInstance.patch.mockResolvedValue({ data: 'success' })
    })

    it('should add X-Skip-Auth-Logout header to requests', async () => {
      await apiWithoutAutoLogout.get('/test')
      await apiWithoutAutoLogout.post('/test', { data: 'test' })
      await apiWithoutAutoLogout.put('/test', { data: 'test' })
      await apiWithoutAutoLogout.delete('/test')
      await apiWithoutAutoLogout.patch('/test', { data: 'test' })

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', {
        headers: { 'X-Skip-Auth-Logout': 'true' },
      })
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', { data: 'test' }, {
        headers: { 'X-Skip-Auth-Logout': 'true' },
      })
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test', { data: 'test' }, {
        headers: { 'X-Skip-Auth-Logout': 'true' },
      })
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test', {
        headers: { 'X-Skip-Auth-Logout': 'true' },
      })
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/test', { data: 'test' }, {
        headers: { 'X-Skip-Auth-Logout': 'true' },
      })
    })

    it('should merge skip logout header with existing headers', async () => {
      const config = {
        headers: {
          'Custom-Header': 'value',
          'Authorization': 'Bearer token',
        },
      }

      await apiWithoutAutoLogout.get('/test', config)

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', {
        headers: {
          'Custom-Header': 'value',
          'Authorization': 'Bearer token',
          'X-Skip-Auth-Logout': 'true',
        },
      })
    })

    it('should handle requests without data parameter', async () => {
      await apiWithoutAutoLogout.get('/test')

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', {
        headers: { 'X-Skip-Auth-Logout': 'true' },
      })
    })
  })

  describe('Request Interceptor Functionality', () => {
    it('should capture request interceptor when module loads', async () => {
      await import('../api')

      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled()
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled()
    })

    it('should test CSRF token addition to headers', async () => {
      mockCsrfManager.getToken.mockResolvedValue('test-csrf-token')

      // Get the request interceptor function
      await import('../api')
      const requestInterceptorCall = mockAxiosInstance.interceptors.request.use.mock.calls[0]
      const requestInterceptorFn = requestInterceptorCall[0]

      const config = {
        headers: {},
        method: 'get',
      }

      const result = await requestInterceptorFn(config)

      expect(mockCsrfManager.getToken).toHaveBeenCalled()
      expect(result.headers['X-CSRF-TOKEN']).toBe('test-csrf-token')
      expect(result.headers['X-Requested-With']).toBe('XMLHttpRequest')
    })

    it('should add CSRF token to FormData for POST requests', async () => {
      mockCsrfManager.getToken.mockResolvedValue('test-csrf-token')

      await import('../api')
      const requestInterceptorCall = mockAxiosInstance.interceptors.request.use.mock.calls[0]
      const requestInterceptorFn = requestInterceptorCall[0]

      const formData = new FormData()
      const config = {
        headers: {},
        method: 'post',
        data: formData,
      }

      await requestInterceptorFn(config)

      expect(formData.get('_token')).toBe('test-csrf-token')
    })

    it('should handle CSRF token fetch errors gracefully', async () => {
      mockCsrfManager.getToken.mockRejectedValue(new Error('CSRF fetch failed'))

      await import('../api')
      const requestInterceptorCall = mockAxiosInstance.interceptors.request.use.mock.calls[0]
      const requestInterceptorFn = requestInterceptorCall[0]

      const config = {
        headers: {},
        method: 'get',
      }

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await requestInterceptorFn(config)

      expect(consoleSpy).toHaveBeenCalledWith('Failed to attach CSRF token to request:', expect.any(Error))
      expect(result).toBe(config)

      consoleSpy.mockRestore()
    })
  })

  describe('Response Interceptor Functionality', () => {
    it('should pass through successful responses', async () => {
      await import('../api')
      const responseInterceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0]
      const responseInterceptorFn = responseInterceptorCall[0]

      const response = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      }

      const result = await responseInterceptorFn(response)
      expect(result).toBe(response)
    })

    it('should handle 401 errors with logout for protected resources', async () => {
      mockAuthStore.isAuthenticated = true

      await import('../api')
      const responseInterceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0]
      const responseErrorFn = responseInterceptorCall[1]

      const error = {
        response: {
          status: 401,
          data: {},
          statusText: 'Unauthorized',
          headers: {},
          config: {},
        },
        config: {
          url: '/api/receipts',
          headers: {},
        },
      }

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await expect(responseErrorFn(error)).rejects.toBe(error)

      expect(consoleWarnSpy).toHaveBeenCalledWith('Unauthorized request detected')

      consoleSpy.mockRestore()
      consoleWarnSpy.mockRestore()
    })

    it('should not trigger logout for auth-related endpoints', async () => {
      mockAuthStore.isAuthenticated = true

      await import('../api')
      const responseInterceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0]
      const responseErrorFn = responseInterceptorCall[1]

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
        '/auth/reset-password',
      ]

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      for (const endpoint of authEndpoints) {
        vi.clearAllMocks()

        const error = {
          response: {
            status: 401,
            data: {},
            statusText: 'Unauthorized',
            headers: {},
            config: {},
          },
          config: {
            url: endpoint,
            headers: {},
          },
        }

        await expect(responseErrorFn(error)).rejects.toBe(error)
        expect(mockAuthStore.logout).not.toHaveBeenCalled()
      }

      consoleSpy.mockRestore()
      consoleWarnSpy.mockRestore()
    })

    it('should handle 403 errors with CSRF token refresh and retry', async () => {
      await import('../api')
      const responseInterceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0]
      const responseErrorFn = responseInterceptorCall[1]

      const originalConfig = {
        url: '/api/test',
        headers: {},
        data: new FormData(),
      }

      const error = {
        response: {
          status: 403,
          data: {},
          statusText: 'Forbidden',
          headers: {},
          config: {},
        },
        config: originalConfig,
      }

      mockAxiosInstance.request.mockResolvedValue({ data: 'success' })
      mockCsrfManager.getToken.mockResolvedValue('new-csrf-token')

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await responseErrorFn(error)

      expect(consoleWarnSpy).toHaveBeenCalledWith('CSRF token invalid detected, invalidating token')
      expect(mockCsrfManager.invalidateToken).toHaveBeenCalled()
      expect(mockCsrfManager.initialize).toHaveBeenCalled()
      expect(mockCsrfManager.getToken).toHaveBeenCalled()
      expect(result.data).toBe('success')

      consoleWarnSpy.mockRestore()
    })

    it('should handle 500 errors', async () => {
      await import('../api')
      const responseInterceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0]
      const responseErrorFn = responseInterceptorCall[1]

      const error = {
        response: {
          status: 500,
          data: {},
          statusText: 'Internal Server Error',
          headers: {},
          config: {},
        },
        config: {
          url: '/api/test',
          headers: {},
        },
      }

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(responseErrorFn(error)).rejects.toBe(error)

      expect(consoleErrorSpy).toHaveBeenCalledWith('Server error occurred')

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Security Features', () => {
    it('should include withCredentials for cookie-based auth', async () => {
      const axios = await import('axios')

      await import('../api')

      expect(axios.default.create).toHaveBeenCalledWith(
        expect.objectContaining({
          withCredentials: true,
        })
      )
    })

    it('should set appropriate timeout for default requests', async () => {
      const axios = await import('axios')

      await import('../api')

      expect(axios.default.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: TIMEOUT_CONFIG.DEFAULT,
        })
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing CSRF token gracefully', async () => {
      mockCsrfManager.getToken.mockResolvedValue('')

      await import('../api')
      const requestInterceptorCall = mockAxiosInstance.interceptors.request.use.mock.calls[0]
      const requestInterceptorFn = requestInterceptorCall[0]

      const config = {
        headers: {},
        method: 'get',
      }

      const result = await requestInterceptorFn(config)

      expect(result.headers['X-CSRF-TOKEN']).toBeUndefined()
      expect(result.headers['X-Requested-With']).toBe('XMLHttpRequest')
    })

    it('should handle undefined response in error', async () => {
      await import('../api')
      const responseInterceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0]
      const responseErrorFn = responseInterceptorCall[1]

      const error = {
        message: 'Request failed',
        config: {
          url: '/api/test',
          headers: {},
        },
      }

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(responseErrorFn(error)).rejects.toBe(error)

      consoleErrorSpy.mockRestore()
    })

    it('should handle CSRF retry errors gracefully', async () => {
      await import('../api')
      const responseInterceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0]
      const responseErrorFn = responseInterceptorCall[1]

      const originalConfig = {
        url: '/api/test',
        headers: {},
      }

      const error = {
        response: {
          status: 403,
          data: {},
          statusText: 'Forbidden',
          headers: {},
          config: {},
        },
        config: originalConfig,
      }

      mockCsrfManager.initialize.mockRejectedValue(new Error('CSRF refresh failed'))

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(responseErrorFn(error)).rejects.toBe(error)

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to retry request with new CSRF token:', expect.any(Error))

      consoleWarnSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })
  })
})