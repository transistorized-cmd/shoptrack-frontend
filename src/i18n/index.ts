import { createI18n } from "vue-i18n";
import type { I18nOptions } from "vue-i18n";

// Import translation files
import en from "./locales/en.json";
import es from "./locales/es.json";

// Define available locales
export const availableLocales = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
] as const;

export type LocaleCode = (typeof availableLocales)[number]["code"];

// Get default locale from localStorage or browser preference
function getDefaultLocale(): LocaleCode {
  try {
    // First check localStorage (if available)
    if (typeof localStorage !== 'undefined') {
      const storedLocale = localStorage.getItem("shoptrack-locale");
      if (
        storedLocale &&
        availableLocales.some((locale) => locale.code === storedLocale)
      ) {
        return storedLocale as LocaleCode;
      }
    }

    // Then check browser language (if available)
    if (typeof navigator !== 'undefined' && navigator.language) {
      const browserLocale = navigator.language.split("-")[0];
      if (availableLocales.some((locale) => locale.code === browserLocale)) {
        return browserLocale as LocaleCode;
      }
    }
  } catch (error) {
    console.warn('Error detecting locale:', error);
  }

  // Default to English
  return "en";
}

// Create i18n instance with production-safe configuration
const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: getDefaultLocale(),
  fallbackLocale: "en",
  messages: {
    en,
    es,
  },
  globalInjection: true, // Enable global $t
  warnHtmlMessage: false, // Disable HTML message warnings for now
  // Add production-specific options
  silentTranslationWarn: import.meta.env.PROD, // Silence warnings in production
  silentFallbackWarn: import.meta.env.PROD, // Silence fallback warnings in production
  missingWarn: !import.meta.env.PROD, // Only warn about missing keys in development
  fallbackWarn: !import.meta.env.PROD, // Only warn about fallbacks in development
  // Critical: Force pre-compiled messages in production
  allowComposition: true, // Allow composition API
  inheritLocale: true, // Inherit locale from parent
  sync: true, // Sync locale changes
  // Explicitly disable runtime compilation features that require eval()
  modifiers: {}, // No custom modifiers to avoid eval
  pluralRules: {}, // No custom plural rules to avoid eval
  datetimeFormats: {}, // No datetime formats to avoid runtime compilation
  numberFormats: {}, // No number formats to avoid runtime compilation
  // Production safety: ensure messages are pre-compiled strings only
  ...(import.meta.env.PROD ? {} : {
    messageResolver: undefined,
    postTranslation: undefined,
  }),
} as I18nOptions);

// Helper function to map locale codes to browser-compatible language tags
function getLanguageTag(locale: LocaleCode): string {
  const languageMap: Record<LocaleCode, string> = {
    en: "en-US",
    es: "es-ES",
  };
  return languageMap[locale] || "en-US";
}

// Set initial document language attribute
const initialLocale = getDefaultLocale();
if (typeof document !== "undefined") {
  document.documentElement.lang = getLanguageTag(initialLocale);
}

export default i18n;

// Helper function to change locale
export function setLocale(locale: LocaleCode) {
  // Use proper typing for locale assignment
  const composerLocale = i18n.global.locale as unknown;

  if (typeof composerLocale === "string") {
    (i18n.global as any).locale = locale;
  } else if (
    composerLocale &&
    typeof composerLocale === "object" &&
    "value" in composerLocale
  ) {
    (composerLocale as { value: string }).value = locale;
  }

  // Persist locale choice
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("shoptrack-locale", locale);
  }

  // Update document language attribute with browser-compatible language tag
  if (typeof document !== "undefined") {
    document.documentElement.lang = getLanguageTag(locale);
  }
}

// Helper function to get current locale
export function getCurrentLocale(): LocaleCode {
  // Use proper typing for locale access
  const composerLocale = i18n.global.locale as unknown;

  if (typeof composerLocale === "string") {
    return composerLocale as LocaleCode;
  }

  if (
    composerLocale &&
    typeof composerLocale === "object" &&
    "value" in composerLocale
  ) {
    return (composerLocale as { value: string }).value as LocaleCode;
  }

  return "en";
}

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
