import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useCsrfToken, csrfManager } from '@/composables/useCsrfToken';

// Mock app constants
vi.mock('@/constants/app', () => ({
  SECURITY: {
    CSRF_TOKEN_LENGTH: 32,
  },
  TIMEOUT: {
    CSRF_BUFFER: 30000, // 30 seconds
  },
}));

// Mock environment variables
const mockEnv = {
  VITE_API_URL: '',
  VITE_API_PROTOCOL: 'https',
  VITE_API_HOST: 'localhost',
  VITE_API_PORT: '5298',
};

Object.defineProperty(import.meta, 'env', {
  value: mockEnv,
  writable: true,
});

describe('useCsrfToken Composable', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let consoleDebugSpy: ReturnType<typeof vi.fn>;
  let consoleInfoSpy: ReturnType<typeof vi.fn>;
  let consoleWarnSpy: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.fn>;

  const mockTokenResponse = {
    token: 'mock-csrf-token-12345',
    expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    expiresIn: 3600,
  };

  const mockValidationResponse = {
    isValid: true,
    refreshedToken: null,
    expiresAt: null,
  };

  beforeEach(() => {
    // Reset environment
    mockEnv.VITE_API_URL = '';
    mockEnv.VITE_API_PROTOCOL = 'https';
    mockEnv.VITE_API_HOST = 'localhost';
    mockEnv.VITE_API_PORT = '5298';

    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock console methods
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Clear sessionStorage
    sessionStorage.clear();

    // Reset the singleton instance by clearing its state
    (csrfManager as any).tokenState.value = null;
    (csrfManager as any).refreshPromise = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  describe('Initialization', () => {
    it('should initialize CSRF token from backend', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const { initializeCsrf, tokenState } = useCsrfToken();

      await initializeCsrf();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://localhost:5298/api/security/csrf-token',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      );

      expect(tokenState.value?.token).toBe(mockTokenResponse.token);
      expect(consoleInfoSpy).toHaveBeenCalledWith('CSRF token fetched from backend successfully');
    });

    it('should restore token from sessionStorage if valid', async () => {
      const storedToken = {
        token: 'stored-token',
        expires: Date.now() + 3600000, // 1 hour from now
      };

      sessionStorage.setItem('csrf_token', JSON.stringify(storedToken));

      const { initializeCsrf, tokenState } = useCsrfToken();

      await initializeCsrf();

      expect(tokenState.value?.token).toBe(storedToken.token);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(consoleDebugSpy).toHaveBeenCalledWith('CSRF token restored from storage');
    });

    it('should fetch new token if stored token expires soon', async () => {
      const storedToken = {
        token: 'expired-token',
        expires: Date.now() + 30000, // 30 seconds from now (less than 1 minute)
      };

      sessionStorage.setItem('csrf_token', JSON.stringify(storedToken));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const { initializeCsrf } = useCsrfToken();

      await initializeCsrf();

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Token Fetching', () => {
    it('should get CSRF token successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const { getCsrfToken } = useCsrfToken();

      const token = await getCsrfToken();

      expect(token).toBe(mockTokenResponse.token);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://localhost:5298/api/security/csrf-token',
        expect.any(Object)
      );
    });

    it('should return existing valid token without fetching', async () => {
      // First fetch to set up token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const { getCsrfToken } = useCsrfToken();

      await getCsrfToken(); // First call
      mockFetch.mockClear();

      const token = await getCsrfToken(); // Second call

      expect(token).toBe(mockTokenResponse.token);
      expect(mockFetch).not.toHaveBeenCalled(); // Should not fetch again
    });

    it('should get token synchronously when available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const { getCsrfToken, getCsrfTokenSync } = useCsrfToken();

      // First load the token
      await getCsrfToken();

      // Then get it synchronously
      const token = getCsrfTokenSync();

      expect(token).toBe(mockTokenResponse.token);
    });

    it('should return empty string for sync token when not loaded', () => {
      const { getCsrfTokenSync } = useCsrfToken();

      const token = getCsrfTokenSync();

      expect(token).toBe('');
    });
  });

  describe('API URL Building', () => {
    it('should use VITE_API_URL when provided', async () => {
      mockEnv.VITE_API_URL = 'https://api.example.com/v1';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const { getCsrfToken } = useCsrfToken();

      await getCsrfToken();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/security/csrf-token',
        expect.any(Object)
      );
    });

    it('should build URL from components when VITE_API_URL not provided', async () => {
      mockEnv.VITE_API_PROTOCOL = 'http';
      mockEnv.VITE_API_HOST = 'api.test.com';
      mockEnv.VITE_API_PORT = '8080';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const { getCsrfToken } = useCsrfToken();

      await getCsrfToken();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://api.test.com:8080/api/security/csrf-token',
        expect.any(Object)
      );
    });

    it('should use default values for missing environment variables', async () => {
      mockEnv.VITE_API_PROTOCOL = '';
      mockEnv.VITE_API_HOST = '';
      mockEnv.VITE_API_PORT = '';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const { getCsrfToken } = useCsrfToken();

      await getCsrfToken();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://localhost:5298/api/security/csrf-token',
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle backend fetch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const { getCsrfToken } = useCsrfToken();

      await expect(getCsrfToken()).rejects.toThrow('CSRF protection unavailable');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch CSRF token from backend:',
        expect.any(Error)
      );
    });

    it('should fallback to stored server token on backend failure', async () => {
      const storedToken = {
        token: 'server-token', // Short token indicates server-generated
        expires: Date.now() + 3600000,
      };

      sessionStorage.setItem('csrf_token', JSON.stringify(storedToken));

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { getCsrfToken } = useCsrfToken();

      const token = await getCsrfToken();

      expect(token).toBe(storedToken.token);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Using stored server-generated CSRF token as fallback'
      );
    });

    it('should not use client-side tokens as fallback', async () => {
      const clientSideToken = {
        token: 'a'.repeat(64), // Long token indicates client-side generated
        expires: Date.now() + 3600000,
      };

      sessionStorage.setItem('csrf_token', JSON.stringify(clientSideToken));

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { getCsrfToken } = useCsrfToken();

      await expect(getCsrfToken()).rejects.toThrow('CSRF protection unavailable');
    });

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const { getCsrfToken } = useCsrfToken();

      await expect(getCsrfToken()).rejects.toThrow('CSRF protection unavailable');
    });

    it('should throw error for compromised token state', async () => {
      // Manually set compromised state
      (csrfManager as any).tokenState.value = {
        token: '',
        expires: 0,
        isCompromised: true,
      };

      const { getCsrfToken } = useCsrfToken();

      await expect(getCsrfToken()).rejects.toThrow(
        'CSRF protection is compromised - cannot proceed with request'
      );
    });
  });

  describe('Token Validation', () => {
    beforeEach(() => {
      // Set up a valid token first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });
    });

    it('should validate token with backend', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockValidationResponse),
        });

      const { getCsrfToken, validateCsrfToken } = useCsrfToken();

      await getCsrfToken(); // Load token
      const isValid = await validateCsrfToken();

      expect(isValid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://localhost:5298/api/security/validate-csrf-token',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ token: mockTokenResponse.token }),
        })
      );
    });

    it('should validate specific token when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockValidationResponse),
      });

      const { validateCsrfToken } = useCsrfToken();

      const customToken = 'custom-token-123';
      const isValid = await validateCsrfToken(customToken);

      expect(isValid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ token: customToken }),
        })
      );
    });

    it('should handle refreshed token from validation', async () => {
      const refreshedTokenResponse = {
        isValid: true,
        refreshedToken: 'new-refreshed-token',
        expiresAt: new Date(Date.now() + 7200000).toISOString(), // 2 hours
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(refreshedTokenResponse),
        });

      const { getCsrfToken, validateCsrfToken, tokenState } = useCsrfToken();

      await getCsrfToken();
      await validateCsrfToken();

      expect(tokenState.value?.token).toBe(refreshedTokenResponse.refreshedToken);
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'CSRF token refreshed by validation endpoint'
      );
    });

    it('should return false for validation errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
        });

      const { getCsrfToken, validateCsrfToken } = useCsrfToken();

      await getCsrfToken();
      const isValid = await validateCsrfToken();

      expect(isValid).toBe(false);
    });

    it('should handle validation network errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      const { getCsrfToken, validateCsrfToken } = useCsrfToken();

      await getCsrfToken();
      const isValid = await validateCsrfToken();

      expect(isValid).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to validate CSRF token:',
        expect.any(Error)
      );
    });
  });

  describe('Token State Management', () => {
    it('should check if token is valid based on expiry', async () => {
      const futureExpiry = Date.now() + 3600000; // 1 hour from now
      (csrfManager as any).tokenState.value = {
        token: 'test-token',
        expires: futureExpiry,
      };

      const { isTokenValid } = useCsrfToken();

      expect(isTokenValid()).toBe(true);
    });

    it('should detect expired tokens', () => {
      const pastExpiry = Date.now() - 3600000; // 1 hour ago
      (csrfManager as any).tokenState.value = {
        token: 'expired-token',
        expires: pastExpiry,
      };

      const { isTokenValid } = useCsrfToken();

      expect(isTokenValid()).toBe(false);
    });

    it('should get token expiry date', () => {
      const expiryTime = Date.now() + 3600000;
      (csrfManager as any).tokenState.value = {
        token: 'test-token',
        expires: expiryTime,
      };

      const { getTokenExpiry } = useCsrfToken();

      const expiry = getTokenExpiry();
      expect(expiry).toBeInstanceOf(Date);
      expect(expiry?.getTime()).toBe(expiryTime);
    });

    it('should return null for expiry when no token', () => {
      const { getTokenExpiry } = useCsrfToken();

      const expiry = getTokenExpiry();
      expect(expiry).toBeNull();
    });

    it('should invalidate token and clear storage', () => {
      sessionStorage.setItem('csrf_token', JSON.stringify({ token: 'test' }));
      (csrfManager as any).tokenState.value = { token: 'test', expires: Date.now() + 3600000 };

      const { invalidateCsrf, tokenState } = useCsrfToken();

      invalidateCsrf();

      expect(tokenState.value).toBeNull();
      expect(sessionStorage.getItem('csrf_token')).toBeNull();
    });
  });

  describe('CSRF Protection Status', () => {
    it('should report protection available when token is valid', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const { getCsrfToken, isCsrfProtectionAvailable } = useCsrfToken();

      await getCsrfToken();

      expect(isCsrfProtectionAvailable()).toBe(true);
    });

    it('should report protection unavailable when token is compromised', () => {
      (csrfManager as any).tokenState.value = {
        token: '',
        expires: 0,
        isCompromised: true,
      };

      const { isCsrfProtectionAvailable } = useCsrfToken();

      expect(isCsrfProtectionAvailable()).toBe(false);
    });

    it('should report protection unavailable when no token', () => {
      const { isCsrfProtectionAvailable } = useCsrfToken();

      expect(isCsrfProtectionAvailable()).toBe(false);
    });
  });

  describe('Concurrent Token Fetching', () => {
    it('should handle concurrent token requests correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const { getCsrfToken } = useCsrfToken();

      // Make multiple concurrent requests
      const promises = [
        getCsrfToken(),
        getCsrfToken(),
        getCsrfToken(),
      ];

      const tokens = await Promise.all(promises);

      // All should return the same token
      expect(tokens.every(token => token === mockTokenResponse.token)).toBe(true);

      // Only one fetch should have been made
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('SessionStorage Error Handling', () => {
    it('should handle sessionStorage errors gracefully', async () => {
      // Mock sessionStorage to throw errors
      const originalGetItem = sessionStorage.getItem;
      const originalSetItem = sessionStorage.setItem;

      sessionStorage.getItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });

      sessionStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const { initializeCsrf } = useCsrfToken();

      // Should not throw, but should warn about storage errors
      await expect(initializeCsrf()).resolves.not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to restore CSRF token from storage:',
        expect.any(Error)
      );

      // Restore original methods
      sessionStorage.getItem = originalGetItem;
      sessionStorage.setItem = originalSetItem;
    });

    it('should handle malformed JSON in storage', async () => {
      sessionStorage.setItem('csrf_token', 'invalid-json{');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const { initializeCsrf } = useCsrfToken();

      await initializeCsrf();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to restore CSRF token from storage:',
        expect.any(Error)
      );

      // Should fetch new token instead
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Reactive State', () => {
    it('should provide reactive token state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const { getCsrfToken, tokenState } = useCsrfToken();

      expect(tokenState.value).toBeNull();

      await getCsrfToken();

      expect(tokenState.value?.token).toBe(mockTokenResponse.token);
      expect(tokenState.value?.expires).toBeTypeOf('number');
    });

    it('should make token state readonly', () => {
      const { tokenState } = useCsrfToken();

      // Attempting to modify should not be allowed (TypeScript would catch this)
      expect(() => {
        // @ts-ignore - Intentionally testing readonly behavior
        tokenState.value = { token: 'modified', expires: Date.now() };
      }).not.toThrow(); // Vue's readonly is runtime, not compiletime
    });
  });
});