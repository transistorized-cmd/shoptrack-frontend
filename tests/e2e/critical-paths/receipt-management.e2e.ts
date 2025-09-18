import { test, expect, Page } from '@playwright/test';
import {
  AuthPage,
  ReceiptsPage,
  DashboardPage,
  TEST_USERS,
  waitForPageLoad,
  takeScreenshot,
  expectToastMessage,
  waitForApiResponse,
  mockApiResponse,
  expectElementVisible,
  expectElementCount,
  expectElementText
} from '../utils/test-helpers';

test.describe('Receipt Management and Search Critical Paths', () => {
  let authPage: AuthPage;
  let receiptsPage: ReceiptsPage;
  let dashboardPage: DashboardPage;

  // Sample receipt data for testing
  const sampleReceipts = [
    {
      id: 'receipt-1',
      merchant: 'Walmart Supercenter',
      total: 127.83,
      date: '2024-01-15',
      category: 'Groceries',
      items: [
        { name: 'Bananas', price: 2.99 },
        { name: 'Milk 2%', price: 4.59 },
        { name: 'Bread', price: 3.49 }
      ],
      tags: ['groceries', 'weekly-shopping']
    },
    {
      id: 'receipt-2',
      merchant: 'Shell Gas Station',
      total: 45.67,
      date: '2024-01-14',
      category: 'Transportation',
      items: [
        { name: 'Regular Gas', price: 42.15 },
        { name: 'Car Wash', price: 3.52 }
      ],
      tags: ['gas', 'transportation']
    },
    {
      id: 'receipt-3',
      merchant: 'Olive Garden',
      total: 89.34,
      date: '2024-01-13',
      category: 'Dining',
      items: [
        { name: 'Pasta Dish', price: 18.99 },
        { name: 'Appetizer', price: 12.99 },
        { name: 'Dessert', price: 8.99 }
      ],
      tags: ['dining', 'restaurant', 'date-night']
    },
    {
      id: 'receipt-4',
      merchant: 'Amazon',
      total: 234.56,
      date: '2024-01-12',
      category: 'Shopping',
      items: [
        { name: 'Laptop Stand', price: 45.99 },
        { name: 'USB Cable', price: 12.99 },
        { name: 'Phone Case', price: 25.99 }
      ],
      tags: ['online', 'electronics', 'office']
    },
    {
      id: 'receipt-5',
      merchant: 'CVS Pharmacy',
      total: 23.45,
      date: '2024-01-11',
      category: 'Health',
      items: [
        { name: 'Vitamins', price: 15.99 },
        { name: 'Toothpaste', price: 4.49 },
        { name: 'Bandages', price: 2.97 }
      ],
      tags: ['pharmacy', 'health', 'personal-care']
    }
  ];

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    receiptsPage = new ReceiptsPage(page);
    dashboardPage = new DashboardPage(page);

    // Login before each test
    await authPage.goto();
    await authPage.login(TEST_USERS.STANDARD_USER.email, TEST_USERS.STANDARD_USER.password);
    await page.waitForSelector('[data-testid="dashboard"]');

    // Mock receipts API with sample data
    await mockApiResponse(page, '**/api/receipts', {
      receipts: sampleReceipts,
      totalCount: sampleReceipts.length,
      pagination: {
        page: 1,
        limit: 20,
        totalPages: 1
      }
    });

    await mockApiResponse(page, '**/api/receipts/search*', {
      receipts: sampleReceipts,
      totalCount: sampleReceipts.length,
      searchTerm: '',
      filters: {}
    });
  });

  test.describe('Receipt List and Navigation', () => {
    test('should display receipts list with proper formatting', async ({ page }) => {
      await receiptsPage.goto();

      // Verify page loads correctly
      await expectElementVisible(page, '[data-testid="receipts-page"]');
      await expectElementVisible(page, '[data-testid="receipts-list"]');

      // Verify receipt count
      const receiptCount = await receiptsPage.getReceiptCount();
      expect(receiptCount).toBe(sampleReceipts.length);

      // Verify each receipt displays correctly
      for (let i = 0; i < sampleReceipts.length; i++) {
        const receipt = sampleReceipts[i];
        const receiptElement = page.locator('[data-testid="receipt-item"]').nth(i);

        await expectElementText(page, `[data-testid="receipt-merchant-${i}"]`, receipt.merchant);
        await expectElementText(page, `[data-testid="receipt-total-${i}"]`, receipt.total.toString());
        await expectElementText(page, `[data-testid="receipt-date-${i}"]`, receipt.date);
        await expectElementText(page, `[data-testid="receipt-category-${i}"]`, receipt.category);
      }

      // Verify receipt cards are properly formatted
      const receiptCards = page.locator('[data-testid="receipt-item"]');
      for (let i = 0; i < await receiptCards.count(); i++) {
        const card = receiptCards.nth(i);
        await expect(card).toBeVisible();
        await expect(card.locator('[data-testid*="merchant"]')).toBeVisible();
        await expect(card.locator('[data-testid*="total"]')).toBeVisible();
        await expect(card.locator('[data-testid*="date"]')).toBeVisible();
      }

      await takeScreenshot(page, 'receipts-list');
    });

    test('should navigate to receipt detail page', async ({ page }) => {
      await receiptsPage.goto();

      const firstReceipt = sampleReceipts[0];

      // Mock receipt detail API
      await mockApiResponse(page, `**/api/receipts/${firstReceipt.id}`, firstReceipt);

      // Click on first receipt
      await receiptsPage.clickReceiptByIndex(0);

      // Should navigate to detail page
      await page.waitForURL(`**/receipts/${firstReceipt.id}`);
      await expectElementVisible(page, '[data-testid="receipt-detail"]');

      // Verify receipt details are displayed
      await expectElementText(page, '[data-testid="detail-merchant"]', firstReceipt.merchant);
      await expectElementText(page, '[data-testid="detail-total"]', `$${firstReceipt.total}`);
      await expectElementText(page, '[data-testid="detail-date"]', firstReceipt.date);
      await expectElementText(page, '[data-testid="detail-category"]', firstReceipt.category);

      // Verify line items are displayed
      const itemElements = page.locator('[data-testid="receipt-item-line"]');
      await expectElementCount(page, '[data-testid="receipt-item-line"]', firstReceipt.items.length);

      for (let i = 0; i < firstReceipt.items.length; i++) {
        const item = firstReceipt.items[i];
        const itemElement = itemElements.nth(i);
        await expect(itemElement).toContainText(item.name);
        await expect(itemElement).toContainText(item.price.toString());
      }

      // Verify tags are displayed
      for (const tag of firstReceipt.tags) {
        await expect(page.locator(`[data-testid="tag-${tag}"]`)).toBeVisible();
      }
    });

    test('should handle empty receipt list gracefully', async ({ page }) => {
      // Mock empty receipts response
      await mockApiResponse(page, '**/api/receipts', {
        receipts: [],
        totalCount: 0,
        pagination: { page: 1, limit: 20, totalPages: 0 }
      });

      await receiptsPage.goto();

      // Should show empty state
      await expectElementVisible(page, '[data-testid="empty-receipts"]');
      await expectElementText(page, '[data-testid="empty-message"]', /no receipts found|upload your first receipt/i);
      await expectElementVisible(page, '[data-testid="upload-first-receipt"]');

      // Click upload button should navigate to upload page
      await page.click('[data-testid="upload-first-receipt"]');
      await page.waitForURL('**/upload');
    });
  });

  test.describe('Search Functionality', () => {
    test('should search receipts by merchant name', async ({ page }) => {
      await receiptsPage.goto();

      const searchTerm = 'Walmart';
      const expectedResults = sampleReceipts.filter(r =>
        r.merchant.toLowerCase().includes(searchTerm.toLowerCase())
      );

      // Mock search results
      await mockApiResponse(page, `**/api/receipts/search?q=${searchTerm}*`, {
        receipts: expectedResults,
        totalCount: expectedResults.length,
        searchTerm
      });

      // Perform search
      await receiptsPage.searchReceipts(searchTerm);

      // Verify search results
      const resultCount = await receiptsPage.getReceiptCount();
      expect(resultCount).toBe(expectedResults.length);

      // Verify search term is highlighted
      await expectElementVisible(page, '[data-testid="search-results-header"]');
      await expectElementText(page, '[data-testid="search-term"]', searchTerm);

      // Verify correct receipts are shown
      for (let i = 0; i < expectedResults.length; i++) {
        const receipt = expectedResults[i];
        await expectElementText(page, `[data-testid="receipt-merchant-${i}"]`, receipt.merchant);
      }

      // Test clear search
      await page.click('[data-testid="clear-search"]');
      await page.waitForTimeout(1000);

      const allReceiptsCount = await receiptsPage.getReceiptCount();
      expect(allReceiptsCount).toBe(sampleReceipts.length);
    });

    test('should search receipts by total amount range', async ({ page }) => {
      await receiptsPage.goto();

      // Test amount range search
      const minAmount = 50;
      const maxAmount = 150;
      const expectedResults = sampleReceipts.filter(r =>
        r.total >= minAmount && r.total <= maxAmount
      );

      await mockApiResponse(page, `**/api/receipts/search?minAmount=${minAmount}&maxAmount=${maxAmount}*`, {
        receipts: expectedResults,
        totalCount: expectedResults.length,
        filters: { minAmount, maxAmount }
      });

      // Open advanced search
      await page.click('[data-testid="advanced-search"]');

      // Enter amount range
      await page.fill('[data-testid="min-amount"]', minAmount.toString());
      await page.fill('[data-testid="max-amount"]', maxAmount.toString());
      await page.click('[data-testid="apply-filters"]');

      // Verify results
      const resultCount = await receiptsPage.getReceiptCount();
      expect(resultCount).toBe(expectedResults.length);

      // Verify all results are within range
      for (let i = 0; i < expectedResults.length; i++) {
        const receipt = expectedResults[i];
        expect(receipt.total).toBeGreaterThanOrEqual(minAmount);
        expect(receipt.total).toBeLessThanOrEqual(maxAmount);
      }
    });

    test('should search receipts by date range', async ({ page }) => {
      await receiptsPage.goto();

      const startDate = '2024-01-12';
      const endDate = '2024-01-15';
      const expectedResults = sampleReceipts.filter(r => {
        const receiptDate = new Date(r.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return receiptDate >= start && receiptDate <= end;
      });

      await mockApiResponse(page, `**/api/receipts/search?startDate=${startDate}&endDate=${endDate}*`, {
        receipts: expectedResults,
        totalCount: expectedResults.length,
        filters: { startDate, endDate }
      });

      // Open date range picker
      await page.click('[data-testid="date-range-filter"]');

      // Set date range
      await page.fill('[data-testid="start-date"]', startDate);
      await page.fill('[data-testid="end-date"]', endDate);
      await page.click('[data-testid="apply-date-range"]');

      // Verify results
      const resultCount = await receiptsPage.getReceiptCount();
      expect(resultCount).toBe(expectedResults.length);

      // Verify date range indicator
      await expectElementVisible(page, '[data-testid="active-date-filter"]');
      await expectElementText(page, '[data-testid="date-range-display"]', `${startDate} - ${endDate}`);
    });

    test('should search receipts by tags', async ({ page }) => {
      await receiptsPage.goto();

      const searchTag = 'groceries';
      const expectedResults = sampleReceipts.filter(r =>
        r.tags.includes(searchTag)
      );

      await mockApiResponse(page, `**/api/receipts/search?tags=${searchTag}*`, {
        receipts: expectedResults,
        totalCount: expectedResults.length,
        filters: { tags: [searchTag] }
      });

      // Click on tag filter
      await page.click('[data-testid="tag-filter"]');
      await page.click(`[data-testid="tag-option-${searchTag}"]`);

      // Verify results
      const resultCount = await receiptsPage.getReceiptCount();
      expect(resultCount).toBe(expectedResults.length);

      // Verify tag filter is active
      await expectElementVisible(page, `[data-testid="active-tag-${searchTag}"]`);
    });

    test('should handle no search results gracefully', async ({ page }) => {
      await receiptsPage.goto();

      const noResultsSearch = 'NonexistentStore';

      await mockApiResponse(page, `**/api/receipts/search?q=${noResultsSearch}*`, {
        receipts: [],
        totalCount: 0,
        searchTerm: noResultsSearch
      });

      await receiptsPage.searchReceipts(noResultsSearch);

      // Should show no results message
      await expectElementVisible(page, '[data-testid="no-search-results"]');
      await expectElementText(page, '[data-testid="no-results-message"]',
        /no receipts found|try different search terms/i);

      // Should show search suggestions
      await expectElementVisible(page, '[data-testid="search-suggestions"]');
      await expectElementVisible(page, '[data-testid="clear-search"]');
    });

    test('should provide search autocomplete and suggestions', async ({ page }) => {
      await receiptsPage.goto();

      // Mock autocomplete data
      await mockApiResponse(page, '**/api/receipts/autocomplete?q=Wal*', {
        suggestions: [
          { type: 'merchant', value: 'Walmart Supercenter', count: 5 },
          { type: 'merchant', value: 'Walgreens', count: 2 },
          { type: 'category', value: 'Groceries', count: 8 }
        ]
      });

      const searchInput = page.locator('[data-testid="receipt-search"]');
      await searchInput.fill('Wal');

      // Should show autocomplete dropdown
      await expectElementVisible(page, '[data-testid="search-autocomplete"]');

      const suggestions = page.locator('[data-testid="search-suggestion"]');
      await expect(suggestions).toHaveCount(3);

      // Click on first suggestion
      await suggestions.first().click();

      // Should perform search with selected suggestion
      await expectElementText(page, '[data-testid="receipt-search"]', 'Walmart Supercenter');
    });
  });

  test.describe('Filtering and Sorting', () => {
    test('should filter receipts by category', async ({ page }) => {
      await receiptsPage.goto();

      const category = 'Dining';
      const expectedResults = sampleReceipts.filter(r => r.category === category);

      await mockApiResponse(page, `**/api/receipts?category=${category}*`, {
        receipts: expectedResults,
        totalCount: expectedResults.length,
        filters: { category }
      });

      // Apply category filter
      await receiptsPage.filterByCategory(category);

      // Verify results
      const resultCount = await receiptsPage.getReceiptCount();
      expect(resultCount).toBe(expectedResults.length);

      // Verify all results have correct category
      for (let i = 0; i < expectedResults.length; i++) {
        await expectElementText(page, `[data-testid="receipt-category-${i}"]`, category);
      }

      // Verify filter indicator
      await expectElementVisible(page, `[data-testid="active-filter-category"]`);
    });

    test('should sort receipts by different criteria', async ({ page }) => {
      await receiptsPage.goto();

      // Test sort by amount (highest first)
      const sortedByAmount = [...sampleReceipts].sort((a, b) => b.total - a.total);

      await mockApiResponse(page, '**/api/receipts?sort=amount&order=desc*', {
        receipts: sortedByAmount,
        totalCount: sortedByAmount.length,
        sort: { field: 'amount', order: 'desc' }
      });

      await receiptsPage.sortBy('amount-desc');

      // Verify sort order
      for (let i = 0; i < Math.min(3, sortedByAmount.length); i++) {
        await expectElementText(page, `[data-testid="receipt-total-${i}"]`,
          sortedByAmount[i].total.toString());
      }

      // Test sort by date (newest first)
      const sortedByDate = [...sampleReceipts].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      await mockApiResponse(page, '**/api/receipts?sort=date&order=desc*', {
        receipts: sortedByDate,
        totalCount: sortedByDate.length,
        sort: { field: 'date', order: 'desc' }
      });

      await receiptsPage.sortBy('date-desc');

      // Verify date sort order
      for (let i = 0; i < Math.min(3, sortedByDate.length); i++) {
        await expectElementText(page, `[data-testid="receipt-date-${i}"]`,
          sortedByDate[i].date);
      }

      // Test sort by merchant name (A-Z)
      const sortedByMerchant = [...sampleReceipts].sort((a, b) =>
        a.merchant.localeCompare(b.merchant)
      );

      await mockApiResponse(page, '**/api/receipts?sort=merchant&order=asc*', {
        receipts: sortedByMerchant,
        totalCount: sortedByMerchant.length,
        sort: { field: 'merchant', order: 'asc' }
      });

      await receiptsPage.sortBy('merchant-asc');

      // Verify merchant sort order
      for (let i = 0; i < Math.min(3, sortedByMerchant.length); i++) {
        await expectElementText(page, `[data-testid="receipt-merchant-${i}"]`,
          sortedByMerchant[i].merchant);
      }
    });

    test('should combine multiple filters effectively', async ({ page }) => {
      await receiptsPage.goto();

      const category = 'Shopping';
      const minAmount = 100;
      const tag = 'electronics';

      const expectedResults = sampleReceipts.filter(r =>
        r.category === category &&
        r.total >= minAmount &&
        r.tags.includes(tag)
      );

      await mockApiResponse(page, `**/api/receipts?category=${category}&minAmount=${minAmount}&tags=${tag}*`, {
        receipts: expectedResults,
        totalCount: expectedResults.length,
        filters: { category, minAmount, tags: [tag] }
      });

      // Apply multiple filters
      await page.click('[data-testid="advanced-filters"]');
      await page.selectOption('[data-testid="category-filter"]', category);
      await page.fill('[data-testid="min-amount"]', minAmount.toString());
      await page.click(`[data-testid="tag-${tag}"]`);
      await page.click('[data-testid="apply-filters"]');

      // Verify results
      const resultCount = await receiptsPage.getReceiptCount();
      expect(resultCount).toBe(expectedResults.length);

      // Verify active filters are displayed
      await expectElementVisible(page, '[data-testid="active-filters"]');
      await expectElementVisible(page, `[data-testid="filter-chip-category"]`);
      await expectElementVisible(page, `[data-testid="filter-chip-amount"]`);
      await expectElementVisible(page, `[data-testid="filter-chip-tag"]`);

      // Test clear all filters
      await page.click('[data-testid="clear-all-filters"]');
      await page.waitForTimeout(1000);

      const clearedCount = await receiptsPage.getReceiptCount();
      expect(clearedCount).toBe(sampleReceipts.length);
    });
  });

  test.describe('Receipt Actions and Management', () => {
    test('should delete receipt with confirmation', async ({ page }) => {
      await receiptsPage.goto();

      const receiptToDelete = sampleReceipts[0];
      const remainingReceipts = sampleReceipts.slice(1);

      // Mock delete API
      await mockApiResponse(page, `**/api/receipts/${receiptToDelete.id}`, {
        success: true,
        message: 'Receipt deleted successfully'
      }, 'DELETE');

      // Mock updated receipts list
      await mockApiResponse(page, '**/api/receipts', {
        receipts: remainingReceipts,
        totalCount: remainingReceipts.length
      });

      const initialCount = await receiptsPage.getReceiptCount();

      // Delete first receipt
      await receiptsPage.deleteReceiptByIndex(0);

      // Verify confirmation dialog
      await expectElementVisible(page, '[data-testid="delete-confirmation"]');
      await expectElementText(page, '[data-testid="confirm-message"]',
        /are you sure.*delete.*receipt/i);

      // Confirm deletion
      await page.click('[data-testid="confirm-delete"]');

      // Verify success message
      await expectToastMessage(page, /receipt.*deleted|deletion.*successful/i);

      // Verify receipt is removed from list
      await page.waitForTimeout(1000);
      const newCount = await receiptsPage.getReceiptCount();
      expect(newCount).toBe(initialCount - 1);

      // Verify the correct receipt was deleted
      const merchantElements = page.locator('[data-testid*="receipt-merchant"]');
      const merchantTexts = await merchantElements.allTextContents();
      expect(merchantTexts).not.toContain(receiptToDelete.merchant);
    });

    test('should edit receipt details', async ({ page }) => {
      await receiptsPage.goto();

      const receiptToEdit = sampleReceipts[0];
      const updatedReceipt = {
        ...receiptToEdit,
        merchant: 'Updated Merchant Name',
        total: 999.99,
        category: 'Updated Category'
      };

      // Mock receipt detail and update APIs
      await mockApiResponse(page, `**/api/receipts/${receiptToEdit.id}`, receiptToEdit);
      await mockApiResponse(page, `**/api/receipts/${receiptToEdit.id}`, updatedReceipt, 'PUT');

      // Navigate to receipt detail
      await receiptsPage.clickReceiptByIndex(0);
      await page.waitForURL(`**/receipts/${receiptToEdit.id}`);

      // Start editing
      await page.click('[data-testid="edit-receipt"]');

      // Verify edit mode is active
      await expectElementVisible(page, '[data-testid="edit-form"]');

      // Update fields
      await page.fill('[data-testid="edit-merchant"]', updatedReceipt.merchant);
      await page.fill('[data-testid="edit-total"]', updatedReceipt.total.toString());
      await page.selectOption('[data-testid="edit-category"]', updatedReceipt.category);

      // Save changes
      await page.click('[data-testid="save-changes"]');

      // Verify success message
      await expectToastMessage(page, /receipt.*updated|changes.*saved/i);

      // Verify updated data is displayed
      await expectElementText(page, '[data-testid="detail-merchant"]', updatedReceipt.merchant);
      await expectElementText(page, '[data-testid="detail-total"]', `$${updatedReceipt.total}`);
      await expectElementText(page, '[data-testid="detail-category"]', updatedReceipt.category);
    });

    test('should add and manage receipt tags', async ({ page }) => {
      await receiptsPage.goto();

      const receipt = sampleReceipts[0];
      const newTags = ['important', 'business-expense', 'reimbursable'];

      await mockApiResponse(page, `**/api/receipts/${receipt.id}`, receipt);
      await mockApiResponse(page, `**/api/receipts/${receipt.id}/tags`, {
        success: true,
        tags: [...receipt.tags, ...newTags]
      }, 'POST');

      // Navigate to receipt detail
      await receiptsPage.clickReceiptByIndex(0);

      // Add new tags
      for (const tag of newTags) {
        await page.click('[data-testid="add-tag"]');
        await page.fill('[data-testid="new-tag-input"]', tag);
        await page.press('[data-testid="new-tag-input"]', 'Enter');

        // Verify tag is added
        await expectElementVisible(page, `[data-testid="tag-${tag}"]`);
      }

      // Test tag removal
      await page.click(`[data-testid="remove-tag-${newTags[0]}"]`);
      await expectElementVisible(page, `[data-testid="tag-${newTags[0]}"]`, false);

      // Test tag editing
      await page.click(`[data-testid="edit-tag-${newTags[1]}"]`);
      await page.fill('[data-testid="edit-tag-input"]', 'edited-tag');
      await page.press('[data-testid="edit-tag-input"]', 'Enter');

      await expectElementVisible(page, '[data-testid="tag-edited-tag"]');
    });

    test('should duplicate receipt', async ({ page }) => {
      await receiptsPage.goto();

      const originalReceipt = sampleReceipts[0];
      const duplicatedReceipt = {
        ...originalReceipt,
        id: 'receipt-duplicate-1',
        date: new Date().toISOString().split('T')[0], // Today's date
        duplicatedFrom: originalReceipt.id
      };

      await mockApiResponse(page, `**/api/receipts/${originalReceipt.id}`, originalReceipt);
      await mockApiResponse(page, '**/api/receipts/duplicate', duplicatedReceipt, 'POST');

      // Navigate to receipt detail
      await receiptsPage.clickReceiptByIndex(0);

      // Duplicate receipt
      await page.click('[data-testid="receipt-actions"]');
      await page.click('[data-testid="duplicate-receipt"]');

      // Verify duplication dialog
      await expectElementVisible(page, '[data-testid="duplicate-confirmation"]');
      await page.click('[data-testid="confirm-duplicate"]');

      // Verify success and navigation to new receipt
      await expectToastMessage(page, /receipt.*duplicated|copy.*created/i);
      await page.waitForURL(`**/receipts/${duplicatedReceipt.id}`);

      // Verify duplicated receipt data
      await expectElementText(page, '[data-testid="detail-merchant"]', duplicatedReceipt.merchant);
      await expectElementText(page, '[data-testid="detail-total"]', `$${duplicatedReceipt.total}`);

      // Verify duplicate indicator
      await expectElementVisible(page, '[data-testid="duplicate-indicator"]');
      await expectElementText(page, '[data-testid="original-receipt-link"]', originalReceipt.id);
    });

    test('should export receipt data', async ({ page }) => {
      await receiptsPage.goto();

      const receipt = sampleReceipts[0];

      await mockApiResponse(page, `**/api/receipts/${receipt.id}`, receipt);

      // Navigate to receipt detail
      await receiptsPage.clickReceiptByIndex(0);

      // Test PDF export
      await page.click('[data-testid="export-receipt"]');
      await page.click('[data-testid="export-pdf"]');

      // Wait for download
      const downloadPromise = page.waitForEvent('download');
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/receipt.*\.pdf$/i);

      // Test CSV export for receipts list
      await receiptsPage.goto();
      await page.click('[data-testid="export-all"]');
      await page.click('[data-testid="export-csv"]');

      const csvDownloadPromise = page.waitForEvent('download');
      const csvDownload = await csvDownloadPromise;

      expect(csvDownload.suggestedFilename()).toMatch(/receipts.*\.csv$/i);
    });
  });

  test.describe('Bulk Actions', () => {
    test('should select multiple receipts and perform bulk actions', async ({ page }) => {
      await receiptsPage.goto();

      // Enable bulk selection mode
      await page.click('[data-testid="bulk-select-mode"]');

      // Select multiple receipts
      await page.click('[data-testid="select-receipt-0"]');
      await page.click('[data-testid="select-receipt-1"]');
      await page.click('[data-testid="select-receipt-2"]');

      // Verify bulk actions toolbar appears
      await expectElementVisible(page, '[data-testid="bulk-actions-toolbar"]');
      await expectElementText(page, '[data-testid="selected-count"]', '3 selected');

      // Test bulk categorization
      await page.click('[data-testid="bulk-categorize"]');
      await page.selectOption('[data-testid="bulk-category-select"]', 'Business');
      await page.click('[data-testid="apply-bulk-category"]');

      await expectToastMessage(page, /3 receipts.*categorized/i);

      // Test bulk tag addition
      await page.click('[data-testid="bulk-add-tags"]');
      await page.fill('[data-testid="bulk-tag-input"]', 'bulk-processed');
      await page.click('[data-testid="apply-bulk-tags"]');

      await expectToastMessage(page, /tags.*added.*3 receipts/i);

      // Test bulk export
      await page.click('[data-testid="bulk-export"]');
      await page.click('[data-testid="export-selected-pdf"]');

      const bulkDownloadPromise = page.waitForEvent('download');
      const bulkDownload = await bulkDownloadPromise;
      expect(bulkDownload.suggestedFilename()).toMatch(/selected.*receipts.*\.pdf$/i);
    });

    test('should select all receipts with select all checkbox', async ({ page }) => {
      await receiptsPage.goto();

      // Enable bulk selection
      await page.click('[data-testid="bulk-select-mode"]');

      // Select all receipts
      await page.click('[data-testid="select-all-receipts"]');

      // Verify all receipts are selected
      const allCheckboxes = page.locator('[data-testid^="select-receipt-"]:checked');
      const checkedCount = await allCheckboxes.count();
      expect(checkedCount).toBe(sampleReceipts.length);

      // Verify select all indicator
      await expectElementText(page, '[data-testid="selected-count"]',
        `All ${sampleReceipts.length} selected`);

      // Test deselect all
      await page.click('[data-testid="deselect-all"]');
      const remainingChecked = await allCheckboxes.count();
      expect(remainingChecked).toBe(0);
    });

    test('should handle bulk delete with confirmation', async ({ page }) => {
      await receiptsPage.goto();

      const receiptIdsToDelete = [sampleReceipts[0].id, sampleReceipts[1].id];
      const remainingReceipts = sampleReceipts.slice(2);

      // Mock bulk delete API
      await mockApiResponse(page, '**/api/receipts/bulk-delete', {
        success: true,
        deletedCount: receiptIdsToDelete.length,
        deletedIds: receiptIdsToDelete
      }, 'POST');

      await mockApiResponse(page, '**/api/receipts', {
        receipts: remainingReceipts,
        totalCount: remainingReceipts.length
      });

      // Select receipts for deletion
      await page.click('[data-testid="bulk-select-mode"]');
      await page.click('[data-testid="select-receipt-0"]');
      await page.click('[data-testid="select-receipt-1"]');

      // Initiate bulk delete
      await page.click('[data-testid="bulk-delete"]');

      // Verify confirmation dialog
      await expectElementVisible(page, '[data-testid="bulk-delete-confirmation"]');
      await expectElementText(page, '[data-testid="bulk-delete-message"]',
        /delete.*2.*receipts.*permanently/i);

      // Confirm deletion
      await page.click('[data-testid="confirm-bulk-delete"]');

      // Verify success message
      await expectToastMessage(page, /2 receipts.*deleted/i);

      // Verify receipts are removed
      await page.waitForTimeout(1000);
      const remainingCount = await receiptsPage.getReceiptCount();
      expect(remainingCount).toBe(remainingReceipts.length);
    });
  });

  test.describe('Pagination and Performance', () => {
    test('should handle pagination correctly', async ({ page }) => {
      const totalReceipts = 50;
      const pageSize = 20;
      const totalPages = Math.ceil(totalReceipts / pageSize);

      // Generate large dataset
      const largeReceiptSet = Array.from({ length: totalReceipts }, (_, i) => ({
        id: `receipt-${i + 1}`,
        merchant: `Store ${i + 1}`,
        total: Math.round((Math.random() * 200 + 10) * 100) / 100,
        date: '2024-01-15',
        category: ['Groceries', 'Dining', 'Shopping', 'Transportation'][i % 4],
        items: [{ name: `Item ${i + 1}`, price: 10.99 }],
        tags: [`tag${i % 3}`]
      }));

      // Mock paginated response for page 1
      await mockApiResponse(page, '**/api/receipts?page=1*', {
        receipts: largeReceiptSet.slice(0, pageSize),
        totalCount: totalReceipts,
        pagination: {
          page: 1,
          limit: pageSize,
          totalPages,
          hasNext: true,
          hasPrevious: false
        }
      });

      await receiptsPage.goto();

      // Verify first page loads
      const firstPageCount = await receiptsPage.getReceiptCount();
      expect(firstPageCount).toBe(pageSize);

      // Verify pagination controls
      await expectElementVisible(page, '[data-testid="pagination"]');
      await expectElementText(page, '[data-testid="page-info"]', `1 of ${totalPages}`);
      await expectElementVisible(page, '[data-testid="next-page"]');

      // Mock page 2 response
      await mockApiResponse(page, '**/api/receipts?page=2*', {
        receipts: largeReceiptSet.slice(pageSize, pageSize * 2),
        totalCount: totalReceipts,
        pagination: {
          page: 2,
          limit: pageSize,
          totalPages,
          hasNext: true,
          hasPrevious: true
        }
      });

      // Navigate to page 2
      await page.click('[data-testid="next-page"]');
      await page.waitForTimeout(1000);

      // Verify page 2 content
      const secondPageCount = await receiptsPage.getReceiptCount();
      expect(secondPageCount).toBe(pageSize);
      await expectElementText(page, '[data-testid="page-info"]', `2 of ${totalPages}`);

      // Test direct page navigation
      await mockApiResponse(page, '**/api/receipts?page=3*', {
        receipts: largeReceiptSet.slice(pageSize * 2, pageSize * 3),
        totalCount: totalReceipts,
        pagination: {
          page: 3,
          limit: pageSize,
          totalPages,
          hasNext: false,
          hasPrevious: true
        }
      });

      await page.click('[data-testid="page-3"]');
      await page.waitForTimeout(1000);
      await expectElementText(page, '[data-testid="page-info"]', `3 of ${totalPages}`);
    });

    test('should handle loading states properly', async ({ page }) => {
      await receiptsPage.goto();

      // Mock slow API response
      await page.route('**/api/receipts/search*', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            receipts: sampleReceipts.slice(0, 2),
            totalCount: 2
          })
        });
      });

      // Trigger search
      await receiptsPage.searchReceipts('slow search');

      // Verify loading state
      await expectElementVisible(page, '[data-testid="loading-receipts"]');
      await expectElementVisible(page, '[data-testid="loading-spinner"]');

      // Wait for search to complete
      await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 });

      // Verify loading state is hidden
      await expect(page.locator('[data-testid="loading-receipts"]')).not.toBeVisible();
    });
  });
});