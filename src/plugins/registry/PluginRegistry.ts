import type {
  IPlugin,
  PluginConfig,
  PluginCapabilities,
} from "../types/IPlugin";
import { errorLogger } from "../../services/errorLogging";

export class PluginRegistry {
  private static instance: PluginRegistry;
  private plugins: Map<string, PluginConfig> = new Map();

  private constructor() {}

  static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  registerPlugin(config: PluginConfig): void {
    try {
      this.plugins.set(config.plugin.id, config);
      console.log(
        `✅ Plugin registered: ${config.plugin.name} (${config.plugin.id})`,
      );
    } catch (error) {
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        "Plugin Registration",
        { pluginId: config.plugin.id, pluginName: config.plugin.name },
      );
      throw error;
    }
  }

  getPlugin(id: string): PluginConfig | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): PluginConfig[] {
    return Array.from(this.plugins.values());
  }

  getPluginsByFileType(fileExtension: string): PluginConfig[] {
    return this.getAllPlugins().filter((config) =>
      config.plugin.fileTypes.includes(fileExtension.toLowerCase()),
    );
  }

  detectBestPlugin(filename: string): PluginConfig | null {
    try {
      const extension = filename.split(".").pop()?.toLowerCase() || "";
      const compatiblePlugins = this.getPluginsByFileType(extension);

      // Return first compatible plugin (could be enhanced with scoring logic)
      const bestPlugin =
        compatiblePlugins.length > 0 ? compatiblePlugins[0] : null;

      if (!bestPlugin) {
        console.warn(
          `No compatible plugin found for file: ${filename} (${extension})`,
        );
      }

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
        if (!fileTypeMap[fileType]) {
          fileTypeMap[fileType] = [];
        }
        fileTypeMap[fileType].push(config);
      });
    });

    return fileTypeMap;
  }
}

// Initialize and export singleton instance
export const pluginRegistry = PluginRegistry.getInstance();
