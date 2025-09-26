/**
 * Memory Monitoring Configuration
 *
 * Central configuration for memory monitoring across different environments.
 * This file contains all settings, thresholds, and environment-specific
 * configurations for the memory monitoring system.
 */

import type { MemoryThresholds } from "@/services/memoryMonitoring.service";

export interface MemoryMonitoringConfig {
  enabled: boolean;
  environment: "development" | "staging" | "production";
  thresholds: MemoryThresholds;
  monitoring: {
    interval: number; // milliseconds
    maxSnapshots: number;
    enablePerformanceObservers: boolean;
    enableComponentTracking: boolean;
    enableStoreTracking: boolean;
    enableAutomaticCleanup: boolean;
  };
  alerts: {
    enableBrowserNotifications: boolean;
    enableConsoleLogging: boolean;
    enableTelemetry: boolean;
    maxAlerts: number;
    alertCooldown: number; // milliseconds
  };
  reporting: {
    enableErrorReporting: boolean;
    enableAnalytics: boolean;
    enableExport: boolean;
    reportingEndpoint?: string;
    analyticsKey?: string;
  };
  ui: {
    showWidget: boolean;
    widgetPosition: "top-right" | "top-left" | "bottom-right" | "bottom-left";
    widgetSize: "compact" | "normal" | "large";
    autoHide: boolean;
    expandByDefault: boolean;
  };
  cleanup: {
    enableAutomaticGC: boolean;
    gcThreshold: number; // MB
    storeCleanupThreshold: number; // MB
    componentCleanupThreshold: number; // MB
    cleanupInterval: number; // milliseconds
  };
}

/**
 * Development environment configuration
 * - More lenient thresholds for development workflow
 * - Enhanced debugging features
 * - Visible widget for monitoring
 */
const developmentConfig: MemoryMonitoringConfig = {
  enabled: true,
  environment: "development",
  thresholds: {
    warningThreshold: 150, // 150MB - Higher for development
    criticalThreshold: 300, // 300MB - Higher for development
    leakDetectionWindow: 3, // 3 minutes - Shorter for faster feedback
    minimumGrowthRate: 20, // 20MB per minute - More lenient
    maxSnapshots: 50, // Fewer snapshots in dev
  },
  monitoring: {
    interval: 15000, // 15 seconds - More frequent monitoring
    maxSnapshots: 50,
    enablePerformanceObservers: true,
    enableComponentTracking: true,
    enableStoreTracking: true,
    enableAutomaticCleanup: false, // Manual control in development
  },
  alerts: {
    enableBrowserNotifications: false, // Don't spam notifications in dev
    enableConsoleLogging: true, // Always log to console
    enableTelemetry: false, // No telemetry in development
    maxAlerts: 20,
    alertCooldown: 10000, // 10 seconds
  },
  reporting: {
    enableErrorReporting: false,
    enableAnalytics: false,
    enableExport: true, // Allow manual export for debugging
  },
  ui: {
    showWidget: true, // Always show in development
    widgetPosition: "top-right",
    widgetSize: "normal",
    autoHide: false, // Keep visible for debugging
    expandByDefault: true,
  },
  cleanup: {
    enableAutomaticGC: true,
    gcThreshold: 200, // 200MB
    storeCleanupThreshold: 50, // 50MB
    componentCleanupThreshold: 30, // 30MB
    cleanupInterval: 60000, // 1 minute
  },
};

/**
 * Staging environment configuration
 * - Production-like thresholds with enhanced monitoring
 * - Limited UI elements
 * - Enhanced reporting for testing
 */
const stagingConfig: MemoryMonitoringConfig = {
  enabled: true,
  environment: "staging",
  thresholds: {
    warningThreshold: 100, // 100MB
    criticalThreshold: 200, // 200MB
    leakDetectionWindow: 5, // 5 minutes
    minimumGrowthRate: 15, // 15MB per minute
    maxSnapshots: 75,
  },
  monitoring: {
    interval: 30000, // 30 seconds
    maxSnapshots: 75,
    enablePerformanceObservers: true,
    enableComponentTracking: true,
    enableStoreTracking: true,
    enableAutomaticCleanup: true,
  },
  alerts: {
    enableBrowserNotifications: true,
    enableConsoleLogging: true,
    enableTelemetry: true, // Enable for staging testing
    maxAlerts: 15,
    alertCooldown: 30000, // 30 seconds
  },
  reporting: {
    enableErrorReporting: true,
    enableAnalytics: true,
    enableExport: true,
    reportingEndpoint: import.meta.env.VITE_STAGING_MONITORING_ENDPOINT,
    analyticsKey: import.meta.env.VITE_STAGING_ANALYTICS_KEY,
  },
  ui: {
    showWidget: true, // Show for staging testing
    widgetPosition: "bottom-right",
    widgetSize: "compact",
    autoHide: true, // Auto-hide when normal
    expandByDefault: false,
  },
  cleanup: {
    enableAutomaticGC: true,
    gcThreshold: 150, // 150MB
    storeCleanupThreshold: 30, // 30MB
    componentCleanupThreshold: 20, // 20MB
    cleanupInterval: 120000, // 2 minutes
  },
};

/**
 * Production environment configuration
 * - Strict thresholds for optimal performance
 * - Minimal UI impact
 * - Full telemetry and reporting
 */
const productionConfig: MemoryMonitoringConfig = {
  enabled: true,
  environment: "production",
  thresholds: {
    warningThreshold: 80, // 80MB - Strict for production
    criticalThreshold: 150, // 150MB - Conservative limit
    leakDetectionWindow: 10, // 10 minutes - Longer observation
    minimumGrowthRate: 8, // 8MB per minute - Strict growth detection
    maxSnapshots: 100,
  },
  monitoring: {
    interval: 60000, // 1 minute - Less frequent to reduce overhead
    maxSnapshots: 100,
    enablePerformanceObservers: true,
    enableComponentTracking: true,
    enableStoreTracking: true,
    enableAutomaticCleanup: true,
  },
  alerts: {
    enableBrowserNotifications: true, // Critical alerts only
    enableConsoleLogging: false, // Reduce console noise in production
    enableTelemetry: true, // Full telemetry
    maxAlerts: 10,
    alertCooldown: 60000, // 1 minute
  },
  reporting: {
    enableErrorReporting: true,
    enableAnalytics: true,
    enableExport: false, // Security: disable export in production
    reportingEndpoint: import.meta.env.VITE_MONITORING_ENDPOINT,
    analyticsKey: import.meta.env.VITE_ANALYTICS_KEY,
  },
  ui: {
    showWidget: false, // Hidden in production by default
    widgetPosition: "bottom-right",
    widgetSize: "compact",
    autoHide: true,
    expandByDefault: false,
  },
  cleanup: {
    enableAutomaticGC: true,
    gcThreshold: 100, // 100MB
    storeCleanupThreshold: 20, // 20MB
    componentCleanupThreshold: 15, // 15MB
    cleanupInterval: 180000, // 3 minutes
  },
};

/**
 * Get configuration based on current environment
 */
export function getMemoryMonitoringConfig(): MemoryMonitoringConfig {
  const env = import.meta.env.MODE as "development" | "staging" | "production";

  switch (env) {
    case "production":
      return productionConfig;
    case "staging":
      return stagingConfig;
    case "development":
    default:
      return developmentConfig;
  }
}

/**
 * Override configuration with custom settings
 */
export function createCustomConfig(
  overrides: Partial<MemoryMonitoringConfig>,
): MemoryMonitoringConfig {
  const baseConfig = getMemoryMonitoringConfig();

  return {
    ...baseConfig,
    ...overrides,
    thresholds: {
      ...baseConfig.thresholds,
      ...overrides.thresholds,
    },
    monitoring: {
      ...baseConfig.monitoring,
      ...overrides.monitoring,
    },
    alerts: {
      ...baseConfig.alerts,
      ...overrides.alerts,
    },
    reporting: {
      ...baseConfig.reporting,
      ...overrides.reporting,
    },
    ui: {
      ...baseConfig.ui,
      ...overrides.ui,
    },
    cleanup: {
      ...baseConfig.cleanup,
      ...overrides.cleanup,
    },
  };
}

/**
 * Configuration presets for specific use cases
 */
export const memoryConfigPresets = {
  /**
   * High-performance mode: Strict monitoring with aggressive cleanup
   */
  highPerformance: {
    thresholds: {
      warningThreshold: 50,
      criticalThreshold: 100,
      minimumGrowthRate: 5,
    },
    monitoring: {
      interval: 15000,
      enableAutomaticCleanup: true,
    },
    cleanup: {
      enableAutomaticGC: true,
      gcThreshold: 60,
      cleanupInterval: 60000,
    },
  } as Partial<MemoryMonitoringConfig>,

  /**
   * Debug mode: Enhanced monitoring and reporting
   */
  debug: {
    monitoring: {
      interval: 5000,
      enablePerformanceObservers: true,
      enableComponentTracking: true,
      enableStoreTracking: true,
    },
    alerts: {
      enableConsoleLogging: true,
      maxAlerts: 50,
      alertCooldown: 5000,
    },
    ui: {
      showWidget: true,
      widgetSize: "large",
      expandByDefault: true,
      autoHide: false,
    },
  } as Partial<MemoryMonitoringConfig>,

  /**
   * Minimal mode: Basic monitoring with minimal overhead
   */
  minimal: {
    enabled: true,
    monitoring: {
      interval: 120000, // 2 minutes
      enablePerformanceObservers: false,
      enableComponentTracking: false,
      enableStoreTracking: false,
      enableAutomaticCleanup: false,
    },
    alerts: {
      enableBrowserNotifications: false,
      enableConsoleLogging: false,
      maxAlerts: 5,
    },
    ui: {
      showWidget: false,
    },
    reporting: {
      enableErrorReporting: false,
      enableAnalytics: false,
      enableExport: false,
    },
  } as Partial<MemoryMonitoringConfig>,

  /**
   * Testing mode: Configuration for automated testing
   */
  testing: {
    enabled: false, // Disabled by default for tests
    monitoring: {
      interval: 1000,
      maxSnapshots: 20,
    },
    thresholds: {
      warningThreshold: 500, // Very high thresholds for testing
      criticalThreshold: 1000,
      minimumGrowthRate: 100,
    },
    alerts: {
      enableBrowserNotifications: false,
      enableConsoleLogging: false,
      enableTelemetry: false,
    },
    ui: {
      showWidget: false,
    },
  } as Partial<MemoryMonitoringConfig>,
};

/**
 * Validate configuration object
 */
export function validateConfig(
  config: Partial<MemoryMonitoringConfig>,
): string[] {
  const errors: string[] = [];

  if (config.thresholds) {
    const { warningThreshold, criticalThreshold, minimumGrowthRate } =
      config.thresholds;

    if (
      warningThreshold &&
      criticalThreshold &&
      warningThreshold >= criticalThreshold
    ) {
      errors.push("Warning threshold must be less than critical threshold");
    }

    if (minimumGrowthRate && minimumGrowthRate < 0) {
      errors.push("Minimum growth rate must be positive");
    }
  }

  if (config.monitoring) {
    const { interval, maxSnapshots } = config.monitoring;

    if (interval && interval < 1000) {
      errors.push("Monitoring interval must be at least 1000ms");
    }

    if (maxSnapshots && maxSnapshots < 10) {
      errors.push("Max snapshots must be at least 10");
    }
  }

  if (config.cleanup) {
    const { cleanupInterval, gcThreshold } = config.cleanup;

    if (cleanupInterval && cleanupInterval < 30000) {
      errors.push("Cleanup interval must be at least 30 seconds");
    }

    if (gcThreshold && gcThreshold < 10) {
      errors.push("GC threshold must be at least 10MB");
    }
  }

  return errors;
}

/**
 * Get configuration for specific feature
 */
export function getFeatureConfig<K extends keyof MemoryMonitoringConfig>(
  feature: K,
): MemoryMonitoringConfig[K] {
  return getMemoryMonitoringConfig()[feature];
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(
  feature: keyof MemoryMonitoringConfig["monitoring"],
): boolean {
  const config = getMemoryMonitoringConfig();
  return config.enabled && config.monitoring[feature];
}

/**
 * Get environment-specific override from localStorage (development only)
 */
export function getLocalStorageOverrides(): Partial<MemoryMonitoringConfig> | null {
  if (
    import.meta.env.MODE !== "development" ||
    typeof localStorage === "undefined"
  ) {
    return null;
  }

  try {
    const stored = localStorage.getItem("memory-monitoring-config");
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn(
      "Failed to parse memory monitoring config from localStorage:",
      error,
    );
    return null;
  }
}

/**
 * Save configuration override to localStorage (development only)
 */
export function saveLocalStorageOverrides(
  config: Partial<MemoryMonitoringConfig>,
): void {
  if (
    import.meta.env.MODE !== "development" ||
    typeof localStorage === "undefined"
  ) {
    return;
  }

  try {
    localStorage.setItem("memory-monitoring-config", JSON.stringify(config));
  } catch (error) {
    console.warn(
      "Failed to save memory monitoring config to localStorage:",
      error,
    );
  }
}

/**
 * Get final configuration with all overrides applied
 */
export function getFinalConfig(): MemoryMonitoringConfig {
  let config = getMemoryMonitoringConfig();

  // Apply localStorage overrides in development
  const localOverrides = getLocalStorageOverrides();
  if (localOverrides) {
    config = createCustomConfig(localOverrides);
  }

  // Apply URL parameter overrides
  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get("memory-debug") === "true") {
      config = createCustomConfig(memoryConfigPresets.debug);
    }

    if (urlParams.get("memory-minimal") === "true") {
      config = createCustomConfig(memoryConfigPresets.minimal);
    }

    if (urlParams.get("memory-widget") === "true") {
      config.ui.showWidget = true;
    }

    if (urlParams.get("memory-widget") === "false") {
      config.ui.showWidget = false;
    }
  }

  return config;
}

// Export default configuration
export default getMemoryMonitoringConfig();

// Export configurations for each environment
export { developmentConfig, stagingConfig, productionConfig };
