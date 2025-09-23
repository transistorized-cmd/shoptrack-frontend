import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { UserSettings } from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";
import { settingsService } from "@/services/settings.service";

export const useSettingsStore = defineStore("settings", () => {
  // State
  const settings = ref<UserSettings>(DEFAULT_SETTINGS);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Computed
  const userCurrency = computed(() => settings.value.display.currency);
  const userLanguage = computed(() => settings.value.display.language);
  const userTheme = computed(() => settings.value.display.theme);
  const userTimezone = computed(() => settings.value.display.timezone);

  // Actions
  const fetchSettings = async () => {
    loading.value = true;
    error.value = null;

    try {
      const userSettings = await settingsService.getSettings();
      settings.value = userSettings;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to fetch settings";
      console.error("Error fetching settings:", err);
    } finally {
      loading.value = false;
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await settingsService.updateSettings(newSettings);
      if (response.success && response.data) {
        settings.value = response.data;
      }
      return response;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to update settings";
      console.error("Error updating settings:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateCurrency = async (currency: string) => {
    try {
      const response = await settingsService.updateCurrency(currency);
      if (response.success && response.data) {
        settings.value = response.data;
      }
      return response;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to update currency";
      console.error("Error updating currency:", err);
      throw err;
    }
  };

  const updateTheme = async (theme: "light" | "dark" | "auto") => {
    try {
      const response = await settingsService.updateTheme(theme);
      if (response.success && response.data) {
        settings.value = response.data;
      }
      return response;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to update theme";
      console.error("Error updating theme:", err);
      throw err;
    }
  };

  const updateLanguage = async (language: string) => {
    try {
      const response = await settingsService.updateLanguage(language);
      if (response.success && response.data) {
        settings.value = response.data;
      }
      return response;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to update language";
      console.error("Error updating language:", err);
      throw err;
    }
  };

  const resetSettings = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await settingsService.resetSettings();
      if (response.success && response.data) {
        settings.value = response.data;
      }
      return response;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to reset settings";
      console.error("Error resetting settings:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    // State
    settings,
    loading,
    error,

    // Computed
    userCurrency,
    userLanguage,
    userTheme,
    userTimezone,

    // Actions
    fetchSettings,
    updateSettings,
    updateCurrency,
    updateTheme,
    updateLanguage,
    resetSettings,
    clearError,
  };
});