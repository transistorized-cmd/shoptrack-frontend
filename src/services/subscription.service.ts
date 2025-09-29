import api from "@/services/api";
import type {
  SubscriptionPlan,
  UserSubscription,
  CreateUserSubscriptionRequest,
  FeatureUsage,
  SubscriptionStatus,
  PlanFeature,
} from "@/types/subscription";

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
  async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    const response = await api.get("/subscriptions/plans");
    return (response.data as SubscriptionPlan[]).map((plan) => this.normalizePlan(plan));
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
   * Subscribe to a plan
   */
  async subscribe(
    subscriptionRequest: CreateUserSubscriptionRequest,
  ): Promise<UserSubscription> {
    const response = await api.post(
      "/subscriptions/subscribe",
      subscriptionRequest,
    );
    return this.normalizeSubscription(response.data as UserSubscription)!;
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
   */
  async cancelSubscription(
    reason?: string,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await api.post("/subscriptions/cancel", { reason });
      return response.data;
    } catch (error: any) {
      // For now, return a mock response since the cancel endpoint isn't implemented yet
      console.warn("Cancel subscription endpoint not implemented yet:", error);
      return {
        success: false,
        message:
          "Subscription cancellation is not available yet. Please contact support.",
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
}

export const subscriptionService = new SubscriptionService();
