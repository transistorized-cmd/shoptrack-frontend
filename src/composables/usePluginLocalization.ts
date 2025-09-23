import { useTranslation } from "@/composables/useTranslation";
import type { ReportPlugin, ReceiptPlugin } from "@/types/plugin";

/**
 * Composable for localizing plugin names and descriptions
 * Maps backend plugin keys to frontend translation keys
 */
export const usePluginLocalization = () => {
  const { t } = useTranslation();

  /**
   * Get localized name for a plugin
   * Falls back to original name if no translation exists
   */
  const getLocalizedPluginName = (
    plugin: ReportPlugin | ReceiptPlugin,
  ): string => {
    const translationKey = `plugins.${plugin.key}.name`;
    const translated = t(translationKey);

    // If translation key exists, use it; otherwise fall back to original name
    return translated !== translationKey ? translated : plugin.name;
  };

  /**
   * Get localized description for a plugin
   * Falls back to original description if no translation exists
   */
  const getLocalizedPluginDescription = (
    plugin: ReportPlugin | ReceiptPlugin,
  ): string => {
    const translationKey = `plugins.${plugin.key}.description`;
    const translated = t(translationKey);

    // If translation key exists, use it; otherwise fall back to original description
    return translated !== translationKey ? translated : plugin.description;
  };

  /**
   * Create a localized version of a plugin object
   */
  const localizePlugin = <T extends ReportPlugin | ReceiptPlugin>(
    plugin: T,
  ): T => {
    return {
      ...plugin,
      name: getLocalizedPluginName(plugin),
      description: getLocalizedPluginDescription(plugin),
    };
  };

  /**
   * Localize an array of plugins
   */
  const localizePlugins = <T extends ReportPlugin | ReceiptPlugin>(
    plugins: T[],
  ): T[] => {
    return plugins.map((plugin) => localizePlugin(plugin));
  };

  return {
    getLocalizedPluginName,
    getLocalizedPluginDescription,
    localizePlugin,
    localizePlugins,
  };
};
