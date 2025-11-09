/**
 * Analytics Service
 *
 * Handles expense visibility score and analytics data fetching.
 */

import api from './api'
import type { ExpenseVisibilityScoreResponse } from '@/types/scoreNotification'

export class AnalyticsService {
  /**
   * Get the current Expense Visibility Score
   *
   * @param locale - Optional locale for localized feedback message (e.g., 'en', 'es')
   * @returns Promise with score data including localized feedback message
   */
  async getExpenseVisibilityScore(locale?: string): Promise<ExpenseVisibilityScoreResponse> {
    try {
      const params = locale ? { locale } : {}
      const response = await api.get<ExpenseVisibilityScoreResponse>(
        '/analytics/expense-visibility-score',
        { params }
      )
      return response.data
    } catch (error) {
      console.error('Failed to fetch Expense Visibility Score:', error)
      throw error
    }
  }
}

export const analyticsService = new AnalyticsService()
