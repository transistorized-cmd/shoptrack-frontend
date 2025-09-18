/**
 * Memory Monitoring Vue Plugin
 *
 * Automatically initializes memory monitoring across the entire Vue application.
 * This plugin sets up global memory monitoring, registers all stores for tracking,
 * and provides global access to memory monitoring functionality.
 */

import type { App } from 'vue';
import { memoryMonitoringService } from '@/services/memoryMonitoring.service';
import { useMemoryMonitoringStore } from '@/stores/memoryMonitoring.store';
import { getFinalConfig } from '@/config/memoryMonitoring.config';
import type { MemoryMonitoringConfig } from '@/config/memoryMonitoring.config';

export interface MemoryMonitoringPluginOptions {
  config?: Partial<MemoryMonitoringConfig>;
  autoStart?: boolean;
  registerAllStores?: boolean;
  showWidget?: boolean;
}

/**
 * Memory monitoring plugin for Vue
 */
export const memoryMonitoringPlugin = {
  install(app: App, options: MemoryMonitoringPluginOptions = {}) {
    const {
      config: configOverrides = {},
      autoStart = true,
      registerAllStores = true,
      showWidget
    } = options;

    // Get final configuration with overrides
    let config = getFinalConfig();
    if (Object.keys(configOverrides).length > 0) {
      config = { ...config, ...configOverrides };
    }

    // Override widget visibility if specified
    if (showWidget !== undefined) {
      config.ui.showWidget = showWidget;
    }

    // Skip initialization if disabled
    if (!config.enabled) {
      console.log('Memory monitoring disabled');
      return;
    }

    // Initialize memory monitoring store
    const memoryStore = useMemoryMonitoringStore();

    // Provide memory monitoring globally
    app.provide('memoryMonitoring', {
      service: memoryMonitoringService,
      store: memoryStore,
      config
    });

    // Add global properties
    app.config.globalProperties.$memoryMonitoring = {
      service: memoryMonitoringService,
      store: memoryStore,
      config
    };

    // Auto-start monitoring if enabled
    if (autoStart) {
      // Initialize after Vue app is mounted
      app.mixin({
        async mounted() {
          // Only initialize once from the root component
          if (this.$root === this && !memoryStore.isEnabled) {
            try {
              await memoryStore.initializeMonitoring(config.thresholds);
              console.log('Memory monitoring initialized successfully');

              // Register all Pinia stores if requested
              if (registerAllStores) {
                registerPiniaStores(app, memoryStore);
              }

              // Setup automatic store registration for future stores
              setupAutomaticStoreRegistration(app, memoryStore);

            } catch (error) {
              console.error('Failed to initialize memory monitoring:', error);
            }
          }
        }
      });
    }

    // Add widget to app if enabled
    if (config.ui.showWidget) {
      addMemoryWidget(app, config);
    }

    // Development helpers
    if (process.env.NODE_ENV === 'development') {
      addDevelopmentHelpers(app, memoryStore, config);
    }

    console.log('Memory monitoring plugin installed', { config: config.environment });
  }
};

/**
 * Register all existing Pinia stores for memory monitoring
 */
function registerPiniaStores(app: App, memoryStore: any) {
  try {
    // Get Pinia instance from the app
    const pinia = app.config.globalProperties.$pinia;
    if (!pinia) {
      console.warn('Pinia not found, cannot register stores for memory monitoring');
      return;
    }

    // Register all existing stores
    const storeCount = pinia._s.size;
    pinia._s.forEach((store: any, key: string) => {
      try {
        memoryStore.registerStore(key, store);
      } catch (error) {
        console.warn(`Failed to register store ${key}:`, error);
      }
    });

    console.log(`Registered ${storeCount} Pinia stores for memory monitoring`);
  } catch (error) {
    console.error('Failed to register Pinia stores:', error);
  }
}

/**
 * Setup automatic registration for new stores
 */
function setupAutomaticStoreRegistration(app: App, memoryStore: any) {
  try {
    const pinia = app.config.globalProperties.$pinia;
    if (!pinia) return;

    // Intercept store creation
    const originalUseStore = pinia.use;
    pinia.use = function(plugin: any) {
      // Call original use function
      const result = originalUseStore.call(this, plugin);

      // Register any new stores
      this._s.forEach((store: any, key: string) => {
        if (!memoryStore.storeInfo.has(key)) {
          try {
            memoryStore.registerStore(key, store);
            console.log(`Auto-registered new store: ${key}`);
          } catch (error) {
            console.warn(`Failed to auto-register store ${key}:`, error);
          }
        }
      });

      return result;
    };
  } catch (error) {
    console.error('Failed to setup automatic store registration:', error);
  }
}

/**
 * Add memory monitoring widget to the application
 */
function addMemoryWidget(app: App, config: MemoryMonitoringConfig) {
  try {
    // Create widget container
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'memory-monitoring-widget-container';
    widgetContainer.style.position = 'fixed';
    widgetContainer.style.zIndex = '9999';

    // Position the widget
    const position = config.ui.widgetPosition;
    if (position.includes('top')) {
      widgetContainer.style.top = '20px';
    } else {
      widgetContainer.style.bottom = '20px';
    }

    if (position.includes('right')) {
      widgetContainer.style.right = '20px';
    } else {
      widgetContainer.style.left = '20px';
    }

    // Add to DOM when app is mounted
    app.mixin({
      mounted() {
        if (this.$root === this && !document.getElementById('memory-monitoring-widget-container')) {
          document.body.appendChild(widgetContainer);

          // Dynamically import and mount the widget component
          import('@/components/monitoring/MemoryMonitoringWidget.vue').then((module) => {
            const MemoryWidget = module.default;
            const widgetApp = app.mount(widgetContainer);
            // Note: This is a simplified approach. In a real implementation,
            // you might want to use a more sophisticated mounting strategy.
          }).catch((error) => {
            console.error('Failed to load memory monitoring widget:', error);
          });
        }
      }
    });
  } catch (error) {
    console.error('Failed to add memory widget:', error);
  }
}

/**
 * Add development helpers and debugging tools
 */
function addDevelopmentHelpers(app: App, memoryStore: any, config: MemoryMonitoringConfig) {
  // Add global window helpers for debugging
  if (typeof window !== 'undefined') {
    (window as any).memoryMonitoring = {
      service: memoryMonitoringService,
      store: memoryStore,
      config,

      // Helper functions
      takeSnapshot: () => memoryMonitoringService.takeSnapshot(),
      getStatus: () => memoryStore.getServiceStatus(),
      exportData: () => memoryStore.exportMonitoringData(),
      forceGC: () => memoryMonitoringService.forceGarbageCollection(),
      clearData: () => memoryMonitoringService.clearData(),

      // Configuration helpers
      updateConfig: (newConfig: Partial<MemoryMonitoringConfig>) => {
        memoryStore.updateThresholds(newConfig.thresholds || {});
      },

      // Store helpers
      listStores: () => Array.from(memoryStore.storeInfo.keys()),
      getStoreInfo: (storeName: string) => memoryStore.storeInfo.get(storeName),
      clearStore: (storeName: string) => memoryStore.clearStore(storeName),
      optimizeStores: () => memoryStore.optimizeStores(),

      // Debug helpers
      simulateLeak: () => {
        // Create a memory leak for testing
        const leakyArray: any[] = [];
        const interval = setInterval(() => {
          for (let i = 0; i < 1000; i++) {
            leakyArray.push(new Array(1000).fill('memory leak test'));
          }
        }, 100);

        setTimeout(() => clearInterval(interval), 5000);
        console.warn('Simulated memory leak for 5 seconds');
      },

      enableDebugMode: () => {
        memoryStore.updateThresholds({
          warningThreshold: 20,
          criticalThreshold: 50,
          minimumGrowthRate: 2
        });
        console.log('Debug mode enabled - lowered thresholds for testing');
      }
    };

    console.log('Memory monitoring development helpers available on window.memoryMonitoring');
  }

  // Add Vue devtools integration if available
  if (app.config.devtools) {
    try {
      // Register memory monitoring data with Vue devtools
      app.config.globalProperties.__VUE_DEVTOOLS_MEMORY_MONITORING__ = {
        getCurrentMemory: () => memoryStore.currentMemory,
        getMemoryHistory: () => memoryStore.memoryHistory,
        getAlerts: () => memoryStore.alerts,
        getLeaks: () => memoryStore.leaks,
        getStoreInfo: () => memoryStore.storeInfo
      };
    } catch (error) {
      console.warn('Failed to register with Vue devtools:', error);
    }
  }
}

/**
 * Composable to inject memory monitoring from anywhere in the app
 */
export function useGlobalMemoryMonitoring() {
  const inject = require('vue').inject;

  const memoryMonitoring = inject('memoryMonitoring', null);

  if (!memoryMonitoring) {
    console.warn('Memory monitoring not found. Make sure the plugin is installed.');
    return {
      service: null,
      store: null,
      config: null
    };
  }

  return memoryMonitoring;
}

/**
 * Helper to manually initialize memory monitoring
 */
export async function initializeMemoryMonitoring(
  config?: Partial<MemoryMonitoringConfig>
): Promise<void> {
  const finalConfig = config ? { ...getFinalConfig(), ...config } : getFinalConfig();

  if (!finalConfig.enabled) {
    console.log('Memory monitoring disabled');
    return;
  }

  try {
    const memoryStore = useMemoryMonitoringStore();
    await memoryStore.initializeMonitoring(finalConfig.thresholds);
    console.log('Memory monitoring initialized manually');
  } catch (error) {
    console.error('Failed to initialize memory monitoring:', error);
    throw error;
  }
}

/**
 * Helper to create memory monitoring plugin with specific configuration
 */
export function createMemoryMonitoringPlugin(
  options: MemoryMonitoringPluginOptions = {}
) {
  return {
    install(app: App) {
      memoryMonitoringPlugin.install(app, options);
    }
  };
}

// Export plugin as default
export default memoryMonitoringPlugin;