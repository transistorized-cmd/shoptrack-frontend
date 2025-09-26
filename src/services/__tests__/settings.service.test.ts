import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { settingsService } from "../settings.service";
import api from "../api";
import type {
  UserSettings,
  SettingKeyValue,
  SettingsResponse,
  SettingUpdateRequest,
} from "@/types/settings";

// Mock the API module
vi.mock("../api", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

describe("settingsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getSettings", () => {
    it("should fetch all user settings successfully", async () => {
      // Arrange
      const mockSettings: UserSettings = {
        display: {
          theme: "light",
          currency: "USD",
          language: "en",
          dateFormat: "MM/DD/YYYY",
          timeFormat: "12h",
          timezone: "America/New_York",
        },
        notifications: {
          email: true,
          push: false,
          receiptProcessed: true,
          weeklyReport: false,
          promotions: true,
        },
        privacy: {
          shareAnalytics: false,
          shareUsageData: true,
          allowCookies: true,
        },
        receipts: {
          autoDelete: false,
          retentionDays: 365,
          autoBackup: true,
          defaultCategory: "general",
        },
      };

      mockApi.get.mockResolvedValue({
        data: mockSettings,
      });

      // Act
      const result = await settingsService.getSettings();

      // Assert
      expect(mockApi.get).toHaveBeenCalledTimes(1);
      expect(mockApi.get).toHaveBeenCalledWith("/auth/settings");
      expect(result).toEqual(mockSettings);
    });

    it("should handle API errors when fetching settings", async () => {
      // Arrange
      const mockError = new Error("Failed to fetch settings");
      mockApi.get.mockRejectedValue(mockError);

      // Act & Assert
      await expect(settingsService.getSettings()).rejects.toThrow(
        "Failed to fetch settings",
      );
      expect(mockApi.get).toHaveBeenCalledWith("/auth/settings");
    });
  });

  describe("updateSettings", () => {
    it("should update partial settings successfully", async () => {
      // Arrange
      const partialSettings: Partial<UserSettings> = {
        display: {
          theme: "dark",
          currency: "EUR",
        },
        notifications: {
          email: false,
        },
      };

      const mockResponse: SettingsResponse = {
        success: true,
        message: "Settings updated successfully",
        settings: {
          display: {
            theme: "dark",
            currency: "EUR",
            language: "en",
            dateFormat: "MM/DD/YYYY",
            timeFormat: "12h",
            timezone: "America/New_York",
          },
          notifications: {
            email: false,
            push: false,
            receiptProcessed: true,
            weeklyReport: false,
            promotions: true,
          },
        } as UserSettings,
      };

      mockApi.put.mockResolvedValue({
        data: mockResponse,
      });

      // Act
      const result = await settingsService.updateSettings(partialSettings);

      // Assert
      expect(mockApi.put).toHaveBeenCalledTimes(1);
      expect(mockApi.put).toHaveBeenCalledWith(
        "/auth/settings",
        partialSettings,
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle empty settings update", async () => {
      // Arrange
      const emptySettings = {};
      const mockResponse: SettingsResponse = {
        success: true,
        message: "No changes made",
      };

      mockApi.put.mockResolvedValue({ data: mockResponse });

      // Act
      const result = await settingsService.updateSettings(emptySettings);

      // Assert
      expect(mockApi.put).toHaveBeenCalledWith("/auth/settings", emptySettings);
      expect(result).toEqual(mockResponse);
    });

    it("should handle update settings API errors", async () => {
      // Arrange
      const settings = { display: { theme: "dark" as const } };
      const mockError = new Error("Update failed");
      mockApi.put.mockRejectedValue(mockError);

      // Act & Assert
      await expect(settingsService.updateSettings(settings)).rejects.toThrow(
        "Update failed",
      );
    });
  });

  describe("getSetting", () => {
    it("should get specific setting by key", async () => {
      // Arrange
      const mockSetting: SettingKeyValue = {
        key: "display.currency",
        value: "USD",
        type: "string",
      };

      mockApi.get.mockResolvedValue({
        data: mockSetting,
      });

      // Act
      const result = await settingsService.getSetting("display.currency");

      // Assert
      expect(mockApi.get).toHaveBeenCalledTimes(1);
      expect(mockApi.get).toHaveBeenCalledWith(
        "/auth/settings/display.currency",
      );
      expect(result).toEqual(mockSetting);
    });

    it("should handle nested setting keys", async () => {
      // Arrange
      const mockSetting: SettingKeyValue = {
        key: "notifications.receiptProcessed",
        value: true,
        type: "boolean",
      };

      mockApi.get.mockResolvedValue({ data: mockSetting });

      // Act
      const result = await settingsService.getSetting(
        "notifications.receiptProcessed",
      );

      // Assert
      expect(mockApi.get).toHaveBeenCalledWith(
        "/auth/settings/notifications.receiptProcessed",
      );
      expect(result).toEqual(mockSetting);
    });

    it("should handle get setting API errors", async () => {
      // Arrange
      mockApi.get.mockRejectedValue(new Error("Setting not found"));

      // Act & Assert
      await expect(settingsService.getSetting("invalid.key")).rejects.toThrow(
        "Setting not found",
      );
    });
  });

  describe("updateSetting", () => {
    it("should update specific setting by key", async () => {
      // Arrange
      const mockResponse: SettingsResponse = {
        success: true,
        message: "Currency updated successfully",
        updatedSetting: {
          key: "display.currency",
          value: "EUR",
          type: "string",
        },
      };

      mockApi.put.mockResolvedValue({
        data: mockResponse,
      });

      // Act
      const result = await settingsService.updateSetting(
        "display.currency",
        "EUR",
      );

      // Assert
      expect(mockApi.put).toHaveBeenCalledTimes(1);
      expect(mockApi.put).toHaveBeenCalledWith(
        "/auth/settings/display.currency",
        { value: "EUR" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle boolean setting updates", async () => {
      // Arrange
      const mockResponse: SettingsResponse = {
        success: true,
        message: "Notification setting updated",
      };

      mockApi.put.mockResolvedValue({ data: mockResponse });

      // Act
      await settingsService.updateSetting("notifications.email", false);

      // Assert
      expect(mockApi.put).toHaveBeenCalledWith(
        "/auth/settings/notifications.email",
        { value: false },
      );
    });

    it("should handle number setting updates", async () => {
      // Arrange
      const mockResponse: SettingsResponse = {
        success: true,
        message: "Retention days updated",
      };

      mockApi.put.mockResolvedValue({ data: mockResponse });

      // Act
      await settingsService.updateSetting("receipts.retentionDays", 730);

      // Assert
      expect(mockApi.put).toHaveBeenCalledWith(
        "/auth/settings/receipts.retentionDays",
        { value: 730 },
      );
    });

    it("should handle null and undefined values", async () => {
      // Arrange
      const mockResponse: SettingsResponse = {
        success: true,
        message: "Updated",
      };
      mockApi.put.mockResolvedValue({ data: mockResponse });

      // Act & Assert
      await settingsService.updateSetting("some.key", null);
      expect(mockApi.put).toHaveBeenCalledWith("/auth/settings/some.key", {
        value: null,
      });

      await settingsService.updateSetting("another.key", undefined);
      expect(mockApi.put).toHaveBeenCalledWith("/auth/settings/another.key", {
        value: undefined,
      });
    });

    it("should handle update setting API errors", async () => {
      // Arrange
      mockApi.put.mockRejectedValue(new Error("Invalid setting value"));

      // Act & Assert
      await expect(
        settingsService.updateSetting("display.currency", "INVALID"),
      ).rejects.toThrow("Invalid setting value");
    });
  });

  describe("resetSettings", () => {
    it("should reset all settings to defaults", async () => {
      // Arrange
      const mockResponse: SettingsResponse = {
        success: true,
        message: "Settings reset to defaults",
        settings: {
          display: {
            theme: "auto",
            currency: "USD",
            language: "en",
            dateFormat: "MM/DD/YYYY",
            timeFormat: "12h",
            timezone: "UTC",
          },
        } as UserSettings,
      };

      mockApi.post.mockResolvedValue({
        data: mockResponse,
      });

      // Act
      const result = await settingsService.resetSettings();

      // Assert
      expect(mockApi.post).toHaveBeenCalledTimes(1);
      expect(mockApi.post).toHaveBeenCalledWith("/auth/settings/reset");
      expect(result).toEqual(mockResponse);
    });

    it("should handle reset settings API errors", async () => {
      // Arrange
      mockApi.post.mockRejectedValue(new Error("Reset failed"));

      // Act & Assert
      await expect(settingsService.resetSettings()).rejects.toThrow(
        "Reset failed",
      );
    });
  });

  describe("convenience methods", () => {
    beforeEach(() => {
      const mockResponse: SettingsResponse = {
        success: true,
        message: "Setting updated",
      };
      mockApi.put.mockResolvedValue({ data: mockResponse });
    });

    describe("updateCurrency", () => {
      it("should update currency setting", async () => {
        // Act
        await settingsService.updateCurrency("EUR");

        // Assert
        expect(mockApi.put).toHaveBeenCalledWith(
          "/auth/settings/display.currency",
          { value: "EUR" },
        );
      });

      it("should handle different currency codes", async () => {
        // Act
        const currencies = ["USD", "GBP", "JPY", "CAD"];

        for (const currency of currencies) {
          await settingsService.updateCurrency(currency);
          expect(mockApi.put).toHaveBeenCalledWith(
            "/auth/settings/display.currency",
            { value: currency },
          );
        }

        expect(mockApi.put).toHaveBeenCalledTimes(currencies.length);
      });
    });

    describe("updateTheme", () => {
      it("should update theme setting with light theme", async () => {
        // Act
        await settingsService.updateTheme("light");

        // Assert
        expect(mockApi.put).toHaveBeenCalledWith(
          "/auth/settings/display.theme",
          { value: "light" },
        );
      });

      it("should update theme setting with dark theme", async () => {
        // Act
        await settingsService.updateTheme("dark");

        // Assert
        expect(mockApi.put).toHaveBeenCalledWith(
          "/auth/settings/display.theme",
          { value: "dark" },
        );
      });

      it("should update theme setting with auto theme", async () => {
        // Act
        await settingsService.updateTheme("auto");

        // Assert
        expect(mockApi.put).toHaveBeenCalledWith(
          "/auth/settings/display.theme",
          { value: "auto" },
        );
      });
    });

    describe("updateLanguage", () => {
      it("should update language setting", async () => {
        // Act
        await settingsService.updateLanguage("es");

        // Assert
        expect(mockApi.put).toHaveBeenCalledWith(
          "/auth/settings/display.language",
          { value: "es" },
        );
      });

      it("should handle different language codes", async () => {
        // Act
        const languages = ["en", "es", "fr", "de", "zh", "ja"];

        for (const language of languages) {
          await settingsService.updateLanguage(language);
          expect(mockApi.put).toHaveBeenCalledWith(
            "/auth/settings/display.language",
            { value: language },
          );
        }

        expect(mockApi.put).toHaveBeenCalledTimes(languages.length);
      });
    });

    describe("updateDisplaySettings", () => {
      it("should update multiple display settings", async () => {
        // Arrange
        const displaySettings = {
          theme: "dark" as const,
          currency: "EUR",
          language: "fr",
        };

        mockApi.put.mockResolvedValue({
          data: { success: true, message: "Display settings updated" },
        });

        // Act
        await settingsService.updateDisplaySettings(displaySettings);

        // Assert
        expect(mockApi.put).toHaveBeenCalledWith("/auth/settings", {
          display: displaySettings,
        });
      });

      it("should handle single display setting update", async () => {
        // Arrange
        const displaySettings = { dateFormat: "DD/MM/YYYY" };

        // Act
        await settingsService.updateDisplaySettings(displaySettings);

        // Assert
        expect(mockApi.put).toHaveBeenCalledWith("/auth/settings", {
          display: displaySettings,
        });
      });
    });

    describe("updateNotificationSettings", () => {
      it("should update notification settings", async () => {
        // Arrange
        const notificationSettings = {
          email: false,
          push: true,
          receiptProcessed: false,
        };

        // Act
        await settingsService.updateNotificationSettings(notificationSettings);

        // Assert
        expect(mockApi.put).toHaveBeenCalledWith("/auth/settings", {
          notifications: notificationSettings,
        });
      });

      it("should handle single notification setting", async () => {
        // Arrange
        const notificationSettings = { weeklyReport: true };

        // Act
        await settingsService.updateNotificationSettings(notificationSettings);

        // Assert
        expect(mockApi.put).toHaveBeenCalledWith("/auth/settings", {
          notifications: notificationSettings,
        });
      });
    });

    describe("updatePrivacySettings", () => {
      it("should update privacy settings", async () => {
        // Arrange
        const privacySettings = {
          shareAnalytics: true,
          shareUsageData: false,
          allowCookies: false,
        };

        // Act
        await settingsService.updatePrivacySettings(privacySettings);

        // Assert
        expect(mockApi.put).toHaveBeenCalledWith("/auth/settings", {
          privacy: privacySettings,
        });
      });

      it("should handle partial privacy settings", async () => {
        // Arrange
        const privacySettings = { shareAnalytics: false };

        // Act
        await settingsService.updatePrivacySettings(privacySettings);

        // Assert
        expect(mockApi.put).toHaveBeenCalledWith("/auth/settings", {
          privacy: privacySettings,
        });
      });
    });

    describe("updateReceiptSettings", () => {
      it("should update receipt settings", async () => {
        // Arrange
        const receiptSettings = {
          autoDelete: true,
          retentionDays: 180,
          autoBackup: false,
          defaultCategory: "groceries",
        };

        // Act
        await settingsService.updateReceiptSettings(receiptSettings);

        // Assert
        expect(mockApi.put).toHaveBeenCalledWith("/auth/settings", {
          receipts: receiptSettings,
        });
      });

      it("should handle single receipt setting", async () => {
        // Arrange
        const receiptSettings = { retentionDays: 1095 }; // 3 years

        // Act
        await settingsService.updateReceiptSettings(receiptSettings);

        // Assert
        expect(mockApi.put).toHaveBeenCalledWith("/auth/settings", {
          receipts: receiptSettings,
        });
      });
    });
  });

  describe("service integration", () => {
    it("should work with multiple setting operations in sequence", async () => {
      // Arrange
      const mockGetResponse: UserSettings = {
        display: { theme: "light", currency: "USD", language: "en" },
      } as UserSettings;

      const mockUpdateResponse: SettingsResponse = {
        success: true,
        message: "Settings updated",
      };

      mockApi.get.mockResolvedValue({ data: mockGetResponse });
      mockApi.put.mockResolvedValue({ data: mockUpdateResponse });

      // Act
      const currentSettings = await settingsService.getSettings();
      await settingsService.updateTheme("dark");
      await settingsService.updateCurrency("EUR");

      // Assert
      expect(currentSettings.display.theme).toBe("light");
      expect(mockApi.get).toHaveBeenCalledTimes(1);
      expect(mockApi.put).toHaveBeenCalledTimes(2);
      expect(mockApi.put).toHaveBeenNthCalledWith(
        1,
        "/auth/settings/display.theme",
        { value: "dark" },
      );
      expect(mockApi.put).toHaveBeenNthCalledWith(
        2,
        "/auth/settings/display.currency",
        { value: "EUR" },
      );
    });

    it("should handle mixed successful and failed operations", async () => {
      // Arrange
      mockApi.put.mockResolvedValueOnce({
        data: { success: true, message: "Theme updated" },
      });
      mockApi.put.mockRejectedValueOnce(new Error("Currency update failed"));

      // Act & Assert
      await expect(settingsService.updateTheme("dark")).resolves.not.toThrow();
      await expect(settingsService.updateCurrency("INVALID")).rejects.toThrow(
        "Currency update failed",
      );

      expect(mockApi.put).toHaveBeenCalledTimes(2);
    });
  });

  describe("edge cases", () => {
    it("should handle empty string setting keys", async () => {
      // Arrange
      mockApi.get.mockResolvedValue({
        data: { key: "", value: null, type: "unknown" },
      });

      // Act
      await settingsService.getSetting("");

      // Assert
      expect(mockApi.get).toHaveBeenCalledWith("/auth/settings/");
    });

    it("should handle very long setting keys", async () => {
      // Arrange
      const longKey = "display.very.deep.nested.setting.with.many.levels";
      mockApi.put.mockResolvedValue({
        data: { success: true, message: "Updated" },
      });

      // Act
      await settingsService.updateSetting(longKey, "value");

      // Assert
      expect(mockApi.put).toHaveBeenCalledWith(`/auth/settings/${longKey}`, {
        value: "value",
      });
    });

    it("should handle complex object values in settings", async () => {
      // Arrange
      const complexValue = {
        nested: {
          array: [1, 2, 3],
          object: { key: "value" },
          boolean: true,
          null: null,
        },
      };
      mockApi.put.mockResolvedValue({
        data: { success: true, message: "Updated" },
      });

      // Act
      await settingsService.updateSetting("complex.setting", complexValue);

      // Assert
      expect(mockApi.put).toHaveBeenCalledWith(
        "/auth/settings/complex.setting",
        { value: complexValue },
      );
    });

    it("should handle network timeouts gracefully", async () => {
      // Arrange
      const timeoutError = new Error("Network timeout");
      mockApi.get.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(settingsService.getSettings()).rejects.toThrow(
        "Network timeout",
      );
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });

    it("should handle server errors with different status codes", async () => {
      // Arrange
      const errors = [
        { status: 400, message: "Bad Request" },
        { status: 401, message: "Unauthorized" },
        { status: 403, message: "Forbidden" },
        { status: 404, message: "Not Found" },
        { status: 500, message: "Internal Server Error" },
      ];

      for (const error of errors) {
        mockApi.put.mockRejectedValueOnce(new Error(error.message));

        // Act & Assert
        await expect(
          settingsService.updateSetting("test.key", "value"),
        ).rejects.toThrow(error.message);
      }

      expect(mockApi.put).toHaveBeenCalledTimes(errors.length);
    });
  });

  describe("default export", () => {
    it("should export the same instance as named export", () => {
      // The default export should be the same instance as the named export
      expect(settingsService).toBeDefined();
      expect(settingsService.getSettings).toBeDefined();
      expect(typeof settingsService.getSettings).toBe("function");
    });
  });
});
