import api from "@/services/api";
import type {
  SubscriptionPlan,
  UserSubscription,
  CreateUserSubscriptionRequest,
  UpdateUserSubscriptionRequest,
  FeatureUsage,
  SubscriptionStatus,
  PlanFeature,
} from "@/types/subscription";
import { generateIdempotencyKey } from "@/utils/idempotency";

class SubscriptionService {
  private sortFeatures(features: PlanFeature[] = []): PlanFeature[] {
    return [...features].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return a.featureName.localeCompare(b.featureName);
    });
  }

  private normalizePlan(plan: SubscriptionPlan): SubscriptionPlan {
    return {
      ...plan,
      features: this.sortFeatures(plan.features)
    };
  }

  private normalizeSubscription(subscription: UserSubscription | null): UserSubscription | null {
    if (!subscription) {
      return null;
    }

    if (subscription.plan) {
      return {
        ...subscription,
        plan: this.normalizePlan(subscription.plan)
      };
    }

    return subscription;
  }

  /**
   * Get all available subscription plans
   */
  async getAvailablePlans(): Promise<{
    plans: SubscriptionPlan[];
    detectedCurrency: string;
    detectionMethod: string;
    detectionSource: string | null;
    availableCurrencies: string[];
  }> {
    const response = await api.get("/subscriptions/plans");
    const data = response.data as {
      plans: SubscriptionPlan[];
      detectedCurrency: string;
      detectionMethod: string;
      detectionSource: string | null;
      availableCurrencies: string[];
    };

    return {
      plans: data.plans.map((plan) => this.normalizePlan(plan)),
      detectedCurrency: data.detectedCurrency,
      detectionMethod: data.detectionMethod,
      detectionSource: data.detectionSource,
      availableCurrencies: data.availableCurrencies
    };
  }

  /**
   * Get a specific subscription plan by ID
   */
  async getPlanById(planId: number): Promise<SubscriptionPlan> {
    const response = await api.get(`/subscriptions/plans/${planId}`);
    return this.normalizePlan(response.data as SubscriptionPlan);
  }

  /**
   * Get a specific subscription plan by code
   */
  async getPlanByCode(planCode: string): Promise<SubscriptionPlan> {
    const response = await api.get(`/subscriptions/plans/by-code/${planCode}`);
    return this.normalizePlan(response.data as SubscriptionPlan);
  }

  /**
   * Get current user's subscription
   */
  async getMySubscription(): Promise<UserSubscription | null> {
    try {
      const response = await api.get("/subscriptions/my-subscription");
      return this.normalizeSubscription(response.data as UserSubscription);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Subscribe to a plan (for new subscriptions)
   */
  async subscribe(
    subscriptionRequest: CreateUserSubscriptionRequest,
  ): Promise<{ success: boolean; subscription: UserSubscription | null; errorMessage?: string }> {
    const response = await api.post(
      "/subscriptions",
      subscriptionRequest,
    );
    const result = response.data;
    return {
      success: result.success,
      subscription: result.subscription ? this.normalizeSubscription(result.subscription) : null,
      errorMessage: result.errorMessage
    };
  }

  /**
   * Update existing subscription (change plan or billing interval)
   *
   * @param updateRequest - Subscription update details
   * @param idempotencyKey - Optional idempotency key (auto-generated if not provided)
   * @returns Success status, updated subscription, and optional error message
   *
   * @remarks
   * This is a CRITICAL endpoint that REQUIRES idempotency protection.
   * If no idempotency key is provided, one will be auto-generated.
   * The same key must be used for retries to prevent duplicate subscription updates.
   */
  async updateSubscription(
    updateRequest: UpdateUserSubscriptionRequest,
    idempotencyKey?: string
  ): Promise<{ success: boolean; subscription: UserSubscription | null; errorMessage?: string }> {
    console.log('UpdateSubscription request:', updateRequest);
    const key = idempotencyKey || generateIdempotencyKey();

    const response = await api.put(
      "/subscriptions",
      updateRequest,
      {
        headers: {
          'Idempotency-Key': key
        }
      }
    );
    console.log('UpdateSubscription response:', response.data);
    const result = response.data;
    return {
      success: result.success,
      subscription: result.subscription ? this.normalizeSubscription(result.subscription) : null,
      errorMessage: result.errorMessage
    };
  }

  /**
   * Check if user has access to a specific feature
   */
  async checkFeatureAccess(
    featureCode: string,
  ): Promise<{ featureCode: string; hasAccess: boolean }> {
    const response = await api.get(
      `/subscriptions/features/${featureCode}/access`,
    );
    return response.data;
  }

  /**
   * Get feature usage for current user
   */
  async getFeatureUsage(
    featureCode: string,
    period: string = "monthly",
  ): Promise<FeatureUsage> {
    const response = await api.get(
      `/subscriptions/features/${featureCode}/usage`,
      {
        params: { period },
      },
    );
    return response.data;
  }

  /**
   * Get subscription status for current user
   */
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    const response = await api.get("/subscriptions/status");
    return response.data;
  }

  /**
   * Cancel current user's subscription
   *
   * @param reason - Optional reason for cancellation
   * @param immediately - Whether to cancel immediately or at period end
   * @param idempotencyKey - Optional idempotency key (auto-generated if not provided)
   * @returns Success status and message
   *
   * @remarks
   * This is a CRITICAL endpoint that REQUIRES idempotency protection.
   * If no idempotency key is provided, one will be auto-generated.
   * The same key must be used for retries to prevent duplicate cancellation requests.
   */
  async cancelSubscription(
    reason?: string,
    immediately: boolean = false,
    idempotencyKey?: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const key = idempotencyKey || generateIdempotencyKey();

      const response = await api.post("/subscriptions/cancel", {
        reason: reason || "User requested cancellation",
        immediately
      }, {
        headers: {
          'Idempotency-Key': key
        }
      });
      return {
        success: true,
        message: response.data.message
      };
    } catch (error: any) {
      console.error("Failed to cancel subscription:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to cancel subscription. Please try again.",
      };
    }
  }

  /**
   * Change subscription plan
   */
  async changeSubscription(
    newPlanId: number,
    billingInterval: "monthly" | "yearly",
  ): Promise<UserSubscription> {
    const response = await api.post("/subscriptions/change", {
      newPlanId,
      billingInterval,
    });
    return this.normalizeSubscription(response.data as UserSubscription)!;
  }

  /**
   * Create a Stripe Checkout Session for paid subscription plans
   * Returns a URL to redirect the user to Stripe's hosted payment page
   *
   * @param planCode - The subscription plan code
   * @param billingInterval - Monthly or yearly billing
   * @param successUrl - URL to redirect to after successful payment
   * @param cancelUrl - URL to redirect to if payment is cancelled
   * @param idempotencyKey - Optional idempotency key (auto-generated if not provided)
   * @returns Checkout session details with redirect URL
   *
   * @remarks
   * This is a CRITICAL endpoint that REQUIRES idempotency protection.
   * If no idempotency key is provided, one will be auto-generated.
   * The same key must be used for retries to prevent duplicate checkout sessions.
   */
  async createCheckoutSession(
    planCode: string,
    billingInterval: 'monthly' | 'yearly',
    successUrl: string,
    cancelUrl: string,
    currency?: string,
    idempotencyKey?: string
  ): Promise<{ sessionId: string; sessionUrl: string }> {
    const key = idempotencyKey || generateIdempotencyKey();

    const response = await api.post('/subscriptions/checkout-session', {
      planCode,
      billingInterval,
      currency,
      successUrl,
      cancelUrl
    }, {
      headers: {
        'Idempotency-Key': key
      }
    });
    return response.data;
  }

  /**
   * Verify a Stripe Checkout Session after payment
   * This retrieves the checkout session status and subscription details
   *
   * @param sessionId - The Stripe checkout session ID from the redirect URL
   * @returns Verification result with subscription details if successful
   */
  async verifyCheckoutSession(sessionId: string): Promise<{
    success: boolean;
    status?: string;
    paymentStatus?: string;
    subscription?: UserSubscription | null;
    message?: string;
  }> {
    const response = await api.post(`/subscriptions/checkout-session/verify`, null, {
      params: { sessionId }
    });
    const result = response.data;
    return {
      success: result.success,
      status: result.status,
      paymentStatus: result.paymentStatus,
      subscription: result.subscription ? this.normalizeSubscription(result.subscription) : null,
      message: result.message
    };
  }
}

export const subscriptionService = new SubscriptionService();
