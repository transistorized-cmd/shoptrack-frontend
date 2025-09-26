import { test, expect, Page } from "@playwright/test";
import {
  AuthPage,
  UploadPage,
  ReceiptsPage,
  DashboardPage,
  TEST_USERS,
  waitForPageLoad,
  takeScreenshot,
  expectToastMessage,
  waitForApiResponse,
  mockApiResponse,
  simulateSlowNetwork,
  measurePageLoadTime,
} from "../utils/test-helpers";
import path from "path";

test.describe("Receipt Upload and Processing Critical Paths", () => {
  let authPage: AuthPage;
  let uploadPage: UploadPage;
  let receiptsPage: ReceiptsPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    uploadPage = new UploadPage(page);
    receiptsPage = new ReceiptsPage(page);
    dashboardPage = new DashboardPage(page);

    // Login before each test
    await authPage.goto();
    await authPage.login(
      TEST_USERS.STANDARD_USER.email,
      TEST_USERS.STANDARD_USER.password,
    );
    await page.waitForSelector('[data-testid="dashboard"]');
  });

  test.describe("Single File Upload", () => {
    test("should upload single receipt image successfully", async ({
      page,
    }) => {
      await uploadPage.goto();

      // Mock successful upload response
      await mockApiResponse(page, "**/api/receipts/upload", {
        success: true,
        receiptId: "receipt-123",
        fileName: "grocery-receipt.jpg",
        processedData: {
          merchant: "Grocery Store",
          total: 45.67,
          date: "2024-01-15",
          items: [
            { name: "Milk", price: 3.99 },
            { name: "Bread", price: 2.5 },
            { name: "Eggs", price: 4.25 },
          ],
        },
      });

      const startTime = Date.now();

      // Upload file
      await uploadPage.uploadFile("grocery-receipt.jpg");

      // Wait for upload completion
      await page.waitForSelector('[data-testid="upload-success"]', {
        timeout: 30000,
      });
      const uploadTime = Date.now() - startTime;

      // Verify success message
      await expectToastMessage(page, /upload.*successful|receipt.*processed/i);

      // Verify processed data is displayed
      await expect(
        page.locator('[data-testid="processed-merchant"]'),
      ).toContainText("Grocery Store");
      await expect(
        page.locator('[data-testid="processed-total"]'),
      ).toContainText("45.67");

      // Verify receipt items are shown
      const itemElements = page.locator('[data-testid="processed-item"]');
      await expect(itemElements).toHaveCount(3);

      // Performance check
      expect(uploadTime).toBeLessThan(15000); // Should complete within 15 seconds

      // Take screenshot for visual validation
      await takeScreenshot(page, "upload-success");

      // Verify receipt appears in receipts list
      await receiptsPage.goto();
      const receipts = await receiptsPage.getReceiptCount();
      expect(receipts).toBeGreaterThan(0);

      console.log(`✅ Single file upload completed in ${uploadTime}ms`);
    });

    test("should handle different image formats", async ({ page }) => {
      const imageFormats = ["receipt.jpg", "receipt.png", "receipt.pdf"];

      for (const format of imageFormats) {
        await uploadPage.goto();

        // Mock response for each format
        await mockApiResponse(page, "**/api/receipts/upload", {
          success: true,
          receiptId: `receipt-${format}`,
          fileName: format,
          processedData: {
            merchant: `Store for ${format}`,
            total: 25.99,
            date: "2024-01-15",
          },
        });

        await uploadPage.uploadFile(format);

        // Wait for upload success
        await page.waitForSelector('[data-testid="upload-success"]', {
          timeout: 20000,
        });
        await expectToastMessage(page, /upload.*successful/i);

        console.log(`✅ Successfully uploaded ${format}`);
      }
    });

    test("should handle large file uploads", async ({ page }) => {
      await uploadPage.goto();

      // Mock slow upload response to test progress
      await page.route("**/api/receipts/upload", async (route) => {
        // Simulate slow upload
        await new Promise((resolve) => setTimeout(resolve, 3000));
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            receiptId: "large-receipt-123",
            fileName: "large-receipt.jpg",
            processedData: {
              merchant: "Large Store",
              total: 156.78,
              date: "2024-01-15",
            },
          }),
        });
      });

      const startTime = Date.now();

      // Upload large file
      await uploadPage.uploadFile("large-receipt.jpg");

      // Verify progress indicator appears
      await expect(
        page.locator('[data-testid="upload-progress"]'),
      ).toBeVisible();

      // Monitor progress
      let progressVisible = true;
      while (progressVisible) {
        try {
          await page.waitForSelector('[data-testid="upload-progress"]', {
            timeout: 500,
          });
          const progress = await uploadPage.getUploadProgress();
          expect(progress).toBeGreaterThanOrEqual(0);
          expect(progress).toBeLessThanOrEqual(100);
        } catch {
          progressVisible = false;
        }
      }

      // Wait for completion
      await page.waitForSelector('[data-testid="upload-success"]', {
        timeout: 30000,
      });
      const uploadTime = Date.now() - startTime;

      expect(uploadTime).toBeGreaterThan(2500); // Should take at least the mocked delay
      expect(uploadTime).toBeLessThan(35000); // But not too much longer

      console.log(`✅ Large file upload completed in ${uploadTime}ms`);
    });

    test("should validate file types and sizes", async ({ page }) => {
      await uploadPage.goto();

      // Test invalid file type
      await uploadPage.uploadFile("invalid-file.txt");

      // Should show error
      await page.waitForSelector('[data-testid="upload-error"]', {
        timeout: 10000,
      });
      const errorMessage = await page
        .locator('[data-testid="upload-error"]')
        .textContent();
      expect(errorMessage).toMatch(/invalid.*file.*type|unsupported.*format/i);

      // Test file too large (mock response)
      await mockApiResponse(page, "**/api/receipts/upload", {
        success: false,
        error: "File too large",
        maxSize: "10MB",
      });

      await uploadPage.uploadFile("too-large-receipt.jpg");
      await page.waitForSelector('[data-testid="upload-error"]');
      const sizeErrorMessage = await page
        .locator('[data-testid="upload-error"]')
        .textContent();
      expect(sizeErrorMessage).toMatch(/too.*large|size.*limit|10MB/i);
    });
  });

  test.describe("Multiple File Upload", () => {
    test("should upload multiple receipts simultaneously", async ({ page }) => {
      await uploadPage.goto();

      const files = ["receipt1.jpg", "receipt2.png", "receipt3.pdf"];

      // Mock responses for each file
      files.forEach((file, index) => {
        mockApiResponse(page, `**/api/receipts/upload/${index}`, {
          success: true,
          receiptId: `receipt-${index}`,
          fileName: file,
          processedData: {
            merchant: `Store ${index + 1}`,
            total: (index + 1) * 25.99,
            date: "2024-01-15",
          },
        });
      });

      const startTime = Date.now();

      // Upload multiple files
      await uploadPage.uploadMultipleFiles(files);

      // Wait for all uploads to complete
      await page.waitForSelector('[data-testid="all-uploads-complete"]', {
        timeout: 60000,
      });
      const totalUploadTime = Date.now() - startTime;

      // Verify all files were processed
      const successElements = page.locator(
        '[data-testid="upload-success-item"]',
      );
      await expect(successElements).toHaveCount(files.length);

      // Check each upload result
      for (let i = 0; i < files.length; i++) {
        const uploadItem = successElements.nth(i);
        await expect(uploadItem).toContainText(files[i]);
        await expect(uploadItem).toContainText(`Store ${i + 1}`);
      }

      // Performance check - parallel uploads should be faster than sequential
      const estimatedSequentialTime = files.length * 5000; // 5 seconds per file
      expect(totalUploadTime).toBeLessThan(estimatedSequentialTime);

      console.log(
        `✅ Multiple file upload (${files.length} files) completed in ${totalUploadTime}ms`,
      );
    });

    test("should handle partial failures in batch upload", async ({ page }) => {
      await uploadPage.goto();

      const files = ["success1.jpg", "fail.jpg", "success2.png"];

      // Mock mixed success/failure responses
      await page.route("**/api/receipts/upload", (route) => {
        const url = route.request().url();

        if (url.includes("fail.jpg")) {
          route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({
              success: false,
              error: "Processing failed",
              fileName: "fail.jpg",
            }),
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              receiptId: "success-receipt",
              fileName: route.request().url().split("/").pop(),
              processedData: {
                merchant: "Success Store",
                total: 29.99,
                date: "2024-01-15",
              },
            }),
          });
        }
      });

      await uploadPage.uploadMultipleFiles(files);

      // Wait for all uploads to finish (success and failure)
      await page.waitForSelector('[data-testid="batch-upload-complete"]', {
        timeout: 60000,
      });

      // Verify partial success
      const successElements = page.locator(
        '[data-testid="upload-success-item"]',
      );
      const failureElements = page.locator(
        '[data-testid="upload-failure-item"]',
      );

      await expect(successElements).toHaveCount(2); // success1.jpg and success2.png
      await expect(failureElements).toHaveCount(1); // fail.jpg

      // Verify failure message
      await expect(failureElements.first()).toContainText("fail.jpg");
      await expect(failureElements.first()).toContainText(
        /processing.*failed|error/i,
      );

      // Verify retry option for failed uploads
      await expect(
        page.locator('[data-testid="retry-failed-uploads"]'),
      ).toBeVisible();
    });

    test("should show upload queue and progress for multiple files", async ({
      page,
    }) => {
      await uploadPage.goto();

      const files = ["queue1.jpg", "queue2.jpg", "queue3.jpg", "queue4.jpg"];

      // Mock slow responses to observe queue
      await page.route("**/api/receipts/upload", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            receiptId: "queued-receipt",
            fileName: route.request().url().split("/").pop(),
            processedData: {
              merchant: "Queue Store",
              total: 15.99,
              date: "2024-01-15",
            },
          }),
        });
      });

      await uploadPage.uploadMultipleFiles(files);

      // Verify upload queue is visible
      await expect(page.locator('[data-testid="upload-queue"]')).toBeVisible();

      // Check queue items
      const queueItems = page.locator('[data-testid="queue-item"]');
      await expect(queueItems).toHaveCount(files.length);

      // Monitor queue progress
      for (let i = 0; i < files.length; i++) {
        // Wait for each item to start processing
        await expect(
          queueItems.nth(i).locator('[data-testid="item-status"]'),
        ).toContainText(/processing|uploading/i, { timeout: 30000 });

        // Wait for completion
        await expect(
          queueItems.nth(i).locator('[data-testid="item-status"]'),
        ).toContainText(/complete|success/i, { timeout: 30000 });
      }

      // Verify overall progress
      await expect(
        page.locator('[data-testid="overall-progress"]'),
      ).toContainText("100%");
    });
  });

  test.describe("Drag and Drop Upload", () => {
    test("should handle drag and drop file upload", async ({ page }) => {
      await uploadPage.goto();

      // Mock successful upload
      await mockApiResponse(page, "**/api/receipts/upload", {
        success: true,
        receiptId: "dragdrop-receipt",
        fileName: "dragged-receipt.jpg",
        processedData: {
          merchant: "Drag Store",
          total: 33.45,
          date: "2024-01-15",
        },
      });

      // Simulate drag and drop
      const dropZone = page.locator('[data-testid="dropzone"]');
      await expect(dropZone).toBeVisible();

      // Create a file for dragging
      const filePath = path.join(__dirname, "../fixtures/dragged-receipt.jpg");

      // Simulate file drop
      await dropZone.dispatchEvent("dragover", {
        dataTransfer: {
          files: [
            {
              name: "dragged-receipt.jpg",
              type: "image/jpeg",
              size: 1024 * 1024, // 1MB
            },
          ],
        },
      });

      await dropZone.dispatchEvent("drop", {
        dataTransfer: {
          files: [
            {
              name: "dragged-receipt.jpg",
              type: "image/jpeg",
              size: 1024 * 1024,
            },
          ],
        },
      });

      // Wait for upload to complete
      await page.waitForSelector('[data-testid="upload-success"]', {
        timeout: 20000,
      });
      await expectToastMessage(page, /upload.*successful/i);

      // Verify processed data
      await expect(
        page.locator('[data-testid="processed-merchant"]'),
      ).toContainText("Drag Store");
    });

    test("should show drag feedback and validation", async ({ page }) => {
      await uploadPage.goto();

      const dropZone = page.locator('[data-testid="dropzone"]');

      // Test drag over effect
      await dropZone.dispatchEvent("dragover");
      await expect(dropZone).toHaveClass(/drag-over|hover/);

      // Test drag leave
      await dropZone.dispatchEvent("dragleave");
      await expect(dropZone).not.toHaveClass(/drag-over|hover/);

      // Test invalid file type drop
      await dropZone.dispatchEvent("drop", {
        dataTransfer: {
          files: [
            {
              name: "invalid.txt",
              type: "text/plain",
              size: 1024,
            },
          ],
        },
      });

      // Should show validation error
      await expect(
        page.locator('[data-testid="dropzone-error"]'),
      ).toContainText(/invalid.*file.*type/i);
    });
  });

  test.describe("Receipt Processing and OCR", () => {
    test("should process receipt data accurately", async ({ page }) => {
      await uploadPage.goto();

      const expectedData = {
        merchant: "Target Store #1234",
        total: 127.83,
        date: "2024-01-15",
        items: [
          { name: "Bananas", price: 2.99, quantity: 1 },
          { name: "Milk 2%", price: 4.59, quantity: 1 },
          { name: "Bread Whole Wheat", price: 3.49, quantity: 2 },
          { name: "Tax", price: 8.76, quantity: 1 },
        ],
        category: "Groceries",
        paymentMethod: "Credit Card",
      };

      await mockApiResponse(page, "**/api/receipts/upload", {
        success: true,
        receiptId: "processed-receipt-123",
        fileName: "detailed-receipt.jpg",
        processedData: expectedData,
        confidence: 95.6,
        processingTime: 2.3,
      });

      await uploadPage.uploadFile("detailed-receipt.jpg");

      // Wait for processing to complete
      await page.waitForSelector('[data-testid="processing-complete"]', {
        timeout: 30000,
      });

      // Verify all extracted data
      await expect(
        page.locator('[data-testid="processed-merchant"]'),
      ).toContainText(expectedData.merchant);
      await expect(
        page.locator('[data-testid="processed-total"]'),
      ).toContainText(expectedData.total.toString());
      await expect(
        page.locator('[data-testid="processed-date"]'),
      ).toContainText("2024-01-15");
      await expect(
        page.locator('[data-testid="processed-category"]'),
      ).toContainText(expectedData.category);

      // Verify line items
      const itemElements = page.locator('[data-testid="processed-item"]');
      await expect(itemElements).toHaveCount(expectedData.items.length);

      for (let i = 0; i < expectedData.items.length; i++) {
        const item = itemElements.nth(i);
        await expect(item.locator('[data-testid="item-name"]')).toContainText(
          expectedData.items[i].name,
        );
        await expect(item.locator('[data-testid="item-price"]')).toContainText(
          expectedData.items[i].price.toString(),
        );
      }

      // Verify confidence score
      await expect(
        page.locator('[data-testid="confidence-score"]'),
      ).toContainText("95.6%");

      // Allow manual corrections
      await expect(page.locator('[data-testid="edit-receipt"]')).toBeVisible();
    });

    test("should handle low-quality images with reduced confidence", async ({
      page,
    }) => {
      await uploadPage.goto();

      await mockApiResponse(page, "**/api/receipts/upload", {
        success: true,
        receiptId: "low-quality-receipt",
        fileName: "blurry-receipt.jpg",
        processedData: {
          merchant: "Store Name Unclear",
          total: 0.0, // Could not read total
          date: null,
          items: [],
          warnings: ["Image quality too low", "Text unclear"],
        },
        confidence: 34.2,
        needsReview: true,
      });

      await uploadPage.uploadFile("blurry-receipt.jpg");

      await page.waitForSelector('[data-testid="processing-complete"]', {
        timeout: 30000,
      });

      // Should show warning about low confidence
      await expect(
        page.locator('[data-testid="low-confidence-warning"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="confidence-score"]'),
      ).toContainText("34.2%");

      // Should prompt for manual review
      await expect(page.locator('[data-testid="needs-review"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="manual-entry-prompt"]'),
      ).toBeVisible();

      // Verify warnings are displayed
      const warnings = page.locator('[data-testid="processing-warning"]');
      await expect(warnings).toHaveCount(2);
    });

    test("should allow manual editing of processed data", async ({ page }) => {
      await uploadPage.goto();

      await mockApiResponse(page, "**/api/receipts/upload", {
        success: true,
        receiptId: "editable-receipt",
        fileName: "receipt-to-edit.jpg",
        processedData: {
          merchant: "Wrong Store Name",
          total: 50.0,
          date: "2024-01-15",
          items: [{ name: "Wrong Item", price: 50.0 }],
        },
      });

      await uploadPage.uploadFile("receipt-to-edit.jpg");
      await page.waitForSelector('[data-testid="processing-complete"]');

      // Start editing
      await page.click('[data-testid="edit-receipt"]');

      // Edit merchant name
      await page.fill('[data-testid="edit-merchant"]', "Corrected Store Name");

      // Edit total
      await page.fill('[data-testid="edit-total"]', "75.50");

      // Edit item
      await page.fill(
        '[data-testid="edit-item-name-0"]',
        "Corrected Item Name",
      );
      await page.fill('[data-testid="edit-item-price-0"]', "75.50");

      // Save changes
      await page.click('[data-testid="save-edits"]');

      // Wait for save confirmation
      await expectToastMessage(page, /changes.*saved|updated.*successfully/i);

      // Verify changes are reflected
      await expect(
        page.locator('[data-testid="processed-merchant"]'),
      ).toContainText("Corrected Store Name");
      await expect(
        page.locator('[data-testid="processed-total"]'),
      ).toContainText("75.50");
    });
  });

  test.describe("Upload Error Handling", () => {
    test("should handle network errors during upload", async ({ page }) => {
      await uploadPage.goto();

      // Simulate network error
      await page.route("**/api/receipts/upload", (route) => {
        route.abort("failed");
      });

      await uploadPage.uploadFile("network-error-receipt.jpg");

      // Should show network error
      await page.waitForSelector('[data-testid="upload-error"]', {
        timeout: 15000,
      });
      const errorMessage = await page
        .locator('[data-testid="upload-error"]')
        .textContent();
      expect(errorMessage).toMatch(/network.*error|connection.*failed/i);

      // Should show retry option
      await expect(page.locator('[data-testid="retry-upload"]')).toBeVisible();

      // Test retry functionality
      await mockApiResponse(page, "**/api/receipts/upload", {
        success: true,
        receiptId: "retry-success",
        fileName: "network-error-receipt.jpg",
      });

      await page.click('[data-testid="retry-upload"]');
      await page.waitForSelector('[data-testid="upload-success"]');
      await expectToastMessage(page, /upload.*successful/i);
    });

    test("should handle server errors during processing", async ({ page }) => {
      await uploadPage.goto();

      // Mock server error
      await page.route("**/api/receipts/upload", (route) => {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Internal server error",
            message: "Receipt processing service unavailable",
          }),
        });
      });

      await uploadPage.uploadFile("server-error-receipt.jpg");

      await page.waitForSelector('[data-testid="upload-error"]', {
        timeout: 15000,
      });
      const errorMessage = await page
        .locator('[data-testid="upload-error"]')
        .textContent();
      expect(errorMessage).toMatch(/server.*error|processing.*unavailable/i);

      // Should offer alternative options
      await expect(
        page.locator('[data-testid="manual-entry-option"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="try-later-option"]'),
      ).toBeVisible();
    });

    test("should handle timeout during long processing", async ({ page }) => {
      await uploadPage.goto();

      // Mock very slow response
      await page.route("**/api/receipts/upload", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 35000)); // 35 second delay
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            receiptId: "timeout-test",
          }),
        });
      });

      await uploadPage.uploadFile("slow-processing-receipt.jpg");

      // Should show timeout error (if client-side timeout is set)
      await page.waitForSelector(
        '[data-testid="upload-error"], [data-testid="upload-timeout"]',
        { timeout: 40000 },
      );

      const errorOrTimeout = await page
        .locator('[data-testid="upload-error"], [data-testid="upload-timeout"]')
        .textContent();
      expect(errorOrTimeout).toMatch(/timeout|taking.*longer|try.*again/i);
    });
  });

  test.describe("Integration with Receipt Management", () => {
    test("should seamlessly transition from upload to receipt management", async ({
      page,
    }) => {
      await uploadPage.goto();

      await mockApiResponse(page, "**/api/receipts/upload", {
        success: true,
        receiptId: "integration-receipt-123",
        fileName: "integration-test.jpg",
        processedData: {
          merchant: "Integration Store",
          total: 89.99,
          date: "2024-01-15",
          category: "Shopping",
        },
      });

      // Upload receipt
      await uploadPage.uploadFile("integration-test.jpg");
      await page.waitForSelector('[data-testid="upload-success"]');

      // Click "View Receipt" button
      await page.click('[data-testid="view-receipt"]');

      // Should navigate to receipt detail page
      await page.waitForURL(/\/receipts\/integration-receipt-123/);
      await expect(
        page.locator('[data-testid="receipt-detail"]'),
      ).toBeVisible();

      // Verify receipt data is displayed
      await expect(
        page.locator('[data-testid="receipt-merchant"]'),
      ).toContainText("Integration Store");
      await expect(page.locator('[data-testid="receipt-total"]')).toContainText(
        "89.99",
      );

      // Test navigation to receipts list
      await page.click('[data-testid="back-to-receipts"]');
      await page.waitForURL("/receipts");

      // Verify new receipt appears in list
      const receiptCount = await receiptsPage.getReceiptCount();
      expect(receiptCount).toBeGreaterThan(0);

      // Find and verify the uploaded receipt
      const uploadedReceipt = page
        .locator('[data-testid="receipt-item"]')
        .filter({
          hasText: "Integration Store",
        });
      await expect(uploadedReceipt).toBeVisible();
    });

    test("should update dashboard after successful upload", async ({
      page,
    }) => {
      // Get initial dashboard state
      await dashboardPage.goto();
      const initialSpending = await dashboardPage.getTotalSpending();
      const initialReceiptCount = await dashboardPage.getRecentReceiptsCount();

      // Upload receipt
      await uploadPage.goto();
      await mockApiResponse(page, "**/api/receipts/upload", {
        success: true,
        receiptId: "dashboard-update-receipt",
        fileName: "dashboard-test.jpg",
        processedData: {
          merchant: "Dashboard Store",
          total: 123.45,
          date: "2024-01-15",
        },
      });

      await uploadPage.uploadFile("dashboard-test.jpg");
      await page.waitForSelector('[data-testid="upload-success"]');

      // Return to dashboard
      await dashboardPage.goto();

      // Verify dashboard is updated
      const newReceiptCount = await dashboardPage.getRecentReceiptsCount();
      expect(newReceiptCount).toBeGreaterThan(initialReceiptCount);

      // Verify new receipt appears in recent receipts
      const recentReceipts = page.locator('[data-testid="recent-receipt"]');
      const latestReceipt = recentReceipts.first();
      await expect(latestReceipt).toContainText("Dashboard Store");
      await expect(latestReceipt).toContainText("123.45");
    });
  });
});
