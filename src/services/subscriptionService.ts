import { apiWithTimeout } from './api';
import { generateIdempotencyKey } from '@/utils/idempotency';
import type {
  SubscriptionPlan,
  UserSubscription,
  CreateUserSubscriptionRequest,
  UpdateUserSubscriptionRequest,
  SubscriptionCreateResult,
  SubscriptionUpdateResult,
  CancelSubscriptionRequest,
  PaymentMethod,
  AddPaymentMethodRequest,
  SetupIntent,
  PaymentTransaction,
  UpcomingInvoice
} from '@/types/subscription';

/**
 * Subscription Service
 * Handles all subscription-related API calls for the ShopTrack frontend
 */
export const subscriptionService = {
  // ============ SUBSCRIPTION PLANS ============

  /**
   * Get all available subscription plans (public endpoint)
   */
  async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    const response = await apiWithTimeout.default.get('/subscriptions/plans');
    return response.data;
  },

  /**
   * Get a specific plan by code
   */
  async getPlanByCode(code: string): Promise<SubscriptionPlan> {
    const response = await apiWithTimeout.default.get(`/subscriptions/plans/${code}`);
    return response.data;
  },

  // ============ USER SUBSCRIPTIONS ============

  /**
   * Get current user's subscription
   */
  async getMySubscription(): Promise<UserSubscription | null> {
    try {
      const response = await apiWithTimeout.default.get('/subscriptions/my-subscription');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // No active subscription
      }
      throw error;
    }
  },

  /**
   * Create a new subscription for the current user
   */
  async createSubscription(request: CreateUserSubscriptionRequest): Promise<SubscriptionCreateResult> {
    const response = await apiWithTimeout.default.post('/subscriptions', request);
    return response.data;
  },

  /**
   * Update the current user's subscription (change plan or billing interval)
   */
  async updateSubscription(request: UpdateUserSubscriptionRequest): Promise<SubscriptionUpdateResult> {
    const response = await apiWithTimeout.default.put('/subscriptions', request);
    return response.data;
  },

  /**
   * Cancel the current user's subscription
   */
  async cancelSubscription(request: CancelSubscriptionRequest = {}): Promise<{ message: string }> {
    const response = await apiWithTimeout.default.post('/subscriptions/cancel', request);
    return response.data;
  },

  /**
   * Check subscription status
   */
  async getSubscriptionStatus(): Promise<{ hasActiveSubscription: boolean; subscription: UserSubscription | null }> {
    const response = await apiWithTimeout.default.get('/subscriptions/status');
    return response.data;
  },

  // ============ PAYMENT METHODS ============

  /**
   * Get all payment methods for the current user
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const response = await apiWithTimeout.default.get('/paymentmethods');
    return response.data;
  },

  /**
   * Get a specific payment method by ID
   */
  async getPaymentMethod(id: number): Promise<PaymentMethod> {
    const response = await apiWithTimeout.default.get(`/paymentmethods/${id}`);
    return response.data;
  },

  /**
   * Create a setup intent for adding a payment method
   * Returns a client secret to use with Stripe Elements
   */
  async createSetupIntent(): Promise<SetupIntent> {
    const response = await apiWithTimeout.default.post('/subscriptions/payment-methods/setup-intent', {}, {
      headers: {
        'Idempotency-Key': generateIdempotencyKey()
      }
    });
    return response.data;
  },

  /**
   * Add a new payment method (after collecting it with Stripe Elements)
   */
  async addPaymentMethod(request: AddPaymentMethodRequest): Promise<PaymentMethod> {
    // Transform the request to match backend API expectations
    const createRequest = {
      type: 'card',
      provider: 'stripe',
      externalId: request.paymentMethodId,
      setAsDefault: request.setAsDefault || false
    };
    const response = await apiWithTimeout.default.post('/paymentmethods', createRequest);
    return response.data;
  },

  /**
   * Update a payment method's billing information
   */
  async updatePaymentMethod(id: number, updates: Partial<PaymentMethod>): Promise<PaymentMethod> {
    const response = await apiWithTimeout.default.put(`/paymentmethods/${id}`, updates);
    return response.data;
  },

  /**
   * Set a payment method as default
   */
  async setDefaultPaymentMethod(paymentMethodId: number): Promise<PaymentMethod> {
    const response = await apiWithTimeout.default.post(
      `/paymentmethods/${paymentMethodId}/set-default`
    );
    return response.data;
  },

  /**
   * Remove a payment method
   */
  async removePaymentMethod(paymentMethodId: number): Promise<void> {
    await apiWithTimeout.default.delete(`/paymentmethods/${paymentMethodId}`);
  },

  // ============ TRANSACTIONS & BILLING ============

  /**
   * Get payment transaction history (Stripe payments, refunds, etc.)
   */
  async getTransactionHistory(pageSize: number = 20, page: number = 1): Promise<PaymentTransaction[]> {
    const response = await apiWithTimeout.default.get('/subscriptions/transactions', {
      params: { pageSize, page }
    });
    return response.data;
  },

  /**
   * Get subscription history (plan changes, upgrades, downgrades, cancellations)
   */
  async getSubscriptionHistory(): Promise<UserSubscription[]> {
    const response = await apiWithTimeout.default.get('/subscriptions/history');
    return response.data;
  },

  /**
   * Get upcoming invoice preview
   */
  async getUpcomingInvoice(): Promise<UpcomingInvoice | null> {
    try {
      const response = await apiWithTimeout.default.get('/subscriptions/upcoming-invoice');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // No upcoming invoice
      }
      throw error;
    }
  },

  // ============ FEATURE ACCESS ============

  /**
   * Check if user can access a specific feature
   */
  async checkFeatureAccess(featureCode: string): Promise<{ featureCode: string; hasAccess: boolean }> {
    const response = await apiWithTimeout.default.get(`/subscriptions/features/${featureCode}/access`);
    return response.data;
  },

  // ============ CHECKOUT SESSIONS ============

  /**
   * Create a Stripe Checkout Session for paid subscription plans
   * Returns a URL to redirect the user to Stripe's hosted payment page
   */
  async createCheckoutSession(
    planCode: string,
    billingInterval: 'monthly' | 'yearly',
    successUrl: string,
    cancelUrl: string
  ): Promise<{ sessionId: string; sessionUrl: string }> {
    const response = await apiWithTimeout.default.post('/subscriptions/checkout-session', {
      planCode,
      billingInterval,
      successUrl,
      cancelUrl
    });
    return response.data;
  }
};

export default subscriptionService;
