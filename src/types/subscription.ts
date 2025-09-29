export interface SubscriptionPlan {
  id: number;
  name: string;
  code: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  setupFee?: number;
  isActive: boolean;
  isPublic: boolean;
  allowTrial: boolean;
  trialDays: number;
  sortOrder: number;
  currency: string;
  features: PlanFeature[];
  createdAt: string;
  updatedAt: string;
}

export interface PlanFeature {
  id: number;
  subscriptionPlanId: number;
  subscriptionFeatureId: number;
  limitValue?: number;
  booleanValue?: boolean;
  textValue?: string;
  isActive: boolean;
  featureCode: string;
  featureName: string;
  featureDescription?: string;
  featureType: "limit" | "boolean" | "access";
  unitType?: string;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserSubscription {
  id: number;
  userId: number;
  subscriptionPlanId: number;
  status: "active" | "cancelled" | "expired" | "trial" | "past_due";
  billingInterval: "monthly" | "yearly";
  amount: number;
  currency: string;
  startDate: string;
  endDate?: string;
  nextBillingDate?: string;
  trialStartDate?: string;
  trialEndDate?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  externalSubscriptionId?: string;
  paymentProvider?: string;
  plan?: SubscriptionPlan;
  planCode?: string;
  isActive?: boolean;
  userEmail: string;
  userName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserSubscriptionRequest {
  subscriptionPlanId: number;
  billingInterval: "monthly" | "yearly";
  paymentMethodId?: number;
  startTrial?: boolean;
  promoCode?: string;
}

export interface FeatureUsage {
  featureCode: string;
  period: string;
  usage: number;
  limit?: number;
  canUse: boolean;
}

export interface SubscriptionStatus {
  status: string;
  isActive: boolean;
}
