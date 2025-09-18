import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { RouterLink } from 'vue-router'
import Upload from '../Upload.vue'
import QuickUpload from '@/components/QuickUpload.vue'
import { createMockRouter } from '../../../tests/utils/router'
import type { ReceiptPlugin, ProcessingResult } from '@/types/plugin'

// Mock the plugins store
const mockPluginsStore = {
  fetchAllPlugins: vi.fn(),
  availableReceiptPlugins: [] as ReceiptPlugin[],
}

// Mock the receipts store
const mockReceiptsStore = {
  fetchReceipts: vi.fn(),
  receipts: [],
}

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    defineStore: () => () => mockPluginsStore,
  }
})

vi.mock('@/stores/plugins', () => ({
  usePluginsStore: () => mockPluginsStore,
}))

vi.mock('@/stores/receipts', () => ({
  useReceiptsStore: () => mockReceiptsStore,
}))

vi.mock('@/services/plugins', () => ({
  pluginsService: {
    getAllPlugins: vi.fn(),
    detectPlugin: vi.fn(),
  },
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: vi.fn((key: string) => key),
  }),
}))

vi.mock('@/i18n', () => ({
  getCurrentLocale: vi.fn(() => 'en'),
}))

vi.mock('@/utils/fileValidation', () => ({
  validateFile: vi.fn(),
  formatFileSize: vi.fn((size: number) => `${size} bytes`),
}))

vi.mock('@/i18n/plugins', () => ({
  getPluginTranslations: vi.fn(),
  hasPluginTranslations: vi.fn(),
}))

// Mock constants
vi.mock('@/constants/app', () => ({
  FILE_SIZE: {
    DEFAULT_MAX_SIZE_BYTES: 10 * 1024 * 1024,
  },
}))

describe('Upload View', () => {
  let pinia: any
  let mockRouter: any
  let mockPluginsService: any
  let mockValidateFile: any
  let mockFormatFileSize: any
  let mockGetPluginTranslations: any
  let mockHasPluginTranslations: any

  const createWrapper = (options = {}) => {
    const { mockRouter: router } = createMockRouter()
    mockRouter = router

    return mount(Upload, {
      global: {
        plugins: [pinia, router],
        components: {
          QuickUpload,
        },
        stubs: {
          QuickUpload: true,
        },
        mocks: {
          $t: (key: string) => key,
        },
      },
      ...options,
    })
  }

  const createMockPlugin = (overrides = {}): ReceiptPlugin => ({
    key: 'test-plugin',
    name: 'Test Plugin',
    description: 'Test description',
    version: '1.0.0',
    icon: '📄',
    color: '#3B82F6',
    supportedFileTypes: ['pdf', 'jpg'],
    supportsManualEntry: false,
    supportsBatchProcessing: false,
    requiresImageConversion: true,
    maxFileSizeKB: 5 * 1024,
    type: 'receipt' as const,
    ...overrides,
  })

  const createMockFile = (name = 'test.pdf', type = 'application/pdf', size = 1024): File => {
    const file = new File(['test content'], name, { type })
    Object.defineProperty(file, 'size', { value: size })
    return file
  }

  beforeEach(async () => {
    pinia = createPinia()

    // Get mocked functions
    const pluginsModule = await import('@/services/plugins')
    const validationModule = await import('@/utils/fileValidation')
    const pluginI18nModule = await import('@/i18n/plugins')

    mockPluginsService = vi.mocked(pluginsModule.pluginsService)
    mockValidateFile = vi.mocked(validationModule.validateFile)
    mockFormatFileSize = vi.mocked(validationModule.formatFileSize)
    mockGetPluginTranslations = vi.mocked(pluginI18nModule.getPluginTranslations)
    mockHasPluginTranslations = vi.mocked(pluginI18nModule.hasPluginTranslations)

    // Reset all mocks
    vi.clearAllMocks()

    // Default mock implementations
    mockValidateFile.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    })

    mockHasPluginTranslations.mockReturnValue(false)
    mockGetPluginTranslations.mockReturnValue({})

    mockPluginsService.getAllPlugins.mockResolvedValue({
      receiptPlugins: [],
      reportPlugins: [],
    })

    mockPluginsStore.fetchAllPlugins.mockResolvedValue([])
    mockPluginsStore.availableReceiptPlugins = []
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render the upload view with title and description', () => {
      const wrapper = createWrapper()

      expect(wrapper.find('h1').text()).toBe('upload.uploadReceiptOrOrder')
      expect(wrapper.find('p').text()).toBe('upload.chooseBestMethod')
      expect(wrapper.findComponent(QuickUpload).exists()).toBe(true)
    })

    it('should not render plugin grid when no plugins available', async () => {
      const wrapper = createWrapper()
      wrapper.vm.availablePlugins = []
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.grid.grid-cols-1.lg\\:grid-cols-2').exists()).toBe(false)
      expect(wrapper.find('[data-testid="plugin-grid"]').exists()).toBe(false)
    })

    it('should render plugin grid when plugins are available', async () => {
      const plugins = [createMockPlugin()]

      const wrapper = createWrapper()

      // Simulate plugins being loaded
      await wrapper.vm.$nextTick()
      wrapper.vm.availablePlugins = plugins
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.grid.grid-cols-1.lg\\:grid-cols-2').exists()).toBe(true)
    })

    it('should render file type reference when plugins available', async () => {
      const plugins = [createMockPlugin()]

      const wrapper = createWrapper()
      wrapper.vm.availablePlugins = plugins
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('upload.supportedFileTypes')
      expect(wrapper.text()).toContain('upload.eachColoredDot')
    })
  })

  describe('Plugin Display', () => {
    it('should display plugin information correctly', async () => {
      const plugin = createMockPlugin({
        name: 'PDF Processor',
        description: 'Process PDF receipts',
        version: '2.1.0',
        icon: '📄',
        supportedFileTypes: ['pdf', 'jpg'],
        supportsManualEntry: true,
        supportsBatchProcessing: true,
        requiresImageConversion: false,
      })

      const wrapper = createWrapper()
      wrapper.vm.availablePlugins = [plugin]
      await wrapper.vm.$nextTick()

      const pluginCard = wrapper.find('.card')
      expect(pluginCard.exists()).toBe(true)
      expect(pluginCard.text()).toContain('v2.1.0')
    })

    it('should display plugin capabilities correctly', async () => {
      const plugin = createMockPlugin({
        supportsManualEntry: true,
        supportsBatchProcessing: true,
        requiresImageConversion: true,
      })

      const wrapper = createWrapper()
      wrapper.vm.availablePlugins = [plugin]
      await wrapper.vm.$nextTick()

      const capabilities = wrapper.find('.mb-6.space-y-2')
      expect(capabilities.exists()).toBe(true)
      // Should show manual entry, batch processing, and image processing capabilities
      expect(capabilities.findAll('.flex.items-center').length).toBeGreaterThan(3)
    })

    it('should show manual entry button only for plugins that support it', async () => {
      const pluginWithManual = createMockPlugin({
        key: 'manual-plugin',
        supportsManualEntry: true,
      })
      const pluginWithoutManual = createMockPlugin({
        key: 'no-manual-plugin',
        supportsManualEntry: false,
      })

      const wrapper = createWrapper()
      wrapper.vm.availablePlugins = [pluginWithManual, pluginWithoutManual]
      await wrapper.vm.$nextTick()

      const manualButtons = wrapper.findAll('button').filter(button =>
        button.element.textContent?.includes('manualEntry')
      )
      expect(manualButtons.length).toBe(1)
    })
  })

  describe('File Upload Handling', () => {
    it('should handle file selection for plugins', async () => {
      const plugin = createMockPlugin()
      const wrapper = createWrapper()
      wrapper.vm.availablePlugins = [plugin]
      await wrapper.vm.$nextTick()

      const file = createMockFile()
      const fileInput = wrapper.find('input[type="file"]')

      // Simulate file selection
      const event = {
        target: {
          files: [file],
        },
      }

      await wrapper.vm.handlePluginFileChange(event, plugin.key)

      expect(wrapper.vm.pluginFiles[plugin.key]).toStrictEqual(file)
      expect(mockValidateFile).toHaveBeenCalledWith(file, plugin)
    })

    it('should validate file before accepting selection', async () => {
      const plugin = createMockPlugin()
      const wrapper = createWrapper()
      wrapper.vm.availablePlugins = [plugin]

      mockValidateFile.mockReturnValue({
        isValid: false,
        errors: ['File too large'],
        warnings: [],
      })

      const file = createMockFile()
      const event = { target: { files: [file] } }

      await wrapper.vm.handlePluginFileChange(event, plugin.key)

      expect(wrapper.vm.showValidationErrors[plugin.key]).toBe(true)
      expect(wrapper.vm.fileValidationResults[plugin.key].errors).toEqual(['File too large'])
    })

    it('should show validation warnings when file has warnings', async () => {
      const plugin = createMockPlugin()
      const wrapper = createWrapper()
      wrapper.vm.availablePlugins = [plugin]

      mockValidateFile.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: ['File may be compressed'],
      })

      const file = createMockFile()
      const event = { target: { files: [file] } }

      await wrapper.vm.handlePluginFileChange(event, plugin.key)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.fileValidationResults[plugin.key].warnings).toEqual(['File may be compressed'])
      expect(wrapper.vm.showValidationErrors[plugin.key]).toBe(true)
    })

    it('should disable upload button when no file selected', async () => {
      const plugin = createMockPlugin()
      const wrapper = createWrapper()
      wrapper.vm.availablePlugins = [plugin]
      await wrapper.vm.$nextTick()

      const uploadButton = wrapper.find('button[type="submit"]')
      expect(uploadButton.attributes('disabled')).toBeDefined()
    })

    it('should enable upload button when valid file selected', async () => {
      const plugin = createMockPlugin()
      const wrapper = createWrapper()
      wrapper.vm.availablePlugins = [plugin]

      const file = createMockFile()
      wrapper.vm.pluginFiles[plugin.key] = file
      await wrapper.vm.$nextTick()

      const uploadButton = wrapper.find('button[type="submit"]')
      expect(uploadButton.attributes('disabled')).toBeUndefined()
    })
  })

  describe('File Upload Process', () => {
    it('should handle successful plugin upload', async () => {
      const plugin = createMockPlugin()
      const wrapper = createWrapper()
      wrapper.vm.availablePlugins = [plugin]

      const file = createMockFile()
      wrapper.vm.pluginFiles[plugin.key] = file

      mockValidateFile.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      })

      // Mock setTimeout to resolve immediately
      vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback()
        return 1 as any
      })

      // Mock the upload process with a promise that resolves
      await wrapper.vm.handlePluginUpload({
        file,
        pluginKey: plugin.key,
      })

      // Check completion state
      expect(wrapper.vm.pluginUploading[plugin.key]).toBe(false)
      expect(wrapper.vm.uploadResult).not.toBeNull()
      expect(wrapper.vm.uploadResult?.success).toBe(true)
    })

    it('should handle upload validation failure', async () => {
      const plugin = createMockPlugin()
      const wrapper = createWrapper()
      wrapper.vm.availablePlugins = [plugin]

      const file = createMockFile()

      mockValidateFile.mockResolvedValue({
        isValid: false,
        errors: ['Invalid file format'],
        warnings: [],
      })

      await wrapper.vm.handlePluginUpload({
        file,
        pluginKey: plugin.key,
      })

      expect(wrapper.vm.showValidationErrors[plugin.key]).toBe(true)
      expect(wrapper.vm.uploadResult).toBeNull()
    })

    it('should handle upload errors gracefully', async () => {
      const plugin = createMockPlugin()
      const wrapper = createWrapper()
      wrapper.vm.availablePlugins = [plugin]

      const file = createMockFile()

      mockValidateFile.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      })

      // Mock network error by throwing during timeout
      vi.spyOn(global, 'setTimeout').mockImplementation(() => {
        throw new Error('Network error')
      })

      await wrapper.vm.handlePluginUpload({
        file,
        pluginKey: plugin.key,
      })

      expect(wrapper.vm.uploadResult?.success).toBe(false)
      expect(wrapper.vm.uploadResult?.errors).toEqual(['Upload failed. Please try again.'])
    })

    it('should clear form after successful upload', async () => {
      const plugin = createMockPlugin()
      const wrapper = createWrapper()
      wrapper.vm.availablePlugins = [plugin]

      const file = createMockFile()
      wrapper.vm.pluginFiles[plugin.key] = file

      mockValidateFile.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      })

      // Mock setTimeout to resolve immediately
      vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback()
        return 1 as any
      })

      await wrapper.vm.handlePluginUpload({
        file,
        pluginKey: plugin.key,
      })

      expect(wrapper.vm.pluginFiles[plugin.key]).toBeNull()
    })
  })

  describe('Manual Entry', () => {
    it('should navigate to manual entry route when manual entry button clicked', async () => {
      const plugin = createMockPlugin({
        supportsManualEntry: true,
      })

      const wrapper = createWrapper()
      wrapper.vm.availablePlugins = [plugin]
      await wrapper.vm.$nextTick()

      await wrapper.vm.handleManualEntry(plugin.key)

      expect(mockRouter.push).toHaveBeenCalledWith(`/manual-entry/${plugin.key}`)
    })

    it('should handle manual entry for plugins that support it', async () => {
      const plugin = createMockPlugin({
        key: 'amazon-orders',
        supportsManualEntry: true,
      })

      const wrapper = createWrapper()
      wrapper.vm.availablePlugins = [plugin]
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAll('button')
      const manualButton = buttons.find(button =>
        button.element.textContent?.includes('manualEntry')
      )

      if (manualButton) {
        await manualButton.trigger('click')
      }

      expect(mockRouter.push).toHaveBeenCalledWith('/manual-entry/amazon-orders')
    })
  })

  describe('Upload Results Display', () => {
    it('should display upload result when available', async () => {
      const wrapper = createWrapper()

      const mockResult: ProcessingResult = {
        success: true,
        receipt: {
          id: '123',
          fileName: 'test.pdf',
          originalFileName: 'test.pdf',
          filePath: '/uploads/test.pdf',
          itemsDetected: 5,
          confidence: 85,
          successfullyParsed: 4,
          processingStatus: 'completed',
          pluginUsed: 'test-plugin',
          uploadedAt: new Date().toISOString(),
          processingTime: 2500,
        } as any,
        errors: [],
        warnings: [],
        message: 'Upload successful',
        isDuplicate: false,
        items: [],
      }

      wrapper.vm.uploadResult = mockResult
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('upload.uploadResult')
      expect(wrapper.text()).toContain('upload.itemsDetected')
      expect(wrapper.text()).toContain('upload.confidence')
    })

    it('should display errors in upload result', async () => {
      const wrapper = createWrapper()

      const mockResult: ProcessingResult = {
        success: false,
        receipt: {} as any,
        errors: ['File format not supported', 'Processing failed'],
        warnings: [],
        message: 'Upload failed',
        isDuplicate: false,
        items: [],
      }

      wrapper.vm.uploadResult = mockResult
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('File format not supported')
      expect(wrapper.text()).toContain('Processing failed')
    })

    it('should show "View Receipts" link on successful upload', async () => {
      const wrapper = createWrapper()

      const mockResult: ProcessingResult = {
        success: true,
        receipt: { id: '123' } as any,
        errors: [],
        warnings: [],
        message: 'Upload successful',
        isDuplicate: false,
        items: [],
      }

      wrapper.vm.uploadResult = mockResult
      await wrapper.vm.$nextTick()

      const viewReceiptsLink = wrapper.findComponent(RouterLink)
      expect(viewReceiptsLink.exists()).toBe(true)
      expect(viewReceiptsLink.props('to')).toBe('/receipts')
    })

    it('should allow clearing upload result', async () => {
      const wrapper = createWrapper()

      wrapper.vm.uploadResult = {
        success: true,
        receipt: {} as any,
        errors: [],
        warnings: [],
        message: 'Upload successful',
        isDuplicate: false,
        items: [],
      }

      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAll('button')
      const clearButton = buttons.find(button =>
        button.element.textContent?.includes('Upload Another')
      )

      if (clearButton) {
        await clearButton.trigger('click')
      }

      expect(wrapper.vm.uploadResult).toBeNull()
    })
  })

  describe('Plugin Translation', () => {
    it('should use plugin translations when available', () => {
      mockHasPluginTranslations.mockReturnValue(true)
      mockGetPluginTranslations.mockReturnValue({
        name: 'Translated Name',
        description: 'Translated Description',
      })

      const wrapper = createWrapper()

      const result = wrapper.vm.getPluginTranslation('test-plugin', 'name')
      expect(result).toBe('Translated Name')

      expect(mockGetPluginTranslations).toHaveBeenCalledWith('test-plugin', 'en')
    })

    it('should fallback to key when no translations available', () => {
      mockHasPluginTranslations.mockReturnValue(false)

      const wrapper = createWrapper()

      const result = wrapper.vm.getPluginTranslation('test-plugin', 'actions.upload')
      expect(result).toBe('upload')
    })

    it('should handle nested translation keys', () => {
      mockHasPluginTranslations.mockReturnValue(true)
      mockGetPluginTranslations.mockReturnValue({
        actions: {
          upload: 'Upload File',
          process: 'Process',
        },
      })

      const wrapper = createWrapper()

      const result = wrapper.vm.getPluginTranslation('test-plugin', 'actions.upload')
      expect(result).toBe('Upload File')
    })
  })

  describe('File Type Mapping', () => {
    it('should create file type map from available plugins', async () => {
      const plugins = [
        createMockPlugin({
          key: 'pdf-plugin',
          supportedFileTypes: ['pdf', 'jpg'],
        }),
        createMockPlugin({
          key: 'csv-plugin',
          supportedFileTypes: ['csv', 'xlsx'],
        }),
      ]

      const wrapper = createWrapper()
      wrapper.vm.availablePlugins = plugins
      await wrapper.vm.$nextTick()

      const fileTypeMap = wrapper.vm.fileTypeMap

      expect(fileTypeMap.pdf).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'pdf-plugin' })]))
      expect(fileTypeMap.jpg).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'pdf-plugin' })]))
      expect(fileTypeMap.csv).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'csv-plugin' })]))
      expect(fileTypeMap.xlsx).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'csv-plugin' })]))
    })

    it('should handle multiple plugins supporting same file type', async () => {
      const plugins = [
        createMockPlugin({
          key: 'plugin1',
          supportedFileTypes: ['pdf'],
        }),
        createMockPlugin({
          key: 'plugin2',
          supportedFileTypes: ['pdf'],
        }),
      ]

      const wrapper = createWrapper()
      wrapper.vm.availablePlugins = plugins
      await wrapper.vm.$nextTick()

      const fileTypeMap = wrapper.vm.fileTypeMap

      expect(fileTypeMap.pdf).toHaveLength(2)
      expect(fileTypeMap.pdf).toEqual(expect.arrayContaining([
        expect.objectContaining({ key: 'plugin1' }),
        expect.objectContaining({ key: 'plugin2' })
      ]))
    })
  })

  describe('Plugin Loading', () => {
    it('should load plugins on mount', async () => {
      const mockPlugins = [createMockPlugin()]

      mockPluginsService.getAllPlugins.mockResolvedValue({
        receiptPlugins: mockPlugins,
        reportPlugins: [],
      })

      mockPluginsStore.availableReceiptPlugins = []

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      expect(mockPluginsStore.fetchAllPlugins).toHaveBeenCalled()
    })

    it('should use backend plugins when available', async () => {
      const backendPlugins = [createMockPlugin({ key: 'backend-plugin' })]

      mockPluginsStore.availableReceiptPlugins = backendPlugins

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      // Should use backend plugins if available
      if (mockPluginsStore.availableReceiptPlugins.length > 0) {
        expect(wrapper.vm.availablePlugins).toStrictEqual(backendPlugins)
      }
    })

    it('should handle plugin loading errors gracefully', async () => {
      mockPluginsStore.fetchAllPlugins.mockRejectedValue(new Error('Failed to load'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      expect(consoleSpy).toHaveBeenCalledWith('Failed to load plugins, using demo data:', expect.any(Error))

      consoleSpy.mockRestore()
    })

    it('should keep demo plugins when backend plugins unavailable', async () => {
      mockPluginsStore.availableReceiptPlugins = []

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      // Should keep demo plugins when no backend plugins available
      expect(wrapper.vm.availablePlugins.length).toBeGreaterThan(0)
    })
  })

  describe('Accessibility and User Experience', () => {
    it('should have proper form structure', async () => {
      const plugin = createMockPlugin()
      const wrapper = createWrapper()
      wrapper.vm.availablePlugins = [plugin]
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form.plugin-form')
      expect(form.exists()).toBe(true)
      expect(form.attributes('action')).toBeUndefined() // Should use prevent default
    })

    it('should show loading state during upload', async () => {
      const plugin = createMockPlugin()
      const wrapper = createWrapper()
      wrapper.vm.availablePlugins = [plugin]
      wrapper.vm.pluginUploading[plugin.key] = true
      await wrapper.vm.$nextTick()

      const uploadButton = wrapper.find('button[type="submit"]')
      expect(uploadButton.element.textContent).toContain('uploading')
      expect(uploadButton.attributes('disabled')).toBeDefined()
    })

    it('should handle file size formatting', () => {
      const wrapper = createWrapper()

      mockFormatFileSize.mockReturnValue('5.2 MB')

      const plugin = createMockPlugin({ maxFileSizeKB: 5 * 1024 })
      wrapper.vm.availablePlugins = [plugin]

      expect(mockFormatFileSize).toHaveBeenCalledWith(5 * 1024 * 1024)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing plugin during file change', async () => {
      const wrapper = createWrapper()

      const file = createMockFile()
      const event = { target: { files: [file] } }

      // Try to handle file change for non-existent plugin
      await wrapper.vm.handlePluginFileChange(event, 'non-existent-plugin')

      // Should not crash and should not validate file
      expect(mockValidateFile).not.toHaveBeenCalled()
    })

    it('should handle missing plugin during upload', async () => {
      const wrapper = createWrapper()

      const file = createMockFile()

      // Try to upload for non-existent plugin
      await wrapper.vm.handlePluginUpload({
        file,
        pluginKey: 'non-existent-plugin',
      })

      // Should not crash and should return early
      expect(mockValidateFile).not.toHaveBeenCalled()
    })

    it('should handle file input without files', async () => {
      const plugin = createMockPlugin()
      const wrapper = createWrapper()
      wrapper.vm.availablePlugins = [plugin]

      const event = { target: { files: null } }

      await wrapper.vm.handlePluginFileChange(event, plugin.key)

      // Should not crash
      expect(wrapper.vm.pluginFiles[plugin.key]).toBeUndefined()
    })

    it('should validate file presence before upload', async () => {
      const plugin = createMockPlugin()
      const wrapper = createWrapper()
      wrapper.vm.availablePlugins = [plugin]

      // Try to upload without file
      await wrapper.vm.handlePluginUpload({
        file: null as any,
        pluginKey: plugin.key,
      })

      // Should return early without processing
      expect(mockValidateFile).not.toHaveBeenCalled()
    })
  })
})