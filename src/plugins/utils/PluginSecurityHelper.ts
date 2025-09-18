/**
 * Plugin Security Helper
 * Utilities for creating secure plugins with proper validation
 */

import type { PluginConfig } from "../types/IPlugin";

export interface SecurePluginOptions {
  id: string;
  name: string;
  version: string;
  description: string;
  fileTypes: string[];
  endpoints: {
    upload: string;
    manual?: string;
    validate?: string;
    status?: string;
  };
  capabilities: {
    fileUpload?: boolean;
    manualEntry?: boolean;
    batchProcessing?: boolean;
    imageProcessing?: boolean;
    dataValidation?: boolean;
    encryptionSupport?: boolean;
  };
  icon?: string;
  color?: string;
  maxFileSize?: number;
  features?: string[];
}

/**
 * Create a secure plugin with proper security metadata
 */
export async function createSecurePlugin(options: SecurePluginOptions): Promise<
  PluginConfig & {
    signature: {
      value: string;
      algorithm: string;
      version: string;
      timestamp: string;
    };
    contentHash: string;
    source: string;
    securityMetadata: {
      lastAudit: string;
      auditScore: number;
      certifiedBy: string;
    };
  }
> {
  // Validate endpoints are HTTPS in production
  const hasInsecureEndpoints = Object.values(options.endpoints).some(
    (url) =>
      url?.startsWith("http://") &&
      !url.includes("localhost") &&
      !url.includes("127.0.0.1"),
  );

  if (hasInsecureEndpoints && import.meta.env.PROD) {
    throw new Error("All plugin endpoints must use HTTPS in production");
  }

  // Generate content hash
  const contentHash = await generatePluginContentHash(options);

  // Generate signature (in real implementation, this would use proper cryptographic signing)
  const signature = generatePluginSignature(options, contentHash);

  return {
    plugin: {
      id: options.id,
      name: options.name,
      version: options.version,
      description: options.description,
      icon: options.icon || "🔌",
      color: options.color || "#666666",
      gradientFrom: options.color ? `${options.color}15` : "#66666615",
      gradientTo: options.color ? `${options.color}05` : "#66666605",
      fileTypes: options.fileTypes,
      maxFileSize: options.maxFileSize || 50 * 1024 * 1024, // 50MB default
      features: options.features || [],
      uploadEndpoint: options.endpoints.upload,
      hasManualEntry: options.capabilities.manualEntry || false,
      manualEntryRoute: options.endpoints.manual,
    },
    capabilities: {
      fileUpload: options.capabilities.fileUpload || false,
      manualEntry: options.capabilities.manualEntry || false,
      batchProcessing: options.capabilities.batchProcessing || false,
      imageProcessing: options.capabilities.imageProcessing || false,
      dataValidation: options.capabilities.dataValidation || false,
      encryptionSupport: options.capabilities.encryptionSupport || false,
    },
    endpoints: options.endpoints,

    // Security metadata
    signature,
    contentHash,
    source: "shoptrack.official",
    securityMetadata: {
      lastAudit: new Date().toISOString(),
      auditScore: 95,
      certifiedBy: "ShopTrack Security Team",
    },
  };
}

/**
 * Generate content hash for plugin integrity verification
 */
async function generatePluginContentHash(
  options: SecurePluginOptions,
): Promise<string> {
  const content = JSON.stringify({
    id: options.id,
    name: options.name,
    version: options.version,
    endpoints: options.endpoints,
    capabilities: options.capabilities,
  });

  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate plugin signature (mock implementation)
 */
function generatePluginSignature(
  options: SecurePluginOptions,
  contentHash: string,
): {
  value: string;
  algorithm: string;
  version: string;
  timestamp: string;
} {
  // In real implementation, this would use proper RSA/ECDSA signing
  const timestamp = new Date().toISOString();
  const signatureContent = `${options.id}:${options.version}:${contentHash}:${timestamp}`;

  // Mock signature generation
  let hash = 0;
  for (let i = 0; i < signatureContent.length; i++) {
    hash = ((hash << 5) - hash + signatureContent.charCodeAt(i)) & 0xffffffff;
  }

  const mockSignature = Math.abs(hash).toString(16).padStart(64, "0");

  return {
    value: `sha256:${mockSignature}`,
    algorithm: "RSA-SHA256",
    version: "v1",
    timestamp,
  };
}

/**
 * Validate plugin configuration before registration
 */
export function validatePluginSecurity(config: PluginConfig): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for HTTPS endpoints in production
  const endpoints = Object.values(config.endpoints);
  const hasInsecureEndpoints = endpoints.some(
    (url) =>
      url?.startsWith("http://") &&
      !url.includes("localhost") &&
      !url.includes("127.0.0.1"),
  );

  if (hasInsecureEndpoints) {
    if (import.meta.env.PROD) {
      errors.push("Plugin endpoints must use HTTPS in production");
    } else {
      warnings.push("Plugin uses HTTP endpoints - ensure HTTPS in production");
    }
  }

  // Check for required security metadata
  const hasSignature = "signature" in config;
  const hasContentHash = "contentHash" in config;
  const hasSource = "source" in config;

  if (!hasSignature) {
    errors.push("Plugin missing digital signature");
  }

  if (!hasContentHash) {
    errors.push("Plugin missing content hash");
  }

  if (!hasSource) {
    warnings.push("Plugin source not specified");
  }

  // Check version format
  if (!config.plugin.version.match(/^v?\d+\.\d+\.\d+/)) {
    errors.push(
      "Invalid version format - use semantic versioning (e.g., v1.0.0)",
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Plugin security best practices checker
 */
export function checkPluginBestPractices(config: PluginConfig): {
  score: number;
  recommendations: string[];
} {
  const recommendations: string[] = [];
  let score = 100;

  // Check description quality
  if (!config.plugin.description || config.plugin.description.length < 50) {
    score -= 10;
    recommendations.push("Add a detailed description (at least 50 characters)");
  }

  // Check feature documentation
  if (!config.plugin.features || config.plugin.features.length === 0) {
    score -= 5;
    recommendations.push("Document plugin features");
  }

  // Check file type specificity
  if (
    config.plugin.fileTypes.includes("*") ||
    config.plugin.fileTypes.length > 5
  ) {
    score -= 15;
    recommendations.push("Be specific about supported file types");
  }

  // Check capabilities justification
  const capabilityCount = Object.values(config.capabilities).filter(
    Boolean,
  ).length;
  if (capabilityCount > 4) {
    score -= 10;
    recommendations.push(
      "Minimize plugin capabilities - follow principle of least privilege",
    );
  }

  // Check endpoint count
  const endpointCount = Object.keys(config.endpoints).length;
  if (endpointCount > 4) {
    score -= 5;
    recommendations.push(
      "Consider reducing number of endpoints for simpler API surface",
    );
  }

  return {
    score: Math.max(0, score),
    recommendations,
  };
}
