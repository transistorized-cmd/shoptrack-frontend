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
  // First check localStorage
  const storedLocale = localStorage.getItem("shoptrack-locale");
  if (
    storedLocale &&
    availableLocales.some((locale) => locale.code === storedLocale)
  ) {
    return storedLocale as LocaleCode;
  }

  // Then check browser language
  const browserLocale = navigator.language.split("-")[0];
  if (availableLocales.some((locale) => locale.code === browserLocale)) {
    return browserLocale as LocaleCode;
  }

  // Default to English
  return "en";
}

// Create i18n instance
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
  (i18n.global.locale as any).value = locale;
  localStorage.setItem("shoptrack-locale", locale);

  // Update document language attribute with browser-compatible language tag
  document.documentElement.lang = getLanguageTag(locale);
}

// Helper function to get current locale
export function getCurrentLocale(): LocaleCode {
  return (i18n.global.locale as any).value as LocaleCode;
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
