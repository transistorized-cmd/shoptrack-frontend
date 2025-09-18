# Test Categorization Guide

This guide explains how to use the test categorization system for selective test running in the ShopTrack frontend project.

## Overview

The test categorization system allows you to organize and run tests selectively based on:
- **Test Type**: Unit, Integration, Performance, E2E
- **Component Type**: Component, View, Store, Service, Utility
- **Functionality**: Auth, Receipts, Reports, Plugins, etc.
- **Execution Speed**: Fast, Medium, Slow
- **Stability**: Stable, Flaky, Experimental
- **Environment**: Browser, Node, Network, Database
- **Priority**: Critical, High, Medium, Low
- **CI/CD Stage**: Pre-commit, Build, Deployment, Smoke

## Quick Start

### Running Tests by Category

```bash
# Run all unit tests
npm run test:unit

# Run only fast tests
npm run test:fast

# Run component tests
npm run test:components

# Run authentication-related tests
npm run test:auth

# Run stable tests only (exclude flaky ones)
npm run test:stable

# Exclude slow tests
npm run test:exclude-slow

# CI-friendly combinations
npm run test:ci-fast     # unit + fast + stable
npm run test:ci-full     # all except flaky + experimental
```

### Environment Variables

You can also use environment variables directly:

```bash
# Run specific categories
TEST_CATEGORIES=unit,component npm run test:run

# Exclude categories
EXCLUDE_CATEGORIES=flaky,slow npm run test:run

# Combine both
TEST_CATEGORIES=unit,fast EXCLUDE_CATEGORIES=flaky npm run test:run
```

## Test Categories Reference

### Test Types

| Category | Description | Use Case |
|----------|-------------|----------|
| `unit` | Isolated component/function tests | Fast feedback, focused testing |
| `integration` | Multi-component interaction tests | Feature workflow testing |
| `performance` | Performance and load tests | Performance regression detection |
| `e2e` | End-to-end user workflow tests | Complete user journey validation |

### Component Types

| Category | Description | Example |
|----------|-------------|---------|
| `component` | Vue component tests | Button, Input, Modal components |
| `view` | Page/route component tests | Login, Dashboard, Settings pages |
| `store` | Pinia store tests | Auth store, Receipts store |
| `service` | API service tests | Auth service, Data fetching |
| `composable` | Vue composable tests | useDarkMode, useAuth |
| `utility` | Pure function tests | Math helpers, Validators |

### Functionality Areas

| Category | Description | Related Components |
|----------|-------------|-------------------|
| `auth` | Authentication features | Login, Register, Password reset |
| `receipts` | Receipt management | Upload, Processing, Display |
| `reports` | Analytics and reporting | Charts, Trends, Analytics |
| `plugins` | Plugin system | Plugin cards, Registry |
| `search` | Search functionality | Search input, Results |
| `upload` | File upload features | Drag/drop, Validation |
| `notifications` | Notification system | Badges, Menus, Alerts |

### Execution Speed

| Category | Duration | Use Case |
|----------|----------|----------|
| `fast` | < 100ms | Unit tests, Quick feedback |
| `medium` | 100ms - 1s | Integration tests |
| `slow` | > 1s | Performance tests, E2E |

### Stability

| Category | Description | When to Use |
|----------|-------------|-------------|
| `stable` | Reliable, consistent tests | CI/CD pipelines |
| `flaky` | Intermittently failing tests | Excluded from CI |
| `experimental` | New/unstable features | Development only |

### Environment Requirements

| Category | Description | Requirements |
|----------|-------------|-------------|
| `browser` | Browser-specific features | DOM APIs, localStorage |
| `node` | Node.js environment | Server-side logic |
| `network` | Network connectivity | API calls, External services |
| `database` | Database connectivity | Data persistence tests |

### Testing Approach

| Category | Description | Mount Type |
|----------|-------------|------------|
| `shallow` | Shallow component mounting | Focused unit testing |
| `full-mount` | Full component mounting | Integration testing |
| `mock-heavy` | Extensive mocking | Isolated testing |
| `real-api` | Real API integration | Integration testing |

### Priority Levels

| Category | Description | CI Stage |
|----------|-------------|----------|
| `critical` | Must-pass tests | All stages |
| `high` | Important functionality | Build stage |
| `medium-priority` | Standard features | Full test runs |
| `low` | Nice-to-have features | Nightly builds |

### CI/CD Stages

| Category | Description | When to Run |
|----------|-------------|-------------|
| `pre-commit` | Quick validation | Pre-commit hooks |
| `build` | Build verification | CI build stage |
| `deployment` | Deployment validation | Pre-deployment |
| `smoke` | Basic functionality | Post-deployment |

## Writing Categorized Tests

### Basic Usage

```typescript
import {
  categorizedDescribe,
  categorizedIt,
  TestCategory,
  CategoryCombos
} from '../../../tests/utils/categories';

// Using predefined combinations
categorizedDescribe('MyComponent', CategoryCombos.UNIT_COMPONENT_FAST, () => {
  categorizedIt('should render correctly', [TestCategory.CRITICAL], () => {
    // Test implementation
  });
});

// Custom category combinations
categorizedDescribe('Auth Flow', [
  TestCategory.INTEGRATION,
  TestCategory.AUTH,
  TestCategory.CRITICAL
], () => {
  categorizedIt('should login successfully', [TestCategory.HIGH], async () => {
    // Test implementation
  });
});
```

### Test Suite Configuration

```typescript
import { configureTestSuite } from '../../../tests/utils/categories';

configureTestSuite('Performance Tests', {
  categories: [TestCategory.PERFORMANCE, TestCategory.SLOW],
  timeout: 15000,
  retries: 3,
}, () => {
  // Performance test suite
});
```

### Performance Testing

```typescript
import { withPerformance } from '../../../tests/utils/categories';

categorizedIt('should render quickly', [TestCategory.PERFORMANCE],
  withPerformance(async () => {
    // Test that should complete within expected time
  }, 100, TestCategory.FAST)
);
```

## Predefined Category Combinations

The system provides common combinations for quick use:

```typescript
// Component testing
CategoryCombos.UNIT_COMPONENT_FAST
CategoryCombos.UNIT_COMPONENT_SHALLOW
CategoryCombos.INTEGRATION_COMPONENT

// View testing
CategoryCombos.UNIT_VIEW_SHALLOW
CategoryCombos.INTEGRATION_VIEW

// Store testing
CategoryCombos.UNIT_STORE
CategoryCombos.INTEGRATION_STORE

// Feature-based
CategoryCombos.AUTH_UNIT
CategoryCombos.AUTH_INTEGRATION
CategoryCombos.RECEIPTS_UNIT
CategoryCombos.RECEIPTS_INTEGRATION

// CI/CD stages
CategoryCombos.PRE_COMMIT_FAST
CategoryCombos.BUILD_CRITICAL
CategoryCombos.SMOKE_CRITICAL
```

## NPM Scripts Reference

### Category-Based Scripts

```bash
# Test Types
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only

# Component Types
npm run test:components     # Component tests
npm run test:views          # View tests
npm run test:stores         # Store tests
npm run test:services       # Service tests

# Speed-Based
npm run test:fast           # Fast tests (< 100ms)
npm run test:medium         # Medium tests (100ms-1s)
npm run test:slow           # Slow tests (> 1s)

# Feature-Based
npm run test:auth           # Authentication tests
npm run test:receipts       # Receipt-related tests
npm run test:reports        # Report/analytics tests
npm run test:plugins        # Plugin system tests

# Approach-Based
npm run test:shallow        # Shallow mounting tests
npm run test:full-mount     # Full mounting tests

# Stability-Based
npm run test:stable         # Stable tests only
npm run test:exclude-flaky  # Exclude flaky tests

# CI/CD Optimized
npm run test:pre-commit     # Pre-commit validation
npm run test:smoke          # Smoke tests
npm run test:ci-fast        # Fast CI pipeline
npm run test:ci-full        # Full CI pipeline
```

### Advanced Usage

```bash
# Multiple categories
TEST_CATEGORIES=unit,fast,stable npm run test:run

# Exclude problematic tests
EXCLUDE_CATEGORIES=flaky,experimental npm run test:run

# Development workflow
TEST_CATEGORIES=unit,component EXCLUDE_CATEGORIES=slow npm run test

# Specific feature development
TEST_CATEGORIES=auth,fast npm run test

# Performance regression testing
TEST_CATEGORIES=performance npm run test:run

# Critical path testing
TEST_CATEGORIES=critical,stable npm run test:run
```

## CI/CD Integration

### Pre-commit Hook Example

```bash
#!/bin/sh
# Run fast, stable tests before commit
npm run test:pre-commit
```

### CI Pipeline Configuration

```yaml
# Example GitHub Actions
- name: Fast Tests
  run: npm run test:ci-fast

- name: Full Test Suite
  run: npm run test:ci-full
  if: github.event_name == 'push'

- name: Performance Tests
  run: npm run test:performance
  if: github.ref == 'refs/heads/main'
```

### Environment-Specific Testing

```bash
# Development environment
TEST_CATEGORIES=unit,fast npm run test

# Staging environment
TEST_CATEGORIES=integration,stable npm run test:run

# Production validation
npm run test:smoke
```

## Best Practices

### 1. Category Assignment Guidelines

- **Always include at least one category from each major dimension**:
  - Test type (unit/integration/performance)
  - Component type (component/view/store/service)
  - Speed (fast/medium/slow)
  - Stability (stable/flaky/experimental)

- **Use priority categories for CI/CD**:
  - `critical`: Must pass in all environments
  - `high`: Should pass before merge
  - `medium-priority`: Full test suite
  - `low`: Nightly/weekly runs

### 2. Speed Category Guidelines

```typescript
// Fast tests (< 100ms) - Unit tests, mocked dependencies
categorizedIt('should validate input', [TestCategory.FAST], () => {
  expect(validateEmail('test@example.com')).toBe(true);
});

// Medium tests (100ms - 1s) - Integration tests, some real dependencies
categorizedIt('should integrate with store', [TestCategory.MEDIUM], async () => {
  await store.fetchData();
  expect(store.data).toBeDefined();
});

// Slow tests (> 1s) - Performance tests, full integration
categorizedIt('should handle large datasets', [TestCategory.SLOW], async () => {
  const largeDataset = generateLargeDataset(10000);
  await processDataset(largeDataset);
});
```

### 3. Stability Categories

```typescript
// Stable - Reliable tests for CI/CD
categorizedDescribe('Core Functionality', [TestCategory.STABLE], () => {
  // Rock-solid tests
});

// Flaky - Tests with timing issues, external dependencies
categorizedDescribe('Animation Tests', [TestCategory.FLAKY], () => {
  // Tests that might fail due to timing
});

// Experimental - New features, proof of concepts
categorizedDescribe('Beta Features', [TestCategory.EXPERIMENTAL], () => {
  // Tests for experimental functionality
});
```

### 4. CI/CD Optimization

```typescript
// Pre-commit: Fast validation
categorizedDescribe('Input Validation', CategoryCombos.PRE_COMMIT_FAST, () => {
  // Quick checks before commit
});

// Build: Critical functionality
categorizedDescribe('Authentication', CategoryCombos.BUILD_CRITICAL, () => {
  // Essential features for build validation
});

// Smoke: Basic functionality after deployment
categorizedDescribe('Page Loading', CategoryCombos.SMOKE_CRITICAL, () => {
  // Basic functionality verification
});
```

## Migration Strategy

### Step 1: Audit Existing Tests

```bash
# Find all test files
find src tests -name "*.test.ts" -o -name "*.spec.ts"

# Analyze test patterns
grep -r "describe\|it\|test" src tests --include="*.test.ts"
```

### Step 2: Categorize Incrementally

1. Start with critical tests
2. Add categories to slow tests first
3. Categorize by feature area
4. Add stability markers

### Step 3: Update CI/CD

1. Replace existing test commands with categorized versions
2. Add category-specific pipelines
3. Implement progressive testing stages

## Troubleshooting

### Common Issues

1. **Tests not running with categories**:
   ```bash
   # Check environment variables
   echo $TEST_CATEGORIES
   echo $EXCLUDE_CATEGORIES

   # Verify category imports
   grep -r "import.*categories" src tests
   ```

2. **Performance issues with categorization**:
   ```bash
   # Profile test execution
   npm run test:fast -- --reporter=verbose

   # Check for heavy setup in fast tests
   TEST_CATEGORIES=fast npm run test:run -- --reporter=verbose
   ```

3. **Category filtering not working**:
   - Verify environment variable syntax (comma-separated)
   - Check test category assignments
   - Ensure proper imports in test files

### Debug Mode

```bash
# Enable debug output
DEBUG=test-categories npm run test:run

# Verbose category reporting
TEST_CATEGORIES=unit npm run test:run -- --reporter=verbose
```

## Examples Repository

See the following example files for implementation patterns:

- `src/components/__tests__/ThemeToggle.categorized.test.ts` - Component testing
- `src/stores/__tests__/auth.categorized.test.ts` - Store testing
- `src/views/__tests__/Login.categorized.test.ts` - View testing

These examples demonstrate:
- Proper category assignment
- Speed optimization techniques
- Integration test patterns
- Accessibility testing categorization
- Performance test implementation

## Future Enhancements

- **Category Analytics**: Track test execution times by category
- **Smart Categorization**: Auto-suggest categories based on test patterns
- **Visual Reporting**: Category-based test result dashboards
- **Parallel Execution**: Optimize test running based on categories
- **Dynamic Filtering**: Runtime category selection in test UI

This categorization system provides flexible, powerful test organization that scales with your project and supports efficient CI/CD pipelines while maintaining comprehensive test coverage.