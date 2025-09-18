import { FullConfig } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test global teardown...');

  try {
    // Clean up test artifacts
    await cleanupTestArtifacts();

    // Clean up test data if needed
    await cleanupTestData();

    // Generate test report summary
    await generateTestSummary();

  } catch (error) {
    console.error('❌ Global teardown encountered an error:', error);
  }

  console.log('✅ E2E test global teardown completed');
}

async function cleanupTestArtifacts() {
  console.log('📁 Cleaning up test artifacts...');

  const artifactsDir = path.join(__dirname, '../../test-results');

  try {
    // Clean up old screenshots and videos (keep only latest 10 test runs)
    const dirs = await fs.readdir(artifactsDir, { withFileTypes: true });
    const testDirs = dirs
      .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('test-'))
      .map(dirent => ({
        name: dirent.name,
        path: path.join(artifactsDir, dirent.name)
      }))
      .sort((a, b) => b.name.localeCompare(a.name)); // Sort by name (newest first)

    // Keep only the 10 most recent test directories
    const dirsToDelete = testDirs.slice(10);

    for (const dir of dirsToDelete) {
      await fs.rmdir(dir.path, { recursive: true });
      console.log(`🗑️ Removed old test directory: ${dir.name}`);
    }

  } catch (error) {
    console.log('ℹ️ Could not clean up test artifacts:', error.message);
  }
}

async function cleanupTestData() {
  console.log('🗑️ Cleaning up test data...');

  // Note: In a real application, you might want to clean up test data
  // from the database or reset the application state
  // For now, we'll just log this step

  try {
    // Example: Clean up test users, test receipts, etc.
    // This would typically involve API calls to clean up test data

    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.log('ℹ️ Could not clean up test data:', error.message);
  }
}

async function generateTestSummary() {
  console.log('📊 Generating test summary...');

  try {
    const resultsPath = path.join(__dirname, '../../test-results/e2e-results.json');

    try {
      const resultsData = await fs.readFile(resultsPath, 'utf-8');
      const results = JSON.parse(resultsData);

      const summary = {
        timestamp: new Date().toISOString(),
        totalTests: results.stats?.total || 0,
        passedTests: results.stats?.passed || 0,
        failedTests: results.stats?.failed || 0,
        skippedTests: results.stats?.skipped || 0,
        duration: results.stats?.duration || 0,
        success: (results.stats?.failed || 0) === 0
      };

      const summaryPath = path.join(__dirname, '../../test-results/e2e-summary.json');
      await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));

      console.log('📈 Test Summary:');
      console.log(`   Total Tests: ${summary.totalTests}`);
      console.log(`   Passed: ${summary.passedTests}`);
      console.log(`   Failed: ${summary.failedTests}`);
      console.log(`   Skipped: ${summary.skippedTests}`);
      console.log(`   Duration: ${Math.round(summary.duration / 1000)}s`);
      console.log(`   Success: ${summary.success ? '✅' : '❌'}`);

    } catch (error) {
      console.log('ℹ️ Could not read test results for summary');
    }

  } catch (error) {
    console.log('ℹ️ Could not generate test summary:', error.message);
  }
}

export default globalTeardown;