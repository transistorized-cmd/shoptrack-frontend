# Test Data Factories Guide

This directory contains comprehensive test data factories to eliminate duplicate setup across tests and provide consistent, realistic test data.

## Overview

Test data factories solve common problems in testing:
- **Duplicate Setup**: Repeated object creation across test files
- **Maintenance Burden**: Hard-coded test data that's difficult to update
- **Inconsistent Data**: Variations in test data that don't reflect real usage
- **Poor Test Readability**: Tests cluttered with data setup instead of focusing on behavior

## Quick Start

```typescript
import {
  factories,
  variants,
  mockServices,
  createTestUser,
  createTestReceipt
} from '../../../tests/factories';

// Basic usage - create a user
const user = factories.user.build();

// Use variants for specific scenarios
const premiumUser = variants.users.premium();
const completedReceipt = variants.receipts.completed();

// Create related objects together
const { user, authResponse } = createTestUser();
const { receipt, items } = createTestReceipt();

// Mock service responses
vi.mock('@/services/auth.service', () => ({
  authService: mockServices.auth.success
}));
```

## Factory Types

### Base Factories (`base.ts`)

Core utilities and helpers:

```typescript
import { createFactory, testId, testDate, testEmail, testMoney } from './base';

// Create custom factories
const customFactory = createFactory<MyType>(() => ({
  id: testId.sequence(),
  email: testEmail.fake(),
  createdAt: testDate.recent(),
  price: testMoney.price(),
}));

// Use the factory
const item = customFactory.build();
const items = customFactory.buildList(5);
const customItem = customFactory.build({ email: 'specific@example.com' });
```

### User/Auth Factories (`auth.ts`)

Complete authentication system test data:

```typescript
import {
  userFactory,
  userVariants,
  authResponseFactory,
  authResponseVariants,
  mockAuthServiceResponses
} from './auth';

// Basic user
const user = userFactory.build();

// Specific user types
const unconfirmedUser = userVariants.unconfirmedEmail();
const oauthUser = userVariants.oauthOnly();
const premiumUser = userVariants.premium();
const trialUser = userVariants.trial();

// Auth responses
const successResponse = authResponseVariants.success();
const failureResponse = authResponseVariants.failure();
const twoFactorRequired = authResponseVariants.twoFactorRequired();

// Mock entire auth service
vi.mock('@/services/auth.service', () => ({
  authService: mockAuthServiceResponses.success
}));

// Mock individual methods
authService.login.mockResolvedValue(authResponseVariants.success());
```

### Receipt Factories (`receipts.ts`)

Receipt and item test data:

```typescript
import {
  receiptFactory,
  receiptVariants,
  receiptItemFactory,
  receiptItemVariants,
  createTestReceipt,
  mockReceiptsServiceResponses
} from './receipts';

// Basic receipt with items
const { receipt, items } = createTestReceipt();

// Specific receipt scenarios
const pendingReceipt = receiptVariants.pending();
const failedReceipt = receiptVariants.failed();
const groceryReceipt = receiptVariants.grocery();
const largeReceipt = receiptVariants.large();

// Individual items
const groceryItem = receiptItemVariants.groceryItem();
const manualItem = receiptItemVariants.manualItem();
const needsReviewItem = receiptItemVariants.needsReview();

// Mock receipts service
receiptsService.getReceipts.mockResolvedValue(
  mockReceiptsServiceResponses.success.getReceipts()
);
```

### API Factories (`api.ts`)

HTTP responses and error handling:

```typescript
import {
  axiosResponseVariants,
  axiosErrorVariants,
  apiResponseVariants,
  mockApiCalls
} from './api';

// HTTP responses
const okResponse = axiosResponseVariants.ok(data);
const createdResponse = axiosResponseVariants.created(data);
const notFoundResponse = axiosResponseVariants.notFound();

// Error responses
const networkError = axiosErrorVariants.networkError();
const timeoutError = axiosErrorVariants.timeout();
const validationError = axiosErrorVariants.badRequest();

// Mock API calls
api.get.mockResolvedValue(axiosResponseVariants.ok(data));
api.post.mockRejectedValue(axiosErrorVariants.serverError());

// Or use helper functions
mockApiCalls.mockSuccess(data);
mockApiCalls.mockError(axiosErrorVariants.unauthorized());
```

### Plugin Factories (`plugins.ts`)

Plugin system and async jobs:

```typescript
import {
  pluginFactory,
  pluginVariants,
  jobVariants,
  notificationVariants,
  mockPluginServiceResponses
} from './plugins';

// Plugin types
const builtInPlugin = pluginVariants.builtInProcessor();
const thirdPartyPlugin = pluginVariants.thirdParty();
const inactivePlugin = pluginVariants.inactive();

// Job states
const uploadJob = jobVariants.fileUpload();
const completedJob = jobVariants.uploadCompleted();
const failedJob = jobVariants.uploadFailed();

// Notifications
const successNotification = notificationVariants.success();
const errorNotification = notificationVariants.error();
```

## Best Practices

### 1. Use Variants for Common Scenarios

```typescript
// ❌ Don't create custom objects for common cases
const user = userFactory.build({
  emailConfirmed: false,
  emailVerifiedAt: null,
  isActive: false
});

// ✅ Use predefined variants
const user = userVariants.unconfirmedEmail();
```

### 2. Override Only What Matters for Your Test

```typescript
// ❌ Don't override everything
const receipt = receiptFactory.build({
  id: 1,
  filename: 'test.jpg',
  storeName: 'Test Store',
  processingStatus: 'completed',
  totalItemsDetected: 3,
  successfullyParsed: 3,
  // ... many more fields
});

// ✅ Override only what's relevant
const receipt = receiptVariants.completed().build({
  id: 1,
  storeName: 'Test Store'
});
```

### 3. Use Helper Functions for Complex Setups

```typescript
// ❌ Don't manually create related objects
const user = userFactory.build();
const authResponse = authResponseFactory.build({ user });

// ✅ Use helper functions
const { user, authResponse } = createTestUser();
```

### 4. Mock Entire Services, Not Individual Methods

```typescript
// ❌ Don't mock methods individually
authService.login.mockResolvedValue(...);
authService.register.mockResolvedValue(...);
authService.logout.mockResolvedValue(...);
// ... many more

// ✅ Mock the entire service
vi.mock('@/services/auth.service', () => ({
  authService: mockAuthServiceResponses.success
}));
```

### 5. Use Factories in beforeEach for Consistent State

```typescript
describe('Component Tests', () => {
  let user: User;
  let receipt: Receipt;

  beforeEach(() => {
    // Reset to fresh state for each test
    user = userVariants.authenticated();
    receipt = receiptVariants.completed();
  });

  it('should handle user interaction', () => {
    // Test uses fresh, consistent data
    expect(user.emailConfirmed).toBe(true);
  });
});
```

## Migration Guide

### Converting Existing Tests

1. **Identify Duplicate Data**:
   ```typescript
   // Before: Duplicate user objects
   const mockUser1 = { id: 1, email: 'test@example.com', ... };
   const mockUser2 = { id: 2, email: 'user@example.com', ... };
   ```

2. **Replace with Factories**:
   ```typescript
   // After: Use factories
   const user1 = factories.user.build({ id: 1 });
   const user2 = factories.user.build({ id: 2 });
   ```

3. **Use Appropriate Variants**:
   ```typescript
   // Before: Manual setup
   const pendingReceipt = {
     id: 1,
     processingStatus: 'pending',
     totalItemsDetected: 0,
     items: []
   };

   // After: Use variant
   const pendingReceipt = receiptVariants.pending();
   ```

4. **Simplify Service Mocks**:
   ```typescript
   // Before: Manual mocking
   vi.mock('@/services/auth.service', () => ({
     authService: {
       login: vi.fn().mockResolvedValue({ success: true, user: {...} }),
       register: vi.fn().mockResolvedValue({ success: true, user: {...} }),
       // ... many more
     }
   }));

   // After: Use factory mocks
   vi.mock('@/services/auth.service', () => ({
     authService: mockAuthServiceResponses.success
   }));
   ```

## Adding New Factories

When adding new factories, follow this pattern:

```typescript
// 1. Define the factory
export const newTypeFactory = createFactory<NewType>(() => ({
  id: testId.sequence(),
  name: faker.company.name(),
  createdAt: testDate.recent(),
  // ... other fields with realistic defaults
}));

// 2. Create common variants
export const newTypeVariants = {
  active: () => newTypeFactory.build({ status: 'active' }),
  inactive: () => newTypeFactory.build({ status: 'inactive' }),
  featured: () => newTypeFactory.build({ featured: true }),
};

// 3. Add mock service responses
export const mockNewTypeServiceResponses = {
  success: {
    getAll: () => Promise.resolve(newTypeFactory.buildList(5)),
    getById: () => Promise.resolve(newTypeVariants.active()),
    create: () => Promise.resolve(newTypeVariants.active()),
  },
  error: {
    getAll: () => Promise.reject(new Error('Failed to fetch')),
    getById: () => Promise.reject(new Error('Not found')),
    create: () => Promise.reject(new Error('Validation failed')),
  },
};

// 4. Export from index.ts
export * from './newType';
```

## Testing the Factories

Factories themselves should be tested to ensure they produce valid data:

```typescript
describe('Factory Tests', () => {
  it('should create valid user', () => {
    const user = userFactory.build();

    expect(user.id).toBeDefined();
    expect(user.email).toMatch(/\S+@\S+\.\S+/); // Valid email format
    expect(user.firstName).toBeTruthy();
    expect(user.createdAt).toBeTruthy();
  });

  it('should allow overrides', () => {
    const user = userFactory.build({ email: 'specific@test.com' });

    expect(user.email).toBe('specific@test.com');
  });

  it('should create multiple unique items', () => {
    const users = userFactory.buildList(3);

    expect(users).toHaveLength(3);
    expect(new Set(users.map(u => u.id)).size).toBe(3); // All unique IDs
  });
});
```

## Performance Considerations

- Factories are fast - they generate data in memory without API calls
- Use `seedFaker()` for deterministic tests when needed
- Reset factories between test suites to avoid state leakage
- Consider using `beforeEach` vs `beforeAll` based on test isolation needs

This factory system eliminates duplicate test setup, improves test maintainability, and makes tests more readable by focusing on behavior rather than data creation.