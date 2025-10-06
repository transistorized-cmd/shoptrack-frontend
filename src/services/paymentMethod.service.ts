import api from './api'
import type {
  PaymentMethod,
  CreatePaymentMethodRequest,
  UpdatePaymentMethodRequest
} from '@/types/paymentMethod'

export const paymentMethodService = {
  /**
   * Get all payment methods for the current user
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const response = await api.get<PaymentMethod[]>('/api/paymentmethods')
    return response.data
  },

  /**
   * Get a specific payment method by ID
   */
  async getPaymentMethod(id: number): Promise<PaymentMethod> {
    const response = await api.get<PaymentMethod>(`/api/paymentmethods/${id}`)
    return response.data
  },

  /**
   * Add a new payment method
   */
  async createPaymentMethod(data: CreatePaymentMethodRequest): Promise<PaymentMethod> {
    const response = await api.post<PaymentMethod>('/api/paymentmethods', data)
    return response.data
  },

  /**
   * Update a payment method's billing information
   */
  async updatePaymentMethod(
    id: number,
    data: UpdatePaymentMethodRequest
  ): Promise<PaymentMethod> {
    const response = await api.put<PaymentMethod>(`/api/paymentmethods/${id}`, data)
    return response.data
  },

  /**
   * Set a payment method as the default (favorite)
   */
  async setDefaultPaymentMethod(id: number): Promise<PaymentMethod> {
    const response = await api.post<PaymentMethod>(`/api/paymentmethods/${id}/set-default`)
    return response.data
  },

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(id: number): Promise<void> {
    await api.delete(`/api/paymentmethods/${id}`)
  }
}
