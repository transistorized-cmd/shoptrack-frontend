import type { LocaleCode } from "../index";

// Import plugin translations
import genericReceiptEn from "./generic-receipt.en.json";
import genericReceiptEs from "./generic-receipt.es.json";
import amazonOrdersEn from "./amazon-orders.en.json";
import amazonOrdersEs from "./amazon-orders.es.json";

// Plugin translation registry
const pluginTranslations = {
  "generic-receipt": {
    en: genericReceiptEn,
    es: genericReceiptEs,
  },
  "amazon-orders": {
    en: amazonOrdersEn,
    es: amazonOrdersEs,
  },
} as const;

export type PluginKey = keyof typeof pluginTranslations;

/**
 * Get plugin translations for a specific locale
 */
export function getPluginTranslations(
  pluginKey: PluginKey,
  locale: LocaleCode,
) {
  return (
    pluginTranslations[pluginKey]?.[locale] || pluginTranslations[pluginKey]?.en
  );
}

/**
 * Get all available plugin keys
 */
export function getAvailablePluginKeys(): PluginKey[] {
  return Object.keys(pluginTranslations) as PluginKey[];
}

/**
 * Check if a plugin has translations available
 */
export function hasPluginTranslations(
  pluginKey: string,
): pluginKey is PluginKey {
  return pluginKey in pluginTranslations;
}
