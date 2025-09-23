// Universal i18n utilities that work in both development and production
import type { LocaleCode } from '@/i18n';

// Import the appropriate implementation based on environment
let productionSafeI18n: any = null;
let regularI18n: any = null;

// Lazy load the appropriate module
async function loadI18nModule() {
  if (import.meta.env.PROD) {
    if (!productionSafeI18n) {
      productionSafeI18n = await import('@/i18n/productionSafe');
    }
    return productionSafeI18n;
  } else {
    if (!regularI18n) {
      regularI18n = await import('@/i18n');
    }
    return regularI18n;
  }
}

// Define available locales (consistent across environments)
export const availableLocales = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
] as const;

// Helper function to get locale display name
export function getLocaleName(code: LocaleCode): string {
  const locale = availableLocales.find((l) => l.code === code);
  return locale?.name ?? code;
}

// Helper function to get locale flag
export function getLocaleFlag(code: LocaleCode): string {
  const locale = availableLocales.find((l) => l.code === code);
  return locale?.flag ?? "🌐";
}

// Unified getCurrentLocale function - synchronous fallback
export function getCurrentLocale(): LocaleCode {
  try {
    // Try to get from localStorage first as a fallback
    const stored = localStorage.getItem('shoptrack-locale');
    if (stored && (stored === 'en' || stored === 'es')) {
      return stored as LocaleCode;
    }

    // Check browser language
    const browserLocale = navigator.language.split('-')[0];
    if (browserLocale === 'es') {
      return 'es';
    }

    return 'en';
  } catch (error) {
    console.warn('Failed to get current locale, falling back to "en":', error);
    return 'en';
  }
}

// Unified setLocale function
export async function setLocale(locale: LocaleCode): Promise<void> {
  try {
    const i18nModule = await loadI18nModule();
    i18nModule.setLocale(locale);
  } catch (error) {
    console.warn('Failed to set locale:', locale, error);
    // Fallback: at least save to localStorage
    try {
      localStorage.setItem('shoptrack-locale', locale);
    } catch (storageError) {
      console.warn('Failed to save locale to localStorage:', storageError);
    }
  }
}