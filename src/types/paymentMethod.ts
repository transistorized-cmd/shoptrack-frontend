export interface PaymentMethod {
  id: number
  userId: number
  type: string // "card", "bank_account", "digital_wallet"
  provider: string // "stripe", "xendit", "paypal", "square"
  externalId?: string
  last4?: string
  brand?: string // "visa", "mastercard", etc.
  expiryMonth?: number
  expiryYear?: number
  holderName?: string
  billingAddress?: string
  billingCity?: string
  billingState?: string
  billingPostalCode?: string
  billingCountry?: string
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreatePaymentMethodRequest {
  type: string
  provider: string
  externalId: string // Token from payment provider
  holderName?: string
  billingAddress?: string
  billingCity?: string
  billingState?: string
  billingPostalCode?: string
  billingCountry?: string
  setAsDefault?: boolean
}

export interface UpdatePaymentMethodRequest {
  holderName?: string
  billingAddress?: string
  billingCity?: string
  billingState?: string
  billingPostalCode?: string
  billingCountry?: string
  isDefault?: boolean
  isActive?: boolean
}

export type PaymentMethodType = 'card' | 'bank_account' | 'digital_wallet'
export type PaymentProvider = 'stripe' | 'xendit' | 'paypal' | 'square'
