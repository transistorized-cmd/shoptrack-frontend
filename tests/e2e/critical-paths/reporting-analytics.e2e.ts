import { test, expect, Page } from '@playwright/test';
import {
  AuthPage,
  ReportsPage,
  DashboardPage,
  TEST_USERS,
  waitForPageLoad,
  takeScreenshot,
  expectToastMessage,
  waitForApiResponse,
  mockApiResponse,
  expectElementVisible,
  expectElementText,
  measurePageLoadTime
} from '../utils/test-helpers';

test.describe('Reporting and Analytics Critical Paths', () => {
  let authPage: AuthPage;
  let reportsPage: ReportsPage;
  let dashboardPage: DashboardPage;

  // Sample analytics data for testing
  const sampleAnalyticsData = {
    overview: {
      totalSpent: 2847.92,
      totalReceipts: 45,
      averageSpending: 63.29,
      mostExpensiveMonth: 'January 2024',
      topCategory: 'Groceries',
      trends: {
        weeklySpending: [120.50, 89.30, 156.78, 203.45, 78.90, 134.67, 198.23],
        monthlySpending: [1234.56, 1589.23, 1024.13],
        categoryBreakdown: [
          { category: 'Groceries', amount: 1247.83, percentage: 43.8 },
          { category: 'Dining', amount: 567.45, percentage: 19.9 },
          { category: 'Transportation', amount: 423.67, percentage: 14.9 },
          { category: 'Shopping', amount: 345.89, percentage: 12.1 },
          { category: 'Health', amount: 263.08, percentage: 9.3 }
        ]
      }
    },
    timeRange: {
      start: '2024-01-01',
      end: '2024-03-31',
      period: 'quarterly'
    },
    charts: {
      spendingTrends: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Monthly Spending',
          data: [1234.56, 1589.23, 1024.13, 1345.67, 987.45, 1156.78],
          backgroundColor: '#3B82F6'
        }]
      },
      categoryPieChart: {
        labels: ['Groceries', 'Dining', 'Transportation', 'Shopping', 'Health'],
        datasets: [{
          data: [1247.83, 567.45, 423.67, 345.89, 263.08],
          backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']
        }]
      },
      dailySpending: {
        labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
        data: Array.from({ length: 30 }, () => Math.random() * 100 + 20)
      }
    },
    insights: [
      {
        type: 'trend',
        title: 'Spending Increase',
        description: 'Your grocery spending increased by 23% this month',
        impact: 'medium',
        recommendation: 'Consider meal planning to reduce impulse purchases'
      },
      {
        type: 'pattern',
        title: 'Weekend Dining',
        description: 'You spend 40% more on dining during weekends',
        impact: 'low',
        recommendation: 'Try cooking at home on weekends to save money'
      },
      {
        type: 'achievement',
        title: 'Transportation Savings',
        description: 'You reduced transportation costs by 15% this quarter',
        impact: 'positive',
        recommendation: 'Keep up the good work with public transport usage'
      }
    ]
  };

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    reportsPage = new ReportsPage(page);
    dashboardPage = new DashboardPage(page);

    // Login before each test
    await authPage.goto();
    await authPage.login(TEST_USERS.STANDARD_USER.email, TEST_USERS.STANDARD_USER.password);
    await page.waitForSelector('[data-testid="dashboard"]');

    // Mock analytics API endpoints
    await mockApiResponse(page, '**/api/analytics/overview*', sampleAnalyticsData.overview);
    await mockApiResponse(page, '**/api/analytics/charts*', sampleAnalyticsData.charts);
    await mockApiResponse(page, '**/api/analytics/insights*', sampleAnalyticsData.insights);
  });

  test.describe('Dashboard Analytics Overview', () => {
    test('should display key metrics on dashboard', async ({ page }) => {
      await dashboardPage.goto();

      // Verify key metrics are displayed
      await expectElementVisible(page, '[data-testid="total-spending"]');
      await expectElementVisible(page, '[data-testid="total-receipts"]');
      await expectElementVisible(page, '[data-testid="average-spending"]');

      // Verify metric values
      await expectElementText(page, '[data-testid="total-spending"]', '$2,847.92');
      await expectElementText(page, '[data-testid="total-receipts"]', '45');
      await expectElementText(page, '[data-testid="average-spending"]', '$63.29');

      // Verify charts are present
      await expectElementVisible(page, '[data-testid="spending-trend-chart"]');
      await expectElementVisible(page, '[data-testid="category-breakdown-chart"]');

      // Verify quick insights
      await expectElementVisible(page, '[data-testid="quick-insights"]');
      const insightElements = page.locator('[data-testid="insight-item"]');
      await expect(insightElements).toHaveCount(3);

      await takeScreenshot(page, 'dashboard-analytics');
    });

    test('should show spending trends over time', async ({ page }) => {
      await dashboardPage.goto();

      // Wait for spending trend chart to load
      await expectElementVisible(page, '[data-testid="spending-trend-chart"]');

      // Verify chart data is loaded
      const chartData = await reportsPage.getChartData('spending-trend');
      expect(chartData.loaded).toBe(true);

      // Test chart interactions
      const chartContainer = page.locator('[data-testid="spending-trend-chart"]');

      // Hover over chart points to see tooltips
      await chartContainer.hover();
      await page.mouse.move(300, 200); // Move to approximate chart point

      // Verify tooltip appears (if implemented)
      await page.waitForTimeout(500);
      // Note: Specific tooltip testing would depend on chart library implementation

      // Test time period selector
      await page.click('[data-testid="trend-period-selector"]');
      await page.click('[data-testid="period-weekly"]');

      // Verify chart updates with weekly data
      await page.waitForTimeout(1000);
      await expectElementVisible(page, '[data-testid="weekly-trend-data"]');
    });

    test('should display category breakdown accurately', async ({ page }) => {
      await dashboardPage.goto();

      // Verify category breakdown chart
      await expectElementVisible(page, '[data-testid="category-breakdown-chart"]');

      // Verify category list with percentages
      const categories = sampleAnalyticsData.overview.trends.categoryBreakdown;
      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        await expectElementVisible(page, `[data-testid="category-${category.category.toLowerCase()}"]`);
        await expectElementText(page, `[data-testid="category-amount-${i}"]`, `$${category.amount}`);
        await expectElementText(page, `[data-testid="category-percentage-${i}"]`, `${category.percentage}%`);
      }

      // Test category filter interaction
      await page.click(`[data-testid="category-groceries"]`);
      await expectElementVisible(page, '[data-testid="category-detail-modal"]');
      await expectElementText(page, '[data-testid="category-name"]', 'Groceries');
      await expectElementText(page, '[data-testid="category-total"]', '$1,247.83');
    });

    test('should show personalized insights and recommendations', async ({ page }) => {
      await dashboardPage.goto();

      // Wait for insights to load
      await expectElementVisible(page, '[data-testid="quick-insights"]');

      const insights = sampleAnalyticsData.insights;
      for (let i = 0; i < insights.length; i++) {
        const insight = insights[i];
        const insightElement = page.locator(`[data-testid="insight-${i}"]`);

        await expect(insightElement).toBeVisible();
        await expect(insightElement.locator('[data-testid="insight-title"]')).toContainText(insight.title);
        await expect(insightElement.locator('[data-testid="insight-description"]')).toContainText(insight.description);

        // Verify insight type icon
        await expectElementVisible(page, `[data-testid="insight-icon-${insight.type}"]`);

        // Test insight action
        await insightElement.locator('[data-testid="insight-action"]').click();
        await expectElementVisible(page, '[data-testid="insight-detail-modal"]');
        await page.press('Escape', 'Escape'); // Close modal
      }
    });
  });

  test.describe('Detailed Reports Page', () => {
    test('should load comprehensive reports with performance', async ({ page }) => {
      const startTime = Date.now();

      await reportsPage.goto();

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds

      // Verify main report sections
      await expectElementVisible(page, '[data-testid="reports-page"]');
      await expectElementVisible(page, '[data-testid="date-range-selector"]');
      await expectElementVisible(page, '[data-testid="report-filters"]');
      await expectElementVisible(page, '[data-testid="export-options"]');

      // Verify all chart sections are present
      await expectElementVisible(page, '[data-testid="monthly-trends-section"]');
      await expectElementVisible(page, '[data-testid="category-analysis-section"]');
      await expectElementVisible(page, '[data-testid="merchant-analysis-section"]');
      await expectElementVisible(page, '[data-testid="spending-patterns-section"]');

      // Measure page load performance
      const pageLoadTime = await measurePageLoadTime(page);
      expect(pageLoadTime).toBeLessThan(3000);

      await takeScreenshot(page, 'reports-overview');
    });

    test('should filter reports by date range', async ({ page }) => {
      await reportsPage.goto();

      const customDateRange = {
        start: '2024-01-01',
        end: '2024-01-31',
        data: {
          totalSpent: 1234.56,
          totalReceipts: 15,
          monthlyTrend: [1234.56]
        }
      };

      // Mock date-filtered analytics
      await mockApiResponse(page,
        `**/api/analytics/overview?start=${customDateRange.start}&end=${customDateRange.end}*`,
        customDateRange.data
      );

      // Select custom date range
      await reportsPage.selectDateRange(customDateRange.start, customDateRange.end);

      // Verify reports update with new date range
      await expectElementText(page, '[data-testid="date-range-display"]',
        `${customDateRange.start} - ${customDateRange.end}`);

      // Verify metrics update
      await expectElementText(page, '[data-testid="filtered-total-spending"]', '$1,234.56');
      await expectElementText(page, '[data-testid="filtered-total-receipts"]', '15');

      // Test preset date ranges
      const presets = [
        { name: 'last-week', label: 'Last Week' },
        { name: 'last-month', label: 'Last Month' },
        { name: 'last-quarter', label: 'Last Quarter' },
        { name: 'last-year', label: 'Last Year' }
      ];

      for (const preset of presets) {
        await page.click('[data-testid="date-presets"]');
        await page.click(`[data-testid="preset-${preset.name}"]`);

        // Verify preset is applied
        await expectElementVisible(page, `[data-testid="active-preset-${preset.name}"]`);
        await page.waitForTimeout(1000); // Wait for data to load
      }
    });

    test('should compare different time periods', async ({ page }) => {
      await reportsPage.goto();

      const comparisonData = {
        current: {
          period: '2024-01-01 to 2024-01-31',
          totalSpent: 1234.56,
          totalReceipts: 15
        },
        previous: {
          period: '2023-12-01 to 2023-12-31',
          totalSpent: 987.45,
          totalReceipts: 12
        },
        comparison: {
          spendingChange: 25.0,
          receiptChange: 25.0,
          trend: 'increase'
        }
      };

      await mockApiResponse(page, '**/api/analytics/comparison*', comparisonData);

      // Enable comparison mode
      await page.click('[data-testid="enable-comparison"]');

      // Select comparison period
      await page.click('[data-testid="comparison-period"]');
      await page.click('[data-testid="previous-month"]');

      // Verify comparison data is displayed
      await expectElementVisible(page, '[data-testid="comparison-results"]');

      // Verify current period data
      await expectElementText(page, '[data-testid="current-spending"]', '$1,234.56');
      await expectElementText(page, '[data-testid="current-receipts"]', '15');

      // Verify previous period data
      await expectElementText(page, '[data-testid="previous-spending"]', '$987.45');
      await expectElementText(page, '[data-testid="previous-receipts"]', '12');

      // Verify change indicators
      await expectElementText(page, '[data-testid="spending-change"]', '+25.0%');
      await expectElementText(page, '[data-testid="receipts-change"]', '+25.0%');

      // Verify trend indicators
      await expectElementVisible(page, '[data-testid="spending-increase-indicator"]');
      await expectElementVisible(page, '[data-testid="receipts-increase-indicator"]');
    });

    test('should analyze spending by merchant', async ({ page }) => {
      const merchantAnalysis = {
        topMerchants: [
          { name: 'Walmart Supercenter', totalSpent: 456.78, receiptCount: 8, avgSpent: 57.10 },
          { name: 'Amazon', totalSpent: 234.56, receiptCount: 5, avgSpent: 46.91 },
          { name: 'Target', totalSpent: 189.34, receiptCount: 6, avgSpent: 31.56 },
          { name: 'Shell Gas Station', totalSpent: 167.89, receiptCount: 12, avgSpent: 14.00 },
          { name: 'Starbucks', totalSpent: 89.45, receiptCount: 15, avgSpent: 5.96 }
        ],
        merchantTrends: {
          growing: ['Amazon', 'Target'],
          declining: ['Shell Gas Station'],
          seasonal: ['Starbucks']
        }
      };

      await mockApiResponse(page, '**/api/analytics/merchants*', merchantAnalysis);

      await reportsPage.goto();

      // Navigate to merchant analysis section
      await page.click('[data-testid="merchant-analysis-tab"]');

      // Verify top merchants list
      await expectElementVisible(page, '[data-testid="top-merchants-list"]');

      for (let i = 0; i < merchantAnalysis.topMerchants.length; i++) {
        const merchant = merchantAnalysis.topMerchants[i];
        const merchantRow = page.locator(`[data-testid="merchant-row-${i}"]`);

        await expect(merchantRow.locator('[data-testid="merchant-name"]')).toContainText(merchant.name);
        await expect(merchantRow.locator('[data-testid="merchant-total"]')).toContainText(`$${merchant.totalSpent}`);
        await expect(merchantRow.locator('[data-testid="merchant-count"]')).toContainText(merchant.receiptCount.toString());
        await expect(merchantRow.locator('[data-testid="merchant-average"]')).toContainText(`$${merchant.avgSpent}`);
      }

      // Test merchant detail view
      await page.click('[data-testid="merchant-row-0"]');
      await expectElementVisible(page, '[data-testid="merchant-detail-modal"]');
      await expectElementText(page, '[data-testid="merchant-detail-name"]', merchantAnalysis.topMerchants[0].name);

      // Verify merchant spending trend chart
      await expectElementVisible(page, '[data-testid="merchant-trend-chart"]');

      // Test merchant search and filtering
      await page.press('Escape', 'Escape'); // Close modal
      await page.fill('[data-testid="merchant-search"]', 'Walmart');
      await page.waitForTimeout(500);

      const filteredResults = page.locator('[data-testid="merchant-row"]');
      await expect(filteredResults).toHaveCount(1);
      await expect(filteredResults.first()).toContainText('Walmart');
    });

    test('should show spending patterns and habits', async ({ page }) => {
      const spendingPatterns = {
        timePatterns: {
          hourly: {
            labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
            data: [5, 3, 1, 0, 0, 2, 8, 15, 25, 30, 35, 40, 45, 42, 38, 35, 30, 25, 20, 15, 12, 10, 8, 6]
          },
          weekly: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            data: [120, 89, 95, 110, 135, 180, 165]
          },
          monthly: {
            peakDay: 15,
            lowDay: 3,
            avgDailySpending: 45.67
          }
        },
        categoryPatterns: {
          weekdays: ['Groceries', 'Transportation', 'Dining'],
          weekends: ['Dining', 'Shopping', 'Entertainment'],
          monthStart: ['Groceries', 'Utilities'],
          monthEnd: ['Dining', 'Entertainment']
        },
        insights: [
          'You spend most on Fridays and Saturdays',
          'Grocery shopping peaks around 11 AM',
          'Dining expenses increase by 40% on weekends',
          'Monthly spending peaks mid-month around payday'
        ]
      };

      await mockApiResponse(page, '**/api/analytics/patterns*', spendingPatterns);

      await reportsPage.goto();

      // Navigate to spending patterns section
      await page.click('[data-testid="spending-patterns-tab"]');

      // Verify time-based patterns
      await expectElementVisible(page, '[data-testid="hourly-pattern-chart"]');
      await expectElementVisible(page, '[data-testid="weekly-pattern-chart"]');

      // Verify pattern insights
      const insightElements = page.locator('[data-testid="pattern-insight"]');
      await expect(insightElements).toHaveCount(spendingPatterns.insights.length);

      for (let i = 0; i < spendingPatterns.insights.length; i++) {
        await expect(insightElements.nth(i)).toContainText(spendingPatterns.insights[i]);
      }

      // Test pattern time selector
      await page.click('[data-testid="pattern-time-selector"]');
      await page.click('[data-testid="weekly-pattern"]');

      // Verify weekly pattern is displayed
      await expectElementVisible(page, '[data-testid="weekly-spending-chart"]');

      // Test category pattern comparison
      await page.click('[data-testid="weekday-vs-weekend"]');
      await expectElementVisible(page, '[data-testid="category-comparison-chart"]');

      // Verify weekday/weekend category differences
      await expectElementVisible(page, '[data-testid="weekday-categories"]');
      await expectElementVisible(page, '[data-testid="weekend-categories"]');
    });
  });

  test.describe('Export and Sharing', () => {
    test('should export reports in different formats', async ({ page }) => {
      await reportsPage.goto();

      // Test PDF export
      await page.click('[data-testid="export-options"]');
      await page.click('[data-testid="export-pdf"]');

      const pdfDownload = await reportsPage.exportReport('pdf');
      expect(pdfDownload.suggestedFilename()).toMatch(/report.*\.pdf$/i);

      // Test CSV export
      await page.click('[data-testid="export-options"]');
      await page.click('[data-testid="export-csv"]');

      const csvDownload = await reportsPage.exportReport('csv');
      expect(csvDownload.suggestedFilename()).toMatch(/report.*\.csv$/i);

      // Test Excel export
      await page.click('[data-testid="export-options"]');
      await page.click('[data-testid="export-excel"]');

      const excelDownload = await reportsPage.exportReport('excel');
      expect(excelDownload.suggestedFilename()).toMatch(/report.*\.xlsx$/i);

      // Test custom export with filters
      await page.click('[data-testid="custom-export"]');
      await page.check('[data-testid="include-charts"]');
      await page.check('[data-testid="include-details"]');
      await page.selectOption('[data-testid="export-format"]', 'pdf');
      await page.click('[data-testid="generate-custom-export"]');

      const customDownload = await page.waitForEvent('download');
      expect(customDownload.suggestedFilename()).toMatch(/custom.*report.*\.pdf$/i);
    });

    test('should share reports via email', async ({ page }) => {
      await reportsPage.goto();

      await mockApiResponse(page, '**/api/reports/share*', {
        success: true,
        shareId: 'share-123',
        message: 'Report shared successfully'
      }, 'POST');

      // Open share dialog
      await page.click('[data-testid="share-report"]');
      await expectElementVisible(page, '[data-testid="share-dialog"]');

      // Fill share form
      await page.fill('[data-testid="share-email"]', 'accountant@company.com');
      await page.fill('[data-testid="share-message"]', 'Here is the monthly expense report');
      await page.selectOption('[data-testid="share-format"]', 'pdf');

      // Send share
      await page.click('[data-testid="send-share"]');

      // Verify success message
      await expectToastMessage(page, /report.*shared.*successfully/i);

      // Test multiple recipients
      await page.click('[data-testid="share-report"]');
      await page.fill('[data-testid="share-emails"]', 'boss@company.com, accountant@company.com');
      await page.check('[data-testid="include-raw-data"]');
      await page.click('[data-testid="send-share"]');

      await expectToastMessage(page, /report.*shared.*2.*recipients/i);
    });

    test('should create scheduled reports', async ({ page }) => {
      await reportsPage.goto();

      await mockApiResponse(page, '**/api/reports/schedule*', {
        success: true,
        scheduleId: 'schedule-123',
        message: 'Report scheduled successfully'
      }, 'POST');

      // Open schedule dialog
      await page.click('[data-testid="schedule-report"]');
      await expectElementVisible(page, '[data-testid="schedule-dialog"]');

      // Configure schedule
      await page.fill('[data-testid="schedule-name"]', 'Monthly Expense Report');
      await page.selectOption('[data-testid="schedule-frequency"]', 'monthly');
      await page.selectOption('[data-testid="schedule-day"]', '1'); // 1st of month
      await page.fill('[data-testid="schedule-recipients"]', 'manager@company.com');

      // Set report parameters
      await page.selectOption('[data-testid="schedule-format"]', 'pdf');
      await page.check('[data-testid="include-charts"]');
      await page.check('[data-testid="include-insights"]');

      // Create schedule
      await page.click('[data-testid="create-schedule"]');

      // Verify success
      await expectToastMessage(page, /report.*scheduled.*successfully/i);

      // Verify schedule appears in list
      await expectElementVisible(page, '[data-testid="active-schedules"]');
      await expectElementText(page, '[data-testid="schedule-item-0"]', 'Monthly Expense Report');

      // Test schedule management
      await page.click('[data-testid="edit-schedule-0"]');
      await expectElementVisible(page, '[data-testid="edit-schedule-dialog"]');

      await page.click('[data-testid="pause-schedule-0"]');
      await expectElementVisible(page, '[data-testid="schedule-paused-indicator"]');
    });
  });

  test.describe('Advanced Analytics Features', () => {
    test('should provide budget tracking and alerts', async ({ page }) => {
      const budgetData = {
        budgets: [
          {
            category: 'Groceries',
            budgetAmount: 500.00,
            spentAmount: 387.45,
            percentage: 77.5,
            status: 'on-track',
            daysRemaining: 12
          },
          {
            category: 'Dining',
            budgetAmount: 200.00,
            spentAmount: 245.67,
            percentage: 122.8,
            status: 'over-budget',
            daysRemaining: 12
          },
          {
            category: 'Transportation',
            budgetAmount: 150.00,
            spentAmount: 89.34,
            percentage: 59.6,
            status: 'under-budget',
            daysRemaining: 12
          }
        ],
        alerts: [
          {
            type: 'over-budget',
            category: 'Dining',
            message: 'You have exceeded your dining budget by $45.67',
            severity: 'high'
          },
          {
            type: 'approaching-limit',
            category: 'Groceries',
            message: 'You have used 77% of your grocery budget',
            severity: 'medium'
          }
        ]
      };

      await mockApiResponse(page, '**/api/analytics/budgets*', budgetData);

      await reportsPage.goto();

      // Navigate to budget tracking section
      await page.click('[data-testid="budget-tracking-tab"]');

      // Verify budget overview
      await expectElementVisible(page, '[data-testid="budget-overview"]');

      for (let i = 0; i < budgetData.budgets.length; i++) {
        const budget = budgetData.budgets[i];
        const budgetCard = page.locator(`[data-testid="budget-card-${i}"]`);

        await expect(budgetCard.locator('[data-testid="budget-category"]')).toContainText(budget.category);
        await expect(budgetCard.locator('[data-testid="budget-spent"]')).toContainText(`$${budget.spentAmount}`);
        await expect(budgetCard.locator('[data-testid="budget-total"]')).toContainText(`$${budget.budgetAmount}`);
        await expect(budgetCard.locator('[data-testid="budget-percentage"]')).toContainText(`${budget.percentage}%`);

        // Verify status indicators
        await expectElementVisible(page, `[data-testid="budget-status-${budget.status}"]`);
      }

      // Verify budget alerts
      await expectElementVisible(page, '[data-testid="budget-alerts"]');
      const alertElements = page.locator('[data-testid="budget-alert"]');
      await expect(alertElements).toHaveCount(budgetData.alerts.length);

      // Test budget adjustment
      await page.click('[data-testid="edit-budget-0"]');
      await expectElementVisible(page, '[data-testid="budget-edit-dialog"]');
      await page.fill('[data-testid="budget-amount-input"]', '600.00');
      await page.click('[data-testid="save-budget"]');

      await expectToastMessage(page, /budget.*updated/i);
    });

    test('should show tax-related reporting features', async ({ page }) => {
      const taxData = {
        summary: {
          totalDeductible: 1245.67,
          businessExpenses: 890.34,
          charitableDonations: 255.33,
          medicalExpenses: 100.00
        },
        categories: [
          { name: 'Business Meals', amount: 456.78, deductible: true, percentage: 50 },
          { name: 'Office Supplies', amount: 234.56, deductible: true, percentage: 100 },
          { name: 'Travel', amount: 199.00, deductible: true, percentage: 100 },
          { name: 'Medical', amount: 100.00, deductible: true, percentage: 100 }
        ],
        documents: [
          { receiptId: 'receipt-1', merchant: 'Office Depot', amount: 45.67, category: 'Business' },
          { receiptId: 'receipt-2', merchant: 'Airport Parking', amount: 15.00, category: 'Travel' }
        ]
      };

      await mockApiResponse(page, '**/api/analytics/tax*', taxData);

      await reportsPage.goto();

      // Navigate to tax reporting section
      await page.click('[data-testid="tax-reporting-tab"]');

      // Verify tax summary
      await expectElementVisible(page, '[data-testid="tax-summary"]');
      await expectElementText(page, '[data-testid="total-deductible"]', `$${taxData.summary.totalDeductible}`);
      await expectElementText(page, '[data-testid="business-expenses"]', `$${taxData.summary.businessExpenses}`);

      // Verify deductible categories
      for (let i = 0; i < taxData.categories.length; i++) {
        const category = taxData.categories[i];
        const categoryRow = page.locator(`[data-testid="tax-category-${i}"]`);

        await expect(categoryRow.locator('[data-testid="category-name"]')).toContainText(category.name);
        await expect(categoryRow.locator('[data-testid="category-amount"]')).toContainText(`$${category.amount}`);
        await expect(categoryRow.locator('[data-testid="deductible-percentage"]')).toContainText(`${category.percentage}%`);
      }

      // Test tax document export
      await page.click('[data-testid="export-tax-documents"]');
      await page.selectOption('[data-testid="tax-year"]', '2024');
      await page.click('[data-testid="generate-tax-export"]');

      const taxExport = await page.waitForEvent('download');
      expect(taxExport.suggestedFilename()).toMatch(/tax.*2024.*\.pdf$/i);

      // Test receipt categorization for taxes
      await page.click('[data-testid="categorize-for-taxes"]');
      await expectElementVisible(page, '[data-testid="tax-categorization-tool"]');

      const uncategorizedReceipts = page.locator('[data-testid="uncategorized-receipt"]');
      if (await uncategorizedReceipts.count() > 0) {
        await uncategorizedReceipts.first().click();
        await page.selectOption('[data-testid="tax-category-select"]', 'business-expense');
        await page.click('[data-testid="save-tax-category"]');

        await expectToastMessage(page, /receipt.*categorized.*tax/i);
      }
    });

    test('should provide forecasting and predictions', async ({ page }) => {
      const forecastData = {
        spending: {
          nextMonth: {
            predicted: 1456.78,
            confidence: 85,
            range: { low: 1234.56, high: 1678.90 }
          },
          nextQuarter: {
            predicted: 4567.89,
            confidence: 78,
            range: { low: 3890.12, high: 5245.66 }
          }
        },
        trends: {
          categories: [
            { name: 'Groceries', trend: 'increasing', change: 12.5 },
            { name: 'Transportation', trend: 'decreasing', change: -8.3 },
            { name: 'Dining', trend: 'stable', change: 2.1 }
          ]
        },
        recommendations: [
          'Based on current trends, consider reducing dining expenses by 15%',
          'Your grocery spending is increasing - meal planning could save $150/month',
          'Transportation costs are declining - great job using public transport!'
        ]
      };

      await mockApiResponse(page, '**/api/analytics/forecast*', forecastData);

      await reportsPage.goto();

      // Navigate to forecasting section
      await page.click('[data-testid="forecasting-tab"]');

      // Verify spending predictions
      await expectElementVisible(page, '[data-testid="spending-forecast"]');
      await expectElementText(page, '[data-testid="next-month-prediction"]', `$${forecastData.spending.nextMonth.predicted}`);
      await expectElementText(page, '[data-testid="prediction-confidence"]', `${forecastData.spending.nextMonth.confidence}%`);

      // Verify forecast range
      await expectElementText(page, '[data-testid="forecast-range-low"]', `$${forecastData.spending.nextMonth.range.low}`);
      await expectElementText(page, '[data-testid="forecast-range-high"]', `$${forecastData.spending.nextMonth.range.high}`);

      // Verify trend predictions
      for (let i = 0; i < forecastData.trends.categories.length; i++) {
        const trend = forecastData.trends.categories[i];
        const trendElement = page.locator(`[data-testid="trend-${i}"]`);

        await expect(trendElement.locator('[data-testid="trend-category"]')).toContainText(trend.name);
        await expect(trendElement.locator('[data-testid="trend-direction"]')).toContainText(trend.trend);
        await expect(trendElement.locator('[data-testid="trend-change"]')).toContainText(`${Math.abs(trend.change)}%`);
      }

      // Test forecast adjustments
      await page.click('[data-testid="adjust-forecast"]');
      await expectElementVisible(page, '[data-testid="forecast-adjustment-dialog"]');

      await page.fill('[data-testid="income-change"]', '5'); // 5% income increase
      await page.check('[data-testid="seasonal-adjustment"]');
      await page.click('[data-testid="recalculate-forecast"]');

      // Verify adjusted forecast
      await expectElementVisible(page, '[data-testid="adjusted-forecast"]');
      await page.waitForTimeout(1000);

      // Test scenario planning
      await page.click('[data-testid="scenario-planning"]');
      await page.click('[data-testid="scenario-economic-downturn"]');

      await expectElementVisible(page, '[data-testid="scenario-results"]');
      await expectElementText(page, '[data-testid="scenario-impact"]', /spending.*reduce/i);
    });
  });

  test.describe('Performance and Optimization', () => {
    test('should handle large datasets efficiently', async ({ page }) => {
      // Generate large dataset for performance testing
      const largeDataset = {
        receipts: Array.from({ length: 1000 }, (_, i) => ({
          id: `receipt-${i}`,
          amount: Math.random() * 200 + 10,
          date: `2024-01-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
          category: ['Groceries', 'Dining', 'Shopping', 'Transportation'][i % 4]
        })),
        aggregatedData: {
          totalSpent: 125678.90,
          avgPerReceipt: 125.68
        }
      };

      await mockApiResponse(page, '**/api/analytics/large-dataset*', largeDataset);

      const startTime = Date.now();

      await reportsPage.goto();
      await page.click('[data-testid="load-large-dataset"]');

      // Wait for data to load
      await expectElementVisible(page, '[data-testid="large-dataset-loaded"]', { timeout: 10000 });

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(8000); // Should handle large dataset within 8 seconds

      // Verify data is properly paginated/virtualized
      await expectElementVisible(page, '[data-testid="virtual-scroll"]');
      await expectElementText(page, '[data-testid="total-items"]', '1000');

      // Test scrolling performance
      const scrollContainer = page.locator('[data-testid="data-scroll-container"]');
      await scrollContainer.scrollIntoViewIfNeeded();

      const scrollStartTime = Date.now();
      for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, 1000);
        await page.waitForTimeout(100);
      }
      const scrollTime = Date.now() - scrollStartTime;
      expect(scrollTime).toBeLessThan(3000); // Smooth scrolling
    });

    test('should cache and optimize repeated queries', async ({ page }) => {
      let apiCallCount = 0;

      // Mock API with call counter
      await page.route('**/api/analytics/overview*', route => {
        apiCallCount++;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(sampleAnalyticsData.overview)
        });
      });

      await reportsPage.goto();

      // Initial load
      await expectElementVisible(page, '[data-testid="reports-page"]');
      expect(apiCallCount).toBe(1);

      // Navigate away and back
      await dashboardPage.goto();
      await reportsPage.goto();

      // Should use cached data (no additional API call)
      await expectElementVisible(page, '[data-testid="reports-page"]');
      expect(apiCallCount).toBe(1); // Still 1 if caching works

      // Force refresh should make new API call
      await page.reload();
      await expectElementVisible(page, '[data-testid="reports-page"]');
      expect(apiCallCount).toBe(2);
    });
  });
});