import {
  setLocale,
  getCurrentLocale,
  type LocaleCode,
  availableLocales,
} from "@/i18n";
import { settingsService } from "./settings.service";

export class LanguageSettingsService {
  /**
   * Initialize language from user settings
   * Called during app initialization when user is authenticated
   */
  async initializeFromUserSettings(): Promise<void> {
    try {
      const settings = await settingsService.getSettings();
      const userLanguage = settings.display.language;

      if (userLanguage && this.isValidLocale(userLanguage)) {
        setLocale(userLanguage as LocaleCode);
        console.info(
          `Language initialized from user settings: ${userLanguage}`,
        );
      } else {
        console.warn(
          `Invalid language in user settings: ${userLanguage}, falling back to current locale`,
        );
      }
    } catch (error) {
      console.warn(
        "Failed to load language from user settings, using current locale:",
        error,
      );
      // Ensure this doesn't throw - errors should be contained
    }
  }

  /**
   * Update user's language preference in settings
   * Called when user changes language in Profile settings
   */
  async updateUserLanguagePreference(locale: LocaleCode): Promise<void> {
    try {
      await settingsService.updateSetting("display.language", locale);
      setLocale(locale);
      console.info(`User language preference updated to: ${locale}`);
    } catch (error) {
      console.error("Failed to update user language preference:", error);
      throw error;
    }
  }

  /**
   * Get the effective language preference
   * Returns user preference if authenticated, otherwise localStorage/browser preference
   */
  async getEffectiveLanguage(): Promise<LocaleCode> {
    try {
      const settings = await settingsService.getSettings();
      const userLanguage = settings.display.language;

      if (userLanguage && this.isValidLocale(userLanguage)) {
        return userLanguage as LocaleCode;
      }
    } catch (error) {
      // User not authenticated or settings not available, fall back to current locale
    }

    return getCurrentLocale();
  }

  /**
   * Sync local language setting with user settings
   * Updates user settings to match current UI language
   */
  async syncWithUserSettings(): Promise<void> {
    try {
      const currentLocale = getCurrentLocale();
      const settings = await settingsService.getSettings();

      if (settings.display.language !== currentLocale) {
        await settingsService.updateSetting("display.language", currentLocale);
        console.info(
          `User language setting synced to current locale: ${currentLocale}`,
        );
      }
    } catch (error) {
      console.warn("Failed to sync language with user settings:", error);
    }
  }

  /**
   * Check if a locale code is valid
   */
  private isValidLocale(locale: string): boolean {
    return availableLocales.some((l) => l.code === locale);
  }
}

// Export singleton instance
export const languageSettingsService = new LanguageSettingsService();
export default languageSettingsService;
