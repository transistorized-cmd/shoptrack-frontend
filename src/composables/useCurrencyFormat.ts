import { computed } from "vue";
import { useSettingsStore } from "@/stores/settings";
import { formatCurrency, formatCurrencyCompact, getCurrencySymbol, getCurrencyInfo } from "@/utils/currencyFormat";

/**
 * Composable for currency formatting with user settings integration
 */
export function useCurrencyFormat() {
  const settingsStore = useSettingsStore();

  // Get user's preferred currency from settings
  const userCurrency = computed(() => settingsStore.userCurrency);

  /**
   * Format currency amount with smart display logic
   */
  const formatAmount = (
    amount: number,
    receiptCurrency?: string,
    options?: {
      decimals?: number;
      showZeroDecimals?: boolean;
    }
  ) => {
    return formatCurrency(amount, receiptCurrency, userCurrency.value, options);
  };

  /**
   * Format currency in compact form (for lists/cards)
   */
  const formatAmountCompact = (
    amount: number,
    receiptCurrency?: string
  ) => {
    return formatCurrencyCompact(amount, receiptCurrency, userCurrency.value);
  };

  /**
   * Get currency symbol for a given currency code
   */
  const getSymbol = (currencyCode: string) => {
    return getCurrencySymbol(currencyCode);
  };

  /**
   * Get full currency information
   */
  const getInfo = (currencyCode: string) => {
    return getCurrencyInfo(currencyCode);
  };

  /**
   * Check if the receipt currency matches the user's preferred currency
   */
  const isUserPreferredCurrency = (receiptCurrency?: string) => {
    if (!receiptCurrency) return true; // Default to user currency if not specified
    return receiptCurrency.toUpperCase() === userCurrency.value.toUpperCase();
  };

  return {
    userCurrency,
    formatAmount,
    formatAmountCompact,
    getSymbol,
    getInfo,
    isUserPreferredCurrency,
  };
}