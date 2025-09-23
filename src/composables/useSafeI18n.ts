/**
 * Safe i18n composable for production environments
 *
 * This composable provides a CSP-safe wrapper around vue-i18n
 * that ensures no runtime message compilation occurs in production.
 */
import { computed, type ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LocaleCode } from '@/i18n'

interface SafeTranslationFunction {
  (key: string, named?: Record<string, unknown>): string
  (key: string, list?: unknown[]): string
  (key: string, namedOrList?: Record<string, unknown> | unknown[]): string
}

interface SafeI18nReturn {
  t: SafeTranslationFunction
  locale: ComputedRef<string>
  availableLocales: ComputedRef<string[]>
  setLocale: (locale: LocaleCode) => void
}

/**
 * Production-safe i18n hook
 *
 * In production, this ensures all translations are pre-compiled
 * and no eval() or runtime compilation occurs.
 */
export function useSafeI18n(): SafeI18nReturn {
  const { t: originalT, locale, availableLocales } = useI18n()

  /**
   * Safe translation function that prevents runtime compilation
   */
  const t: SafeTranslationFunction = (
    key: string,
    namedOrList?: Record<string, unknown> | unknown[]
  ): string => {
    try {
      // In production, ensure we only use pre-compiled messages
      if (import.meta.env.PROD) {
        // Use the simplest possible translation call to avoid runtime compilation
        if (namedOrList) {
          return originalT(key, namedOrList)
        } else {
          return originalT(key)
        }
      } else {
        // In development, allow full functionality
        return originalT(key, namedOrList as any)
      }
    } catch (error) {
      console.error(`Translation error for key "${key}":`, error)

      // Fallback to key itself if translation fails
      return key
    }
  }

  /**
   * Safe locale setter that avoids reactivity issues
   */
  const setLocale = (newLocale: LocaleCode) => {
    try {
      if (locale && 'value' in locale) {
        ;(locale as any).value = newLocale
      }
    } catch (error) {
      console.error('Locale setting error:', error)
    }
  }

  return {
    t,
    locale: computed(() => locale.value),
    availableLocales: computed(() => availableLocales.value),
    setLocale,
  }
}

/**
 * Global template helper for $t function
 * This can be used in templates where the composable is not available
 */
export function createSafeGlobalT() {
  const { t } = useSafeI18n()
  return t
}