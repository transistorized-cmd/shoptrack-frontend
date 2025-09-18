/**
 * Pinia Store for Memory Monitoring
 *
 * Provides centralized state management for memory monitoring across the application.
 * This store integrates with the memory monitoring service and provides reactive
 * state for memory usage, alerts, and leak detection.
 */

import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { memoryMonitoringService, type MemorySnapshot, type MemoryAlert, type MemoryLeak, type MemoryThresholds } from '@/services/memoryMonitoring.service';

export interface StoreMemoryInfo {
  storeName: string;
  stateSize: number; // Estimated size in bytes
  actionCount: number;
  mutationCount: number;
  lastAccessed: number;
  createdAt: number;
  isActive: boolean;
}

export interface MemoryMonitoringState {
  isEnabled: boolean;
  currentMemory: number;
  memoryHistory: MemorySnapshot[];
  alerts: MemoryAlert[];
  leaks: MemoryLeak[];
  storeInfo: Map<string, StoreMemoryInfo>;
  thresholds: MemoryThresholds;
  lastUpdate: number;
  monitoringStartTime: number;
}

export const useMemoryMonitoringStore = defineStore('memoryMonitoring', () => {
  // State
  const isEnabled = ref(false);
  const currentMemory = ref(0);
  const memoryHistory = ref<MemorySnapshot[]>([]);
  const alerts = ref<MemoryAlert[]>([]);
  const leaks = ref<MemoryLeak[]>([]);
  const storeInfo = ref(new Map<string, StoreMemoryInfo>());
  const thresholds = ref<MemoryThresholds>({
    warningThreshold: 100,
    criticalThreshold: 250,
    leakDetectionWindow: 5,
    minimumGrowthRate: 10,
    maxSnapshots: 100
  });
  const lastUpdate = ref(0);
  const monitoringStartTime = ref(0);

  // Internal state
  let updateInterval: number | null = null;
  let storeWatchers: Map<string, () => void> = new Map();
  let globalStoreRegistry: Map<string, any> = new Map();

  // Computed values
  const memoryTrend = computed(() => {
    if (memoryHistory.value.length < 2) return 'stable';

    const recent = memoryHistory.value.slice(-10);
    const first = recent[0];
    const last = recent[recent.length - 1];

    if (!first || !last) return 'stable';

    const growth = (last.heapUsed - first.heapUsed) / 1024 / 1024; // MB
    const timeSpan = (last.timestamp - first.timestamp) / 1000 / 60; // minutes

    if (timeSpan > 0) {
      const growthRate = growth / timeSpan; // MB per minute
      if (growthRate > 5) return 'rapidly-increasing';
      if (growthRate > 2) return 'increasing';
      if (growthRate < -2) return 'decreasing';
    }

    return 'stable';
  });

  const memoryStatus = computed(() => {
    if (currentMemory.value > thresholds.value.criticalThreshold) return 'critical';
    if (currentMemory.value > thresholds.value.warningThreshold) return 'warning';
    return 'normal';
  });

  const criticalAlerts = computed(() => {
    return alerts.value.filter(alert => alert.type === 'critical');
  });

  const activeLeaks = computed(() => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return leaks.value.filter(leak => leak.timestamp > oneHourAgo);
  });

  const storeLeaks = computed(() => {
    return leaks.value.filter(leak => leak.type === 'store');
  });

  const totalStateSize = computed(() => {
    let total = 0;
    storeInfo.value.forEach(info => {
      total += info.stateSize;
    });
    return total;
  });

  const mostActiveStores = computed(() => {
    return Array.from(storeInfo.value.values())
      .sort((a, b) => b.actionCount - a.actionCount)
      .slice(0, 5);
  });

  // Actions
  const initializeMonitoring = async (customThresholds?: Partial<MemoryThresholds>) => {
    if (isEnabled.value) {
      console.warn('Memory monitoring is already enabled');
      return;
    }

    try {
      // Update thresholds if provided
      if (customThresholds) {
        thresholds.value = { ...thresholds.value, ...customThresholds };
      }

      // Initialize the memory monitoring service
      memoryMonitoringService.initialize(thresholds.value);

      isEnabled.value = true;
      monitoringStartTime.value = Date.now();

      // Start periodic updates
      startPeriodicUpdates();

      // Setup event listeners
      setupEventListeners();

      console.log('Memory monitoring store initialized');
    } catch (error) {
      console.error('Failed to initialize memory monitoring:', error);
      throw error;
    }
  };

  const startPeriodicUpdates = () => {
    if (updateInterval) return;

    updateInterval = window.setInterval(() => {
      updateMemoryMetrics();
    }, 30000); // Update every 30 seconds
  };

  const stopPeriodicUpdates = () => {
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
  };

  const updateMemoryMetrics = () => {
    if (!isEnabled.value) return;

    try {
      const status = memoryMonitoringService.getMemoryStatus();

      currentMemory.value = status.currentMemory;
      memoryHistory.value = memoryMonitoringService.getMemoryHistory(60); // Last hour
      alerts.value = status.recentAlerts;
      leaks.value = status.recentLeaks;
      lastUpdate.value = Date.now();

      // Check for store-specific memory issues
      checkStoreMemoryUsage();
    } catch (error) {
      console.error('Failed to update memory metrics:', error);
    }
  };

  const registerStore = (storeName: string, storeInstance: any) => {
    if (globalStoreRegistry.has(storeName)) {
      console.warn(`Store ${storeName} is already registered`);
      return;
    }

    const storeMemoryInfo: StoreMemoryInfo = {
      storeName,
      stateSize: estimateObjectSize(storeInstance.$state || {}),
      actionCount: 0,
      mutationCount: 0,
      lastAccessed: Date.now(),
      createdAt: Date.now(),
      isActive: true
    };

    storeInfo.value.set(storeName, storeMemoryInfo);
    globalStoreRegistry.set(storeName, storeInstance);

    // Set up watchers for the store
    setupStoreWatchers(storeName, storeInstance);

    console.log(`Store ${storeName} registered for memory monitoring`);
  };

  const unregisterStore = (storeName: string) => {
    // Remove watchers
    const unwatcher = storeWatchers.get(storeName);
    if (unwatcher) {
      unwatcher();
      storeWatchers.delete(storeName);
    }

    // Mark as inactive
    const info = storeInfo.value.get(storeName);
    if (info) {
      info.isActive = false;
    }

    globalStoreRegistry.delete(storeName);

    console.log(`Store ${storeName} unregistered from memory monitoring`);
  };

  const setupStoreWatchers = (storeName: string, storeInstance: any) => {
    if (!storeInstance.$state) return;

    // Watch for state changes
    const unwatcher = watch(
      () => storeInstance.$state,
      (newState) => {
        const info = storeInfo.value.get(storeName);
        if (info) {
          info.stateSize = estimateObjectSize(newState);
          info.mutationCount++;
          info.lastAccessed = Date.now();

          // Check for potential memory issues
          checkStoreMemoryIssues(storeName, info);
        }
      },
      { deep: true }
    );

    storeWatchers.set(storeName, unwatcher);

    // Track actions if possible
    if (storeInstance.$onAction) {
      storeInstance.$onAction(() => {
        const info = storeInfo.value.get(storeName);
        if (info) {
          info.actionCount++;
          info.lastAccessed = Date.now();
        }
      });
    }
  };

  const checkStoreMemoryUsage = () => {
    storeInfo.value.forEach((info, storeName) => {
      checkStoreMemoryIssues(storeName, info);
    });
  };

  const checkStoreMemoryIssues = (storeName: string, info: StoreMemoryInfo) => {
    const sizeMB = info.stateSize / 1024 / 1024;

    // Check for large state size
    if (sizeMB > 50) { // 50MB threshold
      reportStoreMemoryIssue(storeName, {
        type: 'large_state',
        severity: sizeMB > 100 ? 'critical' : 'high',
        description: `Store ${storeName} has large state: ${sizeMB.toFixed(2)}MB`,
        size: sizeMB
      });
    }

    // Check for inactive stores with large memory usage
    const inactiveTime = (Date.now() - info.lastAccessed) / 1000 / 60; // minutes
    if (inactiveTime > 30 && sizeMB > 10) { // Inactive for 30+ minutes with 10+ MB
      reportStoreMemoryIssue(storeName, {
        type: 'inactive_store',
        severity: 'medium',
        description: `Store ${storeName} inactive for ${inactiveTime.toFixed(1)} minutes with ${sizeMB.toFixed(2)}MB state`,
        size: sizeMB
      });
    }
  };

  const reportStoreMemoryIssue = (storeName: string, issue: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    size: number;
  }) => {
    console.warn(`Store memory issue detected:`, issue);

    // Create a memory leak entry
    const leak: MemoryLeak = {
      id: `store_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'store',
      severity: issue.severity,
      description: issue.description,
      growth: issue.size,
      duration: 0,
      store: storeName,
      timestamp: Date.now()
    };

    leaks.value.unshift(leak);
    if (leaks.value.length > 50) {
      leaks.value = leaks.value.slice(0, 50);
    }
  };

  const setupEventListeners = () => {
    if (typeof window === 'undefined') return;

    const handleMemoryAlert = (event: CustomEvent) => {
      const alert = event.detail;
      alerts.value.unshift(alert);
      if (alerts.value.length > 20) {
        alerts.value = alerts.value.slice(0, 20);
      }
    };

    window.addEventListener('memory-alert', handleMemoryAlert as EventListener);
  };

  const clearStore = (storeName: string) => {
    const storeInstance = globalStoreRegistry.get(storeName);
    if (storeInstance && storeInstance.$reset) {
      try {
        storeInstance.$reset();

        const info = storeInfo.value.get(storeName);
        if (info) {
          info.stateSize = estimateObjectSize(storeInstance.$state || {});
          info.lastAccessed = Date.now();
        }

        console.log(`Store ${storeName} cleared`);
      } catch (error) {
        console.error(`Failed to clear store ${storeName}:`, error);
      }
    }
  };

  const clearAllStores = () => {
    globalStoreRegistry.forEach((storeInstance, storeName) => {
      clearStore(storeName);
    });
  };

  const optimizeStores = () => {
    // Find stores that can be optimized
    const largStores = Array.from(storeInfo.value.entries())
      .filter(([_, info]) => info.stateSize > 10 * 1024 * 1024) // > 10MB
      .sort((a, b) => b[1].stateSize - a[1].stateSize);

    largStores.forEach(([storeName, info]) => {
      console.log(`Optimizing large store: ${storeName} (${(info.stateSize / 1024 / 1024).toFixed(2)}MB)`);

      // Try to clear the store if it's been inactive
      const inactiveTime = (Date.now() - info.lastAccessed) / 1000 / 60;
      if (inactiveTime > 15) { // 15 minutes
        clearStore(storeName);
      }
    });

    // Force garbage collection if available
    memoryMonitoringService.forceGarbageCollection();
  };

  const updateThresholds = (newThresholds: Partial<MemoryThresholds>) => {
    thresholds.value = { ...thresholds.value, ...newThresholds };
    memoryMonitoringService.updateThresholds(thresholds.value);
  };

  const exportMonitoringData = () => {
    const serviceData = memoryMonitoringService.exportData();

    return {
      ...serviceData,
      storeInfo: Object.fromEntries(storeInfo.value),
      storeRegistration: Array.from(globalStoreRegistry.keys()),
      computedMetrics: {
        memoryTrend: memoryTrend.value,
        memoryStatus: memoryStatus.value,
        totalStateSize: totalStateSize.value,
        activeStores: mostActiveStores.value
      }
    };
  };

  const disable = () => {
    if (!isEnabled.value) return;

    stopPeriodicUpdates();
    memoryMonitoringService.stopMonitoring();

    // Remove all store watchers
    storeWatchers.forEach(unwatcher => unwatcher());
    storeWatchers.clear();

    isEnabled.value = false;
    console.log('Memory monitoring disabled');
  };

  // Utility function to estimate object size
  const estimateObjectSize = (obj: any): number => {
    try {
      return new Blob([JSON.stringify(obj)]).size;
    } catch (error) {
      // Fallback estimation
      return JSON.stringify(obj).length * 2; // Rough estimate
    }
  };

  return {
    // State
    isEnabled: readonly(isEnabled),
    currentMemory: readonly(currentMemory),
    memoryHistory: readonly(memoryHistory),
    alerts: readonly(alerts),
    leaks: readonly(leaks),
    storeInfo: readonly(storeInfo),
    thresholds: readonly(thresholds),
    lastUpdate: readonly(lastUpdate),
    monitoringStartTime: readonly(monitoringStartTime),

    // Computed
    memoryTrend,
    memoryStatus,
    criticalAlerts,
    activeLeaks,
    storeLeaks,
    totalStateSize,
    mostActiveStores,

    // Actions
    initializeMonitoring,
    updateMemoryMetrics,
    registerStore,
    unregisterStore,
    clearStore,
    clearAllStores,
    optimizeStores,
    updateThresholds,
    exportMonitoringData,
    disable,

    // Service methods
    forceGC: () => memoryMonitoringService.forceGarbageCollection(),
    takeSnapshot: () => memoryMonitoringService.takeSnapshot(),
    getServiceStatus: () => memoryMonitoringService.getMemoryStatus()
  };
});

function readonly<T>(ref: any) {
  return computed(() => ref.value);
}

export default useMemoryMonitoringStore;