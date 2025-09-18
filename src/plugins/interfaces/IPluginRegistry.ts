import type { PluginConfig } from "../types/IPlugin";

/**
 * Interface for plugin registry implementations
 * Provides abstraction for dependency injection and testing
 */
export interface IPluginRegistry {
  /**
   * Register a plugin configuration
   * @param config Plugin configuration to register
   * @throws Error if plugin registration fails
   */
  registerPlugin(config: PluginConfig): void;

  /**
   * Get a plugin by its ID
   * @param id Plugin ID
   * @returns Plugin configuration or undefined if not found
   */
  getPlugin(id: string): PluginConfig | undefined;

  /**
   * Get all registered plugins
   * @returns Array of all plugin configurations
   */
  getAllPlugins(): PluginConfig[];

  /**
   * Get plugins that support a specific file type
   * @param fileExtension File extension (e.g., 'jpg', 'pdf')
   * @returns Array of compatible plugin configurations
   */
  getPluginsByFileType(fileExtension: string): PluginConfig[];

  /**
   * Detect the best plugin for a given filename
   * @param filename Name of the file to detect plugin for
   * @returns Best matching plugin configuration or null if none found
   */
  detectBestPlugin(filename: string): PluginConfig | null;

  /**
   * Get a map of file types to compatible plugins
   * @returns Record mapping file extensions to plugin arrays
   */
  getFileTypePluginMap(): Record<string, PluginConfig[]>;

  /**
   * Check if a plugin is registered
   * @param id Plugin ID to check
   * @returns True if plugin is registered
   */
  isPluginRegistered(id: string): boolean;

  /**
   * Unregister a plugin by ID
   * @param id Plugin ID to unregister
   * @returns True if plugin was found and removed
   */
  unregisterPlugin(id: string): boolean;

  /**
   * Clear all registered plugins
   */
  clearAllPlugins(): void;

  /**
   * Get the count of registered plugins
   * @returns Number of registered plugins
   */
  getPluginCount(): number;
}

/**
 * Plugin registry events for lifecycle management
 */
export interface PluginRegistryEvents {
  onPluginRegistered?: (config: PluginConfig) => void;
  onPluginUnregistered?: (id: string) => void;
  onPluginDetected?: (filename: string, config: PluginConfig | null) => void;
}

/**
 * Configuration options for plugin registry
 */
export interface PluginRegistryOptions {
  /** Enable debug logging */
  debug?: boolean;
  /** Maximum number of plugins allowed */
  maxPlugins?: number;
  /** Event handlers */
  events?: PluginRegistryEvents;
  /** Custom plugin scoring function for detection */
  scoringFunction?: (plugin: PluginConfig, filename: string) => number;
}
