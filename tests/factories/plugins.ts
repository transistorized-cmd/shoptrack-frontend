/**
 * Plugin and component test data factories
 * Provides factories for plugins, jobs, and component-related test data
 */
import { faker } from "@faker-js/faker";
import { createFactory, testId, testDate, testConstants } from "./base";
import type { Plugin, PluginConfig, PluginMetadata } from "@/types/plugin";
import type { AsyncJob, JobStatus } from "@/types/job";
import type { Notification } from "@/types/notification";

/**
 * Plugin metadata factory
 */
export const pluginMetadataFactory = createFactory<PluginMetadata>(() => ({
  name: faker.company.name().replace(/\s/g, "") + "Plugin",
  version: faker.system.semver(),
  description: faker.lorem.sentence(),
  author: faker.person.fullName(),
  homepage: faker.internet.url(),
  keywords: faker.lorem.words(3).split(" "),
  license: "MIT",
  supportedFileTypes: [".jpg", ".jpeg", ".png", ".pdf"],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  processingTimeout: 30000,
  requiresInternet: faker.datatype.boolean(),
  aiPowered: faker.datatype.boolean(),
}));

/**
 * Plugin config factory
 */
export const pluginConfigFactory = createFactory<PluginConfig>(() => ({
  enabled: true,
  settings: {
    quality: faker.helpers.arrayElement(["low", "medium", "high"]),
    language: faker.helpers.arrayElement(["en", "es", "fr", "de"]),
    autoProcess: faker.datatype.boolean(),
  },
  apiKey: faker.string.alphanumeric(32),
  customEndpoint: faker.internet.url(),
  timeout: faker.number.int({ min: 5000, max: 60000 }),
}));

/**
 * Plugin factory
 */
export const pluginFactory = createFactory<Plugin>(() => ({
  id: testId.uuid(),
  name: faker.company.name().replace(/\s/g, "") + "Plugin",
  displayName: faker.company.name() + " Plugin",
  type: faker.helpers.arrayElement([
    "receipt-processor",
    "data-enhancer",
    "export-tool",
  ]),
  status: faker.helpers.arrayElement([
    "active",
    "inactive",
    "error",
    "updating",
  ]),
  version: faker.system.semver(),
  description: faker.lorem.paragraph(),
  metadata: pluginMetadataFactory.build(),
  config: pluginConfigFactory.build(),
  isBuiltIn: faker.datatype.boolean(),
  installDate: testDate.past(),
  lastUsed: testDate.recent(),
  usageCount: faker.number.int({ min: 0, max: 1000 }),
  supportedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
  iconUrl: faker.image.url(),
  thumbnailUrl: faker.image.url(),
}));

/**
 * Async job factory
 */
export const asyncJobFactory = createFactory<AsyncJob>(() => ({
  id: testId.uuid(),
  type: faker.helpers.arrayElement([
    "file-upload",
    "receipt-process",
    "data-export",
    "plugin-install",
  ]),
  status: faker.helpers.arrayElement([
    "pending",
    "running",
    "completed",
    "failed",
    "cancelled",
  ]),
  progress: faker.number.int({ min: 0, max: 100 }),
  message: faker.lorem.sentence(),
  createdAt: testDate.recent(),
  startedAt: testDate.recent(),
  completedAt: null,
  metadata: {
    filename: faker.system.fileName(),
    fileSize: faker.number.int({ min: 1024, max: 10 * 1024 * 1024 }),
    processingTime: faker.number.int({ min: 1000, max: 60000 }),
  },
  result: null,
  error: null,
}));

/**
 * Notification factory
 */
export const notificationFactory = createFactory<Notification>(() => ({
  id: testId.uuid(),
  type: faker.helpers.arrayElement(["info", "success", "warning", "error"]),
  title: faker.lorem.words(3),
  message: faker.lorem.sentence(),
  createdAt: testDate.recent(),
  isRead: faker.datatype.boolean(),
  actionUrl: faker.internet.url(),
  actionText: "View Details",
  expiresAt: testDate.future(),
  metadata: {
    source: faker.helpers.arrayElement(["system", "plugin", "user", "api"]),
    category: faker.helpers.arrayElement([
      "upload",
      "processing",
      "security",
      "account",
    ]),
  },
}));

/**
 * File upload data factory
 */
export interface FileUploadData {
  file: File;
  progress: number;
  error?: string;
  result?: any;
}

export const fileUploadDataFactory = createFactory<FileUploadData>(() => {
  // Create a mock File object
  const mockFile = new File(
    [faker.lorem.paragraphs(10)],
    faker.system.fileName({ extensionCount: 1 }),
    { type: "image/jpeg" },
  );

  return {
    file: mockFile,
    progress: faker.number.int({ min: 0, max: 100 }),
    error: undefined,
    result: undefined,
  };
});

/**
 * Plugin variants for common test scenarios
 */
export const pluginVariants = {
  /**
   * Built-in receipt processor
   */
  builtInProcessor: () =>
    pluginFactory.build({
      id: "claude-receipt-processor",
      name: "ClaudeReceiptProcessor",
      displayName: "Claude AI Receipt Processor",
      type: "receipt-processor",
      status: "active",
      isBuiltIn: true,
      config: pluginConfigFactory.build({ enabled: true }),
    }),

  /**
   * Third-party plugin
   */
  thirdParty: () =>
    pluginFactory.build({
      isBuiltIn: false,
      status: "active",
      installDate: testDate.recent(),
    }),

  /**
   * Inactive plugin
   */
  inactive: () =>
    pluginFactory.build({
      status: "inactive",
      config: pluginConfigFactory.build({ enabled: false }),
    }),

  /**
   * Plugin with error
   */
  error: () =>
    pluginFactory.build({
      status: "error",
      metadata: pluginMetadataFactory.build({
        description: "Plugin encountered an error during last operation",
      }),
    }),

  /**
   * High-usage plugin
   */
  popular: () =>
    pluginFactory.build({
      usageCount: faker.number.int({ min: 500, max: 2000 }),
      lastUsed: testDate.recent(),
    }),

  /**
   * Unused plugin
   */
  unused: () =>
    pluginFactory.build({
      usageCount: 0,
      lastUsed: null,
    }),
};

/**
 * Job variants for common test scenarios
 */
export const jobVariants = {
  /**
   * File upload job
   */
  fileUpload: () =>
    asyncJobFactory.build({
      type: "file-upload",
      status: "running",
      progress: faker.number.int({ min: 10, max: 90 }),
      message: "Uploading file...",
      metadata: {
        filename: "receipt.jpg",
        fileSize: 2048000,
      },
    }),

  /**
   * Completed upload
   */
  uploadCompleted: () =>
    asyncJobFactory.build({
      type: "file-upload",
      status: "completed",
      progress: 100,
      message: "Upload completed successfully",
      completedAt: testDate.recent(),
      result: {
        receiptId: testId.sequence(),
        processingStarted: true,
      },
    }),

  /**
   * Failed upload
   */
  uploadFailed: () =>
    asyncJobFactory.build({
      type: "file-upload",
      status: "failed",
      progress: 0,
      message: "Upload failed",
      completedAt: testDate.recent(),
      error: "File too large or invalid format",
    }),

  /**
   * Receipt processing job
   */
  receiptProcessing: () =>
    asyncJobFactory.build({
      type: "receipt-process",
      status: "running",
      progress: faker.number.int({ min: 20, max: 80 }),
      message: "Processing receipt with AI...",
    }),

  /**
   * Completed processing
   */
  processingCompleted: () =>
    asyncJobFactory.build({
      type: "receipt-process",
      status: "completed",
      progress: 100,
      message: "Receipt processed successfully",
      completedAt: testDate.recent(),
      result: {
        itemsDetected: 5,
        itemsParsed: 4,
        confidence: "high",
      },
    }),

  /**
   * Long-running job
   */
  longRunning: () =>
    asyncJobFactory.build({
      status: "running",
      createdAt: testDate.past(),
      startedAt: testDate.past(),
      progress: faker.number.int({ min: 5, max: 95 }),
      metadata: {
        processingTime: faker.number.int({ min: 60000, max: 300000 }),
      },
    }),
};

/**
 * Notification variants
 */
export const notificationVariants = {
  /**
   * Success notification
   */
  success: () =>
    notificationFactory.build({
      type: "success",
      title: "Upload Successful",
      message: "Your receipt has been uploaded and processed successfully.",
      isRead: false,
    }),

  /**
   * Error notification
   */
  error: () =>
    notificationFactory.build({
      type: "error",
      title: "Processing Failed",
      message: "There was an error processing your receipt. Please try again.",
      isRead: false,
    }),

  /**
   * Warning notification
   */
  warning: () =>
    notificationFactory.build({
      type: "warning",
      title: "Low Confidence Results",
      message:
        "Some items were detected with low confidence. Please review and correct.",
      isRead: false,
      actionUrl: "/receipts/review",
      actionText: "Review Now",
    }),

  /**
   * System notification
   */
  system: () =>
    notificationFactory.build({
      type: "info",
      title: "System Maintenance",
      message: "Scheduled maintenance will occur tonight from 2-4 AM EST.",
      metadata: {
        source: "system",
        category: "maintenance",
      },
    }),

  /**
   * Read notification
   */
  read: () =>
    notificationFactory.build({
      isRead: true,
      createdAt: testDate.past(),
    }),

  /**
   * Expired notification
   */
  expired: () =>
    notificationFactory.build({
      expiresAt: testDate.past(),
      isRead: true,
    }),
};

/**
 * Mock plugin service responses
 */
export const mockPluginServiceResponses = {
  success: {
    getAllPlugins: () => Promise.resolve(pluginFactory.buildList(5)),
    getPlugin: () => Promise.resolve(pluginVariants.builtInProcessor()),
    installPlugin: () => Promise.resolve(pluginVariants.thirdParty()),
    uninstallPlugin: () => Promise.resolve(true),
    updatePlugin: () => Promise.resolve(pluginVariants.thirdParty()),
    configurePlugin: () => Promise.resolve(pluginVariants.thirdParty()),
    detectPlugin: () => Promise.resolve(pluginVariants.builtInProcessor()),
    uploadWithAutoDetection: () =>
      Promise.resolve(jobVariants.uploadCompleted()),
  },
  error: {
    getAllPlugins: () => Promise.reject(new Error("Failed to load plugins")),
    getPlugin: () => Promise.reject(new Error("Plugin not found")),
    installPlugin: () => Promise.reject(new Error("Installation failed")),
    uninstallPlugin: () => Promise.reject(new Error("Uninstall failed")),
    updatePlugin: () => Promise.reject(new Error("Update failed")),
    configurePlugin: () => Promise.reject(new Error("Configuration invalid")),
    detectPlugin: () => Promise.reject(new Error("Detection failed")),
    uploadWithAutoDetection: () => Promise.reject(new Error("Upload failed")),
  },
};
