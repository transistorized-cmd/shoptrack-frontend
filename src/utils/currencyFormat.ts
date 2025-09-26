import { CURRENCY_OPTIONS } from "@/types/settings";

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}

/**
 * Get currency information by currency code
 */
export function getCurrencyInfo(currencyCode: string): CurrencyInfo | null {
  const currency = CURRENCY_OPTIONS.find((c) => c.code === currencyCode);
  return currency
    ? { code: currency.code, name: currency.name, symbol: currency.symbol }
    : null;
}

/**
 * Check if a currency symbol is unique (not shared with other currencies)
 */
export function isUniqueCurrencySymbol(symbol: string): boolean {
  const symbolCounts = CURRENCY_OPTIONS.reduce(
    (counts, currency) => {
      counts[currency.symbol] = (counts[currency.symbol] || 0) + 1;
      return counts;
    },
    {} as Record<string, number>,
  );

  return symbolCounts[symbol] === 1;
}

/**
 * Format currency amount with smart display logic
 *
 * Rules:
 * 1. When receipt currency matches user's preferred currency: show only symbol
 * 2. When receipt currency differs from user's preferred currency:
 *    - For unique symbols (€, ¥, £, etc.): show only symbol
 *    - For $ symbol: add currency code at the end
 *
 * @param amount - The amount to format
 * @param receiptCurrency - The currency from the receipt (optional)
 * @param userPreferredCurrency - User's preferred currency from settings
 * @param options - Additional formatting options
 */
export function formatCurrency(
  amount: number,
  receiptCurrency?: string,
  userPreferredCurrency?: string,
  options: {
    decimals?: number;
    showZeroDecimals?: boolean;
  } = {},
): string {
  const { decimals = 2, showZeroDecimals = true } = options;

  // Default to user's preferred currency if receipt currency is not available
  const currencyCode = receiptCurrency || userPreferredCurrency || "USD";
  const currencyInfo = getCurrencyInfo(currencyCode);

  if (!currencyInfo) {
    // Fallback for unknown currencies
    return `${currencyCode} ${amount.toFixed(decimals)}`;
  }

  // Format the amount
  const formattedAmount =
    showZeroDecimals || amount % 1 !== 0
      ? amount.toFixed(decimals)
      : amount.toString();

  // If no receipt currency or it matches user preference, show only symbol
  if (!receiptCurrency || receiptCurrency === userPreferredCurrency) {
    return `${currencyInfo.symbol}${formattedAmount}`;
  }

  // Receipt currency differs from user preference
  const isSymbolUnique = isUniqueCurrencySymbol(currencyInfo.symbol);

  if (isSymbolUnique) {
    // For unique symbols (€, ¥, £, etc.), show only the symbol
    return `${currencyInfo.symbol}${formattedAmount}`;
  } else {
    // For shared symbols (mainly $), add the currency code
    return `${currencyInfo.symbol}${formattedAmount} ${currencyCode}`;
  }
}

/**
 * Get the display symbol for a currency
 * This is a simplified version that just returns the symbol
 */
export function getCurrencySymbol(currencyCode: string): string {
  const currencyInfo = getCurrencyInfo(currencyCode);
  return currencyInfo?.symbol || currencyCode;
}

/**
 * Format currency for display in lists or cards (shorter format)
 */
export function formatCurrencyCompact(
  amount: number,
  receiptCurrency?: string,
  userPreferredCurrency?: string,
): string {
  return formatCurrency(amount, receiptCurrency, userPreferredCurrency, {
    decimals: 2,
    showZeroDecimals: true,
  });
}

/**
 * Check if two currency codes represent the same currency
 */
export function isSameCurrency(
  currency1?: string,
  currency2?: string,
): boolean {
  if (!currency1 || !currency2) return false;
  return currency1.toUpperCase() === currency2.toUpperCase();
}
