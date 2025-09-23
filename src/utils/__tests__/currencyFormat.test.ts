import { describe, it, expect } from 'vitest';
import {
  getCurrencyInfo,
  isUniqueCurrencySymbol,
  formatCurrency,
  getCurrencySymbol,
  formatCurrencyCompact,
  isSameCurrency,
} from '../currencyFormat';

describe('currencyFormat', () => {
  describe('getCurrencyInfo', () => {
    it('should return currency info for valid currency codes', () => {
      const usdInfo = getCurrencyInfo('USD');
      expect(usdInfo).toEqual({
        code: 'USD',
        name: 'US Dollar',
        symbol: '$'
      });

      const eurInfo = getCurrencyInfo('EUR');
      expect(eurInfo).toEqual({
        code: 'EUR',
        name: 'Euro',
        symbol: '€'
      });
    });

    it('should return null for invalid currency codes', () => {
      expect(getCurrencyInfo('INVALID')).toBeNull();
      expect(getCurrencyInfo('')).toBeNull();
    });
  });

  describe('isUniqueCurrencySymbol', () => {
    it('should return true for unique symbols', () => {
      expect(isUniqueCurrencySymbol('€')).toBe(true);
      expect(isUniqueCurrencySymbol('£')).toBe(true);
      expect(isUniqueCurrencySymbol('₹')).toBe(true);
    });

    it('should return false for shared symbols', () => {
      expect(isUniqueCurrencySymbol('$')).toBe(false); // USD, CAD, AUD, MXN
      expect(isUniqueCurrencySymbol('¥')).toBe(false); // JPY, CNY
    });
  });

  describe('formatCurrency', () => {
    describe('when receipt currency matches user preference', () => {
      it('should show only symbol for USD', () => {
        expect(formatCurrency(20.00, 'USD', 'USD')).toBe('$20.00');
      });

      it('should show only symbol for EUR', () => {
        expect(formatCurrency(20.00, 'EUR', 'EUR')).toBe('€20.00');
      });

      it('should show only symbol when no receipt currency provided', () => {
        expect(formatCurrency(20.00, undefined, 'EUR')).toBe('€20.00');
      });
    });

    describe('when receipt currency differs from user preference', () => {
      it('should show only symbol for unique symbols', () => {
        expect(formatCurrency(20.00, 'EUR', 'USD')).toBe('€20.00');
        expect(formatCurrency(20.00, 'GBP', 'USD')).toBe('£20.00');
        expect(formatCurrency(20.00, 'INR', 'USD')).toBe('₹20.00');
      });

      it('should add currency code for USD when user preference is different', () => {
        expect(formatCurrency(20.00, 'USD', 'EUR')).toBe('$20.00 USD');
      });

      it('should add currency code for MXN when user preference is different', () => {
        expect(formatCurrency(20.00, 'MXN', 'EUR')).toBe('$20.00 MXN');
      });

      it('should add currency code for shared ¥ symbol', () => {
        expect(formatCurrency(20.00, 'JPY', 'USD')).toBe('¥20.00 JPY');
        expect(formatCurrency(20.00, 'CNY', 'USD')).toBe('¥20.00 CNY');
      });
    });

    describe('formatting options', () => {
      it('should respect decimal places option', () => {
        expect(formatCurrency(20.123, 'USD', 'USD', { decimals: 0 })).toBe('$20');
        expect(formatCurrency(20.123, 'USD', 'USD', { decimals: 3 })).toBe('$20.123');
      });

      it('should handle showZeroDecimals option', () => {
        expect(formatCurrency(20, 'USD', 'USD', { showZeroDecimals: false })).toBe('$20');
        expect(formatCurrency(20, 'USD', 'USD', { showZeroDecimals: true })).toBe('$20.00');
        expect(formatCurrency(20.5, 'USD', 'USD', { showZeroDecimals: false })).toBe('$20.50');
      });
    });

    describe('fallback for unknown currencies', () => {
      it('should handle unknown currency codes', () => {
        expect(formatCurrency(20.00, 'XYZ', 'USD')).toBe('XYZ 20.00');
      });
    });

    describe('edge cases', () => {
      it('should handle zero amounts', () => {
        expect(formatCurrency(0, 'USD', 'USD')).toBe('$0.00');
      });

      it('should handle negative amounts', () => {
        expect(formatCurrency(-20.00, 'USD', 'USD')).toBe('$-20.00');
      });

      it('should handle large amounts', () => {
        expect(formatCurrency(1234567.89, 'USD', 'USD')).toBe('$1234567.89');
      });

      it('should handle very small amounts', () => {
        expect(formatCurrency(0.01, 'USD', 'USD')).toBe('$0.01');
      });
    });
  });

  describe('getCurrencySymbol', () => {
    it('should return symbol for valid currencies', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
      expect(getCurrencySymbol('EUR')).toBe('€');
      expect(getCurrencySymbol('GBP')).toBe('£');
    });

    it('should return currency code for unknown currencies', () => {
      expect(getCurrencySymbol('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('formatCurrencyCompact', () => {
    it('should use default compact formatting', () => {
      expect(formatCurrencyCompact(20.00, 'USD', 'EUR')).toBe('$20.00 USD');
      expect(formatCurrencyCompact(20.00, 'EUR', 'USD')).toBe('€20.00');
      expect(formatCurrencyCompact(20.00, 'USD', 'USD')).toBe('$20.00');
    });
  });

  describe('isSameCurrency', () => {
    it('should return true for same currencies', () => {
      expect(isSameCurrency('USD', 'USD')).toBe(true);
      expect(isSameCurrency('usd', 'USD')).toBe(true);
      expect(isSameCurrency('EUR', 'eur')).toBe(true);
    });

    it('should return false for different currencies', () => {
      expect(isSameCurrency('USD', 'EUR')).toBe(false);
      expect(isSameCurrency('USD', 'GBP')).toBe(false);
    });

    it('should return false for undefined currencies', () => {
      expect(isSameCurrency(undefined, 'USD')).toBe(false);
      expect(isSameCurrency('USD', undefined)).toBe(false);
      expect(isSameCurrency(undefined, undefined)).toBe(false);
    });
  });

  describe('real-world examples from requirements', () => {
    it('should match the examples from requirements', () => {
      // User preference: EUR, Receipt: EUR → €20.00
      expect(formatCurrency(20.00, 'EUR', 'EUR')).toBe('€20.00');

      // User preference: EUR, Receipt: USD → $20.00 USD
      expect(formatCurrency(20.00, 'USD', 'EUR')).toBe('$20.00 USD');

      // User preference: EUR, Receipt: MXN → $20.00 MXN
      expect(formatCurrency(20.00, 'MXN', 'EUR')).toBe('$20.00 MXN');

      // User preference: USD, Receipt: USD → $20.00
      expect(formatCurrency(20.00, 'USD', 'USD')).toBe('$20.00');

      // User preference: USD, Receipt: EUR → €20.00
      expect(formatCurrency(20.00, 'EUR', 'USD')).toBe('€20.00');

      // User preference: USD, Receipt: MXN → $20.00 MXN
      expect(formatCurrency(20.00, 'MXN', 'USD')).toBe('$20.00 MXN');
    });

    it('should handle additional scenarios', () => {
      // User preference: USD, Receipt: JPY → ¥20.00 JPY (shared symbol)
      expect(formatCurrency(20.00, 'JPY', 'USD')).toBe('¥20.00 JPY');

      // User preference: EUR, Receipt: GBP → £20.00 (unique symbol)
      expect(formatCurrency(20.00, 'GBP', 'EUR')).toBe('£20.00');

      // User preference: USD, Receipt: INR → ₹20.00 (unique symbol)
      expect(formatCurrency(20.00, 'INR', 'USD')).toBe('₹20.00');
    });
  });
});