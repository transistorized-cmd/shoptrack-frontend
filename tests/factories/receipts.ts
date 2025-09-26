/**
 * Receipt and receipt item test data factories
 * Provides factories for Receipt, ReceiptItem, and related receipt types
 */
import { faker } from "@faker-js/faker";
import {
  createFactory,
  testId,
  testDate,
  testMoney,
  testConstants,
} from "./base";
import type {
  Receipt,
  ReceiptItem,
  ReceiptQuery,
  PagedResult,
  ClaudeResponse,
  Category,
} from "@/types/receipt";
import type { ProcessingResult } from "@/types/plugin";

/**
 * Category factory
 */
export const categoryFactory = createFactory<Category>(() => ({
  id: testId.sequence(),
  name: faker.helpers.arrayElement([
    "Groceries",
    "Electronics",
    "Clothing",
    "Home & Garden",
    "Sports",
    "Books",
    "Health",
    "Automotive",
  ]),
  locale: "en",
}));

/**
 * Claude response factory
 */
export const claudeResponseFactory = createFactory<ClaudeResponse>(() => ({
  storeName: faker.company.name(),
  receiptDate: testDate.today(),
  items: [],
  confidence: faker.helpers.arrayElement(["low", "medium", "high"]),
  processingTime: faker.number.int({ min: 1000, max: 30000 }),
  imageQuality: faker.helpers.arrayElement([
    "poor",
    "fair",
    "good",
    "excellent",
  ]),
}));

/**
 * Receipt item factory
 */
export const receiptItemFactory = createFactory<ReceiptItem>(() => ({
  id: testId.sequence(),
  receiptId: testId.sequence(),
  itemName: faker.commerce.productName(),
  quantity: faker.number.int({ min: 1, max: 10 }),
  weightOriginal: `${faker.number.float({ min: 0.1, max: 5, fractionDigits: 2 })}kg`,
  weightNormalizedKg: faker.number.float({
    min: 0.1,
    max: 5,
    fractionDigits: 2,
  }),
  unit: faker.helpers.arrayElement(["kg", "g", "lb", "oz", "piece", "pack"]),
  pricePerUnit: testMoney.price(),
  totalPrice: testMoney.price(),
  category: categoryFactory.build(),
  categoryRaw: faker.commerce.department(),
  notes: faker.lorem.sentence(),
  confidence: faker.helpers.arrayElement(["low", "medium", "high", "manual"]),
  createdAt: testDate.recent(),
  updatedAt: testDate.recent(),
}));

/**
 * Receipt factory
 */
export const receiptFactory = createFactory<Receipt>(() => {
  const items = receiptItemFactory.buildList(
    faker.number.int({ min: 1, max: 8 }),
  );
  const itemsDetected = items.length;
  const successfullyParsed = faker.number.int({
    min: Math.floor(itemsDetected * 0.7),
    max: itemsDetected,
  });

  return {
    id: testId.sequence(),
    filename: `receipt-${testId.sequence()}.jpg`,
    receiptDate: testDate.today(),
    imageHash: faker.string.alphanumeric(32),
    receiptNumber: faker.string.alphanumeric(8).toUpperCase(),
    storeName: faker.company.name(),
    processingStatus: faker.helpers.arrayElement([
      "pending",
      "processing",
      "completed",
      "failed",
    ]),
    claudeResponseJson: claudeResponseFactory.build(),
    imageQualityAssessment: faker.helpers.arrayElement([
      "poor",
      "fair",
      "good",
      "excellent",
    ]),
    totalItemsDetected: itemsDetected,
    successfullyParsed,
    imageFile: `receipts/${testId.uuid()}.jpg`,
    pngImage: `receipts/${testId.uuid()}.png`,
    items,
    createdAt: testDate.recent(),
    updatedAt: testDate.recent(),
  };
});

/**
 * Receipt query factory
 */
export const receiptQueryFactory = createFactory<ReceiptQuery>(() => ({
  page: 1,
  pageSize: 20,
  sortBy: "createdAt",
  sortOrder: "desc",
  searchTerm: "",
  category: "",
  dateFrom: "",
  dateTo: "",
  processingStatus: "",
  minAmount: 0,
  maxAmount: 1000,
}));

/**
 * Paged result factory
 */
export const pagedResultFactory = createFactory<PagedResult<Receipt>>(() => {
  const items = receiptFactory.buildList(5);
  return {
    items,
    totalCount: items.length,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  };
});

/**
 * Processing result factory
 */
export const processingResultFactory = createFactory<ProcessingResult>(() => ({
  success: true,
  receiptId: testId.sequence(),
  message: "Receipt processed successfully",
  processingTime: faker.number.int({ min: 1000, max: 30000 }),
  itemsDetected: faker.number.int({ min: 1, max: 10 }),
  itemsParsed: faker.number.int({ min: 1, max: 8 }),
  confidence: faker.helpers.arrayElement(["low", "medium", "high"]),
  errors: [],
  warnings: [],
}));

/**
 * Predefined receipt variants for common test scenarios
 */
export const receiptVariants = {
  /**
   * Simple completed receipt
   */
  completed: () =>
    receiptFactory.build({
      id: 1,
      filename: testConstants.TEST_FILENAME,
      processingStatus: testConstants.PROCESSING_STATUS.COMPLETED,
      storeName: "Test Store",
      receiptDate: testDate.fixed(),
      totalItemsDetected: 3,
      successfullyParsed: 3,
      items: receiptItemFactory.buildList(3),
    }),

  /**
   * Receipt with processing pending
   */
  pending: () =>
    receiptFactory.build({
      processingStatus: testConstants.PROCESSING_STATUS.PENDING,
      totalItemsDetected: 0,
      successfullyParsed: 0,
      items: [],
      claudeResponseJson: undefined,
    }),

  /**
   * Receipt currently being processed
   */
  processing: () =>
    receiptFactory.build({
      processingStatus: testConstants.PROCESSING_STATUS.PROCESSING,
      totalItemsDetected: 0,
      successfullyParsed: 0,
      items: [],
    }),

  /**
   * Failed receipt processing
   */
  failed: () =>
    receiptFactory.build({
      processingStatus: testConstants.PROCESSING_STATUS.FAILED,
      totalItemsDetected: 0,
      successfullyParsed: 0,
      items: [],
      claudeResponseJson: undefined,
      imageQualityAssessment: "poor",
    }),

  /**
   * Receipt with no items detected
   */
  noItems: () =>
    receiptFactory.build({
      processingStatus: testConstants.PROCESSING_STATUS.COMPLETED,
      totalItemsDetected: 0,
      successfullyParsed: 0,
      items: [],
    }),

  /**
   * Receipt with partial parsing success
   */
  partialSuccess: () =>
    receiptFactory.build({
      processingStatus: testConstants.PROCESSING_STATUS.COMPLETED,
      totalItemsDetected: 10,
      successfullyParsed: 6,
      items: receiptItemFactory.buildList(6),
    }),

  /**
   * Receipt with high-confidence items
   */
  highConfidence: () =>
    receiptFactory.build({
      processingStatus: testConstants.PROCESSING_STATUS.COMPLETED,
      items: receiptItemFactory.buildList(3, {
        confidence: testConstants.CONFIDENCE_LEVELS.HIGH,
      }),
      claudeResponseJson: claudeResponseFactory.build({
        confidence: testConstants.CONFIDENCE_LEVELS.HIGH,
      }),
    }),

  /**
   * Receipt with low-confidence items
   */
  lowConfidence: () =>
    receiptFactory.build({
      processingStatus: testConstants.PROCESSING_STATUS.COMPLETED,
      items: receiptItemFactory.buildList(3, {
        confidence: testConstants.CONFIDENCE_LEVELS.LOW,
      }),
      claudeResponseJson: claudeResponseFactory.build({
        confidence: testConstants.CONFIDENCE_LEVELS.LOW,
      }),
    }),

  /**
   * Large receipt with many items
   */
  large: () =>
    receiptFactory.build({
      processingStatus: testConstants.PROCESSING_STATUS.COMPLETED,
      totalItemsDetected: 20,
      successfullyParsed: 18,
      items: receiptItemFactory.buildList(18),
    }),

  /**
   * Grocery store receipt
   */
  grocery: () =>
    receiptFactory.build({
      storeName: "SuperMarket Plus",
      processingStatus: testConstants.PROCESSING_STATUS.COMPLETED,
      items: receiptItemFactory.buildList(5, {
        category: categoryFactory.build({ name: "Groceries" }),
      }),
    }),
};

/**
 * Predefined receipt item variants
 */
export const receiptItemVariants = {
  /**
   * Simple grocery item
   */
  groceryItem: () =>
    receiptItemFactory.build({
      id: 1,
      receiptId: 1,
      itemName: "Organic Bananas",
      quantity: 3,
      totalPrice: testMoney.fixed(),
      category: categoryFactory.build({ name: "Groceries" }),
      confidence: testConstants.CONFIDENCE_LEVELS.HIGH,
    }),

  /**
   * Electronics item
   */
  electronicsItem: () =>
    receiptItemFactory.build({
      itemName: "Bluetooth Headphones",
      quantity: 1,
      totalPrice: testMoney.large(),
      category: categoryFactory.build({ name: "Electronics" }),
      confidence: testConstants.CONFIDENCE_LEVELS.HIGH,
    }),

  /**
   * Item with weight measurement
   */
  weightedItem: () =>
    receiptItemFactory.build({
      itemName: "Ground Beef",
      quantity: 1,
      weightOriginal: "0.8kg",
      weightNormalizedKg: 0.8,
      unit: "kg",
      pricePerUnit: 12.99,
      totalPrice: 10.39,
      category: categoryFactory.build({ name: "Groceries" }),
    }),

  /**
   * Manually edited item
   */
  manualItem: () =>
    receiptItemFactory.build({
      confidence: testConstants.CONFIDENCE_LEVELS.MANUAL,
      notes: "Manually corrected by user",
    }),

  /**
   * Low confidence item needing review
   */
  needsReview: () =>
    receiptItemFactory.build({
      confidence: testConstants.CONFIDENCE_LEVELS.LOW,
      itemName: "Unclear Item Name",
      category: undefined,
    }),
};

/**
 * Mock receipts service responses
 */
export const mockReceiptsServiceResponses = {
  /**
   * Successful operations
   */
  success: {
    getReceipts: () => Promise.resolve(pagedResultFactory.build()),
    getReceipt: () => Promise.resolve(receiptVariants.completed()),
    uploadReceipt: () => Promise.resolve(processingResultFactory.build()),
    updateReceipt: () => Promise.resolve(receiptVariants.completed()),
    deleteReceipt: () => Promise.resolve(true),
    updateReceiptItem: () => Promise.resolve(receiptItemVariants.groceryItem()),
    deleteReceiptItem: () => Promise.resolve(true),
    searchReceipts: () => Promise.resolve(pagedResultFactory.build()),
    getReceiptStats: () =>
      Promise.resolve({
        totalReceipts: 50,
        totalItems: 250,
        totalAmount: 1250.99,
        averageAmount: 25.02,
      }),
  },

  /**
   * Error operations
   */
  error: {
    getReceipts: () => Promise.reject(new Error("Failed to fetch receipts")),
    getReceipt: () => Promise.reject(new Error("Receipt not found")),
    uploadReceipt: () => Promise.reject(new Error("Upload failed")),
    updateReceipt: () => Promise.reject(new Error("Update failed")),
    deleteReceipt: () => Promise.reject(new Error("Delete failed")),
    updateReceiptItem: () => Promise.reject(new Error("Item update failed")),
    deleteReceiptItem: () => Promise.reject(new Error("Item delete failed")),
    searchReceipts: () => Promise.reject(new Error("Search failed")),
    getReceiptStats: () => Promise.reject(new Error("Stats unavailable")),
  },
};
