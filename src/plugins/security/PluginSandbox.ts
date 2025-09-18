import type { PluginConfig } from "../types/IPlugin";
import { errorLogger } from "@/services/errorLogging";

/**
 * Plugin Sandbox System
 * Provides runtime isolation and security measures for plugin operations
 */
export class PluginSandbox {
  private static readonly MAX_EXECUTION_TIME = 30000; // 30 seconds
  private static readonly MAX_MEMORY_USAGE = 100 * 1024 * 1024; // 100MB
  private static readonly RATE_LIMIT_REQUESTS = 10;
  private static readonly RATE_LIMIT_WINDOW = 60000; // 1 minute

  private rateLimitMap = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private activeOperations = new Map<
    string,
    { startTime: number; abortController: AbortController }
  >();

  /**
   * Execute plugin operation in a sandboxed environment
   */
  async executePluginOperation<T>(
    pluginId: string,
    operation: () => Promise<T>,
    options: SandboxOptions = {},
  ): Promise<T> {
    const startTime = Date.now();
    const operationId = `${pluginId}-${startTime}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Rate limiting check
      this.enforceRateLimit(pluginId);

      // Create execution context
      const abortController = new AbortController();
      this.activeOperations.set(operationId, { startTime, abortController });

      // Set execution timeout
      const timeoutId = setTimeout(() => {
        abortController.abort();
        this.cleanupOperation(operationId);
        throw new Error(
          `Plugin ${pluginId} operation timed out after ${PluginSandbox.MAX_EXECUTION_TIME}ms`,
        );
      }, options.timeout || PluginSandbox.MAX_EXECUTION_TIME);

      // Execute operation with monitoring
      const result = await Promise.race([
        this.monitoredExecution(operation, operationId),
        this.createTimeoutPromise(abortController.signal),
      ]);

      // Cleanup
      clearTimeout(timeoutId);
      this.cleanupOperation(operationId);

      // Log successful execution
      this.logPluginExecution(pluginId, Date.now() - startTime, true);

      return result as T;
    } catch (error) {
      this.cleanupOperation(operationId);
      this.logPluginExecution(pluginId, Date.now() - startTime, false, error);
      throw error;
    }
  }

  /**
   * Validate plugin request before execution
   */
  validatePluginRequest(pluginId: string, request: any): SecurityCheckResult {
    const issues: string[] = [];

    try {
      // Check request size
      const requestSize = new TextEncoder().encode(
        JSON.stringify(request),
      ).length;
      if (requestSize > 1024 * 1024) {
        // 1MB
        issues.push("Request payload too large");
      }

      // Check for suspicious content
      const requestStr = JSON.stringify(request).toLowerCase();
      const suspiciousPatterns = [
        "eval(",
        "function(",
        "javascript:",
        "<script",
        "document.",
        "window.",
        "process.",
        "__proto__",
        "constructor",
        "prototype",
      ];

      const foundSuspicious = suspiciousPatterns.some((pattern) =>
        requestStr.includes(pattern),
      );

      if (foundSuspicious) {
        issues.push("Request contains potentially malicious content");
      }

      // Check for SQL injection patterns
      const sqlPatterns = [
        "union select",
        "drop table",
        "insert into",
        "delete from",
        "update set",
        "--",
        "/*",
        "*/",
      ];

      const hasSqlInjection = sqlPatterns.some((pattern) =>
        requestStr.includes(pattern),
      );

      if (hasSqlInjection) {
        issues.push("Request contains SQL injection patterns");
      }
    } catch (error) {
      issues.push("Failed to validate request structure");
    }

    return {
      isSecure: issues.length === 0,
      issues,
      riskLevel: this.calculateRiskLevel(issues),
    };
  }

  /**
   * Create isolated execution environment for plugin operations
   */
  createIsolatedEnvironment(): PluginExecutionContext {
    const context: PluginExecutionContext = {
      // Restricted console for logging
      console: {
        log: (message: string) => this.sandboxedLog("log", message),
        warn: (message: string) => this.sandboxedLog("warn", message),
        error: (message: string) => this.sandboxedLog("error", message),
        info: (message: string) => this.sandboxedLog("info", message),
      },

      // Restricted fetch for HTTP requests
      fetch: this.createSandboxedFetch(),

      // Safe JSON operations
      JSON: {
        parse: (text: string) => this.safeParse(text),
        stringify: (value: any) => this.safeStringify(value),
      },

      // Utilities
      setTimeout: (callback: () => void, delay: number) => {
        if (delay > 30000) {
          throw new Error("Timeout delay too long (max 30s)");
        }
        return setTimeout(callback, delay);
      },
    };

    return context;
  }

  /**
   * Monitor plugin resource usage
   */
  private async monitoredExecution<T>(
    operation: () => Promise<T>,
    operationId: string,
  ): Promise<T> {
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

    try {
      const result = await operation();

      // Check memory usage after operation
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryDelta = endMemory - startMemory;

      if (memoryDelta > PluginSandbox.MAX_MEMORY_USAGE) {
        errorLogger.logError(
          new Error(
            `Plugin operation exceeded memory limit: ${memoryDelta} bytes`,
          ),
          "Plugin Memory Violation",
          { operationId, memoryUsage: memoryDelta },
        );
      }

      return result;
    } catch (error) {
      // Log execution errors
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        "Plugin Execution Error",
        { operationId },
      );
      throw error;
    }
  }

  /**
   * Enforce rate limiting per plugin
   */
  private enforceRateLimit(pluginId: string): void {
    const now = Date.now();
    const rateData = this.rateLimitMap.get(pluginId);

    if (!rateData || now > rateData.resetTime) {
      // Reset or initialize rate limit
      this.rateLimitMap.set(pluginId, {
        count: 1,
        resetTime: now + PluginSandbox.RATE_LIMIT_WINDOW,
      });
      return;
    }

    if (rateData.count >= PluginSandbox.RATE_LIMIT_REQUESTS) {
      throw new Error(
        `Plugin ${pluginId} rate limit exceeded (${PluginSandbox.RATE_LIMIT_REQUESTS} requests per ${PluginSandbox.RATE_LIMIT_WINDOW / 1000}s)`,
      );
    }

    rateData.count++;
  }

  /**
   * Create timeout promise for operation cancellation
   */
  private createTimeoutPromise<T>(signal: AbortSignal): Promise<T> {
    return new Promise((_, reject) => {
      signal.addEventListener("abort", () => {
        reject(new Error("Plugin operation aborted due to timeout"));
      });
    });
  }

  /**
   * Cleanup operation resources
   */
  private cleanupOperation(operationId: string): void {
    const operation = this.activeOperations.get(operationId);
    if (operation) {
      operation.abortController.abort();
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Sandboxed logging function
   */
  private sandboxedLog(level: string, message: string): void {
    // Sanitize log message
    const sanitized = message
      .replace(/<script[^>]*>.*?<\/script>/gi, "[SCRIPT_REMOVED]")
      .replace(/javascript:/gi, "[JS_PROTOCOL_REMOVED]")
      .substring(0, 1000); // Limit log length

    (console as any)[level](`[PLUGIN] ${sanitized}`);
  }

  /**
   * Create sandboxed fetch function
   */
  private createSandboxedFetch() {
    return async (url: string | URL, options?: RequestInit) => {
      // Validate URL
      const urlStr = url.toString();
      if (!urlStr.startsWith("http://") && !urlStr.startsWith("https://")) {
        throw new Error("Only HTTP/HTTPS requests allowed in plugin context");
      }

      // Add timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };
  }

  /**
   * Safe JSON parsing with size limits
   */
  private safeParse(text: string): any {
    if (text.length > 1024 * 1024) {
      // 1MB limit
      throw new Error("JSON payload too large");
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error("Invalid JSON format");
    }
  }

  /**
   * Safe JSON stringification
   */
  private safeStringify(value: any): string {
    try {
      const result = JSON.stringify(value);
      if (result.length > 1024 * 1024) {
        // 1MB limit
        throw new Error("JSON output too large");
      }
      return result;
    } catch (error) {
      throw new Error("Failed to stringify JSON");
    }
  }

  /**
   * Calculate risk level based on security issues
   */
  private calculateRiskLevel(issues: string[]): RiskLevel {
    const criticalKeywords = ["malicious", "injection", "script"];
    const hasCritical = issues.some((issue) =>
      criticalKeywords.some((keyword) => issue.toLowerCase().includes(keyword)),
    );

    if (hasCritical) return "critical";
    if (issues.length > 2) return "high";
    if (issues.length > 0) return "medium";
    return "low";
  }

  /**
   * Log plugin execution metrics
   */
  private logPluginExecution(
    pluginId: string,
    executionTime: number,
    success: boolean,
    error?: any,
  ): void {
    const logData = {
      pluginId,
      executionTime,
      success,
      timestamp: new Date().toISOString(),
    };

    if (!success && error) {
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        "Plugin Execution Failed",
        logData,
      );
    } else if (executionTime > 10000) {
      // Log slow operations
      errorLogger.logError(
        new Error(`Plugin operation took ${executionTime}ms`),
        "Plugin Performance Warning",
        logData,
      );
    }
  }
}

// Singleton instance for the sandbox
export const pluginSandbox = new PluginSandbox();

export interface SandboxOptions {
  timeout?: number;
  memoryLimit?: number;
}

export interface SecurityCheckResult {
  isSecure: boolean;
  issues: string[];
  riskLevel: RiskLevel;
}

export interface PluginExecutionContext {
  console: {
    log: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
  fetch: (url: string | URL, options?: RequestInit) => Promise<Response>;
  JSON: {
    parse: (text: string) => any;
    stringify: (value: any) => string;
  };
  setTimeout: (callback: () => void, delay: number) => number;
}

export type RiskLevel = "low" | "medium" | "high" | "critical";
