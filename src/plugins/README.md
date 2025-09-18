# Plugin System with Dependency Injection

This document explains how to use the improved plugin system with dependency injection.

## Overview

The plugin system has been refactored to use proper dependency injection instead of the singleton pattern, providing better testability, flexibility, and maintainability.

## Key Components

- **IPluginRegistry**: Interface for plugin registry implementations
- **PluginRegistryImpl**: Main implementation with DI support
- **DIContainer**: Simple dependency injection container
- **usePluginRegistry**: Vue composable for accessing the plugin registry

## Usage Examples

### In Vue Components

```typescript
<script setup lang="ts">
import { usePluginRegistry } from '@/plugins';

// Get reactive access to the plugin registry
const { 
  plugins,           // Reactive list of all plugins
  pluginCount,      // Reactive count of plugins
  detectBestPlugin, // Function to detect best plugin for file
  getPlugin         // Function to get specific plugin
} = usePluginRegistry();

// Detect plugin for a file
const handleFileSelect = (file: File) => {
  const plugin = detectBestPlugin(file.name);
  if (plugin) {
    console.log(`Using plugin: ${plugin.plugin.name}`);
  }
};
</script>
```

### Direct Registry Access

```typescript
import { getPluginRegistry } from '@/plugins';

// Get the registry instance directly
const registry = getPluginRegistry();

// Register a new plugin
registry.registerPlugin(myCustomPlugin);

// Check if plugin exists
if (registry.isPluginRegistered('my-plugin-id')) {
  const plugin = registry.getPlugin('my-plugin-id');
}
```

### For Plugin Development

```typescript
import type { IPluginRegistry, PluginConfig } from '@/plugins';
import { errorLogger } from '@/plugins';

// Your plugin can access the registry and error logger
export class MyCustomPlugin {
  constructor(private registry: IPluginRegistry) {}

  async processFile(file: File) {
    try {
      // Plugin logic here
    } catch (error) {
      errorLogger.logError(error, 'MyCustomPlugin', {
        fileName: file.name,
        pluginId: 'my-custom-plugin'
      });
      throw error;
    }
  }
}
```

### Testing

```typescript
import { createTestContainer } from '@/core/di/setup';
import { PluginRegistryImpl } from '@/plugins/registry/PluginRegistryImpl';

describe('Plugin Tests', () => {
  let testContainer: DIContainer;
  let registry: IPluginRegistry;

  beforeEach(() => {
    testContainer = createTestContainer();
    registry = new PluginRegistryImpl({ debug: true });
  });

  it('should register plugin', () => {
    registry.registerPlugin(testPlugin);
    expect(registry.isPluginRegistered(testPlugin.plugin.id)).toBe(true);
  });
});
```

## Benefits of the New System

1. **Better Testability**: Easy to mock and inject test doubles
2. **Flexible Configuration**: Registry behavior can be customized per environment
3. **Reactive Vue Integration**: Automatic UI updates when plugins change
4. **Error Handling**: Built-in error logging and handling
5. **Type Safety**: Full TypeScript support with interfaces
6. **Event System**: Plugin lifecycle events for monitoring
7. **Validation**: Automatic plugin configuration validation
8. **Backward Compatibility**: Legacy singleton still available (deprecated)

## Migration Guide

### Old Way (Deprecated)
```typescript
import { pluginRegistry } from '@/plugins';
const plugins = pluginRegistry.getAllPlugins();
```

### New Way (Recommended)
```typescript
import { usePluginRegistry } from '@/plugins';
const { plugins } = usePluginRegistry();
```

## Configuration

The registry can be configured during setup:

```typescript
new PluginRegistryImpl({
  debug: true,                    // Enable debug logging
  maxPlugins: 50,                // Maximum number of plugins
  events: {                      // Event handlers
    onPluginRegistered: (config) => console.log('Registered:', config.plugin.name),
    onPluginDetected: (filename, plugin) => console.log('Detected:', plugin?.plugin.name)
  },
  scoringFunction: (plugin, filename) => {  // Custom scoring for detection
    // Return score for plugin preference
    return plugin.plugin.id === 'preferred-plugin' ? 100 : 50;
  }
});
```

## Advanced Usage

### Custom Plugin Scoring

You can provide custom scoring logic for plugin detection:

```typescript
const customScoring = (plugin: PluginConfig, filename: string): number => {
  let score = 50;
  
  // Prefer plugins with specific capabilities
  if (plugin.capabilities.batchProcessing) {
    score += 20;
  }
  
  // Filename-based scoring
  if (filename.includes('receipt') && plugin.plugin.id === 'receipt-plugin') {
    score += 30;
  }
  
  return score;
};
```

### Plugin Registry Events

```typescript
const events: PluginRegistryEvents = {
  onPluginRegistered: (config) => {
    console.log(`✅ ${config.plugin.name} registered`);
    // Update UI, send analytics, etc.
  },
  onPluginUnregistered: (id) => {
    console.log(`🗑️ Plugin ${id} removed`);
    // Cleanup, notifications, etc.
  },
  onPluginDetected: (filename, plugin) => {
    if (plugin) {
      console.log(`🎯 ${plugin.plugin.name} selected for ${filename}`);
    } else {
      console.warn(`❌ No plugin found for ${filename}`);
    }
  }
};
```

This new system provides a much more robust and maintainable foundation for the plugin architecture while maintaining backward compatibility.