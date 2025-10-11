import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { categorizedDescribe, categorizedIt, TestCategory } from '../../../tests/utils/categories'
import PaymentMethodCard from '../PaymentMethodCard.vue'
import type { PaymentMethod } from '@/types/paymentMethod'

// Translation function
const $t = (key: string) => {
  const translations: Record<string, string> = {
    'paymentMethods.default': 'Default',
    'paymentMethods.expires': 'Expires',
    'paymentMethods.expired': 'Expired',
    'paymentMethods.actions': 'Actions',
    'paymentMethods.setAsDefault': 'Set as default',
    'common.edit': 'Edit',
    'common.delete': 'Delete'
  }
  return translations[key] || key
}

categorizedDescribe('PaymentMethodCard', [TestCategory.COMPONENT, TestCategory.UNIT, TestCategory.FAST], () => {
  let wrapper: any

  const mockPaymentMethod: PaymentMethod = {
    id: 1,
    userId: 100,
    type: 'card',
    provider: 'stripe',
    externalId: 'pm_12345',
    last4: '4242',
    brand: 'visa',
    expiryMonth: 12,
    expiryYear: 2025,
    holderName: 'John Doe',
    billingCity: 'San Francisco',
    billingState: 'CA',
    billingCountry: 'US',
    isDefault: false,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }

  categorizedDescribe('Rendering', [TestCategory.FAST, TestCategory.CRITICAL], () => {
    categorizedIt('should render payment method card with all details', [TestCategory.CRITICAL], () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: {
          mocks: {
            $t
          },
          stubs: {
            svg: true
          }
        }
      })

      expect(wrapper.find('.payment-method-card').exists()).toBe(true)
      expect(wrapper.text()).toContain('Visa')
      expect(wrapper.text()).toContain('•••• 4242')
      expect(wrapper.text()).toContain('John Doe')
    })

    categorizedIt('should display card brand correctly', [TestCategory.CRITICAL], () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.text()).toContain('Visa')
    })

    categorizedIt('should display last 4 digits with bullet points', [TestCategory.CRITICAL], () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.text()).toContain('•••• 4242')
    })

    categorizedIt('should display holder name when provided', [TestCategory.FAST], () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.text()).toContain('John Doe')
    })

    categorizedIt('should hide holder name when not provided', [TestCategory.FAST], () => {
      const paymentMethodWithoutHolder = {
        ...mockPaymentMethod,
        holderName: undefined
      }

      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: paymentMethodWithoutHolder },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.text()).not.toContain('John Doe')
    })

    categorizedIt('should render without last4 when not provided', [TestCategory.FAST], () => {
      const paymentMethodWithoutLast4 = {
        ...mockPaymentMethod,
        last4: undefined
      }

      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: paymentMethodWithoutLast4 },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.text()).not.toContain('••••')
    })

    categorizedIt('should capitalize card brand name', [TestCategory.FAST], () => {
      const mastercardPayment = {
        ...mockPaymentMethod,
        brand: 'mastercard'
      }

      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mastercardPayment },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.text()).toContain('Mastercard')
    })

    categorizedIt('should use type as fallback when brand not provided', [TestCategory.FAST], () => {
      const paymentMethodWithoutBrand = {
        ...mockPaymentMethod,
        brand: undefined,
        type: 'bank_account'
      }

      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: paymentMethodWithoutBrand },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.text()).toContain('Bank_account')
    })
  })

  categorizedDescribe('Default Badge', [TestCategory.FAST, TestCategory.CRITICAL], () => {
    categorizedIt('should display default badge when isDefault is true', [TestCategory.CRITICAL], () => {
      const defaultPaymentMethod = {
        ...mockPaymentMethod,
        isDefault: true
      }

      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: defaultPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.text()).toContain('Default')
      expect(wrapper.find('.bg-shoptrack-100').exists()).toBe(true)
    })

    categorizedIt('should not display default badge when isDefault is false', [TestCategory.CRITICAL], () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.text()).not.toContain('Default')
    })

    categorizedIt('should apply default styling when isDefault is true', [TestCategory.FAST], () => {
      const defaultPaymentMethod = {
        ...mockPaymentMethod,
        isDefault: true
      }

      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: defaultPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      const card = wrapper.find('.payment-method-card')
      expect(card.classes()).toContain('border-shoptrack-500')
      expect(card.classes()).toContain('bg-shoptrack-50')
    })

    categorizedIt('should apply non-default styling when isDefault is false', [TestCategory.FAST], () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      const card = wrapper.find('.payment-method-card')
      expect(card.classes()).toContain('border-gray-200')
      expect(card.classes()).toContain('bg-white')
    })
  })

  categorizedDescribe('Expiry Display and Validation', [TestCategory.FAST, TestCategory.CRITICAL], () => {
    categorizedIt('should display expiry date in MM/YYYY format', [TestCategory.CRITICAL], () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.text()).toContain('Expires')
      expect(wrapper.text()).toContain('12/2025')
    })

    categorizedIt('should pad single-digit month with zero', [TestCategory.FAST], () => {
      const paymentMethodSingleMonth = {
        ...mockPaymentMethod,
        expiryMonth: 3,
        expiryYear: 2025
      }

      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: paymentMethodSingleMonth },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.text()).toContain('03/2025')
    })

    categorizedIt('should not display expiry when month is missing', [TestCategory.FAST], () => {
      const paymentMethodNoExpiry = {
        ...mockPaymentMethod,
        expiryMonth: undefined,
        expiryYear: 2025
      }

      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: paymentMethodNoExpiry },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.text()).not.toContain('Expires')
    })

    categorizedIt('should not display expiry when year is missing', [TestCategory.FAST], () => {
      const paymentMethodNoExpiry = {
        ...mockPaymentMethod,
        expiryMonth: 12,
        expiryYear: undefined
      }

      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: paymentMethodNoExpiry },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.text()).not.toContain('Expires')
    })

    categorizedIt('should mark card as expired when past current date', [TestCategory.CRITICAL], () => {
      const expiredPaymentMethod = {
        ...mockPaymentMethod,
        expiryMonth: 1,
        expiryYear: 2020
      }

      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: expiredPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.text()).toContain('Expired')
      expect(wrapper.find('.text-red-600').exists()).toBe(true)
    })

    categorizedIt('should not mark card as expired when in future', [TestCategory.CRITICAL], () => {
      const futureYear = new Date().getFullYear() + 5
      const futurePaymentMethod = {
        ...mockPaymentMethod,
        expiryMonth: 12,
        expiryYear: futureYear
      }

      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: futurePaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.text()).not.toContain('Expired')
      expect(wrapper.find('.text-red-600').exists()).toBe(false)
    })

    categorizedIt('should mark card as expired when in current year but past month', [TestCategory.CRITICAL], () => {
      const now = new Date()
      const currentYear = now.getFullYear()
      const pastMonth = now.getMonth() // 0-indexed, so current month - 1

      const expiredPaymentMethod = {
        ...mockPaymentMethod,
        expiryMonth: pastMonth > 0 ? pastMonth : 1,
        expiryYear: currentYear
      }

      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: expiredPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      // Only check if past month is actually in the past
      if (pastMonth > 0) {
        expect(wrapper.text()).toContain('Expired')
      }
    })
  })

  categorizedDescribe('Billing Address', [TestCategory.FAST], () => {
    categorizedIt('should display full billing address when all fields present', [TestCategory.FAST], () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.text()).toContain('San Francisco, CA, US')
    })

    categorizedIt('should display partial billing address when some fields missing', [TestCategory.FAST], () => {
      const partialAddress = {
        ...mockPaymentMethod,
        billingCity: 'Seattle',
        billingState: undefined,
        billingCountry: 'US'
      }

      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: partialAddress },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.text()).toContain('Seattle, US')
    })

    categorizedIt('should not display billing address section when all fields missing', [TestCategory.FAST], () => {
      const noAddress = {
        ...mockPaymentMethod,
        billingCity: undefined,
        billingState: undefined,
        billingCountry: undefined
      }

      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: noAddress },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      const textContent = wrapper.text()
      expect(textContent).not.toContain('San Francisco')
      expect(textContent).not.toContain('CA')
      expect(textContent).not.toContain('US')
    })
  })

  categorizedDescribe('Dropdown Menu', [TestCategory.INTEGRATION, TestCategory.CRITICAL], () => {
    categorizedIt('should toggle menu on button click', [TestCategory.CRITICAL], async () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      const menuButton = wrapper.find('button[aria-label="Actions"]')
      expect(menuButton.exists()).toBe(true)

      // Menu should be closed initially
      expect(wrapper.find('.absolute.right-0').exists()).toBe(false)

      // Open menu
      await menuButton.trigger('click')
      expect(wrapper.find('.absolute.right-0').exists()).toBe(true)

      // Close menu
      await menuButton.trigger('click')
      expect(wrapper.find('.absolute.right-0').exists()).toBe(false)
    })

    categorizedIt('should show "Set as default" option when not default', [TestCategory.CRITICAL], async () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await wrapper.find('button[aria-label="Actions"]').trigger('click')

      expect(wrapper.text()).toContain('Set as default')
    })

    categorizedIt('should hide "Set as default" option when already default', [TestCategory.CRITICAL], async () => {
      const defaultPaymentMethod = {
        ...mockPaymentMethod,
        isDefault: true
      }

      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: defaultPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await wrapper.find('button[aria-label="Actions"]').trigger('click')

      expect(wrapper.text()).not.toContain('Set as default')
    })

    categorizedIt('should always show Edit option', [TestCategory.CRITICAL], async () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await wrapper.find('button[aria-label="Actions"]').trigger('click')

      expect(wrapper.text()).toContain('Edit')
    })

    categorizedIt('should always show Delete option', [TestCategory.CRITICAL], async () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await wrapper.find('button[aria-label="Actions"]').trigger('click')

      expect(wrapper.text()).toContain('Delete')
    })
  })

  categorizedDescribe('Event Emissions', [TestCategory.INTEGRATION, TestCategory.CRITICAL], () => {
    categorizedIt('should emit setDefault event with payment method id', [TestCategory.CRITICAL], async () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await wrapper.find('button[aria-label="Actions"]').trigger('click')

      const setDefaultButton = wrapper.findAll('.py-1 button').find((btn: any) =>
        btn.text().includes('Set as default')
      )
      await setDefaultButton.trigger('click')

      expect(wrapper.emitted('setDefault')).toBeTruthy()
      expect(wrapper.emitted('setDefault')[0]).toEqual([1])
    })

    categorizedIt('should emit edit event with full payment method object', [TestCategory.CRITICAL], async () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await wrapper.find('button[aria-label="Actions"]').trigger('click')

      const editButton = wrapper.findAll('.py-1 button').find((btn: any) =>
        btn.text().includes('Edit')
      )
      await editButton.trigger('click')

      expect(wrapper.emitted('edit')).toBeTruthy()
      expect(wrapper.emitted('edit')[0]).toEqual([mockPaymentMethod])
    })

    categorizedIt('should emit delete event with payment method id', [TestCategory.CRITICAL], async () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await wrapper.find('button[aria-label="Actions"]').trigger('click')

      const deleteButton = wrapper.findAll('.py-1 button').find((btn: any) =>
        btn.text().includes('Delete')
      )
      await deleteButton.trigger('click')

      expect(wrapper.emitted('delete')).toBeTruthy()
      expect(wrapper.emitted('delete')[0]).toEqual([1])
    })

    categorizedIt('should close menu after emitting setDefault', [TestCategory.FAST], async () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await wrapper.find('button[aria-label="Actions"]').trigger('click')
      expect(wrapper.find('.absolute.right-0').exists()).toBe(true)

      const setDefaultButton = wrapper.findAll('.py-1 button').find((btn: any) =>
        btn.text().includes('Set as default')
      )
      await setDefaultButton.trigger('click')

      expect(wrapper.find('.absolute.right-0').exists()).toBe(false)
    })

    categorizedIt('should close menu after emitting edit', [TestCategory.FAST], async () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await wrapper.find('button[aria-label="Actions"]').trigger('click')
      expect(wrapper.find('.absolute.right-0').exists()).toBe(true)

      const editButton = wrapper.findAll('.py-1 button').find((btn: any) =>
        btn.text().includes('Edit')
      )
      await editButton.trigger('click')

      expect(wrapper.find('.absolute.right-0').exists()).toBe(false)
    })

    categorizedIt('should close menu after emitting delete', [TestCategory.FAST], async () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await wrapper.find('button[aria-label="Actions"]').trigger('click')
      expect(wrapper.find('.absolute.right-0').exists()).toBe(true)

      const deleteButton = wrapper.findAll('.py-1 button').find((btn: any) =>
        btn.text().includes('Delete')
      )
      await deleteButton.trigger('click')

      expect(wrapper.find('.absolute.right-0').exists()).toBe(false)
    })
  })

  categorizedDescribe('Click Outside Directive', [TestCategory.INTEGRATION, TestCategory.FAST], () => {
    categorizedIt('should close menu when clicking outside', [TestCategory.CRITICAL], async () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } },
        attachTo: document.body
      })

      // Open menu
      await wrapper.find('button[aria-label="Actions"]').trigger('click')
      expect(wrapper.find('.absolute.right-0').exists()).toBe(true)

      // Click outside
      document.body.click()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.absolute.right-0').exists()).toBe(false)

      wrapper.unmount()
    })

    categorizedIt('should not close menu when clicking inside dropdown', [TestCategory.FAST], async () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } },
        attachTo: document.body
      })

      // Open menu
      await wrapper.find('button[aria-label="Actions"]').trigger('click')
      expect(wrapper.find('.absolute.right-0').exists()).toBe(true)

      // Click inside dropdown (on the dropdown element itself)
      const dropdown = wrapper.find('.absolute.right-0')
      await dropdown.trigger('click')

      expect(wrapper.find('.absolute.right-0').exists()).toBe(true)

      wrapper.unmount()
    })
  })

  categorizedDescribe('Accessibility', [TestCategory.FAST, TestCategory.ACCESSIBILITY], () => {
    categorizedIt('should have aria-label on actions button', [TestCategory.ACCESSIBILITY], () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      const menuButton = wrapper.find('button[aria-label="Actions"]')
      expect(menuButton.exists()).toBe(true)
      expect(menuButton.attributes('aria-label')).toBe('Actions')
    })

    categorizedIt('should use semantic button elements', [TestCategory.ACCESSIBILITY], async () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await wrapper.find('button[aria-label="Actions"]').trigger('click')

      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    categorizedIt('should have proper heading structure', [TestCategory.ACCESSIBILITY], () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.find('h3').exists()).toBe(true)
    })
  })

  categorizedDescribe('Dark Mode', [TestCategory.FAST], () => {
    categorizedIt('should have dark mode classes', [TestCategory.FAST], () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      const html = wrapper.html()
      expect(html).toContain('dark:bg-gray-800')
      expect(html).toContain('dark:text-white')
      expect(html).toContain('dark:text-gray-400')
    })

    categorizedIt('should have dark mode classes for default state', [TestCategory.FAST], () => {
      const defaultPaymentMethod = {
        ...mockPaymentMethod,
        isDefault: true
      }

      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: defaultPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      const html = wrapper.html()
      expect(html).toContain('dark:bg-shoptrack-900')
    })
  })

  categorizedDescribe('Edge Cases', [TestCategory.FAST], () => {
    categorizedIt('should handle payment method with minimal data', [TestCategory.FAST], () => {
      const minimalPayment: PaymentMethod = {
        id: 1,
        userId: 100,
        type: 'card',
        provider: 'stripe',
        isDefault: false,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }

      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: minimalPayment },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.find('.payment-method-card').exists()).toBe(true)
      expect(wrapper.text()).toContain('Card')
    })

    categorizedIt('should handle digital wallet payment method', [TestCategory.FAST], () => {
      const digitalWallet: PaymentMethod = {
        ...mockPaymentMethod,
        type: 'digital_wallet',
        brand: 'paypal',
        last4: undefined,
        expiryMonth: undefined,
        expiryYear: undefined
      }

      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: digitalWallet },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.text()).toContain('Paypal')
      expect(wrapper.text()).not.toContain('••••')
      expect(wrapper.text()).not.toContain('Expires')
    })

    categorizedIt('should handle bank account payment method', [TestCategory.FAST], () => {
      const bankAccount: PaymentMethod = {
        ...mockPaymentMethod,
        type: 'bank_account',
        brand: undefined,
        last4: '6789',
        expiryMonth: undefined,
        expiryYear: undefined
      }

      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: bankAccount },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.text()).toContain('Bank_account')
      expect(wrapper.text()).toContain('•••• 6789')
    })

    categorizedIt('should handle very long holder names', [TestCategory.FAST], () => {
      const longNamePayment = {
        ...mockPaymentMethod,
        holderName: 'Alexander Christopher Bartholomew Wellington-Smythe III'
      }

      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: longNamePayment },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.text()).toContain('Alexander Christopher Bartholomew Wellington-Smythe III')
    })

    categorizedIt('should handle special characters in billing address', [TestCategory.FAST], () => {
      const specialCharsPayment = {
        ...mockPaymentMethod,
        billingCity: 'São Paulo',
        billingState: 'SP',
        billingCountry: 'BR'
      }

      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: specialCharsPayment },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.text()).toContain('São Paulo, SP, BR')
    })
  })

  categorizedDescribe('Styling and Visual States', [TestCategory.FAST], () => {
    categorizedIt('should have hover effects on card', [TestCategory.FAST], () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      const card = wrapper.find('.payment-method-card')
      expect(card.classes()).toContain('transition-all')
    })

    categorizedIt('should have hover effects on menu button', [TestCategory.FAST], () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      const menuButton = wrapper.find('button[aria-label="Actions"]')
      expect(menuButton.classes()).toContain('hover:bg-gray-100')
    })

    categorizedIt('should style delete button differently', [TestCategory.FAST], async () => {
      wrapper = mount(PaymentMethodCard, {
        props: { paymentMethod: mockPaymentMethod },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await wrapper.find('button[aria-label="Actions"]').trigger('click')

      const deleteButton = wrapper.findAll('.py-1 button').find((btn: any) =>
        btn.text().includes('Delete')
      )

      expect(deleteButton.classes()).toContain('text-red-600')
      expect(deleteButton.classes()).toContain('hover:bg-red-50')
    })
  })
})
