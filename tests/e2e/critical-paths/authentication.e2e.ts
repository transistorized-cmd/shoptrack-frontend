import { test, expect, Page } from '@playwright/test';
import {
  AuthPage,
  DashboardPage,
  TEST_USERS,
  waitForPageLoad,
  takeScreenshot,
  expectToastMessage,
  expectPageTitle,
  expectUrlPath,
  measurePageLoadTime
} from '../utils/test-helpers';

test.describe('Authentication Critical Paths', () => {
  let authPage: AuthPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);
  });

  test.describe('User Registration Flow', () => {
    test('should complete full registration process', async ({ page }) => {
      // Generate unique test user
      const timestamp = Date.now();
      const testUser = {
        ...TEST_USERS.STANDARD_USER,
        email: `test.${timestamp}@shoptrack.local`,
        firstName: 'E2E',
        lastName: 'TestUser'
      };

      // Navigate to registration page
      await page.goto('/register');
      await waitForPageLoad(page);
      await expectPageTitle(page, /register|sign up/i);

      // Fill registration form
      await page.fill('[data-testid="first-name-input"]', testUser.firstName);
      await page.fill('[data-testid="last-name-input"]', testUser.lastName);
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.fill('[data-testid="confirm-password-input"]', testUser.password);

      // Check terms and conditions
      await page.check('[data-testid="terms-checkbox"]');

      // Submit registration
      const startTime = Date.now();
      await page.click('[data-testid="register-submit"]');

      // Wait for registration success
      await page.waitForSelector('[data-testid="registration-success"]', { timeout: 15000 });
      const registrationTime = Date.now() - startTime;

      // Verify success message
      await expectToastMessage(page, /registration successful|welcome/i);

      // Should redirect to email verification or dashboard
      await Promise.race([
        expectUrlPath(page, '/verify-email'),
        expectUrlPath(page, '/dashboard')
      ]);

      // Performance check
      expect(registrationTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Take screenshot for visual validation
      await takeScreenshot(page, 'registration-success');

      console.log(`✅ Registration completed in ${registrationTime}ms`);
    });

    test('should handle registration validation errors', async ({ page }) => {
      await page.goto('/register');
      await waitForPageLoad(page);

      // Test empty form submission
      await page.click('[data-testid="register-submit"]');

      // Should show validation errors
      await expect(page.locator('[data-testid="first-name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();

      // Test invalid email format
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.click('[data-testid="register-submit"]');
      await expect(page.locator('[data-testid="email-error"]')).toContainText(/invalid|format/i);

      // Test password mismatch
      await page.fill('[data-testid="email-input"]', 'valid@email.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.fill('[data-testid="confirm-password-input"]', 'different123');
      await page.click('[data-testid="register-submit"]');
      await expect(page.locator('[data-testid="password-match-error"]')).toBeVisible();

      // Test weak password
      await page.fill('[data-testid="password-input"]', '123');
      await page.fill('[data-testid="confirm-password-input"]', '123');
      await page.click('[data-testid="register-submit"]');
      await expect(page.locator('[data-testid="password-error"]')).toContainText(/weak|strong|requirements/i);
    });

    test('should handle duplicate email registration', async ({ page }) => {
      await page.goto('/register');
      await waitForPageLoad(page);

      // Try to register with existing email
      const existingUser = TEST_USERS.STANDARD_USER;
      await page.fill('[data-testid="first-name-input"]', 'Duplicate');
      await page.fill('[data-testid="last-name-input"]', 'User');
      await page.fill('[data-testid="email-input"]', existingUser.email);
      await page.fill('[data-testid="password-input"]', 'NewPassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'NewPassword123!');
      await page.check('[data-testid="terms-checkbox"]');

      await page.click('[data-testid="register-submit"]');

      // Should show duplicate email error
      await page.waitForSelector('[data-testid="registration-error"], [data-testid="email-exists-error"]');
      const errorMessage = await page.locator('[data-testid="registration-error"], [data-testid="email-exists-error"]').textContent();
      expect(errorMessage).toMatch(/email.*already.*exists|already.*registered/i);
    });
  });

  test.describe('User Login Flow', () => {
    test('should complete successful login', async ({ page }) => {
      const user = TEST_USERS.STANDARD_USER;

      // Navigate to login page
      await authPage.goto();
      await expectPageTitle(page, /login|sign in/i);

      // Measure login performance
      const startTime = Date.now();

      // Perform login
      await authPage.login(user.email, user.password);

      // Wait for successful login
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 });
      const loginTime = Date.now() - startTime;

      // Verify successful login
      await expectUrlPath(page, '/dashboard');
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-name"]')).toContainText(user.firstName);

      // Verify dashboard loads
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

      // Performance check
      expect(loginTime).toBeLessThan(8000); // Should complete within 8 seconds

      // Measure page load performance
      const pageLoadTime = await measurePageLoadTime(page);
      expect(pageLoadTime).toBeLessThan(5000); // Dashboard should load within 5 seconds

      console.log(`✅ Login completed in ${loginTime}ms, page loaded in ${pageLoadTime}ms`);
    });

    test('should handle invalid credentials', async ({ page }) => {
      await authPage.goto();

      // Test invalid email
      await authPage.login('nonexistent@email.com', 'WrongPassword123!');

      // Should show error message
      await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
      const errorMessage = await page.locator('[data-testid="login-error"]').textContent();
      expect(errorMessage).toMatch(/invalid.*credentials|email.*password.*incorrect/i);

      // Should remain on login page
      await expectUrlPath(page, '/login');
    });

    test('should handle account lockout after multiple failures', async ({ page }) => {
      await authPage.goto();

      const user = TEST_USERS.STANDARD_USER;
      const wrongPassword = 'WrongPassword123!';

      // Attempt multiple failed logins
      for (let i = 0; i < 5; i++) {
        await page.fill('[data-testid="email-input"]', user.email);
        await page.fill('[data-testid="password-input"]', wrongPassword);
        await page.click('[data-testid="login-submit"]');

        await page.waitForSelector('[data-testid="login-error"]');

        // Clear form for next attempt
        await page.fill('[data-testid="password-input"]', '');
      }

      // After multiple failures, should show lockout message
      const errorMessage = await page.locator('[data-testid="login-error"]').textContent();
      expect(errorMessage).toMatch(/account.*locked|too.*many.*attempts/i);
    });

    test('should remember user with "Remember Me" option', async ({ page, context }) => {
      await authPage.goto();

      const user = TEST_USERS.STANDARD_USER;

      // Login with remember me checked
      await page.fill('[data-testid="email-input"]', user.email);
      await page.fill('[data-testid="password-input"]', user.password);
      await page.check('[data-testid="remember-me"]');
      await page.click('[data-testid="login-submit"]');

      await page.waitForSelector('[data-testid="dashboard"]');

      // Verify auth token is stored
      const cookies = await context.cookies();
      const authCookie = cookies.find(cookie =>
        cookie.name.includes('auth') || cookie.name.includes('token')
      );
      expect(authCookie).toBeDefined();

      // Close and reopen browser session
      await page.close();
      const newPage = await context.newPage();

      // Navigate to protected route
      await newPage.goto('/dashboard');

      // Should remain logged in
      await expect(newPage.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Session Management', () => {
    test('should handle session expiration gracefully', async ({ page }) => {
      // Login first
      await authPage.goto();
      await authPage.login(TEST_USERS.STANDARD_USER.email, TEST_USERS.STANDARD_USER.password);
      await page.waitForSelector('[data-testid="dashboard"]');

      // Simulate session expiration by clearing auth tokens
      await page.evaluate(() => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        sessionStorage.clear();
      });

      // Try to access protected route
      await page.goto('/receipts');

      // Should redirect to login
      await expectUrlPath(page, '/login');
      await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
    });

    test('should handle concurrent sessions', async ({ browser }) => {
      // Create two browser contexts (different sessions)
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const user = TEST_USERS.STANDARD_USER;

      // Login in both contexts
      const authPage1 = new AuthPage(page1);
      const authPage2 = new AuthPage(page2);

      await authPage1.goto();
      await authPage1.login(user.email, user.password);
      await page1.waitForSelector('[data-testid="dashboard"]');

      await authPage2.goto();
      await authPage2.login(user.email, user.password);
      await page2.waitForSelector('[data-testid="dashboard"]');

      // Both sessions should be active
      await expect(page1.locator('[data-testid="dashboard"]')).toBeVisible();
      await expect(page2.locator('[data-testid="dashboard"]')).toBeVisible();

      // Logout from one session
      await authPage1.logout();

      // Other session should remain active
      await page2.reload();
      await expect(page2.locator('[data-testid="dashboard"]')).toBeVisible();

      await context1.close();
      await context2.close();
    });

    test('should handle token refresh automatically', async ({ page }) => {
      await authPage.goto();
      await authPage.login(TEST_USERS.STANDARD_USER.email, TEST_USERS.STANDARD_USER.password);
      await page.waitForSelector('[data-testid="dashboard"]');

      // Mock API responses to simulate token expiration and refresh
      await page.route('**/api/receipts', route => {
        const headers = route.request().headers();
        if (headers.authorization) {
          // First request - return 401 (token expired)
          route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Token expired' })
          });
        }
      });

      await page.route('**/auth/refresh', route => {
        // Mock successful token refresh
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token'
          })
        });
      });

      // Navigate to receipts page (should trigger API call)
      await page.goto('/receipts');

      // Should automatically refresh token and continue
      await expect(page.locator('[data-testid="receipts-page"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-error"]')).not.toBeVisible();
    });
  });

  test.describe('Logout Flow', () => {
    test('should logout successfully and clear session', async ({ page, context }) => {
      // Login first
      await authPage.goto();
      await authPage.login(TEST_USERS.STANDARD_USER.email, TEST_USERS.STANDARD_USER.password);
      await page.waitForSelector('[data-testid="dashboard"]');

      // Perform logout
      await authPage.logout();

      // Verify logout
      await expectUrlPath(page, '/login');
      await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible();

      // Verify session is cleared
      const localStorage = await page.evaluate(() => {
        return {
          authToken: localStorage.getItem('authToken'),
          refreshToken: localStorage.getItem('refreshToken'),
          user: localStorage.getItem('user')
        };
      });

      expect(localStorage.authToken).toBeNull();
      expect(localStorage.refreshToken).toBeNull();
      expect(localStorage.user).toBeNull();

      // Verify cookies are cleared
      const cookies = await context.cookies();
      const authCookies = cookies.filter(cookie =>
        cookie.name.includes('auth') || cookie.name.includes('token')
      );
      expect(authCookies).toHaveLength(0);

      // Try to access protected route
      await page.goto('/dashboard');
      await expectUrlPath(page, '/login');
    });

    test('should handle logout from multiple tabs', async ({ context }) => {
      // Open two tabs
      const page1 = await context.newPage();
      const page2 = await context.newPage();

      // Login in first tab
      const authPage1 = new AuthPage(page1);
      await authPage1.goto();
      await authPage1.login(TEST_USERS.STANDARD_USER.email, TEST_USERS.STANDARD_USER.password);
      await page1.waitForSelector('[data-testid="dashboard"]');

      // Navigate to dashboard in second tab
      await page2.goto('/dashboard');
      await page2.waitForSelector('[data-testid="dashboard"]');

      // Logout from first tab
      await authPage1.logout();

      // Second tab should also logout (if implementing global logout)
      await page2.reload();
      await expectUrlPath(page2, '/login');
    });
  });

  test.describe('Password Recovery', () => {
    test('should complete password reset flow', async ({ page }) => {
      await page.goto('/forgot-password');
      await waitForPageLoad(page);

      // Request password reset
      await page.fill('[data-testid="email-input"]', TEST_USERS.STANDARD_USER.email);
      await page.click('[data-testid="reset-password-submit"]');

      // Should show confirmation message
      await expect(page.locator('[data-testid="reset-email-sent"]')).toBeVisible();
      await expectToastMessage(page, /reset.*email.*sent/i);

      // Simulate clicking reset link (would normally come from email)
      // This would typically involve a token, but for E2E we'll simulate the flow
      await page.goto('/reset-password?token=test-reset-token');

      // Fill new password
      const newPassword = 'NewPassword123!';
      await page.fill('[data-testid="new-password-input"]', newPassword);
      await page.fill('[data-testid="confirm-password-input"]', newPassword);
      await page.click('[data-testid="update-password-submit"]');

      // Should redirect to login with success message
      await expectUrlPath(page, '/login');
      await expectToastMessage(page, /password.*updated|reset.*successful/i);
    });

    test('should validate password reset form', async ({ page }) => {
      await page.goto('/reset-password?token=valid-token');

      // Test password requirements
      await page.fill('[data-testid="new-password-input"]', 'weak');
      await page.fill('[data-testid="confirm-password-input"]', 'weak');
      await page.click('[data-testid="update-password-submit"]');

      await expect(page.locator('[data-testid="password-error"]')).toContainText(/requirements|strong/i);

      // Test password mismatch
      await page.fill('[data-testid="new-password-input"]', 'StrongPassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'DifferentPassword123!');
      await page.click('[data-testid="update-password-submit"]');

      await expect(page.locator('[data-testid="password-match-error"]')).toBeVisible();
    });
  });

  test.describe('Two-Factor Authentication', () => {
    test.skip('should handle 2FA setup and verification', async ({ page }) => {
      // This test would be implemented if 2FA is available
      await authPage.goto();
      await authPage.login(TEST_USERS.STANDARD_USER.email, TEST_USERS.STANDARD_USER.password);

      // Navigate to security settings
      await page.goto('/settings/security');

      // Enable 2FA
      await page.click('[data-testid="enable-2fa"]');

      // Should show QR code and backup codes
      await expect(page.locator('[data-testid="2fa-qr-code"]')).toBeVisible();
      await expect(page.locator('[data-testid="backup-codes"]')).toBeVisible();

      // Verify 2FA setup with test code
      await page.fill('[data-testid="2fa-code-input"]', '123456');
      await page.click('[data-testid="verify-2fa"]');

      // Should confirm 2FA is enabled
      await expectToastMessage(page, /2fa.*enabled/i);
    });
  });
});