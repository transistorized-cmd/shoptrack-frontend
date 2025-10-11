import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { categorizedDescribe, categorizedIt, TestCategory } from '../../../tests/utils/categories'
import { useCsrfToken, csrfManager } from '../useCsrfToken'
import { nextTick } from 'vue'

// Mock constants
vi.mock('@/constants/app', () => ({
  SECURITY: {
    CSRF_TOKEN_LENGTH: 32
  },
  TIMEOUT: {
    CSRF_BUFFER: 60000 // 1 minute buffer
  }
}))

categorizedDescribe('useCsrfToken', [TestCategory.COMPOSABLE, TestCategory.UNIT, TestCategory.FAST], () => {
  let mockFetch: any

  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()

    // Reset singleton state
    csrfManager.invalidateToken()

    // Reset the refresh promise by accessing private property
    // This is necessary because the singleton pattern keeps state between tests
    ;(csrfManager as any).refreshPromise = null

    // Mock fetch globally
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    sessionStorage.clear()
    csrfManager.invalidateToken()
    vi.restoreAllMocks()
  })

  categorizedDescribe('Token Fetching', [TestCategory.FAST, TestCategory.CRITICAL], () => {
    categorizedIt('should fetch CSRF token from backend', [TestCategory.CRITICAL], async () => {
      const mockToken = 'csrf-token-12345'
      const expiresAt = new Date(Date.now() + 3600000).toISOString() // 1 hour from now

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          token: mockToken,
          expiresAt,
          expiresIn: 3600
        })
      })

      const { getCsrfToken } = useCsrfToken()
      const token = await getCsrfToken()

      expect(token).toBe(mockToken)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/security/csrf-token'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include'
        })
      )
    })

    categorizedIt('should throw error when backend fetch fails', [TestCategory.CRITICAL], async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error'
      })

      const { getCsrfToken } = useCsrfToken()

      await expect(getCsrfToken()).rejects.toThrow('CSRF protection unavailable')
    })

    categorizedIt('should use stored token as fallback when backend unavailable', [TestCategory.CRITICAL], async () => {
      const storedToken = 'stored-csrf-token'
      const expiresAt = Date.now() + 3600000

      // Store a valid token first
      sessionStorage.setItem('csrf_token', JSON.stringify({
        token: storedToken,
        expires: expiresAt,
        isCompromised: false
      }))

      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { getCsrfToken } = useCsrfToken()
      const token = await getCsrfToken()

      expect(token).toBe(storedToken)
    })

    categorizedIt('should reject client-side generated tokens as fallback', [TestCategory.CRITICAL], async () => {
      // Store a client-side token (64 chars = 32 bytes * 2 for hex)
      const clientToken = 'a'.repeat(64)
      sessionStorage.setItem('csrf_token', JSON.stringify({
        token: clientToken,
        expires: Date.now() + 3600000
      }))

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { getCsrfToken } = useCsrfToken()

      await expect(getCsrfToken()).rejects.toThrow('CSRF protection unavailable')
    })
  })

  categorizedDescribe('Token State Management', [TestCategory.FAST, TestCategory.CRITICAL], () => {
    categorizedIt('should return sync token when available', [TestCategory.CRITICAL], async () => {
      const mockToken = 'csrf-token-sync'
      const expiresAt = new Date(Date.now() + 3600000).toISOString()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken, expiresAt, expiresIn: 3600 })
      })

      const { getCsrfToken, getCsrfTokenSync } = useCsrfToken()

      // First get async to populate
      await getCsrfToken()

      // Then get sync
      const syncToken = getCsrfTokenSync()
      expect(syncToken).toBe(mockToken)
    })

    categorizedIt('should return empty string from sync when token not loaded', [TestCategory.FAST], () => {
      const { getCsrfTokenSync } = useCsrfToken()
      const token = getCsrfTokenSync()

      expect(token).toBe('')
    })

    categorizedIt('should invalidate token', [TestCategory.CRITICAL], async () => {
      const mockToken = 'csrf-token-invalidate'
      const expiresAt = new Date(Date.now() + 3600000).toISOString()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken, expiresAt, expiresIn: 3600 })
      })

      const { getCsrfToken, invalidateCsrf, getCsrfTokenSync } = useCsrfToken()

      await getCsrfToken()
      expect(getCsrfTokenSync()).toBe(mockToken)

      invalidateCsrf()
      expect(getCsrfTokenSync()).toBe('')
      expect(sessionStorage.getItem('csrf_token')).toBeNull()
    })

    categorizedIt('should check if token is valid', [TestCategory.CRITICAL], async () => {
      const mockToken = 'csrf-token-valid'
      const expiresAt = new Date(Date.now() + 3600000).toISOString()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken, expiresAt, expiresIn: 3600 })
      })

      const { getCsrfToken, isTokenValid } = useCsrfToken()

      expect(isTokenValid()).toBe(false)

      await getCsrfToken()

      expect(isTokenValid()).toBe(true)
    })

    categorizedIt('should detect expired token as invalid', [TestCategory.CRITICAL], async () => {
      const mockToken = 'csrf-token-expired'
      const expiresAt = new Date(Date.now() - 1000).toISOString() // Already expired

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken, expiresAt, expiresIn: -1 })
      })

      const { getCsrfToken, isTokenValid } = useCsrfToken()

      await getCsrfToken()

      expect(isTokenValid()).toBe(false)
    })
  })

  categorizedDescribe('Token Expiry', [TestCategory.FAST], () => {
    categorizedIt('should return token expiry date', [TestCategory.CRITICAL], async () => {
      const mockToken = 'csrf-token-expiry'
      const expiryDate = new Date(Date.now() + 3600000)
      const expiresAt = expiryDate.toISOString()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken, expiresAt, expiresIn: 3600 })
      })

      const { getCsrfToken, getTokenExpiry } = useCsrfToken()

      expect(getTokenExpiry()).toBeNull()

      await getCsrfToken()

      const expiry = getTokenExpiry()
      expect(expiry).toBeInstanceOf(Date)
      expect(expiry?.getTime()).toBeCloseTo(expiryDate.getTime(), -2) // Within 100ms
    })

    categorizedIt('should return null expiry when no token', [TestCategory.FAST], () => {
      const { getTokenExpiry } = useCsrfToken()
      expect(getTokenExpiry()).toBeNull()
    })
  })

  categorizedDescribe('Token Validation', [TestCategory.FAST, TestCategory.INTEGRATION], () => {
    categorizedIt('should validate token with backend', [TestCategory.CRITICAL], async () => {
      const mockToken = 'csrf-token-validate'

      // First, get a token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: mockToken,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          expiresIn: 3600
        })
      })

      const { getCsrfToken, validateCsrfToken } = useCsrfToken()
      await getCsrfToken()

      // Then validate it
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isValid: true })
      })

      const isValid = await validateCsrfToken(mockToken)

      expect(isValid).toBe(true)
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/api/security/validate-csrf-token'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ token: mockToken })
        })
      )
    })

    categorizedIt('should refresh token during validation if provided by backend', [TestCategory.CRITICAL], async () => {
      const oldToken = 'old-csrf-token'
      const newToken = 'new-csrf-token'

      // Get initial token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: oldToken,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          expiresIn: 3600
        })
      })

      const { getCsrfToken, validateCsrfToken, getCsrfTokenSync } = useCsrfToken()
      await getCsrfToken()
      expect(getCsrfTokenSync()).toBe(oldToken)

      // Validate and get refreshed token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          isValid: true,
          refreshedToken: newToken,
          expiresAt: new Date(Date.now() + 7200000).toISOString()
        })
      })

      await validateCsrfToken()
      await nextTick()

      expect(getCsrfTokenSync()).toBe(newToken)
    })

    categorizedIt('should return false when validation fails', [TestCategory.CRITICAL], async () => {
      const mockToken = 'invalid-token'

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      })

      const { validateCsrfToken } = useCsrfToken()
      const isValid = await validateCsrfToken(mockToken)

      expect(isValid).toBe(false)
    })

    categorizedIt('should handle validation network error', [TestCategory.FAST], async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { validateCsrfToken } = useCsrfToken()
      const isValid = await validateCsrfToken('some-token')

      expect(isValid).toBe(false)
    })
  })

  categorizedDescribe('CSRF Protection Status', [TestCategory.FAST], () => {
    categorizedIt('should report CSRF protection available when token is valid', [TestCategory.CRITICAL], async () => {
      const mockToken = 'csrf-token-available'
      const expiresAt = new Date(Date.now() + 3600000).toISOString()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken, expiresAt, expiresIn: 3600 })
      })

      const { getCsrfToken, isCsrfProtectionAvailable } = useCsrfToken()

      expect(isCsrfProtectionAvailable()).toBe(false)

      await getCsrfToken()

      expect(isCsrfProtectionAvailable()).toBe(true)
    })

    categorizedIt('should report CSRF protection unavailable when compromised', [TestCategory.CRITICAL], async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { getCsrfToken, isCsrfProtectionAvailable } = useCsrfToken()

      try {
        await getCsrfToken()
      } catch (e) {
        // Expected to fail
      }

      expect(isCsrfProtectionAvailable()).toBe(false)
    })

    categorizedIt('should report CSRF protection unavailable when token expired', [TestCategory.FAST], async () => {
      const mockToken = 'csrf-token-expired'
      const expiresAt = new Date(Date.now() - 1000).toISOString()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken, expiresAt, expiresIn: -1 })
      })

      const { getCsrfToken, isCsrfProtectionAvailable } = useCsrfToken()

      await getCsrfToken()

      expect(isCsrfProtectionAvailable()).toBe(false)
    })
  })

  categorizedDescribe('Initialization', [TestCategory.FAST, TestCategory.INTEGRATION], () => {
    categorizedIt('should initialize CSRF token', [TestCategory.CRITICAL], async () => {
      const mockToken = 'csrf-token-init'
      const expiresAt = new Date(Date.now() + 3600000).toISOString()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken, expiresAt, expiresIn: 3600 })
      })

      const { initializeCsrf, getCsrfTokenSync } = useCsrfToken()

      await initializeCsrf()

      expect(getCsrfTokenSync()).toBe(mockToken)
    })

    categorizedIt('should restore token from storage on initialization', [TestCategory.CRITICAL], async () => {
      const storedToken = 'stored-csrf-token'
      const expiresAt = Date.now() + 3600000

      sessionStorage.setItem('csrf_token', JSON.stringify({
        token: storedToken,
        expires: expiresAt
      }))

      // Mock validation call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isValid: true })
      })

      const { initializeCsrf, getCsrfTokenSync } = useCsrfToken()

      await initializeCsrf()

      expect(getCsrfTokenSync()).toBe(storedToken)
    })

    categorizedIt('should fetch new token if stored token is invalid', [TestCategory.CRITICAL], async () => {
      const storedToken = 'invalid-stored-token'
      const newToken = 'new-csrf-token'

      sessionStorage.setItem('csrf_token', JSON.stringify({
        token: storedToken,
        expires: Date.now() + 3600000
      }))

      // Mock validation returns false
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isValid: false })
      })

      // Mock new token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: newToken,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          expiresIn: 3600
        })
      })

      const { initializeCsrf, getCsrfTokenSync } = useCsrfToken()

      await initializeCsrf()

      expect(getCsrfTokenSync()).toBe(newToken)
      expect(sessionStorage.getItem('csrf_token')).toContain(newToken)
    })
  })

  categorizedDescribe('Token Auto-Refresh', [TestCategory.FAST], () => {
    categorizedIt('should auto-refresh expired token when getCsrfToken called', [TestCategory.CRITICAL], async () => {
      const oldToken = 'old-expired-token'
      const newToken = 'new-refreshed-token'

      // First fetch - expires immediately
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: oldToken,
          expiresAt: new Date(Date.now() - 1000).toISOString(),
          expiresIn: -1
        })
      })

      const { getCsrfToken } = useCsrfToken()
      await getCsrfToken()

      // Second fetch - should refresh
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: newToken,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          expiresIn: 3600
        })
      })

      const refreshedToken = await getCsrfToken()

      expect(refreshedToken).toBe(newToken)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    categorizedIt('should not fetch twice when token is still valid', [TestCategory.CRITICAL], async () => {
      const mockToken = 'valid-token'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: mockToken,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          expiresIn: 3600
        })
      })

      const { getCsrfToken } = useCsrfToken()

      const token1 = await getCsrfToken()
      const token2 = await getCsrfToken()
      const token3 = await getCsrfToken()

      expect(token1).toBe(mockToken)
      expect(token2).toBe(mockToken)
      expect(token3).toBe(mockToken)
      expect(mockFetch).toHaveBeenCalledTimes(1) // Only one fetch
    })
  })

  categorizedDescribe('Edge Cases', [TestCategory.FAST], () => {
    categorizedIt('should handle concurrent token refresh requests', [TestCategory.CRITICAL], async () => {
      const mockToken = 'concurrent-token'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: mockToken,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          expiresIn: 3600
        })
      })

      const { getCsrfToken } = useCsrfToken()

      // Make multiple concurrent calls
      const [token1, token2, token3] = await Promise.all([
        getCsrfToken(),
        getCsrfToken(),
        getCsrfToken()
      ])

      expect(token1).toBe(mockToken)
      expect(token2).toBe(mockToken)
      expect(token3).toBe(mockToken)
      // Should only fetch once
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    categorizedIt('should handle malformed stored token', [TestCategory.FAST], async () => {
      sessionStorage.setItem('csrf_token', 'invalid-json')

      const mockToken = 'fresh-token'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: mockToken,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          expiresIn: 3600
        })
      })

      const { getCsrfToken } = useCsrfToken()
      const token = await getCsrfToken()

      expect(token).toBe(mockToken)
    })

    categorizedIt('should handle compromised token state', [TestCategory.CRITICAL], async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { getCsrfToken } = useCsrfToken()

      await expect(getCsrfToken()).rejects.toThrow('CSRF protection unavailable')

      // Second call should still throw (same message)
      await expect(getCsrfToken()).rejects.toThrow('CSRF protection unavailable')
    })
  })

  categorizedDescribe('Storage Persistence', [TestCategory.FAST], () => {
    categorizedIt('should persist token to sessionStorage', [TestCategory.CRITICAL], async () => {
      const mockToken = 'persist-token'
      const expiresAt = new Date(Date.now() + 3600000).toISOString()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken, expiresAt, expiresIn: 3600 })
      })

      const { getCsrfToken } = useCsrfToken()
      await getCsrfToken()

      const stored = sessionStorage.getItem('csrf_token')
      expect(stored).toBeTruthy()

      const parsed = JSON.parse(stored!)
      expect(parsed.token).toBe(mockToken)
      expect(parsed.expires).toBeGreaterThan(Date.now())
    })

    categorizedIt('should clear token from storage on invalidate', [TestCategory.CRITICAL], async () => {
      const mockToken = 'clear-token'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: mockToken,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          expiresIn: 3600
        })
      })

      const { getCsrfToken, invalidateCsrf } = useCsrfToken()

      await getCsrfToken()
      expect(sessionStorage.getItem('csrf_token')).toBeTruthy()

      invalidateCsrf()
      expect(sessionStorage.getItem('csrf_token')).toBeNull()
    })
  })
})
