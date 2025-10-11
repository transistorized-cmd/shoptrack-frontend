import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockRouter } from '../../../tests/utils/router'
import { categorizedDescribe, categorizedIt, TestCategory } from '../../../tests/utils/categories'
import PluginCard from '../PluginCard.vue'
import type { ReceiptPlugin } from '@/types/plugin'

// Mock file validation
vi.mock('@/utils/fileValidation', () => ({
  formatFileSize: vi.fn((bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }
    return `${bytes} bytes`
  })
}))

vi.mock('@/constants/app', () => ({
  FILE_SIZE: {
    KB: 1024,
    MB: 1024 * 1024
  }
}))

categorizedDescribe('PluginCard', [TestCategory.COMPONENT, TestCategory.UNIT, TestCategory.FAST], () => {
  let wrapper: any
  let mockRouter: any

  const mockPlugin: ReceiptPlugin = {
    key: 'generic-receipt',
    name: 'Generic Receipt',
    version: '1.0.0',
    description: 'Process general receipts from various stores',
    color: '#3B82F6',
    icon: '📄',
    supportedFileTypes: ['pdf', 'jpg', 'png'],
    maxFileSizeKB: 10240, // 10MB
    supportsManualEntry: true,
    supportsBatchProcessing: false,
    requiresImageConversion: false
  }

  beforeEach(() => {
    const routerSetup = createMockRouter()
    mockRouter = routerSetup.mockRouter
  })

  categorizedDescribe('Rendering', [TestCategory.FAST, TestCategory.CRITICAL], () => {
    categorizedIt('should render plugin information', [TestCategory.CRITICAL], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      expect(wrapper.text()).toContain('Generic Receipt')
      expect(wrapper.text()).toContain('v1.0.0')
      expect(wrapper.text()).toContain('Process general receipts from various stores')
    })

    categorizedIt('should render plugin icon', [TestCategory.FAST], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      expect(wrapper.text()).toContain('📄')
    })

    categorizedIt('should render supported file types', [TestCategory.CRITICAL], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      expect(wrapper.text()).toContain('PDF, JPG, PNG')
    })

    categorizedIt('should render max file size', [TestCategory.CRITICAL], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      expect(wrapper.text()).toContain('Max size: 10.0 MB')
    })

    categorizedIt('should render file types count', [TestCategory.FAST], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      expect(wrapper.text()).toContain('3 file types')
    })

    categorizedIt('should apply dynamic background color', [TestCategory.FAST], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      const header = wrapper.find('.p-6.border-b')
      const style = header.attributes('style')
      expect(style).toContain('background')
      expect(style).toContain('#3B82F6')
    })
  })

  categorizedDescribe('Feature Badges', [TestCategory.FAST], () => {
    categorizedIt('should show manual entry badge when supported', [TestCategory.CRITICAL], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      expect(wrapper.text()).toContain('Manual Entry')
      expect(wrapper.find('.bg-green-100').exists()).toBe(true)
    })

    categorizedIt('should show batch processing badge when supported', [TestCategory.CRITICAL], async () => {
      const batchPlugin = {
        ...mockPlugin,
        supportsBatchProcessing: true
      }

      wrapper = mount(PluginCard, {
        props: { plugin: batchPlugin },
        global: { plugins: [mockRouter] }
      })

      expect(wrapper.text()).toContain('Batch Processing')
      expect(wrapper.find('.bg-blue-100').exists()).toBe(true)
    })

    categorizedIt('should show image processing badge when required', [TestCategory.CRITICAL], async () => {
      const imagePlugin = {
        ...mockPlugin,
        requiresImageConversion: true
      }

      wrapper = mount(PluginCard, {
        props: { plugin: imagePlugin },
        global: { plugins: [mockRouter] }
      })

      expect(wrapper.text()).toContain('Image Processing')
      expect(wrapper.find('.bg-purple-100').exists()).toBe(true)
    })

    categorizedIt('should not show badges for unsupported features', [TestCategory.FAST], async () => {
      const minimalPlugin = {
        ...mockPlugin,
        supportsManualEntry: false,
        supportsBatchProcessing: false,
        requiresImageConversion: false
      }

      wrapper = mount(PluginCard, {
        props: { plugin: minimalPlugin },
        global: { plugins: [mockRouter] }
      })

      expect(wrapper.text()).not.toContain('Manual Entry')
      expect(wrapper.text()).not.toContain('Batch Processing')
      expect(wrapper.text()).not.toContain('Image Processing')
    })

    categorizedIt('should show all badges when all features supported', [TestCategory.FAST], async () => {
      const fullFeaturedPlugin = {
        ...mockPlugin,
        supportsManualEntry: true,
        supportsBatchProcessing: true,
        requiresImageConversion: true
      }

      wrapper = mount(PluginCard, {
        props: { plugin: fullFeaturedPlugin },
        global: { plugins: [mockRouter] }
      })

      expect(wrapper.text()).toContain('Manual Entry')
      expect(wrapper.text()).toContain('Batch Processing')
      expect(wrapper.text()).toContain('Image Processing')
    })
  })

  categorizedDescribe('File Upload', [TestCategory.INTEGRATION, TestCategory.COMPONENT], () => {
    categorizedIt('should render file input with correct accept attribute', [TestCategory.CRITICAL], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      const fileInput = wrapper.find('input[type="file"]')
      expect(fileInput.exists()).toBe(true)
      expect(fileInput.attributes('accept')).toBe('.pdf,.jpg,.png')
    })

    categorizedIt('should handle file selection', [TestCategory.CRITICAL], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = wrapper.find('input[type="file"]')

      Object.defineProperty(fileInput.element, 'files', {
        value: [file],
        writable: false
      })

      await fileInput.trigger('change')

      // File should be selected
      expect(wrapper.vm.selectedFile).toStrictEqual(file)
    })

    categorizedIt('should enable upload button when file is selected', [TestCategory.CRITICAL], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      const fileInput = wrapper.find('input[type="file"]')
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      Object.defineProperty(fileInput.element, 'files', {
        value: [file],
        writable: false
      })

      await fileInput.trigger('change')
      await wrapper.vm.$nextTick()

      const uploadButton = wrapper.find('button[type="submit"]')
      expect(uploadButton.attributes('disabled')).toBeUndefined()
    })

    categorizedIt('should disable upload button when no file selected', [TestCategory.CRITICAL], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      const uploadButton = wrapper.find('button[type="submit"]')
      expect(uploadButton.attributes('disabled')).toBeDefined()
    })

    categorizedIt('should emit upload event with file and plugin key', [TestCategory.CRITICAL], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = wrapper.find('input[type="file"]')

      Object.defineProperty(fileInput.element, 'files', {
        value: [file],
        writable: false
      })

      await fileInput.trigger('change')
      await wrapper.find('form').trigger('submit')

      expect(wrapper.emitted('upload')).toBeTruthy()
      expect(wrapper.emitted('upload')[0]).toEqual([{
        file,
        pluginKey: 'generic-receipt'
      }])
    })

    categorizedIt('should show uploading state during upload', [TestCategory.CRITICAL], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = wrapper.find('input[type="file"]')

      Object.defineProperty(fileInput.element, 'files', {
        value: [file],
        writable: false
      })

      await fileInput.trigger('change')
      await wrapper.find('form').trigger('submit')

      expect(wrapper.text()).toContain('Uploading...')
      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    })

    categorizedIt('should disable file input during upload', [TestCategory.CRITICAL], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = wrapper.find('input[type="file"]')

      Object.defineProperty(fileInput.element, 'files', {
        value: [file],
        writable: false
      })

      await fileInput.trigger('change')
      await wrapper.find('form').trigger('submit')

      expect(fileInput.attributes('disabled')).toBeDefined()
    })

    categorizedIt('should reset upload state via exposed method', [TestCategory.CRITICAL], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = wrapper.find('input[type="file"]')

      Object.defineProperty(fileInput.element, 'files', {
        value: [file],
        writable: false
      })

      await fileInput.trigger('change')
      await wrapper.find('form').trigger('submit')

      // Call exposed reset method
      wrapper.vm.resetUploadState()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.uploading).toBe(false)
      expect(wrapper.vm.selectedFile).toBe(null)
    })
  })

  categorizedDescribe('Manual Entry', [TestCategory.FAST], () => {
    categorizedIt('should show manual entry button when supported', [TestCategory.CRITICAL], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      const manualButton = wrapper.find('button:not([type="submit"])')
      expect(manualButton.text()).toContain('Manual Entry')
    })

    categorizedIt('should not show manual entry button when not supported', [TestCategory.FAST], async () => {
      const noManualPlugin = {
        ...mockPlugin,
        supportsManualEntry: false
      }

      wrapper = mount(PluginCard, {
        props: { plugin: noManualPlugin },
        global: { plugins: [mockRouter] }
      })

      const buttons = wrapper.findAll('button')
      const manualButton = buttons.find(btn => btn.text().includes('Manual Entry'))
      expect(manualButton).toBeUndefined()
    })

    categorizedIt('should emit manual-entry event with plugin key', [TestCategory.CRITICAL], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      const manualButton = wrapper.find('button:not([type="submit"])')
      await manualButton.trigger('click')

      expect(wrapper.emitted('manual-entry')).toBeTruthy()
      expect(wrapper.emitted('manual-entry')[0]).toEqual(['generic-receipt'])
    })

    categorizedIt('should style manual entry button with plugin color', [TestCategory.FAST], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      const manualButton = wrapper.find('button:not([type="submit"])')
      const style = manualButton.attributes('style')
      expect(style).toContain('border-color')
      expect(style).toContain('#3B82F6')
      expect(style).toContain('color')
    })
  })

  categorizedDescribe('Dynamic Styling', [TestCategory.FAST], () => {
    categorizedIt('should apply plugin color to upload button', [TestCategory.FAST], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      const uploadButton = wrapper.find('button[type="submit"]')
      const style = uploadButton.attributes('style')
      expect(style).toContain('background-color')
      expect(style).toContain('#3B82F6')
    })

    categorizedIt('should apply plugin color to icon background', [TestCategory.FAST], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      const iconContainer = wrapper.find('.w-12.h-12.rounded-full')
      const style = iconContainer.attributes('style')
      expect(style).toContain('background-color')
      expect(style).toContain('#3B82F6')
    })

    categorizedIt('should handle different plugin colors', [TestCategory.FAST], async () => {
      const redPlugin = {
        ...mockPlugin,
        color: '#EF4444'
      }

      wrapper = mount(PluginCard, {
        props: { plugin: redPlugin },
        global: { plugins: [mockRouter] }
      })

      const uploadButton = wrapper.find('button[type="submit"]')
      const style = uploadButton.attributes('style')
      expect(style).toContain('#EF4444')
    })
  })

  categorizedDescribe('Edge Cases', [TestCategory.FAST], () => {
    categorizedIt('should handle plugin with single file type', [TestCategory.FAST], async () => {
      const singleTypePlugin = {
        ...mockPlugin,
        supportedFileTypes: ['pdf']
      }

      wrapper = mount(PluginCard, {
        props: { plugin: singleTypePlugin },
        global: { plugins: [mockRouter] }
      })

      expect(wrapper.text()).toContain('PDF')
      expect(wrapper.text()).toContain('1 file types')
      expect(wrapper.find('input[type="file"]').attributes('accept')).toBe('.pdf')
    })

    categorizedIt('should handle plugin with many file types', [TestCategory.FAST], async () => {
      const manyTypesPlugin = {
        ...mockPlugin,
        supportedFileTypes: ['pdf', 'jpg', 'png', 'gif', 'bmp', 'tiff', 'webp']
      }

      wrapper = mount(PluginCard, {
        props: { plugin: manyTypesPlugin },
        global: { plugins: [mockRouter] }
      })

      expect(wrapper.text()).toContain('7 file types')
      expect(wrapper.find('input[type="file"]').attributes('accept'))
        .toBe('.pdf,.jpg,.png,.gif,.bmp,.tiff,.webp')
    })

    categorizedIt('should handle very large file size limit', [TestCategory.FAST], async () => {
      const largeFileSizePlugin = {
        ...mockPlugin,
        maxFileSizeKB: 102400 // 100MB
      }

      wrapper = mount(PluginCard, {
        props: { plugin: largeFileSizePlugin },
        global: { plugins: [mockRouter] }
      })

      expect(wrapper.text()).toContain('100.0 MB')
    })

    categorizedIt('should handle small file size limit', [TestCategory.FAST], async () => {
      const smallFileSizePlugin = {
        ...mockPlugin,
        maxFileSizeKB: 500 // 500KB
      }

      wrapper = mount(PluginCard, {
        props: { plugin: smallFileSizePlugin },
        global: { plugins: [mockRouter] }
      })

      expect(wrapper.text()).toContain('500.0 KB')
    })

    categorizedIt('should handle file selection change', [TestCategory.FAST], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      const fileInput = wrapper.find('input[type="file"]')
      const file1 = new File(['test1'], 'test1.pdf', { type: 'application/pdf' })
      const file2 = new File(['test2'], 'test2.pdf', { type: 'application/pdf' })

      // Select first file
      Object.defineProperty(fileInput.element, 'files', {
        value: [file1],
        writable: false,
        configurable: true
      })
      await fileInput.trigger('change')
      expect(wrapper.vm.selectedFile).toStrictEqual(file1)

      // Change to second file
      Object.defineProperty(fileInput.element, 'files', {
        value: [file2],
        writable: false,
        configurable: true
      })
      await fileInput.trigger('change')
      expect(wrapper.vm.selectedFile).toStrictEqual(file2)
    })

    categorizedIt('should handle form submission without file', [TestCategory.FAST], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      await wrapper.find('form').trigger('submit')

      // Should not emit upload event
      expect(wrapper.emitted('upload')).toBeFalsy()
    })
  })

  categorizedDescribe('Accessibility', [TestCategory.ACCESSIBILITY], () => {
    categorizedIt('should have required attribute on file input', [TestCategory.ACCESSIBILITY], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      const fileInput = wrapper.find('input[type="file"]')
      expect(fileInput.attributes('required')).toBeDefined()
    })

    categorizedIt('should have proper button types', [TestCategory.ACCESSIBILITY], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      const uploadButton = wrapper.find('button[type="submit"]')
      expect(uploadButton.attributes('type')).toBe('submit')
    })

    categorizedIt('should have descriptive button text', [TestCategory.ACCESSIBILITY], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      const uploadButton = wrapper.find('button[type="submit"]')
      expect(uploadButton.text()).toBeTruthy()
      expect(['Upload', 'Uploading...']).toContain(uploadButton.text())
    })

    categorizedIt('should properly disable buttons when uploading', [TestCategory.ACCESSIBILITY], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = wrapper.find('input[type="file"]')

      Object.defineProperty(fileInput.element, 'files', {
        value: [file],
        writable: false
      })

      await fileInput.trigger('change')
      await wrapper.find('form').trigger('submit')

      const uploadButton = wrapper.find('button[type="submit"]')
      expect(uploadButton.classes()).toContain('disabled:cursor-not-allowed')
    })
  })

  categorizedDescribe('Responsive Design', [TestCategory.FAST], () => {
    categorizedIt('should have responsive padding', [TestCategory.FAST], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      // Component uses p-6 padding consistently
      const paddingElements = wrapper.findAll('.p-6')
      expect(paddingElements.length).toBeGreaterThan(0)
    })

    categorizedIt('should have hover effects', [TestCategory.FAST], async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin },
        global: { plugins: [mockRouter] }
      })

      const uploadButton = wrapper.find('button[type="submit"]')
      expect(uploadButton.classes()).toContain('hover:opacity-90')
    })
  })
})
