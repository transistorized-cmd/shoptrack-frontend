import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import ReceiptDetail from '../ReceiptDetail.vue'

// Mock dependencies
const mockReceiptsStore = {
  getReceiptDetails: vi.fn(),
  updateReceipt: vi.fn(),
  reprocessReceipt: vi.fn(),
  deleteReceipt: vi.fn()
}

const mockCategoriesStore = {
  byLocale: { en: [] },
  getName: vi.fn(),
  fetchCategories: vi.fn(),
  startAutoRefresh: vi.fn(),
  stopAutoRefresh: vi.fn()
}

const mockRouter = {
  go: vi.fn(),
  push: vi.fn()
}

const mockRoute = {
  params: { id: '123' }
}

const mockI18n = {
  t: vi.fn((key, params) => params ? `${key} ${JSON.stringify(params)}` : key),
  locale: { value: 'en' }
}

const mockReceiptsService = {
  getStoreNames: vi.fn(),
  getItemNames: vi.fn(),
  getUnits: vi.fn(),
  updateReceiptItem: vi.fn()
}

const mockNotifications = {
  success: vi.fn(),
  error: vi.fn()
}

const mockDateLocalization = {
  formatDate: vi.fn((date) => new Date(date).toLocaleDateString()),
  formatDateTime: vi.fn((date) => new Date(date).toLocaleString())
}

const mockRouteValidation = {
  validateReceiptId: vi.fn(),
  handleValidationError: vi.fn(),
  sanitizeStringParam: vi.fn(),
  sanitizeItemName: vi.fn((str) => str?.trim()),
  sanitizeText: vi.fn((str) => str?.trim())
}

// Mock implementations
vi.mock('@/stores/receipts', () => ({
  useReceiptsStore: () => mockReceiptsStore
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

vi.mock('@/services/receipts', () => ({
  receiptsService: mockReceiptsService
}))

vi.mock('@/composables/useNotifications', () => ({
  useNotifications: () => mockNotifications
}))

vi.mock('@/composables/useDateLocalization', () => ({
  useDateLocalization: () => mockDateLocalization
}))

vi.mock('@/utils/routeValidation', () => ({
  useRouteValidation: () => mockRouteValidation
}))

vi.mock('@/services/api', () => ({
  getApiBaseUrl: () => 'http://localhost:5000',
  default: {}
}))

vi.mock('@/i18n', () => ({
  getCurrentLocale: () => 'en'
}))

vi.mock('@/components/common/LocalizedDateInput.vue', () => ({
  default: {
    name: 'LocalizedDateInput',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  }
}))

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: vi.fn()
})

describe('ReceiptDetail.vue', () => {
  let wrapper: VueWrapper<any>

  const mockReceipt = {
    id: 123,
    filename: 'receipt-2024-01-15.jpg',
    storeName: 'Test Store',
    receiptDate: '2024-01-15',
    receiptNumber: 'REC-001',
    totalItemsDetected: 5,
    successfullyParsed: 4,
    imageQualityAssessment: 'Good',
    processingStatus: 'completed',
    createdAt: '2024-01-15T10:00:00Z',
    items: [
      {
        id: 1,
        itemName: 'Apple',
        quantity: 2,
        pricePerUnit: 1.50,
        totalPrice: 3.00,
        unit: 'kg',
        weightOriginal: '2.0',
        category: { id: 1, name: 'Fruits' },
        notes: 'Fresh apples'
      },
      {
        id: 2,
        itemName: 'Bread',
        quantity: 1,
        pricePerUnit: 2.50,
        totalPrice: 2.50,
        unit: 'loaf',
        category: { id: 2, name: 'Bakery' }
      }
    ],
    claudeResponseJson: { test: 'data' }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRouteValidation.validateReceiptId.mockReturnValue({
      isValid: true,
      value: 123
    })
    mockReceiptsStore.getReceiptDetails.mockResolvedValue(mockReceipt)
    window.confirm.mockReturnValue(true)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Basic Rendering', () => {
    it('renders page header correctly', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const title = wrapper.find('h1')
      expect(title.text()).toBe('receipts.receiptDetail.title')

      const filename = wrapper.find('p.text-xs.sm\\:text-sm')
      expect(filename.text()).toBe('receipt-2024-01-15.jpg')
    })

    it('renders processing status badge', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const statusBadge = wrapper.find('.inline-flex.items-center.px-3.py-1')
      expect(statusBadge.exists()).toBe(true)
      expect(statusBadge.text()).toBe('completed')
    })

    it('renders action buttons', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const reprocessButton = wrapper.find('.btn.btn-secondary')
      expect(reprocessButton.exists()).toBe(true)
      expect(reprocessButton.text()).toContain('receipts.receiptDetail.reprocess')

      const deleteButton = wrapper.find('.btn-danger')
      expect(deleteButton.exists()).toBe(true)
      expect(deleteButton.text()).toContain('receipts.receiptDetail.deleteReceipt')
    })

    it('renders back button', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const backButton = wrapper.find('button[class*="text-gray-400"]')
      expect(backButton.exists()).toBe(true)

      await backButton.trigger('click')
      expect(mockRouter.go).toHaveBeenCalledWith(-1)
    })
  })

  describe('Loading States', () => {
    it('shows loading spinner while fetching receipt', async () => {
      mockReceiptsStore.getReceiptDetails.mockImplementation(() => new Promise(() => {}))

      wrapper = mount(ReceiptDetail)
      await nextTick()

      expect(wrapper.find('.animate-spin').exists()).toBe(true)
      expect(wrapper.text()).toContain('receipts.receiptDetail.loadingReceipt')
    })

    it('shows error state when receipt fetch fails', async () => {
      mockReceiptsStore.getReceiptDetails.mockRejectedValue(new Error('Receipt not found'))

      wrapper = mount(ReceiptDetail)
      await flushPromises()

      expect(wrapper.text()).toContain('Receipt not found')
      expect(wrapper.find('.btn.btn-secondary').text()).toContain('receipts.tryAgain')
    })

    it('shows not found message when receipt is null', async () => {
      mockReceiptsStore.getReceiptDetails.mockResolvedValue(null)

      wrapper = mount(ReceiptDetail)
      await flushPromises()

      expect(wrapper.text()).toContain('receipts.receiptDetail.receiptNotFound')
    })
  })

  describe('Receipt Information Display', () => {
    it('displays basic receipt information', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      expect(wrapper.text()).toContain('Test Store')
      expect(wrapper.text()).toContain('REC-001')
      expect(wrapper.text()).toContain('5') // totalItemsDetected
      expect(wrapper.text()).toContain('4') // successfullyParsed
      expect(wrapper.text()).toContain('Good') // imageQualityAssessment
    })

    it('displays formatted dates', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      expect(mockDateLocalization.formatDate).toHaveBeenCalledWith('2024-01-15')
      expect(mockDateLocalization.formatDateTime).toHaveBeenCalledWith('2024-01-15T10:00:00Z')
    })

    it('renders receipt image correctly', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const image = wrapper.find('img')
      expect(image.exists()).toBe(true)
      expect(image.attributes('src')).toBe('http://localhost:5000/receipts/123/image')
      expect(image.attributes('alt')).toBe('receipt-2024-01-15.jpg')
    })

    it('shows image placeholder when image fails to load', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const image = wrapper.find('img')
      await image.trigger('error')
      await nextTick()

      const placeholder = wrapper.find('.flex.items-center.justify-center')
      expect(placeholder.exists()).toBe(true)
      expect(wrapper.text()).toContain('receipts.receiptDetail.failedToLoadImage')
    })
  })

  describe('Items List', () => {
    it('displays all receipt items', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const itemCards = wrapper.findAll('.border.border-gray-200')
      expect(itemCards).toHaveLength(2)

      expect(wrapper.text()).toContain('Apple')
      expect(wrapper.text()).toContain('Bread')
      expect(wrapper.text()).toContain('$3.00')
      expect(wrapper.text()).toContain('$2.50')
    })

    it('calculates and displays total correctly', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      expect(wrapper.text()).toContain('receipts.receiptDetail.total {"amount":"5.50"}')
    })

    it('displays item categories', async () => {
      mockCategoriesStore.getName.mockImplementation((id) => {
        if (id === 1) return 'Fruits'
        if (id === 2) return 'Bakery'
        return null
      })

      wrapper = mount(ReceiptDetail)
      await flushPromises()

      expect(wrapper.text()).toContain('Fruits')
      expect(wrapper.text()).toContain('Bakery')
    })

    it('shows item notes when available', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      expect(wrapper.text()).toContain('Fresh apples')
    })
  })

  describe('Store Name Editing', () => {
    it('enters edit mode when edit button is clicked', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const editButton = wrapper.find('.group .opacity-0')
      await editButton.trigger('click')
      await nextTick()

      const editInput = wrapper.find('input[type="text"]')
      expect(editInput.exists()).toBe(true)
      expect(editInput.element.value).toBe('Test Store')
    })

    it('saves store name changes', async () => {
      mockReceiptsStore.updateReceipt.mockResolvedValue(undefined)

      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const vm = wrapper.vm
      vm.editingStore = true
      vm.editedStoreName = 'Updated Store'
      await nextTick()

      await vm.saveEditedStoreName()

      expect(mockReceiptsStore.updateReceipt).toHaveBeenCalledWith(123, {
        storeName: 'Updated Store',
        receiptDate: '2024-01-15'
      })
      expect(mockNotifications.success).toHaveBeenCalled()
    })

    it('cancels store name editing', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const vm = wrapper.vm
      vm.editingStore = true
      vm.editedStoreName = 'Changed Name'
      await nextTick()

      vm.cancelEditingStoreName()

      expect(vm.editingStore).toBe(false)
      expect(vm.editedStoreName).toBe('')
    })

    it('shows store name suggestions while typing', async () => {
      mockReceiptsService.getStoreNames.mockResolvedValue(['Store A', 'Store B'])

      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const vm = wrapper.vm
      vm.editingStore = true
      vm.editedStoreName = 'Store'
      await nextTick()

      await vm.fetchStoreSuggestions('Store')

      expect(mockReceiptsService.getStoreNames).toHaveBeenCalledWith('Store')
      expect(vm.storeNameSuggestions).toEqual(['Store A', 'Store B'])
    })
  })

  describe('Date Editing', () => {
    it('enters date edit mode', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const vm = wrapper.vm
      vm.startEditingDate()

      expect(vm.editingDate).toBe(true)
      expect(vm.editedReceiptDate).toBe('2024-01-15')
    })

    it('saves date changes', async () => {
      mockReceiptsStore.updateReceipt.mockResolvedValue(undefined)

      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const vm = wrapper.vm
      vm.editingDate = true
      vm.editedReceiptDate = '2024-01-20'
      await nextTick()

      await vm.saveEditedDate()

      expect(mockReceiptsStore.updateReceipt).toHaveBeenCalledWith(123, {
        storeName: 'Test Store',
        receiptDate: '2024-01-20'
      })
    })

    it('cancels date editing', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const vm = wrapper.vm
      vm.editingDate = true
      vm.editedReceiptDate = '2024-01-20'
      await nextTick()

      vm.cancelEditingDate()

      expect(vm.editingDate).toBe(false)
      expect(vm.editedReceiptDate).toBe('')
    })
  })

  describe('Item Editing', () => {
    it('enters item edit mode', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const editButton = wrapper.find('.group-hover\\:opacity-100')
      await editButton.trigger('click')
      await nextTick()

      const vm = wrapper.vm
      expect(vm.editingItems[1]).toBe(true)
      expect(vm.editedItems[1].itemName).toBe('Apple')
    })

    it('calculates total price when quantity or price changes', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const vm = wrapper.vm
      vm.editedItems[1] = {
        quantity: 3,
        pricePerUnit: 2.00,
        totalPrice: 0
      }

      vm.calculateTotalPrice(1)

      expect(vm.editedItems[1].totalPrice).toBe(6.00)
    })

    it('saves item changes', async () => {
      const updatedItem = {
        id: 1,
        itemName: 'Updated Apple',
        quantity: 3,
        totalPrice: 4.50
      }
      mockReceiptsService.updateReceiptItem.mockResolvedValue(updatedItem)

      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const vm = wrapper.vm
      vm.editedItems[1] = {
        itemName: 'Updated Apple',
        quantity: 3,
        pricePerUnit: 1.50,
        totalPrice: 4.50,
        unit: 'kg',
        notes: '',
        categoryInput: 'Fruits',
        categorySelectedId: 1
      }

      await vm.saveEditedItem(1)

      expect(mockReceiptsService.updateReceiptItem).toHaveBeenCalled()
      expect(mockNotifications.success).toHaveBeenCalled()
    })

    it('cancels item editing', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const vm = wrapper.vm
      vm.editingItems[1] = true
      vm.editedItems[1] = { test: 'data' }

      vm.cancelEditingItem(1)

      expect(vm.editingItems[1]).toBe(false)
      expect(vm.editedItems[1]).toBeUndefined()
    })

    it('shows item name suggestions', async () => {
      mockReceiptsService.getItemNames.mockResolvedValue(['Apple Juice', 'Apple Pie'])

      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const vm = wrapper.vm
      vm.editedItems[1] = { itemName: 'Apple' }
      vm.itemSuggestions[1] = {
        itemName: { show: false, options: [], selectedIndex: -1 }
      }

      await vm.onItemNameInput(1)

      expect(mockReceiptsService.getItemNames).toHaveBeenCalledWith('Apple')
      expect(vm.itemSuggestions[1].itemName.options).toEqual(['Apple Juice', 'Apple Pie'])
    })

    it('shows unit suggestions', async () => {
      mockReceiptsService.getUnits.mockResolvedValue(['kg', 'lbs', 'oz'])

      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const vm = wrapper.vm
      vm.editedItems[1] = { unit: 'k' }
      vm.itemSuggestions[1] = {
        unit: { show: false, options: [], selectedIndex: -1 }
      }

      await vm.onUnitInput(1)

      expect(mockReceiptsService.getUnits).toHaveBeenCalledWith('k')
      expect(vm.itemSuggestions[1].unit.options).toEqual(['kg', 'lbs', 'oz'])
    })
  })

  describe('Receipt Actions', () => {
    it('reprocesses receipt', async () => {
      mockReceiptsStore.reprocessReceipt.mockResolvedValue(undefined)

      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const reprocessButton = wrapper.find('.btn.btn-secondary')
      await reprocessButton.trigger('click')

      expect(mockReceiptsStore.reprocessReceipt).toHaveBeenCalledWith(123)
      expect(mockReceiptsStore.getReceiptDetails).toHaveBeenCalledTimes(2) // Initial load + refresh
    })

    it('deletes receipt with confirmation', async () => {
      mockReceiptsStore.deleteReceipt.mockResolvedValue(undefined)
      window.confirm.mockReturnValue(true)

      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const deleteButton = wrapper.find('.btn-danger')
      await deleteButton.trigger('click')

      expect(window.confirm).toHaveBeenCalled()
      expect(mockReceiptsStore.deleteReceipt).toHaveBeenCalledWith(123)
      expect(mockRouter.push).toHaveBeenCalledWith('/receipts')
    })

    it('cancels delete when confirmation is declined', async () => {
      window.confirm.mockReturnValue(false)

      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const deleteButton = wrapper.find('.btn-danger')
      await deleteButton.trigger('click')

      expect(window.confirm).toHaveBeenCalled()
      expect(mockReceiptsStore.deleteReceipt).not.toHaveBeenCalled()
    })
  })

  describe('Status Color Mapping', () => {
    it('returns correct colors for different statuses', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const vm = wrapper.vm

      expect(vm.getStatusColor('completed')).toBe('bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400')
      expect(vm.getStatusColor('pending')).toBe('bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400')
      expect(vm.getStatusColor('processing')).toBe('bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400')
      expect(vm.getStatusColor('failed')).toBe('bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400')
      expect(vm.getStatusColor('unknown')).toBe('bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200')
    })
  })

  describe('Debug Information', () => {
    it('toggles debug information display', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      expect(wrapper.find('pre').exists()).toBe(false)

      const debugButton = wrapper.find('button').filter(btn =>
        btn.text().includes('receipts.receiptDetail.showDebugInfo')
      )[0]

      if (debugButton) {
        await debugButton.trigger('click')
        await nextTick()

        const vm = wrapper.vm
        expect(vm.showDebugInfo).toBe(true)
      }
    })

    it('displays Claude response JSON when debug is enabled', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const vm = wrapper.vm
      vm.showDebugInfo = true
      await nextTick()

      const debugSection = wrapper.find('.card p-6').filter(card =>
        card.text().includes('receipts.receiptDetail.claudeResponse')
      )[0]

      if (debugSection) {
        const preElement = debugSection.find('pre')
        expect(preElement.exists()).toBe(true)
        expect(preElement.text()).toContain('"test": "data"')
      }
    })
  })

  describe('Responsive Design', () => {
    it('applies responsive classes to main layout', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const container = wrapper.find('.max-w-7xl.mx-auto')
      expect(container.exists()).toBe(true)
      expect(container.classes()).toContain('px-4')
      expect(container.classes()).toContain('sm:px-6')
      expect(container.classes()).toContain('lg:px-8')
    })

    it('uses responsive grid for image and details', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const grid = wrapper.find('.grid.grid-cols-1.lg\\:grid-cols-2')
      expect(grid.exists()).toBe(true)
      expect(grid.classes()).toContain('gap-6')
      expect(grid.classes()).toContain('sm:gap-8')
    })
  })

  describe('Error Handling', () => {
    it('handles invalid receipt ID', async () => {
      mockRouteValidation.validateReceiptId.mockReturnValue({
        isValid: false,
        error: 'Invalid ID'
      })

      wrapper = mount(ReceiptDetail)
      await flushPromises()

      expect(mockRouteValidation.handleValidationError).toHaveBeenCalled()
    })

    it('handles update errors gracefully', async () => {
      mockReceiptsStore.updateReceipt.mockRejectedValue(new Error('Update failed'))

      wrapper = mount(ReceiptDetail)
      await flushPromises()

      const vm = wrapper.vm
      vm.editedStoreName = 'New Name'

      await vm.saveEditedStoreName()

      expect(mockNotifications.error).toHaveBeenCalled()
    })
  })

  describe('Lifecycle Management', () => {
    it('fetches categories on mount', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      expect(mockCategoriesStore.fetchCategories).toHaveBeenCalledWith('en')
      expect(mockCategoriesStore.startAutoRefresh).toHaveBeenCalled()
    })

    it('stops auto refresh on unmount', () => {
      wrapper = mount(ReceiptDetail)
      wrapper.unmount()

      expect(mockCategoriesStore.stopAutoRefresh).toHaveBeenCalled()
    })

    it('refetches categories when locale changes', async () => {
      wrapper = mount(ReceiptDetail)
      await flushPromises()

      // Simulate locale change
      mockI18n.locale.value = 'fr'
      await nextTick()

      expect(mockCategoriesStore.fetchCategories).toHaveBeenCalledWith('fr')
    })
  })
})