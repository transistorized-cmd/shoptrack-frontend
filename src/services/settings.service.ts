import api from "./api";
import type {
  UserSettings,
  SettingKeyValue,
  SettingsResponse,
  SettingUpdateRequest,
} from "@/types/settings";

class SettingsService {
  private readonly baseUrl = "/auth/settings";

  /**
   * Get all user settings
   */
  async getSettings(): Promise<UserSettings> {
    const response = await api.get<UserSettings>(this.baseUrl);
    return response.data;
  }

  /**
   * Update all or partial user settings
   */
  async updateSettings(
    settings: Partial<UserSettings>,
  ): Promise<SettingsResponse> {
    const response = await api.put<SettingsResponse>(this.baseUrl, settings);
    return response.data;
  }

  /**
   * Get a specific setting by key using dot notation
   * @param key - Setting key using dot notation (e.g., 'display.currency')
   */
  async getSetting(key: string): Promise<SettingKeyValue> {
    const response = await api.get<SettingKeyValue>(`${this.baseUrl}/${key}`);
    return response.data;
  }

  /**
   * Update a specific setting by key using dot notation
   * @param key - Setting key using dot notation (e.g., 'display.currency')
   * @param value - New value for the setting
   */
  async updateSetting(key: string, value: any): Promise<SettingsResponse> {
    const request: SettingUpdateRequest = { value };
    const response = await api.put<SettingsResponse>(
      `${this.baseUrl}/${key}`,
      request,
    );
    return response.data;
  }

  /**
   * Reset all settings to defaults
   */
  async resetSettings(): Promise<SettingsResponse> {
    const response = await api.post<SettingsResponse>(`${this.baseUrl}/reset`);
    return response.data;
  }

  /**
   * Convenience method to update currency setting
   */
  async updateCurrency(currency: string): Promise<SettingsResponse> {
    return this.updateSetting("display.currency", currency);
  }

  /**
   * Convenience method to update theme setting
   */
  async updateTheme(
    theme: "light" | "dark" | "auto",
  ): Promise<SettingsResponse> {
    return this.updateSetting("display.theme", theme);
  }

  /**
   * Convenience method to update language setting
   */
  async updateLanguage(language: string): Promise<SettingsResponse> {
    return this.updateSetting("display.language", language);
  }

  /**
   * Convenience method to update multiple display settings
   */
  async updateDisplaySettings(
    displaySettings: Partial<UserSettings["display"]>,
  ): Promise<SettingsResponse> {
    return this.updateSettings({ display: displaySettings });
  }

  /**
   * Convenience method to update notification settings
   */
  async updateNotificationSettings(
    notificationSettings: Partial<UserSettings["notifications"]>,
  ): Promise<SettingsResponse> {
    return this.updateSettings({ notifications: notificationSettings });
  }

  /**
   * Convenience method to update privacy settings
   */
  async updatePrivacySettings(
    privacySettings: Partial<UserSettings["privacy"]>,
  ): Promise<SettingsResponse> {
    return this.updateSettings({ privacy: privacySettings });
  }

  /**
   * Convenience method to update receipt settings
   */
  async updateReceiptSettings(
    receiptSettings: Partial<UserSettings["receipts"]>,
  ): Promise<SettingsResponse> {
    return this.updateSettings({ receipts: receiptSettings });
  }
}

export const settingsService = new SettingsService();
export default settingsService;
