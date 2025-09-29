// Production-safe i18n implementation that completely avoids runtime compilation
// This replaces vue-i18n in production builds to eliminate CSP violations

console.log("=== IMMEDIATE DEBUG: productionSafe.ts loading ===");

import { ref, computed, watch } from "vue";
import en from "./locales/en.json";
import es from "./locales/es.json";
import type { LocaleCode } from "./index";

// Pre-compiled message functions - completely static, no eval() needed
const messages = {
  en,
  es,
} as const;

// Debug logging for production
console.info("[i18n] Production-safe i18n module loading...");
console.info(
  "[i18n] English messages available:",
  !!en && Object.keys(en).length > 0,
);
console.info(
  "[i18n] Spanish messages available:",
  !!es && Object.keys(es).length > 0,
);
console.info("[i18n] Sample en.common.loading:", en?.common?.loading);
console.info("[i18n] Sample es.common.loading:", es?.common?.loading);
console.info("[i18n] en.common structure:", en?.common);
console.info("[i18n] Type of en.common.loading:", typeof en?.common?.loading);

// Reactive locale state using Vue's reactivity system
const currentLocale = ref<LocaleCode>("en");

// Initialize from localStorage and browser preference
function initializeLocale(): LocaleCode {
  try {
    if (typeof localStorage !== "undefined" && localStorage) {
      const stored = localStorage.getItem("shoptrack-locale");
      if (stored && (stored === "en" || stored === "es")) {
        currentLocale.value = stored as LocaleCode;
        console.info(
          "[i18n] Loaded locale from localStorage:",
          currentLocale.value,
        );
        return currentLocale.value;
      }
    }
  } catch (error) {
    console.warn("[i18n] localStorage access failed:", error);
  }

  try {
    if (typeof navigator !== "undefined" && navigator.language) {
      const browserLocale = navigator.language.split("-")[0];
      if (browserLocale === "es") {
        currentLocale.value = "es";
        console.info("[i18n] Using browser locale:", currentLocale.value);
        return currentLocale.value;
      }
    }
  } catch (error) {
    console.warn("[i18n] navigator.language access failed:", error);
  }

  currentLocale.value = "en";
  console.info("[i18n] Using default locale:", currentLocale.value);
  return currentLocale.value;
}

// Safe path traversal for nested objects with proper value extraction
function getNestedValue(obj: any, path: string): unknown {
  const value = path.split(".").reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);

  // Handle different value formats that might come from the build process
  if (value === undefined || value === null) {
    return undefined;
  }

  // If it's already a string, return it
  if (typeof value === "string") {
    return value;
  }

  // If it's an object with a string property (common in build systems)
  if (typeof value === "object") {
    // Handle the specific vue-i18n build format: {t: 0, b: {t: 2, i: [...], s: "actual string"}}
    if (value.b && typeof value.b === "object") {
      if (typeof value.b.s === "string") {
        return value.b.s;
      }
      // Handle interpolation format: {t: 0, b: {t: 2, i: [...]}}
      if (value.b.t === 2 && Array.isArray(value.b.i)) {
        // This is a compiled interpolation message - return the raw structure
        // so it can be processed by the translation function with values
        return value;
      }
    }

    // Check for other common build system formats
    if (typeof value.value === "string") {
      return value.value;
    }
    if (typeof value.message === "string") {
      return value.message;
    }
    if (typeof value.text === "string") {
      return value.text;
    }
    if (typeof value.default === "string") {
      return value.default;
    }
    // If it has a 's' property directly (simpler format)
    if (typeof value.s === "string") {
      return value.s;
    }
    // If it has a 't' property (might be a Vite/build system wrapper)
    if (typeof value.t === "string") {
      return value.t;
    }
    // Try to convert the object to string as last resort
    return JSON.stringify(value);
  }

  // Convert other types to string
  return String(value);
}

interface CompiledMessageBody {
  t?: number;
  i?: any[];
  s?: string;
}

interface CompiledMessage {
  b?: CompiledMessageBody;
}

function hasCompiledInterpolation(value: unknown): value is CompiledMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const body = (value as CompiledMessage).b;
  return Boolean(body && body.t === 2 && Array.isArray(body.i));
}

// Process vue-i18n compiled interpolation instructions
function processInterpolationInstructions(
  instructions: any[],
  values: Record<string, any> = {},
): string {
  let result = "";

  for (const instruction of instructions) {
    if (typeof instruction === "object" && instruction !== null) {
      if (instruction.t === 3 && typeof instruction.v === "string") {
        // Literal text
        result += instruction.v;
      } else if (instruction.t === 4 && typeof instruction.k === "string") {
        // Interpolation placeholder
        const value = values[instruction.k];
        result += value !== undefined ? String(value) : `{${instruction.k}}`;
      }
    }
  }

  return result;
}

// Simple interpolation without eval - only handles {name} placeholders
function interpolate(
  template: string,
  values: Record<string, any> = {},
): string {
  return template.replace(/\{([^}]+)\}/g, (match, key) => {
    const value = values[key];
    return value !== undefined ? String(value) : match;
  });
}

// Production-safe translation function - now reactive
export function t(key: string, values?: Record<string, any>): string {
  const locale = currentLocale.value;
  const message = getNestedValue(messages[locale], key);

  if (message !== undefined) {
    if (typeof message === "string") {
      return interpolate(message, values);
    }

    // Handle vue-i18n compiled interpolation format
    if (hasCompiledInterpolation(message)) {
      return processInterpolationInstructions(message.b!.i!, values);
    }

    return String(message);
  }

  // Fallback to English
  const fallbackMessage = getNestedValue(messages.en, key);
  if (fallbackMessage !== undefined) {
    if (typeof fallbackMessage === "string") {
      return interpolate(fallbackMessage, values);
    }

    // Handle vue-i18n compiled interpolation format for fallback
    if (hasCompiledInterpolation(fallbackMessage)) {
      return processInterpolationInstructions(
        fallbackMessage.b!.i!,
        values,
      );
    }

    return String(fallbackMessage);
  }

  // Last resort: return the key itself
  return key;
}

// Reactive translation function that automatically updates when locale changes
export const reactiveT = computed(() => {
  return (key: string, values?: Record<string, any>): string => {
    const locale = currentLocale.value;
    const message = getNestedValue(messages[locale], key);

    if (message !== undefined) {
      if (typeof message === "string") {
        return interpolate(message, values);
      }

      // Handle vue-i18n compiled interpolation format
      if (hasCompiledInterpolation(message)) {
        return processInterpolationInstructions(message.b!.i!, values);
      }

      return String(message);
    }

    // Fallback to English
    const fallbackMessage = getNestedValue(messages.en, key);
    if (fallbackMessage !== undefined) {
      if (typeof fallbackMessage === "string") {
        return interpolate(fallbackMessage, values);
      }

      // Handle vue-i18n compiled interpolation format for fallback
      if (hasCompiledInterpolation(fallbackMessage)) {
        return processInterpolationInstructions(
          fallbackMessage.b!.i!,
          values,
        );
      }

      return String(fallbackMessage);
    }

    // Last resort: return the key itself
    return key;
  };
});

// Locale management - now reactive
export function setLocale(locale: LocaleCode): void {
  currentLocale.value = locale;
  console.info("[i18n] Setting locale to:", locale);

  try {
    if (typeof localStorage !== "undefined" && localStorage) {
      localStorage.setItem("shoptrack-locale", locale);
    }
  } catch (error) {
    console.warn("[i18n] Failed to save locale to localStorage:", error);
  }

  try {
    if (typeof document !== "undefined" && document.documentElement) {
      const languageTag = locale === "es" ? "es-ES" : "en-US";
      document.documentElement.lang = languageTag;
    }
  } catch (error) {
    console.warn("[i18n] Failed to set document language:", error);
  }
}

export function getCurrentLocale(): LocaleCode {
  return currentLocale.value;
}

// Export the reactive locale ref for components that need to watch for changes
export const localeRef = currentLocale;

// Initialize
initializeLocale();

// Define available locales (copied from index.ts)
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

// Export for compatibility
export const productionSafeI18n = {
  t,
  reactiveT,
  setLocale,
  getCurrentLocale,
  getLocaleName,
  getLocaleFlag,
  availableLocales,
  get locale() {
    return currentLocale.value;
  },
  localeRef: currentLocale,
  messages,
};

export default productionSafeI18n;
