import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { categorizedDescribe, categorizedIt, TestCategory } from '../../../../tests/utils/categories'
import ReceiptCard from '../ReceiptCard.vue'
import type { Receipt } from '@/types/receipt'

// Mock composables
vi.mock('@/composables/useDateLocalization', () => ({
  useDateLocalization: () => ({
    formatDate: vi.fn((date: string) => {
      if (!date) return 'No date'
      return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    })
  })
}))

vi.mock('@/composables/useCurrencyFormat', () => ({
  useCurrencyFormat: () => ({
    formatAmountCompact: vi.fn((amount: number, currency: string = 'USD') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2
      }).format(amount)
    })
  })
}))

categorizedDescribe('ReceiptCard', [TestCategory.COMPONENT, TestCategory.UNIT, TestCategory.FAST], () => {
  let wrapper: any
  let router: any

  const mockReceipt: Receipt = {
    id: 1,
    filename: 'grocery-receipt.jpg',
    receiptDate: '2024-01-15',
    receiptNumber: 'REC-12345',
    storeName: 'SuperMart',
    totalAmount: 125.50,
    currency: 'USD',
    processingStatus: 'completed',
    totalItemsDetected: 10,
    successfullyParsed: 8,
    items: [
      {
        id: 1,
        receiptId: 1,
        itemName: 'Organic Apples',
        quantity: 2,
        unitPrice: 3.99,
        totalPrice: 7.98,
        category: { id: 1, name: 'Fruits', locale: 'en' },
        confidence: 'high',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
      },
      {
        id: 2,
        receiptId: 1,
        itemName: 'Milk 2%',
        quantity: 1,
        unitPrice: 4.50,
        totalPrice: 4.50,
        category: { id: 2, name: 'Dairy', locale: 'en' },
        confidence: 'high',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
      },
      {
        id: 3,
        receiptId: 1,
        itemName: 'Bread',
        quantity: 1,
        unitPrice: 2.99,
        totalPrice: 2.99,
        category: { id: 3, name: 'Bakery', locale: 'en' },
        confidence: 'medium',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
      },
      {
        id: 4,
        receiptId: 1,
        itemName: 'Eggs',
        quantity: 1,
        unitPrice: 3.99,
        totalPrice: 3.99,
        category: { id: 2, name: 'Dairy', locale: 'en' },
        confidence: 'high',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
      }
    ],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T11:00:00Z'
  }

  beforeEach(async () => {
    // Create router with receipt detail route
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          name: 'home',
          component: { template: '<div>Home</div>' }
        },
        {
          path: '/receipts/:id',
          name: 'receipt-detail',
          component: { template: '<div>Receipt Detail</div>' }
        }
      ]
    })

    await router.push('/')
    await router.isReady()
  })

  categorizedDescribe('Rendering', [TestCategory.FAST, TestCategory.CRITICAL], () => {
    categorizedIt('should render receipt basic information', [TestCategory.CRITICAL], async () => {
      wrapper = mount(ReceiptCard, {
        props: { receipt: mockReceipt },
        global: { plugins: [router] }
      })

      expect(wrapper.text()).toContain('SuperMart')
      expect(wrapper.text()).toContain('Jan 15, 2024')
      expect(wrapper.text()).toContain('REC-12345')
    })

    categorizedIt('should render receipt stats', [TestCategory.CRITICAL], async () => {
      wrapper = mount(ReceiptCard, {
        props: { receipt: mockReceipt },
        global: { plugins: [router] }
      })

      expect(wrapper.text()).toContain('10') // totalItemsDetected
      expect(wrapper.text()).toContain('Items')
      expect(wrapper.text()).toContain('Total')
    })

    categorizedIt('should render first 3 items from receipt', [TestCategory.CRITICAL], async () => {
      wrapper = mount(ReceiptCard, {
        props: { receipt: mockReceipt },
        global: { plugins: [router] }
      })

      expect(wrapper.text()).toContain('Organic Apples')
      expect(wrapper.text()).toContain('Milk 2%')
      expect(wrapper.text()).toContain('Bread')
      expect(wrapper.text()).toContain('$7.98')
      expect(wrapper.text()).toContain('$4.50')
      expect(wrapper.text()).toContain('$2.99')
    })

    categorizedIt('should show +N more items indicator when more than 3 items', [TestCategory.CRITICAL], async () => {
      wrapper = mount(ReceiptCard, {
        props: { receipt: mockReceipt },
        global: { plugins: [router] }
      })

      expect(wrapper.text()).toContain('+1 more items')
    })

    categorizedIt('should not show more items indicator when 3 or fewer items', [TestCategory.FAST], async () => {
      const receiptWith3Items = {
        ...mockReceipt,
        items: mockReceipt.items!.slice(0, 3)
      }

      wrapper = mount(ReceiptCard, {
        props: { receipt: receiptWith3Items },
        global: { plugins: [router] }
      })

      expect(wrapper.text()).not.toContain('more items')
    })

    categorizedIt('should handle receipt with no date', [TestCategory.FAST], async () => {
      const receiptNoDate = {
        ...mockReceipt,
        receiptDate: undefined
      }

      wrapper = mount(ReceiptCard, {
        props: { receipt: receiptNoDate },
        global: { plugins: [router] }
      })

      expect(wrapper.text()).toContain('No date')
    })

    categorizedIt('should handle receipt with no items', [TestCategory.FAST], async () => {
      const receiptNoItems = {
        ...mockReceipt,
        items: []
      }

      wrapper = mount(ReceiptCard, {
        props: { receipt: receiptNoItems },
        global: { plugins: [router] }
      })

      expect(wrapper.find('.space-y-1').exists()).toBe(false)
    })

    categorizedIt('should handle receipt without receipt number', [TestCategory.FAST], async () => {
      const receiptNoNumber = {
        ...mockReceipt,
        receiptNumber: undefined
      }

      wrapper = mount(ReceiptCard, {
        props: { receipt: receiptNoNumber },
        global: { plugins: [router] }
      })

      expect(wrapper.text()).not.toContain('Receipt #')
    })
  })

  categorizedDescribe('Processing Status', [TestCategory.FAST], () => {
    categorizedIt('should show processing indicator when status is processing', [TestCategory.CRITICAL], async () => {
      const processingReceipt = {
        ...mockReceipt,
        processingStatus: 'processing' as const
      }

      wrapper = mount(ReceiptCard, {
        props: { receipt: processingReceipt },
        global: { plugins: [router] }
      })

      expect(wrapper.text()).toContain('Processing...')
      expect(wrapper.find('.animate-spin').exists()).toBe(true)
    })

    categorizedIt('should not show processing indicator when status is completed', [TestCategory.FAST], async () => {
      wrapper = mount(ReceiptCard, {
        props: { receipt: mockReceipt },
        global: { plugins: [router] }
      })

      expect(wrapper.text()).not.toContain('Processing...')
      expect(wrapper.find('.animate-spin').exists()).toBe(false)
    })

    categorizedIt('should not show processing indicator when status is failed', [TestCategory.FAST], async () => {
      const failedReceipt = {
        ...mockReceipt,
        processingStatus: 'failed' as const
      }

      wrapper = mount(ReceiptCard, {
        props: { receipt: failedReceipt },
        global: { plugins: [router] }
      })

      expect(wrapper.text()).not.toContain('Processing...')
      expect(wrapper.find('.animate-spin').exists()).toBe(false)
    })
  })

  categorizedDescribe('User Interactions', [TestCategory.INTEGRATION, TestCategory.COMPONENT], () => {
    categorizedIt('should navigate to receipt detail when card is clicked', [TestCategory.CRITICAL], async () => {
      wrapper = mount(ReceiptCard, {
        props: { receipt: mockReceipt },
        global: { plugins: [router] }
      })

      const pushSpy = vi.spyOn(router, 'push')

      await wrapper.find('.card').trigger('click')

      expect(pushSpy).toHaveBeenCalledWith({
        name: 'receipt-detail',
        params: { id: '1' }
      })
    })

    categorizedIt('should emit delete event when delete button is clicked', [TestCategory.CRITICAL], async () => {
      wrapper = mount(ReceiptCard, {
        props: { receipt: mockReceipt },
        global: { plugins: [router] }
      })

      const deleteButton = wrapper.find('button[title="Delete receipt"]')
      expect(deleteButton.exists()).toBe(true)

      await deleteButton.trigger('click')

      expect(wrapper.emitted('delete')).toBeTruthy()
      expect(wrapper.emitted('delete')[0]).toEqual([1])
    })

    categorizedIt('should stop propagation when delete button is clicked', [TestCategory.CRITICAL], async () => {
      wrapper = mount(ReceiptCard, {
        props: { receipt: mockReceipt },
        global: { plugins: [router] }
      })

      const pushSpy = vi.spyOn(router, 'push')
      const deleteButton = wrapper.find('button[title="Delete receipt"]')

      await deleteButton.trigger('click')

      // Navigation should NOT happen when delete is clicked
      expect(pushSpy).not.toHaveBeenCalled()
      expect(wrapper.emitted('delete')).toBeTruthy()
    })
  })

  categorizedDescribe('Currency Formatting', [TestCategory.FAST], () => {
    categorizedIt('should format prices with correct currency', [TestCategory.CRITICAL], async () => {
      wrapper = mount(ReceiptCard, {
        props: { receipt: mockReceipt },
        global: { plugins: [router] }
      })

      // Verify USD formatting
      expect(wrapper.text()).toContain('$7.98')
      expect(wrapper.text()).toContain('$4.50')
    })

    categorizedIt('should handle different currencies', [TestCategory.FAST], async () => {
      const euroReceipt = {
        ...mockReceipt,
        currency: 'EUR',
        items: [
          {
            ...mockReceipt.items![0],
            totalPrice: 10.50
          }
        ]
      }

      wrapper = mount(ReceiptCard, {
        props: { receipt: euroReceipt },
        global: { plugins: [router] }
      })

      expect(wrapper.text()).toContain('€10.50')
    })
  })

  categorizedDescribe('Accessibility', [TestCategory.FAST, TestCategory.ACCESSIBILITY], () => {
    categorizedIt('should have cursor-pointer class for clickable card', [TestCategory.ACCESSIBILITY], async () => {
      wrapper = mount(ReceiptCard, {
        props: { receipt: mockReceipt },
        global: { plugins: [router] }
      })

      expect(wrapper.find('.cursor-pointer').exists()).toBe(true)
    })

    categorizedIt('should have proper title attribute on delete button', [TestCategory.ACCESSIBILITY], async () => {
      wrapper = mount(ReceiptCard, {
        props: { receipt: mockReceipt },
        global: { plugins: [router] }
      })

      const deleteButton = wrapper.find('button[title="Delete receipt"]')
      expect(deleteButton.attributes('title')).toBe('Delete receipt')
    })

    categorizedIt('should have proper semantic structure', [TestCategory.ACCESSIBILITY], async () => {
      wrapper = mount(ReceiptCard, {
        props: { receipt: mockReceipt },
        global: { plugins: [router] }
      })

      expect(wrapper.find('h3').exists()).toBe(true)
      expect(wrapper.find('h4').exists()).toBe(true)
    })
  })

  categorizedDescribe('Dark Mode', [TestCategory.FAST], () => {
    categorizedIt('should have dark mode classes', [TestCategory.FAST], async () => {
      wrapper = mount(ReceiptCard, {
        props: { receipt: mockReceipt },
        global: { plugins: [router] }
      })

      const html = wrapper.html()
      expect(html).toContain('dark:text-white')
      expect(html).toContain('dark:text-gray-400')
      expect(html).toContain('dark:bg-gray-700')
    })
  })

  categorizedDescribe('Edge Cases', [TestCategory.FAST], () => {
    categorizedIt('should handle undefined items array', [TestCategory.FAST], async () => {
      const receiptUndefinedItems = {
        ...mockReceipt,
        items: undefined
      }

      wrapper = mount(ReceiptCard, {
        props: { receipt: receiptUndefinedItems },
        global: { plugins: [router] }
      })

      expect(wrapper.text()).toContain('SuperMart')
      // Should not crash
    })

    categorizedIt('should handle very long filenames', [TestCategory.FAST], async () => {
      const longFilenameReceipt = {
        ...mockReceipt,
        filename: 'this-is-a-very-long-filename-that-should-be-truncated-properly-in-the-ui.jpg'
      }

      wrapper = mount(ReceiptCard, {
        props: { receipt: longFilenameReceipt },
        global: { plugins: [router] }
      })

      expect(wrapper.find('h3.truncate').exists()).toBe(true)
    })

    categorizedIt('should handle zero items detected', [TestCategory.FAST], async () => {
      const zeroItemsReceipt = {
        ...mockReceipt,
        totalItemsDetected: 0,
        successfullyParsed: 0,
        items: []
      }

      wrapper = mount(ReceiptCard, {
        props: { receipt: zeroItemsReceipt },
        global: { plugins: [router] }
      })

      expect(wrapper.text()).toContain('0')
      expect(wrapper.text()).toContain('Items')
    })

    categorizedIt('should handle receipt with special characters in item names', [TestCategory.FAST], async () => {
      const specialCharsReceipt = {
        ...mockReceipt,
        items: [
          {
            id: 1,
            receiptId: 1,
            itemName: 'Item with "quotes" & <symbols>',
            quantity: 1,
            totalPrice: 5.00,
            category: { id: 1, name: 'Test', locale: 'en' },
            confidence: 'high',
            createdAt: '2024-01-15T10:00:00Z',
            updatedAt: '2024-01-15T10:00:00Z'
          }
        ]
      }

      wrapper = mount(ReceiptCard, {
        props: { receipt: specialCharsReceipt },
        global: { plugins: [router] }
      })

      expect(wrapper.text()).toContain('Item with "quotes" & <symbols>')
    })
  })

  categorizedDescribe('Responsive Design', [TestCategory.FAST], () => {
    categorizedIt('should have responsive grid classes', [TestCategory.FAST], async () => {
      wrapper = mount(ReceiptCard, {
        props: { receipt: mockReceipt },
        global: { plugins: [router] }
      })

      const html = wrapper.html()
      expect(html).toContain('grid-cols-2')
      expect(html).toContain('sm:flex-row')
      expect(html).toContain('sm:p-6')
    })

    categorizedIt('should have responsive padding', [TestCategory.FAST], async () => {
      wrapper = mount(ReceiptCard, {
        props: { receipt: mockReceipt },
        global: { plugins: [router] }
      })

      expect(wrapper.find('.p-4').exists()).toBe(true)
    })
  })
})
