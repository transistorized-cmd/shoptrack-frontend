export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  receiptProcessingAlerts: boolean;
  weeklyReports: boolean;
  monthlyReports: boolean;
  securityAlerts: boolean;
}

export interface DisplaySettings {
  theme: "light" | "dark" | "auto";
  language: string; // ISO 639-1 codes
  timezone: string; // IANA timezone
  currency: string; // ISO 4217 codes
  dateFormat: string;
  timeFormat: "12h" | "24h";
}

export interface PrivacySettings {
  showReceiptsInAnalytics: boolean;
  shareUsageData: boolean;
  allowDataExport: boolean;
  requirePasswordForSensitiveActions: boolean;
  sessionTimeout: number; // minutes (1-1440)
}

export interface ReceiptSettings {
  autoProcessReceipts: boolean;
  extractItemDetails: boolean;
  categorizeAutomatically: boolean;
  saveOriginalImages: boolean;
  defaultStore?: string;
  favoriteCategories: string[];
}

export interface UserSettings {
  notifications: NotificationSettings;
  display: DisplaySettings;
  privacy: PrivacySettings;
  receipts: ReceiptSettings;
}

export interface SettingKeyValue {
  key: string;
  value: any;
}

export interface SettingsResponse {
  success: boolean;
  message?: string;
  data?: UserSettings;
}

export interface SettingUpdateRequest {
  value: any;
}

export const DEFAULT_SETTINGS: UserSettings = {
  notifications: {
    emailNotifications: true,
    pushNotifications: false,
    receiptProcessingAlerts: true,
    weeklyReports: false,
    monthlyReports: true,
    securityAlerts: true,
  },
  display: {
    theme: "light",
    language: "en",
    timezone: "UTC",
    currency: "USD",
    dateFormat: "yyyy-MM-dd",
    timeFormat: "12h",
  },
  privacy: {
    showReceiptsInAnalytics: true,
    shareUsageData: false,
    allowDataExport: true,
    requirePasswordForSensitiveActions: false,
    sessionTimeout: 60,
  },
  receipts: {
    autoProcessReceipts: true,
    extractItemDetails: true,
    categorizeAutomatically: true,
    saveOriginalImages: true,
    favoriteCategories: [],
  },
};

export const CURRENCY_OPTIONS = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "MXN", name: "Mexican Peso", symbol: "$" },
];
