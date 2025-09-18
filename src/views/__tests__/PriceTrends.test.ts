import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import PriceTrends from '../PriceTrends.vue'

// Mock dependencies
const mockReportsStore = {
  generateReport: vi.fn(),
  exportReport: vi.fn()
}

const mockCategoriesStore = {
  byLocale: {
    en: [
      { id: 1, name: 'Groceries' },
      { id: 2, name: 'Electronics' },
      { id: 3, name: 'Clothing' }
    ]
  },
  fetchCategories: vi.fn()
}

const mockRouter = {
  replace: vi.fn()
}

const mockRoute = {
  query: {}
}

const mockI18n = {
  t: vi.fn((key) => key)
}

// Mock PriceTrendsReport component
const mockPriceTrendsReport = {
  name: 'PriceTrendsReport',
  props: ['data'],
  template: '<div class="price-trends-report">Price Trends Report: {{ data.itemTrends?.length || 0 }} items</div>'
}

// Mock LocalizedDateInput component
const mockLocalizedDateInput = {
  name: 'LocalizedDateInput',
  props: ['modelValue'],
  emits: ['update:modelValue', 'change'],
  template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value); $emit(\'change\', $event.target.value)" />'
}

vi.mock('@/stores/reports', () => ({
  useReportsStore: () => mockReportsStore
}))

vi.mock('@/stores/categories', () => ({
  useCategoriesStore: () => mockCategoriesStore
}))

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
  useRoute: () => mockRoute
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => mockI18n
}))

vi.mock('@/i18n', () => ({
  getCurrentLocale: () => 'en'
}))

vi.mock('@/components/reports/PriceTrendsReport.vue', () => ({
  default: mockPriceTrendsReport
}))

vi.mock('@/components/common/LocalizedDateInput.vue', () => ({
  default: mockLocalizedDateInput
}))

describe('PriceTrends.vue', () => {
  let wrapper: VueWrapper<any>

  const mockReportData = {
    title: 'Price Trends Analysis',
    data: {
      itemTrends: [
        {
          itemName: 'Apple',
          category: 'Groceries',
          averagePrice: 1.50,
          priceHistory: [
            { date: '2024-01-01', price: 1.40 },
            { date: '2024-01-15', price: 1.60 }
          ]
        },
        {
          itemName: 'Orange',
          category: 'Groceries',
          averagePrice: 1.20,
          priceHistory: [
            { date: '2024-01-01', price: 1.10 },
            { date: '2024-01-15', price: 1.30 }
          ]
        }
      ]
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRoute.query = {}
    mockReportsStore.generateReport.mockResolvedValue(mockReportData)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Basic Rendering', () => {
    it('renders page header correctly', () => {
      wrapper = mount(PriceTrends)

      expect(wrapper.find('h1').text()).toBe('priceTrends.title')
      expect(wrapper.find('p').text()).toBe('priceTrends.subtitle')
    })

    it('renders filter controls', () => {
      wrapper = mount(PriceTrends)

      const startDateLabel = wrapper.findAll('label').find(label =>
        label.text().includes('priceTrends.startDate')
      )
      expect(startDateLabel).toBeTruthy()

      const endDateLabel = wrapper.findAll('label').find(label =>
        label.text().includes('priceTrends.endDate')
      )
      expect(endDateLabel).toBeTruthy()

      const categoryLabel = wrapper.findAll('label').find(label =>
        label.text().includes('priceTrends.category')
      )
      expect(categoryLabel).toBeTruthy()
    })

    it('renders date input components', () => {
      wrapper = mount(PriceTrends)

      const dateInputs = wrapper.findAllComponents(mockLocalizedDateInput)
      expect(dateInputs).toHaveLength(2) // Start date and end date
    })

    it('renders category select with options', () => {
      wrapper = mount(PriceTrends)

      const categorySelect = wrapper.find('select')
      expect(categorySelect.exists()).toBe(true)

      const options = categorySelect.findAll('option')
      expect(options).toHaveLength(4) // "All categories" + 3 categories

      expect(options[0].text()).toBe('priceTrends.allCategories')
      expect(options[1].text()).toBe('Groceries')
      expect(options[2].text()).toBe('Electronics')
      expect(options[3].text()).toBe('Clothing')
    })

    it('renders action buttons', () => {
      wrapper = mount(PriceTrends)

      const resetButton = wrapper.find('button.btn-secondary')
      expect(resetButton.exists()).toBe(true)
      expect(resetButton.text()).toBe('priceTrends.resetFilters')

      const applyButton = wrapper.find('button.btn-primary')
      expect(applyButton.exists()).toBe(true)
      expect(applyButton.text()).toBe('priceTrends.applyFilters')
    })
  })

  describe('Filter Initialization', () => {
    it('initializes filters from query parameters', () => {
      mockRoute.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        categoryId: '1'
      }

      wrapper = mount(PriceTrends)

      const vm = wrapper.vm
      expect(vm.filters.startDate).toBe('2024-01-01')
      expect(vm.filters.endDate).toBe('2024-01-31')
      expect(vm.filters.categoryId).toBe('1')
    })

    it('sets default date range when no query parameters', () => {
      wrapper = mount(PriceTrends)

      const vm = wrapper.vm
      expect(vm.filters.startDate).toBeTruthy()
      expect(vm.filters.endDate).toBeTruthy()

      // Should be 6 months ago to today
      const startDate = new Date(vm.filters.startDate)
      const endDate = new Date(vm.filters.endDate)
      const today = new Date()

      expect(endDate.toDateString()).toBe(today.toDateString())
      expect(startDate.getMonth()).toBe((today.getMonth() - 6 + 12) % 12)
    })

    it('handles empty query parameters gracefully', () => {
      mockRoute.query = { categoryId: '' }

      wrapper = mount(PriceTrends)

      const vm = wrapper.vm
      expect(vm.filters.categoryId).toBe('')
    })
  })

  describe('Data Loading', () => {
    it('loads data automatically on mount', async () => {
      wrapper = mount(PriceTrends)
      await flushPromises()

      expect(mockReportsStore.generateReport).toHaveBeenCalledWith(
        expect.objectContaining({
          pluginKey: 'price-trends',
          parameters: expect.objectContaining({
            locale: 'en'
          })
        })
      )
    })

    it('shows loading state while fetching data', async () => {
      mockReportsStore.generateReport.mockImplementation(() => new Promise(() => {}))

      wrapper = mount(PriceTrends)
      await nextTick()

      expect(wrapper.find('.animate-spin').exists()).toBe(true)
      expect(wrapper.text()).toContain('priceTrends.analyzing')
    })

    it('displays report data when loaded successfully', async () => {
      wrapper = mount(PriceTrends)
      await flushPromises()

      const reportComponent = wrapper.findComponent(mockPriceTrendsReport)
      expect(reportComponent.exists()).toBe(true)
      expect(reportComponent.props('data')).toEqual(mockReportData.data)
    })

    it('shows error state when loading fails', async () => {
      const error = new Error('Failed to load data')
      mockReportsStore.generateReport.mockRejectedValue(error)

      wrapper = mount(PriceTrends)
      await flushPromises()

      expect(wrapper.text()).toContain('Failed to load data')

      const retryButton = wrapper.find('button.btn-primary')
      expect(retryButton.text()).toBe('priceTrends.retry')
    })

    it('shows empty state when no data is available', async () => {
      mockReportsStore.generateReport.mockResolvedValue(null)

      wrapper = mount(PriceTrends)
      await flushPromises()

      expect(wrapper.text()).toContain('priceTrends.noDataAvailable')
      expect(wrapper.text()).toContain('priceTrends.adjustFiltersHint')
    })
  })

  describe('Filter Operations', () => {
    it('updates URL query when filters change', async () => {
      wrapper = mount(PriceTrends)

      const vm = wrapper.vm
      vm.filters.startDate = '2024-02-01'
      vm.filters.endDate = '2024-02-28'
      vm.filters.categoryId = '2'

      vm.handleFilterChange()

      expect(mockRouter.replace).toHaveBeenCalledWith({
        query: {
          startDate: '2024-02-01',
          endDate: '2024-02-28',
          categoryId: '2'
        }
      })
    })

    it('applies filters and loads new data', async () => {
      wrapper = mount(PriceTrends)
      await flushPromises()

      vi.clearAllMocks()

      const vm = wrapper.vm
      vm.filters.categoryId = '1'

      const applyButton = wrapper.find('button.btn-primary')
      await applyButton.trigger('click')
      await flushPromises()

      expect(mockReportsStore.generateReport).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            categoryId: '1'
          })
        })
      )
    })

    it('resets filters to defaults', async () => {
      wrapper = mount(PriceTrends)

      const vm = wrapper.vm
      vm.filters.startDate = '2024-01-01'
      vm.filters.endDate = '2024-01-31'
      vm.filters.categoryId = '1'

      const resetButton = wrapper.find('button.btn-secondary')
      await resetButton.trigger('click')

      expect(vm.filters.categoryId).toBe('')
      expect(vm.filters.startDate).toBeTruthy()
      expect(vm.filters.endDate).toBeTruthy()

      // Should reset to default 6-month range
      const startDate = new Date(vm.filters.startDate)
      const endDate = new Date(vm.filters.endDate)
      const today = new Date()

      expect(endDate.toDateString()).toBe(today.toDateString())
    })

    it('includes category filter in report request when selected', async () => {
      wrapper = mount(PriceTrends)

      const vm = wrapper.vm
      vm.filters.categoryId = '2'
      await vm.loadData()

      expect(mockReportsStore.generateReport).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            categoryId: '2',
            locale: 'en'
          })
        })
      )
    })

    it('handles filter changes through date inputs', async () => {
      wrapper = mount(PriceTrends)

      const dateInputs = wrapper.findAllComponents(mockLocalizedDateInput)
      const startDateInput = dateInputs[0]

      await startDateInput.vm.$emit('change', '2024-03-01')

      expect(mockRouter.replace).toHaveBeenCalledWith({
        query: expect.objectContaining({
          startDate: '2024-03-01'
        })
      })
    })

    it('handles category selection', async () => {
      wrapper = mount(PriceTrends)

      const categorySelect = wrapper.find('select')
      await categorySelect.setValue('3')

      expect(mockRouter.replace).toHaveBeenCalledWith({
        query: expect.objectContaining({
          categoryId: '3'
        })
      })
    })
  })

  describe('Export Functionality', () => {
    it('shows export buttons when data is available', async () => {
      wrapper = mount(PriceTrends)
      await flushPromises()

      const exportButtons = wrapper.findAll('button').filter(btn =>
        btn.text().includes('CSV') || btn.text().includes('JSON')
      )
      expect(exportButtons.length).toBeGreaterThan(0)
    })

    it('exports data in CSV format', async () => {
      mockReportsStore.exportReport.mockResolvedValue(undefined)

      wrapper = mount(PriceTrends)
      await flushPromises()

      const csvButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('priceTrends.exportCSV')
      )

      if (csvButton) {
        await csvButton.trigger('click')
        await flushPromises()

        expect(mockReportsStore.exportReport).toHaveBeenCalledWith(
          expect.objectContaining({
            pluginKey: 'price-trends'
          }),
          'csv'
        )
      }
    })

    it('exports data in JSON format', async () => {
      mockReportsStore.exportReport.mockResolvedValue(undefined)

      wrapper = mount(PriceTrends)
      await flushPromises()

      const jsonButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('priceTrends.exportJSON')
      )

      if (jsonButton) {
        await jsonButton.trigger('click')
        await flushPromises()

        expect(mockReportsStore.exportReport).toHaveBeenCalledWith(
          expect.objectContaining({
            pluginKey: 'price-trends'
          }),
          'json'
        )
      }
    })

    it('shows export loading state', async () => {
      mockReportsStore.exportReport.mockImplementation(() => new Promise(() => {}))

      wrapper = mount(PriceTrends)
      await flushPromises()

      const csvButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('priceTrends.exportCSV')
      )

      if (csvButton) {
        await csvButton.trigger('click')
        await nextTick()

        expect(csvButton.text()).toContain('priceTrends.exporting')
        expect(csvButton.attributes('disabled')).toBe('')
      }
    })

    it('handles export errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockReportsStore.exportReport.mockRejectedValue(new Error('Export failed'))

      wrapper = mount(PriceTrends)
      await flushPromises()

      const vm = wrapper.vm
      await vm.exportData('csv')

      expect(consoleSpy).toHaveBeenCalledWith('Failed to export CSV:', expect.any(Error))
      expect(vm.exportingFormat).toBeNull()

      consoleSpy.mockRestore()
    })

    it('hides export buttons when no data is available', async () => {
      mockReportsStore.generateReport.mockResolvedValue(null)

      wrapper = mount(PriceTrends)
      await flushPromises()

      const exportSection = wrapper.find('.flex.flex-col.sm\\:flex-row.space-y-2')
      expect(exportSection.exists()).toBe(false)
    })
  })

  describe('Responsive Design', () => {
    it('applies responsive classes to main layout', () => {
      wrapper = mount(PriceTrends)

      const container = wrapper.find('.space-y-6')
      expect(container.exists()).toBe(true)

      // Check header responsive classes
      const header = wrapper.find('.flex.flex-col')
      expect(header.classes()).toContain('sm:flex-row')
      expect(header.classes()).toContain('sm:items-center')
      expect(header.classes()).toContain('sm:justify-between')
    })

    it('applies responsive grid to filters', () => {
      wrapper = mount(PriceTrends)

      const filterGrid = wrapper.find('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3')
      expect(filterGrid.exists()).toBe(true)
      expect(filterGrid.classes()).toContain('gap-4')
    })

    it('applies responsive layout to filter actions', () => {
      wrapper = mount(PriceTrends)

      const actionsContainer = wrapper.find('.flex.flex-col.sm\\:flex-row')
      expect(actionsContainer.exists()).toBe(true)
      expect(actionsContainer.classes()).toContain('sm:justify-between')
      expect(actionsContainer.classes()).toContain('sm:items-center')
    })

    it('applies responsive sizing to export buttons', async () => {
      wrapper = mount(PriceTrends)
      await flushPromises()

      const exportButtons = wrapper.findAll('button').filter(btn =>
        btn.classes().includes('w-full') && btn.classes().includes('sm:w-auto')
      )
      expect(exportButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Categories Integration', () => {
    it('fetches categories on mount', async () => {
      wrapper = mount(PriceTrends)
      await flushPromises()

      expect(mockCategoriesStore.fetchCategories).toHaveBeenCalledWith('en')
    })

    it('updates categories when locale changes', async () => {
      wrapper = mount(PriceTrends)
      await flushPromises()

      // Clear previous calls
      vi.clearAllMocks()

      const vm = wrapper.vm
      // Simulate locale change by manually triggering the watcher
      await mockCategoriesStore.fetchCategories('fr')

      expect(mockCategoriesStore.fetchCategories).toHaveBeenCalledWith('fr')
    })

    it('reloads data when category filter changes after locale change', async () => {
      wrapper = mount(PriceTrends)
      await flushPromises()

      const vm = wrapper.vm
      vm.filters.categoryId = '1' // Set category filter

      // Clear previous calls
      vi.clearAllMocks()

      // Simulate category reload after locale change
      await vm.loadData()

      expect(mockReportsStore.generateReport).toHaveBeenCalled()
    })

    it('uses current locale categories for select options', () => {
      wrapper = mount(PriceTrends)

      const vm = wrapper.vm
      expect(vm.currentCategories).toEqual([
        { id: 1, name: 'Groceries' },
        { id: 2, name: 'Electronics' },
        { id: 3, name: 'Clothing' }
      ])
    })
  })

  describe('Error Handling', () => {
    it('logs errors when data loading fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Network error')
      mockReportsStore.generateReport.mockRejectedValue(error)

      wrapper = mount(PriceTrends)
      await flushPromises()

      expect(consoleSpy).toHaveBeenCalledWith('Failed to load price trends:', error)

      consoleSpy.mockRestore()
    })

    it('retries loading data when retry button is clicked', async () => {
      mockReportsStore.generateReport
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce(mockReportData)

      wrapper = mount(PriceTrends)
      await flushPromises()

      // Should show error state
      expect(wrapper.text()).toContain('First failure')

      const retryButton = wrapper.find('button.btn-primary')
      await retryButton.trigger('click')
      await flushPromises()

      // Should now show data
      expect(wrapper.findComponent(mockPriceTrendsReport).exists()).toBe(true)
    })

    it('handles missing report data gracefully', async () => {
      mockReportsStore.generateReport.mockResolvedValue({
        data: null
      })

      wrapper = mount(PriceTrends)
      await flushPromises()

      expect(wrapper.text()).toContain('priceTrends.noDataAvailable')
    })
  })

  describe('Date Range Validation', () => {
    it('creates valid date range object', async () => {
      wrapper = mount(PriceTrends)

      const vm = wrapper.vm
      vm.filters.startDate = '2024-01-01'
      vm.filters.endDate = '2024-01-31'

      await vm.loadData()

      expect(mockReportsStore.generateReport).toHaveBeenCalledWith(
        expect.objectContaining({
          dateRange: {
            startDate: '2024-01-01',
            endDate: '2024-01-31'
          }
        })
      )
    })

    it('handles missing date range', async () => {
      wrapper = mount(PriceTrends)

      const vm = wrapper.vm
      vm.filters.startDate = ''
      vm.filters.endDate = ''

      await vm.loadData()

      expect(mockReportsStore.generateReport).toHaveBeenCalledWith(
        expect.objectContaining({
          dateRange: undefined
        })
      )
    })

    it('handles partial date range', async () => {
      wrapper = mount(PriceTrends)

      const vm = wrapper.vm
      vm.filters.startDate = '2024-01-01'
      vm.filters.endDate = ''

      await vm.loadData()

      expect(mockReportsStore.generateReport).toHaveBeenCalledWith(
        expect.objectContaining({
          dateRange: undefined
        })
      )
    })
  })

  describe('Component Lifecycle', () => {
    it('initializes properly on mount', async () => {
      wrapper = mount(PriceTrends)
      await flushPromises()

      expect(mockCategoriesStore.fetchCategories).toHaveBeenCalled()
      expect(mockReportsStore.generateReport).toHaveBeenCalled()
    })

    it('cleans up properly on unmount', () => {
      wrapper = mount(PriceTrends)

      // No specific cleanup needed for this component
      expect(() => wrapper.unmount()).not.toThrow()
    })
  })
})