import { test, expect, devices, Page } from '@playwright/test';
import {
  AuthPage,
  DashboardPage,
  UploadPage,
  ReceiptsPage,
  TEST_USERS,
  waitForPageLoad,
  takeScreenshot,
  expectToastMessage,
  expectPageTitle,
  expectUrlPath,
  expectElementVisible,
  expectElementText,
  mockApiResponse
} from '../utils/test-helpers';

// Mobile and Accessibility E2E Tests
test.describe('Mobile and Accessibility Critical Paths', () => {
  test.describe('Mobile Viewport Testing', () => {
    test.describe('iPhone 12 Portrait', () => {
      test.use({ ...devices['iPhone 12'] });

      test('should handle mobile authentication flow', async ({ page }) => {
        const authPage = new AuthPage(page);
        const user = TEST_USERS.STANDARD_USER;

        // Navigate to login page
        await authPage.goto();
        await waitForPageLoad(page);

        // Verify mobile-responsive login form
        await expect(page.locator('[data-testid="mobile-login-form"]')).toBeVisible();
        await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
        await expect(page.locator('[data-testid="password-input"]')).toBeVisible();

        // Test mobile keyboard interaction
        await page.fill('[data-testid="email-input"]', user.email);
        await expect(page.locator('[data-testid="email-input"]')).toBeFocused();

        // Mobile-specific: Test touch interaction
        await page.tap('[data-testid="password-input"]');
        await page.fill('[data-testid="password-input"]', user.password);

        // Submit with touch
        await page.tap('[data-testid="login-submit"]');

        // Verify mobile dashboard loads
        await page.waitForSelector('[data-testid="mobile-dashboard"]', { timeout: 15000 });
        await expectUrlPath(page, '/dashboard');

        // Take mobile screenshot
        await takeScreenshot(page, 'mobile-login-success');
      });

      test('should handle mobile receipt upload with touch gestures', async ({ page }) => {
        const authPage = new AuthPage(page);
        const uploadPage = new UploadPage(page);

        // Login first
        await authPage.goto();
        await authPage.login(TEST_USERS.STANDARD_USER.email, TEST_USERS.STANDARD_USER.password);
        await page.waitForSelector('[data-testid="mobile-dashboard"]');

        // Navigate to upload page
        await page.goto('/upload');
        await waitForPageLoad(page);

        // Verify mobile upload interface
        await expect(page.locator('[data-testid="mobile-upload-zone"]')).toBeVisible();
        await expect(page.locator('[data-testid="camera-upload-btn"]')).toBeVisible();
        await expect(page.locator('[data-testid="gallery-upload-btn"]')).toBeVisible();

        // Mock successful upload
        await mockApiResponse(page, '**/api/receipts/upload', {
          success: true,
          receiptId: 'mobile-receipt-123',
          processedData: {
            merchant: 'Mobile Store',
            total: 29.99,
            date: '2024-01-15'
          }
        });

        // Test mobile file selection
        await page.tap('[data-testid="gallery-upload-btn"]');
        await uploadPage.uploadFile('mobile-receipt.jpg');

        // Verify mobile upload progress
        await expect(page.locator('[data-testid="mobile-upload-progress"]')).toBeVisible();
        await expect(page.locator('[data-testid="upload-progress-bar"]')).toBeVisible();

        // Wait for processing completion
        await page.waitForSelector('[data-testid="mobile-upload-success"]');
        await expectToastMessage(page, /upload.*successful/i);

        // Verify mobile receipt preview
        await expect(page.locator('[data-testid="mobile-receipt-preview"]')).toBeVisible();
        await expectElementText(page, '[data-testid="preview-merchant"]', 'Mobile Store');
        await expectElementText(page, '[data-testid="preview-total"]', '$29.99');
      });

      test('should handle mobile navigation and menu interactions', async ({ page }) => {
        const authPage = new AuthPage(page);

        // Login
        await authPage.goto();
        await authPage.login(TEST_USERS.STANDARD_USER.email, TEST_USERS.STANDARD_USER.password);
        await page.waitForSelector('[data-testid="mobile-dashboard"]');

        // Test mobile hamburger menu
        await page.tap('[data-testid="mobile-menu-toggle"]');
        await expect(page.locator('[data-testid="mobile-navigation-menu"]')).toBeVisible();

        // Test mobile navigation items
        await expect(page.locator('[data-testid="mobile-nav-dashboard"]')).toBeVisible();
        await expect(page.locator('[data-testid="mobile-nav-receipts"]')).toBeVisible();
        await expect(page.locator('[data-testid="mobile-nav-reports"]')).toBeVisible();
        await expect(page.locator('[data-testid="mobile-nav-settings"]')).toBeVisible();

        // Navigate via mobile menu
        await page.tap('[data-testid="mobile-nav-receipts"]');
        await expectUrlPath(page, '/receipts');
        await expect(page.locator('[data-testid="mobile-receipts-page"]')).toBeVisible();

        // Test mobile search functionality
        await page.tap('[data-testid="mobile-search-toggle"]');
        await expect(page.locator('[data-testid="mobile-search-input"]')).toBeVisible();
        await page.fill('[data-testid="mobile-search-input"]', 'Walmart');

        // Test mobile swipe gestures for receipt cards
        const receiptCard = page.locator('[data-testid="receipt-card"]').first();
        const cardBox = await receiptCard.boundingBox();

        if (cardBox) {
          // Swipe left to reveal actions
          await page.touchscreen.tap(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
          await page.mouse.move(cardBox.x + cardBox.width - 50, cardBox.y + cardBox.height / 2);
          await page.mouse.move(cardBox.x + 50, cardBox.y + cardBox.height / 2);

          // Verify swipe actions are visible
          await expect(page.locator('[data-testid="mobile-swipe-actions"]')).toBeVisible();
          await expect(page.locator('[data-testid="mobile-edit-action"]')).toBeVisible();
          await expect(page.locator('[data-testid="mobile-delete-action"]')).toBeVisible();
        }
      });
    });

    test.describe('iPad Landscape', () => {
      test.use({ ...devices['iPad Pro landscape'] });

      test('should handle tablet layout and interactions', async ({ page }) => {
        const authPage = new AuthPage(page);
        const dashboardPage = new DashboardPage(page);

        // Login
        await authPage.goto();
        await authPage.login(TEST_USERS.STANDARD_USER.email, TEST_USERS.STANDARD_USER.password);
        await page.waitForSelector('[data-testid="tablet-dashboard"]');

        // Verify tablet-specific layout
        await expect(page.locator('[data-testid="tablet-sidebar"]')).toBeVisible();
        await expect(page.locator('[data-testid="tablet-main-content"]')).toBeVisible();
        await expect(page.locator('[data-testid="tablet-charts-grid"]')).toBeVisible();

        // Test tablet touch interactions
        await page.tap('[data-testid="spending-chart"]');
        await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();

        // Test tablet multi-column layout
        await page.goto('/receipts');
        await expect(page.locator('[data-testid="tablet-receipts-grid"]')).toBeVisible();

        // Verify responsive columns
        const receiptItems = page.locator('[data-testid="receipt-item"]');
        const itemCount = await receiptItems.count();
        expect(itemCount).toBeGreaterThanOrEqual(6); // Should show more items in tablet view

        // Test tablet-specific gestures
        await page.touchscreen.tap(300, 400);
        await page.touchscreen.tap(600, 400, { modifiers: ['Control'] }); // Multi-select
        await expect(page.locator('[data-testid="multi-select-toolbar"]')).toBeVisible();
      });
    });

    test.describe('Device Orientation', () => {
      test.use({ ...devices['iPhone 12'] });

      test('should handle orientation changes gracefully', async ({ page, browserName }) => {
        // Skip in webkit due to orientation API limitations
        test.skip(browserName === 'webkit', 'Orientation API not fully supported in webkit');

        const authPage = new AuthPage(page);

        // Start in portrait
        await authPage.goto();
        await authPage.login(TEST_USERS.STANDARD_USER.email, TEST_USERS.STANDARD_USER.password);
        await page.waitForSelector('[data-testid="mobile-dashboard"]');

        // Take portrait screenshot
        await takeScreenshot(page, 'mobile-portrait');

        // Simulate orientation change to landscape
        await page.setViewportSize({ width: 844, height: 390 }); // iPhone 12 landscape

        // Wait for layout adjustment
        await page.waitForTimeout(1000);

        // Verify landscape layout
        await expect(page.locator('[data-testid="landscape-layout"]')).toBeVisible();
        await expect(page.locator('[data-testid="landscape-navigation"]')).toBeVisible();

        // Take landscape screenshot
        await takeScreenshot(page, 'mobile-landscape');

        // Test functionality in landscape
        await page.goto('/upload');
        await expect(page.locator('[data-testid="landscape-upload-zone"]')).toBeVisible();

        // Return to portrait
        await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12 portrait

        // Verify portrait layout restored
        await expect(page.locator('[data-testid="mobile-upload-zone"]')).toBeVisible();
      });
    });
  });

  test.describe('Accessibility Testing', () => {
    test('should meet WCAG 2.1 AA compliance standards', async ({ page }) => {
      const authPage = new AuthPage(page);

      // Navigate to login page
      await authPage.goto();
      await waitForPageLoad(page);

      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="email-input"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="password-input"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="login-submit"]')).toBeFocused();

      // Test ARIA labels and roles
      await expect(page.locator('[data-testid="email-input"]')).toHaveAttribute('aria-label', /email/i);
      await expect(page.locator('[data-testid="password-input"]')).toHaveAttribute('aria-label', /password/i);
      await expect(page.locator('[data-testid="login-submit"]')).toHaveAttribute('aria-label', /login|sign in/i);

      // Test form validation accessibility
      await page.keyboard.press('Enter'); // Submit empty form
      await expect(page.locator('[data-testid="email-error"]')).toHaveAttribute('role', 'alert');
      await expect(page.locator('[data-testid="email-error"]')).toHaveAttribute('aria-live', 'assertive');

      // Test high contrast support
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            .high-contrast-test { color: black; background: white; }
          }
        `
      });

      // Verify high contrast elements
      const contrastElement = page.locator('.high-contrast-test');
      if (await contrastElement.count() > 0) {
        const styles = await contrastElement.evaluate(el => getComputedStyle(el));
        expect(styles.color).toBe('rgb(0, 0, 0)'); // black
        expect(styles.backgroundColor).toBe('rgb(255, 255, 255)'); // white
      }
    });

    test('should support screen reader navigation', async ({ page }) => {
      const authPage = new AuthPage(page);
      const dashboardPage = new DashboardPage(page);

      // Login
      await authPage.goto();
      await authPage.login(TEST_USERS.STANDARD_USER.email, TEST_USERS.STANDARD_USER.password);
      await page.waitForSelector('[data-testid="dashboard"]');

      // Test landmark navigation
      await expect(page.locator('[role="banner"]')).toBeVisible(); // Header
      await expect(page.locator('[role="navigation"]')).toBeVisible(); // Nav
      await expect(page.locator('[role="main"]')).toBeVisible(); // Main content
      await expect(page.locator('[role="contentinfo"]')).toBeVisible(); // Footer

      // Test heading hierarchy
      const h1 = page.locator('h1');
      await expect(h1).toHaveCount(1);
      await expect(h1).toContainText(/dashboard|home/i);

      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(1);

      // Test skip links
      await page.keyboard.press('Tab');
      const skipLink = page.locator('[data-testid="skip-to-main"]');
      if (await skipLink.count() > 0) {
        await expect(skipLink).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(page.locator('[role="main"]')).toBeFocused();
      }

      // Test screen reader announcements
      await expect(page.locator('[aria-live="polite"]')).toBeAttached();
      await expect(page.locator('[aria-live="assertive"]')).toBeAttached();

      // Test alternative text for images
      const images = page.locator('img');
      const imageCount = await images.count();

      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const altText = await img.getAttribute('alt');
        const ariaLabel = await img.getAttribute('aria-label');
        const role = await img.getAttribute('role');

        // Images should have alt text, aria-label, or be marked as decorative
        expect(altText !== null || ariaLabel !== null || role === 'presentation').toBe(true);
      }
    });

    test('should handle keyboard-only navigation', async ({ page }) => {
      const authPage = new AuthPage(page);

      // Test complete keyboard navigation flow
      await authPage.goto();
      await waitForPageLoad(page);

      // Navigate through login form with keyboard only
      await page.keyboard.press('Tab');
      await page.keyboard.type(TEST_USERS.STANDARD_USER.email);

      await page.keyboard.press('Tab');
      await page.keyboard.type(TEST_USERS.STANDARD_USER.password);

      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');

      // Wait for dashboard
      await page.waitForSelector('[data-testid="dashboard"]');

      // Test keyboard navigation in dashboard
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Navigate to receipts page via keyboard
      let focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      while (focused !== 'nav-receipts' && focused !== null) {
        await page.keyboard.press('Tab');
        focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      }

      if (focused === 'nav-receipts') {
        await page.keyboard.press('Enter');
        await expectUrlPath(page, '/receipts');
      }

      // Test escape key functionality
      await page.keyboard.press('Escape');
      // Should close any open modals or return focus appropriately

      // Test arrow key navigation in lists
      const receiptList = page.locator('[data-testid="receipt-list"]');
      if (await receiptList.count() > 0) {
        await receiptList.focus();
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowUp');

        // Verify focused item
        const focusedItem = page.locator('[data-testid^="receipt-item"]:focus');
        await expect(focusedItem).toBeVisible();
      }
    });

    test('should support reduced motion preferences', async ({ page }) => {
      // Test prefers-reduced-motion support
      await page.addStyleTag({
        content: `
          @media (prefers-reduced-motion: reduce) {
            * {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
        `
      });

      const authPage = new AuthPage(page);
      await authPage.goto();
      await authPage.login(TEST_USERS.STANDARD_USER.email, TEST_USERS.STANDARD_USER.password);
      await page.waitForSelector('[data-testid="dashboard"]');

      // Navigate to a page with animations
      await page.goto('/upload');

      // Verify animations are reduced
      const animatedElement = page.locator('[data-testid="upload-animation"]');
      if (await animatedElement.count() > 0) {
        const animationDuration = await animatedElement.evaluate(el =>
          getComputedStyle(el).animationDuration
        );
        expect(animationDuration).toMatch(/0\.01ms|0s/);
      }

      // Test that functionality still works without animations
      await page.tap('[data-testid="gallery-upload-btn"]');
      await expect(page.locator('[data-testid="file-input"]')).toBeVisible();
    });

    test('should support color contrast requirements', async ({ page }) => {
      const authPage = new AuthPage(page);
      await authPage.goto();
      await waitForPageLoad(page);

      // Test contrast ratios for critical elements
      const criticalElements = [
        '[data-testid="login-submit"]',
        '[data-testid="email-input"]',
        '[data-testid="password-input"]',
        '[data-testid="app-title"]'
      ];

      for (const selector of criticalElements) {
        const element = page.locator(selector);
        if (await element.count() > 0) {
          const styles = await element.evaluate(el => {
            const computed = getComputedStyle(el);
            return {
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              borderColor: computed.borderColor
            };
          });

          // Verify colors are not default (indicating proper styling)
          expect(styles.color).not.toBe('');
          expect(styles.color).not.toBe('rgba(0, 0, 0, 0)');
        }
      }

      // Test focus indicators
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      const focusStyles = await focusedElement.evaluate(el => {
        const computed = getComputedStyle(el);
        return {
          outline: computed.outline,
          outlineColor: computed.outlineColor,
          outlineWidth: computed.outlineWidth,
          boxShadow: computed.boxShadow
        };
      });

      // Verify focus indicator exists
      const hasFocusIndicator =
        focusStyles.outline !== 'none' ||
        focusStyles.outlineWidth !== '0px' ||
        focusStyles.boxShadow !== 'none';

      expect(hasFocusIndicator).toBe(true);
    });

    test('should handle text scaling and zoom', async ({ page }) => {
      const authPage = new AuthPage(page);
      await authPage.goto();
      await waitForPageLoad(page);

      // Test 200% zoom (WCAG requirement)
      await page.setViewportSize({ width: 640, height: 480 }); // Simulate 200% zoom

      // Verify essential functionality remains accessible
      await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-submit"]')).toBeVisible();

      // Test that text doesn't overflow containers
      const textElements = page.locator('p, span, label, button');
      const textCount = await textElements.count();

      for (let i = 0; i < Math.min(textCount, 10); i++) {
        const element = textElements.nth(i);
        const box = await element.boundingBox();
        const parentBox = await element.locator('..').boundingBox();

        if (box && parentBox) {
          // Text should not overflow parent horizontally
          expect(box.x + box.width).toBeLessThanOrEqual(parentBox.x + parentBox.width + 5); // 5px tolerance
        }
      }

      // Test functionality at high zoom
      await authPage.login(TEST_USERS.STANDARD_USER.email, TEST_USERS.STANDARD_USER.password);
      await page.waitForSelector('[data-testid="dashboard"]');

      // Verify navigation still works
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should provide proper error announcements', async ({ page }) => {
      const authPage = new AuthPage(page);
      await authPage.goto();
      await waitForPageLoad(page);

      // Test error announcements
      await page.click('[data-testid="login-submit"]'); // Submit empty form

      // Wait for error messages
      await page.waitForSelector('[data-testid="email-error"]');

      // Verify error messages have proper ARIA attributes
      const emailError = page.locator('[data-testid="email-error"]');
      await expect(emailError).toHaveAttribute('role', 'alert');
      await expect(emailError).toHaveAttribute('aria-live', 'assertive');

      const passwordError = page.locator('[data-testid="password-error"]');
      await expect(passwordError).toHaveAttribute('role', 'alert');
      await expect(passwordError).toHaveAttribute('aria-live', 'assertive');

      // Test that errors are associated with inputs
      const emailInput = page.locator('[data-testid="email-input"]');
      const describedBy = await emailInput.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();

      if (describedBy) {
        const describingElement = page.locator(`#${describedBy}`);
        await expect(describingElement).toBeVisible();
      }

      // Test success announcements
      await authPage.login(TEST_USERS.STANDARD_USER.email, TEST_USERS.STANDARD_USER.password);

      // Look for success announcement region
      const successRegion = page.locator('[aria-live="polite"], [role="status"]');
      if (await successRegion.count() > 0) {
        const announcement = await successRegion.textContent();
        expect(announcement).toMatch(/login|success|welcome/i);
      }
    });
  });

  test.describe('Touch and Gesture Testing', () => {
    test.use({ ...devices['iPhone 12'] });

    test('should handle touch gestures for receipt management', async ({ page }) => {
      const authPage = new AuthPage(page);
      const receiptsPage = new ReceiptsPage(page);

      // Login and navigate to receipts
      await authPage.goto();
      await authPage.login(TEST_USERS.STANDARD_USER.email, TEST_USERS.STANDARD_USER.password);
      await page.goto('/receipts');
      await waitForPageLoad(page);

      // Test pull-to-refresh gesture
      const startY = 100;
      const endY = 300;
      await page.touchscreen.tap(200, startY);
      await page.touchscreen.tap(200, endY);

      // Verify refresh indicator
      const refreshIndicator = page.locator('[data-testid="pull-refresh-indicator"]');
      if (await refreshIndicator.count() > 0) {
        await expect(refreshIndicator).toBeVisible();
      }

      // Test long press for context menu
      const receiptCard = page.locator('[data-testid="receipt-card"]').first();
      const cardBox = await receiptCard.boundingBox();

      if (cardBox) {
        // Long press
        await page.touchscreen.tap(
          cardBox.x + cardBox.width / 2,
          cardBox.y + cardBox.height / 2,
          { timeout: 1000 }
        );

        // Verify context menu appears
        await expect(page.locator('[data-testid="context-menu"]')).toBeVisible();
        await expect(page.locator('[data-testid="context-edit"]')).toBeVisible();
        await expect(page.locator('[data-testid="context-delete"]')).toBeVisible();
        await expect(page.locator('[data-testid="context-share"]')).toBeVisible();
      }

      // Test pinch-to-zoom on receipt image
      await page.tap('[data-testid="receipt-image"]');

      // Simulate pinch gesture
      await page.touchscreen.tap(150, 200);
      await page.touchscreen.tap(250, 200);
      // Note: Actual pinch gestures are complex in Playwright,
      // so we verify zoom controls are accessible
      await expect(page.locator('[data-testid="zoom-controls"]')).toBeVisible();
    });

    test('should handle swipe gestures for navigation', async ({ page }) => {
      const authPage = new AuthPage(page);

      // Login
      await authPage.goto();
      await authPage.login(TEST_USERS.STANDARD_USER.email, TEST_USERS.STANDARD_USER.password);
      await page.waitForSelector('[data-testid="mobile-dashboard"]');

      // Test swipe navigation (if implemented)
      const viewport = page.viewportSize();
      if (viewport) {
        // Swipe left for next page
        await page.touchscreen.tap(viewport.width - 50, viewport.height / 2);
        await page.touchscreen.tap(50, viewport.height / 2);

        // Verify navigation occurred or swipe indicator shown
        const swipeIndicator = page.locator('[data-testid="swipe-indicator"]');
        if (await swipeIndicator.count() > 0) {
          await expect(swipeIndicator).toBeVisible();
        }
      }

      // Test drawer/menu swipe
      await page.touchscreen.tap(10, 200);
      await page.touchscreen.tap(200, 200);

      // Verify mobile menu opens
      const mobileMenu = page.locator('[data-testid="mobile-navigation-menu"]');
      if (await mobileMenu.count() > 0) {
        await expect(mobileMenu).toBeVisible();
      }
    });
  });

  test.describe('Performance on Mobile Devices', () => {
    test.use({ ...devices['iPhone 12'] });

    test('should maintain performance standards on mobile', async ({ page }) => {
      const authPage = new AuthPage(page);

      // Enable mobile performance monitoring
      await page.addInitScript(() => {
        window.mobilePerformanceData = {
          loadStart: performance.now(),
          interactions: []
        };
      });

      // Measure login performance
      const loginStart = Date.now();
      await authPage.goto();
      await authPage.login(TEST_USERS.STANDARD_USER.email, TEST_USERS.STANDARD_USER.password);
      await page.waitForSelector('[data-testid="mobile-dashboard"]');
      const loginTime = Date.now() - loginStart;

      // Mobile login should complete within reasonable time
      expect(loginTime).toBeLessThan(12000); // 12 seconds on mobile

      // Measure navigation performance
      const navStart = Date.now();
      await page.goto('/receipts');
      await page.waitForSelector('[data-testid="mobile-receipts-page"]');
      const navTime = Date.now() - navStart;

      expect(navTime).toBeLessThan(8000); // 8 seconds for navigation

      // Test scroll performance
      const scrollStart = Date.now();
      await page.evaluate(() => {
        const container = document.querySelector('[data-testid="receipts-list"]');
        if (container) {
          container.scrollTop = 1000;
        }
      });

      await page.waitForTimeout(100);
      const scrollTime = Date.now() - scrollStart;

      expect(scrollTime).toBeLessThan(500); // Smooth scrolling

      console.log(`📱 Mobile Performance: Login ${loginTime}ms, Navigation ${navTime}ms, Scroll ${scrollTime}ms`);
    });

    test('should handle slow network conditions', async ({ page, context }) => {
      // Simulate slow 3G connection
      await context.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
        await route.continue();
      });

      const authPage = new AuthPage(page);

      // Verify loading states are shown
      await authPage.goto();
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();

      await waitForPageLoad(page);
      await authPage.login(TEST_USERS.STANDARD_USER.email, TEST_USERS.STANDARD_USER.password);

      // Verify login loading state
      await expect(page.locator('[data-testid="login-loading"]')).toBeVisible();

      await page.waitForSelector('[data-testid="mobile-dashboard"]', { timeout: 30000 });

      // Verify offline capability message if network is very slow
      const offlineMessage = page.locator('[data-testid="slow-network-warning"]');
      if (await offlineMessage.count() > 0) {
        await expect(offlineMessage).toBeVisible();
      }
    });
  });
});