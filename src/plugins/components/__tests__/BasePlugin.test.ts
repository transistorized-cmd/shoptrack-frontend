import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import BasePlugin from '../BasePlugin.vue'
import type { IPlugin } from '../../types/IPlugin'

// Mock dependencies
vi.mock('@/composables/useCsrfToken', () => ({
  useCsrfToken: () => ({
    getCsrfTokenSync: vi.fn(() => 'mock-csrf-token')
  })
}))

vi.mock('@/services/api', () => ({
  default: {
    post: vi.fn()
  }
}))

vi.mock('@/utils/fileValidation', () => ({
  formatFileSize: vi.fn((size: number) => {
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
    return `${Math.round(size / (1024 * 1024))} MB`
  })
}))

vi.mock('@/constants/app', () => ({
  FILE_SIZE: {
    MAX_UPLOAD: 10 * 1024 * 1024 // 10MB
  }
}))

describe('BasePlugin', () => {
  let wrapper: VueWrapper<any>
  let mockPlugin: IPlugin
  let consoleErrorSpy: any
  let consoleLogSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    mockPlugin = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      description: 'A test plugin for unit testing',
      icon: '🧪',
      color: '#10b981',
      gradientFrom: '#10b981',
      gradientTo: '#3b82f6',
      fileTypes: ['pdf', 'jpg', 'png'],
      features: ['OCR', 'Image Processing', 'Manual Entry'],
      uploadEndpoint: '/api/upload',
      hasManualEntry: true,
      manualEntryRoute: '/manual-entry',
      maxFileSize: 5 * 1024 * 1024 // 5MB
    }
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    consoleErrorSpy.mockRestore()
    consoleLogSpy.mockRestore()
  })

  describe('Basic Rendering', () => {
    it('renders plugin header with gradient background', () => {
      wrapper = mount(BasePlugin, {
        props: { plugin: mockPlugin }
      })

      const header = wrapper.find('.p-6.border-b')
      expect(header.exists()).toBe(true)
      expect(header.attributes('style')).toContain(`linear-gradient(135deg, ${mockPlugin.gradientFrom}, ${mockPlugin.gradientTo})`)
    })

    it('renders plugin icon', () => {
      wrapper = mount(BasePlugin, {
        props: { plugin: mockPlugin }
      })

      const iconContainer = wrapper.find('.w-12.h-12')
      expect(iconContainer.exists()).toBe(true)
      expect(iconContainer.find('span').text()).toBe('🧪')
      expect(iconContainer.attributes('style')).toContain(mockPlugin.color)
    })

    it('renders plugin name and version', () => {
      wrapper = mount(BasePlugin, {
        props: { plugin: mockPlugin }
      })

      expect(wrapper.find('h3').text()).toBe('Test Plugin')
      expect(wrapper.find('.text-sm.text-gray-600').text()).toBe('1.0.0')
    })

    it('renders file types in header', () => {
      wrapper = mount(BasePlugin, {
        props: { plugin: mockPlugin }
      })

      const fileTypes = wrapper.find('.text-xs.text-gray-500')
      expect(fileTypes.text()).toBe('PDF, JPG, PNG')
    })

    it('renders plugin description', () => {
      wrapper = mount(BasePlugin, {
        props: { plugin: mockPlugin }
      })

      const description = wrapper.find('.text-gray-700')
      expect(description.text()).toBe('A test plugin for unit testing')
    })
  })

  describe('Features Display', () => {
    it('renders all plugin features as badges', () => {
      wrapper = mount(BasePlugin, {
        props: { plugin: mockPlugin }
      })

      const features = wrapper.findAll('.px-2.py-1.text-xs.rounded-full')
      expect(features).toHaveLength(3)
      expect(features[0].text()).toBe('OCR')
      expect(features[1].text()).toBe('Image Processing')
      expect(features[2].text()).toBe('Manual Entry')
    })

    it('applies correct feature classes based on feature type', () => {
      wrapper = mount(BasePlugin, {
        props: { plugin: mockPlugin }
      })

      const features = wrapper.findAll('.px-2.py-1.text-xs.rounded-full')
      expect(features[0].classes()).toContain('bg-yellow-100')
      expect(features[0].classes()).toContain('text-yellow-800')
      expect(features[1].classes()).toContain('bg-purple-100')
      expect(features[1].classes()).toContain('text-purple-800')
      expect(features[2].classes()).toContain('bg-green-100')
      expect(features[2].classes()).toContain('text-green-800')
    })

    it('handles unknown feature types with default styling', () => {
      const pluginWithUnknownFeature = {
        ...mockPlugin,
        features: ['Unknown Feature']
      }

      wrapper = mount(BasePlugin, {
        props: { plugin: pluginWithUnknownFeature }
      })

      const feature = wrapper.find('.px-2.py-1.text-xs.rounded-full')
      expect(feature.classes()).toContain('bg-gray-100')
      expect(feature.classes()).toContain('text-gray-800')
    })
  })

  describe('File Upload Form', () => {
    it('renders file upload form', () => {
      wrapper = mount(BasePlugin, {
        props: { plugin: mockPlugin }
      })

      const form = wrapper.find('form.plugin-form')
      expect(form.exists()).toBe(true)
      expect(form.attributes('action')).toBe('/api/upload')
      expect(form.attributes('enctype')).toBe('multipart/form-data')
      expect(form.attributes('method')).toBe('POST')
    })

    it('renders file input with correct accept attribute', () => {
      wrapper = mount(BasePlugin, {
        props: { plugin: mockPlugin }
      })

      const fileInput = wrapper.find('input[type="file"]')
      expect(fileInput.exists()).toBe(true)
      expect(fileInput.attributes('accept')).toBe('.pdf,.jpg,.png')
      expect(fileInput.attributes('required')).toBe('')
    })

    it('renders upload button initially disabled', () => {
      wrapper = mount(BasePlugin, {
        props: { plugin: mockPlugin }
      })

      const uploadButton = wrapper.find('button[type="submit"]')
      expect(uploadButton.exists()).toBe(true)
      expect(uploadButton.text()).toBe('Upload')
      expect(uploadButton.attributes('disabled')).toBe('')
    })

    it('enables upload button when file is selected', async () => {
      wrapper = mount(BasePlugin, {
        props: { plugin: mockPlugin }
      })

      const fileInput = wrapper.find('input[type="file"]')
      const uploadButton = wrapper.find('button[type="submit"]')

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const fileList = [file]
      Object.defineProperty(fileInput.element, 'files', {
        value: fileList,
        writable: false
      })

      await fileInput.trigger('change')
      await nextTick()

      expect(uploadButton.attributes('disabled')).toBeUndefined()
    })

    it('includes CSRF token in form', async () => {
      wrapper = mount(BasePlugin, {
        props: { plugin: mockPlugin }
      })

      await nextTick()

      const csrfInput = wrapper.find('input[name="_token"]')
      expect(csrfInput.exists()).toBe(true)
      expect(csrfInput.attributes('type')).toBe('hidden')
      expect(csrfInput.element.value).toBe('mock-csrf-token')
    })
  })

  describe('Form Submission', () => {
    it('handles form submission with API call', async () => {
      const api = await import('@/services/api')
      const mockApi = vi.mocked(api.default)
      mockApi.post.mockResolvedValue({ data: { success: true } })

      wrapper = mount(BasePlugin, {
        props: { plugin: mockPlugin }
      })

      const form = wrapper.find('form.plugin-form')
      const fileInput = wrapper.find('input[type="file"]')

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      Object.defineProperty(fileInput.element, 'files', {
        value: [file],
        writable: false
      })

      await form.trigger('submit.prevent')
      await nextTick()

      expect(mockApi.post).toHaveBeenCalledWith(
        '/upload',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      )
    })

    it('logs success on successful upload', async () => {
      const api = await import('@/services/api')
      const mockApi = vi.mocked(api.default)
      mockApi.post.mockResolvedValue({ data: { success: true, id: '123' } })

      wrapper = mount(BasePlugin, {
        props: { plugin: mockPlugin }
      })

      const form = wrapper.find('form.plugin-form')
      const fileInput = wrapper.find('input[type="file"]')

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      Object.defineProperty(fileInput.element, 'files', {
        value: [file],
        writable: false
      })

      await form.trigger('submit.prevent')
      await nextTick()

      expect(consoleLogSpy).toHaveBeenCalledWith('Upload successful:', { success: true, id: '123' })
    })

    it('resets form after successful upload', async () => {
      const api = await import('@/services/api')
      const mockApi = vi.mocked(api.default)
      mockApi.post.mockResolvedValue({ data: { success: true } })

      wrapper = mount(BasePlugin, {
        props: { plugin: mockPlugin }
      })

      const form = wrapper.find('form.plugin-form')
      const fileInput = wrapper.find('input[type="file"]')
      const uploadButton = wrapper.find('button[type="submit"]')

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      Object.defineProperty(fileInput.element, 'files', {
        value: [file],
        writable: false
      })

      await fileInput.trigger('change')
      expect(uploadButton.attributes('disabled')).toBeUndefined()

      await form.trigger('submit.prevent')
      await nextTick()

      expect(uploadButton.attributes('disabled')).toBe('')
    })

    it('handles upload failure gracefully', async () => {
      const api = await import('@/services/api')
      const mockApi = vi.mocked(api.default)
      mockApi.post.mockRejectedValue(new Error('Upload failed'))

      wrapper = mount(BasePlugin, {
        props: { plugin: mockPlugin }
      })

      const form = wrapper.find('form.plugin-form')
      const fileInput = wrapper.find('input[type="file"]')

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      Object.defineProperty(fileInput.element, 'files', {
        value: [file],
        writable: false
      })

      await form.trigger('submit.prevent')
      await nextTick()

      expect(consoleErrorSpy).toHaveBeenCalledWith('Upload failed:', expect.any(Error))
    })

    it('does not submit if no file selected', async () => {
      const api = await import('@/services/api')
      const mockApi = vi.mocked(api.default)

      wrapper = mount(BasePlugin, {
        props: { plugin: mockPlugin }
      })

      const form = wrapper.find('form.plugin-form')
      await form.trigger('submit.prevent')

      expect(mockApi.post).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalledWith('No file selected')
    })
  })

  describe('Manual Entry', () => {
    it('renders manual entry button when hasManualEntry is true', () => {
      wrapper = mount(BasePlugin, {
        props: { plugin: mockPlugin }
      })

      const manualEntryLink = wrapper.find('a[href="/manual-entry"]')
      expect(manualEntryLink.exists()).toBe(true)
      expect(manualEntryLink.text()).toBe('Manual Entry')
      expect(manualEntryLink.attributes('style')).toContain(mockPlugin.color)
    })

    it('does not render manual entry button when hasManualEntry is false', () => {
      const pluginNoManualEntry = {
        ...mockPlugin,
        hasManualEntry: false
      }

      wrapper = mount(BasePlugin, {
        props: { plugin: pluginNoManualEntry }
      })

      const manualEntryLink = wrapper.find('a[href="/manual-entry"]')
      expect(manualEntryLink.exists()).toBe(false)
    })

    it('does not render manual entry when route is missing', () => {
      const pluginNoRoute = {
        ...mockPlugin,
        hasManualEntry: true,
        manualEntryRoute: undefined
      }

      wrapper = mount(BasePlugin, {
        props: { plugin: pluginNoRoute }
      })

      const manualEntryLink = wrapper.find('a')
      expect(manualEntryLink.exists()).toBe(false)
    })
  })

  describe('Plugin Stats', () => {
    it('displays max file size', () => {
      wrapper = mount(BasePlugin, {
        props: { plugin: mockPlugin }
      })

      const stats = wrapper.find('.mt-4.pt-4.border-t')
      expect(stats.text()).toContain('Max size: 5 MB')
    })

    it('displays number of file types', () => {
      wrapper = mount(BasePlugin, {
        props: { plugin: mockPlugin }
      })

      const stats = wrapper.find('.mt-4.pt-4.border-t')
      expect(stats.text()).toContain('3 file types')
    })
  })

  describe('Color Handling', () => {
    it('applies emerald color classes', () => {
      wrapper = mount(BasePlugin, {
        props: { plugin: mockPlugin }
      })

      const fileInput = wrapper.find('input[type="file"]')
      expect(fileInput.classes()).toContain('file:bg-emerald-500')
      expect(fileInput.classes()).toContain('file:border-emerald-500')
    })

    it('applies orange color classes', () => {
      const orangePlugin = {
        ...mockPlugin,
        color: '#ff9900'
      }

      wrapper = mount(BasePlugin, {
        props: { plugin: orangePlugin }
      })

      const fileInput = wrapper.find('input[type="file"]')
      expect(fileInput.classes()).toContain('file:bg-orange-500')
      expect(fileInput.classes()).toContain('file:border-orange-500')
    })

    it('applies fallback color for unknown colors', () => {
      const customColorPlugin = {
        ...mockPlugin,
        color: '#123456'
      }

      wrapper = mount(BasePlugin, {
        props: { plugin: customColorPlugin }
      })

      const fileInput = wrapper.find('input[type="file"]')
      const classes = fileInput.classes().join(' ')
      expect(classes).toContain(`file:bg-[${customColorPlugin.color}]`)
    })

    it('uses plugin color for upload button', () => {
      wrapper = mount(BasePlugin, {
        props: { plugin: mockPlugin }
      })

      const uploadButton = wrapper.find('button[type="submit"]')
      expect(uploadButton.attributes('style')).toContain(`backgroundColor: ${mockPlugin.color}`)
    })
  })

  describe('Component Structure', () => {
    it('has proper card structure', () => {
      wrapper = mount(BasePlugin, {
        props: { plugin: mockPlugin }
      })

      const card = wrapper.find('.bg-white.rounded-lg.shadow-md')
      expect(card.exists()).toBe(true)
      expect(card.classes()).toContain('overflow-hidden')
    })

    it('has proper spacing and padding', () => {
      wrapper = mount(BasePlugin, {
        props: { plugin: mockPlugin }
      })

      const header = wrapper.find('.p-6.border-b')
      expect(header.exists()).toBe(true)

      const content = wrapper.findAll('.p-6')[1]
      expect(content.exists()).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('handles empty features array', () => {
      const pluginNoFeatures = {
        ...mockPlugin,
        features: []
      }

      wrapper = mount(BasePlugin, {
        props: { plugin: pluginNoFeatures }
      })

      const features = wrapper.findAll('.px-2.py-1.text-xs.rounded-full')
      expect(features).toHaveLength(0)
    })

    it('handles empty file types array', () => {
      const pluginNoFileTypes = {
        ...mockPlugin,
        fileTypes: []
      }

      wrapper = mount(BasePlugin, {
        props: { plugin: pluginNoFileTypes }
      })

      const fileInput = wrapper.find('input[type="file"]')
      expect(fileInput.attributes('accept')).toBe('')
    })

    it('handles very long plugin names', () => {
      const longNamePlugin = {
        ...mockPlugin,
        name: 'This is a very long plugin name that should still render properly'
      }

      wrapper = mount(BasePlugin, {
        props: { plugin: longNamePlugin }
      })

      const title = wrapper.find('h3')
      expect(title.text()).toBe(longNamePlugin.name)
    })
  })
})