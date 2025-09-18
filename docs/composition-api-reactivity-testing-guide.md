# Vue 3 Composition API Reactivity E2E Testing Guide

This document demonstrates comprehensive E2E testing strategies for Vue 3 Composition API reactivity across components in the ShopTrack application.

## Overview

The Composition API reactivity tests in `tests/e2e/vue-specific/composition-api-reactivity.e2e.ts` provide comprehensive coverage for:

1. **Cross-Component Data Reactivity**
2. **Reactive Refs and Computed Dependencies**
3. **Reactive State Management (Pinia Integration)**
4. **Watch and WatchEffect Reactivity**
5. **Error Handling in Reactive Systems**

## Test Categories

### 1. Cross-Component Data Reactivity

Tests how reactive data flows between different Vue components when shared state changes.

**Example Scenario:**
- Dashboard component displays total receipts and spending
- Receipts component shows same data in different format
- Upload component adds new receipt
- Both dashboard and receipts automatically update with new data

**Key Test Pattern:**
```typescript
test('should sync reactive data between dashboard and receipts components', async ({ page }) => {
  // 1. Mock initial API data
  await mockApiResponse(page, '**/api/receipts', { /* initial data */ });

  // 2. Verify initial state in dashboard
  await expectElementText(page, '[data-testid="total-receipts-count"]', '1');

  // 3. Navigate to receipts component
  await page.goto('/receipts');

  // 4. Verify same data is reactive across components
  await expectElementText(page, '[data-testid="receipts-summary-count"]', '1');

  // 5. Add new data via different component
  await page.goto('/upload');
  // ... upload new receipt

  // 6. Verify reactive updates across all components
  await page.goto('/dashboard');
  await expectElementText(page, '[data-testid="total-receipts-count"]', '2'); // Updated!
});
```

### 2. Reactive Computed Properties

Tests computed property chains and dependencies across components.

**Example Scenario:**
- Budget component computes spending status (over/under budget)
- Dashboard component shows budget alerts based on same computed data
- Changes to receipt categories trigger reactive computed updates
- Both components automatically reflect new computed values

**Key Test Pattern:**
```typescript
test('should handle computed property chains across components', async ({ page }) => {
  // 1. Set up mock data with budget calculations
  await mockApiResponse(page, '**/api/budgets', {
    budgets: [
      { category: 'groceries', monthlyLimit: 250.00, currentSpending: 300.00 }
    ]
  });

  // 2. Verify computed budget status
  await expectElementText(page, '[data-testid="groceries-status"]', 'Over Budget');

  // 3. Navigate to dashboard with same computed data
  await page.goto('/dashboard');

  // 4. Verify computed alerts are consistent
  await expectElementVisible(page, '[data-testid="budget-alert-groceries"]');

  // 5. Change data that affects computed chain
  // ... update receipt category

  // 6. Verify reactive computed updates
  await expectElementText(page, '[data-testid="groceries-status"]', 'On Track');
});
```

### 3. Reactive State Management (Pinia)

Tests Pinia store reactivity across components and route changes.

**Example Scenario:**
- User changes theme setting in preferences
- All components reactively update to new theme
- Store mutations are reactive across route navigation
- Getters maintain reactivity for computed formatting

**Key Test Pattern:**
```typescript
test('should maintain reactive state across store mutations', async ({ page }) => {
  // 1. Change store state via one component
  await page.click('[data-testid="dark-mode-toggle"]');

  // 2. Verify reactive change across all components
  await expect(page.locator('body')).toHaveClass(/dark-theme/);

  // 3. Navigate to different route
  await page.goto('/dashboard');

  // 4. Verify store state persisted reactively
  await expect(page.locator('body')).toHaveClass(/dark-theme/);

  // 5. Change state from different component
  await page.click('[data-testid="theme-toggle-receipts"]');

  // 6. Verify reactive propagation
  await expect(page.locator('body')).not.toHaveClass(/dark-theme/);
});
```

### 4. Deep Reactive Objects

Tests reactivity with nested objects and arrays.

**Example Scenario:**
- Receipt detail with nested metadata (location, items, tags)
- Multiple components display different parts of same object
- Changes to nested properties trigger reactive updates
- Array mutations are reactive across components

**Key Test Pattern:**
```typescript
test('should maintain reactivity with deep reactive objects', async ({ page }) => {
  // 1. Set up complex nested data
  const complexReceipt = {
    metadata: {
      location: { store: 'Store #123', address: '123 Main St' },
      tags: ['business', 'tax-deductible']
    },
    items: [
      { id: 'item-1', quantity: 2, price: 25.00 }
    ]
  };

  // 2. Update nested object properties
  await page.fill('[data-testid="store-name-input"]', 'Store #456');
  await page.fill('[data-testid="item-1-quantity"]', '3');

  // 3. Verify deep reactive updates
  await expectElementText(page, '[data-testid="store-location"]', 'Store #456');
  await expectElementText(page, '[data-testid="item-1-total"]', '$75.00'); // 25 * 3

  // 4. Navigate to different component using same data
  await page.goto('/reports/receipt-details/receipt-1');

  // 5. Verify deep reactivity maintained across components
  await expectElementText(page, '[data-testid="report-store-name"]', 'Store #456');
});
```

### 5. Watch and WatchEffect Reactivity

Tests reactive watchers that span component lifecycle and route changes.

**Example Scenario:**
- Date range filter watched across analytics components
- Live search with debounced watchEffect
- Watcher cleanup during route navigation
- Reactive responses to external data changes

**Key Test Pattern:**
```typescript
test('should handle watchers across component lifecycle', async ({ page }) => {
  // 1. Set up watcher trigger (date range filter)
  await page.fill('[data-testid="start-date"]', '2024-01-01');
  await page.fill('[data-testid="end-date"]', '2024-01-31');

  // 2. Verify watcher triggered updates
  await expectElementText(page, '[data-testid="period-total"]', '$500.00');

  // 3. Navigate to component that shares watched state
  await page.goto('/reports/trends');

  // 4. Verify watcher state synchronized
  await expect(page.locator('[data-testid="trends-start-date"]')).toHaveValue('2024-01-01');

  // 5. Change watched value from different component
  await page.fill('[data-testid="trends-start-date"]', '2024-01-15');

  // 6. Verify reactive watcher propagation
  await page.goto('/reports/analytics');
  await expectElementText(page, '[data-testid="period-total"]', '$350.00');
});
```

## Performance Considerations

### Optimized Wait Strategies

Replace hard timeouts with semantic waits:

```typescript
// ❌ Bad - Hard timeout
await page.waitForTimeout(1000);

// ✅ Good - Semantic wait
await page.waitForSelector('[data-testid="reactive-update-complete"]');
await page.waitForLoadState('networkidle');
```

### Efficient Mock Strategies

Centralize API mocking for better performance:

```typescript
// Set up route interception once
await page.route('**/api/**', route => {
  handleMockResponse(route);
});

// Use specific mocks for different test scenarios
const mockReactiveData = (scenario: string) => {
  switch (scenario) {
    case 'initial': return { /* initial data */ };
    case 'updated': return { /* updated data */ };
  }
};
```

## Testing Vue 3 Specific Features

### Composition API Patterns

Test common Composition API patterns:

```typescript
// Test ref reactivity
const testRefReactivity = async (page) => {
  // Verify ref updates trigger component re-renders
  await page.evaluate(() => {
    const app = window.__VUE_APP__;
    app.config.globalProperties.$testRef.value = 'new value';
  });

  await expectElementText(page, '[data-testid="ref-display"]', 'new value');
};

// Test computed dependencies
const testComputedDependencies = async (page) => {
  // Change dependency and verify computed updates
  await page.fill('[data-testid="dependency-input"]', 'new value');
  await expectElementText(page, '[data-testid="computed-result"]', 'computed: new value');
};
```

### Suspense and Error Boundaries

Test async component loading and error recovery:

```typescript
test('should handle Suspense boundaries reactively', async ({ page }) => {
  // Navigate to route with async component
  await page.goto('/async-component');

  // Verify Suspense fallback
  await expectElementVisible(page, '[data-testid="loading-fallback"]');

  // Wait for async component resolution
  await page.waitForSelector('[data-testid="async-content"]');

  // Verify reactive data in async component
  await expectElementText(page, '[data-testid="async-data"]', 'loaded');
});
```

## Best Practices

### 1. Test Data Management

Use factories for consistent test data:

```typescript
const createReactiveTestData = (overrides = {}) => ({
  receipts: [
    { id: 'receipt-1', total: 25.99, category: 'groceries' },
    ...overrides.receipts || []
  ],
  categories: {
    groceries: 25.99,
    ...overrides.categories || {}
  }
});
```

### 2. Assertion Patterns

Use consistent assertion patterns:

```typescript
// Verify reactive state
const expectReactiveUpdate = async (page, selector, expectedValue) => {
  await page.waitForFunction(
    (sel, val) => document.querySelector(sel)?.textContent?.includes(val),
    [selector, expectedValue],
    { timeout: 5000 }
  );
  await expectElementText(page, selector, expectedValue);
};
```

### 3. Component Isolation

Test reactive behavior in isolation:

```typescript
test('should test reactive behavior in isolation', async ({ page }) => {
  // Mount specific component for testing
  await page.goto('/test-components/reactive-counter');

  // Test specific reactive behavior
  await page.click('[data-testid="increment"]');
  await expectElementText(page, '[data-testid="count"]', '1');

  // Verify no side effects on other components
  await page.goto('/dashboard');
  // Dashboard should be unaffected by counter state
});
```

## Error Scenarios

Test reactive error handling:

```typescript
test('should handle reactive errors gracefully', async ({ page }) => {
  // Mock error condition
  await page.route('**/api/data', route => {
    route.fulfill({ status: 500, body: 'Server Error' });
  });

  // Verify error state is reactive
  await expectElementVisible(page, '[data-testid="error-boundary"]');

  // Test recovery
  await page.route('**/api/data', route => {
    route.fulfill({ status: 200, body: JSON.stringify({ data: 'recovered' }) });
  });

  await page.click('[data-testid="retry"]');
  await expectElementText(page, '[data-testid="data-display"]', 'recovered');
});
```

## Conclusion

These E2E tests ensure that Vue 3 Composition API reactivity works correctly across:

- **Component boundaries** - Data flows reactively between components
- **Route changes** - Reactive state persists during navigation
- **Complex data structures** - Deep reactivity works with nested objects
- **State management** - Pinia stores maintain reactivity
- **Async operations** - Reactive updates work with async data loading
- **Error conditions** - Reactive error handling and recovery

The tests provide confidence that the application's reactive behavior works correctly in real user scenarios across all critical paths.