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
  planCode: string; // Plan code like "free", "basic", "premium", "enterprise"
  billingInterval: "monthly" | "yearly";
  paymentMethodId?: string; // Stripe payment method ID (optional if customer has default)
}

export interface UpdateUserSubscriptionRequest {
  newPlanCode?: string;
  newBillingInterval?: "monthly" | "yearly";
  cancelAtPeriodEnd?: boolean;
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

export interface PaymentMethod {
  id: number;
  userId: number;
  type: string;
  provider: string;
  externalId?: string;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  holderName?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SetupIntent {
  clientSecret: string;
  setupIntentId: string;
}

export interface SubscriptionCreateResult {
  success: boolean;
  subscription?: UserSubscription;
  clientSecret?: string; // For 3D Secure if needed
  errorMessage?: string;
}

export interface SubscriptionUpdateResult {
  success: boolean;
  subscription?: UserSubscription;
  errorMessage?: string;
}

export interface CancelSubscriptionRequest {
  immediately?: boolean;
  reason?: string;
}

export interface AddPaymentMethodRequest {
  paymentMethodId: string; // From Stripe Elements
  setAsDefault?: boolean; // Set as default payment method
}

export interface UpcomingInvoice {
  amount: number;
  currency: string;
  periodStart?: string;
  periodEnd?: string;
  lineItems: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  description: string;
  amount: number;
  quantity: number;
}

export interface PaymentTransaction {
  id: number;
  userId: number;
  userSubscriptionId?: number;
  type: 'payment' | 'refund' | 'chargeback' | 'setup';
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  amount: number;
  currency: string;
  description?: string;
  provider: string;
  externalTransactionId?: string;
  processedAt?: string;
  failedAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}
