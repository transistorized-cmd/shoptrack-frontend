import axios from "axios";
import { csrfManager } from "@/composables/useCsrfToken";

// Timeout configurations for different operation types - reduced to under 10s
export const TIMEOUT_CONFIG = Object.freeze({
  DEFAULT: 8000, // 8 seconds for most operations (reduced from 15s)
  FAST: 5000, // 5 seconds for quick operations (unchanged)
  CLAUDE_UPLOAD: 8000, // 8 seconds for Claude AI receipt processing (reduced from 3 minutes)
  STANDARD_UPLOAD: 8000, // 8 seconds for regular file uploads (reduced from 30s)
} as const);

// Helper function to build API base URL from environment variables
export const getApiBaseUrl = (): string => {
  // In development, use relative URLs to go through Vite proxy
  if (import.meta.env.MODE === 'development') {
    return '/api';
  }

  // Use full URL if provided
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // For production deployment, detect if we're on platform.shoptrack.app
  if (typeof window !== 'undefined' && window.location.hostname === 'platform.shoptrack.app') {
    return 'https://api.shoptrack.app/api';
  }

  // Build URL from components for production
  const protocol = import.meta.env.VITE_API_PROTOCOL || "https";
  const host = import.meta.env.VITE_API_HOST || "api.shoptrack.app";
  const port = import.meta.env.VITE_API_PORT;

  // Only include port if it's specified and not standard (80/443)
  if (port && port !== "80" && port !== "443") {
    return `${protocol}://${host}:${port}/api`;
  } else {
    return `${protocol}://${host}/api`;
  }
};

// Helper function to get timeout for different operation types
export const getTimeoutForOperation = (operationType: string): number => {
  switch (operationType) {
    case 'fast':
      return TIMEOUT_CONFIG.FAST;
    case 'claude-upload':
      return TIMEOUT_CONFIG.CLAUDE_UPLOAD;
    case 'standard-upload':
      return TIMEOUT_CONFIG.STANDARD_UPLOAD;
    case 'default':
    default:
      return TIMEOUT_CONFIG.DEFAULT;
  }
};

// Create base API instance with reasonable default timeout
const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: TIMEOUT_CONFIG.DEFAULT, // 15 seconds default
  withCredentials: true, // Send cookies with all requests for authentication
});

// Request interceptor - Add CSRF token to all requests
api.interceptors.request.use(
  async (config) => {
    try {
      // Get current CSRF token
      const token = await csrfManager.getToken();

      // Add CSRF token to headers
      if (token) {
        config.headers["X-CSRF-TOKEN"] = token;

        // Also add to request body for form submissions if needed
        if (
          config.method?.toLowerCase() === "post" &&
          config.data instanceof FormData
        ) {
          config.data.append("_token", token);
        }
      }

      // Add common security headers
      config.headers["X-Requested-With"] = "XMLHttpRequest";
    } catch (error) {
      console.error("Failed to attach CSRF token to request:", error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - but be selective about when to logout
      const url = error.config?.url || "";

      // Don't log errors for expected auth-checking endpoints
      const isExpectedAuthCheck =
        url.includes("/auth/login") || // Login attempts
        url.includes("/auth/register") || // Registration attempts
        url.includes("/auth/refresh-token") || // Token refresh attempts (updated endpoint)
        url.includes("/auth/me") || // Auth status checks (updated endpoint)
        url.includes("/auth/verify") || // Email verification
        url.includes("/auth/passkey") || // Passkey operations
        url.includes("/passkey") || // Passkey operations (direct endpoint)
        url.includes("/auth/oauth") || // OAuth operations
        url.includes("/auth/forgot-password") || // Password reset
        url.includes("/auth/reset-password") || // Password reset
        url.includes("/categories"); // Categories endpoint calls before auth

      if (!isExpectedAuthCheck) {
        console.error("API Error:", error);
        console.warn("Unauthorized request detected");
      }

      const shouldTriggerLogout = !isExpectedAuthCheck &&
        error.config?.headers?.["X-Skip-Auth-Logout"] !== "true"; // Allow manual override

      if (shouldTriggerLogout) {
        // Import auth store dynamically to avoid circular dependencies
        import("@/stores/auth")
          .then(({ useAuthStore }) => {
            const authStore = useAuthStore();
            if (authStore.isAuthenticated) {
              // User was authenticated but got 401 on a protected resource, trigger logout
              console.warn("Session expired - logging out user");
              authStore.logout();
            }
          })
          .catch((err) => {
            console.error("Failed to handle auth store logout:", err);
          });
      }
    } else {
      // Log all non-401 errors
      console.error("API Error:", error);
    }

    if (error.response?.status === 403) {
      // CSRF token invalid/mismatch
      console.warn("CSRF token invalid detected, invalidating token");
      csrfManager.invalidateToken();

      // Try to refresh token and retry the request once
      if (!error.config._retried) {
        error.config._retried = true;
        try {
          await csrfManager.initialize();
          const newToken = await csrfManager.getToken();
          error.config.headers["X-CSRF-TOKEN"] = newToken;

          if (error.config.data instanceof FormData) {
            error.config.data.delete("_token");
            error.config.data.append("_token", newToken);
          }

          return api.request(error.config);
        } catch (retryError) {
          console.error(
            "Failed to retry request with new CSRF token:",
            retryError,
          );
        }
      }
    } else if (error.response?.status === 419) {
      // CSRF token expired
      console.warn("CSRF token expired detected, invalidating token");
      csrfManager.invalidateToken();

      // Try to refresh token and retry the request once
      if (!error.config._retried) {
        error.config._retried = true;
        try {
          await csrfManager.initialize();
          const newToken = await csrfManager.getToken();
          error.config.headers["X-CSRF-TOKEN"] = newToken;

          if (error.config.data instanceof FormData) {
            error.config.data.delete("_token");
            error.config.data.append("_token", newToken);
          }

          return api.request(error.config);
        } catch (retryError) {
          console.error(
            "Failed to retry request with new CSRF token:",
            retryError,
          );
        }
      }
    } else if (error.response?.status === 500) {
      // Handle server error
      console.error("Server error occurred");
    }

    return Promise.reject(error);
  },
);

// Export base URL for use in other components (like image URLs)
// (Already exported above)

// Specialized API methods with appropriate timeouts
export const apiWithTimeout = {
  // Fast operations - 5 seconds (metadata, lists, quick validations)
  fast: {
    get: (url: string, config = {}) =>
      api.get(url, { ...config, timeout: TIMEOUT_CONFIG.FAST }),
    post: (url: string, data?: any, config = {}) =>
      api.post(url, data, { ...config, timeout: TIMEOUT_CONFIG.FAST }),
    put: (url: string, data?: any, config = {}) =>
      api.put(url, data, { ...config, timeout: TIMEOUT_CONFIG.FAST }),
    delete: (url: string, config = {}) =>
      api.delete(url, { ...config, timeout: TIMEOUT_CONFIG.FAST }),
    patch: (url: string, data?: any, config = {}) =>
      api.patch(url, data, { ...config, timeout: TIMEOUT_CONFIG.FAST }),
  },

  // Claude AI receipt processing - 3 minutes (ONLY for Claude AI)
  claudeUpload: {
    post: (url: string, data: FormData, config: any = {}) =>
      api.post(url, data, {
        ...config,
        timeout: TIMEOUT_CONFIG.CLAUDE_UPLOAD,
        headers: {
          "Content-Type": "multipart/form-data",
          ...config.headers,
        },
        onUploadProgress: config.onUploadProgress,
      }),
  },

  // Standard file uploads - 30 seconds (non-AI processing)
  standardUpload: {
    post: (url: string, data: FormData, config: any = {}) =>
      api.post(url, data, {
        ...config,
        timeout: TIMEOUT_CONFIG.STANDARD_UPLOAD,
        headers: {
          "Content-Type": "multipart/form-data",
          ...config.headers,
        },
        onUploadProgress: config.onUploadProgress,
      }),
  },

  // Default operations - 15 seconds (standard CRUD)
  default: {
    get: (url: string, config = {}) =>
      api.get(url, { ...config, timeout: TIMEOUT_CONFIG.DEFAULT }),
    post: (url: string, data?: any, config = {}) =>
      api.post(url, data, { ...config, timeout: TIMEOUT_CONFIG.DEFAULT }),
    put: (url: string, data?: any, config = {}) =>
      api.put(url, data, { ...config, timeout: TIMEOUT_CONFIG.DEFAULT }),
    delete: (url: string, config = {}) =>
      api.delete(url, { ...config, timeout: TIMEOUT_CONFIG.DEFAULT }),
    patch: (url: string, data?: any, config = {}) =>
      api.patch(url, data, { ...config, timeout: TIMEOUT_CONFIG.DEFAULT }),
  },
};

// Create a request with custom timeout
export const createRequestWithTimeout = (timeout: number) => {
  return {
    get: (url: string, config = {}) => api.get(url, { ...config, timeout }),
    post: (url: string, data?: any, config = {}) =>
      api.post(url, data, { ...config, timeout }),
    put: (url: string, data?: any, config = {}) =>
      api.put(url, data, { ...config, timeout }),
    delete: (url: string, config = {}) =>
      api.delete(url, { ...config, timeout }),
    patch: (url: string, data?: any, config = {}) =>
      api.patch(url, data, { ...config, timeout }),
  };
};

// Helper to determine appropriate timeout based on operation
// (Already exported above with different signature)

// Helper to create API requests that skip automatic logout on 401
export const createRequestWithoutAutoLogout = (baseRequest: any) => {
  return (url: string, dataOrConfig?: any, config?: any) => {
    const skipLogoutHeaders = { "X-Skip-Auth-Logout": "true" };

    // Handle GET/DELETE methods (url, config)
    if (config === undefined) {
      // Check if dataOrConfig looks like axios config (has headers/timeout/etc) or is undefined/null
      const isConfig = !dataOrConfig ||
                      (typeof dataOrConfig === 'object' &&
                       !Array.isArray(dataOrConfig) &&
                       (dataOrConfig.headers !== undefined ||
                        dataOrConfig.timeout !== undefined ||
                        dataOrConfig.params !== undefined ||
                        Object.keys(dataOrConfig).some(key => ['headers', 'timeout', 'params', 'responseType', 'maxRedirects'].includes(key))));

      if (isConfig) {
        // GET/DELETE: (url, config)
        const mergedConfig = {
          ...dataOrConfig,
          headers: {
            ...dataOrConfig?.headers,
            ...skipLogoutHeaders,
          },
        };
        return baseRequest(url, mergedConfig);
      } else {
        // POST/PUT/PATCH with just data: (url, data)
        const configWithHeaders = {
          headers: skipLogoutHeaders,
        };
        return baseRequest(url, dataOrConfig, configWithHeaders);
      }
    } else {
      // POST/PUT/PATCH: (url, data, config)
      const mergedConfig = {
        ...config,
        headers: {
          ...config?.headers,
          ...skipLogoutHeaders,
        },
      };
      return baseRequest(url, dataOrConfig, mergedConfig);
    }
  };
};

// API methods that skip automatic logout for testing auth status
export const apiWithoutAutoLogout = {
  get: createRequestWithoutAutoLogout(api.get.bind(api)),
  post: createRequestWithoutAutoLogout(api.post.bind(api)),
  put: createRequestWithoutAutoLogout(api.put.bind(api)),
  delete: createRequestWithoutAutoLogout(api.delete.bind(api)),
  patch: createRequestWithoutAutoLogout(api.patch.bind(api)),
};

export default api;
