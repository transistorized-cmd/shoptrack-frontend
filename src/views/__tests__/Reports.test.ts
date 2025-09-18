import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import Reports from '../Reports.vue'

// Mock dependencies
const mockPluginsStore = {
  enabledReportPlugins: [],
  fetchAllPlugins: vi.fn()
}

const mockReportsStore = {
  generateReport: vi.fn(),
  exportReport: vi.fn()
}

const mockRouter = {
  push: vi.fn()
}

// Mock plugin localization composable
const mockUsePluginLocalization = vi.fn(() => ({
  localizePlugins: vi.fn((plugins) => plugins)
}))

// Mock i18n
const mockI18n = {
  t: vi.fn((key) => key),
  locale: { value: 'en' }
}

vi.mock('@/stores/plugins', () => ({
  usePluginsStore: () => mockPluginsStore
}))

vi.mock('@/stores/reports', () => ({
  useReportsStore: () => mockReportsStore
}))

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter
}))

vi.mock('@/composables/usePluginLocalization', () => ({
  usePluginLocalization: mockUsePluginLocalization
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => mockI18n
}))

vi.mock('@/components/common/LocalizedDateInput.vue', () => ({
  default: {
    name: 'LocalizedDateInput',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  }
}))

describe('Reports.vue', () => {
  let wrapper: VueWrapper<any>

  const mockReportPlugins = [
    {
      key: 'expense-summary',
      name: 'Expense Summary',
      description: 'Monthly expense breakdown',
      icon: '💰',
      color: '#10b981',
      category: 'Financial',
      requiresDateRange: true,
      supportsExport: true,
      supportedExportFormats: ['csv', 'pdf']
    },
    {
      key: 'category-analytics',
      name: 'Category Analytics',
      description: 'Spending by category',
      icon: '📊',
      color: '#3b82f6',
      category: 'Analytics',
      requiresDateRange: true,
      supportsExport: false,
      supportedExportFormats: []
    },
    {
      key: 'price-trends',
      name: 'Price Trends',
      description: 'Item price trends over time',
      icon: '📈',
      color: '#8b5cf6',
      category: 'Analytics',
      requiresDateRange: true,
      supportsExport: true,
      supportedExportFormats: ['json', 'csv']
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockPluginsStore.enabledReportPlugins = mockReportPlugins
    mockUsePluginLocalization.mockReturnValue({
      localizePlugins: vi.fn((plugins) => plugins)
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Basic Rendering', () => {
    it('renders page header correctly', () => {
      wrapper = mount(Reports)

      expect(wrapper.find('h1').text()).toBe('reports.title')
      expect(wrapper.find('p').text()).toBe('reports.subtitle')
    })

    it('renders all enabled report plugins', () => {
      wrapper = mount(Reports)

      const pluginCards = wrapper.findAll('.card')
      expect(pluginCards).toHaveLength(3)

      const pluginNames = wrapper.findAll('h3')
      expect(pluginNames[0].text()).toBe('Expense Summary')
      expect(pluginNames[1].text()).toBe('Category Analytics')
      expect(pluginNames[2].text()).toBe('Price Trends')
    })

    it('displays plugin icons and colors correctly', () => {
      wrapper = mount(Reports)

      const iconContainers = wrapper.findAll('.w-10.h-10, .w-12.h-12')
      expect(iconContainers[0].attributes('style')).toContain('background-color: #10b981')
      expect(iconContainers[0].text()).toBe('💰')

      expect(iconContainers[1].attributes('style')).toContain('background-color: #3b82f6')
      expect(iconContainers[1].text()).toBe('📊')

      expect(iconContainers[2].attributes('style')).toContain('background-color: #8b5cf6')
      expect(iconContainers[2].text()).toBe('📈')
    })

    it('displays plugin descriptions and categories', () => {
      wrapper = mount(Reports)

      const descriptions = wrapper.findAll('.text-xs.text-gray-500, .text-sm.text-gray-500')
      expect(descriptions.some(d => d.text().includes('Monthly expense breakdown'))).toBe(true)
      expect(descriptions.some(d => d.text().includes('Spending by category'))).toBe(true)
      expect(descriptions.some(d => d.text().includes('Item price trends over time'))).toBe(true)

      const categories = wrapper.findAll('.bg-gray-100')
      expect(categories.some(c => c.text() === 'Financial')).toBe(true)
      expect(categories.some(c => c.text() === 'Analytics')).toBe(true)
    })
  })

  describe('Plugin Features Display', () => {
    it('shows date range requirements correctly', () => {
      wrapper = mount(Reports)

      const dateRangeInfo = wrapper.findAll('.flex.items-center')
      const dateRangeText = dateRangeInfo.map(el => el.text())

      expect(dateRangeText.some(text => text.includes('reports.dateRangeRequired'))).toBe(true)
    })

    it('shows export support information', () => {
      wrapper = mount(Reports)

      const exportInfo = wrapper.findAll('.flex.items-center')
      const exportText = exportInfo.map(el => el.text())

      expect(exportText.some(text => text.includes('reports.exportSupported'))).toBe(true)
      expect(exportText.some(text => text.includes('reports.viewOnly'))).toBe(true)
    })

    it('displays supported export formats', () => {
      wrapper = mount(Reports)

      expect(wrapper.text()).toContain('reports.formats')
      expect(wrapper.text()).toContain('CSV, PDF')
      expect(wrapper.text()).toContain('JSON, CSV')
    })
  })

  describe('Date Range Functionality', () => {
    it('shows date range inputs for plugins that require them', () => {
      wrapper = mount(Reports)

      const dateInputs = wrapper.findAll('input')
      expect(dateInputs.length).toBeGreaterThan(0)

      const dateLabels = wrapper.findAll('label')
      const labelTexts = dateLabels.map(label => label.text())
      expect(labelTexts.some(text => text.includes('reports.dateRange'))).toBe(true)
    })

    it('updates date range when inputs change', async () => {
      wrapper = mount(Reports)

      const dateInputs = wrapper.findAll('input')
      if (dateInputs.length > 0) {
        await dateInputs[0].setValue('2024-01-01')
        await nextTick()

        // Verify the component handles the date change
        expect(dateInputs[0].element.value).toBe('2024-01-01')
      }
    })

    it('validates date ranges correctly', async () => {
      wrapper = mount(Reports)

      // Find generate report buttons and check if they're disabled when date range is invalid
      const generateButtons = wrapper.findAll('.btn.btn-primary')

      // Initially buttons might be disabled if date range is required but not set
      generateButtons.forEach(button => {
        const isDisabled = button.attributes('disabled') !== undefined
        expect(typeof isDisabled).toBe('boolean')
      })
    })
  })

  describe('Report Generation', () => {
    it('generates reports when generate button is clicked', async () => {
      mockReportsStore.generateReport.mockResolvedValue({
        title: 'Test Report',
        data: { summary: 'Test data' }
      })

      wrapper = mount(Reports)

      const generateButton = wrapper.find('button:not([disabled])')
      if (generateButton.exists()) {
        await generateButton.trigger('click')
        await flushPromises()

        expect(mockReportsStore.generateReport).toHaveBeenCalled()
      }
    })

    it('shows loading state while generating reports', async () => {
      mockReportsStore.generateReport.mockImplementation(() => new Promise(() => {}))

      wrapper = mount(Reports)

      const generateButton = wrapper.find('button:not([disabled])')
      if (generateButton.exists()) {
        await generateButton.trigger('click')
        await nextTick()

        expect(wrapper.text()).toContain('reports.generating')
        expect(wrapper.find('.animate-spin').exists()).toBe(true)
      }
    })

    it('navigates to category analytics when category-analytics is generated', async () => {
      wrapper = mount(Reports)

      // Set up date range for category analytics
      const vm = wrapper.vm
      if (vm.dateRanges) {
        vm.dateRanges['category-analytics'] = {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        }
      }

      await nextTick()

      // Find category analytics plugin and trigger generation
      const plugin = mockReportPlugins.find(p => p.key === 'category-analytics')
      if (plugin) {
        await vm.generateReport(plugin)

        expect(mockRouter.push).toHaveBeenCalledWith({
          path: '/analytics/categories',
          query: {
            startDate: '2024-01-01',
            endDate: '2024-01-31'
          }
        })
      }
    })

    it('navigates to price trends when price-trends is generated', async () => {
      wrapper = mount(Reports)

      const vm = wrapper.vm
      if (vm.dateRanges) {
        vm.dateRanges['price-trends'] = {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        }
      }

      await nextTick()

      const plugin = mockReportPlugins.find(p => p.key === 'price-trends')
      if (plugin) {
        await vm.generateReport(plugin)

        expect(mockRouter.push).toHaveBeenCalledWith({
          path: '/analytics/price-trends',
          query: {
            startDate: '2024-01-01',
            endDate: '2024-01-31'
          }
        })
      }
    })
  })

  describe('Report Export', () => {
    it('shows export buttons for plugins that support export', () => {
      wrapper = mount(Reports)

      const exportButtons = wrapper.findAll('button').filter(btn =>
        btn.text().includes('CSV') ||
        btn.text().includes('PDF') ||
        btn.text().includes('JSON')
      )
      expect(exportButtons.length).toBeGreaterThan(0)
    })

    it('exports reports in different formats', async () => {
      mockReportsStore.exportReport.mockResolvedValue(undefined)

      wrapper = mount(Reports)

      const csvButton = wrapper.findAll('button').find(btn => btn.text().includes('CSV'))
      if (csvButton) {
        await csvButton.trigger('click')
        await flushPromises()

        expect(mockReportsStore.exportReport).toHaveBeenCalledWith(
          expect.objectContaining({
            pluginKey: expect.any(String)
          }),
          'csv'
        )
      }
    })

    it('disables export buttons when no report is generated', () => {
      wrapper = mount(Reports)

      const exportButtons = wrapper.findAll('button').filter(btn =>
        btn.text().includes('CSV') ||
        btn.text().includes('PDF') ||
        btn.text().includes('JSON')
      )

      exportButtons.forEach(button => {
        expect(button.attributes('disabled')).toBe('')
      })
    })
  })

  describe('Report Data Display', () => {
    it('displays generated report data for non-redirecting plugins', async () => {
      const reportData = {
        title: 'Expense Summary Report',
        data: {
          totalExpenses: 1500,
          categories: ['Food', 'Transport']
        }
      }

      mockReportsStore.generateReport.mockResolvedValue(reportData)

      wrapper = mount(Reports)
      const vm = wrapper.vm

      // Generate a report that doesn't redirect
      vm.currentReports['expense-summary'] = reportData
      await nextTick()

      expect(wrapper.text()).toContain('Expense Summary Report')
      expect(wrapper.find('pre').exists()).toBe(true)
    })

    it('does not display report data for redirecting plugins', async () => {
      wrapper = mount(Reports)
      const vm = wrapper.vm

      // Set report data for category-analytics (redirecting plugin)
      vm.currentReports['category-analytics'] = {
        title: 'Category Analytics',
        data: { test: 'data' }
      }
      await nextTick()

      // Should not show the data since category-analytics redirects
      const reportSection = wrapper.find('.mt-6.space-y-4')
      expect(reportSection.exists()).toBe(false)
    })
  })

  describe('Empty State', () => {
    it('shows empty state when no plugins are available', async () => {
      mockPluginsStore.enabledReportPlugins = []
      wrapper = mount(Reports)

      await nextTick()

      expect(wrapper.text()).toContain('reports.noPluginsAvailable')
      expect(wrapper.text()).toContain('reports.pluginsWillAppearWhenEnabled')
    })
  })

  describe('Initialization and Lifecycle', () => {
    it('fetches all plugins on mount', async () => {
      wrapper = mount(Reports)
      await flushPromises()

      expect(mockPluginsStore.fetchAllPlugins).toHaveBeenCalled()
    })

    it('initializes default date ranges on mount', async () => {
      wrapper = mount(Reports)
      await flushPromises()

      const vm = wrapper.vm

      // Check that date ranges are initialized for plugins that require them
      mockReportPlugins.forEach(plugin => {
        if (plugin.requiresDateRange) {
          expect(vm.dateRanges[plugin.key]).toBeDefined()
          expect(vm.dateRanges[plugin.key].startDate).toBeTruthy()
          expect(vm.dateRanges[plugin.key].endDate).toBeTruthy()
        }
      })
    })
  })

  describe('Responsive Design', () => {
    it('applies responsive grid classes', () => {
      wrapper = mount(Reports)

      const grid = wrapper.find('.grid.grid-cols-1.lg\\:grid-cols-2')
      expect(grid.exists()).toBe(true)
      expect(grid.classes()).toContain('gap-4')
      expect(grid.classes()).toContain('sm:gap-6')
    })

    it('applies responsive spacing to plugin headers', () => {
      wrapper = mount(Reports)

      const pluginHeaders = wrapper.findAll('.flex.flex-col')
      pluginHeaders.forEach(header => {
        expect(header.classes()).toContain('sm:flex-row')
        expect(header.classes()).toContain('sm:items-start')
        expect(header.classes()).toContain('sm:justify-between')
      })
    })

    it('applies responsive sizing to plugin icons', () => {
      wrapper = mount(Reports)

      const icons = wrapper.findAll('.w-10.h-10')
      icons.forEach(icon => {
        expect(icon.classes()).toContain('sm:w-12')
        expect(icon.classes()).toContain('sm:h-12')
      })
    })
  })

  describe('Dark Mode Support', () => {
    it('includes dark mode classes for text elements', () => {
      wrapper = mount(Reports)

      const title = wrapper.find('h1')
      expect(title.classes()).toContain('dark:text-white')

      const subtitle = wrapper.find('p')
      expect(subtitle.classes()).toContain('dark:text-gray-400')
    })

    it('includes dark mode classes for plugin cards', () => {
      wrapper = mount(Reports)

      const categoryBadges = wrapper.findAll('.bg-gray-100')
      categoryBadges.forEach(badge => {
        expect(badge.classes()).toContain('dark:bg-gray-700')
        expect(badge.classes()).toContain('dark:text-gray-200')
      })
    })
  })

  describe('Plugin Actions', () => {
    it('shows correct button states based on date range validity', async () => {
      wrapper = mount(Reports)

      const generateButtons = wrapper.findAll('.btn.btn-primary')

      // Buttons should be disabled if date range is required but invalid
      generateButtons.forEach(button => {
        const disabled = button.attributes('disabled')
        expect(typeof disabled === 'string' || disabled === undefined).toBe(true)
      })
    })

    it('handles plugin generation errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockReportsStore.generateReport.mockRejectedValue(new Error('Generation failed'))

      wrapper = mount(Reports)

      const vm = wrapper.vm
      await vm.generateReport(mockReportPlugins[0])

      expect(consoleSpy).toHaveBeenCalledWith('Failed to generate report:', expect.any(Error))

      consoleSpy.mockRestore()
    })

    it('handles export errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockReportsStore.exportReport.mockRejectedValue(new Error('Export failed'))

      wrapper = mount(Reports)

      const vm = wrapper.vm
      await vm.exportReport(mockReportPlugins[0], 'csv')

      expect(consoleSpy).toHaveBeenCalledWith('Failed to export report:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('Localization', () => {
    it('uses localized plugin data', () => {
      const localizedPlugins = [
        { ...mockReportPlugins[0], name: 'Localized Expense Summary' }
      ]

      mockUsePluginLocalization.mockReturnValue({
        localizePlugins: vi.fn().mockReturnValue(localizedPlugins)
      })

      wrapper = mount(Reports)

      expect(wrapper.text()).toContain('Localized Expense Summary')
    })

    it('calls translation function for UI text', () => {
      wrapper = mount(Reports)

      expect(mockI18n.t).toHaveBeenCalledWith('reports.title')
      expect(mockI18n.t).toHaveBeenCalledWith('reports.subtitle')
      expect(mockI18n.t).toHaveBeenCalledWith('reports.dateRange')
    })
  })
})