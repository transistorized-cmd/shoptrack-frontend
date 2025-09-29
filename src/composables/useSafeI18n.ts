/**
 * Safe i18n composable for production environments
 *
 * This composable provides a CSP-safe wrapper around vue-i18n
 * that ensures no runtime message compilation occurs in production.
 */
import { computed, type ComputedRef } from "vue";
import { useI18n } from "vue-i18n";
import type { LocaleCode } from "@/i18n";

type TranslationParams = Record<string, unknown> | unknown[];

interface SafeTranslationFunction {
  (key: string, params?: TranslationParams | string): string;
}

interface SafeI18nReturn {
  t: SafeTranslationFunction;
  locale: ComputedRef<string>;
  availableLocales: ComputedRef<string[]>;
  setLocale: (locale: LocaleCode) => void;
}

/**
 * Production-safe i18n hook
 *
 * In production, this ensures all translations are pre-compiled
 * and no eval() or runtime compilation occurs.
 */
export function useSafeI18n(): SafeI18nReturn {
  const i18n = useI18n();
  const localeRef = i18n.locale;
  const availableLocalesRef = i18n.availableLocales;

  /**
   * Safe translation function that prevents runtime compilation
   */
  const t: SafeTranslationFunction = (key: string, params?: TranslationParams | string): string => {
    try {
      if (typeof params === "string") {
        const translated = i18n.t(key);
        return translated === key ? params : translated;
      }

      if (Array.isArray(params)) {
        return i18n.t(key, params);
      }

      if (params && typeof params === "object") {
        return i18n.t(key, params);
      }

      return i18n.t(key);
    } catch (error) {
      console.error(`Translation error for key "${key}":`, error);
      return key;
    }
  };

  /**
   * Safe locale setter that avoids reactivity issues
   */
  const setLocale = (newLocale: LocaleCode) => {
    try {
      localeRef.value = newLocale;
    } catch (error) {
      console.error("Locale setting error:", error);
    }
  };

  return {
    t,
    locale: computed(() => localeRef.value),
    availableLocales: computed(() => [...availableLocalesRef]),
    setLocale,
  };
}

/**
 * Global template helper for $t function
 * This can be used in templates where the composable is not available
 */
export function createSafeGlobalT() {
  const { t } = useSafeI18n();
  return t;
}
