export interface SubscriptionPlan {
  id: number;
  name: string;
  code: string;
  description?: string;
  setupFee?: number;
  isActive: boolean;
  isPublic: boolean;
  allowTrial: boolean;
  trialDays: number;
  sortOrder: number;
  currency: string;
  features: PlanFeature[];
  prices: PlanPricing[]; // Changed from Dictionary to List
  availableCurrencies?: string[];
  createdAt: string;
  updatedAt: string;
}

// Public plan type for registration (matches backend PublicPlanDto)
export interface PublicPlan {
  id: number;
  code: string;
  name: string;
  description?: string;
  isFree: boolean;
  allowTrial: boolean;
  trialDays: number;
  features: PlanFeature[];
  pricing: PlanPricing[];
  sortOrder: number;
}

export interface PlanPricing {
  currency: string;
  price: number;
  periodType: 'Monthly' | 'Yearly' | 'Quarterly' | 'Biannual' | number; // Backend may send enum number or string
  stripePriceId?: string;
  isActive: boolean;
}

// Enum mapping for backend period types
// Backend sends: 1 = Monthly, 2 = Yearly, 3 = Quarterly, 4 = Biannual
export const PeriodTypeMap: Record<number, 'Monthly' | 'Yearly' | 'Quarterly' | 'Biannual'> = {
  1: 'Monthly',
  2: 'Yearly',
  3: 'Quarterly',
  4: 'Biannual'
};

// Helper to normalize period type from backend
export function normalizePeriodType(periodType: 'Monthly' | 'Yearly' | 'Quarterly' | 'Biannual' | number): 'Monthly' | 'Yearly' | 'Quarterly' | 'Biannual' {
  if (typeof periodType === 'number') {
    return PeriodTypeMap[periodType] || 'Monthly';
  }
  return periodType;
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
  isIncluded: boolean; // Backend-calculated property indicating if feature is included in plan
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

// Helper functions to work with new pricing structure
export function getPriceForPeriod(prices: PlanPricing[], currency: string, periodType: 'Monthly' | 'Yearly' | 'Quarterly' | 'Biannual'): number {
  const price = prices.find(p => p.currency === currency && normalizePeriodType(p.periodType) === periodType);
  return price?.price ?? 0;
}

export function getMonthlyPrice(prices: PlanPricing[], currency: string = 'USD'): number {
  return getPriceForPeriod(prices, currency, 'Monthly');
}

export function getYearlyPrice(prices: PlanPricing[], currency: string = 'USD'): number {
  return getPriceForPeriod(prices, currency, 'Yearly');
}

export function getAvailableCurrencies(prices: PlanPricing[]): string[] {
  return [...new Set(prices.map(p => p.currency))];
}

/**
 * Get all unique period types available across all pricing entries
 * Returns periods dynamically from the data (e.g., ['Monthly', 'Yearly', 'Quarterly'])
 */
export function getAvailablePeriods(prices: PlanPricing[]): Array<'Monthly' | 'Yearly' | 'Quarterly' | 'Biannual'> {
  // Normalize all period types from numbers to strings
  const periods = [...new Set(prices.map(p => normalizePeriodType(p.periodType)))];
  // Sort by typical duration: Monthly, Quarterly, Biannual, Yearly
  const order: Record<string, number> = { Monthly: 1, Quarterly: 2, Biannual: 3, Yearly: 4 };
  return periods.sort((a, b) => (order[a] || 999) - (order[b] || 999)) as Array<'Monthly' | 'Yearly' | 'Quarterly' | 'Biannual'>;
}

/**
 * Calculate savings percentage for a period compared to monthly pricing
 * Returns the percentage saved (e.g., 20 for 20% savings)
 */
export function calculateSavings(
  prices: PlanPricing[],
  currency: string,
  periodType: 'Yearly' | 'Quarterly' | 'Biannual',
  basePeriod: 'Monthly' = 'Monthly'
): number {
  const basePrice = getPriceForPeriod(prices, currency, basePeriod);
  const periodPrice = getPriceForPeriod(prices, currency, periodType);

  if (basePrice === 0 || periodPrice === 0) return 0;

  // Calculate what the period would cost if charged monthly
  const periodMultipliers: Record<string, number> = {
    Monthly: 1,
    Quarterly: 3,
    Biannual: 6,
    Yearly: 12
  };

  const expectedCost = basePrice * periodMultipliers[periodType];
  const actualCost = periodPrice;

  if (expectedCost === 0) return 0;

  const savings = ((expectedCost - actualCost) / expectedCost) * 100;
  return Math.round(savings);
}
