export interface ErrorReport {
  timestamp: string;
  url: string;
  userAgent: string;
  context: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  userId?: string;
  sessionId?: string;
  additionalInfo?: Record<string, any>;
}

export interface ErrorLoggingConfig {
  endpoint?: string;
  apiKey?: string;
  enableConsoleLogging: boolean;
  enableRemoteLogging: boolean;
  maxRetries: number;
  retryDelay: number;
}

class ErrorLoggingService {
  private config: ErrorLoggingConfig;
  private sessionId: string;
  private errorQueue: ErrorReport[] = [];
  private isProcessingQueue = false;

  constructor(config: Partial<ErrorLoggingConfig> = {}) {
    this.config = {
      enableConsoleLogging: true,
      enableRemoteLogging: false,
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };

    this.sessionId = this.generateSessionId();

    // Process any queued errors on page visibility change
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        this.processErrorQueue();
      }
    });

    // Process errors before page unload
    window.addEventListener("beforeunload", () => {
      this.flushErrors();
    });
  }

  async logError(
    error: Error,
    context: string = "Unknown",
    additionalInfo?: Record<string, any>,
  ): Promise<void> {
    const errorReport: ErrorReport = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      sessionId: this.sessionId,
      additionalInfo,
    };

    // Add user ID if available (from auth context)
    try {
      // You could integrate with your auth system here
      // const userId = getCurrentUserId();
      // if (userId) errorReport.userId = userId;
    } catch (e) {
      // Ignore auth errors when logging other errors
    }

    if (this.config.enableConsoleLogging) {
      this.logToConsole(errorReport);
    }

    // Only queue errors if remote logging is properly configured
    if (this.config.enableRemoteLogging && this.config.endpoint) {
      this.errorQueue.push(errorReport);
      this.processErrorQueue();
    }
  }

  private logToConsole(errorReport: ErrorReport): void {
    console.group("🔴 Error Report");
    console.error("Timestamp:", errorReport.timestamp);
    console.error("Context:", errorReport.context);
    console.error("Error:", errorReport.error);
    console.error("URL:", errorReport.url);

    if (errorReport.additionalInfo) {
      console.error("Additional Info:", errorReport.additionalInfo);
    }

    if (errorReport.error.stack) {
      console.error("Stack trace:", errorReport.error.stack);
    }

    console.groupEnd();
  }

  private async processErrorQueue(): Promise<void> {
    // Early exit if remote logging is disabled or no endpoint configured
    if (!this.config.enableRemoteLogging || !this.config.endpoint) {
      // Clear the queue to prevent memory leaks
      this.errorQueue = [];
      return;
    }

    if (this.isProcessingQueue || this.errorQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.errorQueue.length > 0) {
      const errorReport = this.errorQueue.shift()!;

      try {
        await this.sendErrorToRemote(errorReport);
      } catch (e) {
        // If sending fails, put it back in the queue for retry
        this.errorQueue.unshift(errorReport);
        break;
      }
    }

    this.isProcessingQueue = false;
  }

  private async sendErrorToRemote(
    errorReport: ErrorReport,
    retryCount = 0,
  ): Promise<void> {
    if (!this.config.endpoint) {
      throw new Error("No remote logging endpoint configured");
    }

    try {
      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.apiKey && {
            Authorization: `Bearer ${this.config.apiKey}`,
          }),
        },
        body: JSON.stringify(errorReport),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (retryCount < this.config.maxRetries) {
        await this.delay(this.config.retryDelay * Math.pow(2, retryCount));
        return this.sendErrorToRemote(errorReport, retryCount + 1);
      }

      // Max retries exceeded
      console.error("Failed to send error report after max retries:", error);
      throw error;
    }
  }

  private flushErrors(): void {
    if (this.errorQueue.length === 0) return;

    // Try to send errors using sendBeacon if available
    if ("sendBeacon" in navigator && this.config.endpoint) {
      try {
        const data = JSON.stringify({
          sessionId: this.sessionId,
          errors: this.errorQueue.splice(0), // Take all remaining errors
        });

        navigator.sendBeacon(this.config.endpoint, data);
      } catch (e) {
        console.error("Failed to send errors via sendBeacon:", e);
      }
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Configuration methods
  updateConfig(config: Partial<ErrorLoggingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  enableRemoteLogging(endpoint: string, apiKey?: string): void {
    this.updateConfig({
      endpoint,
      apiKey,
      enableRemoteLogging: true,
    });
  }

  disableRemoteLogging(): void {
    this.updateConfig({ enableRemoteLogging: false });
  }

  // Utility methods for specific error types
  logNetworkError(error: Error, url: string, method: string = "GET"): void {
    this.logError(error, "Network Error", { url, method });
  }

  logValidationError(error: Error, formData: Record<string, any>): void {
    this.logError(error, "Validation Error", {
      formData: this.sanitizeFormData(formData),
    });
  }

  logApiError(error: Error, endpoint: string, statusCode?: number): void {
    this.logError(error, "API Error", { endpoint, statusCode });
  }

  private sanitizeFormData(data: Record<string, any>): Record<string, any> {
    const sensitiveFields = ["password", "token", "apiKey", "secret"];
    const sanitized = { ...data };

    Object.keys(sanitized).forEach((key) => {
      if (
        sensitiveFields.some((field) =>
          key.toLowerCase().includes(field.toLowerCase()),
        )
      ) {
        sanitized[key] = "[REDACTED]";
      }
    });

    return sanitized;
  }
}

// Create and export default instance
export const errorLogger = new ErrorLoggingService({
  enableConsoleLogging: import.meta.env.DEV,
  // Only enable remote logging if endpoint is defined
  enableRemoteLogging: Boolean(import.meta.env.VITE_ERROR_LOGGING_ENDPOINT),
  // Only set endpoint if it's defined in environment
  ...(import.meta.env.VITE_ERROR_LOGGING_ENDPOINT && {
    endpoint: import.meta.env.VITE_ERROR_LOGGING_ENDPOINT,
  }),
  // Optional API key for authentication
  ...(import.meta.env.VITE_ERROR_LOGGING_API_KEY && {
    apiKey: import.meta.env.VITE_ERROR_LOGGING_API_KEY,
  }),
});

export { ErrorLoggingService };
