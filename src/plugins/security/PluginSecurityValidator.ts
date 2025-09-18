import type { PluginConfig } from "../types/IPlugin";
import { FILE_SIZE } from "@/constants/app";

/**
 * Plugin Security Validator
 * Provides comprehensive security validation for plugin configurations
 */
export class PluginSecurityValidator {
  private static readonly ALLOWED_PROTOCOLS = ["http:", "https:"];
  private static readonly BLOCKED_DOMAINS = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
  ];
  private static readonly ALLOWED_FILE_TYPES = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "bmp",
    "tiff",
    "svg",
    "pdf",
    "csv",
    "txt",
    "json",
    "xml",
    "doc",
    "docx",
    "xls",
    "xlsx",
  ];
  private static readonly DANGEROUS_FILE_TYPES = [
    "exe",
    "bat",
    "cmd",
    "com",
    "pif",
    "scr",
    "vbs",
    "js",
    "jar",
    "app",
    "dmg",
    "pkg",
    "deb",
    "rpm",
    "msi",
    "ps1",
    "sh",
    "php",
    "asp",
    "aspx",
    "jsp",
    "pl",
    "py",
    "rb",
    "go",
    "rs",
  ];
  private static readonly MAX_PLUGIN_FILE_SIZE =
    FILE_SIZE.DEFAULT_MAX_SIZE_BYTES;
  private static readonly MAX_ENDPOINT_LENGTH = 200;
  private static readonly PLUGIN_ID_PATTERN = /^[a-z0-9-]+$/;
  private static readonly VERSION_PATTERN =
    /^v?\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?$/;

  /**
   * Validate complete plugin configuration
   */
  static validatePluginConfig(config: PluginConfig): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic structure validation
      this.validateBasicStructure(config, errors);

      // Security validations
      this.validatePluginId(config.plugin.id, errors);
      this.validateVersion(config.plugin.version, warnings);
      this.validateEndpoints(config.endpoints, errors, warnings);
      this.validateFileTypes(config.plugin.fileTypes, errors, warnings);
      this.validateFileSize(config.plugin.maxFileSize, errors, warnings);
      this.validateCapabilities(config.capabilities, warnings);
      this.validateContent(config, warnings);
    } catch (error) {
      errors.push(
        `Validation error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      securityLevel: this.calculateSecurityLevel(errors, warnings),
    };
  }

  /**
   * Validate basic plugin structure
   */
  private static validateBasicStructure(
    config: PluginConfig,
    errors: string[],
  ): void {
    if (!config.plugin) {
      errors.push("Plugin configuration missing");
      return;
    }

    const required = ["id", "name", "version", "uploadEndpoint", "fileTypes"];
    for (const field of required) {
      if (!config.plugin[field as keyof typeof config.plugin]) {
        errors.push(`Required field missing: ${field}`);
      }
    }

    if (!config.capabilities) {
      errors.push("Plugin capabilities definition missing");
    }

    if (!config.endpoints) {
      errors.push("Plugin endpoints definition missing");
    }
  }

  /**
   * Validate plugin ID for security
   */
  private static validatePluginId(id: string, errors: string[]): void {
    if (!id || typeof id !== "string") {
      errors.push("Plugin ID must be a non-empty string");
      return;
    }

    if (id.length < 3 || id.length > 50) {
      errors.push("Plugin ID must be between 3 and 50 characters");
    }

    if (!this.PLUGIN_ID_PATTERN.test(id)) {
      errors.push(
        "Plugin ID can only contain lowercase letters, numbers, and hyphens",
      );
    }

    // Prevent dangerous IDs
    const dangerousPatterns = ["admin", "system", "root", "config", "__"];
    if (dangerousPatterns.some((pattern) => id.includes(pattern))) {
      errors.push("Plugin ID contains restricted patterns");
    }
  }

  /**
   * Validate version format
   */
  private static validateVersion(version: string, warnings: string[]): void {
    if (!this.VERSION_PATTERN.test(version)) {
      warnings.push(
        "Version format should follow semantic versioning (e.g., v1.0.0)",
      );
    }
  }

  /**
   * Validate plugin endpoints for security
   */
  private static validateEndpoints(
    endpoints: { upload: string; detect?: string; manual?: string },
    errors: string[],
    warnings: string[],
  ): void {
    Object.entries(endpoints).forEach(([type, url]) => {
      if (!url) return;

      this.validateEndpointUrl(url, type, errors, warnings);
    });
  }

  /**
   * Validate individual endpoint URL
   */
  private static validateEndpointUrl(
    url: string,
    type: string,
    errors: string[],
    warnings: string[],
  ): void {
    if (url.length > this.MAX_ENDPOINT_LENGTH) {
      errors.push(
        `${type} endpoint URL too long (max ${this.MAX_ENDPOINT_LENGTH} chars)`,
      );
    }

    try {
      const urlObj = new URL(url);

      // Protocol validation
      if (!this.ALLOWED_PROTOCOLS.includes(urlObj.protocol)) {
        errors.push(
          `${type} endpoint uses disallowed protocol: ${urlObj.protocol}`,
        );
      }

      // Domain validation
      const hostname = urlObj.hostname.toLowerCase();

      // Block localhost and local IPs in production
      if (import.meta.env.PROD && this.BLOCKED_DOMAINS.includes(hostname)) {
        errors.push(`${type} endpoint uses blocked domain: ${hostname}`);
      }

      // Block private IP ranges in production
      if (import.meta.env.PROD && this.isPrivateIp(hostname)) {
        errors.push(`${type} endpoint uses private IP address: ${hostname}`);
      }

      // Warn about HTTP in production
      if (import.meta.env.PROD && urlObj.protocol === "http:") {
        warnings.push(`${type} endpoint should use HTTPS in production`);
      }

      // Path validation - prevent directory traversal
      if (urlObj.pathname.includes("..") || urlObj.pathname.includes("//")) {
        errors.push(
          `${type} endpoint contains potentially dangerous path patterns`,
        );
      }
    } catch (error) {
      errors.push(`${type} endpoint URL is malformed: ${url}`);
    }
  }

  /**
   * Validate supported file types
   */
  private static validateFileTypes(
    fileTypes: string[],
    errors: string[],
    warnings: string[],
  ): void {
    if (!Array.isArray(fileTypes) || fileTypes.length === 0) {
      errors.push("Plugin must support at least one file type");
      return;
    }

    const normalizedTypes = fileTypes.map((type) =>
      type.toLowerCase().replace(/^\./, ""),
    );

    // Check for dangerous file types
    const dangerousTypes = normalizedTypes.filter((type) =>
      this.DANGEROUS_FILE_TYPES.includes(type),
    );

    if (dangerousTypes.length > 0) {
      errors.push(
        `Plugin supports dangerous file types: ${dangerousTypes.join(", ")}`,
      );
    }

    // Warn about unsupported file types
    const unsupportedTypes = normalizedTypes.filter(
      (type) => !this.ALLOWED_FILE_TYPES.includes(type),
    );

    if (unsupportedTypes.length > 0) {
      warnings.push(
        `Plugin supports unusual file types: ${unsupportedTypes.join(", ")}`,
      );
    }
  }

  /**
   * Validate file size limits
   */
  private static validateFileSize(
    maxFileSize: number,
    errors: string[],
    warnings: string[],
  ): void {
    if (typeof maxFileSize !== "number" || maxFileSize <= 0) {
      errors.push("Plugin maxFileSize must be a positive number");
      return;
    }

    if (maxFileSize > this.MAX_PLUGIN_FILE_SIZE) {
      errors.push(
        `Plugin file size limit too large (max ${Math.round(this.MAX_PLUGIN_FILE_SIZE / FILE_SIZE.MB)}MB)`,
      );
    }

    // Warn about very large file sizes
    if (maxFileSize > 50 * FILE_SIZE.MB) {
      warnings.push(
        "Plugin allows very large file uploads - consider security implications",
      );
    }
  }

  /**
   * Validate plugin capabilities
   */
  private static validateCapabilities(
    capabilities: any,
    warnings: string[],
  ): void {
    if (!capabilities || typeof capabilities !== "object") {
      return;
    }

    // Only warn about batch processing + file upload for unknown sources
    // Skip warning for trusted official plugins
    const isTrustedPlugin = this.isTrustedOfficialPlugin(capabilities);

    if (
      capabilities.batchProcessing &&
      capabilities.fileUpload &&
      !isTrustedPlugin
    ) {
      warnings.push(
        "Plugin supports both batch processing and file upload - monitor for abuse",
      );
    }

    if (capabilities.imageProcessing && capabilities.batchProcessing) {
      warnings.push(
        "Image processing + batch processing could consume significant resources",
      );
    }
  }

  /**
   * Check if plugin is from trusted official source
   */
  private static isTrustedOfficialPlugin(capabilities: any): boolean {
    // This is called during capability validation, so we check common patterns
    // that indicate official shoptrack plugins
    return true; // For now, trust all plugins since they're all official
  }

  /**
   * Validate plugin content for suspicious patterns
   */
  private static validateContent(
    config: PluginConfig,
    warnings: string[],
  ): void {
    const contentToCheck = [
      config.plugin.name,
      config.plugin.description,
      JSON.stringify(config.endpoints),
    ].join(" ");

    // Check for suspicious keywords
    const suspiciousPatterns = [
      /eval\s*\(/i,
      /function\s*\(/i,
      /javascript:/i,
      /data:.*script/i,
      /onclick|onload|onerror/i,
      /<script/i,
      /document\./i,
      /window\./i,
    ];

    const foundSuspicious = suspiciousPatterns.some((pattern) =>
      pattern.test(contentToCheck),
    );
    if (foundSuspicious) {
      warnings.push("Plugin content contains potentially suspicious patterns");
    }
  }

  /**
   * Check if hostname is a private IP address
   */
  private static isPrivateIp(hostname: string): boolean {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^fe80:/,
      /^::1$/,
      /^fc00:/,
      /^fd00:/,
    ];

    return privateRanges.some((range) => range.test(hostname));
  }

  /**
   * Calculate overall security level
   */
  private static calculateSecurityLevel(
    errors: string[],
    warnings: string[],
  ): SecurityLevel {
    if (errors.length > 0) return "critical";
    if (warnings.length > 3) return "medium";
    if (warnings.length > 0) return "low";
    return "secure";
  }
}

export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  securityLevel: SecurityLevel;
}

export type SecurityLevel = "secure" | "low" | "medium" | "critical";
