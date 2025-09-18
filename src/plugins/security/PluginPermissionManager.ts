/**
 * Plugin Permission Management System
 * Controls what resources and operations plugins are allowed to access
 */
export class PluginPermissionManager {
  private static readonly DEFAULT_PERMISSIONS: PluginPermissions = {
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
  };

  private pluginPermissions = new Map<string, PluginPermissions>();

  /**
   * Grant permissions to a plugin
   */
  grantPermissions(
    pluginId: string,
    permissions: Partial<PluginPermissions>,
  ): void {
    const existing = this.pluginPermissions.get(pluginId) || {
      ...PluginPermissionManager.DEFAULT_PERMISSIONS,
    };
    const updated = { ...existing, ...permissions };

    this.pluginPermissions.set(pluginId, updated);

    console.log(`🔐 Updated permissions for plugin ${pluginId}:`, updated);
  }

  /**
   * Check if plugin has specific permission
   */
  hasPermission(
    pluginId: string,
    permission: keyof PluginPermissions,
  ): boolean {
    const permissions =
      this.pluginPermissions.get(pluginId) ||
      PluginPermissionManager.DEFAULT_PERMISSIONS;
    return permissions[permission] || false;
  }

  /**
   * Get all permissions for a plugin
   */
  getPermissions(pluginId: string): PluginPermissions {
    return (
      this.pluginPermissions.get(pluginId) || {
        ...PluginPermissionManager.DEFAULT_PERMISSIONS,
      }
    );
  }

  /**
   * Revoke all permissions for a plugin
   */
  revokeAllPermissions(pluginId: string): void {
    this.pluginPermissions.delete(pluginId);
    console.log(`🚫 Revoked all permissions for plugin ${pluginId}`);
  }

  /**
   * Check permission before allowing operation
   */
  checkPermission(
    pluginId: string,
    operation: PluginOperation,
  ): PermissionCheckResult {
    const requiredPermissions = this.getRequiredPermissions(operation);
    const pluginPermissions = this.getPermissions(pluginId);

    const missingPermissions: string[] = [];

    for (const permission of requiredPermissions) {
      if (!pluginPermissions[permission]) {
        missingPermissions.push(permission);
      }
    }

    return {
      allowed: missingPermissions.length === 0,
      missingPermissions,
      operation,
      pluginId,
    };
  }

  /**
   * Create permission-constrained context for plugin execution
   */
  createConstrainedContext(pluginId: string): ConstrainedPluginContext {
    const permissions = this.getPermissions(pluginId);

    return {
      // File operations
      uploadFile: permissions.fileUpload
        ? this.allowedUploadFile.bind(this)
        : this.deniedOperation("fileUpload"),

      // Network operations
      fetch: permissions.networkAccess
        ? fetch
        : this.deniedOperation("networkAccess"),

      // Storage operations
      getLocalStorage: permissions.localStorage
        ? this.allowedLocalStorage.bind(this)
        : this.deniedOperation("localStorage"),
      setLocalStorage: permissions.localStorage
        ? this.allowedSetLocalStorage.bind(this)
        : this.deniedOperation("localStorage"),

      // Cookie operations
      getCookies: permissions.cookies
        ? this.allowedGetCookies.bind(this)
        : this.deniedOperation("cookies"),

      // Notification operations
      showNotification: permissions.notifications
        ? this.allowedShowNotification.bind(this)
        : this.deniedOperation("notifications"),

      // Clipboard operations
      readClipboard: permissions.clipboard
        ? this.allowedReadClipboard.bind(this)
        : this.deniedOperation("clipboard"),
      writeClipboard: permissions.clipboard
        ? this.allowedWriteClipboard.bind(this)
        : this.deniedOperation("clipboard"),

      // Device info
      getDeviceInfo: permissions.deviceInfo
        ? this.allowedGetDeviceInfo.bind(this)
        : this.deniedOperation("deviceInfo"),
    };
  }

  /**
   * Automatically determine required permissions from plugin config
   */
  autoGrantPermissions(pluginId: string, capabilities: any): void {
    const permissions: Partial<PluginPermissions> = {
      fileUpload: true, // Always granted for file processing plugins
    };

    // Grant network access if plugin has endpoints
    if (capabilities.fileUpload || capabilities.manualEntry) {
      permissions.networkAccess = true;
    }

    // Grant notifications for user feedback
    if (capabilities.fileUpload || capabilities.batchProcessing) {
      permissions.notifications = true;
    }

    this.grantPermissions(pluginId, permissions);
  }

  /**
   * Get required permissions for specific operations
   */
  private getRequiredPermissions(
    operation: PluginOperation,
  ): (keyof PluginPermissions)[] {
    switch (operation) {
      case "fileUpload":
        return ["fileUpload"];
      case "networkRequest":
        return ["networkAccess"];
      case "localStorage":
        return ["localStorage"];
      case "showNotification":
        return ["notifications"];
      case "clipboardAccess":
        return ["clipboard"];
      case "deviceInfo":
        return ["deviceInfo"];
      default:
        return [];
    }
  }

  // Allowed operations (with permission)
  private allowedUploadFile(file: File): Promise<void> {
    // Implementation would go here
    return Promise.resolve();
  }

  private allowedLocalStorage(key: string): string | null {
    return localStorage.getItem(`plugin_${key}`);
  }

  private allowedSetLocalStorage(key: string, value: string): void {
    localStorage.setItem(`plugin_${key}`, value);
  }

  private allowedGetCookies(): string {
    // Return only non-sensitive cookies
    return document.cookie
      .split(";")
      .filter(
        (cookie) =>
          !cookie.trim().startsWith("session") &&
          !cookie.trim().startsWith("auth"),
      )
      .join(";");
  }

  private allowedShowNotification(message: string): void {
    // Safe notification display
    if (Notification.permission === "granted") {
      new Notification("Plugin Notification", {
        body: message.substring(0, 100), // Limit message length
        icon: "/favicon.ico",
      });
    }
  }

  private allowedReadClipboard(): Promise<string> {
    return navigator.clipboard.readText();
  }

  private allowedWriteClipboard(text: string): Promise<void> {
    return navigator.clipboard.writeText(text.substring(0, 1000)); // Limit clipboard content
  }

  private allowedGetDeviceInfo(): DeviceInfo {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screen: {
        width: screen.width,
        height: screen.height,
      },
    };
  }

  // Denied operations (without permission)
  private deniedOperation(permission: keyof PluginPermissions) {
    return () => {
      throw new Error(`Plugin does not have permission: ${permission}`);
    };
  }
}

// Singleton instance
export const pluginPermissionManager = new PluginPermissionManager();

export interface PluginPermissions {
  fileUpload: boolean;
  networkAccess: boolean;
  localStorage: boolean;
  cookies: boolean;
  notifications: boolean;
  clipboard: boolean;
  camera: boolean;
  microphone: boolean;
  location: boolean;
  deviceInfo: boolean;
}

export interface PermissionCheckResult {
  allowed: boolean;
  missingPermissions: string[];
  operation: PluginOperation;
  pluginId: string;
}

export interface ConstrainedPluginContext {
  uploadFile: (file: File) => Promise<void>;
  fetch: typeof fetch;
  getLocalStorage: (key: string) => string | null;
  setLocalStorage: (key: string, value: string) => void;
  getCookies: () => string;
  showNotification: (message: string) => void;
  readClipboard: () => Promise<string>;
  writeClipboard: (text: string) => Promise<void>;
  getDeviceInfo: () => DeviceInfo;
}

export interface DeviceInfo {
  userAgent: string;
  language: string;
  platform: string;
  screen: {
    width: number;
    height: number;
  };
}

export type PluginOperation =
  | "fileUpload"
  | "networkRequest"
  | "localStorage"
  | "showNotification"
  | "clipboardAccess"
  | "deviceInfo";
