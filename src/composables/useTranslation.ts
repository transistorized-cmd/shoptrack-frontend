// Universal translation composable that works in both development and production

import { inject, computed, type ComputedRef } from 'vue';
import { useI18n } from 'vue-i18n';
import type { productionSafeI18n } from '@/i18n/productionSafe';

interface TranslationApi {
  t: (key: string, valuesOrDefault?: Record<string, any> | string) => string;
  locale: ComputedRef<string>;
  setLocale: (locale: string) => void;
}

export function useTranslation(): TranslationApi {
  if (import.meta.env.PROD) {
    // Production: Use injected production-safe i18n
    const i18n = inject<typeof productionSafeI18n>('i18n');

    if (!i18n) {
      console.error('[useTranslation] Production i18n not found in injection');
      // Fallback implementation
      return {
        t: (key: string, valuesOrDefault?: Record<string, any> | string) => {
          if (typeof valuesOrDefault === 'string') {
            return valuesOrDefault; // Return fallback string
          }
          return key; // Return key as fallback
        },
        locale: computed(() => 'en'),
        setLocale: () => {}
      };
    }

    return {
      t: (key: string, valuesOrDefault?: Record<string, any> | string) => {
        if (typeof valuesOrDefault === 'string') {
          // Second parameter is a fallback string
          const result = i18n.t(key);
          return result === key ? valuesOrDefault : result;
        } else {
          // Second parameter is interpolation values
          return i18n.t(key, valuesOrDefault);
        }
      },
      locale: computed(() => i18n.localeRef.value),
      setLocale: (locale: string) => i18n.setLocale(locale as 'en' | 'es')
    };
  } else {
    // Development: Use vue-i18n
    try {
      const { t, locale } = useI18n();
      return {
        t: (key: string, valuesOrDefault?: Record<string, any> | string) => {
          if (typeof valuesOrDefault === 'string') {
            // Second parameter is a fallback string - vue-i18n supports this
            try {
              return t(key, valuesOrDefault);
            } catch (error) {
              console.warn('[useTranslation] Translation failed, using fallback:', key, error);
              return valuesOrDefault;
            }
          } else {
            // Second parameter is interpolation values
            try {
              return t(key, valuesOrDefault || {});
            } catch (error) {
              console.warn('[useTranslation] Translation failed, using key:', key, error);
              return key;
            }
          }
        },
        locale: computed(() => locale.value),
        setLocale: (newLocale: string) => {
          locale.value = newLocale as any;
        }
      };
    } catch (error) {
      console.error('[useTranslation] Failed to use vue-i18n:', error);
      // Fallback
      return {
        t: (key: string, valuesOrDefault?: Record<string, any> | string) => {
          if (typeof valuesOrDefault === 'string') {
            return valuesOrDefault; // Return fallback string
          }
          return key; // Return key as fallback
        },
        locale: computed(() => 'en'),
        setLocale: () => {}
      };
    }
  }
}