import { chromium, FullConfig } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Wait for the application to be ready
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:5173';
    console.log(`📡 Checking application readiness at ${baseURL}`);

    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');

    // Check if the app is properly loaded
    await page.waitForSelector('[data-testid="app-root"], #app, body', { timeout: 30000 });

    console.log('✅ Application is ready for E2E testing');

    // Create test user accounts if needed
    await setupTestUsers(page);

    // Create test data if needed
    await setupTestData(page);

    // Save authentication state for reuse in tests
    await saveAuthenticationState(context);

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('🎯 E2E test global setup completed successfully');
}

async function setupTestUsers(page: any) {
  console.log('👥 Setting up test users...');

  const testUsers = [
    {
      email: 'test.user@shoptrack.local',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      role: 'user'
    },
    {
      email: 'admin.user@shoptrack.local',
      password: 'AdminPassword123!',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    }
  ];

  for (const user of testUsers) {
    try {
      // Try to register the user (this might fail if user already exists)
      await page.goto('/register');

      // Fill registration form
      await page.fill('[data-testid="first-name-input"]', user.firstName);
      await page.fill('[data-testid="last-name-input"]', user.lastName);
      await page.fill('[data-testid="email-input"]', user.email);
      await page.fill('[data-testid="password-input"]', user.password);
      await page.fill('[data-testid="confirm-password-input"]', user.password);

      // Submit registration
      await page.click('[data-testid="register-submit"]');

      // Wait for success or check if user already exists
      await page.waitForSelector('[data-testid="registration-success"], [data-testid="user-exists-error"]',
        { timeout: 10000 });

      console.log(`✅ Test user ${user.email} is ready`);
    } catch (error) {
      console.log(`ℹ️ Test user ${user.email} might already exist`);
    }
  }
}

async function setupTestData(page: any) {
  console.log('📊 Setting up test data...');

  try {
    // Login as test user to create test receipts
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test.user@shoptrack.local');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-submit"]');

    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

    // Create sample receipts for testing
    const sampleReceipts = [
      {
        name: 'Grocery Shopping',
        amount: '45.67',
        date: '2024-01-15',
        category: 'Groceries'
      },
      {
        name: 'Gas Station',
        amount: '89.23',
        date: '2024-01-16',
        category: 'Transportation'
      },
      {
        name: 'Restaurant Dinner',
        amount: '67.89',
        date: '2024-01-17',
        category: 'Dining'
      }
    ];

    for (const receipt of sampleReceipts) {
      try {
        await page.goto('/receipts/new');

        await page.fill('[data-testid="receipt-name"]', receipt.name);
        await page.fill('[data-testid="receipt-amount"]', receipt.amount);
        await page.fill('[data-testid="receipt-date"]', receipt.date);
        await page.selectOption('[data-testid="receipt-category"]', receipt.category);

        await page.click('[data-testid="save-receipt"]');
        await page.waitForSelector('[data-testid="receipt-saved"]', { timeout: 5000 });

        console.log(`✅ Created test receipt: ${receipt.name}`);
      } catch (error) {
        console.log(`ℹ️ Could not create test receipt ${receipt.name}:`, error.message);
      }
    }

    // Logout after setup
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-btn"]');

  } catch (error) {
    console.log('ℹ️ Could not set up test data:', error.message);
  }
}

async function saveAuthenticationState(context: any) {
  console.log('🔐 Saving authentication states...');

  const authDir = path.join(__dirname, '../../test-results/auth');
  await fs.mkdir(authDir, { recursive: true });

  // Save authenticated user state
  try {
    await context.storageState({ path: path.join(authDir, 'user-auth.json') });
    console.log('✅ Saved user authentication state');
  } catch (error) {
    console.log('ℹ️ Could not save user auth state:', error.message);
  }
}

export default globalSetup;