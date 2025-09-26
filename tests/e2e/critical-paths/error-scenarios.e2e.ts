import { test, expect, Page } from "@playwright/test";
import {
  AuthPage,
  UploadPage,
  ReceiptsPage,
  ReportsPage,
  DashboardPage,
  TEST_USERS,
  waitForPageLoad,
  takeScreenshot,
  expectToastMessage,
  waitForApiResponse,
  mockApiResponse,
  simulateSlowNetwork,
  simulateOfflineMode,
  restoreOnlineMode,
  expectElementVisible,
  expectElementText,
} from "../utils/test-helpers";

test.describe("Error Scenarios and Edge Cases Critical Paths", () => {
  let authPage: AuthPage;
  let uploadPage: UploadPage;
  let receiptsPage: ReceiptsPage;
  let reportsPage: ReportsPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    uploadPage = new UploadPage(page);
    receiptsPage = new ReceiptsPage(page);
    reportsPage = new ReportsPage(page);
    dashboardPage = new DashboardPage(page);

    // Login before each test
    await authPage.goto();
    await authPage.login(
      TEST_USERS.STANDARD_USER.email,
      TEST_USERS.STANDARD_USER.password,
    );
    await page.waitForSelector('[data-testid="dashboard"]');
  });

  test.describe("Network and Connectivity Errors", () => {
    test("should handle complete network failure gracefully", async ({
      page,
    }) => {
      await receiptsPage.goto();

      // Simulate complete network failure
      await simulateOfflineMode(page);

      // Try to perform actions that require network
      await page.click('[data-testid="refresh-receipts"]');

      // Should show offline indicator
      await expectElementVisible(page, '[data-testid="offline-indicator"]');
      await expectElementText(
        page,
        '[data-testid="offline-message"]',
        /no.*internet.*connection|offline/i,
      );

      // Should show cached data if available
      await expectElementVisible(page, '[data-testid="cached-data-indicator"]');

      // Should disable network-dependent actions
      await expect(
        page.locator('[data-testid="upload-receipt"]'),
      ).toBeDisabled();
      await expect(page.locator('[data-testid="sync-data"]')).toBeDisabled();

      // Test offline functionality
      await expectElementVisible(page, '[data-testid="offline-features"]');
      await expect(
        page.locator('[data-testid="view-cached-receipts"]'),
      ).toBeEnabled();

      // Restore connection
      await restoreOnlineMode(page);

      // Should automatically sync when back online
      await expectElementVisible(page, '[data-testid="sync-indicator"]');
      await expectToastMessage(page, /back.*online|syncing.*data/i);

      // Network-dependent actions should be re-enabled
      await expect(
        page.locator('[data-testid="upload-receipt"]'),
      ).toBeEnabled();

      await takeScreenshot(page, "offline-recovery");
    });

    test("should handle slow network conditions", async ({ page }) => {
      await simulateSlowNetwork(page, 3000); // 3 second delay

      await receiptsPage.goto();

      // Should show loading indicators for slow operations
      await page.click('[data-testid="load-more-receipts"]');

      await expectElementVisible(page, '[data-testid="loading-indicator"]');
      await expectElementVisible(
        page,
        '[data-testid="slow-connection-warning"]',
      );

      // Should provide option to cancel slow operations
      await expectElementVisible(page, '[data-testid="cancel-loading"]');

      // Test timeout handling
      await page.waitForTimeout(4000);
      await expectElementVisible(page, '[data-testid="timeout-warning"]');

      // Should offer retry option
      await expectElementVisible(page, '[data-testid="retry-loading"]');
      await page.click('[data-testid="retry-loading"]');

      // Should show retry attempt
      await expectElementVisible(page, '[data-testid="retry-indicator"]');
    });

    test("should handle intermittent connectivity", async ({ page }) => {
      await receiptsPage.goto();

      // Simulate intermittent connection - on/off pattern
      for (let i = 0; i < 3; i++) {
        // Go offline
        await simulateOfflineMode(page);
        await page.click('[data-testid="search-receipts"]');
        await expectElementVisible(page, '[data-testid="connection-lost"]');

        // Come back online
        await restoreOnlineMode(page);
        await page.waitForTimeout(1000);
        await expectElementVisible(page, '[data-testid="connection-restored"]');
      }

      // Should handle the reconnection gracefully
      await expectElementVisible(page, '[data-testid="stable-connection"]');
      await expectToastMessage(page, /connection.*stable/i);
    });

    test("should queue actions during network issues", async ({ page }) => {
      await receiptsPage.goto();

      // Go offline
      await simulateOfflineMode(page);

      // Perform multiple actions that require network
      await page.click('[data-testid="delete-receipt-1"]');
      await page.click('[data-testid="confirm-delete"]');

      await page.click('[data-testid="edit-receipt-2"]');
      await page.fill('[data-testid="edit-merchant"]', "Updated Merchant");
      await page.click('[data-testid="save-changes"]');

      // Should show queued actions
      await expectElementVisible(page, '[data-testid="queued-actions"]');
      await expectElementText(page, '[data-testid="queue-count"]', "2");

      // Actions should be listed in queue
      await expectElementVisible(page, '[data-testid="queued-delete"]');
      await expectElementVisible(page, '[data-testid="queued-edit"]');

      // Restore connection
      await restoreOnlineMode(page);

      // Should process queued actions
      await expectElementVisible(page, '[data-testid="processing-queue"]');
      await expectToastMessage(page, /processing.*queued.*actions/i);

      // Should confirm all actions completed
      await expectToastMessage(page, /2.*actions.*completed/i);
      await expect(
        page.locator('[data-testid="queued-actions"]'),
      ).not.toBeVisible();
    });
  });

  test.describe("Server and API Errors", () => {
    test("should handle 500 internal server errors", async ({ page }) => {
      await receiptsPage.goto();

      // Mock 500 server error
      await page.route("**/api/receipts", (route) => {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Internal Server Error",
            message: "Database connection failed",
            code: "SERVER_ERROR",
          }),
        });
      });

      await page.click('[data-testid="refresh-receipts"]');

      // Should show server error message
      await expectElementVisible(page, '[data-testid="server-error"]');
      await expectElementText(
        page,
        '[data-testid="error-message"]',
        /server.*error|something.*went.*wrong/i,
      );

      // Should provide action options
      await expectElementVisible(page, '[data-testid="retry-action"]');
      await expectElementVisible(page, '[data-testid="contact-support"]');
      await expectElementVisible(page, '[data-testid="report-issue"]');

      // Test retry functionality
      await mockApiResponse(page, "**/api/receipts", {
        receipts: [],
        message: "Server recovered",
      });

      await page.click('[data-testid="retry-action"]');
      await expectToastMessage(page, /retry.*successful|data.*loaded/i);

      // Error should be cleared
      await expect(
        page.locator('[data-testid="server-error"]'),
      ).not.toBeVisible();
    });

    test("should handle 401 authentication errors", async ({ page }) => {
      await receiptsPage.goto();

      // Mock 401 authentication error
      await page.route("**/api/receipts", (route) => {
        route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Unauthorized",
            message: "Session expired",
            code: "AUTH_ERROR",
          }),
        });
      });

      await page.click('[data-testid="refresh-receipts"]');

      // Should show authentication error
      await expectElementVisible(page, '[data-testid="auth-error"]');
      await expectElementText(
        page,
        '[data-testid="auth-error-message"]',
        /session.*expired|please.*login/i,
      );

      // Should automatically redirect to login or show login modal
      await Promise.race([
        page.waitForURL("**/login"),
        expectElementVisible(page, '[data-testid="login-modal"]'),
      ]);

      // Test automatic token refresh if implemented
      await mockApiResponse(page, "**/auth/refresh", {
        accessToken: "new-token",
        refreshToken: "new-refresh-token",
      });

      // Should attempt to refresh token and retry original request
      if (await page.locator('[data-testid="login-modal"]').isVisible()) {
        await page.click('[data-testid="auto-refresh-token"]');
        await expectToastMessage(page, /session.*refreshed/i);
      }
    });

    test("should handle 403 forbidden errors", async ({ page }) => {
      await receiptsPage.goto();

      // Mock 403 forbidden error
      await page.route("**/api/admin/**", (route) => {
        route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Forbidden",
            message: "Insufficient permissions",
            code: "ACCESS_DENIED",
          }),
        });
      });

      // Try to access admin functionality
      await page.goto("/admin/users");

      // Should show access denied error
      await expectElementVisible(page, '[data-testid="access-denied"]');
      await expectElementText(
        page,
        '[data-testid="access-denied-message"]',
        /access.*denied|insufficient.*permissions/i,
      );

      // Should provide navigation back to allowed areas
      await expectElementVisible(page, '[data-testid="back-to-dashboard"]');
      await expectElementVisible(page, '[data-testid="request-access"]');

      await page.click('[data-testid="back-to-dashboard"]');
      await page.waitForURL("**/dashboard");
    });

    test("should handle 429 rate limiting errors", async ({ page }) => {
      await uploadPage.goto();

      // Mock rate limiting error
      await page.route("**/api/receipts/upload", (route) => {
        route.fulfill({
          status: 429,
          contentType: "application/json",
          headers: {
            "Retry-After": "60",
          },
          body: JSON.stringify({
            error: "Too Many Requests",
            message: "Rate limit exceeded. Please try again later.",
            retryAfter: 60,
          }),
        });
      });

      await uploadPage.uploadFile("rate-limit-test.jpg");

      // Should show rate limit error
      await expectElementVisible(page, '[data-testid="rate-limit-error"]');
      await expectElementText(
        page,
        '[data-testid="rate-limit-message"]',
        /rate.*limit|too.*many.*requests/i,
      );

      // Should show retry countdown
      await expectElementVisible(page, '[data-testid="retry-countdown"]');
      await expectElementText(
        page,
        '[data-testid="countdown-timer"]',
        /60.*seconds/i,
      );

      // Should disable upload during rate limit
      await expect(page.locator('[data-testid="file-input"]')).toBeDisabled();

      // Test early retry (should still be blocked)
      await page.click('[data-testid="retry-now"]');
      await expectElementVisible(page, '[data-testid="still-rate-limited"]');
    });

    test("should handle service maintenance mode", async ({ page }) => {
      // Mock maintenance mode response
      await page.route("**/*", (route) => {
        if (route.request().url().includes("/api/")) {
          route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({
              error: "Service Unavailable",
              message: "System is under maintenance. Please try again later.",
              maintenanceEnd: "2024-01-15T14:00:00Z",
            }),
          });
        } else {
          route.continue();
        }
      });

      await receiptsPage.goto();

      // Should show maintenance banner
      await expectElementVisible(page, '[data-testid="maintenance-banner"]');
      await expectElementText(
        page,
        '[data-testid="maintenance-message"]',
        /maintenance|temporarily.*unavailable/i,
      );

      // Should show estimated restoration time
      await expectElementVisible(page, '[data-testid="maintenance-end-time"]');

      // Should limit functionality during maintenance
      await expect(
        page.locator('[data-testid="upload-receipt"]'),
      ).toBeDisabled();
      await expect(page.locator('[data-testid="sync-data"]')).toBeDisabled();

      // Should allow viewing cached/offline data
      await expectElementVisible(
        page,
        '[data-testid="offline-mode-activated"]',
      );
      await expect(
        page.locator('[data-testid="view-cached-data"]'),
      ).toBeEnabled();
    });
  });

  test.describe("Data Validation and Input Errors", () => {
    test("should handle malformed API responses", async ({ page }) => {
      await receiptsPage.goto();

      // Mock malformed JSON response
      await page.route("**/api/receipts", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: '{"receipts": [invalid json', // Malformed JSON
        });
      });

      await page.click('[data-testid="refresh-receipts"]');

      // Should show data parsing error
      await expectElementVisible(page, '[data-testid="data-parsing-error"]');
      await expectElementText(
        page,
        '[data-testid="parsing-error-message"]',
        /data.*format.*error|parsing.*failed/i,
      );

      // Should provide recovery options
      await expectElementVisible(page, '[data-testid="refresh-page"]');
      await expectElementVisible(page, '[data-testid="use-cached-data"]');

      // Test recovery
      await page.click('[data-testid="use-cached-data"]');
      await expectElementVisible(page, '[data-testid="cached-data-mode"]');
    });

    test("should handle missing required fields in forms", async ({ page }) => {
      await page.goto("/receipts/new");

      // Submit form with missing required fields
      await page.click('[data-testid="save-receipt"]');

      // Should show field validation errors
      await expectElementVisible(page, '[data-testid="merchant-error"]');
      await expectElementVisible(page, '[data-testid="amount-error"]');
      await expectElementVisible(page, '[data-testid="date-error"]');

      // Error messages should be descriptive
      await expectElementText(
        page,
        '[data-testid="merchant-error"]',
        /merchant.*required/i,
      );
      await expectElementText(
        page,
        '[data-testid="amount-error"]',
        /amount.*required/i,
      );

      // Should highlight invalid fields
      await expect(page.locator('[data-testid="merchant-input"]')).toHaveClass(
        /error|invalid/,
      );
      await expect(page.locator('[data-testid="amount-input"]')).toHaveClass(
        /error|invalid/,
      );

      // Should focus first invalid field
      const focusedElement = page.locator(":focus");
      await expect(focusedElement).toBe(
        page.locator('[data-testid="merchant-input"]'),
      );
    });

    test("should handle invalid file uploads", async ({ page }) => {
      await uploadPage.goto();

      // Test invalid file type
      await uploadPage.uploadFile("invalid-file.txt");

      await expectElementVisible(page, '[data-testid="file-type-error"]');
      await expectElementText(
        page,
        '[data-testid="file-type-message"]',
        /invalid.*file.*type|supported.*formats/i,
      );

      // Test file too large
      await page.route("**/api/receipts/upload", (route) => {
        route.fulfill({
          status: 413,
          contentType: "application/json",
          body: JSON.stringify({
            error: "File too large",
            message: "File size exceeds 10MB limit",
            maxSize: "10MB",
          }),
        });
      });

      await uploadPage.uploadFile("large-file.jpg");

      await expectElementVisible(page, '[data-testid="file-size-error"]');
      await expectElementText(
        page,
        '[data-testid="file-size-message"]',
        /file.*too.*large|10MB.*limit/i,
      );

      // Test corrupted file
      await page.route("**/api/receipts/upload", (route) => {
        route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({
            error: "File corrupted",
            message: "Unable to process file - file may be corrupted",
            code: "CORRUPTED_FILE",
          }),
        });
      });

      await uploadPage.uploadFile("corrupted-file.jpg");

      await expectElementVisible(page, '[data-testid="file-corruption-error"]');
      await expectElementText(
        page,
        '[data-testid="corruption-message"]',
        /corrupted|unable.*to.*process/i,
      );
    });

    test("should handle invalid date ranges and inputs", async ({ page }) => {
      await reportsPage.goto();

      // Test invalid date range (end before start)
      await page.fill('[data-testid="start-date"]', "2024-01-15");
      await page.fill('[data-testid="end-date"]', "2024-01-10");
      await page.click('[data-testid="apply-date-range"]');

      await expectElementVisible(page, '[data-testid="date-range-error"]');
      await expectElementText(
        page,
        '[data-testid="date-range-message"]',
        /end.*date.*before.*start|invalid.*range/i,
      );

      // Test future dates
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateString = futureDate.toISOString().split("T")[0];

      await page.fill('[data-testid="start-date"]', futureDateString);
      await page.click('[data-testid="apply-date-range"]');

      await expectElementVisible(page, '[data-testid="future-date-error"]');
      await expectElementText(
        page,
        '[data-testid="future-date-message"]',
        /future.*date|cannot.*be.*later/i,
      );

      // Test extremely large date ranges
      await page.fill('[data-testid="start-date"]', "1900-01-01");
      await page.fill('[data-testid="end-date"]', "2099-12-31");
      await page.click('[data-testid="apply-date-range"]');

      await expectElementVisible(page, '[data-testid="large-range-warning"]');
      await expectElementText(
        page,
        '[data-testid="large-range-message"]',
        /date.*range.*too.*large|performance.*impact/i,
      );
    });
  });

  test.describe("Browser and Platform Compatibility Issues", () => {
    test("should handle localStorage/sessionStorage failures", async ({
      page,
    }) => {
      // Simulate localStorage failure
      await page.addInitScript(() => {
        Object.defineProperty(window, "localStorage", {
          value: {
            getItem: () => {
              throw new Error("localStorage disabled");
            },
            setItem: () => {
              throw new Error("localStorage disabled");
            },
            removeItem: () => {
              throw new Error("localStorage disabled");
            },
            clear: () => {
              throw new Error("localStorage disabled");
            },
          },
          writable: true,
        });
      });

      await dashboardPage.goto();

      // Should show storage warning
      await expectElementVisible(page, '[data-testid="storage-warning"]');
      await expectElementText(
        page,
        '[data-testid="storage-message"]',
        /storage.*disabled|private.*browsing/i,
      );

      // Should fallback to in-memory storage
      await expectElementVisible(page, '[data-testid="memory-storage-mode"]');

      // Basic functionality should still work
      await expectElementVisible(page, '[data-testid="dashboard"]');
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test("should handle JavaScript errors gracefully", async ({ page }) => {
      // Monitor JavaScript errors
      const jsErrors: string[] = [];
      page.on("pageerror", (error) => {
        jsErrors.push(error.message);
      });

      // Inject code that causes an error
      await page.addInitScript(() => {
        // Simulate a third-party script error
        setTimeout(() => {
          throw new Error("Third party script error");
        }, 1000);
      });

      await dashboardPage.goto();

      // Wait for potential errors
      await page.waitForTimeout(2000);

      // Application should still be functional despite JS errors
      await expectElementVisible(page, '[data-testid="dashboard"]');

      // Should show error boundary if configured
      if (jsErrors.length > 0) {
        await expectElementVisible(page, '[data-testid="error-boundary"]');
        await expectElementVisible(
          page,
          '[data-testid="error-recovery-button"]',
        );

        // Test error recovery
        await page.click('[data-testid="error-recovery-button"]');
        await expectElementVisible(page, '[data-testid="error-recovered"]');
      }
    });

    test("should handle unsupported browser features", async ({ page }) => {
      // Simulate missing File API
      await page.addInitScript(() => {
        delete (window as any).File;
        delete (window as any).FileReader;
        delete (window as any).FormData;
      });

      await uploadPage.goto();

      // Should show browser compatibility warning
      await expectElementVisible(
        page,
        '[data-testid="browser-compatibility-warning"]',
      );
      await expectElementText(
        page,
        '[data-testid="compatibility-message"]',
        /browser.*not.*supported|upgrade.*browser/i,
      );

      // Should provide alternative upload methods
      await expectElementVisible(
        page,
        '[data-testid="alternative-upload-methods"]',
      );
      await expectElementVisible(page, '[data-testid="manual-entry-option"]');

      // File upload should be disabled
      await expect(page.locator('[data-testid="file-input"]')).toBeDisabled();
    });

    test("should handle memory limitations", async ({ page }) => {
      // Simulate memory pressure by creating large objects
      await page.evaluate(() => {
        const largeArrays = [];
        try {
          for (let i = 0; i < 1000; i++) {
            largeArrays.push(new Array(100000).fill("memory test"));
          }
        } catch (error) {
          console.error("Memory error:", error);
        }
      });

      await reportsPage.goto();

      // Should detect memory pressure and adapt
      await expectElementVisible(
        page,
        '[data-testid="memory-optimization-active"]',
      );

      // Should reduce data visualization complexity
      await expectElementVisible(page, '[data-testid="simplified-charts"]');

      // Should offer data export instead of rendering large datasets
      await expectElementVisible(
        page,
        '[data-testid="export-instead-of-render"]',
      );
    });
  });

  test.describe("Race Conditions and Timing Issues", () => {
    test("should handle rapid successive API calls", async ({ page }) => {
      await receiptsPage.goto();

      let apiCallCount = 0;
      await page.route("**/api/receipts/search*", (route) => {
        apiCallCount++;
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              receipts: [],
              searchId: apiCallCount,
            }),
          });
        }, 1000);
      });

      // Make rapid successive search calls
      await page.fill('[data-testid="receipt-search"]', "a");
      await page.fill('[data-testid="receipt-search"]', "ab");
      await page.fill('[data-testid="receipt-search"]', "abc");
      await page.fill('[data-testid="receipt-search"]', "abcd");

      // Should debounce or cancel previous requests
      await page.waitForTimeout(2000);

      // Should only show results from the latest search
      await expectElementVisible(page, '[data-testid="search-results"]');

      // Should not show stale results
      expect(apiCallCount).toBeLessThanOrEqual(2); // Should be debounced
    });

    test("should handle component unmounting during async operations", async ({
      page,
    }) => {
      await uploadPage.goto();

      // Start a file upload
      await page.route("**/api/receipts/upload", (route) => {
        // Delay response to allow navigation away
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true }),
          });
        }, 3000);
      });

      await uploadPage.uploadFile("slow-upload.jpg");

      // Navigate away while upload is in progress
      await dashboardPage.goto();

      // Should handle the navigation without errors
      await expectElementVisible(page, '[data-testid="dashboard"]');

      // Should clean up the upload operation
      await page.waitForTimeout(4000);

      // No error notifications should appear
      await expect(
        page.locator('[data-testid="error-notification"]'),
      ).not.toBeVisible();
    });

    test("should handle simultaneous user actions", async ({ page }) => {
      await receiptsPage.goto();

      // Mock slow API responses
      await page.route("**/api/receipts/**", (route) => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true }),
          });
        }, 2000);
      });

      // Perform multiple actions simultaneously
      const actions = [
        page.click('[data-testid="edit-receipt-1"]'),
        page.click('[data-testid="delete-receipt-2"]'),
        page.click('[data-testid="refresh-receipts"]'),
      ];

      await Promise.all(actions);

      // Should handle concurrent actions gracefully
      await expectElementVisible(page, '[data-testid="concurrent-operations"]');

      // Should show appropriate loading states
      await expectElementVisible(page, '[data-testid="loading-indicator"]');

      // Should complete all operations
      await page.waitForTimeout(3000);
      await expectElementVisible(page, '[data-testid="operations-completed"]');
    });
  });

  test.describe("Data Corruption and Recovery", () => {
    test("should detect and handle corrupted local data", async ({ page }) => {
      // Corrupt localStorage data
      await page.addInitScript(() => {
        localStorage.setItem("userPreferences", "invalid json data");
        localStorage.setItem("receiptCache", '{"incomplete": data}');
      });

      await dashboardPage.goto();

      // Should detect corruption and show warning
      await expectElementVisible(
        page,
        '[data-testid="data-corruption-detected"]',
      );
      await expectElementText(
        page,
        '[data-testid="corruption-message"]',
        /data.*corrupted|reset.*settings/i,
      );

      // Should offer recovery options
      await expectElementVisible(page, '[data-testid="reset-local-data"]');
      await expectElementVisible(page, '[data-testid="restore-from-backup"]');

      // Test data reset
      await page.click('[data-testid="reset-local-data"]');
      await expectToastMessage(page, /data.*reset|settings.*restored/i);

      // Should continue functioning with default settings
      await expectElementVisible(page, '[data-testid="dashboard"]');
    });

    test("should handle partial data synchronization failures", async ({
      page,
    }) => {
      await receiptsPage.goto();

      // Mock partial sync failure
      await page.route("**/api/sync", (route) => {
        route.fulfill({
          status: 207, // Multi-status
          contentType: "application/json",
          body: JSON.stringify({
            successful: ["receipt-1", "receipt-2"],
            failed: ["receipt-3", "receipt-4"],
            errors: {
              "receipt-3": "Validation error",
              "receipt-4": "Server timeout",
            },
          }),
        });
      });

      await page.click('[data-testid="sync-data"]');

      // Should show partial sync results
      await expectElementVisible(page, '[data-testid="partial-sync-results"]');
      await expectElementText(
        page,
        '[data-testid="sync-summary"]',
        /2.*successful.*2.*failed/i,
      );

      // Should list failed items with reasons
      await expectElementVisible(page, '[data-testid="failed-items-list"]');
      await expectElementText(
        page,
        '[data-testid="failed-item-receipt-3"]',
        /validation.*error/i,
      );

      // Should offer retry for failed items
      await expectElementVisible(page, '[data-testid="retry-failed-sync"]');

      await page.click('[data-testid="retry-failed-sync"]');
      await expectToastMessage(page, /retrying.*failed.*items/i);
    });

    test("should backup and restore critical data", async ({ page }) => {
      await page.goto("/settings/data");

      // Create data backup
      await page.click('[data-testid="create-backup"]');

      const backupDownload = await page.waitForEvent("download");
      expect(backupDownload.suggestedFilename()).toMatch(/backup.*\.json$/i);

      // Simulate data loss
      await page.click('[data-testid="simulate-data-loss"]');
      await expectElementVisible(page, '[data-testid="data-loss-warning"]');

      // Restore from backup
      await page.click('[data-testid="restore-backup"]');
      await page.setInputFiles(
        '[data-testid="backup-file-input"]',
        (await backupDownload.path()) || "test-backup.json",
      );

      await page.click('[data-testid="confirm-restore"]');

      // Should restore data successfully
      await expectToastMessage(page, /data.*restored.*successfully/i);
      await expectElementVisible(page, '[data-testid="restore-completed"]');

      // Should verify data integrity after restore
      await expectElementVisible(
        page,
        '[data-testid="integrity-check-passed"]',
      );
    });
  });

  test.describe("Security and Edge Case Scenarios", () => {
    test("should handle XSS attempts gracefully", async ({ page }) => {
      await page.goto("/receipts/new");

      // Attempt XSS in form fields
      const xssPayload = '<script>alert("XSS")</script>';

      await page.fill('[data-testid="merchant-input"]', xssPayload);
      await page.fill('[data-testid="notes-input"]', xssPayload);

      await page.click('[data-testid="save-receipt"]');

      // Should sanitize input and not execute script
      await page.waitForTimeout(1000);

      // Check that the script content is properly escaped
      const merchantValue = await page.inputValue(
        '[data-testid="merchant-input"]',
      );
      expect(merchantValue).not.toContain("<script>");

      // Should show sanitized content
      await expectElementText(
        page,
        '[data-testid="merchant-display"]',
        /&lt;script&gt;/,
      );
    });

    test("should handle unauthorized access attempts", async ({ page }) => {
      // Clear authentication
      await page.evaluate(() => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
      });

      // Try to access protected routes
      await page.goto("/admin/settings");

      // Should redirect to login
      await page.waitForURL("**/login**");
      await expectElementVisible(page, '[data-testid="auth-required-message"]');

      // Try API access without authentication
      const response = await page.request.get("/api/receipts");
      expect(response.status()).toBe(401);
    });

    test("should handle malicious file uploads", async ({ page }) => {
      await uploadPage.goto();

      // Mock malicious file detection
      await page.route("**/api/receipts/upload", (route) => {
        route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Malicious file detected",
            message: "File contains potentially harmful content",
            code: "SECURITY_VIOLATION",
          }),
        });
      });

      await uploadPage.uploadFile("malicious-file.jpg");

      // Should show security warning
      await expectElementVisible(page, '[data-testid="security-warning"]');
      await expectElementText(
        page,
        '[data-testid="security-message"]',
        /malicious.*content|security.*violation/i,
      );

      // Should block the upload
      await expectElementVisible(page, '[data-testid="upload-blocked"]');

      // Should provide reporting option
      await expectElementVisible(page, '[data-testid="report-malicious-file"]');
    });

    test("should handle CSRF protection", async ({ page }) => {
      // Remove CSRF token
      await page.evaluate(() => {
        const csrfToken = document.querySelector(
          'meta[name="csrf-token"]',
        ) as HTMLMetaElement;
        if (csrfToken) {
          csrfToken.remove();
        }
      });

      await page.goto("/receipts/new");

      // Try to submit form without CSRF token
      await page.fill('[data-testid="merchant-input"]', "Test Merchant");
      await page.fill('[data-testid="amount-input"]', "25.99");
      await page.click('[data-testid="save-receipt"]');

      // Should show CSRF error
      await expectElementVisible(page, '[data-testid="csrf-error"]');
      await expectElementText(
        page,
        '[data-testid="csrf-message"]',
        /security.*token|refresh.*page/i,
      );

      // Should offer page refresh
      await expectElementVisible(page, '[data-testid="refresh-page-button"]');

      await page.click('[data-testid="refresh-page-button"]');
      await page.waitForLoadState("networkidle");

      // Should work after refresh
      await expectElementVisible(page, '[data-testid="receipt-form"]');
    });
  });
});
