// Application-wide constants to replace magic numbers

// File size constants (in bytes)
export const FILE_SIZE = {
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,

  // Default max file sizes
  DEFAULT_MAX_SIZE_MB: 10,
  DEFAULT_MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  PLUGIN_DEFAULT_MAX_SIZE_KB: 10240, // 10MB in KB

  // Plugin specific limits
  GENERIC_RECEIPT_MAX_SIZE_MB: 2,
  AMAZON_ORDERS_MAX_SIZE_MB: 10,
} as const;

// Time constants (in milliseconds)
export const TIMEOUT = {
  // API timeouts - already defined in api.ts but adding for reference
  FAST: 5000, // 5 seconds for quick operations
  DEFAULT: 15000, // 15 seconds for most operations
  CLAUDE_UPLOAD: 180000, // 3 minutes for Claude AI processing
  STANDARD_UPLOAD: 30000, // 30 seconds for regular uploads

  // CSRF token buffer
  CSRF_BUFFER: 5000, // 5 seconds buffer before expiry

  // UI timeouts
  NOTIFICATION_DEFAULT: 30000, // 30 seconds for notifications
  ERROR_DISPLAY: 10000, // 10 seconds for error messages
  DEBOUNCE_SEARCH: 500, // 500ms for search debouncing
  DEBOUNCE_AUTOCOMPLETE: 150, // 150ms for autocomplete
} as const;

// Security constants
export const SECURITY = {
  CSRF_TOKEN_LENGTH: 32, // 32 bytes for CSRF token
  MIN_CSRF_TOKEN_LENGTH: 16, // Minimum 16 characters for CSRF validation
  HEX_PADDING: 2, // Padding for hex conversion
} as const;

// UI constants
export const UI = {
  MAX_DROPDOWN_HEIGHT: 32, // Max height for dropdown menus (in rem equivalent)
  AUTOCOMPLETE_Z_INDEX: 20, // Z-index for autocomplete dropdowns
  ERROR_DISPLAY_HEIGHT: 32, // Max height for error display
  ICON_SIZE_DEFAULT: 16, // Default icon size
  ICON_SIZE_LARGE: 24, // Large icon size
} as const;

// Port constants
export const PORTS = {
  DEFAULT_API_PORT: 5000, // Default API port for development
} as const;
