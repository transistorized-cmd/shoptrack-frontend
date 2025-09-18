import { inject, provide, readonly, ref, type InjectionKey } from "vue";
import type { IPluginRegistry } from "@/plugins/interfaces/IPluginRegistry";
import type { PluginConfig } from "@/plugins/types/IPlugin";
import { container, SERVICE_TOKENS } from "@/core/di/Container";

// Injection key for the plugin registry
export const PLUGIN_REGISTRY_KEY: InjectionKey<IPluginRegistry> =
  Symbol("PluginRegistry");

/**
 * Vue composable for accessing the plugin registry
 * Provides reactive access to plugin operations
 */
export function usePluginRegistry() {
  // Try to inject from Vue's DI system first
  let registry = inject(PLUGIN_REGISTRY_KEY);

  // Fallback to global DI container
  if (!registry && container.isRegistered(SERVICE_TOKENS.PLUGIN_REGISTRY)) {
    registry = container.resolve<IPluginRegistry>(
      SERVICE_TOKENS.PLUGIN_REGISTRY,
    );
  }

  if (!registry) {
    throw new Error(
      "Plugin registry not found. Make sure it is registered in the DI container or provided via Vue inject/provide.",
    );
  }

  // Reactive state for UI components
  const plugins = ref<PluginConfig[]>(registry.getAllPlugins());
  const pluginCount = ref(registry.getPluginCount());

  // Refresh reactive state
  const refreshState = () => {
    plugins.value = registry.getAllPlugins();
    pluginCount.value = registry.getPluginCount();
  };

  // Plugin operations with reactive updates
  const registerPlugin = (config: PluginConfig) => {
    registry.registerPlugin(config);
    refreshState();
  };

  const unregisterPlugin = (id: string): boolean => {
    const result = registry.unregisterPlugin(id);
    if (result) {
      refreshState();
    }
    return result;
  };

  const clearAllPlugins = () => {
    registry.clearAllPlugins();
    refreshState();
  };

  // Non-mutating operations (no need for reactivity updates)
  const getPlugin = (id: string) => registry.getPlugin(id);
  const getPluginsByFileType = (fileExtension: string) =>
    registry.getPluginsByFileType(fileExtension);
  const detectBestPlugin = (filename: string) =>
    registry.detectBestPlugin(filename);
  const getFileTypePluginMap = () => registry.getFileTypePluginMap();
  const isPluginRegistered = (id: string) => registry.isPluginRegistered(id);

  return {
    // Reactive state (readonly to prevent external mutations)
    plugins: readonly(plugins),
    pluginCount: readonly(pluginCount),

    // Plugin operations
    registerPlugin,
    unregisterPlugin,
    clearAllPlugins,
    getPlugin,
    getPluginsByFileType,
    detectBestPlugin,
    getFileTypePluginMap,
    isPluginRegistered,

    // Utility
    refreshState,

    // Direct registry access (for advanced use cases)
    registry,
  };
}

/**
 * Provide the plugin registry to child components
 * Should be called in a parent component or plugin setup
 */
export function providePluginRegistry(registry: IPluginRegistry) {
  provide(PLUGIN_REGISTRY_KEY, registry);
  return registry;
}

/**
 * Create a plugin registry composable with custom configuration
 * Useful for testing or specific plugin configurations
 */
export function createPluginRegistryComposable(registry: IPluginRegistry) {
  return () => {
    const plugins = ref<PluginConfig[]>(registry.getAllPlugins());
    const pluginCount = ref(registry.getPluginCount());

    const refreshState = () => {
      plugins.value = registry.getAllPlugins();
      pluginCount.value = registry.getPluginCount();
    };

    const registerPlugin = (config: PluginConfig) => {
      registry.registerPlugin(config);
      refreshState();
    };

    const unregisterPlugin = (id: string): boolean => {
      const result = registry.unregisterPlugin(id);
      if (result) {
        refreshState();
      }
      return result;
    };

    const clearAllPlugins = () => {
      registry.clearAllPlugins();
      refreshState();
    };

    return {
      plugins: readonly(plugins),
      pluginCount: readonly(pluginCount),
      registerPlugin,
      unregisterPlugin,
      clearAllPlugins,
      getPlugin: (id: string) => registry.getPlugin(id),
      getPluginsByFileType: (fileExtension: string) =>
        registry.getPluginsByFileType(fileExtension),
      detectBestPlugin: (filename: string) =>
        registry.detectBestPlugin(filename),
      getFileTypePluginMap: () => registry.getFileTypePluginMap(),
      isPluginRegistered: (id: string) => registry.isPluginRegistered(id),
      refreshState,
      registry,
    };
  };
}
