/**
 * Vue Composable for Memory Monitoring
 *
 * Provides Vue-specific memory monitoring capabilities including:
 * - Component lifecycle memory tracking
 * - Reactive data monitoring
 * - Memory leak detection for Vue components
 * - Integration with the global memory monitoring service
 */

import {
  ref,
  onMounted,
  onUnmounted,
  onBeforeUnmount,
  watch,
  computed,
  getCurrentInstance,
} from "vue";
import {
  memoryMonitoringService,
  type MemorySnapshot,
  type MemoryAlert,
  type MemoryLeak,
} from "@/services/memoryMonitoring.service";

export interface ComponentMemoryInfo {
  componentName: string;
  mountTime: number;
  mountMemory: number;
  currentMemory: number;
  memoryGrowth: number;
  maxMemory: number;
  isLeaking: boolean;
}

export interface MemoryMonitoringOptions {
  trackComponent?: boolean;
  trackReactiveData?: boolean;
  alertThreshold?: number; // MB
  monitorInterval?: number; // ms
  enableAutomaticCleanup?: boolean;
}

/**
 * Vue composable for memory monitoring
 */
export function useMemoryMonitoring(options: MemoryMonitoringOptions = {}) {
  const {
    trackComponent = true,
    trackReactiveData = true,
    alertThreshold = 50, // 50MB
    monitorInterval = 30000, // 30 seconds
    enableAutomaticCleanup = true,
  } = options;

  // Reactive state
  const currentMemory = ref(0);
  const memoryHistory = ref<MemorySnapshot[]>([]);
  const alerts = ref<MemoryAlert[]>([]);
  const leaks = ref<MemoryLeak[]>([]);
  const isMonitoring = ref(false);
  const componentInfo = ref<ComponentMemoryInfo | null>(null);

  // Internal state
  let monitoringInterval: number | null = null;
  let componentMountMemory = 0;
  let componentMaxMemory = 0;
  let eventListeners: Array<() => void> = [];

  // Get current Vue component instance
  const instance = getCurrentInstance();
  const componentName =
    instance?.type?.name || instance?.type?.__name || "UnknownComponent";

  /**
   * Initialize memory monitoring for the component
   */
  const initializeMonitoring = () => {
    if (!memoryMonitoringService) {
      console.warn("Memory monitoring service not available");
      return;
    }

    // Initialize global monitoring if not already started
    if (!memoryMonitoringService.getMemoryStatus().isMonitoring) {
      memoryMonitoringService.initialize();
    }

    isMonitoring.value = true;

    // Track component mounting memory
    if (trackComponent) {
      const snapshot = memoryMonitoringService.takeSnapshot();
      componentMountMemory = snapshot.heapUsed / 1024 / 1024; // MB
      componentMaxMemory = componentMountMemory;

      componentInfo.value = {
        componentName,
        mountTime: Date.now(),
        mountMemory: componentMountMemory,
        currentMemory: componentMountMemory,
        memoryGrowth: 0,
        maxMemory: componentMountMemory,
        isLeaking: false,
      };
    }

    // Set up memory monitoring interval
    startComponentMonitoring();

    // Set up event listeners for alerts
    setupEventListeners();

    console.log(
      `Memory monitoring initialized for component: ${componentName}`,
    );
  };

  /**
   * Start component-specific memory monitoring
   */
  const startComponentMonitoring = () => {
    if (monitoringInterval) return;

    monitoringInterval = window.setInterval(() => {
      updateMemoryMetrics();
      checkComponentMemoryLeaks();
    }, monitorInterval);
  };

  /**
   * Stop component memory monitoring
   */
  const stopComponentMonitoring = () => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
    }
  };

  /**
   * Update memory metrics
   */
  const updateMemoryMetrics = () => {
    const status = memoryMonitoringService.getMemoryStatus();
    currentMemory.value = status.currentMemory;

    // Update memory history
    memoryHistory.value = memoryMonitoringService.getMemoryHistory(30); // Last 30 minutes

    // Update alerts and leaks
    alerts.value = status.recentAlerts;
    leaks.value = status.recentLeaks;

    // Update component info
    if (componentInfo.value && trackComponent) {
      const current = status.currentMemory;
      const growth = current - componentInfo.value.mountMemory;

      if (current > componentMaxMemory) {
        componentMaxMemory = current;
      }

      componentInfo.value = {
        ...componentInfo.value,
        currentMemory: current,
        memoryGrowth: growth,
        maxMemory: componentMaxMemory,
        isLeaking: growth > alertThreshold,
      };
    }
  };

  /**
   * Check for component-specific memory leaks
   */
  const checkComponentMemoryLeaks = () => {
    if (!componentInfo.value || !trackComponent) return;

    const { memoryGrowth, mountTime } = componentInfo.value;
    const timeAlive = (Date.now() - mountTime) / 1000 / 60; // minutes

    // Check for significant memory growth over time
    if (memoryGrowth > alertThreshold && timeAlive > 2) {
      // After 2 minutes
      const growthRate = memoryGrowth / timeAlive; // MB per minute

      if (growthRate > 5) {
        // Growing more than 5MB per minute
        reportComponentLeak({
          severity: growthRate > 15 ? "critical" : "high",
          description: `Component ${componentName} memory growing at ${growthRate.toFixed(2)} MB/min`,
          growth: memoryGrowth,
          duration: timeAlive * 60,
        });
      }
    }
  };

  /**
   * Report a component-specific memory leak
   */
  const reportComponentLeak = (leakInfo: {
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    growth: number;
    duration: number;
  }) => {
    console.error(
      `Memory leak detected in component ${componentName}:`,
      leakInfo,
    );

    // Mark component as leaking
    if (componentInfo.value) {
      componentInfo.value.isLeaking = true;
    }

    // In production, you might want to:
    // 1. Send telemetry data
    // 2. Trigger automatic cleanup
    // 3. Show user notification

    if (enableAutomaticCleanup && leakInfo.severity === "critical") {
      performAutomaticCleanup();
    }
  };

  /**
   * Perform automatic memory cleanup
   */
  const performAutomaticCleanup = () => {
    console.log(`Performing automatic cleanup for component: ${componentName}`);

    // Clear any cached data specific to this component
    clearComponentCache();

    // Force garbage collection if available
    memoryMonitoringService.forceGarbageCollection();

    // Emit cleanup event for component to handle
    if (instance) {
      instance.emit("memory-cleanup-needed");
    }
  };

  /**
   * Clear component-specific cached data
   */
  const clearComponentCache = () => {
    // This is a placeholder for component-specific cleanup
    // Components can override this by watching for memory-cleanup-needed event
    console.log(`Clearing cache for component: ${componentName}`);
  };

  /**
   * Setup event listeners for memory alerts
   */
  const setupEventListeners = () => {
    if (typeof window === "undefined") return;

    const handleMemoryAlert = (event: CustomEvent) => {
      const alert = event.detail;
      console.warn("Memory alert received:", alert);

      // Add to local alerts
      alerts.value.unshift(alert);
      if (alerts.value.length > 10) {
        alerts.value = alerts.value.slice(0, 10);
      }
    };

    window.addEventListener("memory-alert", handleMemoryAlert as EventListener);

    eventListeners.push(() => {
      window.removeEventListener(
        "memory-alert",
        handleMemoryAlert as EventListener,
      );
    });
  };

  /**
   * Cleanup function
   */
  const cleanup = () => {
    stopComponentMonitoring();

    // Remove event listeners
    eventListeners.forEach((removeListener) => removeListener());
    eventListeners = [];

    // Log component unmount memory
    if (componentInfo.value && trackComponent) {
      const finalMemory =
        memoryMonitoringService.getMemoryStatus().currentMemory;
      const memoryReleased = componentInfo.value.maxMemory - finalMemory;

      console.log(`Component ${componentName} unmounted:`, {
        memoryAtMount: componentInfo.value.mountMemory.toFixed(2) + "MB",
        maxMemoryUsed: componentInfo.value.maxMemory.toFixed(2) + "MB",
        memoryAtUnmount: finalMemory.toFixed(2) + "MB",
        memoryReleased:
          memoryReleased > 0 ? memoryReleased.toFixed(2) + "MB" : "None",
        wasLeaking: componentInfo.value.isLeaking,
      });
    }

    isMonitoring.value = false;
  };

  /**
   * Manual memory snapshot
   */
  const takeSnapshot = () => {
    return memoryMonitoringService.takeSnapshot();
  };

  /**
   * Force memory analysis
   */
  const analyzeMemory = () => {
    updateMemoryMetrics();
    checkComponentMemoryLeaks();
    return {
      currentMemory: currentMemory.value,
      componentInfo: componentInfo.value,
      alerts: alerts.value,
      leaks: leaks.value,
    };
  };

  // Computed values
  const memoryTrend = computed(() => {
    if (memoryHistory.value.length < 2) return "stable";

    const recent = memoryHistory.value.slice(-5);
    const first = recent[0];
    const last = recent[recent.length - 1];

    const growth = (last.heapUsed - first.heapUsed) / 1024 / 1024; // MB

    if (growth > 20) return "rapidly-increasing";
    if (growth > 10) return "increasing";
    if (growth < -5) return "decreasing";
    return "stable";
  });

  const memoryStatus = computed(() => {
    if (currentMemory.value > 200) return "critical";
    if (currentMemory.value > 100) return "warning";
    return "normal";
  });

  const isComponentLeaking = computed(() => {
    return componentInfo.value?.isLeaking || false;
  });

  // Lifecycle hooks
  onMounted(() => {
    initializeMonitoring();
  });

  onBeforeUnmount(() => {
    cleanup();
  });

  // Watch for reactive data changes if enabled
  if (trackReactiveData) {
    // This is a placeholder for tracking reactive data
    // In a real implementation, you might want to track specific refs/reactive objects
    watch(
      () => currentMemory.value,
      (newMemory, oldMemory) => {
        if (newMemory > oldMemory + 20) {
          // 20MB sudden increase
          console.warn(
            `Sudden memory increase detected: ${(newMemory - oldMemory).toFixed(2)}MB`,
          );
        }
      },
    );
  }

  return {
    // Reactive state
    currentMemory: readonly(currentMemory),
    memoryHistory: readonly(memoryHistory),
    alerts: readonly(alerts),
    leaks: readonly(leaks),
    isMonitoring: readonly(isMonitoring),
    componentInfo: readonly(componentInfo),

    // Computed
    memoryTrend,
    memoryStatus,
    isComponentLeaking,

    // Methods
    takeSnapshot,
    analyzeMemory,
    clearComponentCache,
    performAutomaticCleanup,

    // Service methods
    forceGC: () => memoryMonitoringService.forceGarbageCollection(),
    exportData: () => memoryMonitoringService.exportData(),
    getGlobalStatus: () => memoryMonitoringService.getMemoryStatus(),
  };
}

/**
 * Readonly ref helper
 */
function readonly<T>(ref: any) {
  return computed(() => ref.value);
}

export default useMemoryMonitoring;
