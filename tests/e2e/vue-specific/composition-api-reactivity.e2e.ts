import { test, expect, Page } from '@playwright/test';
import {
  AuthPage,
  DashboardPage,
  ReceiptsPage,
  TEST_USERS,
  waitForPageLoad,
  takeScreenshot,
  expectToastMessage,
  expectElementVisible,
  expectElementText,
  mockApiResponse
} from '../utils/test-helpers';

// Vue 3 Composition API Reactivity E2E Tests
test.describe('Vue 3 Composition API Reactivity', () => {
  let authPage: AuthPage;
  let dashboardPage: DashboardPage;
  let receiptsPage: ReceiptsPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);
    receiptsPage = new ReceiptsPage(page);

    // Login to access reactive components
    await authPage.goto();
    await authPage.login(TEST_USERS.STANDARD_USER.email, TEST_USERS.STANDARD_USER.password);
    await page.waitForSelector('[data-testid="dashboard"]');
  });

  test.describe('Cross-Component Data Reactivity', () => {
    test('should sync reactive data between dashboard and receipts components', async ({ page }) => {
      // Mock initial receipts data
      await mockApiResponse(page, '**/api/receipts', {
        receipts: [
          {
            id: 'receipt-1',
            merchant: 'Test Store',
            total: 25.99,
            date: '2024-01-15',
            status: 'processed'
          }
        ],
        total: 1,
        totalSpending: 25.99
      });

      // Verify initial state in dashboard
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      await expectElementText(page, '[data-testid="total-receipts-count"]', '1');
      await expectElementText(page, '[data-testid="total-spending-amount"]', '$25.99');

      // Navigate to receipts page
      await page.goto('/receipts');
      await waitForPageLoad(page);

      // Verify same data is displayed in receipts component
      await expectElementText(page, '[data-testid="receipts-summary-count"]', '1');
      await expectElementText(page, '[data-testid="receipts-summary-total"]', '$25.99');

      // Mock adding a new receipt
      await mockApiResponse(page, '**/api/receipts/upload', {
        success: true,
        receiptId: 'receipt-2',
        processedData: {
          id: 'receipt-2',
          merchant: 'New Store',
          total: 15.50,
          date: '2024-01-16',
          status: 'processed'
        }
      });

      await mockApiResponse(page, '**/api/receipts', {
        receipts: [
          {
            id: 'receipt-1',
            merchant: 'Test Store',
            total: 25.99,
            date: '2024-01-15',
            status: 'processed'
          },
          {
            id: 'receipt-2',
            merchant: 'New Store',
            total: 15.50,
            date: '2024-01-16',
            status: 'processed'
          }
        ],
        total: 2,
        totalSpending: 41.49
      });

      // Add new receipt via upload
      await page.goto('/upload');
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'test-receipt.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      });

      await page.waitForSelector('[data-testid="upload-success"]');

      // Navigate back to dashboard - should show updated reactive data
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      // Verify reactive updates across components
      await expectElementText(page, '[data-testid="total-receipts-count"]', '2');
      await expectElementText(page, '[data-testid="total-spending-amount"]', '$41.49');

      // Navigate to receipts page - should also show updated data
      await page.goto('/receipts');
      await waitForPageLoad(page);

      await expectElementText(page, '[data-testid="receipts-summary-count"]', '2');
      await expectElementText(page, '[data-testid="receipts-summary-total"]', '$41.49');

      // Verify new receipt appears in list
      await expectElementVisible(page, '[data-testid="receipt-item-receipt-2"]');
      await expectElementText(page, '[data-testid="receipt-item-receipt-2"] [data-testid="merchant-name"]', 'New Store');
    });

    test('should handle reactive computed properties across components', async ({ page }) => {
      // Mock receipts with different categories for computed testing
      await mockApiResponse(page, '**/api/receipts', {
        receipts: [
          {
            id: 'receipt-1',
            merchant: 'Grocery Store',
            total: 50.00,
            category: 'groceries',
            date: '2024-01-15'
          },
          {
            id: 'receipt-2',
            merchant: 'Gas Station',
            total: 30.00,
            category: 'fuel',
            date: '2024-01-16'
          },
          {
            id: 'receipt-3',
            merchant: 'Restaurant',
            total: 25.00,
            category: 'dining',
            date: '2024-01-17'
          }
        ],
        total: 3,
        categoryTotals: {
          groceries: 50.00,
          fuel: 30.00,
          dining: 25.00
        }
      });

      // Navigate to dashboard with computed category breakdown
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      // Verify computed values are displayed correctly
      await expectElementText(page, '[data-testid="category-groceries-total"]', '$50.00');
      await expectElementText(page, '[data-testid="category-fuel-total"]', '$30.00');
      await expectElementText(page, '[data-testid="category-dining-total"]', '$25.00');

      // Navigate to reports page with same computed data
      await page.goto('/reports');
      await waitForPageLoad(page);

      // Verify computed category breakdown is consistent
      await expectElementText(page, '[data-testid="report-category-groceries"]', '$50.00');
      await expectElementText(page, '[data-testid="report-category-fuel"]', '$30.00');
      await expectElementText(page, '[data-testid="report-category-dining"]', '$25.00');

      // Test computed percentage calculations
      await expectElementText(page, '[data-testid="groceries-percentage"]', '47.6%'); // 50/105
      await expectElementText(page, '[data-testid="fuel-percentage"]', '28.6%'); // 30/105
      await expectElementText(page, '[data-testid="dining-percentage"]', '23.8%'); // 25/105

      // Update a receipt category to test reactive computed updates
      await page.goto('/receipts');
      await page.click('[data-testid="receipt-item-receipt-1"] [data-testid="edit-receipt"]');

      // Change category from groceries to dining
      await page.selectOption('[data-testid="category-select"]', 'dining');

      // Mock updated API response
      await mockApiResponse(page, '**/api/receipts/receipt-1', {
        id: 'receipt-1',
        merchant: 'Grocery Store',
        total: 50.00,
        category: 'dining', // Changed category
        date: '2024-01-15'
      });

      await mockApiResponse(page, '**/api/receipts', {
        receipts: [
          {
            id: 'receipt-1',
            merchant: 'Grocery Store',
            total: 50.00,
            category: 'dining', // Updated
            date: '2024-01-15'
          },
          {
            id: 'receipt-2',
            merchant: 'Gas Station',
            total: 30.00,
            category: 'fuel',
            date: '2024-01-16'
          },
          {
            id: 'receipt-3',
            merchant: 'Restaurant',
            total: 25.00,
            category: 'dining',
            date: '2024-01-17'
          }
        ],
        total: 3,
        categoryTotals: {
          groceries: 0.00,      // Now zero
          fuel: 30.00,
          dining: 75.00         // Now 50 + 25
        }
      });

      await page.click('[data-testid="save-receipt"]');
      await page.waitForSelector('[data-testid="save-success"]');

      // Navigate back to dashboard - computed values should update reactively
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      await expectElementText(page, '[data-testid="category-groceries-total"]', '$0.00');
      await expectElementText(page, '[data-testid="category-fuel-total"]', '$30.00');
      await expectElementText(page, '[data-testid="category-dining-total"]', '$75.00');

      // Navigate to reports - computed percentages should also update
      await page.goto('/reports');
      await waitForPageLoad(page);

      await expectElementText(page, '[data-testid="groceries-percentage"]', '0.0%');  // 0/105
      await expectElementText(page, '[data-testid="fuel-percentage"]', '28.6%');      // 30/105
      await expectElementText(page, '[data-testid="dining-percentage"]', '71.4%');    // 75/105
    });

    test('should maintain reactivity with deep reactive objects', async ({ page }) => {
      // Mock complex nested receipt data
      await mockApiResponse(page, '**/api/receipts/receipt-1', {
        id: 'receipt-1',
        merchant: 'Detailed Store',
        total: 100.00,
        metadata: {
          paymentMethod: 'credit',
          cashier: 'John Doe',
          location: {
            store: 'Store #123',
            address: '123 Main St',
            coordinates: { lat: 40.7128, lng: -74.0060 }
          },
          tags: ['business', 'tax-deductible']
        },
        items: [
          { id: 'item-1', name: 'Product A', price: 25.00, quantity: 2 },
          { id: 'item-2', name: 'Product B', price: 50.00, quantity: 1 }
        ]
      });

      // Navigate to receipt detail page
      await page.goto('/receipts/receipt-1');
      await waitForPageLoad(page);

      // Verify deep reactive data is displayed
      await expectElementText(page, '[data-testid="receipt-total"]', '$100.00');
      await expectElementText(page, '[data-testid="payment-method"]', 'credit');
      await expectElementText(page, '[data-testid="store-location"]', 'Store #123');
      await expectElementText(page, '[data-testid="item-1-total"]', '$50.00'); // 25 * 2

      // Test updating nested object properties
      await page.click('[data-testid="edit-receipt-metadata"]');

      // Change nested location data
      await page.fill('[data-testid="store-name-input"]', 'Store #456');
      await page.fill('[data-testid="address-input"]', '456 Oak Ave');

      // Add new tag to array
      await page.fill('[data-testid="new-tag-input"]', 'personal');
      await page.click('[data-testid="add-tag-btn"]');

      // Update item quantity (should reactively update total)
      await page.fill('[data-testid="item-1-quantity"]', '3'); // Change from 2 to 3

      // Mock updated response with deep changes
      await mockApiResponse(page, '**/api/receipts/receipt-1', {
        id: 'receipt-1',
        merchant: 'Detailed Store',
        total: 125.00, // Updated total: (25*3) + 50
        metadata: {
          paymentMethod: 'credit',
          cashier: 'John Doe',
          location: {
            store: 'Store #456',     // Updated
            address: '456 Oak Ave',  // Updated
            coordinates: { lat: 40.7128, lng: -74.0060 }
          },
          tags: ['business', 'tax-deductible', 'personal'] // Added tag
        },
        items: [
          { id: 'item-1', name: 'Product A', price: 25.00, quantity: 3 }, // Updated quantity
          { id: 'item-2', name: 'Product B', price: 50.00, quantity: 1 }
        ]
      });

      await page.click('[data-testid="save-metadata"]');
      await page.waitForSelector('[data-testid="save-success"]');

      // Verify reactive updates to nested data
      await expectElementText(page, '[data-testid="receipt-total"]', '$125.00');
      await expectElementText(page, '[data-testid="store-location"]', 'Store #456');
      await expectElementText(page, '[data-testid="store-address"]', '456 Oak Ave');
      await expectElementText(page, '[data-testid="item-1-total"]', '$75.00'); // 25 * 3

      // Verify new tag appears
      await expectElementVisible(page, '[data-testid="tag-personal"]');

      // Navigate to different component that uses same receipt data
      await page.goto('/reports/receipt-details/receipt-1');
      await waitForPageLoad(page);

      // Verify deep reactive data is consistent across components
      await expectElementText(page, '[data-testid="report-receipt-total"]', '$125.00');
      await expectElementText(page, '[data-testid="report-store-name"]', 'Store #456');
      await expectElementVisible(page, '[data-testid="report-tag-personal"]');
    });
  });

  test.describe('Reactive Refs and Computed Dependencies', () => {
    test('should handle ref dependencies across components', async ({ page }) => {
      // Test scenario: Search filter state should be reactive across components
      await mockApiResponse(page, '**/api/receipts/search**', {
        receipts: [
          { id: 'receipt-1', merchant: 'Walmart', total: 50.00, date: '2024-01-15' },
          { id: 'receipt-2', merchant: 'Target', total: 30.00, date: '2024-01-16' },
          { id: 'receipt-3', merchant: 'Walmart Supercenter', total: 75.00, date: '2024-01-17' }
        ],
        searchTerm: 'walmart',
        total: 2
      });

      // Navigate to receipts page
      await page.goto('/receipts');
      await waitForPageLoad(page);

      // Set search filter (should update reactive ref)
      await page.fill('[data-testid="search-input"]', 'walmart');
      await page.waitForSelector('[data-testid="search-results-loaded"]');

      // Verify search results
      await expectElementText(page, '[data-testid="search-results-count"]', '2');
      await expectElementVisible(page, '[data-testid="receipt-item-receipt-1"]');
      await expectElementVisible(page, '[data-testid="receipt-item-receipt-3"]');
      await expect(page.locator('[data-testid="receipt-item-receipt-2"]')).not.toBeVisible();

      // Navigate to different component that shares search state
      await page.goto('/reports');
      await waitForPageLoad(page);

      // Verify search filter persists and affects computed data
      await expectElementText(page, '[data-testid="filtered-receipts-count"]', '2');
      await expectElementText(page, '[data-testid="filtered-total-spending"]', '$125.00'); // 50 + 75

      // Update search filter from reports page
      await page.fill('[data-testid="reports-search-input"]', 'target');

      await mockApiResponse(page, '**/api/receipts/search**', {
        receipts: [
          { id: 'receipt-2', merchant: 'Target', total: 30.00, date: '2024-01-16' }
        ],
        searchTerm: 'target',
        total: 1
      });

      await page.waitForSelector('[data-testid="search-results-loaded"]');

      // Verify reactive update
      await expectElementText(page, '[data-testid="filtered-receipts-count"]', '1');
      await expectElementText(page, '[data-testid="filtered-total-spending"]', '$30.00');

      // Navigate back to receipts page
      await page.goto('/receipts');
      await waitForPageLoad(page);

      // Verify search state persisted reactively
      await expect(page.locator('[data-testid="search-input"]')).toHaveValue('target');
      await expectElementText(page, '[data-testid="search-results-count"]', '1');
      await expectElementVisible(page, '[data-testid="receipt-item-receipt-2"]');
      await expect(page.locator('[data-testid="receipt-item-receipt-1"]')).not.toBeVisible();
    });

    test('should handle computed property chains across components', async ({ page }) => {
      // Test complex computed dependency chains
      await mockApiResponse(page, '**/api/receipts', {
        receipts: [
          { id: 'receipt-1', total: 100.00, date: '2024-01-01', category: 'groceries' },
          { id: 'receipt-2', total: 200.00, date: '2024-01-15', category: 'groceries' },
          { id: 'receipt-3', total: 150.00, date: '2024-01-30', category: 'dining' }
        ]
      });

      await mockApiResponse(page, '**/api/budgets', {
        budgets: [
          { category: 'groceries', monthlyLimit: 250.00, currentSpending: 300.00 },
          { category: 'dining', monthlyLimit: 200.00, currentSpending: 150.00 }
        ]
      });

      // Navigate to budget page that uses computed chains
      await page.goto('/budget');
      await waitForPageLoad(page);

      // Verify computed budget status (over/under budget)
      await expectElementText(page, '[data-testid="groceries-status"]', 'Over Budget');
      await expectElementText(page, '[data-testid="groceries-overage"]', '$50.00'); // 300 - 250
      await expectElementText(page, '[data-testid="dining-status"]', 'On Track');
      await expectElementText(page, '[data-testid="dining-remaining"]', '$50.00'); // 200 - 150

      // Navigate to dashboard that uses same computed data
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      // Verify computed budget alerts
      await expectElementVisible(page, '[data-testid="budget-alert-groceries"]');
      await expectElementText(page, '[data-testid="budget-alert-message"]', 'You are $50.00 over budget in Groceries');

      // Add new receipt that affects computed chain
      await page.goto('/upload');

      await mockApiResponse(page, '**/api/receipts/upload', {
        success: true,
        receiptId: 'receipt-4',
        processedData: {
          id: 'receipt-4',
          total: 75.00,
          category: 'dining',
          date: '2024-01-31'
        }
      });

      // Updated mock data after new receipt
      await mockApiResponse(page, '**/api/budgets', {
        budgets: [
          { category: 'groceries', monthlyLimit: 250.00, currentSpending: 300.00 },
          { category: 'dining', monthlyLimit: 200.00, currentSpending: 225.00 } // 150 + 75
        ]
      });

      // Upload new receipt
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'dining-receipt.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      });

      await page.waitForSelector('[data-testid="upload-success"]');

      // Navigate back to budget page
      await page.goto('/budget');
      await waitForPageLoad(page);

      // Verify computed chain updated reactively
      await expectElementText(page, '[data-testid="dining-status"]', 'Over Budget');
      await expectElementText(page, '[data-testid="dining-overage"]', '$25.00'); // 225 - 200

      // Navigate to dashboard
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      // Verify new budget alert appears
      await expectElementVisible(page, '[data-testid="budget-alert-dining"]');
      const alertCount = await page.locator('[data-testid^="budget-alert-"]').count();
      expect(alertCount).toBe(2); // Both groceries and dining now over budget
    });
  });

  test.describe('Reactive State Management (Pinia Integration)', () => {
    test('should maintain reactive state across store mutations', async ({ page }) => {
      // Test Pinia store reactivity across components
      await page.goto('/settings');
      await waitForPageLoad(page);

      // Test theme store reactivity
      await page.click('[data-testid="dark-mode-toggle"]');

      // Verify theme change is reactive across all components
      await expect(page.locator('body')).toHaveClass(/dark-theme/);
      await expect(page.locator('[data-testid="header"]')).toHaveClass(/dark/);

      // Navigate to different page
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      // Verify theme persisted and is reactive
      await expect(page.locator('body')).toHaveClass(/dark-theme/);
      await expect(page.locator('[data-testid="dashboard-container"]')).toHaveClass(/dark/);

      // Test store mutations from different component
      await page.goto('/receipts');
      await waitForPageLoad(page);

      // Theme should still be applied
      await expect(page.locator('body')).toHaveClass(/dark-theme/);

      // Change theme from receipts page
      await page.click('[data-testid="theme-toggle-receipts"]');

      // Verify reactive change across all components
      await expect(page.locator('body')).not.toHaveClass(/dark-theme/);

      // Navigate back to settings
      await page.goto('/settings');
      await waitForPageLoad(page);

      // Verify toggle state updated reactively
      await expect(page.locator('[data-testid="dark-mode-toggle"]')).not.toBeChecked();
    });

    test('should handle store getters reactivity', async ({ page }) => {
      // Test reactive Pinia getters across components
      await mockApiResponse(page, '**/api/user/preferences', {
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        timezone: 'America/New_York'
      });

      await page.goto('/settings/preferences');
      await waitForPageLoad(page);

      // Change currency setting
      await page.selectOption('[data-testid="currency-select"]', 'EUR');

      await mockApiResponse(page, '**/api/user/preferences', {
        currency: 'EUR',
        dateFormat: 'MM/DD/YYYY',
        timezone: 'America/New_York'
      });

      await page.click('[data-testid="save-preferences"]');
      await page.waitForSelector('[data-testid="preferences-saved"]');

      // Navigate to dashboard that uses currency getter
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      // Verify currency format updated reactively via store getter
      await expectElementText(page, '[data-testid="total-spending"]', '€');
      await expectElementText(page, '[data-testid="monthly-budget"]', '€');

      // Navigate to receipts page
      await page.goto('/receipts');
      await waitForPageLoad(page);

      // Verify currency getter reactive across all receipt displays
      const currencyElements = page.locator('[data-testid^="receipt-total-"]');
      const count = await currencyElements.count();

      for (let i = 0; i < count; i++) {
        const text = await currencyElements.nth(i).textContent();
        expect(text).toContain('€');
      }
    });
  });

  test.describe('Watch and WatchEffect Reactivity', () => {
    test('should handle watchers across component lifecycle', async ({ page }) => {
      // Test reactive watchers that span multiple components
      await page.goto('/reports/analytics');
      await waitForPageLoad(page);

      // Set date range filter (should trigger watchers)
      await page.fill('[data-testid="start-date"]', '2024-01-01');
      await page.fill('[data-testid="end-date"]', '2024-01-31');

      // Mock updated data based on date range
      await mockApiResponse(page, '**/api/analytics/range**', {
        dateRange: { start: '2024-01-01', end: '2024-01-31' },
        totalSpending: 500.00,
        receiptCount: 15,
        averagePerDay: 16.13,
        trends: [
          { date: '2024-01-01', spending: 50.00 },
          { date: '2024-01-15', spending: 75.00 },
          { date: '2024-01-31', spending: 60.00 }
        ]
      });

      await page.click('[data-testid="apply-date-filter"]');
      await page.waitForSelector('[data-testid="analytics-updated"]');

      // Verify watcher triggered chart updates
      await expectElementText(page, '[data-testid="period-total"]', '$500.00');
      await expectElementText(page, '[data-testid="period-receipts"]', '15');
      await expectElementText(page, '[data-testid="daily-average"]', '$16.13');

      // Navigate to different component that watches same date range
      await page.goto('/reports/trends');
      await waitForPageLoad(page);

      // Verify watcher maintained state and updated trend component
      await expectElementText(page, '[data-testid="trends-period-total"]', '$500.00');
      await expectElementVisible(page, '[data-testid="trend-chart-updated"]');

      // Change date range from trends page
      await page.fill('[data-testid="trends-start-date"]', '2024-01-15');

      await mockApiResponse(page, '**/api/analytics/range**', {
        dateRange: { start: '2024-01-15', end: '2024-01-31' },
        totalSpending: 350.00,
        receiptCount: 10,
        averagePerDay: 20.59,
        trends: [
          { date: '2024-01-15', spending: 75.00 },
          { date: '2024-01-31', spending: 60.00 }
        ]
      });

      await page.click('[data-testid="apply-trends-filter"]');
      await page.waitForSelector('[data-testid="trends-updated"]');

      // Navigate back to analytics
      await page.goto('/reports/analytics');
      await waitForPageLoad(page);

      // Verify watchers synchronized across components
      await expect(page.locator('[data-testid="start-date"]')).toHaveValue('2024-01-15');
      await expectElementText(page, '[data-testid="period-total"]', '$350.00');
      await expectElementText(page, '[data-testid="period-receipts"]', '10');
    });

    test('should handle watchEffect cleanup across route changes', async ({ page }) => {
      // Test watchEffect cleanup when navigating between components
      await page.goto('/receipts/live-search');
      await waitForPageLoad(page);

      // Start typing to trigger live search watchEffect
      await page.type('[data-testid="live-search-input"]', 'wal', { delay: 100 });

      // Verify search requests are being made
      let searchRequestCount = 0;
      page.on('request', request => {
        if (request.url().includes('/api/receipts/search')) {
          searchRequestCount++;
        }
      });

      // Continue typing
      await page.type('[data-testid="live-search-input"]', 'mart', { delay: 100 });

      // Wait for debounced search
      await page.waitForTimeout(600);

      // Quickly navigate away (should cleanup watchEffect)
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      // Continue typing after navigation (should not trigger more searches)
      const initialRequestCount = searchRequestCount;
      await page.waitForTimeout(1000);

      // Verify no additional search requests after navigation
      expect(searchRequestCount).toBe(initialRequestCount);

      // Navigate back to search
      await page.goto('/receipts/live-search');
      await waitForPageLoad(page);

      // Verify new watchEffect is established
      await page.fill('[data-testid="live-search-input"]', 'target');
      await page.waitForTimeout(600);

      // Should trigger new search
      expect(searchRequestCount).toBeGreaterThan(initialRequestCount);
    });
  });

  test.describe('Error Handling in Reactive Systems', () => {
    test('should handle reactive errors gracefully across components', async ({ page }) => {
      // Test error propagation and recovery in reactive systems
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      // Mock API error that affects reactive data
      await page.route('**/api/receipts/summary', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      // Trigger data refresh
      await page.click('[data-testid="refresh-dashboard"]');

      // Verify error state is reactive across components
      await expectElementVisible(page, '[data-testid="dashboard-error"]');
      await expectElementText(page, '[data-testid="error-message"]', /server error/i);

      // Navigate to receipts page
      await page.goto('/receipts');
      await waitForPageLoad(page);

      // Verify error state propagated to other components using same data
      await expectElementVisible(page, '[data-testid="receipts-error"]');

      // Mock recovery response
      await page.route('**/api/receipts/summary', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalSpending: 1250.00,
            receiptCount: 25,
            recentReceipts: []
          })
        });
      });

      // Trigger retry
      await page.click('[data-testid="retry-load-receipts"]');
      await page.waitForSelector('[data-testid="receipts-loaded"]');

      // Verify recovery is reactive across components
      await expect(page.locator('[data-testid="receipts-error"]')).not.toBeVisible();

      // Navigate back to dashboard
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      // Verify error state cleared reactively
      await expect(page.locator('[data-testid="dashboard-error"]')).not.toBeVisible();
      await expectElementText(page, '[data-testid="total-spending"]', '$1,250.00');
    });
  });
});