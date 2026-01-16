import { apiWithTimeout } from './api'

// Types for feature limit checking
export interface FeatureMessage {
  featureCode: string
  messageType: string
  languageCode: string
  title: string
  message: string
  actionText?: string
  actionUrl?: string
}

export interface FeatureLimitCheckResult {
  canUse: boolean
  isLimitReached: boolean
  usage: number
  limit?: number
  remaining: number
  message?: FeatureMessage
}

export interface FeatureServiceOptions {
  timeout?: number
  skipAutoLogout?: boolean
}

/**
 * Service for checking feature limits and retrieving feature messages
 */
export class FeatureService {
  /**
   * Check if user can use a specific feature
   * @param featureCode - The feature code to check (e.g., 'receipt_monthly_limit')
   * @param options - Request options
   */
  async checkFeatureLimit(
    featureCode: string,
    options: FeatureServiceOptions = {}
  ): Promise<FeatureLimitCheckResult> {
    try {
      const response = await apiWithTimeout.fast.get(
        `/features/limit/${featureCode}`,
        {
          timeout: options.timeout || 5000,
          headers: options.skipAutoLogout ? { 'X-Skip-Auth-Logout': 'true' } : {}
        }
      )

      return response.data
    } catch (error) {
      console.error(`Failed to check feature limit for ${featureCode}:`, error)
      throw error
    }
  }

  /**
   * Check receipt upload limit for the current user
   * @param options - Request options
   */
  async checkReceiptUploadLimit(
    options: FeatureServiceOptions = {}
  ): Promise<FeatureLimitCheckResult> {
    try {
      const response = await apiWithTimeout.fast.get(
        '/features/receipt-upload-limit',
        {
          timeout: options.timeout || 5000,
          headers: options.skipAutoLogout ? { 'X-Skip-Auth-Logout': 'true' } : {}
        }
      )

      return response.data
    } catch (error) {
      console.error('Failed to check receipt upload limit:', error)
      throw error
    }
  }

  /**
   * Get all feature messages for a specific feature
   * @param featureCode - The feature code
   * @param languageCode - Optional language code (defaults to user preference)
   * @param options - Request options
   */
  async getFeatureMessages(
    featureCode: string,
    languageCode?: string,
    options: FeatureServiceOptions = {}
  ): Promise<FeatureMessage[]> {
    try {
      const params = new URLSearchParams()
      if (languageCode) {
        params.append('languageCode', languageCode)
      }

      const response = await apiWithTimeout.fast.get(
        `/features/messages/${featureCode}${params.toString() ? `?${params.toString()}` : ''}`,
        {
          timeout: options.timeout || 5000,
          headers: options.skipAutoLogout ? { 'X-Skip-Auth-Logout': 'true' } : {}
        }
      )

      return response.data
    } catch (error) {
      console.error(`Failed to get feature messages for ${featureCode}:`, error)
      throw error
    }
  }

  /**
   * Get a specific feature message
   * @param featureCode - The feature code
   * @param messageType - The message type (e.g., 'limit_reached', 'limit_warning')
   * @param languageCode - Optional language code (defaults to user preference)
   * @param options - Request options
   */
  async getFeatureMessage(
    featureCode: string,
    messageType: string,
    languageCode?: string,
    options: FeatureServiceOptions = {}
  ): Promise<FeatureMessage | null> {
    try {
      const params = new URLSearchParams()
      if (languageCode) {
        params.append('languageCode', languageCode)
      }

      const response = await apiWithTimeout.fast.get(
        `/features/messages/${featureCode}/${messageType}${params.toString() ? `?${params.toString()}` : ''}`,
        {
          timeout: options.timeout || 5000,
          headers: options.skipAutoLogout ? { 'X-Skip-Auth-Logout': 'true' } : {}
        }
      )

      return response.data
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } }
        if (axiosError.response?.status === 404) {
          // Message not found is not an error - return null
          return null
        }
      }
      console.error(`Failed to get feature message for ${featureCode}/${messageType}:`, error)
      throw error
    }
  }
}

// Export singleton instance
export const featureService = new FeatureService()

// Export default for convenience
export default featureService