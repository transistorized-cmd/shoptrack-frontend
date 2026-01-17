/**
 * Feature Flags Configuration
 *
 * Toggle features on/off without code changes.
 * Set to `true` to enable, `false` to disable.
 */

export const featureFlags = {
  /**
   * NFC Products feature - scan NFC tags to quickly add products
   * Currently disabled while in development
   */
  nfcProducts: false,

  /**
   * Shopping list predictions - AI-powered suggestions
   */
  shoppingPredictions: true,

  /**
   * Price trends and analytics
   */
  priceTrends: true,
} as const;

export type FeatureFlag = keyof typeof featureFlags;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag] ?? false;
}
