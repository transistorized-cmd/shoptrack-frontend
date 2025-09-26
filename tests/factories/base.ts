/**
 * Base test data factory utilities
 * Provides core factory patterns and helpers for generating test data
 */
import { faker } from "@faker-js/faker";

/**
 * Base factory interface for type-safe factory creation
 */
export interface Factory<T> {
  build(overrides?: Partial<T>): T;
  buildList(count: number, overrides?: Partial<T>): T[];
}

/**
 * Creates a factory function that builds objects with default values and optional overrides
 */
export function createFactory<T>(defaults: () => T): Factory<T> {
  return {
    build(overrides?: Partial<T>): T {
      return {
        ...defaults(),
        ...overrides,
      };
    },
    buildList(count: number, overrides?: Partial<T>): T[] {
      return Array.from({ length: count }, () => this.build(overrides));
    },
  };
}

/**
 * Utility for generating consistent test IDs
 */
export const testId = {
  /**
   * Generate a sequential ID starting from 1
   */
  sequence: (() => {
    let counter = 0;
    return () => ++counter;
  })(),

  /**
   * Generate a random integer ID
   */
  random: () => faker.number.int({ min: 1, max: 999999 }),

  /**
   * Generate a UUID string
   */
  uuid: () => faker.string.uuid(),
};

/**
 * Utility for generating consistent test dates
 */
export const testDate = {
  /**
   * ISO string for a recent date
   */
  recent: () => faker.date.recent({ days: 30 }).toISOString(),

  /**
   * ISO string for a past date
   */
  past: () => faker.date.past({ years: 1 }).toISOString(),

  /**
   * ISO string for a future date
   */
  future: () => faker.date.future({ years: 1 }).toISOString(),

  /**
   * Today's date in YYYY-MM-DD format
   */
  today: () => new Date().toISOString().split("T")[0],

  /**
   * Specific date in ISO format
   */
  fixed: (date = "2024-01-15T10:00:00Z") => date,
};

/**
 * Utility for generating test email addresses
 */
export const testEmail = {
  /**
   * Generate a fake email address
   */
  fake: () => faker.internet.email(),

  /**
   * Generate a test email with specific domain
   */
  withDomain: (domain = "example.com") =>
    `${faker.internet.userName()}@${domain}`,

  /**
   * Fixed test email for consistent tests
   */
  fixed: (email = "test@example.com") => email,
};

/**
 * Utility for generating monetary values
 */
export const testMoney = {
  /**
   * Random price between min and max
   */
  price: (min = 1, max = 100) =>
    parseFloat(faker.number.float({ min, max, fractionDigits: 2 }).toFixed(2)),

  /**
   * Small price (under $10)
   */
  small: () => testMoney.price(0.5, 9.99),

  /**
   * Medium price ($10-$50)
   */
  medium: () => testMoney.price(10, 50),

  /**
   * Large price (over $50)
   */
  large: () => testMoney.price(50, 500),

  /**
   * Fixed price for consistent tests
   */
  fixed: (amount = 10.99) => amount,
};

/**
 * Common test constants
 */
export const testConstants = {
  // Common test strings
  TEST_STRING: "test-string",
  TEST_NAME: "Test Name",
  TEST_DESCRIPTION: "Test Description",

  // File constants
  TEST_FILENAME: "test-file.jpg",
  TEST_IMAGE_HASH: "abc123def456",

  // Status values
  PROCESSING_STATUS: {
    PENDING: "pending" as const,
    PROCESSING: "processing" as const,
    COMPLETED: "completed" as const,
    FAILED: "failed" as const,
  },

  CONFIDENCE_LEVELS: {
    LOW: "low" as const,
    MEDIUM: "medium" as const,
    HIGH: "high" as const,
    MANUAL: "manual" as const,
  },

  // Provider types
  OAUTH_PROVIDERS: {
    GOOGLE: "google" as const,
    APPLE: "apple" as const,
    MICROSOFT: "microsoft" as const,
  },
} as const;

/**
 * Reset faker seed for deterministic tests
 */
export function seedFaker(seed = 123456) {
  faker.seed(seed);
}

/**
 * Create a deep clone of an object for test mutations
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Assert that all required fields are present in test data
 */
export function assertRequiredFields<T>(
  obj: T,
  requiredFields: (keyof T)[],
): void {
  for (const field of requiredFields) {
    if (obj[field] === undefined || obj[field] === null) {
      throw new Error(
        `Required field '${String(field)}' is missing from test object`,
      );
    }
  }
}
