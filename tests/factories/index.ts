/**
 * Test data factories index
 * Central export point for all test data factories
 */

// Base utilities
export * from './base';
import { seedFaker } from './base';

// Auth factories
export * from './auth';

// Receipt factories
export * from './receipts';

// API factories
export * from './api';

// Plugin factories
export * from './plugins';

/**
 * Convenience factory collections for common use cases
 */
import {
  userFactory,
  userVariants,
  authResponseFactory,
  authResponseVariants,
  mockAuthServiceResponses,
  mockSettingsServiceResponses,
} from './auth';

import {
  receiptFactory,
  receiptVariants,
  receiptItemFactory,
  receiptItemVariants,
  mockReceiptsServiceResponses,
} from './receipts';

import {
  apiResponseFactory,
  apiResponseVariants,
  axiosResponseVariants,
  axiosErrorVariants,
  mockApiCalls,
} from './api';

import {
  pluginFactory,
  pluginVariants,
  jobVariants,
  notificationVariants,
  mockPluginServiceResponses,
} from './plugins';

/**
 * Quick access to commonly used factories
 */
export const factories = {
  // Users and auth
  user: userFactory,
  authResponse: authResponseFactory,

  // Receipts
  receipt: receiptFactory,
  receiptItem: receiptItemFactory,

  // API responses
  apiResponse: apiResponseFactory,

  // Plugins and jobs
  plugin: pluginFactory,
} as const;

/**
 * Quick access to commonly used variants
 */
export const variants = {
  // User variants
  users: userVariants,
  authResponses: authResponseVariants,

  // Receipt variants
  receipts: receiptVariants,
  receiptItems: receiptItemVariants,

  // API variants
  apiResponses: apiResponseVariants,
  axiosResponses: axiosResponseVariants,
  axiosErrors: axiosErrorVariants,

  // Plugin variants
  plugins: pluginVariants,
  jobs: jobVariants,
  notifications: notificationVariants,
} as const;

/**
 * Quick access to mock service responses
 */
export const mockServices = {
  auth: mockAuthServiceResponses,
  settings: mockSettingsServiceResponses,
  receipts: mockReceiptsServiceResponses,
  plugins: mockPluginServiceResponses,
  api: mockApiCalls,
} as const;

/**
 * Utility function to create a complete test user with auth response
 */
export function createTestUser(overrides?: {
  user?: Partial<Parameters<typeof userFactory.build>[0]>;
  authResponse?: Partial<Parameters<typeof authResponseFactory.build>[0]>;
}) {
  const user = userFactory.build(overrides?.user);
  const authResponse = authResponseFactory.build({
    user,
    ...overrides?.authResponse,
  });

  return { user, authResponse };
}

/**
 * Utility function to create a complete test receipt with items
 */
export function createTestReceipt(overrides?: {
  receipt?: Partial<Parameters<typeof receiptFactory.build>[0]>;
  itemCount?: number;
  itemOverrides?: Partial<Parameters<typeof receiptItemFactory.build>[0]>;
}) {
  const itemCount = overrides?.itemCount ?? 3;
  const items = receiptItemFactory.buildList(itemCount, overrides?.itemOverrides);

  const receipt = receiptFactory.build({
    totalItemsDetected: items.length,
    successfullyParsed: items.length,
    items,
    ...overrides?.receipt,
  });

  // Update item receiptIds to match
  items.forEach(item => {
    item.receiptId = receipt.id;
  });

  return { receipt, items };
}

/**
 * Utility function to reset all factory counters
 * Useful for deterministic test runs
 */
export function resetFactories() {
  // Re-seed faker for deterministic results
  seedFaker(123456);
}

/**
 * Common test scenarios as factory combinations
 */
export const testScenarios = {
  /**
   * New user registration flow
   */
  newUserRegistration: () => {
    const user = userVariants.authenticated();
    const authResponse = authResponseVariants.success();
    return { user, authResponse };
  },

  /**
   * User with uploaded receipts
   */
  userWithReceipts: (receiptCount = 5) => {
    const { user, authResponse } = createTestUser();
    const receipts = Array.from({ length: receiptCount }, () =>
      createTestReceipt().receipt
    );
    return { user, authResponse, receipts };
  },

  /**
   * Failed upload scenario
   */
  failedUpload: () => {
    const user = userVariants.authenticated();
    const job = jobVariants.uploadFailed();
    const notification = notificationVariants.error();
    return { user, job, notification };
  },

  /**
   * Successful processing scenario
   */
  successfulProcessing: () => {
    const { receipt, items } = createTestReceipt();
    const job = jobVariants.processingCompleted();
    const notification = notificationVariants.success();
    return { receipt, items, job, notification };
  },

  /**
   * Plugin management scenario
   */
  pluginManagement: () => {
    const plugins = [
      pluginVariants.builtInProcessor(),
      pluginVariants.thirdParty(),
      pluginVariants.inactive(),
    ];
    return { plugins };
  },
} as const;