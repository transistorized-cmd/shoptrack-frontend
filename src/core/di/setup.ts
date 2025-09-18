import { container, SERVICE_TOKENS } from "./Container";
import { PluginRegistryImpl } from "../../plugins/registry/PluginRegistryImpl";
import type { IPluginRegistry } from "../../plugins/interfaces/IPluginRegistry";
import { errorLogger } from "../../services/errorLogging";

/**
 * Setup and configure the dependency injection container
 * Registers all core services and their dependencies
 */
export function setupDIContainer() {
  console.log("🔧 Setting up DI container...");

  // Register error logger
  container.registerInstance(SERVICE_TOKENS.ERROR_LOGGER, errorLogger);

  // Register plugin registry with development configuration
  container.registerSingleton(SERVICE_TOKENS.PLUGIN_REGISTRY, () => {
    const isDevelopment = import.meta.env.DEV;

    return new PluginRegistryImpl({
      debug: isDevelopment,
      maxPlugins: 50,
      events: {
        onPluginRegistered: (config) => {
          if (isDevelopment) {
            console.log(`📦 Plugin registered: ${config.plugin.name}`);
          }
        },
        onPluginUnregistered: (id) => {
          if (isDevelopment) {
            console.log(`📦 Plugin unregistered: ${id}`);
          }
        },
        onPluginDetected: (filename, plugin) => {
          if (isDevelopment && plugin) {
            console.log(
              `🎯 Plugin detected for ${filename}: ${plugin.plugin.name}`,
            );
          }
        },
      },
      // Custom scoring function that prefers newer versions and specific plugins
      scoringFunction: (plugin, filename) => {
        let score = 50;

        // Penalize generic plugins
        if (plugin.plugin.id.includes("generic")) {
          score -= 20;
        }

        // Bonus for file type specificity
        if (plugin.plugin.fileTypes.length === 1) {
          score += 15;
        } else if (plugin.plugin.fileTypes.length <= 3) {
          score += 5;
        }

        // Version bonus
        const versionMatch = plugin.plugin.version.match(
          /v?(\d+)\.(\d+)\.(\d+)/,
        );
        if (versionMatch) {
          const [, major, minor, patch] = versionMatch;
          score += parseInt(major) * 10 + parseInt(minor) * 3 + parseInt(patch);
        }

        // Specific plugin bonuses based on filename patterns
        const filenameLower = filename.toLowerCase();

        if (plugin.plugin.id === "amazon-orders") {
          if (
            filenameLower.includes("amazon") ||
            filenameLower.includes("order")
          ) {
            score += 30;
          }
        }

        if (plugin.plugin.id === "generic-receipt") {
          // Generic should be the fallback, so lower score unless no other options
          score -= 10;
        }

        return Math.max(0, score);
      },
    });
  });

  console.log("✅ DI container setup complete");
}

/**
 * Get the plugin registry from the DI container
 * Helper function for components that need direct access
 */
export function getPluginRegistry(): IPluginRegistry {
  return container.resolve<IPluginRegistry>(SERVICE_TOKENS.PLUGIN_REGISTRY);
}

/**
 * Get the error logger from the DI container
 */
export function getErrorLogger() {
  return container.resolve(SERVICE_TOKENS.ERROR_LOGGER);
}

/**
 * Create a testing container with mock services
 * Useful for unit tests
 */
export function createTestContainer() {
  const testContainer = container.createChild();

  // Register test doubles
  testContainer.registerInstance(
    SERVICE_TOKENS.PLUGIN_REGISTRY,
    new PluginRegistryImpl({
      debug: true,
      maxPlugins: 10,
    }),
  );

  return testContainer;
}
