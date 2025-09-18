/**
 * Amazon Orders Plugin V2 - Enhanced Security Implementation
 * Built with the secure plugin helper for better security compliance
 */

import { createSecurePlugin } from "../utils/PluginSecurityHelper";
import { FILE_SIZE } from "@/constants/app";

/**
 * Create the Amazon Orders plugin with enhanced security
 */
export const amazonOrdersPluginV2 = await createSecurePlugin({
  id: "amazon-orders-v2",
  name: "Amazon Orders Enhanced",
  version: "v2.0.0",
  description:
    "Advanced Amazon order data import with enhanced security, validation, and processing capabilities. Supports CSV/PDF imports, real-time validation, batch processing with progress tracking, and secure encrypted data transmission.",

  fileTypes: ["csv", "pdf"],

  endpoints: {
    upload: "https://api.shoptrack.app/v2/upload/amazon",
    manual: "https://api.shoptrack.app/v2/upload/amazon/manual",
    validate: "https://api.shoptrack.app/v2/validate/amazon",
    status: "https://api.shoptrack.app/v2/status/amazon",
  },

  capabilities: {
    fileUpload: true,
    manualEntry: true,
    batchProcessing: true,
    imageProcessing: false,
    dataValidation: true,
    encryptionSupport: true,
  },

  icon: "📦",
  color: "#ff9900",
  maxFileSize: FILE_SIZE.AMAZON_ORDERS_MAX_SIZE_MB * FILE_SIZE.MB,

  features: [
    "Secure File Upload",
    "Manual Data Entry",
    "Batch Processing",
    "Real-time Validation",
    "Data Encryption",
    "Progress Tracking",
    "Error Recovery",
    "Audit Logging",
  ],
});

/**
 * Plugin configuration metadata
 */
export const amazonOrdersPluginV2Metadata = {
  // Plugin information
  compatibility: {
    minVersion: "v2.0.0",
    maxFileSize: "50MB",
    supportedFormats: ["CSV", "PDF"],
  },

  // Security features
  security: {
    encryption: "AES-256-GCM",
    authentication: "OAuth 2.0 + JWT",
    validation: "Schema + Content validation",
    auditLogging: "Full transaction logging",
  },

  // Performance characteristics
  performance: {
    avgProcessingTime: "< 2s per file",
    batchSize: "Up to 1000 orders",
    concurrency: "5 parallel uploads",
    memoryUsage: "< 100MB per session",
  },

  // API endpoints documentation
  apiEndpoints: {
    upload: {
      method: "POST",
      contentType: "multipart/form-data",
      authentication: "Bearer token required",
      rateLimit: "10 requests/minute",
    },
    validate: {
      method: "POST",
      contentType: "application/json",
      authentication: "Bearer token required",
      rateLimit: "50 requests/minute",
    },
    status: {
      method: "GET",
      authentication: "Bearer token required",
      rateLimit: "100 requests/minute",
    },
  },

  // Error codes and handling
  errorCodes: {
    VALIDATION_FAILED: "Invalid data format or content",
    UPLOAD_FAILED: "Network or server error during upload",
    AUTH_FAILED: "Authentication token invalid or expired",
    RATE_LIMIT_EXCEEDED: "Too many requests - please retry later",
    FILE_TOO_LARGE: "File exceeds maximum size limit",
    UNSUPPORTED_FORMAT: "File format not supported",
  },
};
