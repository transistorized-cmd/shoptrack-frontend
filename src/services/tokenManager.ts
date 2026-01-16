/**
 * Token Manager for cross-origin authentication
 *
 * This manages access tokens returned from login for scenarios where
 * HTTP-only cookies cannot be shared (e.g., public suffix domains like fly.dev)
 *
 * Security notes:
 * - Access tokens are short-lived (15 minutes)
 * - Stored in sessionStorage (cleared on tab close)
 * - Used as fallback when cookies aren't available
 */

const ACCESS_TOKEN_KEY = 'shoptrack_access_token';
const REFRESH_TOKEN_KEY = 'shoptrack_refresh_token';
const TOKEN_EXPIRY_KEY = 'shoptrack_token_expiry';

export const tokenManager = {
  /**
   * Store tokens after successful login
   */
  setTokens(accessToken: string, refreshToken: string, expiresAt: Date | string) {
    if (accessToken) {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    }
    if (refreshToken) {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    if (expiresAt) {
      const expiry = typeof expiresAt === 'string' ? expiresAt : expiresAt.toISOString();
      sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiry);
    }
  },

  /**
   * Get the current access token
   */
  getAccessToken(): string | null {
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);

    // Check if token is expired
    if (expiry) {
      const expiryDate = new Date(expiry);
      if (expiryDate <= new Date()) {
        console.debug('[TokenManager] Access token expired, clearing');
        this.clearTokens();
        return null;
      }
    }

    return token;
  },

  /**
   * Get the current refresh token
   */
  getRefreshToken(): string | null {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Check if we have a valid access token
   */
  hasValidToken(): boolean {
    return this.getAccessToken() !== null;
  },

  /**
   * Clear all stored tokens (on logout)
   */
  clearTokens() {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
  },
};

export default tokenManager;
