import type {
  IPluginRegistry,
  PluginRegistryOptions,
  PluginRegistryEvents,
} from "../interfaces/IPluginRegistry";
import type { PluginConfig } from "../types/IPlugin";
import { errorLogger } from "../../services/errorLogging";
import { PluginSecurityValidator } from "../security/PluginSecurityValidator";
import { pluginSandbox } from "../security/PluginSandbox";
import { pluginPermissionManager } from "../security/PluginPermissionManager";
import {
  PluginIntegrityValidator,
  type IntegrityCheckResult,
  type IntegrityCheck,
} from "../security/PluginIntegrityValidator";

/**
 * Implementation of plugin registry with proper dependency injection support
 * Replaces the singleton pattern with a properly injectable service
 */
export class PluginRegistryImpl implements IPluginRegistry {
  private plugins = new Map<string, PluginConfig>();
  private readonly options: Required<PluginRegistryOptions>;

  constructor(options: PluginRegistryOptions = {}) {
    this.options = {
      debug: false,
      maxPlugins: 100,
      events: {},
      scoringFunction: this.defaultScoringFunction,
      ...options,
    };

    if (this.options.debug) {
      console.log("🔧 PluginRegistry initialized with options:", this.options);
    }
  }

  async registerPlugin(config: PluginConfig): Promise<void> {
    try {
      // Enhanced security validation
      const securityResult =
        PluginSecurityValidator.validatePluginConfig(config);

      if (!securityResult.isValid) {
        const errorMsg = `Plugin ${config.plugin.id} failed security validation: ${securityResult.errors.join(", ")}`;
        errorLogger.logError(
          new Error(errorMsg),
          "Plugin Security Validation Failed",
          {
            pluginId: config.plugin.id,
            securityErrors: securityResult.errors,
            securityWarnings: securityResult.warnings,
            securityLevel: securityResult.securityLevel,
          },
        );
        throw new Error(errorMsg);
      }

      // Integrity validation
      const integrityResult =
        await PluginIntegrityValidator.verifyPlugin(config);

      if (!integrityResult.isValid) {
        const errorMsg = `Plugin ${config.plugin.id} failed integrity verification (trust score: ${integrityResult.trustScore}%)`;
        errorLogger.logError(
          new Error(errorMsg),
          "Plugin Integrity Validation Failed",
          {
            pluginId: config.plugin.id,
            trustScore: integrityResult.trustScore,
            riskLevel: integrityResult.riskLevel,
            failedChecks: integrityResult.checks.filter((c) => !c.passed),
            recommendations: integrityResult.recommendations,
          },
        );
        throw new Error(errorMsg);
      }

      // Log integrity warnings for medium risk plugins
      if (
        integrityResult.riskLevel === "medium" ||
        integrityResult.riskLevel === "high"
      ) {
        console.warn(`🔒 Plugin ${config.plugin.id} integrity warnings:`, {
          trustScore: integrityResult.trustScore,
          riskLevel: integrityResult.riskLevel,
          recommendations: integrityResult.recommendations,
        });
      }

      // Log security warnings
      if (securityResult.warnings.length > 0) {
        console.warn(
          `🔒 Plugin ${config.plugin.id} security warnings:`,
          securityResult.warnings,
        );
      }

      // Block plugins with critical security issues
      if (securityResult.securityLevel === "critical") {
        throw new Error(
          `Plugin ${config.plugin.id} has critical security issues and cannot be registered`,
        );
      }

      // Basic validation (kept for backward compatibility)
      this.validatePluginConfig(config);

      // Check plugin limit
      if (this.plugins.size >= this.options.maxPlugins) {
        throw new Error(
          `Plugin limit reached (${this.options.maxPlugins}). Cannot register plugin: ${config.plugin.id}`,
        );
      }

      // Check for duplicate
      if (this.plugins.has(config.plugin.id)) {
        if (this.options.debug) {
          console.warn(
            `Plugin ${config.plugin.id} is already registered. Overwriting...`,
          );
        }
      }

      // Set up plugin permissions
      pluginPermissionManager.autoGrantPermissions(
        config.plugin.id,
        config.capabilities,
      );

      // Register the plugin
      this.plugins.set(config.plugin.id, config);

      if (this.options.debug) {
        console.log(
          `✅ Plugin registered: ${config.plugin.name} (${config.plugin.id}) [Security: ${securityResult.securityLevel}, Integrity: ${integrityResult.trustScore.toFixed(1)}% (${integrityResult.riskLevel})]`,
        );
      }

      // Trigger event
      this.options.events.onPluginRegistered?.(config);
    } catch (error) {
      const pluginError =
        error instanceof Error ? error : new Error(String(error));
      errorLogger.logError(pluginError, "Plugin Registration", {
        pluginId: config.plugin.id,
        pluginName: config.plugin.name,
      });
      throw pluginError;
    }
  }

  getPlugin(id: string): PluginConfig | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): PluginConfig[] {
    return Array.from(this.plugins.values());
  }

  getPluginsByFileType(fileExtension: string): PluginConfig[] {
    const normalizedExtension = fileExtension.toLowerCase().replace(/^\./, "");

    return this.getAllPlugins().filter((config) =>
      config.plugin.fileTypes.some(
        (type) => type.toLowerCase() === normalizedExtension,
      ),
    );
  }

  detectBestPlugin(filename: string): PluginConfig | null {
    try {
      const extension = filename.split(".").pop()?.toLowerCase() || "";
      const compatiblePlugins = this.getPluginsByFileType(extension);

      if (compatiblePlugins.length === 0) {
        if (this.options.debug) {
          console.warn(
            `No compatible plugin found for file: ${filename} (${extension})`,
          );
        }
        this.options.events.onPluginDetected?.(filename, null);
        return null;
      }

      // Score and sort plugins
      const scoredPlugins = compatiblePlugins
        .map((plugin) => ({
          plugin,
          score: this.options.scoringFunction(plugin, filename),
        }))
        .sort((a, b) => b.score - a.score);

      const bestPlugin = scoredPlugins[0].plugin;

      if (this.options.debug) {
        console.log(
          `🎯 Best plugin for ${filename}:`,
          bestPlugin.plugin.name,
          `(score: ${scoredPlugins[0].score})`,
        );
      }

      this.options.events.onPluginDetected?.(filename, bestPlugin);
      return bestPlugin;
    } catch (error) {
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        "Plugin Detection",
        { filename, fileExtension: filename.split(".").pop() },
      );
      return null;
    }
  }

  getFileTypePluginMap(): Record<string, PluginConfig[]> {
    const fileTypeMap: Record<string, PluginConfig[]> = {};

    this.getAllPlugins().forEach((config) => {
      config.plugin.fileTypes.forEach((fileType) => {
        const normalizedType = fileType.toLowerCase();
        if (!fileTypeMap[normalizedType]) {
          fileTypeMap[normalizedType] = [];
        }
        fileTypeMap[normalizedType].push(config);
      });
    });

    return fileTypeMap;
  }

  isPluginRegistered(id: string): boolean {
    return this.plugins.has(id);
  }

  unregisterPlugin(id: string): boolean {
    const wasRegistered = this.plugins.delete(id);

    if (wasRegistered) {
      if (this.options.debug) {
        console.log(`🗑️ Plugin unregistered: ${id}`);
      }
      this.options.events.onPluginUnregistered?.(id);
    }

    return wasRegistered;
  }

  clearAllPlugins(): void {
    const count = this.plugins.size;
    this.plugins.clear();

    if (this.options.debug) {
      console.log(`🧹 Cleared ${count} plugins from registry`);
    }
  }

  getPluginCount(): number {
    return this.plugins.size;
  }

  /**
   * Execute plugin operation in secure sandbox
   */
  async executePluginOperation<T>(
    pluginId: string,
    operation: () => Promise<T>,
    options: { timeout?: number } = {},
  ): Promise<T> {
    const plugin = this.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    // Execute in sandbox
    return pluginSandbox.executePluginOperation(pluginId, operation, options);
  }

  /**
   * Get plugin security information
   */
  getPluginSecurityInfo(pluginId: string): any {
    const plugin = this.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    const securityResult = PluginSecurityValidator.validatePluginConfig(plugin);
    const permissions = pluginPermissionManager.getPermissions(pluginId);

    return {
      pluginId,
      securityLevel: securityResult.securityLevel,
      permissions,
      warnings: securityResult.warnings,
      hasIssues:
        securityResult.errors.length > 0 || securityResult.warnings.length > 0,
    };
  }

  /**
   * Get complete plugin security and integrity information
   */
  async getPluginIntegrityInfo(pluginId: string): Promise<PluginIntegrityInfo> {
    const plugin = this.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    const securityResult = PluginSecurityValidator.validatePluginConfig(plugin);
    const integrityResult = await PluginIntegrityValidator.verifyPlugin(plugin);
    const permissions = pluginPermissionManager.getPermissions(pluginId);
    const integrityReport = PluginIntegrityValidator.generateIntegrityReport(
      integrityResult,
      pluginId,
    );

    return {
      pluginId,
      security: {
        level: securityResult.securityLevel,
        warnings: securityResult.warnings,
        errors: securityResult.errors,
      },
      integrity: {
        trustScore: integrityResult.trustScore,
        riskLevel: integrityResult.riskLevel,
        checks: integrityResult.checks,
        recommendations: integrityResult.recommendations,
      },
      permissions,
      report: integrityReport,
      overallStatus:
        securityResult.isValid && integrityResult.isValid ? "SECURE" : "RISKY",
    };
  }

  /**
   * Default scoring function for plugin detection
   * Prefers specific plugins over generic ones
   */
  private defaultScoringFunction(
    plugin: PluginConfig,
    filename: string,
  ): number {
    let score = 50; // Base score

    // Penalize generic plugins
    if (
      plugin.plugin.id.includes("generic") ||
      plugin.plugin.name.toLowerCase().includes("generic")
    ) {
      score -= 20;
    }

    // Bonus for more specific plugins
    if (plugin.plugin.fileTypes.length === 1) {
      score += 10; // Specialized for one file type
    }

    // Bonus for newer versions
    const versionMatch = plugin.plugin.version.match(/v?(\d+)\.(\d+)\.(\d+)/);
    if (versionMatch) {
      const [, major, minor, patch] = versionMatch;
      score += parseInt(major) * 5 + parseInt(minor) * 2 + parseInt(patch);
    }

    // Filename-specific bonuses
    const filenameLower = filename.toLowerCase();
    if (
      plugin.plugin.id === "amazon-orders" &&
      filenameLower.includes("amazon")
    ) {
      score += 30;
    }

    return Math.max(0, score);
  }

  /**
   * Validate plugin configuration
   */
  private validatePluginConfig(config: PluginConfig): void {
    if (!config.plugin) {
      throw new Error("Plugin configuration is missing plugin definition");
    }

    if (!config.plugin.id || typeof config.plugin.id !== "string") {
      throw new Error("Plugin ID is required and must be a string");
    }

    if (!config.plugin.name || typeof config.plugin.name !== "string") {
      throw new Error("Plugin name is required and must be a string");
    }

    if (!config.plugin.version || typeof config.plugin.version !== "string") {
      throw new Error("Plugin version is required and must be a string");
    }

    if (
      !Array.isArray(config.plugin.fileTypes) ||
      config.plugin.fileTypes.length === 0
    ) {
      throw new Error("Plugin must support at least one file type");
    }

    // Validate file types are strings
    config.plugin.fileTypes.forEach((type, index) => {
      if (typeof type !== "string" || type.trim() === "") {
        throw new Error(
          `Invalid file type at index ${index}: must be a non-empty string`,
        );
      }
    });

    if (!config.capabilities) {
      throw new Error("Plugin capabilities definition is required");
    }
  }
}

export interface PluginIntegrityInfo {
  pluginId: string;
  security: {
    level: string;
    warnings: string[];
    errors: string[];
  };
  integrity: {
    trustScore: number;
    riskLevel: string;
    checks: IntegrityCheck[];
    recommendations: string[];
  };
  permissions: any;
  report: any;
  overallStatus: "SECURE" | "RISKY";
}
