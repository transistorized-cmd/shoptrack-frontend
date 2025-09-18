import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AsyncErrorDemo from '../AsyncErrorDemo.vue'
import EnhancedErrorBoundary from '../../EnhancedErrorBoundary.vue'
import { createMockRouter } from '../../../../tests/utils/router'

// Mock the async error handler composable
vi.mock('@/composables/useAsyncErrorHandler', () => ({
  useAsyncErrorHandler: vi.fn(() => ({
    executeAsync: vi.fn(async (fn: Function, fallback?: any) => {
      try {
        return await fn()
      } catch (error) {
        console.error('Async error:', error)
        if (fallback !== undefined) return fallback
        throw error
      }
    })
  })),
  useAsyncLifecycle: vi.fn(() => ({
    onMountedAsync: vi.fn((fn: Function) => {
      Promise.resolve().then(() => fn()).catch(console.error)
    }),
    isLoading: { value: false },
    hasError: { value: false },
    errorMessage: { value: '' },
    clearError: vi.fn(() => {
      const lifecycle = vi.mocked(vi.importMock('@/composables/useAsyncErrorHandler')).useAsyncLifecycle()
      lifecycle.hasError.value = false
      lifecycle.errorMessage.value = ''
    })
  }))
}))

describe('AsyncErrorDemo', () => {
  let wrapper: any
  let mockRouter: any
  let consoleErrorSpy: any
  let consoleLogSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockRouter = createMockRouter().mockRouter
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      wrapper = null
    }
    consoleErrorSpy.mockRestore()
    consoleLogSpy.mockRestore()
  })

  describe('Basic Rendering', () => {
    it('renders with EnhancedErrorBoundary wrapper', () => {
      wrapper = mount(AsyncErrorDemo, {
        global: {
          plugins: [mockRouter],
          components: { EnhancedErrorBoundary }
        }
      })

      expect(wrapper.findComponent(EnhancedErrorBoundary).exists()).toBe(true)
      expect(wrapper.findComponent(EnhancedErrorBoundary).props()).toMatchObject({
        fallback: 'Demo component encountered an error',
        showErrorDetails: true,
        captureAsync: true
      })
    })

    it('renders demo title', () => {
      wrapper = mount(AsyncErrorDemo, {
        global: {
          plugins: [mockRouter],
          components: { EnhancedErrorBoundary }
        }
      })

      expect(wrapper.find('h2').text()).toBe('Async Error Handling Demo')
    })

    it('renders all demo buttons', () => {
      wrapper = mount(AsyncErrorDemo, {
        global: {
          plugins: [mockRouter],
          components: { EnhancedErrorBoundary }
        }
      })

      const buttons = wrapper.findAll('button')
      const buttonTexts = buttons.map((btn: any) => btn.text())

      expect(buttonTexts).toContain('Trigger Sync Error')
      expect(buttonTexts).toContain('Trigger Async Error')
      expect(buttonTexts).toContain('Trigger Network Error')
      expect(buttonTexts).toContain('Load Data Safely')
    })

    it('renders information section with features list', () => {
      wrapper = mount(AsyncErrorDemo, {
        global: {
          plugins: [mockRouter],
          components: { EnhancedErrorBoundary }
        }
      })

      const infoSection = wrapper.find('.bg-blue-50')
      expect(infoSection.exists()).toBe(true)
      expect(infoSection.text()).toContain('Error Handling Features:')

      const features = infoSection.findAll('li')
      expect(features.length).toBeGreaterThan(0)
      expect(infoSection.text()).toContain('Sync errors are caught by Vue\'s ErrorBoundary')
      expect(infoSection.text()).toContain('Async errors are caught by custom async handler')
      expect(infoSection.text()).toContain('Network errors show user-friendly messages')
      expect(infoSection.text()).toContain('Automatic retry with exponential backoff')
      expect(infoSection.text()).toContain('Global error logging and reporting')
    })
  })

  describe('Loading State', () => {
    it('displays loading state when isLoading is true', async () => {
      const { useAsyncLifecycle } = await import('@/composables/useAsyncErrorHandler')
      const mockLifecycle = vi.mocked(useAsyncLifecycle)()
      mockLifecycle.isLoading.value = true

      wrapper = mount(AsyncErrorDemo, {
        global: {
          plugins: [mockRouter],
          components: { EnhancedErrorBoundary }
        }
      })

      await nextTick()

      expect(wrapper.find('.text-blue-600').exists()).toBe(true)
      expect(wrapper.text()).toContain('Loading data...')
    })

    it('hides loading state when isLoading is false', async () => {
      const { useAsyncLifecycle } = await import('@/composables/useAsyncErrorHandler')
      const mockLifecycle = vi.mocked(useAsyncLifecycle)()
      mockLifecycle.isLoading.value = false

      wrapper = mount(AsyncErrorDemo, {
        global: {
          plugins: [mockRouter],
          components: { EnhancedErrorBoundary }
        }
      })

      await nextTick()

      expect(wrapper.find('.text-blue-600').exists()).toBe(false)
    })
  })

  describe('Error State', () => {
    it('displays error state when hasError is true', async () => {
      const { useAsyncLifecycle } = await import('@/composables/useAsyncErrorHandler')
      const mockLifecycle = vi.mocked(useAsyncLifecycle)()
      mockLifecycle.hasError.value = true
      mockLifecycle.errorMessage.value = 'Test error message'

      wrapper = mount(AsyncErrorDemo, {
        global: {
          plugins: [mockRouter],
          components: { EnhancedErrorBoundary }
        }
      })

      await nextTick()

      const errorSection = wrapper.find('.bg-red-50')
      expect(errorSection.exists()).toBe(true)
      expect(errorSection.text()).toContain('Test error message')
      expect(errorSection.find('button').text()).toBe('Clear Error')
    })

    it('clears error when Clear Error button is clicked', async () => {
      const { useAsyncLifecycle } = await import('@/composables/useAsyncErrorHandler')
      const mockLifecycle = vi.mocked(useAsyncLifecycle)()
      mockLifecycle.hasError.value = true
      mockLifecycle.errorMessage.value = 'Test error'

      wrapper = mount(AsyncErrorDemo, {
        global: {
          plugins: [mockRouter],
          components: { EnhancedErrorBoundary }
        }
      })

      await nextTick()

      const clearButton = wrapper.find('.bg-red-50 button')
      await clearButton.trigger('click')

      expect(mockLifecycle.clearError).toHaveBeenCalled()
    })
  })

  describe('Success State', () => {
    it('displays success state when no loading or error', async () => {
      const { useAsyncLifecycle } = await import('@/composables/useAsyncErrorHandler')
      const mockLifecycle = vi.mocked(useAsyncLifecycle)()
      mockLifecycle.isLoading.value = false
      mockLifecycle.hasError.value = false

      wrapper = mount(AsyncErrorDemo, {
        global: {
          plugins: [mockRouter],
          components: { EnhancedErrorBoundary }
        }
      })

      await nextTick()

      const successSection = wrapper.find('.bg-green-50')
      expect(successSection.exists()).toBe(true)
      expect(successSection.text()).toBe('Data loaded successfully!')
    })
  })

  describe('Error Triggering Functions', () => {
    it('triggers sync error when button is clicked', async () => {
      wrapper = mount(AsyncErrorDemo, {
        global: {
          plugins: [mockRouter],
          components: { EnhancedErrorBoundary }
        }
      })

      const syncErrorButton = wrapper.find('button.bg-red-600')

      // This should throw an error that gets caught by ErrorBoundary
      expect(() => syncErrorButton.trigger('click')).not.toThrow()
    })

    it('triggers async error when button is clicked', async () => {
      const { useAsyncErrorHandler } = await import('@/composables/useAsyncErrorHandler')
      const mockHandler = vi.mocked(useAsyncErrorHandler)()

      wrapper = mount(AsyncErrorDemo, {
        global: {
          plugins: [mockRouter],
          components: { EnhancedErrorBoundary }
        }
      })

      const asyncErrorButton = wrapper.find('button.bg-orange-600')
      await asyncErrorButton.trigger('click')

      expect(mockHandler.executeAsync).toHaveBeenCalled()
    })

    it('triggers network error when button is clicked', async () => {
      const { useAsyncErrorHandler } = await import('@/composables/useAsyncErrorHandler')
      const mockHandler = vi.mocked(useAsyncErrorHandler)()

      // Mock fetch to simulate network error
      const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'))
      global.fetch = fetchMock

      wrapper = mount(AsyncErrorDemo, {
        global: {
          plugins: [mockRouter],
          components: { EnhancedErrorBoundary }
        }
      })

      const networkErrorButton = wrapper.find('button.bg-purple-600')
      await networkErrorButton.trigger('click')

      expect(mockHandler.executeAsync).toHaveBeenCalled()
      expect(fetchMock).toHaveBeenCalledWith('https://nonexistent-api.example.com/data')
    })

    it('loads data safely with fallback when button is clicked', async () => {
      const { useAsyncErrorHandler } = await import('@/composables/useAsyncErrorHandler')
      const mockHandler = vi.mocked(useAsyncErrorHandler)()

      wrapper = mount(AsyncErrorDemo, {
        global: {
          plugins: [mockRouter],
          components: { EnhancedErrorBoundary }
        }
      })

      const loadDataButton = wrapper.find('button.bg-green-600')
      await loadDataButton.trigger('click')

      expect(mockHandler.executeAsync).toHaveBeenCalled()
    })
  })

  describe('Async Lifecycle Hook', () => {
    it('calls onMountedAsync on component mount', async () => {
      const { useAsyncLifecycle } = await import('@/composables/useAsyncErrorHandler')
      const mockLifecycle = vi.mocked(useAsyncLifecycle)()

      wrapper = mount(AsyncErrorDemo, {
        global: {
          plugins: [mockRouter],
          components: { EnhancedErrorBoundary }
        }
      })

      await nextTick()

      expect(mockLifecycle.onMountedAsync).toHaveBeenCalled()
    })

    it('logs success message after async mount', async () => {
      wrapper = mount(AsyncErrorDemo, {
        global: {
          plugins: [mockRouter],
          components: { EnhancedErrorBoundary }
        }
      })

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 1100))

      expect(consoleLogSpy).toHaveBeenCalledWith('Component loaded successfully')
    })
  })

  describe('Button Styling', () => {
    it('applies correct styling to error buttons', () => {
      wrapper = mount(AsyncErrorDemo, {
        global: {
          plugins: [mockRouter],
          components: { EnhancedErrorBoundary }
        }
      })

      const syncErrorBtn = wrapper.find('button.bg-red-600')
      expect(syncErrorBtn.classes()).toContain('hover:bg-red-700')

      const asyncErrorBtn = wrapper.find('button.bg-orange-600')
      expect(asyncErrorBtn.classes()).toContain('hover:bg-orange-700')

      const networkErrorBtn = wrapper.find('button.bg-purple-600')
      expect(networkErrorBtn.classes()).toContain('hover:bg-purple-700')

      const loadDataBtn = wrapper.find('button.bg-green-600')
      expect(loadDataBtn.classes()).toContain('hover:bg-green-700')
    })

    it('applies consistent button layout', () => {
      wrapper = mount(AsyncErrorDemo, {
        global: {
          plugins: [mockRouter],
          components: { EnhancedErrorBoundary }
        }
      })

      const buttons = wrapper.findAll('button').filter((btn: any) =>
        btn.classes().includes('px-4') && btn.classes().includes('py-2')
      )

      expect(buttons.length).toBeGreaterThanOrEqual(4)
      buttons.forEach((btn: any) => {
        expect(btn.classes()).toContain('rounded')
        expect(btn.classes()).toContain('text-white')
      })
    })
  })

  describe('Error Handler Configuration', () => {
    it('initializes async error handler with correct config', async () => {
      const { useAsyncErrorHandler } = await import('@/composables/useAsyncErrorHandler')

      wrapper = mount(AsyncErrorDemo, {
        global: {
          plugins: [mockRouter],
          components: { EnhancedErrorBoundary }
        }
      })

      expect(useAsyncErrorHandler).toHaveBeenCalledWith({
        showNotification: true,
        logError: true,
        retryCount: 2,
        context: 'Demo Component'
      })
    })
  })

  describe('Integration with EnhancedErrorBoundary', () => {
    it('error boundary catches sync errors from demo', async () => {
      // Create a component that will throw on mount
      const ErrorThrowingDemo = {
        setup() {
          throw new Error('Component error')
        },
        template: '<div>Error</div>'
      }

      wrapper = mount(EnhancedErrorBoundary, {
        props: {
          fallback: 'Demo component encountered an error',
          showErrorDetails: true
        },
        slots: {
          default: ErrorThrowingDemo
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()

      expect(wrapper.text()).toContain('Something went wrong')
      expect(wrapper.text()).toContain('Demo component encountered an error')
    })
  })
})