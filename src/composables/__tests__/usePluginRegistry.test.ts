import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import {
  usePluginRegistry,
  providePluginRegistry,
  createPluginRegistryComposable,
  PLUGIN_REGISTRY_KEY
} from '../usePluginRegistry'
import type { IPluginRegistry } from '@/plugins/interfaces/IPluginRegistry'
import type { PluginConfig } from '@/plugins/types/IPlugin'
import { container, SERVICE_TOKENS } from '@/core/di/Container'

// Mock the DI container
vi.mock('@/core/di/Container', () => ({
  container: {
    isRegistered: vi.fn(),
    resolve: vi.fn()
  },
  SERVICE_TOKENS: {
    PLUGIN_REGISTRY: Symbol('PLUGIN_REGISTRY')
  }
}))

// Mock Vue's inject/provide system
let mockInjectedValue: any = null
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
    inject: vi.fn(() => mockInjectedValue),
    provide: vi.fn()
  }
})

const mockContainer = vi.mocked(container)

// Mock plugin registry implementation
const createMockRegistry = (): IPluginRegistry => {
  const plugins = new Map<string, PluginConfig>()

  return {
    getAllPlugins: vi.fn(() => Array.from(plugins.values())),
    getPluginCount: vi.fn(() => plugins.size),
    registerPlugin: vi.fn((config: PluginConfig) => {
      plugins.set(config.id, config)
    }),
    unregisterPlugin: vi.fn((id: string) => {
      const existed = plugins.has(id)
      plugins.delete(id)
      return existed
    }),
    clearAllPlugins: vi.fn(() => {
      plugins.clear()
    }),
    getPlugin: vi.fn((id: string) => plugins.get(id)),
    getPluginsByFileType: vi.fn((fileExtension: string) => {
      return Array.from(plugins.values()).filter(plugin =>
        plugin.supportedFileTypes?.includes(fileExtension)
      )
    }),
    detectBestPlugin: vi.fn((filename: string) => {
      const ext = filename.split('.').pop()
      return Array.from(plugins.values()).find(plugin =>
        plugin.supportedFileTypes?.includes(`.${ext}`)
      )
    }),
    getFileTypePluginMap: vi.fn(() => {
      const map = new Map<string, PluginConfig[]>()
      plugins.forEach(plugin => {
        plugin.supportedFileTypes?.forEach(type => {
          if (!map.has(type)) {
            map.set(type, [])
          }
          map.get(type)!.push(plugin)
        })
      })
      return map
    }),
    isPluginRegistered: vi.fn((id: string) => plugins.has(id))
  }
}

describe('usePluginRegistry', () => {
  let mockRegistry: IPluginRegistry

  beforeEach(() => {
    vi.clearAllMocks()
    mockInjectedValue = null
    mockRegistry = createMockRegistry()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('registry resolution', () => {
    it('should use injected registry when available', () => {
      // Arrange
      mockInjectedValue = mockRegistry

      // Act
      const result = usePluginRegistry()

      // Assert
      expect(result.registry).toBe(mockRegistry)
      expect(mockContainer.isRegistered).not.toHaveBeenCalled()
      expect(mockContainer.resolve).not.toHaveBeenCalled()
    })

    it('should fallback to DI container when inject returns null', () => {
      // Arrange
      mockInjectedValue = null
      mockContainer.isRegistered.mockReturnValue(true)
      mockContainer.resolve.mockReturnValue(mockRegistry)

      // Act
      const result = usePluginRegistry()

      // Assert
      expect(result.registry).toBe(mockRegistry)
      expect(mockContainer.isRegistered).toHaveBeenCalledWith(SERVICE_TOKENS.PLUGIN_REGISTRY)
      expect(mockContainer.resolve).toHaveBeenCalledWith(SERVICE_TOKENS.PLUGIN_REGISTRY)
    })

    it('should throw error when no registry is available', () => {
      // Arrange
      mockInjectedValue = null
      mockContainer.isRegistered.mockReturnValue(false)

      // Act & Assert
      expect(() => usePluginRegistry()).toThrow(
        'Plugin registry not found. Make sure it is registered in the DI container or provided via Vue inject/provide.'
      )
    })

    it('should throw error when DI container has no registry registered', () => {
      // Arrange
      mockInjectedValue = null
      mockContainer.isRegistered.mockReturnValue(false)

      // Act & Assert
      expect(() => usePluginRegistry()).toThrow(
        'Plugin registry not found. Make sure it is registered in the DI container or provided via Vue inject/provide.'
      )
    })
  })

  describe('reactive state initialization', () => {
    beforeEach(() => {
      mockInjectedValue = mockRegistry
    })

    it('should initialize reactive state with registry data', () => {
      // Arrange
      const mockPlugins: PluginConfig[] = [
        {
          id: 'plugin1',
          name: 'Plugin 1',
          supportedFileTypes: ['.pdf'],
          processFile: vi.fn()
        },
        {
          id: 'plugin2',
          name: 'Plugin 2',
          supportedFileTypes: ['.jpg'],
          processFile: vi.fn()
        }
      ]

      vi.mocked(mockRegistry.getAllPlugins).mockReturnValue(mockPlugins)
      vi.mocked(mockRegistry.getPluginCount).mockReturnValue(2)

      // Act
      const result = usePluginRegistry()

      // Assert
      expect(result.plugins).toEqual(mockPlugins)
      expect(result.pluginCount).toBe(2)
      expect(mockRegistry.getAllPlugins).toHaveBeenCalledTimes(1)
      expect(mockRegistry.getPluginCount).toHaveBeenCalledTimes(1)
    })

    it('should make reactive state readonly', () => {
      // Arrange
      const mockPlugins: PluginConfig[] = []
      vi.mocked(mockRegistry.getAllPlugins).mockReturnValue(mockPlugins)
      vi.mocked(mockRegistry.getPluginCount).mockReturnValue(0)

      // Act
      const result = usePluginRegistry()

      // Assert
      expect(result.plugins).toBeDefined()
      expect(result.pluginCount).toBeDefined()
      // The returned refs should be readonly - this prevents external mutation
      expect(() => {
        (result.plugins as any).value = []
      }).toThrow()
    })
  })

  describe('plugin operations', () => {
    beforeEach(() => {
      mockInjectedValue = mockRegistry
      vi.mocked(mockRegistry.getAllPlugins).mockReturnValue([])
      vi.mocked(mockRegistry.getPluginCount).mockReturnValue(0)
    })

    it('should register plugin and refresh state', async () => {
      // Arrange
      const pluginConfig: PluginConfig = {
        id: 'test-plugin',
        name: 'Test Plugin',
        supportedFileTypes: ['.test'],
        processFile: vi.fn()
      }

      const updatedPlugins = [pluginConfig]
      vi.mocked(mockRegistry.getAllPlugins)
        .mockReturnValueOnce([]) // Initial call
        .mockReturnValueOnce(updatedPlugins) // After registration
      vi.mocked(mockRegistry.getPluginCount)
        .mockReturnValueOnce(0) // Initial call
        .mockReturnValueOnce(1) // After registration

      const result = usePluginRegistry()

      // Act
      result.registerPlugin(pluginConfig)

      // Assert
      expect(mockRegistry.registerPlugin).toHaveBeenCalledWith(pluginConfig)
      expect(mockRegistry.getAllPlugins).toHaveBeenCalledTimes(2)
      expect(mockRegistry.getPluginCount).toHaveBeenCalledTimes(2)
      expect(result.plugins).toEqual(updatedPlugins)
      expect(result.pluginCount).toBe(1)
    })

    it('should unregister plugin and refresh state when successful', () => {
      // Arrange
      const initialPlugins = [
        { id: 'plugin1', name: 'Plugin 1', supportedFileTypes: ['.pdf'], processFile: vi.fn() }
      ]

      vi.mocked(mockRegistry.getAllPlugins)
        .mockReturnValueOnce(initialPlugins) // Initial call
        .mockReturnValueOnce([]) // After unregistration
      vi.mocked(mockRegistry.getPluginCount)
        .mockReturnValueOnce(1) // Initial call
        .mockReturnValueOnce(0) // After unregistration
      vi.mocked(mockRegistry.unregisterPlugin).mockReturnValue(true)

      const result = usePluginRegistry()

      // Act
      const success = result.unregisterPlugin('plugin1')

      // Assert
      expect(success).toBe(true)
      expect(mockRegistry.unregisterPlugin).toHaveBeenCalledWith('plugin1')
      expect(mockRegistry.getAllPlugins).toHaveBeenCalledTimes(2)
      expect(mockRegistry.getPluginCount).toHaveBeenCalledTimes(2)
      expect(result.plugins).toEqual([])
      expect(result.pluginCount).toBe(0)
    })

    it('should not refresh state when unregister fails', () => {
      // Arrange
      vi.mocked(mockRegistry.unregisterPlugin).mockReturnValue(false)

      const result = usePluginRegistry()

      // Act
      const success = result.unregisterPlugin('nonexistent-plugin')

      // Assert
      expect(success).toBe(false)
      expect(mockRegistry.unregisterPlugin).toHaveBeenCalledWith('nonexistent-plugin')
      expect(mockRegistry.getAllPlugins).toHaveBeenCalledTimes(1) // Only initial call
      expect(mockRegistry.getPluginCount).toHaveBeenCalledTimes(1) // Only initial call
    })

    it('should clear all plugins and refresh state', () => {
      // Arrange
      const initialPlugins = [
        { id: 'plugin1', name: 'Plugin 1', supportedFileTypes: ['.pdf'], processFile: vi.fn() },
        { id: 'plugin2', name: 'Plugin 2', supportedFileTypes: ['.jpg'], processFile: vi.fn() }
      ]

      vi.mocked(mockRegistry.getAllPlugins)
        .mockReturnValueOnce(initialPlugins) // Initial call
        .mockReturnValueOnce([]) // After clearing
      vi.mocked(mockRegistry.getPluginCount)
        .mockReturnValueOnce(2) // Initial call
        .mockReturnValueOnce(0) // After clearing

      const result = usePluginRegistry()

      // Act
      result.clearAllPlugins()

      // Assert
      expect(mockRegistry.clearAllPlugins).toHaveBeenCalledTimes(1)
      expect(mockRegistry.getAllPlugins).toHaveBeenCalledTimes(2)
      expect(mockRegistry.getPluginCount).toHaveBeenCalledTimes(2)
      expect(result.plugins).toEqual([])
      expect(result.pluginCount).toBe(0)
    })

    it('should manually refresh state', () => {
      // Arrange
      const newPlugins = [
        { id: 'plugin1', name: 'Plugin 1', supportedFileTypes: ['.pdf'], processFile: vi.fn() }
      ]

      vi.mocked(mockRegistry.getAllPlugins)
        .mockReturnValueOnce([]) // Initial call
        .mockReturnValueOnce(newPlugins) // After refresh
      vi.mocked(mockRegistry.getPluginCount)
        .mockReturnValueOnce(0) // Initial call
        .mockReturnValueOnce(1) // After refresh

      const result = usePluginRegistry()

      // Act
      result.refreshState()

      // Assert
      expect(mockRegistry.getAllPlugins).toHaveBeenCalledTimes(2)
      expect(mockRegistry.getPluginCount).toHaveBeenCalledTimes(2)
      expect(result.plugins).toEqual(newPlugins)
      expect(result.pluginCount).toBe(1)
    })
  })

  describe('non-mutating operations', () => {
    beforeEach(() => {
      mockInjectedValue = mockRegistry
      vi.mocked(mockRegistry.getAllPlugins).mockReturnValue([])
      vi.mocked(mockRegistry.getPluginCount).mockReturnValue(0)
    })

    it('should get plugin by id', () => {
      // Arrange
      const pluginConfig: PluginConfig = {
        id: 'test-plugin',
        name: 'Test Plugin',
        supportedFileTypes: ['.test'],
        processFile: vi.fn()
      }
      vi.mocked(mockRegistry.getPlugin).mockReturnValue(pluginConfig)

      const result = usePluginRegistry()

      // Act
      const plugin = result.getPlugin('test-plugin')

      // Assert
      expect(plugin).toBe(pluginConfig)
      expect(mockRegistry.getPlugin).toHaveBeenCalledWith('test-plugin')
    })

    it('should get plugins by file type', () => {
      // Arrange
      const plugins: PluginConfig[] = [
        { id: 'pdf-plugin', name: 'PDF Plugin', supportedFileTypes: ['.pdf'], processFile: vi.fn() }
      ]
      vi.mocked(mockRegistry.getPluginsByFileType).mockReturnValue(plugins)

      const result = usePluginRegistry()

      // Act
      const fileTypePlugins = result.getPluginsByFileType('.pdf')

      // Assert
      expect(fileTypePlugins).toBe(plugins)
      expect(mockRegistry.getPluginsByFileType).toHaveBeenCalledWith('.pdf')
    })

    it('should detect best plugin for filename', () => {
      // Arrange
      const bestPlugin: PluginConfig = {
        id: 'pdf-plugin',
        name: 'PDF Plugin',
        supportedFileTypes: ['.pdf'],
        processFile: vi.fn()
      }
      vi.mocked(mockRegistry.detectBestPlugin).mockReturnValue(bestPlugin)

      const result = usePluginRegistry()

      // Act
      const detected = result.detectBestPlugin('document.pdf')

      // Assert
      expect(detected).toBe(bestPlugin)
      expect(mockRegistry.detectBestPlugin).toHaveBeenCalledWith('document.pdf')
    })

    it('should get file type plugin map', () => {
      // Arrange
      const pluginMap = new Map<string, PluginConfig[]>()
      vi.mocked(mockRegistry.getFileTypePluginMap).mockReturnValue(pluginMap)

      const result = usePluginRegistry()

      // Act
      const map = result.getFileTypePluginMap()

      // Assert
      expect(map).toBe(pluginMap)
      expect(mockRegistry.getFileTypePluginMap).toHaveBeenCalledTimes(1)
    })

    it('should check if plugin is registered', () => {
      // Arrange
      vi.mocked(mockRegistry.isPluginRegistered).mockReturnValue(true)

      const result = usePluginRegistry()

      // Act
      const isRegistered = result.isPluginRegistered('test-plugin')

      // Assert
      expect(isRegistered).toBe(true)
      expect(mockRegistry.isPluginRegistered).toHaveBeenCalledWith('test-plugin')
    })
  })

  describe('providePluginRegistry', () => {
    it('should provide registry to Vue DI system', async () => {
      // Import provide after mocking
      const { provide } = await import('vue')

      // Act
      const result = providePluginRegistry(mockRegistry)

      // Assert
      expect(provide).toHaveBeenCalledWith(PLUGIN_REGISTRY_KEY, mockRegistry)
      expect(result).toBe(mockRegistry)
    })
  })

  describe('createPluginRegistryComposable', () => {
    it('should create a composable with custom registry', () => {
      // Arrange
      const customRegistry = createMockRegistry()
      const mockPlugins: PluginConfig[] = [
        { id: 'custom-plugin', name: 'Custom Plugin', supportedFileTypes: ['.custom'], processFile: vi.fn() }
      ]

      vi.mocked(customRegistry.getAllPlugins).mockReturnValue(mockPlugins)
      vi.mocked(customRegistry.getPluginCount).mockReturnValue(1)

      // Act
      const useCustomPluginRegistry = createPluginRegistryComposable(customRegistry)
      const result = useCustomPluginRegistry()

      // Assert
      expect(result.plugins).toEqual(mockPlugins)
      expect(result.pluginCount).toBe(1)
      expect(result.registry).toBe(customRegistry)
      expect(customRegistry.getAllPlugins).toHaveBeenCalledTimes(1)
      expect(customRegistry.getPluginCount).toHaveBeenCalledTimes(1)
    })

    it('should provide all the same functionality as main composable', () => {
      // Arrange
      const customRegistry = createMockRegistry()
      vi.mocked(customRegistry.getAllPlugins).mockReturnValue([])
      vi.mocked(customRegistry.getPluginCount).mockReturnValue(0)

      const pluginConfig: PluginConfig = {
        id: 'test-plugin',
        name: 'Test Plugin',
        supportedFileTypes: ['.test'],
        processFile: vi.fn()
      }

      const useCustomPluginRegistry = createPluginRegistryComposable(customRegistry)
      const result = useCustomPluginRegistry()

      // Act & Assert
      // Test all methods are available
      expect(typeof result.registerPlugin).toBe('function')
      expect(typeof result.unregisterPlugin).toBe('function')
      expect(typeof result.clearAllPlugins).toBe('function')
      expect(typeof result.getPlugin).toBe('function')
      expect(typeof result.getPluginsByFileType).toBe('function')
      expect(typeof result.detectBestPlugin).toBe('function')
      expect(typeof result.getFileTypePluginMap).toBe('function')
      expect(typeof result.isPluginRegistered).toBe('function')
      expect(typeof result.refreshState).toBe('function')

      // Test plugin operations work
      result.registerPlugin(pluginConfig)
      expect(customRegistry.registerPlugin).toHaveBeenCalledWith(pluginConfig)

      result.getPlugin('test-plugin')
      expect(customRegistry.getPlugin).toHaveBeenCalledWith('test-plugin')
    })

    it('should handle state updates independently from main composable', () => {
      // Arrange
      const customRegistry = createMockRegistry()
      const mainRegistry = createMockRegistry()

      vi.mocked(customRegistry.getAllPlugins).mockReturnValue([])
      vi.mocked(customRegistry.getPluginCount).mockReturnValue(0)

      mockInjectedValue = mainRegistry
      vi.mocked(mainRegistry.getAllPlugins).mockReturnValue([])
      vi.mocked(mainRegistry.getPluginCount).mockReturnValue(0)

      const useCustomPluginRegistry = createPluginRegistryComposable(customRegistry)
      const customResult = useCustomPluginRegistry()
      const mainResult = usePluginRegistry()

      const customPlugin: PluginConfig = {
        id: 'custom-plugin',
        name: 'Custom Plugin',
        supportedFileTypes: ['.custom'],
        processFile: vi.fn()
      }

      // Act
      customResult.registerPlugin(customPlugin)

      // Assert
      expect(customRegistry.registerPlugin).toHaveBeenCalledWith(customPlugin)
      expect(mainRegistry.registerPlugin).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    beforeEach(() => {
      mockInjectedValue = mockRegistry
      vi.mocked(mockRegistry.getAllPlugins).mockReturnValue([])
      vi.mocked(mockRegistry.getPluginCount).mockReturnValue(0)
    })

    it('should handle registry methods returning undefined', () => {
      // Arrange
      vi.mocked(mockRegistry.getPlugin).mockReturnValue(undefined)
      vi.mocked(mockRegistry.detectBestPlugin).mockReturnValue(undefined)

      const result = usePluginRegistry()

      // Act & Assert
      expect(result.getPlugin('nonexistent')).toBeUndefined()
      expect(result.detectBestPlugin('unknown.xyz')).toBeUndefined()
    })

    it('should handle empty plugin arrays', () => {
      // Arrange
      vi.mocked(mockRegistry.getAllPlugins).mockReturnValue([])
      vi.mocked(mockRegistry.getPluginsByFileType).mockReturnValue([])

      const result = usePluginRegistry()

      // Assert
      expect(result.plugins).toEqual([])
      expect(result.getPluginsByFileType('.pdf')).toEqual([])
    })

    it('should handle large plugin counts', () => {
      // Arrange
      const largePluginSet: PluginConfig[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `plugin-${i}`,
        name: `Plugin ${i}`,
        supportedFileTypes: [`.type${i}`],
        processFile: vi.fn()
      }))

      vi.mocked(mockRegistry.getAllPlugins).mockReturnValue(largePluginSet)
      vi.mocked(mockRegistry.getPluginCount).mockReturnValue(1000)

      const result = usePluginRegistry()

      // Assert
      expect(result.plugins).toHaveLength(1000)
      expect(result.pluginCount).toBe(1000)
    })

    it('should handle plugins with complex configurations', () => {
      // Arrange
      const complexPlugin: PluginConfig = {
        id: 'complex-plugin',
        name: 'Complex Plugin',
        version: '1.2.3',
        author: 'Test Author',
        description: 'A complex plugin for testing',
        supportedFileTypes: ['.pdf', '.doc', '.docx'],
        processFile: vi.fn(),
        settings: {
          option1: 'value1',
          option2: { nested: { deeply: 'nested value' } },
          option3: [1, 2, 3, 4, 5]
        },
        metadata: {
          category: 'document-processing',
          tags: ['pdf', 'document', 'office'],
          lastUpdated: new Date().toISOString()
        }
      }

      vi.mocked(mockRegistry.getAllPlugins).mockReturnValue([complexPlugin])
      vi.mocked(mockRegistry.getPluginCount).mockReturnValue(1)
      vi.mocked(mockRegistry.getPlugin).mockReturnValue(complexPlugin)

      const result = usePluginRegistry()

      // Act
      const retrieved = result.getPlugin('complex-plugin')

      // Assert
      expect(result.plugins).toEqual([complexPlugin])
      expect(retrieved).toBe(complexPlugin)
      expect(retrieved?.settings).toBeDefined()
      expect(retrieved?.metadata).toBeDefined()
    })

    it('should handle registry method errors gracefully', () => {
      // Arrange
      const error = new Error('Registry error')
      vi.mocked(mockRegistry.registerPlugin).mockImplementation(() => {
        throw error
      })

      const result = usePluginRegistry()
      const pluginConfig: PluginConfig = {
        id: 'error-plugin',
        name: 'Error Plugin',
        supportedFileTypes: ['.error'],
        processFile: vi.fn()
      }

      // Act & Assert
      expect(() => result.registerPlugin(pluginConfig)).toThrow('Registry error')
    })

    it('should handle null/undefined plugin configs', () => {
      // Arrange
      const result = usePluginRegistry()

      // Act & Assert
      expect(() => result.registerPlugin(null as any)).not.toThrow()
      expect(() => result.registerPlugin(undefined as any)).not.toThrow()
      expect(mockRegistry.registerPlugin).toHaveBeenCalledWith(null)
      expect(mockRegistry.registerPlugin).toHaveBeenCalledWith(undefined)
    })
  })

  describe('integration tests', () => {
    beforeEach(() => {
      mockInjectedValue = mockRegistry
    })

    it('should handle complete plugin lifecycle', () => {
      // Arrange
      const plugin1: PluginConfig = {
        id: 'lifecycle-plugin-1',
        name: 'Lifecycle Plugin 1',
        supportedFileTypes: ['.lc1'],
        processFile: vi.fn()
      }

      const plugin2: PluginConfig = {
        id: 'lifecycle-plugin-2',
        name: 'Lifecycle Plugin 2',
        supportedFileTypes: ['.lc2'],
        processFile: vi.fn()
      }

      // Mock sequential state changes
      vi.mocked(mockRegistry.getAllPlugins)
        .mockReturnValueOnce([]) // Initial
        .mockReturnValueOnce([plugin1]) // After first registration
        .mockReturnValueOnce([plugin1, plugin2]) // After second registration
        .mockReturnValueOnce([plugin2]) // After first unregistration
        .mockReturnValueOnce([]) // After clearing

      vi.mocked(mockRegistry.getPluginCount)
        .mockReturnValueOnce(0) // Initial
        .mockReturnValueOnce(1) // After first registration
        .mockReturnValueOnce(2) // After second registration
        .mockReturnValueOnce(1) // After first unregistration
        .mockReturnValueOnce(0) // After clearing

      vi.mocked(mockRegistry.unregisterPlugin).mockReturnValue(true)

      const result = usePluginRegistry()

      // Act & Assert
      expect(result.plugins).toEqual([])
      expect(result.pluginCount).toBe(0)

      result.registerPlugin(plugin1)
      expect(result.plugins).toEqual([plugin1])
      expect(result.pluginCount).toBe(1)

      result.registerPlugin(plugin2)
      expect(result.plugins).toEqual([plugin1, plugin2])
      expect(result.pluginCount).toBe(2)

      result.unregisterPlugin('lifecycle-plugin-1')
      expect(result.plugins).toEqual([plugin2])
      expect(result.pluginCount).toBe(1)

      result.clearAllPlugins()
      expect(result.plugins).toEqual([])
      expect(result.pluginCount).toBe(0)
    })

    it('should work with both injection methods simultaneously', () => {
      // Arrange
      const injectedRegistry = createMockRegistry()
      const containerRegistry = createMockRegistry()

      mockInjectedValue = injectedRegistry
      mockContainer.isRegistered.mockReturnValue(true)
      mockContainer.resolve.mockReturnValue(containerRegistry)

      vi.mocked(injectedRegistry.getAllPlugins).mockReturnValue([])
      vi.mocked(injectedRegistry.getPluginCount).mockReturnValue(0)

      // Act
      const result = usePluginRegistry()

      // Assert - should prefer injected registry over container registry
      expect(result.registry).toBe(injectedRegistry)
      expect(mockContainer.isRegistered).not.toHaveBeenCalled()
      expect(mockContainer.resolve).not.toHaveBeenCalled()
    })
  })
})