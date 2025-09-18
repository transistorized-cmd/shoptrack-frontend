import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import PluginGrid from '../PluginGrid.vue'
import BasePlugin from '../BasePlugin.vue'
import type { IPlugin } from '../../types/IPlugin'

// Mock the plugin registry composable
const mockPlugins = [
  {
    plugin: {
      id: 'plugin-1',
      name: 'Plugin 1',
      version: '1.0.0',
      description: 'First test plugin',
      icon: '📄',
      color: '#10b981',
      gradientFrom: '#10b981',
      gradientTo: '#3b82f6',
      fileTypes: ['pdf', 'doc'],
      features: ['OCR', 'Manual Entry'],
      uploadEndpoint: '/api/upload/plugin1',
      hasManualEntry: true,
      manualEntryRoute: '/manual/plugin1',
      maxFileSize: 5 * 1024 * 1024
    }
  },
  {
    plugin: {
      id: 'plugin-2',
      name: 'Plugin 2',
      version: '2.0.0',
      description: 'Second test plugin',
      icon: '🖼️',
      color: '#ff9900',
      gradientFrom: '#ff9900',
      gradientTo: '#ff6600',
      fileTypes: ['jpg', 'png', 'gif'],
      features: ['Image Processing'],
      uploadEndpoint: '/api/upload/plugin2',
      hasManualEntry: false,
      maxFileSize: 10 * 1024 * 1024
    }
  },
  {
    plugin: {
      id: 'plugin-3',
      name: 'Plugin 3',
      version: '1.5.0',
      description: 'Third test plugin',
      icon: '📊',
      color: '#3b82f6',
      gradientFrom: '#3b82f6',
      gradientTo: '#8b5cf6',
      fileTypes: ['csv', 'xlsx', 'pdf'],
      features: ['Data Analysis', 'Batch Processing'],
      uploadEndpoint: '/api/upload/plugin3',
      hasManualEntry: true,
      manualEntryRoute: '/manual/plugin3',
      maxFileSize: 8 * 1024 * 1024
    }
  }
]

const mockFileTypeMap = {
  pdf: [mockPlugins[0], mockPlugins[2]],
  doc: [mockPlugins[0]],
  jpg: [mockPlugins[1]],
  png: [mockPlugins[1]],
  gif: [mockPlugins[1]],
  csv: [mockPlugins[2]],
  xlsx: [mockPlugins[2]]
}

vi.mock('../../../composables/usePluginRegistry', () => ({
  usePluginRegistry: () => ({
    plugins: mockPlugins,
    getFileTypePluginMap: () => mockFileTypeMap
  })
}))

describe('PluginGrid', () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Plugin Grid Rendering', () => {
    it('renders the plugin grid container', () => {
      wrapper = mount(PluginGrid, {
        global: {
          components: { BasePlugin }
        }
      })

      const grid = wrapper.find('.grid.grid-cols-1.lg\\:grid-cols-2')
      expect(grid.exists()).toBe(true)
      expect(grid.classes()).toContain('gap-8')
      expect(grid.classes()).toContain('mb-8')
    })

    it('renders all plugins from registry', () => {
      wrapper = mount(PluginGrid, {
        global: {
          components: { BasePlugin },
          stubs: {
            BasePlugin: {
              props: ['plugin'],
              template: '<div class="base-plugin-stub">{{ plugin.name }}</div>'
            }
          }
        }
      })

      const plugins = wrapper.findAll('.base-plugin-stub')
      expect(plugins).toHaveLength(3)
      expect(plugins[0].text()).toBe('Plugin 1')
      expect(plugins[1].text()).toBe('Plugin 2')
      expect(plugins[2].text()).toBe('Plugin 3')
    })

    it('passes correct props to BasePlugin components', () => {
      wrapper = mount(PluginGrid, {
        global: {
          components: { BasePlugin }
        }
      })

      const basePlugins = wrapper.findAllComponents(BasePlugin)
      expect(basePlugins).toHaveLength(3)

      expect(basePlugins[0].props('plugin')).toEqual(mockPlugins[0].plugin)
      expect(basePlugins[1].props('plugin')).toEqual(mockPlugins[1].plugin)
      expect(basePlugins[2].props('plugin')).toEqual(mockPlugins[2].plugin)
    })

    it('uses plugin id as key for v-for', () => {
      wrapper = mount(PluginGrid, {
        global: {
          components: { BasePlugin }
        }
      })

      const basePlugins = wrapper.findAllComponents(BasePlugin)
      expect(basePlugins[0].key).toBe('plugin-1')
      expect(basePlugins[1].key).toBe('plugin-2')
      expect(basePlugins[2].key).toBe('plugin-3')
    })
  })

  describe('File Type Reference Section', () => {
    it('renders file type reference container', () => {
      wrapper = mount(PluginGrid, {
        global: {
          components: { BasePlugin }
        }
      })

      const reference = wrapper.find('.bg-gray-50.rounded-lg.p-6')
      expect(reference.exists()).toBe(true)
    })

    it('renders section title', () => {
      wrapper = mount(PluginGrid, {
        global: {
          components: { BasePlugin }
        }
      })

      const title = wrapper.find('h3')
      expect(title.exists()).toBe(true)
      expect(title.text()).toBe('Supported File Types')
      expect(title.classes()).toContain('text-lg')
      expect(title.classes()).toContain('font-semibold')
      expect(title.classes()).toContain('text-gray-800')
    })

    it('renders file type grid', () => {
      wrapper = mount(PluginGrid, {
        global: {
          components: { BasePlugin }
        }
      })

      const fileTypeGrid = wrapper.find('.grid.grid-cols-1.md\\:grid-cols-3.gap-4')
      expect(fileTypeGrid.exists()).toBe(true)
    })

    it('renders all file types from the map', () => {
      wrapper = mount(PluginGrid, {
        global: {
          components: { BasePlugin }
        }
      })

      const fileTypes = wrapper.findAll('.font-mono.text-sm.uppercase')
      expect(fileTypes).toHaveLength(7) // pdf, doc, jpg, png, gif, csv, xlsx

      const fileTypeTexts = fileTypes.map(ft => ft.text()).sort()
      expect(fileTypeTexts).toEqual(['csv', 'doc', 'gif', 'jpg', 'pdf', 'png', 'xlsx'])
    })

    it('renders color dots for each plugin supporting the file type', () => {
      wrapper = mount(PluginGrid, {
        global: {
          components: { BasePlugin }
        }
      })

      // Find PDF file type which has 2 plugins
      const fileTypeCards = wrapper.findAll('.flex.items-center.justify-between.p-3')
      const pdfCard = fileTypeCards.find(card => card.text().includes('pdf'))

      const dots = pdfCard!.findAll('.w-3.h-3.rounded-full')
      expect(dots).toHaveLength(2) // Plugin 1 and Plugin 3
    })

    it('applies correct colors to plugin dots', () => {
      wrapper = mount(PluginGrid, {
        global: {
          components: { BasePlugin }
        }
      })

      const fileTypeCards = wrapper.findAll('.flex.items-center.justify-between.p-3')
      const pdfCard = fileTypeCards.find(card => card.text().includes('pdf'))

      const dots = pdfCard!.findAll('.w-3.h-3.rounded-full')
      expect(dots[0].attributes('style')).toContain('backgroundColor: #10b981') // Plugin 1
      expect(dots[1].attributes('style')).toContain('backgroundColor: #3b82f6') // Plugin 3
    })

    it('adds title attribute to dots with plugin name', () => {
      wrapper = mount(PluginGrid, {
        global: {
          components: { BasePlugin }
        }
      })

      const fileTypeCards = wrapper.findAll('.flex.items-center.justify-between.p-3')
      const pdfCard = fileTypeCards.find(card => card.text().includes('pdf'))

      const dots = pdfCard!.findAll('.w-3.h-3.rounded-full')
      expect(dots[0].attributes('title')).toBe('Plugin 1')
      expect(dots[1].attributes('title')).toBe('Plugin 3')
    })

    it('renders explanation text', () => {
      wrapper = mount(PluginGrid, {
        global: {
          components: { BasePlugin }
        }
      })

      const explanation = wrapper.find('.text-xs.text-gray-500.mt-3')
      expect(explanation.exists()).toBe(true)
      expect(explanation.text()).toBe('Each colored dot represents a plugin that can process that file type.')
    })
  })

  describe('File Type Card Styling', () => {
    it('applies proper styling to file type cards', () => {
      wrapper = mount(PluginGrid, {
        global: {
          components: { BasePlugin }
        }
      })

      const fileTypeCard = wrapper.find('.flex.items-center.justify-between.p-3')
      expect(fileTypeCard.exists()).toBe(true)
      expect(fileTypeCard.classes()).toContain('bg-white')
      expect(fileTypeCard.classes()).toContain('rounded')
      expect(fileTypeCard.classes()).toContain('border')
    })

    it('uses monospace font for file extensions', () => {
      wrapper = mount(PluginGrid, {
        global: {
          components: { BasePlugin }
        }
      })

      const fileExtension = wrapper.find('.font-mono.text-sm.uppercase')
      expect(fileExtension.exists()).toBe(true)
      expect(fileExtension.classes()).toContain('font-medium')
    })

    it('properly spaces plugin dots', () => {
      wrapper = mount(PluginGrid, {
        global: {
          components: { BasePlugin }
        }
      })

      const dotContainers = wrapper.findAll('.flex.space-x-1')
      expect(dotContainers.length).toBeGreaterThan(0)
    })
  })

  describe('Responsive Layout', () => {
    it('uses responsive grid for plugins', () => {
      wrapper = mount(PluginGrid, {
        global: {
          components: { BasePlugin }
        }
      })

      const pluginGrid = wrapper.find('.grid.grid-cols-1.lg\\:grid-cols-2')
      expect(pluginGrid.exists()).toBe(true)
    })

    it('uses responsive grid for file types', () => {
      wrapper = mount(PluginGrid, {
        global: {
          components: { BasePlugin }
        }
      })

      const fileTypeGrid = wrapper.find('.grid.grid-cols-1.md\\:grid-cols-3')
      expect(fileTypeGrid.exists()).toBe(true)
    })
  })

  describe('Empty State', () => {
    it('renders empty grid when no plugins', () => {
      // Mock with empty plugins
      vi.doMock('../../../composables/usePluginRegistry', () => ({
        usePluginRegistry: () => ({
          plugins: [],
          getFileTypePluginMap: () => ({})
        })
      }))

      wrapper = mount(PluginGrid, {
        global: {
          components: { BasePlugin }
        }
      })

      const pluginGrid = wrapper.find('.grid.grid-cols-1.lg\\:grid-cols-2')
      expect(pluginGrid.exists()).toBe(true)
      expect(pluginGrid.findAllComponents(BasePlugin)).toHaveLength(0)
    })

    it('renders empty file type section when no file types', () => {
      vi.doMock('../../../composables/usePluginRegistry', () => ({
        usePluginRegistry: () => ({
          plugins: [],
          getFileTypePluginMap: () => ({})
        })
      }))

      wrapper = mount(PluginGrid, {
        global: {
          components: { BasePlugin }
        }
      })

      const fileTypes = wrapper.findAll('.font-mono.text-sm.uppercase')
      expect(fileTypes).toHaveLength(0)
    })
  })

  describe('Integration with Plugin Registry', () => {
    it('uses usePluginRegistry composable', () => {
      const usePluginRegistry = vi.fn(() => ({
        plugins: mockPlugins,
        getFileTypePluginMap: vi.fn(() => mockFileTypeMap)
      }))

      vi.doMock('../../../composables/usePluginRegistry', () => ({
        usePluginRegistry
      }))

      wrapper = mount(PluginGrid, {
        global: {
          components: { BasePlugin }
        }
      })

      // The composable should be called during setup
      expect(wrapper.vm.plugins).toBeDefined()
      expect(wrapper.vm.fileTypeMap).toBeDefined()
    })

    it('computes file type map from registry', () => {
      wrapper = mount(PluginGrid, {
        global: {
          components: { BasePlugin }
        }
      })

      // Verify the computed fileTypeMap is used
      const fileTypes = Object.keys(wrapper.vm.fileTypeMap)
      expect(fileTypes).toContain('pdf')
      expect(fileTypes).toContain('jpg')
      expect(fileTypes).toContain('csv')
    })
  })

  describe('Plugin Order', () => {
    it('maintains plugin order from registry', () => {
      wrapper = mount(PluginGrid, {
        global: {
          components: { BasePlugin }
        }
      })

      const basePlugins = wrapper.findAllComponents(BasePlugin)
      expect(basePlugins[0].props('plugin').name).toBe('Plugin 1')
      expect(basePlugins[1].props('plugin').name).toBe('Plugin 2')
      expect(basePlugins[2].props('plugin').name).toBe('Plugin 3')
    })
  })

  describe('Complex File Type Scenarios', () => {
    it('handles file types with single plugin support', () => {
      wrapper = mount(PluginGrid, {
        global: {
          components: { BasePlugin }
        }
      })

      const fileTypeCards = wrapper.findAll('.flex.items-center.justify-between.p-3')
      const docCard = fileTypeCards.find(card => card.text().includes('doc'))

      const dots = docCard!.findAll('.w-3.h-3.rounded-full')
      expect(dots).toHaveLength(1) // Only Plugin 1
    })

    it('handles file types with multiple plugin support', () => {
      wrapper = mount(PluginGrid, {
        global: {
          components: { BasePlugin }
        }
      })

      const fileTypeCards = wrapper.findAll('.flex.items-center.justify-between.p-3')
      const pdfCard = fileTypeCards.find(card => card.text().includes('pdf'))

      const dots = pdfCard!.findAll('.w-3.h-3.rounded-full')
      expect(dots).toHaveLength(2) // Plugin 1 and Plugin 3
    })
  })
})