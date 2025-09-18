/**
 * Route Parameter Security Validation Utility
 * Prevents route parameter injection attacks and validates input data
 */

export interface RouteValidationResult {
  isValid: boolean;
  value?: any;
  error?: string;
}

/**
 * Validate and sanitize a numeric ID parameter
 */
export function validateNumericId(
  param: string | string[] | undefined,
  options: {
    min?: number;
    max?: number;
    allowNegative?: boolean;
  } = {},
): RouteValidationResult {
  // Handle array parameters (should not happen for ID but safety first)
  if (Array.isArray(param)) {
    return {
      isValid: false,
      error: "ID parameter cannot be an array",
    };
  }

  // Check for null/undefined
  if (!param) {
    return {
      isValid: false,
      error: "ID parameter is required",
    };
  }

  // Remove any whitespace
  const cleanParam = param.toString().trim();

  // Check for empty string
  if (cleanParam === "") {
    return {
      isValid: false,
      error: "ID parameter cannot be empty",
    };
  }

  // Check for dangerous characters (injection attempts)
  if (containsDangerousCharacters(cleanParam)) {
    return {
      isValid: false,
      error: "ID parameter contains invalid characters",
    };
  }

  // Check if it's a valid number
  const numericValue = Number(cleanParam);

  if (isNaN(numericValue)) {
    return {
      isValid: false,
      error: "ID parameter must be a valid number",
    };
  }

  // Check if it's an integer
  if (!Number.isInteger(numericValue)) {
    return {
      isValid: false,
      error: "ID parameter must be an integer",
    };
  }

  // Check negative values
  if (!options.allowNegative && numericValue < 0) {
    return {
      isValid: false,
      error: "ID parameter cannot be negative",
    };
  }

  // Check minimum value
  const minValue = options.min ?? 1;
  if (numericValue < minValue) {
    return {
      isValid: false,
      error: `ID parameter must be at least ${minValue}`,
    };
  }

  // Check maximum value (prevent DoS with huge numbers)
  const maxValue = options.max ?? Number.MAX_SAFE_INTEGER;
  if (numericValue > maxValue) {
    return {
      isValid: false,
      error: `ID parameter cannot exceed ${maxValue}`,
    };
  }

  return {
    isValid: true,
    value: numericValue,
  };
}

/**
 * Validate and sanitize a string parameter (like plugin keys, etc.)
 */
export function validateStringParam(
  param: string | string[] | undefined,
  options: {
    minLength?: number;
    maxLength?: number;
    allowedPattern?: RegExp;
    allowedValues?: string[];
    caseSensitive?: boolean;
  } = {},
): RouteValidationResult {
  // Handle array parameters
  if (Array.isArray(param)) {
    return {
      isValid: false,
      error: "String parameter cannot be an array",
    };
  }

  // Check for null/undefined
  if (!param) {
    return {
      isValid: false,
      error: "String parameter is required",
    };
  }

  const cleanParam = param.toString().trim();

  // Check for empty string
  if (cleanParam === "") {
    return {
      isValid: false,
      error: "String parameter cannot be empty",
    };
  }

  // Check dangerous characters
  if (containsDangerousCharacters(cleanParam)) {
    return {
      isValid: false,
      error: "String parameter contains invalid characters",
    };
  }

  // Check length constraints
  const minLength = options.minLength ?? 1;
  const maxLength = options.maxLength ?? 100;

  if (cleanParam.length < minLength) {
    return {
      isValid: false,
      error: `String parameter must be at least ${minLength} characters long`,
    };
  }

  if (cleanParam.length > maxLength) {
    return {
      isValid: false,
      error: `String parameter cannot exceed ${maxLength} characters`,
    };
  }

  // Check against allowed pattern
  if (options.allowedPattern && !options.allowedPattern.test(cleanParam)) {
    return {
      isValid: false,
      error: "String parameter format is invalid",
    };
  }

  // Check against allowed values whitelist
  if (options.allowedValues && options.allowedValues.length > 0) {
    const compareValues =
      options.caseSensitive === false
        ? options.allowedValues.map((v) => v.toLowerCase())
        : options.allowedValues;

    const compareParam =
      options.caseSensitive === false ? cleanParam.toLowerCase() : cleanParam;

    if (!compareValues.includes(compareParam)) {
      return {
        isValid: false,
        error: `String parameter must be one of: ${options.allowedValues.join(", ")}`,
      };
    }
  }

  return {
    isValid: true,
    value: cleanParam,
  };
}

/**
 * Check for dangerous characters that could indicate injection attempts
 */
function containsDangerousCharacters(input: string): boolean {
  // Common injection patterns
  const dangerousPatterns = [
    // JavaScript injection
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i,

    // SQL injection attempts
    /(\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b)/i,
    /[';].*(--)/, // SQL comments

    // Path traversal
    /\.\./,
    /[\\\/]/,

    // URL encoding attempts
    /%[0-9a-f]{2}/i,

    // Control characters
    /[\x00-\x1F\x7F]/,

    // HTML/XML injection
    /[<>"']/,

    // Command injection
    /[|&`;$()]/,
  ];

  return dangerousPatterns.some((pattern) => pattern.test(input));
}

/**
 * Sanitize a string parameter by removing dangerous characters
 */
export function sanitizeStringParam(input: string): string {
  return input
    .replace(/[<>"']/g, "") // Remove HTML/XML characters
    .replace(/[|&`;$()]/g, "") // Remove command injection characters
    .replace(/\.\./g, "") // Remove path traversal
    .replace(/[\\\/]/g, "") // Remove path separators
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
    .replace(/%[0-9a-f]{2}/gi, "") // Remove URL encoding
    .trim();
}

/**
 * Sanitize item/product names while preserving legitimate characters
 * Allows international characters, slashes, ampersands, etc. that are common in product names
 */
export function sanitizeItemName(input: string): string {
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, "") // Remove script tags
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, "") // Remove iframe tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove control characters (except tab, newline, CR)
    .trim();
}

/**
 * General purpose text sanitization that preserves international characters and common punctuation
 * Use this for user-facing text fields like names, descriptions, etc.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, "") // Remove script tags
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, "") // Remove iframe tags
    .replace(/<object[^>]*>.*?<\/object>/gi, "") // Remove object tags
    .replace(/<embed[^>]*>.*?<\/embed>/gi, "") // Remove embed tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/vbscript:/gi, "") // Remove vbscript: protocol
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove control characters (except tab, newline, CR)
    .trim();
}

/**
 * Validate receipt ID specifically
 */
export function validateReceiptId(
  param: string | string[] | undefined,
): RouteValidationResult {
  return validateNumericId(param, {
    min: 1,
    max: Number.MAX_SAFE_INTEGER,
    allowNegative: false,
  });
}

/**
 * Validate plugin key specifically
 */
export function validatePluginKey(
  param: string | string[] | undefined,
): RouteValidationResult {
  return validateStringParam(param, {
    minLength: 1,
    maxLength: 50,
    allowedPattern: /^[a-zA-Z0-9\-_]+$/,
    allowedValues: [
      "category-analytics",
      "price-trends",
      "generic-receipts",
      "amazon-receipts",
      "generic-receipt",
      "amazon",
    ],
    caseSensitive: false,
  });
}

/**
 * Validate export format parameter
 */
export function validateFormat(
  param: string | string[] | undefined,
): RouteValidationResult {
  return validateStringParam(param, {
    minLength: 2,
    maxLength: 10,
    allowedPattern: /^[a-zA-Z0-9]+$/,
    allowedValues: ["csv", "json", "xlsx", "pdf"],
    caseSensitive: false,
  });
}

/**
 * Validate date parameter (YYYY-MM-DD format)
 */
export function validateDateParam(
  param: string | string[] | undefined,
): RouteValidationResult {
  if (Array.isArray(param)) {
    return {
      isValid: false,
      error: "Date parameter cannot be an array",
    };
  }

  if (!param) {
    return {
      isValid: false,
      error: "Date parameter is required",
    };
  }

  const cleanParam = param.toString().trim();

  // Check format (YYYY-MM-DD)
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(cleanParam)) {
    return {
      isValid: false,
      error: "Date parameter must be in YYYY-MM-DD format",
    };
  }

  // Check if it's a valid date
  const date = new Date(cleanParam);
  if (isNaN(date.getTime())) {
    return {
      isValid: false,
      error: "Date parameter is not a valid date",
    };
  }

  // Check reasonable date range (not too far in past/future)
  const minDate = new Date("2000-01-01");
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1); // Allow up to 1 year in future

  if (date < minDate || date > maxDate) {
    return {
      isValid: false,
      error: "Date parameter is outside acceptable range",
    };
  }

  return {
    isValid: true,
    value: cleanParam,
  };
}

/**
 * Helper function to handle validation results in Vue components
 */
export function handleValidationError(
  result: RouteValidationResult,
  router: any,
  fallbackRoute = "/",
): void {
  if (!result.isValid) {
    console.error("Route parameter validation failed:", result.error);

    // Log the security incident
    console.warn(
      "Potential route parameter injection attempt detected:",
      result.error,
    );

    // Redirect to safe page
    router.replace(fallbackRoute);

    // Could also show a user-friendly error message
    throw new Error("Invalid route parameter detected");
  }
}

/**
 * Vue composable for route parameter validation
 */
export function useRouteValidation() {
  return {
    validateReceiptId,
    validatePluginKey,
    validateFormat,
    validateDateParam,
    validateNumericId,
    validateStringParam,
    sanitizeStringParam,
    sanitizeItemName,
    sanitizeText,
    handleValidationError,
  };
}
