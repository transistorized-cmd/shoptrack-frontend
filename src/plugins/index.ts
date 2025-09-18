// Plugin System Bootstrap
import { getPluginRegistry } from "../core/di/setup";
import { genericReceiptPlugin } from "./definitions/genericReceiptPlugin";
import { amazonOrdersPlugin } from "./definitions/amazonOrdersPlugin";

// Register all plugins using the DI-managed registry
export function initializePlugins(): void {
  const pluginRegistry = getPluginRegistry();

  try {
    pluginRegistry.registerPlugin(genericReceiptPlugin);
    pluginRegistry.registerPlugin(amazonOrdersPlugin);

    console.log(`🚀 Initialized ${pluginRegistry.getPluginCount()} plugins`);
  } catch (error) {
    console.error("Failed to initialize plugins:", error);
    throw error;
  }
}

// Export main components and types
export { default as PluginGrid } from "./components/PluginGrid.vue";
export { default as BasePlugin } from "./components/BasePlugin.vue";

// Export DI-based registry access
export { getPluginRegistry } from "../core/di/setup";
export {
  usePluginRegistry,
  providePluginRegistry,
} from "../composables/usePluginRegistry";

// Export error logging for plugins
export { errorLogger } from "../services/errorLogging";

// Export interfaces for plugin development
export type { IPluginRegistry } from "./interfaces/IPluginRegistry";

// Export legacy singleton for backward compatibility (deprecated)
export { pluginRegistry } from "./registry/PluginRegistry";

export type {
  IPlugin,
  PluginConfig,
  PluginMetadata,
  PluginCapabilities,
} from "./types/IPlugin";
