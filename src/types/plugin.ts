export interface ReceiptPlugin {
  key: string;
  name: string;
  description: string;
  version: string;
  supportedFileTypes: string[];
  maxFileSizeKB: number;
  icon: string;
  color: string;
  supportsManualEntry: boolean;
  supportsBatchProcessing: boolean;
  requiresImageConversion: boolean;
  type: "receipt";
}

export interface ReportPlugin {
  key: string;
  name: string;
  description: string;
  version: string;
  icon: string;
  color: string;
  category: string;
  priority: number;
  requiresDateRange: boolean;
  supportsExport: boolean;
  supportedExportFormats: string[];
  isEnabled: boolean;
  prerequisites: string[];
  type: "report";
  isAccessible?: boolean;
  isPremiumFeature?: boolean;
  accessMessage?: string;
  historyLimitDays?: number | null;
}

export interface ProcessingResult {
  receipt: Receipt;
  items: ReceiptItem[];
  success: boolean;
  message: string;
  isDuplicate: boolean;
  existingReceipt?: Receipt;
  errors: string[];
}

export interface AsyncUploadResult {
  receipt: Receipt | {};
  items: ReceiptItem[];
  success: boolean;
  message: string;
  isDuplicate: boolean;
  existingReceipt?: Receipt;
  errors: string[];
  jobId?: string;
}

export interface PluginStatistics {
  receiptPluginsCount: number;
  reportPluginsCount: number;
  receiptPlugins: Array<{
    key: string;
    name: string;
    version: string;
    supportedFileTypes: number;
    supportsManualEntry: boolean;
    supportsBatchProcessing: boolean;
  }>;
  reportPlugins: Array<{
    key: string;
    name: string;
    version: string;
    category: string;
    priority: number;
    supportsExport: boolean;
    isEnabled: boolean;
  }>;
}

import type { Receipt, ReceiptItem } from "./receipt";
