import type { PluginConfig } from "../types/IPlugin";
import { errorLogger } from "@/services/errorLogging";

/**
 * Plugin Integrity Validator
 * Provides plugin signature verification and integrity checking
 */
export class PluginIntegrityValidator {
  private static readonly HASH_ALGORITHM = "SHA-256";
  private static readonly SIGNATURE_VERSION = "v1";
  private static readonly TRUSTED_SOURCES = [
    "shoptrack.official",
    "verified.plugins",
    "trusted.developers",
  ];

  /**
   * Verify plugin integrity and authenticity
   */
  static async verifyPlugin(
    config: PluginConfig,
  ): Promise<IntegrityCheckResult> {
    const checks: IntegrityCheck[] = [];

    try {
      // Check plugin signature
      const signatureCheck = await this.verifySignature(config);
      checks.push(signatureCheck);

      // Verify content hash
      const hashCheck = await this.verifyContentHash(config);
      checks.push(hashCheck);

      // Validate source authenticity
      const sourceCheck = this.verifySource(config);
      checks.push(sourceCheck);

      // Check for plugin tampering
      const tamperingCheck = this.checkForTampering(config);
      checks.push(tamperingCheck);

      const passedChecks = checks.filter((check) => check.passed).length;
      const totalChecks = checks.length;
      const trustScore = (passedChecks / totalChecks) * 100;

      return {
        isValid: trustScore >= 75, // Require 75% of checks to pass
        checks,
        trustScore,
        riskLevel: this.calculateRiskLevel(trustScore),
        recommendations: this.generateRecommendations(checks),
      };
    } catch (error) {
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        "Plugin Integrity Validation Failed",
        { pluginId: config.plugin.id },
      );

      return {
        isValid: false,
        checks: [
          {
            name: "integrity_validation",
            passed: false,
            message: "Integrity validation failed due to system error",
            severity: "critical",
          },
        ],
        trustScore: 0,
        riskLevel: "critical",
        recommendations: ["Plugin verification failed - do not install"],
      };
    }
  }

  /**
   * Verify plugin digital signature
   */
  private static async verifySignature(
    config: PluginConfig,
  ): Promise<IntegrityCheck> {
    const signature = (config as any).signature;

    if (!signature) {
      return {
        name: "signature_verification",
        passed: false,
        message: "Plugin lacks digital signature",
        severity: "high",
      };
    }

    if (!signature.version || signature.version !== this.SIGNATURE_VERSION) {
      return {
        name: "signature_verification",
        passed: false,
        message: "Unsupported signature version",
        severity: "medium",
      };
    }

    // In a real implementation, this would verify against a public key
    // For now, we'll do basic signature format validation
    const isValidFormat = this.isValidSignatureFormat(signature);

    return {
      name: "signature_verification",
      passed: isValidFormat,
      message: isValidFormat
        ? "Signature format valid"
        : "Invalid signature format",
      severity: isValidFormat ? "info" : "high",
    };
  }

  /**
   * Verify content hash integrity
   */
  private static async verifyContentHash(
    config: PluginConfig,
  ): Promise<IntegrityCheck> {
    try {
      const configString = JSON.stringify({
        id: config.plugin.id,
        name: config.plugin.name,
        version: config.plugin.version,
        endpoints: config.endpoints,
        capabilities: config.capabilities,
      });

      const hash = await this.calculateHash(configString);
      const expectedHash = (config as any).contentHash;

      if (!expectedHash) {
        return {
          name: "content_hash_verification",
          passed: false,
          message: "No content hash provided",
          severity: "medium",
        };
      }

      const hashMatches = hash === expectedHash;

      return {
        name: "content_hash_verification",
        passed: hashMatches,
        message: hashMatches
          ? "Content hash verified"
          : "Content hash mismatch - possible tampering",
        severity: hashMatches ? "info" : "critical",
      };
    } catch (error) {
      return {
        name: "content_hash_verification",
        passed: false,
        message: "Failed to verify content hash",
        severity: "high",
      };
    }
  }

  /**
   * Verify plugin source authenticity
   */
  private static verifySource(config: PluginConfig): IntegrityCheck {
    const source = (config as any).source;

    if (!source) {
      return {
        name: "source_verification",
        passed: false,
        message: "Unknown plugin source",
        severity: "medium",
      };
    }

    const isTrustedSource = this.TRUSTED_SOURCES.includes(source);

    return {
      name: "source_verification",
      passed: isTrustedSource,
      message: isTrustedSource
        ? `Trusted source: ${source}`
        : `Untrusted source: ${source}`,
      severity: isTrustedSource ? "info" : "low",
    };
  }

  /**
   * Check for signs of plugin tampering
   */
  private static checkForTampering(config: PluginConfig): IntegrityCheck {
    const issues: string[] = [];

    // Check for suspicious modifications to critical fields
    if (typeof config.plugin.id !== "string") {
      issues.push("Plugin ID has been modified");
    }

    // Check for unusual endpoint modifications
    const endpoints = Object.values(config.endpoints);
    const hasLocalEndpoints = endpoints.some(
      (url) => url.includes("localhost") || url.includes("127.0.0.1"),
    );

    if (hasLocalEndpoints && import.meta.env.PROD) {
      issues.push("Suspicious local endpoints in production");
    }

    // Check for capability escalation
    const capabilities = Object.keys(config.capabilities);
    const dangerousCapabilities = [
      "systemAccess",
      "fileSystemAccess",
      "networkAccess",
    ];
    const hasDangerousCapabilities = capabilities.some((cap) =>
      dangerousCapabilities.includes(cap),
    );

    if (hasDangerousCapabilities) {
      issues.push("Plugin requests dangerous system capabilities");
    }

    // Check for version inconsistencies
    if (
      config.plugin.version &&
      !config.plugin.version.match(/^v?\d+\.\d+\.\d+/)
    ) {
      issues.push("Invalid version format");
    }

    return {
      name: "tampering_detection",
      passed: issues.length === 0,
      message:
        issues.length === 0
          ? "No tampering detected"
          : `Potential tampering: ${issues.join(", ")}`,
      severity: issues.length === 0 ? "info" : "high",
    };
  }

  /**
   * Calculate content hash
   */
  private static async calculateHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest(this.HASH_ALGORITHM, data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Validate signature format
   */
  private static isValidSignatureFormat(signature: any): boolean {
    return (
      signature &&
      typeof signature.value === "string" &&
      typeof signature.algorithm === "string" &&
      signature.value.length >= 64 // Minimum signature length
    );
  }

  /**
   * Calculate risk level based on trust score
   */
  private static calculateRiskLevel(trustScore: number): RiskLevel {
    if (trustScore >= 90) return "low";
    if (trustScore >= 75) return "medium";
    if (trustScore >= 50) return "high";
    return "critical";
  }

  /**
   * Generate security recommendations
   */
  private static generateRecommendations(checks: IntegrityCheck[]): string[] {
    const recommendations: string[] = [];

    const failedChecks = checks.filter((check) => !check.passed);

    if (failedChecks.some((check) => check.name === "signature_verification")) {
      recommendations.push("Verify plugin comes from a trusted source");
    }

    if (
      failedChecks.some((check) => check.name === "content_hash_verification")
    ) {
      recommendations.push(
        "Do not install - plugin may be corrupted or tampered with",
      );
    }

    if (failedChecks.some((check) => check.name === "tampering_detection")) {
      recommendations.push(
        "Review plugin capabilities and endpoints before installation",
      );
    }

    if (failedChecks.some((check) => check.name === "source_verification")) {
      recommendations.push(
        "Exercise caution with plugins from unknown sources",
      );
    }

    if (recommendations.length === 0) {
      recommendations.push("Plugin passed all integrity checks");
    }

    return recommendations;
  }

  /**
   * Generate plugin integrity report
   */
  static generateIntegrityReport(
    result: IntegrityCheckResult,
    pluginId: string,
  ): IntegrityReport {
    return {
      pluginId,
      timestamp: new Date().toISOString(),
      trustScore: result.trustScore,
      riskLevel: result.riskLevel,
      overallStatus: result.isValid ? "PASS" : "FAIL",
      checks: result.checks.map((check) => ({
        name: check.name,
        status: check.passed ? "PASS" : "FAIL",
        message: check.message,
        severity: check.severity,
      })),
      recommendations: result.recommendations,
      summary: `Plugin ${pluginId} scored ${result.trustScore.toFixed(1)}% trust score with ${result.riskLevel} risk level`,
    };
  }
}

export interface IntegrityCheckResult {
  isValid: boolean;
  checks: IntegrityCheck[];
  trustScore: number;
  riskLevel: RiskLevel;
  recommendations: string[];
}

export interface IntegrityCheck {
  name: string;
  passed: boolean;
  message: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
}

export interface IntegrityReport {
  pluginId: string;
  timestamp: string;
  trustScore: number;
  riskLevel: RiskLevel;
  overallStatus: "PASS" | "FAIL";
  checks: Array<{
    name: string;
    status: "PASS" | "FAIL";
    message: string;
    severity: string;
  }>;
  recommendations: string[];
  summary: string;
}

export type RiskLevel = "low" | "medium" | "high" | "critical";
