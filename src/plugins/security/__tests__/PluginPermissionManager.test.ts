import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  PluginPermissionManager,
  pluginPermissionManager,
} from "../PluginPermissionManager";
import type {
  PluginPermissions,
  PluginOperation,
} from "../PluginPermissionManager";

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

// Mock Notification API
const mockNotification = vi.fn();
Object.defineProperty(window, "Notification", {
  value: mockNotification,
  configurable: true,
});
Object.defineProperty(Notification, "permission", {
  value: "granted",
  configurable: true,
});

// Mock Clipboard API
const mockClipboard = {
  readText: vi.fn(),
  writeText: vi.fn(),
};
Object.defineProperty(navigator, "clipboard", {
  value: mockClipboard,
  configurable: true,
});

// Mock console for testing logging
const mockConsole = {
  log: vi.fn(),
};

describe("PluginPermissionManager", () => {
  let permissionManager: PluginPermissionManager;

  beforeEach(() => {
    permissionManager = new PluginPermissionManager();
    vi.clearAllMocks();

    // Spy on console.log
    vi.spyOn(console, "log").mockImplementation(mockConsole.log);
  });

  describe("Default Permissions", () => {
    it("should provide secure default permissions", () => {
      const permissions = permissionManager.getPermissions("test-plugin");

      expect(permissions).toEqual({
        fileUpload: true,
        networkAccess: false,
        localStorage: false,
        cookies: false,
        notifications: false,
        clipboard: false,
        camera: false,
        microphone: false,
        location: false,
        deviceInfo: false,
      });
    });

    it("should not have permission for sensitive operations by default", () => {
      expect(
        permissionManager.hasPermission("test-plugin", "networkAccess"),
      ).toBe(false);
      expect(
        permissionManager.hasPermission("test-plugin", "localStorage"),
      ).toBe(false);
      expect(permissionManager.hasPermission("test-plugin", "cookies")).toBe(
        false,
      );
      expect(permissionManager.hasPermission("test-plugin", "camera")).toBe(
        false,
      );
      expect(permissionManager.hasPermission("test-plugin", "microphone")).toBe(
        false,
      );
      expect(permissionManager.hasPermission("test-plugin", "location")).toBe(
        false,
      );
    });

    it("should allow file upload by default", () => {
      expect(permissionManager.hasPermission("test-plugin", "fileUpload")).toBe(
        true,
      );
    });
  });

  describe("Permission Management", () => {
    it("should grant permissions to a plugin", () => {
      const newPermissions: Partial<PluginPermissions> = {
        networkAccess: true,
        notifications: true,
      };

      permissionManager.grantPermissions("test-plugin", newPermissions);

      expect(
        permissionManager.hasPermission("test-plugin", "networkAccess"),
      ).toBe(true);
      expect(
        permissionManager.hasPermission("test-plugin", "notifications"),
      ).toBe(true);
      expect(permissionManager.hasPermission("test-plugin", "fileUpload")).toBe(
        true,
      ); // Should preserve default
      expect(
        permissionManager.hasPermission("test-plugin", "localStorage"),
      ).toBe(false); // Should remain default
    });

    it("should log permission updates", () => {
      const newPermissions: Partial<PluginPermissions> = {
        networkAccess: true,
        notifications: true,
      };

      permissionManager.grantPermissions("test-plugin", newPermissions);

      expect(console.log).toHaveBeenCalledWith(
        "🔐 Updated permissions for plugin test-plugin:",
        expect.objectContaining({
          networkAccess: true,
          notifications: true,
          fileUpload: true,
        }),
      );
    });

    it("should revoke all permissions for a plugin", () => {
      // First grant some permissions
      permissionManager.grantPermissions("test-plugin", {
        networkAccess: true,
      });
      expect(
        permissionManager.hasPermission("test-plugin", "networkAccess"),
      ).toBe(true);

      // Then revoke all
      permissionManager.revokeAllPermissions("test-plugin");

      // Should fall back to defaults
      const permissions = permissionManager.getPermissions("test-plugin");
      expect(permissions.networkAccess).toBe(false); // Back to default
      expect(permissions.fileUpload).toBe(true); // Default value
    });

    it("should log permission revocation", () => {
      permissionManager.revokeAllPermissions("test-plugin");

      expect(console.log).toHaveBeenCalledWith(
        "🚫 Revoked all permissions for plugin test-plugin",
      );
    });
  });

  describe("Permission Checking", () => {
    it("should check single permissions correctly", () => {
      // Test with default permissions
      expect(permissionManager.hasPermission("test-plugin", "fileUpload")).toBe(
        true,
      );
      expect(
        permissionManager.hasPermission("test-plugin", "networkAccess"),
      ).toBe(false);

      // Grant network access
      permissionManager.grantPermissions("test-plugin", {
        networkAccess: true,
      });
      expect(
        permissionManager.hasPermission("test-plugin", "networkAccess"),
      ).toBe(true);
    });

    it("should handle non-existent plugins gracefully", () => {
      const permissions = permissionManager.getPermissions(
        "non-existent-plugin",
      );

      // Should return default permissions
      expect(permissions.fileUpload).toBe(true);
      expect(permissions.networkAccess).toBe(false);
    });
  });

  describe("Operation Permission Checking", () => {
    it("should check file upload operation permissions", () => {
      const result = permissionManager.checkPermission(
        "test-plugin",
        "fileUpload",
      );

      expect(result).toEqual({
        allowed: true,
        missingPermissions: [],
        operation: "fileUpload",
        pluginId: "test-plugin",
      });
    });

    it("should check network request operation permissions", () => {
      const result = permissionManager.checkPermission(
        "test-plugin",
        "networkRequest",
      );

      expect(result).toEqual({
        allowed: false,
        missingPermissions: ["networkAccess"],
        operation: "networkRequest",
        pluginId: "test-plugin",
      });
    });

    it("should allow operations when permissions are granted", () => {
      permissionManager.grantPermissions("test-plugin", {
        networkAccess: true,
        notifications: true,
      });

      const networkResult = permissionManager.checkPermission(
        "test-plugin",
        "networkRequest",
      );
      const notificationResult = permissionManager.checkPermission(
        "test-plugin",
        "showNotification",
      );

      expect(networkResult.allowed).toBe(true);
      expect(networkResult.missingPermissions).toEqual([]);

      expect(notificationResult.allowed).toBe(true);
      expect(notificationResult.missingPermissions).toEqual([]);
    });

    it("should identify multiple missing permissions", () => {
      // Test operation that doesn't exist (should return empty requirements)
      const unknownResult = permissionManager.checkPermission(
        "test-plugin",
        "unknownOperation" as PluginOperation,
      );
      expect(unknownResult.allowed).toBe(true);
      expect(unknownResult.missingPermissions).toEqual([]);
    });
  });

  describe("Auto-Grant Permissions", () => {
    it("should auto-grant permissions based on capabilities", () => {
      const capabilities = {
        fileUpload: true,
        manualEntry: true,
        batchProcessing: true,
      };

      permissionManager.autoGrantPermissions("test-plugin", capabilities);

      const permissions = permissionManager.getPermissions("test-plugin");
      expect(permissions.fileUpload).toBe(true);
      expect(permissions.networkAccess).toBe(true);
      expect(permissions.notifications).toBe(true);
    });

    it("should grant network access for plugins with fileUpload capability", () => {
      const capabilities = { fileUpload: true };

      permissionManager.autoGrantPermissions("test-plugin", capabilities);

      expect(
        permissionManager.hasPermission("test-plugin", "networkAccess"),
      ).toBe(true);
    });

    it("should grant network access for plugins with manualEntry capability", () => {
      const capabilities = { manualEntry: true };

      permissionManager.autoGrantPermissions("test-plugin", capabilities);

      expect(
        permissionManager.hasPermission("test-plugin", "networkAccess"),
      ).toBe(true);
    });

    it("should grant notifications for batch processing plugins", () => {
      const capabilities = { batchProcessing: true };

      permissionManager.autoGrantPermissions("test-plugin", capabilities);

      expect(
        permissionManager.hasPermission("test-plugin", "notifications"),
      ).toBe(true);
    });
  });

  describe("Constrained Context Creation", () => {
    beforeEach(() => {
      // Reset mocks
      mockLocalStorage.getItem.mockReturnValue("test-value");
      mockClipboard.readText.mockResolvedValue("clipboard-text");
      mockClipboard.writeText.mockResolvedValue(undefined);
    });

    it("should create constrained context with allowed operations", () => {
      permissionManager.grantPermissions("test-plugin", {
        localStorage: true,
        clipboard: true,
        notifications: true,
        deviceInfo: true,
      });

      const context = permissionManager.createConstrainedContext("test-plugin");

      expect(context.getLocalStorage).toBeDefined();
      expect(context.setLocalStorage).toBeDefined();
      expect(context.readClipboard).toBeDefined();
      expect(context.writeClipboard).toBeDefined();
      expect(context.showNotification).toBeDefined();
      expect(context.getDeviceInfo).toBeDefined();
    });

    it("should create constrained context with denied operations", () => {
      // Use default permissions (most things denied)
      const context = permissionManager.createConstrainedContext("test-plugin");

      // These should be denied functions that throw errors
      expect(() => context.getLocalStorage("test")).toThrow(
        "Plugin does not have permission: localStorage",
      );
      expect(() => context.setLocalStorage("test", "value")).toThrow(
        "Plugin does not have permission: localStorage",
      );
      expect(() => context.readClipboard()).toThrow(
        "Plugin does not have permission: clipboard",
      );
      expect(() => context.writeClipboard("text")).toThrow(
        "Plugin does not have permission: clipboard",
      );
      expect(() => context.showNotification("test")).toThrow(
        "Plugin does not have permission: notifications",
      );
      expect(() => context.getDeviceInfo()).toThrow(
        "Plugin does not have permission: deviceInfo",
      );
    });

    it("should allow localStorage operations with permissions", () => {
      permissionManager.grantPermissions("test-plugin", { localStorage: true });
      const context = permissionManager.createConstrainedContext("test-plugin");

      // Should work without throwing
      const value = context.getLocalStorage("test");
      context.setLocalStorage("test", "value");

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith("plugin_test");
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "plugin_test",
        "value",
      );
    });

    it("should allow clipboard operations with permissions", async () => {
      permissionManager.grantPermissions("test-plugin", { clipboard: true });
      const context = permissionManager.createConstrainedContext("test-plugin");

      await context.readClipboard();
      await context.writeClipboard(
        "test text that is longer than 1000 chars".repeat(50),
      );

      expect(mockClipboard.readText).toHaveBeenCalled();
      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        expect.stringMatching(/^test text.*/), // Should be truncated to 1000 chars
      );
    });

    it("should allow notifications with permissions", () => {
      permissionManager.grantPermissions("test-plugin", {
        notifications: true,
      });
      const context = permissionManager.createConstrainedContext("test-plugin");

      context.showNotification(
        "Test notification message that is very long and should be truncated".repeat(
          10,
        ),
      );

      expect(mockNotification).toHaveBeenCalledWith(
        "Plugin Notification",
        expect.objectContaining({
          body: expect.stringMatching(/^Test notification.*/), // Should be truncated to 100 chars
        }),
      );
    });

    it("should provide device info with permissions", () => {
      permissionManager.grantPermissions("test-plugin", { deviceInfo: true });
      const context = permissionManager.createConstrainedContext("test-plugin");

      const deviceInfo = context.getDeviceInfo();

      expect(deviceInfo).toEqual({
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screen: {
          width: screen.width,
          height: screen.height,
        },
      });
    });

    it("should filter sensitive cookies", () => {
      // Mock document.cookie
      Object.defineProperty(document, "cookie", {
        value: "session=abc123; user=john; auth=xyz789; theme=dark; lang=en",
        configurable: true,
      });

      permissionManager.grantPermissions("test-plugin", { cookies: true });
      const context = permissionManager.createConstrainedContext("test-plugin");

      const cookies = context.getCookies();

      // Should exclude session and auth cookies
      expect(cookies).not.toContain("session=abc123");
      expect(cookies).not.toContain("auth=xyz789");
      expect(cookies).toContain("theme=dark");
      expect(cookies).toContain("lang=en");
    });
  });

  describe("Singleton Instance", () => {
    it("should export a singleton instance", () => {
      expect(pluginPermissionManager).toBeInstanceOf(PluginPermissionManager);

      // Test that it works
      pluginPermissionManager.grantPermissions("singleton-test", {
        networkAccess: true,
      });
      expect(
        pluginPermissionManager.hasPermission(
          "singleton-test",
          "networkAccess",
        ),
      ).toBe(true);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle invalid permission keys gracefully", () => {
      // Should not crash, just return false for unknown permissions
      expect(
        permissionManager.hasPermission(
          "test-plugin",
          "invalidPermission" as keyof PluginPermissions,
        ),
      ).toBe(false);
    });

    it("should handle empty permission objects", () => {
      permissionManager.grantPermissions("test-plugin", {});
      const permissions = permissionManager.getPermissions("test-plugin");

      // Should still have default permissions
      expect(permissions.fileUpload).toBe(true);
      expect(permissions.networkAccess).toBe(false);
    });

    it("should handle notification permission not granted", () => {
      // Mock notification permission as denied
      Object.defineProperty(Notification, "permission", {
        value: "denied",
        configurable: true,
      });

      permissionManager.grantPermissions("test-plugin", {
        notifications: true,
      });
      const context = permissionManager.createConstrainedContext("test-plugin");

      // Should not throw, but also not create notification
      expect(() => context.showNotification("test")).not.toThrow();
      expect(mockNotification).not.toHaveBeenCalled();
    });

    it("should handle missing clipboard API gracefully", () => {
      // Remove clipboard API
      Object.defineProperty(navigator, "clipboard", {
        value: undefined,
        configurable: true,
      });

      permissionManager.grantPermissions("test-plugin", { clipboard: true });
      const context = permissionManager.createConstrainedContext("test-plugin");

      // Should throw TypeError when trying to access undefined clipboard
      expect(() => context.readClipboard()).toThrow();
      expect(() => context.writeClipboard("text")).toThrow();
    });

    it("should handle missing performance.memory gracefully in production", () => {
      // Test with performance.memory undefined (common in some browsers)
      const originalPerformance = (window as any).performance;
      (window as any).performance = {
        ...originalPerformance,
        memory: undefined,
      };

      // Should not crash when checking memory (used in sandbox)
      const permissions = permissionManager.getPermissions("test-plugin");
      expect(permissions).toBeDefined();

      // Restore
      (window as any).performance = originalPerformance;
    });
  });
});
