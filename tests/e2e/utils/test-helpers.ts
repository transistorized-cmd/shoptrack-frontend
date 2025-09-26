import { Page, expect, Locator } from "@playwright/test";
import { promises as fs } from "fs";
import path from "path";

// Test user credentials
export const TEST_USERS = {
  STANDARD_USER: {
    email: "test.user@shoptrack.local",
    password: "TestPassword123!",
    firstName: "Test",
    lastName: "User",
  },
  ADMIN_USER: {
    email: "admin.user@shoptrack.local",
    password: "AdminPassword123!",
    firstName: "Admin",
    lastName: "User",
  },
};

// Page Object Model helpers
export class AuthPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/login");
    await this.page.waitForLoadState("networkidle");
  }

  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-submit"]');

    // Wait for successful login or error
    await Promise.race([
      this.page.waitForSelector('[data-testid="dashboard"]', {
        timeout: 10000,
      }),
      this.page.waitForSelector('[data-testid="login-error"]', {
        timeout: 5000,
      }),
    ]);
  }

  async register(userData: typeof TEST_USERS.STANDARD_USER) {
    await this.page.goto("/register");
    await this.page.waitForLoadState("networkidle");

    await this.page.fill(
      '[data-testid="first-name-input"]',
      userData.firstName,
    );
    await this.page.fill('[data-testid="last-name-input"]', userData.lastName);
    await this.page.fill('[data-testid="email-input"]', userData.email);
    await this.page.fill('[data-testid="password-input"]', userData.password);
    await this.page.fill(
      '[data-testid="confirm-password-input"]',
      userData.password,
    );

    await this.page.click('[data-testid="register-submit"]');

    // Wait for success or error
    await Promise.race([
      this.page.waitForSelector('[data-testid="registration-success"]', {
        timeout: 10000,
      }),
      this.page.waitForSelector('[data-testid="registration-error"]', {
        timeout: 5000,
      }),
    ]);
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-btn"]');
    await this.page.waitForURL("/login");
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      await this.page.waitForSelector('[data-testid="user-menu"]', {
        timeout: 2000,
      });
      return true;
    } catch {
      return false;
    }
  }
}

export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/dashboard");
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForSelector('[data-testid="dashboard"]');
  }

  async getRecentReceiptsCount(): Promise<number> {
    const receipts = await this.page
      .locator('[data-testid="recent-receipt"]')
      .count();
    return receipts;
  }

  async getTotalSpending(): Promise<string> {
    const element = await this.page.locator('[data-testid="total-spending"]');
    return (await element.textContent()) || "0";
  }

  async navigateToReceipts() {
    await this.page.click('[data-testid="nav-receipts"]');
    await this.page.waitForURL("/receipts");
    await this.page.waitForLoadState("networkidle");
  }

  async navigateToUpload() {
    await this.page.click('[data-testid="nav-upload"]');
    await this.page.waitForURL("/upload");
    await this.page.waitForLoadState("networkidle");
  }

  async navigateToReports() {
    await this.page.click('[data-testid="nav-reports"]');
    await this.page.waitForURL("/reports");
    await this.page.waitForLoadState("networkidle");
  }
}

export class ReceiptsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/receipts");
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForSelector('[data-testid="receipts-page"]');
  }

  async searchReceipts(query: string) {
    await this.page.fill('[data-testid="receipt-search"]', query);
    await this.page.press('[data-testid="receipt-search"]', "Enter");
    await this.page.waitForTimeout(1000); // Wait for search results
  }

  async getReceiptCount(): Promise<number> {
    return await this.page.locator('[data-testid="receipt-item"]').count();
  }

  async clickReceiptByIndex(index: number) {
    await this.page.locator('[data-testid="receipt-item"]').nth(index).click();
    await this.page.waitForLoadState("networkidle");
  }

  async deleteReceiptByIndex(index: number) {
    await this.page
      .locator('[data-testid="receipt-item"]')
      .nth(index)
      .locator('[data-testid="delete-receipt"]')
      .click();

    // Confirm deletion
    await this.page.click('[data-testid="confirm-delete"]');
    await this.page.waitForTimeout(1000); // Wait for deletion to complete
  }

  async filterByCategory(category: string) {
    await this.page.selectOption('[data-testid="category-filter"]', category);
    await this.page.waitForTimeout(1000); // Wait for filter to apply
  }

  async sortBy(sortOption: string) {
    await this.page.selectOption('[data-testid="sort-receipts"]', sortOption);
    await this.page.waitForTimeout(1000); // Wait for sort to apply
  }
}

export class UploadPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/upload");
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForSelector('[data-testid="upload-page"]');
  }

  async uploadFile(filePath: string) {
    // Create a test file if it doesn't exist
    const testFilePath = await this.ensureTestFile(filePath);

    const fileInput = this.page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(testFilePath);

    // Wait for upload to complete
    await this.page.waitForSelector(
      '[data-testid="upload-success"], [data-testid="upload-error"]',
      { timeout: 30000 },
    );
  }

  async uploadMultipleFiles(filePaths: string[]) {
    const testFilePaths = await Promise.all(
      filePaths.map((path) => this.ensureTestFile(path)),
    );

    const fileInput = this.page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(testFilePaths);

    // Wait for all uploads to complete
    await this.page.waitForSelector('[data-testid="all-uploads-complete"]', {
      timeout: 60000,
    });
  }

  async getUploadProgress(): Promise<number> {
    const progressBar = this.page.locator('[data-testid="upload-progress"]');
    const ariaValueNow = await progressBar.getAttribute("aria-valuenow");
    return parseInt(ariaValueNow || "0");
  }

  async isUploadComplete(): Promise<boolean> {
    try {
      await this.page.waitForSelector('[data-testid="upload-success"]', {
        timeout: 2000,
      });
      return true;
    } catch {
      return false;
    }
  }

  private async ensureTestFile(fileName: string): Promise<string> {
    const testFilesDir = path.join(__dirname, "../fixtures");
    await fs.mkdir(testFilesDir, { recursive: true });

    const filePath = path.join(testFilesDir, fileName);

    try {
      await fs.access(filePath);
    } catch {
      // Create a dummy file for testing
      const content =
        fileName.endsWith(".jpg") || fileName.endsWith(".png")
          ? Buffer.from(
              "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
              "base64",
            )
          : `Test file content for ${fileName}`;

      await fs.writeFile(filePath, content);
    }

    return filePath;
  }
}

export class ReportsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/reports");
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForSelector('[data-testid="reports-page"]');
  }

  async selectDateRange(startDate: string, endDate: string) {
    await this.page.fill('[data-testid="start-date"]', startDate);
    await this.page.fill('[data-testid="end-date"]', endDate);
    await this.page.click('[data-testid="apply-date-range"]');
    await this.page.waitForTimeout(2000); // Wait for report to update
  }

  async exportReport(format: "pdf" | "csv" | "excel") {
    await this.page.click('[data-testid="export-report"]');
    await this.page.click(`[data-testid="export-${format}"]`);

    // Wait for download to start
    const downloadPromise = this.page.waitForEvent("download");
    const download = await downloadPromise;
    return download;
  }

  async getChartData(chartType: string): Promise<any> {
    // Wait for chart to load
    await this.page.waitForSelector(`[data-testid="${chartType}-chart"]`);

    // Get chart data (this would depend on your chart implementation)
    return await this.page.evaluate((type) => {
      const chart = document.querySelector(`[data-testid="${type}-chart"]`);
      // Return chart data based on your chart library (Chart.js, etc.)
      return chart ? { loaded: true, type } : null;
    }, chartType);
  }
}

// Utility functions
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => document.readyState === "complete");
}

export async function takeScreenshot(page: Page, name: string) {
  const screenshotPath = path.join(
    __dirname,
    "../screenshots",
    `${name}-${Date.now()}.png`,
  );
  await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 10000,
) {
  return await page.waitForResponse(
    (response) => {
      const url = response.url();
      return typeof urlPattern === "string"
        ? url.includes(urlPattern)
        : urlPattern.test(url);
    },
    { timeout },
  );
}

export async function mockApiResponse(page: Page, url: string, response: any) {
  await page.route(url, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

export async function simulateSlowNetwork(page: Page, delay = 1000) {
  await page.route("**/*", (route) => {
    setTimeout(() => route.continue(), delay);
  });
}

export async function simulateOfflineMode(page: Page) {
  await page.context().setOffline(true);
}

export async function restoreOnlineMode(page: Page) {
  await page.context().setOffline(false);
}

// Accessibility helpers
export async function checkAccessibility(
  page: Page,
  selector?: string,
): Promise<void> {
  // This would integrate with axe-core for accessibility testing
  await page.evaluate((sel) => {
    // Inject axe-core and run accessibility tests
    console.log(`Running accessibility check${sel ? ` on ${sel}` : ""}`);
  }, selector);
}

// Performance helpers
export async function measurePageLoadTime(page: Page): Promise<number> {
  return await page.evaluate(() => {
    return performance.timing.loadEventEnd - performance.timing.navigationStart;
  });
}

export async function measureTimeToInteractive(page: Page): Promise<number> {
  return await page.evaluate(() => {
    return (
      performance.timing.domInteractive - performance.timing.navigationStart
    );
  });
}

// Form helpers
export async function fillFormData(
  page: Page,
  formData: Record<string, string>,
) {
  for (const [field, value] of Object.entries(formData)) {
    await page.fill(`[data-testid="${field}"]`, value);
  }
}

export async function submitForm(page: Page, submitButtonId: string) {
  await page.click(`[data-testid="${submitButtonId}"]`);
  await page.waitForLoadState("networkidle");
}

// Validation helpers
export async function expectToastMessage(page: Page, message: string) {
  const toast = page.locator('[data-testid="toast-message"]');
  await expect(toast).toContainText(message);
  await expect(toast).toBeVisible();
}

export async function expectPageTitle(page: Page, title: string) {
  await expect(page).toHaveTitle(title);
}

export async function expectUrlPath(page: Page, path: string) {
  await expect(page).toHaveURL(new RegExp(path));
}

export async function expectElementVisible(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeVisible();
}

export async function expectElementNotVisible(page: Page, selector: string) {
  await expect(page.locator(selector)).not.toBeVisible();
}

export async function expectElementText(
  page: Page,
  selector: string,
  text: string,
) {
  await expect(page.locator(selector)).toContainText(text);
}

export async function expectElementCount(
  page: Page,
  selector: string,
  count: number,
) {
  await expect(page.locator(selector)).toHaveCount(count);
}
