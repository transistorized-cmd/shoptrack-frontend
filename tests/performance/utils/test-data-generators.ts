import { faker } from "@faker-js/faker";
import type { Receipt, ReceiptItem } from "@/types/receipt";

/**
 * Performance test data generators with realistic scenarios
 */

export interface DataGeneratorOptions {
  count: number;
  complexity?: "simple" | "medium" | "complex";
  includeImages?: boolean;
  includeCategories?: boolean;
}

export interface PerformanceTestData {
  receipts: Receipt[];
  items: ReceiptItem[];
  totalSize: number;
  memoryFootprint: number;
}

/**
 * Generate realistic receipt items with varying complexity
 */
export function generateReceiptItems(
  receiptId: number,
  options: DataGeneratorOptions,
): ReceiptItem[] {
  const items: ReceiptItem[] = [];
  const itemCount =
    options.complexity === "simple"
      ? 5
      : options.complexity === "medium"
        ? 15
        : 30;

  for (let i = 0; i < itemCount; i++) {
    const item: ReceiptItem = {
      id: faker.number.int({ min: 1, max: 100000 }),
      receiptId,
      itemName: faker.commerce.productName(),
      quantity: faker.number.int({ min: 1, max: 5 }),
      weightOriginal: faker.helpers.arrayElement([
        "250g",
        "1kg",
        "500ml",
        "2l",
        "100g",
      ]),
      weightNormalizedKg: faker.number.float({
        min: 0.1,
        max: 5,
        fractionDigits: 3,
      }),
      unit: faker.helpers.arrayElement(["kg", "l", "pcs", "g", "ml"]),
      pricePerUnit: faker.number.float({
        min: 0.5,
        max: 50,
        fractionDigits: 2,
      }),
      totalPrice: faker.number.float({ min: 1, max: 100, fractionDigits: 2 }),
      categoryRaw: faker.commerce.department(),
      notes:
        options.complexity === "complex" ? faker.lorem.sentence() : undefined,
      confidence: faker.helpers.arrayElement([
        "low",
        "medium",
        "high",
        "manual",
      ]),
      createdAt: faker.date.recent().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
    };

    if (options.includeCategories) {
      item.category = {
        id: faker.number.int({ min: 1, max: 100 }),
        name: faker.commerce.department(),
        locale: "en-US",
      };
    }

    items.push(item);
  }

  return items;
}

/**
 * Generate realistic receipts with varying data sizes
 */
export function generateReceipts(options: DataGeneratorOptions): Receipt[] {
  const receipts: Receipt[] = [];

  for (let i = 0; i < options.count; i++) {
    const receiptId = faker.number.int({ min: 1, max: 100000 });
    const items = generateReceiptItems(receiptId, options);

    const receipt: Receipt = {
      id: receiptId,
      filename: faker.system.fileName({ extensionCount: 1 }),
      receiptDate: faker.date.recent().toISOString().split("T")[0],
      imageHash: faker.string.alphanumeric(32),
      receiptNumber: faker.string.alphanumeric(10),
      storeName: faker.company.name(),
      processingStatus: faker.helpers.arrayElement([
        "pending",
        "processing",
        "completed",
        "failed",
      ]),
      totalItemsDetected: items.length,
      successfullyParsed: Math.floor(items.length * 0.9),
      items,
      createdAt: faker.date.recent().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
    };

    if (options.complexity === "complex") {
      receipt.claudeResponseJson = {
        analysis: faker.lorem.paragraphs(3),
        confidence: faker.number.float({ min: 0.7, max: 1, fractionDigits: 2 }),
        metadata: {
          processingTime: faker.number.int({ min: 1000, max: 10000 }),
          modelVersion: faker.system.semver(),
        },
      };
      receipt.imageQualityAssessment = faker.helpers.arrayElement([
        "excellent",
        "good",
        "fair",
        "poor",
      ]);
    }

    if (options.includeImages) {
      // Generate base64-like strings to simulate image data
      receipt.imageFile = `data:image/jpeg;base64,${faker.string.alphanumeric(1000)}`;
      receipt.pngImage = `data:image/png;base64,${faker.string.alphanumeric(800)}`;
    }

    receipts.push(receipt);
  }

  return receipts;
}

/**
 * Generate performance test data with memory footprint calculation
 */
export function generatePerformanceTestData(
  options: DataGeneratorOptions,
): PerformanceTestData {
  const receipts = generateReceipts(options);
  const items = receipts.flatMap((r) => r.items || []);

  // Rough memory footprint calculation (in bytes)
  const receiptSize = receipts.length * 2000; // ~2KB per receipt
  const itemSize = items.length * 500; // ~500B per item
  const imageSize = options.includeImages ? receipts.length * 50000 : 0; // ~50KB per image

  return {
    receipts,
    items,
    totalSize: receipts.length,
    memoryFootprint: receiptSize + itemSize + imageSize,
  };
}

/**
 * Generate large dataset for stress testing
 */
export function generateLargeDataset(
  size: "small" | "medium" | "large" | "xl",
): PerformanceTestData {
  const configs = {
    small: { count: 100, complexity: "simple" as const },
    medium: { count: 500, complexity: "medium" as const },
    large: {
      count: 1000,
      complexity: "medium" as const,
      includeCategories: true,
    },
    xl: {
      count: 2500,
      complexity: "complex" as const,
      includeCategories: true,
      includeImages: true,
    },
  };

  return generatePerformanceTestData(configs[size]);
}

/**
 * Generate data for specific performance scenarios
 */
export function generateScenarioData(scenario: string): PerformanceTestData {
  switch (scenario) {
    case "virtual-scrolling":
      return generatePerformanceTestData({
        count: 10000,
        complexity: "simple",
        includeCategories: false,
      });

    case "memory-intensive":
      return generatePerformanceTestData({
        count: 1000,
        complexity: "complex",
        includeImages: true,
        includeCategories: true,
      });

    case "frequent-updates":
      return generatePerformanceTestData({
        count: 200,
        complexity: "medium",
        includeCategories: true,
      });

    default:
      return generateLargeDataset("medium");
  }
}

/**
 * Create data batches for testing batch operations
 */
export function createDataBatches<T>(data: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < data.length; i += batchSize) {
    batches.push(data.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Generate concurrent operation scenarios
 */
export function generateConcurrentScenarios(
  baseData: Receipt[],
  operations: number,
) {
  const scenarios = [];

  for (let i = 0; i < operations; i++) {
    scenarios.push({
      id: i,
      operation: faker.helpers.arrayElement([
        "create",
        "update",
        "delete",
        "fetch",
      ]),
      data: faker.helpers.arrayElement(baseData),
      delay: faker.number.int({ min: 10, max: 100 }),
    });
  }

  return scenarios;
}
