import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import SubscriptionModal from '../SubscriptionModal.vue'
import type { SubscriptionPlan, UserSubscription, SubscriptionCreateResult, SubscriptionUpdateResult } from '@/types/subscription'
import { categorizedDescribe, categorizedIt, TestCategory } from '../../../tests/utils/categories'

// Mock services
const mockGetAvailablePlans = vi.fn()
const mockGetMySubscription = vi.fn()
const mockSubscribe = vi.fn()
const mockUpdateSubscription = vi.fn()
const mockCreateCheckoutSession = vi.fn()

vi.mock('@/services/subscription.service', () => ({
  subscriptionService: {
    getAvailablePlans: (...args: any[]) => mockGetAvailablePlans(...args),
    getMySubscription: (...args: any[]) => mockGetMySubscription(...args),
    subscribe: (...args: any[]) => mockSubscribe(...args),
    updateSubscription: (...args: any[]) => mockUpdateSubscription(...args),
    createCheckoutSession: (...args: any[]) => mockCreateCheckoutSession(...args)
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

// Global $t mock
const $t = (key: string, fallback?: string) => fallback || key

// Test data
const mockFreePlan: SubscriptionPlan = {
  id: 1,
  name: 'Free Plan',
  code: 'free',
  description: 'Basic features for personal use',
  monthlyPrice: 0,
  yearlyPrice: 0,
  setupFee: 0,
  isActive: true,
  isPublic: true,
  allowTrial: false,
  trialDays: 0,
  sortOrder: 1,
  currency: 'USD',
  features: [
    {
      id: 1,
      subscriptionPlanId: 1,
      subscriptionFeatureId: 1,
      limitValue: 10,
      booleanValue: undefined,
      textValue: undefined,
      isActive: true,
      featureCode: 'receipts',
      featureName: 'Receipts per month',
      featureDescription: 'Number of receipts you can upload',
      featureType: 'limit',
      unitType: 'receipts',
      sortOrder: 1,
      isIncluded: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 2,
      subscriptionPlanId: 1,
      subscriptionFeatureId: 2,
      limitValue: undefined,
      booleanValue: false,
      textValue: undefined,
      isActive: true,
      featureCode: 'export',
      featureName: 'Export to CSV',
      featureDescription: 'Export your data',
      featureType: 'boolean',
      unitType: undefined,
      sortOrder: 2,
      isIncluded: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  ],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
}

const mockBasicPlan: SubscriptionPlan = {
  id: 2,
  name: 'Basic Plan',
  code: 'basic',
  description: 'For small businesses',
  monthlyPrice: 9.99,
  yearlyPrice: 99.99,
  setupFee: 0,
  isActive: true,
  isPublic: true,
  allowTrial: true,
  trialDays: 14,
  sortOrder: 2,
  currency: 'USD',
  features: [
    {
      id: 3,
      subscriptionPlanId: 2,
      subscriptionFeatureId: 1,
      limitValue: 100,
      booleanValue: undefined,
      textValue: undefined,
      isActive: true,
      featureCode: 'receipts',
      featureName: 'Receipts per month',
      featureDescription: 'Number of receipts you can upload',
      featureType: 'limit',
      unitType: 'receipts',
      sortOrder: 1,
      isIncluded: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 4,
      subscriptionPlanId: 2,
      subscriptionFeatureId: 2,
      limitValue: undefined,
      booleanValue: true,
      textValue: undefined,
      isActive: true,
      featureCode: 'export',
      featureName: 'Export to CSV',
      featureDescription: 'Export your data',
      featureType: 'boolean',
      unitType: undefined,
      sortOrder: 2,
      isIncluded: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  ],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
}

const mockCurrentSubscription: UserSubscription = {
  id: 1,
  userId: 1,
  subscriptionPlanId: 1,
  status: 'active',
  billingInterval: 'monthly',
  amount: 0,
  currency: 'USD',
  startDate: '2024-01-01T00:00:00Z',
  nextBillingDate: '2024-02-01T00:00:00Z',
  plan: mockFreePlan,
  planCode: 'free',
  isActive: true,
  userEmail: 'test@example.com',
  userName: 'Test User',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
}

categorizedDescribe('SubscriptionModal', [TestCategory.COMPONENT, TestCategory.INTEGRATION, TestCategory.FAST], () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock responses
    mockGetAvailablePlans.mockResolvedValue([mockFreePlan, mockBasicPlan])
    mockGetMySubscription.mockResolvedValue(null)
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  categorizedDescribe('Modal Visibility', [TestCategory.FAST, TestCategory.CRITICAL], () => {
    categorizedIt('should not render when isOpen is false', [TestCategory.CRITICAL], () => {
      wrapper = mount(SubscriptionModal, {
        props: { isOpen: false },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.find('.fixed.inset-0').exists()).toBe(false)
    })

    categorizedIt('should render when isOpen is true', [TestCategory.CRITICAL], () => {
      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(wrapper.find('.fixed.inset-0').exists()).toBe(true)
    })

    categorizedIt('should emit close event when overlay is clicked', [TestCategory.CRITICAL], async () => {
      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await wrapper.find('.fixed.inset-0').trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    categorizedIt('should emit close event when close button is clicked', [TestCategory.CRITICAL], async () => {
      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await wrapper.find('button[aria-label="Close"]').trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    categorizedIt('should not close when clicking modal content', [TestCategory.FAST], async () => {
      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await wrapper.find('.card.rounded-xl').trigger('click')

      expect(wrapper.emitted('close')).toBeFalsy()
    })
  })

  categorizedDescribe('Loading State', [TestCategory.FAST, TestCategory.CRITICAL], () => {
    categorizedIt('should display loading indicator while fetching plans', [TestCategory.CRITICAL], async () => {
      // Mock delayed response
      mockGetAvailablePlans.mockReturnValue(new Promise(() => {})) // Never resolves
      mockGetMySubscription.mockResolvedValue(null)

      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()

      expect(wrapper.find('.animate-spin').exists()).toBe(true)
      expect(wrapper.text()).toContain('Loading...')
    })

    categorizedIt('should load plans when modal opens', [TestCategory.CRITICAL], async () => {
      wrapper = mount(SubscriptionModal, {
        props: { isOpen: false },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      expect(mockGetAvailablePlans).not.toHaveBeenCalled()

      await wrapper.setProps({ isOpen: true })
      await nextTick()

      expect(mockGetAvailablePlans).toHaveBeenCalled()
      expect(mockGetMySubscription).toHaveBeenCalled()
    })
  })

  categorizedDescribe('Error State', [TestCategory.FAST, TestCategory.CRITICAL], () => {
    categorizedIt('should display error message when fetch fails', [TestCategory.CRITICAL], async () => {
      const errorMessage = 'Failed to load plans'
      mockGetAvailablePlans.mockRejectedValue({
        response: { data: { message: errorMessage } }
      })

      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick() // Wait for error state

      expect(wrapper.text()).toContain(errorMessage)
    })

    categorizedIt('should have retry button when error occurs', [TestCategory.CRITICAL], async () => {
      mockGetAvailablePlans.mockRejectedValue({
        response: { data: { message: 'Network error' } }
      })

      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      const retryButton = wrapper.find('button:contains("Retry")')
      expect(retryButton.exists()).toBe(true)
    })

    categorizedIt('should retry loading plans when retry button clicked', [TestCategory.CRITICAL], async () => {
      mockGetAvailablePlans.mockRejectedValueOnce({
        response: { data: { message: 'Network error' } }
      })
      mockGetAvailablePlans.mockResolvedValueOnce([mockFreePlan, mockBasicPlan])

      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      expect(mockGetAvailablePlans).toHaveBeenCalledTimes(1)

      const retryButton = wrapper.find('.bg-red-600')
      await retryButton.trigger('click')
      await nextTick()

      expect(mockGetAvailablePlans).toHaveBeenCalledTimes(2)
    })
  })

  categorizedDescribe('Current Subscription Display', [TestCategory.FAST, TestCategory.CRITICAL], () => {
    categorizedIt('should display current subscription when user has one', [TestCategory.CRITICAL], async () => {
      mockGetMySubscription.mockResolvedValue(mockCurrentSubscription)

      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      expect(wrapper.text()).toContain('Current Plan')
      expect(wrapper.text()).toContain('Free Plan')
      expect(wrapper.text()).toContain('active')
    })

    categorizedIt('should display next billing date when available', [TestCategory.FAST], async () => {
      mockGetMySubscription.mockResolvedValue(mockCurrentSubscription)

      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      expect(wrapper.text()).toContain('Next billing')
      expect(wrapper.text()).toContain('Feb 1, 2024')
    })

    categorizedIt('should not display current subscription section when user has none', [TestCategory.FAST], async () => {
      mockGetMySubscription.mockResolvedValue(null)

      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      expect(wrapper.text()).not.toContain('Current Plan')
    })
  })

  categorizedDescribe('Plans Display', [TestCategory.FAST, TestCategory.CRITICAL], () => {
    categorizedIt('should display all available plans', [TestCategory.CRITICAL], async () => {
      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      expect(wrapper.text()).toContain('Free Plan')
      expect(wrapper.text()).toContain('Basic Plan')
    })

    categorizedIt('should display plan descriptions', [TestCategory.FAST], async () => {
      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      expect(wrapper.text()).toContain('Basic features for personal use')
      expect(wrapper.text()).toContain('For small businesses')
    })

    categorizedIt('should display monthly price', [TestCategory.CRITICAL], async () => {
      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      expect(wrapper.text()).toContain('$0.00')
      expect(wrapper.text()).toContain('$9.99')
      expect(wrapper.text()).toContain('/month')
    })

    categorizedIt('should display yearly savings when available', [TestCategory.FAST], async () => {
      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      expect(wrapper.text()).toContain('$99.99/year')
      expect(wrapper.text()).toContain('save')
    })

    categorizedIt('should highlight free plan with special styling', [TestCategory.FAST], async () => {
      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      const planCards = wrapper.findAll('.card.rounded-xl.overflow-hidden')
      const freePlanCard = planCards.find(card => card.text().includes('Free Plan'))

      expect(freePlanCard?.classes()).toContain('border-shoptrack-500')
    })
  })

  categorizedDescribe('Features Display', [TestCategory.FAST, TestCategory.CRITICAL], () => {
    categorizedIt('should display plan features with checkmarks', [TestCategory.CRITICAL], async () => {
      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      expect(wrapper.text()).toContain('Receipts per month')
      expect(wrapper.text()).toContain('Export to CSV')
    })

    categorizedIt('should show limit values for limit features', [TestCategory.FAST], async () => {
      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      expect(wrapper.text()).toContain('(10 receipts)')
      expect(wrapper.text()).toContain('(100 receipts)')
    })

    categorizedIt('should show checkmark for included boolean features', [TestCategory.FAST], async () => {
      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      // Basic plan has export feature enabled (booleanValue: true)
      const planCards = wrapper.findAll('.card.rounded-xl.overflow-hidden')
      const basicPlanCard = planCards.find(card => card.text().includes('Basic Plan'))

      expect(basicPlanCard?.text()).toContain('Export to CSV')
    })

    categorizedIt('should show X mark for excluded boolean features', [TestCategory.FAST], async () => {
      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      // Free plan has export feature disabled (booleanValue: false)
      const planCards = wrapper.findAll('.card.rounded-xl.overflow-hidden')
      const freePlanCard = planCards.find(card => card.text().includes('Free Plan'))

      expect(freePlanCard?.text()).toContain('Export to CSV')
    })
  })

  categorizedDescribe('Current Plan Indicator', [TestCategory.FAST, TestCategory.CRITICAL], () => {
    categorizedIt('should show "Current Plan" button for active subscription', [TestCategory.CRITICAL], async () => {
      mockGetMySubscription.mockResolvedValue(mockCurrentSubscription)

      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      const planCards = wrapper.findAll('.card.rounded-xl.overflow-hidden')
      const freePlanCard = planCards.find(card => card.text().includes('Free Plan'))
      const currentPlanButton = freePlanCard?.find('button:contains("Current Plan")')

      expect(currentPlanButton?.exists()).toBe(true)
    })

    categorizedIt('should disable current plan button', [TestCategory.FAST], async () => {
      mockGetMySubscription.mockResolvedValue(mockCurrentSubscription)

      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      const planCards = wrapper.findAll('.card.rounded-xl.overflow-hidden')
      const freePlanCard = planCards.find(card => card.text().includes('Free Plan'))
      const currentPlanButton = freePlanCard?.find('button')

      expect(currentPlanButton?.attributes('disabled')).toBeDefined()
    })
  })

  categorizedDescribe('Free Plan Subscription', [TestCategory.INTEGRATION, TestCategory.CRITICAL], () => {
    categorizedIt('should subscribe to free plan when no existing subscription', [TestCategory.CRITICAL], async () => {
      const mockResult: SubscriptionCreateResult = {
        success: true,
        subscription: { ...mockCurrentSubscription, planCode: 'free' }
      }
      mockSubscribe.mockResolvedValue(mockResult)
      mockGetMySubscription.mockResolvedValue(null)

      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      const planCards = wrapper.findAll('.card.rounded-xl.overflow-hidden')
      const freePlanCard = planCards.find(card => card.text().includes('Free Plan'))
      const subscribeButton = freePlanCard?.find('button')

      await subscribeButton?.trigger('click')
      await nextTick()

      expect(mockSubscribe).toHaveBeenCalledWith({
        planCode: 'free',
        billingInterval: 'monthly'
      })
    })

    categorizedIt('should update to free plan when has existing subscription', [TestCategory.CRITICAL], async () => {
      const existingBasicSubscription: UserSubscription = {
        ...mockCurrentSubscription,
        planCode: 'basic',
        plan: mockBasicPlan
      }
      const mockResult: SubscriptionUpdateResult = {
        success: true,
        subscription: { ...mockCurrentSubscription, planCode: 'free' }
      }
      mockUpdateSubscription.mockResolvedValue(mockResult)
      mockGetMySubscription.mockResolvedValue(existingBasicSubscription)

      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      const planCards = wrapper.findAll('.card.rounded-xl.overflow-hidden')
      const freePlanCard = planCards.find(card => card.text().includes('Free Plan'))
      const subscribeButton = freePlanCard?.find('button')

      await subscribeButton?.trigger('click')
      await nextTick()

      expect(mockUpdateSubscription).toHaveBeenCalledWith({
        newPlanCode: 'free',
        newBillingInterval: 'monthly'
      })
    })

    categorizedIt('should show success message after free plan subscription', [TestCategory.CRITICAL], async () => {
      const mockResult: SubscriptionCreateResult = {
        success: true,
        subscription: mockCurrentSubscription
      }
      mockSubscribe.mockResolvedValue(mockResult)
      mockGetMySubscription.mockResolvedValue(null)

      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      const planCards = wrapper.findAll('.card.rounded-xl.overflow-hidden')
      const freePlanCard = planCards.find(card => card.text().includes('Free Plan'))
      const subscribeButton = freePlanCard?.find('button')

      await subscribeButton?.trigger('click')
      await nextTick()
      await nextTick()

      expect(wrapper.text()).toContain('Subscription Successful!')
    })

    categorizedIt('should emit subscribed event after successful free plan subscription', [TestCategory.CRITICAL], async () => {
      const mockResult: SubscriptionCreateResult = {
        success: true,
        subscription: mockCurrentSubscription
      }
      mockSubscribe.mockResolvedValue(mockResult)
      mockGetMySubscription.mockResolvedValue(null)

      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      const planCards = wrapper.findAll('.card.rounded-xl.overflow-hidden')
      const freePlanCard = planCards.find(card => card.text().includes('Free Plan'))
      const subscribeButton = freePlanCard?.find('button')

      await subscribeButton?.trigger('click')
      await nextTick()

      expect(wrapper.emitted('subscribed')).toBeTruthy()
    })
  })

  categorizedDescribe('Paid Plan Subscription', [TestCategory.INTEGRATION, TestCategory.CRITICAL], () => {
    categorizedIt('should create checkout session for paid plans', [TestCategory.CRITICAL], async () => {
      const mockCheckoutSession = {
        sessionUrl: 'https://checkout.stripe.com/test-session',
        sessionId: 'test-session-id'
      }
      mockCreateCheckoutSession.mockResolvedValue(mockCheckoutSession)

      // Mock window.location.href
      delete (window as any).location
      window.location = { href: '' } as any

      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      const planCards = wrapper.findAll('.card.rounded-xl.overflow-hidden')
      const basicPlanCard = planCards.find(card => card.text().includes('Basic Plan'))
      const subscribeButton = basicPlanCard?.find('button')

      await subscribeButton?.trigger('click')
      await nextTick()

      expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
        'basic',
        'monthly',
        expect.stringContaining('/subscription/success'),
        expect.stringContaining('/subscription')
      )
    })

    categorizedIt('should redirect to Stripe checkout for paid plans', [TestCategory.CRITICAL], async () => {
      const mockCheckoutSession = {
        sessionUrl: 'https://checkout.stripe.com/test-session',
        sessionId: 'test-session-id'
      }
      mockCreateCheckoutSession.mockResolvedValue(mockCheckoutSession)

      // Mock window.location.href
      delete (window as any).location
      window.location = { href: '' } as any

      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      const planCards = wrapper.findAll('.card.rounded-xl.overflow-hidden')
      const basicPlanCard = planCards.find(card => card.text().includes('Basic Plan'))
      const subscribeButton = basicPlanCard?.find('button')

      await subscribeButton?.trigger('click')
      await nextTick()

      expect(window.location.href).toBe('https://checkout.stripe.com/test-session')
    })

    categorizedIt('should show subscribing state while processing paid plan', [TestCategory.FAST], async () => {
      mockCreateCheckoutSession.mockReturnValue(new Promise(() => {})) // Never resolves

      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      const planCards = wrapper.findAll('.card.rounded-xl.overflow-hidden')
      const basicPlanCard = planCards.find(card => card.text().includes('Basic Plan'))
      const subscribeButton = basicPlanCard?.find('button')

      await subscribeButton?.trigger('click')
      await nextTick()

      expect(wrapper.text()).toContain('Subscribing...')
      expect(wrapper.find('.animate-spin').exists()).toBe(true)
    })

    categorizedIt('should handle checkout session creation error', [TestCategory.CRITICAL], async () => {
      const errorMessage = 'Failed to create checkout session'
      mockCreateCheckoutSession.mockRejectedValue({
        response: { data: { message: errorMessage } }
      })

      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      const planCards = wrapper.findAll('.card.rounded-xl.overflow-hidden')
      const basicPlanCard = planCards.find(card => card.text().includes('Basic Plan'))
      const subscribeButton = basicPlanCard?.find('button')

      await subscribeButton?.trigger('click')
      await nextTick()
      await nextTick()

      expect(wrapper.text()).toContain(errorMessage)
    })
  })

  categorizedDescribe('Success State', [TestCategory.FAST, TestCategory.CRITICAL], () => {
    categorizedIt('should show success overlay after successful subscription', [TestCategory.CRITICAL], async () => {
      const mockResult: SubscriptionCreateResult = {
        success: true,
        subscription: mockCurrentSubscription
      }
      mockSubscribe.mockResolvedValue(mockResult)
      mockGetMySubscription.mockResolvedValue(null)

      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      const planCards = wrapper.findAll('.card.rounded-xl.overflow-hidden')
      const freePlanCard = planCards.find(card => card.text().includes('Free Plan'))
      const subscribeButton = freePlanCard?.find('button')

      await subscribeButton?.trigger('click')
      await nextTick()

      expect(wrapper.find('.absolute.inset-0').exists()).toBe(true)
      expect(wrapper.text()).toContain('Subscription Successful!')
    })

    categorizedIt('should close modal when success close button clicked', [TestCategory.CRITICAL], async () => {
      const mockResult: SubscriptionCreateResult = {
        success: true,
        subscription: mockCurrentSubscription
      }
      mockSubscribe.mockResolvedValue(mockResult)
      mockGetMySubscription.mockResolvedValue(null)

      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      const planCards = wrapper.findAll('.card.rounded-xl.overflow-hidden')
      const freePlanCard = planCards.find(card => card.text().includes('Free Plan'))
      const subscribeButton = freePlanCard?.find('button')

      await subscribeButton?.trigger('click')
      await nextTick()

      const closeButton = wrapper.find('.bg-shoptrack-600')
      await closeButton.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  categorizedDescribe('Accessibility', [TestCategory.FAST, TestCategory.ACCESSIBILITY], () => {
    categorizedIt('should have proper heading structure', [TestCategory.ACCESSIBILITY], async () => {
      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()

      const h2 = wrapper.find('h2')
      expect(h2.exists()).toBe(true)
      expect(h2.text()).toContain('Choose Your Plan')
    })

    categorizedIt('should use semantic button elements', [TestCategory.ACCESSIBILITY], async () => {
      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()
      await nextTick()

      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThan(0)

      // Close button should have aria-label
      const closeButton = wrapper.find('button[aria-label="Close"]')
      expect(closeButton.exists()).toBe(true)
    })
  })

  categorizedDescribe('Dark Mode', [TestCategory.FAST], () => {
    categorizedIt('should have dark mode classes', [TestCategory.FAST], async () => {
      wrapper = mount(SubscriptionModal, {
        props: { isOpen: true },
        global: { mocks: { $t }, stubs: { svg: true } }
      })

      await nextTick()

      const html = wrapper.html()
      expect(html).toContain('dark:')
    })
  })
})
