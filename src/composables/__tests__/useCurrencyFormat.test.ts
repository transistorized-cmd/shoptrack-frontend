import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCurrencyFormat } from '../useCurrencyFormat';
import { useSettingsStore } from '@/stores/settings';
import { createPinia, setActivePinia } from 'pinia';

// Mock the settings store
vi.mock('@/stores/settings', () => ({
  useSettingsStore: vi.fn()
}));

describe('useCurrencyFormat', () => {
  let mockSettingsStore: any;

  beforeEach(() => {
    setActivePinia(createPinia());

    mockSettingsStore = {
      userCurrency: 'USD'
    };

    vi.mocked(useSettingsStore).mockReturnValue(mockSettingsStore);
  });

  describe('formatAmount', () => {
    it('should format amount using user currency from store', () => {
      const { formatAmount } = useCurrencyFormat();

      expect(formatAmount(20.00, 'USD')).toBe('$20.00');
    });

    it('should format amount with different receipt currency', () => {
      const { formatAmount } = useCurrencyFormat();

      expect(formatAmount(20.00, 'EUR')).toBe('€20.00');
    });

    it('should pass through formatting options', () => {
      const { formatAmount } = useCurrencyFormat();

      expect(formatAmount(20, 'USD', { showZeroDecimals: false })).toBe('$20');
    });
  });

  describe('formatAmountCompact', () => {
    it('should format amount in compact form', () => {
      const { formatAmountCompact } = useCurrencyFormat();

      expect(formatAmountCompact(20.00, 'USD')).toBe('$20.00');
      expect(formatAmountCompact(20.00, 'EUR')).toBe('€20.00');
    });
  });

  describe('getSymbol', () => {
    it('should return currency symbol', () => {
      const { getSymbol } = useCurrencyFormat();

      expect(getSymbol('USD')).toBe('$');
      expect(getSymbol('EUR')).toBe('€');
      expect(getSymbol('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('getInfo', () => {
    it('should return currency info', () => {
      const { getInfo } = useCurrencyFormat();

      const usdInfo = getInfo('USD');
      expect(usdInfo).toEqual({
        code: 'USD',
        name: 'US Dollar',
        symbol: '$'
      });
    });
  });

  describe('isUserPreferredCurrency', () => {
    it('should return true when receipt currency matches user preference', () => {
      mockSettingsStore.userCurrency = 'USD';
      const { isUserPreferredCurrency } = useCurrencyFormat();

      expect(isUserPreferredCurrency('USD')).toBe(true);
      expect(isUserPreferredCurrency('usd')).toBe(true);
    });

    it('should return false when receipt currency differs from user preference', () => {
      mockSettingsStore.userCurrency = 'USD';
      const { isUserPreferredCurrency } = useCurrencyFormat();

      expect(isUserPreferredCurrency('EUR')).toBe(false);
    });

    it('should return true when no receipt currency provided', () => {
      const { isUserPreferredCurrency } = useCurrencyFormat();

      expect(isUserPreferredCurrency()).toBe(true);
      expect(isUserPreferredCurrency(undefined)).toBe(true);
    });
  });

  describe('userCurrency computed', () => {
    it('should return user currency from store', () => {
      mockSettingsStore.userCurrency = 'EUR';
      const { userCurrency } = useCurrencyFormat();

      expect(userCurrency.value).toBe('EUR');
    });
  });

  describe('integration with different user currencies', () => {
    it('should work with EUR as user preference', () => {
      mockSettingsStore.userCurrency = 'EUR';
      const { formatAmount, isUserPreferredCurrency } = useCurrencyFormat();

      expect(formatAmount(20.00, 'USD')).toBe('$20.00 USD');
      expect(formatAmount(20.00, 'EUR')).toBe('€20.00');
      expect(isUserPreferredCurrency('EUR')).toBe(true);
      expect(isUserPreferredCurrency('USD')).toBe(false);
    });

    it('should work with JPY as user preference', () => {
      mockSettingsStore.userCurrency = 'JPY';
      const { formatAmount, isUserPreferredCurrency } = useCurrencyFormat();

      expect(formatAmount(2000, 'USD')).toBe('$2000.00 USD');
      expect(formatAmount(2000, 'JPY')).toBe('¥2000.00');
      expect(isUserPreferredCurrency('JPY')).toBe(true);
      expect(isUserPreferredCurrency('USD')).toBe(false);
    });
  });
});