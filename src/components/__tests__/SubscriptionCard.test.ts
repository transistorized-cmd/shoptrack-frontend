import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { categorizedDescribe, categorizedIt, TestCategory } from '../../../tests/utils/categories'
import SubscriptionCard from '../SubscriptionCard.vue'
import type { UserSubscription, FeatureUsage, PlanFeature, SubscriptionPlan } from '@/types/subscription'

// Mock services
const mockGetMySubscription = vi.fn()
const mockGetFeatureUsage = vi.fn()
const mockCancelSubscription = vi.fn()

vi.mock('@/services/subscription.service', () => ({
  subscriptionService: {
    getMySubscription: (...args: any[]) => mockGetMySubscription(...args),
    getFeatureUsage: (...args: any[]) => mockGetFeatureUsage(...args),
    cancelSubscription: (...args: any[]) => mockCancelSubscription(...args)
  }
}))

// Mock composables
vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key
  })
}))

vi.mock('@/composables/useDateLocalization', () => ({
  useDateLocalization: () => ({
    formatDate: (date: string) => {
      if (!date) return ''
      return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }
  })
}))

// Mock UI helpers
vi.mock('@/utils/uiHelpers', () => ({
  getStatusBadgeClass: (status: string) => {
    const classes: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      trial: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800',
      expired: 'bg-red-100 text-red-800',
      past_due: 'bg-yellow-100 text-yellow-800'
    }
    return classes[status] || 'bg-gray-100 text-gray-800'
  },
  getUsageBarClass: (usage: number, limit: number) => {
    const percent = (usage / limit) * 100
    if (percent >= 90) return 'bg-red-600'
    if (percent >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }
}))

// Translation function
const $t = (key: string, fallback?: string) => fallback || key

categorizedDescribe('SubscriptionCard', [TestCategory.COMPONENT, TestCategory.INTEGRATION, TestCategory.FAST], () => {
  let wrapper: any

  const mockPlan: SubscriptionPlan = {
    id: 1,
    name: 'Pro Plan',
    code: 'pro',
    description: 'Professional features for power users',
    monthlyPrice: 19.99,
    yearlyPrice: 199.99,
    isActive: true,
    isPublic: true,
    allowTrial: true,
    trialDays: 14,
    sortOrder: 2,
    currency: 'USD',
    features: [
      {
        id: 1,
        subscriptionPlanId: 1,
        subscriptionFeatureId: 1,
        featureCode: 'receipts_per_month',
        featureName: 'Receipts per month',
        featureType: 'limit',
        limitValue: 100,
        isActive: true,
        sortOrder: 1,
        isIncluded: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 2,
        subscriptionPlanId: 1,
        subscriptionFeatureId: 2,
        featureCode: 'advanced_analytics',
        featureName: 'Advanced Analytics',
        featureType: 'boolean',
        booleanValue: true,
        isActive: true,
        sortOrder: 2,
        isIncluded: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 3,
        subscriptionPlanId: 1,
        subscriptionFeatureId: 3,
        featureCode: 'priority_support',
        featureName: 'Priority Support',
        featureType: 'access',
        booleanValue: true,
        isActive: true,
        sortOrder: 3,
        isIncluded: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }

  const mockActiveSubscription: UserSubscription = {
    id: 1,
    userId: 100,
    subscriptionPlanId: 1,
    status: 'active',
    billingInterval: 'monthly',
    amount: 19.99,
    currency: 'USD',
    startDate: '2024-01-01T00:00:00Z',
    nextBillingDate: '2024-02-01T00:00:00Z',
    plan: mockPlan,
    userEmail: 'test@example.com',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }

  const mockFeatureUsage: FeatureUsage = {
    featureCode: 'receipts_per_month',
    period: 'monthly',
    usage: 45,
    limit: 100,
    canUse: true
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  categorizedDescribe('Loading State', [TestCategory.FAST, TestCategory.CRITICAL], () => {
    categorizedIt('should display loading indicator while fetching data', [TestCategory.CRITICAL], async () => {
      mockGetMySubscription.mockImplementation(() => new Promise(() => {})) // Never resolves

      wrapper = mount(SubscriptionCard, {
        global: {
          mocks: { $t },
          stubs: { SubscriptionModal: true, svg: true }
        }
      })

      await wrapper.vm.$nextTick()

      expect(wrapper.find('.animate-spin').exists()).toBe(true)
      expect(wrapper.text()).toContain('Loading')
    })
  })

  categorizedDescribe('Error State', [TestCategory.FAST, TestCategory.CRITICAL], () => {
    categorizedIt('should display error message when fetch fails', [TestCategory.CRITICAL], async () => {
      const errorMessage = 'Failed to load subscription'
      mockGetMySubscription.mockRejectedValue({
        response: { data: { message: errorMessage } }
      })

      wrapper = mount(SubscriptionCard, {
        global: {
          mocks: { $t },
          stubs: { SubscriptionModal: true, svg: true }
        }
      })

      await flushPromises()

      expect(wrapper.find('.bg-red-50').exists()).toBe(true)
      expect(wrapper.text()).toContain(errorMessage)
    })
  })

  categorizedDescribe('No Subscription State', [TestCategory.FAST, TestCategory.CRITICAL], () => {
    categorizedIt('should show "Choose a Plan" prompt when no subscription', [TestCategory.CRITICAL], async () => {
      mockGetMySubscription.mockResolvedValue(null)

      wrapper = mount(SubscriptionCard, {
        global: {
          mocks: { $t },
          stubs: { SubscriptionModal: true, svg: true }
        }
      })

      await flushPromises()

      expect(wrapper.text()).toContain('No Active Subscription')
      expect(wrapper.text()).toContain('Choose a Plan')
    })

    categorizedIt('should open subscription modal when "Choose a Plan" clicked', [TestCategory.CRITICAL], async () => {
      mockGetMySubscription.mockResolvedValue(null)

      wrapper = mount(SubscriptionCard, {
        global: {
          mocks: { $t },
          stubs: { SubscriptionModal: true, svg: true }
        }
      })

      await flushPromises()

      const chooseButton = wrapper.findAll('button').find((btn: any) =>
        btn.text().includes('Choose a Plan')
      )
      await chooseButton.trigger('click')

      expect(wrapper.vm.showSubscriptionModal).toBe(true)
    })
  })

  categorizedDescribe('Active Subscription Display', [TestCategory.FAST, TestCategory.CRITICAL], () => {
    categorizedIt('should display subscription plan name and status', [TestCategory.CRITICAL], async () => {
      mockGetMySubscription.mockResolvedValue(mockActiveSubscription)
      mockGetFeatureUsage.mockResolvedValue(mockFeatureUsage)

      wrapper = mount(SubscriptionCard, {
        global: {
          mocks: { $t },
          stubs: { SubscriptionModal: true, svg: true }
        }
      })

      await flushPromises()

      expect(wrapper.text()).toContain('Pro Plan')
      expect(wrapper.text()).toContain('active')
    })

    categorizedIt('should display monthly price correctly', [TestCategory.CRITICAL], async () => {
      mockGetMySubscription.mockResolvedValue(mockActiveSubscription)
      mockGetFeatureUsage.mockResolvedValue(mockFeatureUsage)

      wrapper = mount(SubscriptionCard, {
        global: {
          mocks: { $t },
          stubs: { SubscriptionModal: true, svg: true }
        }
      })

      await flushPromises()

      expect(wrapper.text()).toContain('$19.99')
      expect(wrapper.text()).toContain('/month')
    })

    categorizedIt('should display next billing date', [TestCategory.CRITICAL], async () => {
      mockGetMySubscription.mockResolvedValue(mockActiveSubscription)
      mockGetFeatureUsage.mockResolvedValue(mockFeatureUsage)

      wrapper = mount(SubscriptionCard, {
        global: {
          mocks: { $t },
          stubs: { SubscriptionModal: true, svg: true }
        }
      })

      await flushPromises()

      expect(wrapper.text()).toContain('Feb 1, 2024')
    })

    categorizedIt('should display plan description', [TestCategory.FAST], async () => {
      mockGetMySubscription.mockResolvedValue(mockActiveSubscription)
      mockGetFeatureUsage.mockResolvedValue(mockFeatureUsage)

      wrapper = mount(SubscriptionCard, {
        global: {
          mocks: { $t },
          stubs: { SubscriptionModal: true, svg: true }
        }
      })

      await flushPromises()

      expect(wrapper.text()).toContain('Professional features for power users')
    })
  })

  categorizedDescribe('Feature Display', [TestCategory.FAST, TestCategory.CRITICAL], () => {
    categorizedIt('should display limit features with usage bar', [TestCategory.CRITICAL], async () => {
      mockGetMySubscription.mockResolvedValue(mockActiveSubscription)
      mockGetFeatureUsage.mockResolvedValue(mockFeatureUsage)

      wrapper = mount(SubscriptionCard, {
        global: {
          mocks: { $t },
          stubs: { SubscriptionModal: true, svg: true }
        }
      })

      await flushPromises()

      expect(wrapper.text()).toContain('Receipts per month')
      expect(wrapper.text()).toContain('45 / 100')
    })

    categorizedIt('should display boolean features with checkmark', [TestCategory.CRITICAL], async () => {
      mockGetMySubscription.mockResolvedValue(mockActiveSubscription)
      mockGetFeatureUsage.mockResolvedValue(mockFeatureUsage)

      wrapper = mount(SubscriptionCard, {
        global: {
          mocks: { $t },
          stubs: { SubscriptionModal: true, svg: true }
        }
      })

      await flushPromises()

      expect(wrapper.text()).toContain('Advanced Analytics')
    })

    categorizedIt('should display access features with checkmark', [TestCategory.CRITICAL], async () => {
      mockGetMySubscription.mockResolvedValue(mockActiveSubscription)
      mockGetFeatureUsage.mockResolvedValue(mockFeatureUsage)

      wrapper = mount(SubscriptionCard, {
        global: {
          mocks: { $t },
          stubs: { SubscriptionModal: true, svg: true }
        }
      })

      await flushPromises()

      expect(wrapper.text()).toContain('Priority Support')
    })

    categorizedIt('should sort features by sortOrder', [TestCategory.FAST], async () => {
      mockGetMySubscription.mockResolvedValue(mockActiveSubscription)
      mockGetFeatureUsage.mockResolvedValue(mockFeatureUsage)

      wrapper = mount(SubscriptionCard, {
        global: {
          mocks: { $t },
          stubs: { SubscriptionModal: true, svg: true }
        }
      })

      await flushPromises()

      const featuresText = wrapper.text()
      const receiptsIndex = featuresText.indexOf('Receipts per month')
      const analyticsIndex = featuresText.indexOf('Advanced Analytics')
      const supportIndex = featuresText.indexOf('Priority Support')

      expect(receiptsIndex).toBeLessThan(analyticsIndex)
      expect(analyticsIndex).toBeLessThan(supportIndex)
    })
  })

  categorizedDescribe('Trial Subscription', [TestCategory.FAST], () => {
    categorizedIt('should display trial end date for trial subscriptions', [TestCategory.CRITICAL], async () => {
      const trialSubscription: UserSubscription = {
        ...mockActiveSubscription,
        status: 'trial',
        trialEndDate: '2024-01-15T00:00:00Z',
        nextBillingDate: undefined
      }

      mockGetMySubscription.mockResolvedValue(trialSubscription)
      mockGetFeatureUsage.mockResolvedValue(mockFeatureUsage)

      wrapper = mount(SubscriptionCard, {
        global: {
          mocks: { $t },
          stubs: { SubscriptionModal: true, svg: true }
        }
      })

      await flushPromises()

      expect(wrapper.text()).toContain('Jan 15, 2024')
    })
  })

  categorizedDescribe('Cancelled Subscription', [TestCategory.FAST, TestCategory.CRITICAL], () => {
    categorizedIt('should display cancellation warning when subscription is cancelled', [TestCategory.CRITICAL], async () => {
      const cancelledSubscription: UserSubscription = {
        ...mockActiveSubscription,
        cancelledAt: '2024-01-10T00:00:00Z',
        nextBillingDate: '2024-02-01T00:00:00Z'
      }

      mockGetMySubscription.mockResolvedValue(cancelledSubscription)
      mockGetFeatureUsage.mockResolvedValue(mockFeatureUsage)

      wrapper = mount(SubscriptionCard, {
        global: {
          mocks: { $t },
          stubs: { SubscriptionModal: true, svg: true }
        }
      })

      await flushPromises()

      expect(wrapper.find('.bg-amber-50').exists()).toBe(true)
      expect(wrapper.text()).toContain('Subscription Cancelled')
      expect(wrapper.text()).toContain('Feb 1, 2024')
    })

    categorizedIt('should hide cancel button when subscription already cancelled', [TestCategory.CRITICAL], async () => {
      const cancelledSubscription: UserSubscription = {
        ...mockActiveSubscription,
        cancelledAt: '2024-01-10T00:00:00Z'
      }

      mockGetMySubscription.mockResolvedValue(cancelledSubscription)
      mockGetFeatureUsage.mockResolvedValue(mockFeatureUsage)

      wrapper = mount(SubscriptionCard, {
        global: {
          mocks: { $t },
          stubs: { SubscriptionModal: true, svg: true }
        }
      })

      await flushPromises()

      const cancelButton = wrapper.findAll('button').find((btn: any) =>
        btn.text().includes('Cancel') && !btn.text().includes('Cancelled')
      )
      expect(cancelButton).toBeUndefined()
    })
  })

  categorizedDescribe('Cancel Dialog', [TestCategory.INTEGRATION, TestCategory.CRITICAL], () => {
    categorizedIt('should open cancel dialog when cancel button clicked', [TestCategory.CRITICAL], async () => {
      mockGetMySubscription.mockResolvedValue(mockActiveSubscription)
      mockGetFeatureUsage.mockResolvedValue(mockFeatureUsage)

      wrapper = mount(SubscriptionCard, {
        global: {
          mocks: { $t },
          stubs: { SubscriptionModal: true, svg: true }
        }
      })

      await flushPromises()

      const cancelButton = wrapper.findAll('button').find((btn: any) =>
        btn.text() === 'Cancel'
      )
      await cancelButton.trigger('click')

      expect(wrapper.find('.fixed.inset-0').exists()).toBe(true)
      expect(wrapper.text()).toContain('Cancel Subscription')
    })

    categorizedIt('should close cancel dialog when user clicks cancel in dialog', [TestCategory.CRITICAL], async () => {
      mockGetMySubscription.mockResolvedValue(mockActiveSubscription)
      mockGetFeatureUsage.mockResolvedValue(mockFeatureUsage)

      wrapper = mount(SubscriptionCard, {
        global: {
          mocks: { $t },
          stubs: { SubscriptionModal: true, svg: true }
        }
      })

      await flushPromises()

      const cancelButton = wrapper.findAll('button').find((btn: any) =>
        btn.text() === 'Cancel'
      )
      await cancelButton.trigger('click')
      await wrapper.vm.$nextTick()

      const dialogCancelButton = wrapper.findAll('button').find((btn: any) =>
        btn.text().includes('Cancel') && btn.classes().includes('bg-gray-300')
      )
      await dialogCancelButton.trigger('click')

      expect(wrapper.find('.fixed.inset-0').exists()).toBe(false)
    })

    categorizedIt('should cancel subscription when confirmed', [TestCategory.CRITICAL], async () => {
      mockGetMySubscription.mockResolvedValue(mockActiveSubscription)
      mockGetFeatureUsage.mockResolvedValue(mockFeatureUsage)
      mockCancelSubscription.mockResolvedValue({ success: true })

      wrapper = mount(SubscriptionCard, {
        global: {
          mocks: { $t },
          stubs: { SubscriptionModal: true, svg: true }
        }
      })

      await flushPromises()

      const cancelButton = wrapper.findAll('button').find((btn: any) =>
        btn.text() === 'Cancel'
      )
      await cancelButton.trigger('click')
      await wrapper.vm.$nextTick()

      const confirmButton = wrapper.findAll('button').find((btn: any) =>
        btn.text().includes('Yes, Cancel')
      )
      await confirmButton.trigger('click')

      await flushPromises()

      expect(mockCancelSubscription).toHaveBeenCalledWith('User requested cancellation from profile page')
      expect(mockGetMySubscription).toHaveBeenCalledTimes(2) // Initial load + reload after cancel
    })
  })

  categorizedDescribe('Change Plan', [TestCategory.INTEGRATION], () => {
    categorizedIt('should open subscription modal when "Change Plan" clicked', [TestCategory.CRITICAL], async () => {
      mockGetMySubscription.mockResolvedValue(mockActiveSubscription)
      mockGetFeatureUsage.mockResolvedValue(mockFeatureUsage)

      wrapper = mount(SubscriptionCard, {
        global: {
          mocks: { $t },
          stubs: { SubscriptionModal: true, svg: true }
        }
      })

      await flushPromises()

      const changePlanButton = wrapper.findAll('button').find((btn: any) =>
        btn.text() === 'Change Plan'
      )
      await changePlanButton.trigger('click')

      expect(wrapper.vm.showSubscriptionModal).toBe(true)
    })
  })

  categorizedDescribe('Free Plan', [TestCategory.FAST], () => {
    categorizedIt('should hide cancel button for free plans', [TestCategory.FAST], async () => {
      const freePlan: SubscriptionPlan = {
        ...mockPlan,
        monthlyPrice: 0,
        code: 'free',
        name: 'Free Plan'
      }

      const freeSubscription: UserSubscription = {
        ...mockActiveSubscription,
        plan: freePlan
      }

      mockGetMySubscription.mockResolvedValue(freeSubscription)
      mockGetFeatureUsage.mockResolvedValue(mockFeatureUsage)

      wrapper = mount(SubscriptionCard, {
        global: {
          mocks: { $t },
          stubs: { SubscriptionModal: true, svg: true }
        }
      })

      await flushPromises()

      const cancelButton = wrapper.findAll('button').find((btn: any) =>
        btn.text() === 'Cancel' && !btn.text().includes('Cancelled')
      )
      expect(cancelButton).toBeUndefined()
    })
  })

  categorizedDescribe('Accessibility', [TestCategory.FAST, TestCategory.ACCESSIBILITY], () => {
    categorizedIt('should have proper heading structure', [TestCategory.ACCESSIBILITY], async () => {
      mockGetMySubscription.mockResolvedValue(mockActiveSubscription)
      mockGetFeatureUsage.mockResolvedValue(mockFeatureUsage)

      wrapper = mount(SubscriptionCard, {
        global: {
          mocks: { $t },
          stubs: { SubscriptionModal: true, svg: true }
        }
      })

      await flushPromises()

      expect(wrapper.find('h3').exists()).toBe(true)
      expect(wrapper.find('h4').exists()).toBe(true)
    })

    categorizedIt('should use semantic button elements', [TestCategory.ACCESSIBILITY], async () => {
      mockGetMySubscription.mockResolvedValue(mockActiveSubscription)
      mockGetFeatureUsage.mockResolvedValue(mockFeatureUsage)

      wrapper = mount(SubscriptionCard, {
        global: {
          mocks: { $t },
          stubs: { SubscriptionModal: true, svg: true }
        }
      })

      await flushPromises()

      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  categorizedDescribe('Dark Mode', [TestCategory.FAST], () => {
    categorizedIt('should have dark mode classes', [TestCategory.FAST], async () => {
      mockGetMySubscription.mockResolvedValue(mockActiveSubscription)
      mockGetFeatureUsage.mockResolvedValue(mockFeatureUsage)

      wrapper = mount(SubscriptionCard, {
        global: {
          mocks: { $t },
          stubs: { SubscriptionModal: true, svg: true }
        }
      })

      await flushPromises()

      const html = wrapper.html()
      expect(html).toContain('dark:text-white')
      expect(html).toContain('dark:bg-')
    })
  })
})
