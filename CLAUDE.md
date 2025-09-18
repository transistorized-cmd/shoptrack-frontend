# Claude Documentation - ShopTrack Frontend

This document contains important information for Claude to remember when working on the ShopTrack frontend project.

## 🏗️ Project Overview

**ShopTrack Frontend** is a Vue 3 TypeScript application with:
- **Framework**: Vue 3 with Composition API
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: Pinia
- **Testing**: Vitest + Vue Test Utils + Testing Library
- **Charts**: Chart.js with vue-chartjs
- **Type Safety**: Full TypeScript coverage

## 🔧 Node Version Management

**CRITICAL**: This project requires Node.js v22 and has automated version checking.

### Key Files:
- `.nvmrc`: Contains `22` (required Node version)
- `scripts/check-node-version.cjs`: Validates Node version before commands
- `scripts/with-nvm.sh`: Auto-switches to correct Node version
- `package.json`: Contains `engines` field and version-checked scripts

### Commands with Automatic Version Checking:
```bash
npm run dev          # ✅ Checks Node v22 before starting
npm run build        # ✅ Checks Node v22 before building  
npm run test:run     # ✅ Checks Node v22 before testing
npm run type-check   # ✅ Checks Node v22 before type checking
npm run preview      # ✅ Checks Node v22 before preview
```

### Auto-Switching Commands:
```bash
npm run nvm:dev          # Auto-switch to v22 and start dev server
npm run nvm:build        # Auto-switch to v22 and build project
npm run nvm:test         # Auto-switch to v22 and run tests (watch)
npm run nvm:test:run     # Auto-switch to v22 and run tests (once)
```

### Error Message:
If wrong Node version is detected, commands show:
```
❌ Wrong Node version!
   Required: Node v22.x (from .nvmrc)
   Current:  Node v16.x

📝 To fix this, run one of these commands:
   nvm use              (if you have nvm installed)
   nvm use 22          (explicit version)

💡 Tip: You can also use these helper scripts:
   npm run nvm:dev          (auto-switch and run dev server)
   npm run nvm:build        (auto-switch and build)
   npm run nvm:test:run     (auto-switch and run tests)
```

## 🧪 Testing Infrastructure

The project has comprehensive testing setup with Vitest:

### Test Framework Stack:
- **Vitest**: Fast Vite-native test runner
- **@vue/test-utils**: Official Vue 3 testing utilities
- **@testing-library/vue**: User-centric component testing
- **happy-dom**: DOM implementation for tests
- **MSW**: API mocking capabilities
- **@faker-js/faker**: Test data generation

### Test Configuration Files:
- `vitest.config.ts`: Vitest configuration with Vue plugin
- `tests/setup.ts`: Global test setup and mocks
- Coverage configured with v8 provider

### Test Commands:
```bash
npm run test            # Watch mode
npm run test:run        # CI mode (run once)
npm run test:ui         # Interactive UI
npm run test:coverage   # With coverage report

# Category-based test running
npm run test:unit       # Unit tests only
npm run test:fast       # Fast tests (< 100ms)
npm run test:components # Component tests
npm run test:auth       # Authentication tests
npm run test:stable     # Stable tests (exclude flaky)
npm run test:ci-fast    # CI-optimized fast tests
```

### Current Test Coverage (75+ tests, 100% passing):
- ✅ **Authentication Store** (36 tests) - Login, logout, user management, error handling
- ✅ **QuickUpload Component** (29 tests) - File upload, drag/drop, plugin detection, validation
- ✅ **ThemeToggle Component** (6 tests) - Dark mode, localStorage persistence
- ✅ **Utility Functions** (4 tests) - Math helpers, formatting functions
- ✅ **Integration Tests** (40+ tests) - Complete user flows, error handling, performance monitoring
  - Complete user flows (login → dashboard → receipts)
  - User registration and email verification flows
  - Receipt upload and processing workflows
  - Comprehensive error handling scenarios
  - Performance monitoring and regression detection
- 🔄 **In Progress**: API services, composables, additional UI components

### Test Structure:
```
src/components/__tests__/    # Component tests
tests/unit/                  # Unit tests
tests/integration/           # Integration tests
  ├── complete-user-flows.integration.test.ts      # End-to-end user journeys
  ├── user-registration-flow.integration.test.ts   # Registration workflows
  ├── receipt-upload-processing.integration.test.ts # Upload workflows
  └── error-handling.integration.test.ts           # Error scenarios
tests/performance/           # Performance tests
  └── integration-performance.test.ts             # Performance monitoring
tests/utils/                 # Test utilities
  ├── router.ts             # Vue Router mock utility
  ├── categories.ts         # Test categorization system
  ├── mounting.ts           # Component mounting utilities
  └── performance-monitoring.ts # Comprehensive performance tracking
```

### Test Utilities:

#### Router Testing (`tests/utils/router.ts`):
```typescript
import { createMockRouter } from '../../../tests/utils/router'

// In component tests that use RouterLink
const { mockRouter } = createMockRouter()
wrapper = mount(Component, {
  global: {
    plugins: [mockRouter]  // Provides proper Vue Router injection
  }
})
```

#### Shallow/Full Mounting (`tests/utils/mounting.ts`):
```typescript
import { shallowMountComponent, mountComponent } from '../../../tests/utils/mounting'

// Fast unit testing with shallow mounting
const wrapper = shallowMountComponent(MyComponent, { props: { title: 'Test' } })

// Integration testing with full mounting
const wrapper = mountComponent(MyComponent) // Includes i18n, router, Pinia
```

#### Test Categorization (`tests/utils/categories.ts`):
```typescript
import { categorizedDescribe, categorizedIt, TestCategory, withPerformance } from '../../../tests/utils/categories'

// Categorized test suites for selective running
categorizedDescribe('MyComponent', [TestCategory.UNIT, TestCategory.FAST], () => {
  categorizedIt('should render correctly', [TestCategory.CRITICAL], () => {
    // Test implementation
  })
})

// Performance monitoring with categorization
categorizedIt('should handle large datasets efficiently',
  [TestCategory.PERFORMANCE, TestCategory.SLOW],
  withPerformance(async () => {
    // Performance-critical test
  }, 1000, TestCategory.SLOW, 'Large Dataset Test', [TestCategory.PERFORMANCE])
)
```

#### Performance Monitoring (`tests/utils/performance-monitoring.ts`):
```typescript
import { withPerformanceMonitoring, PerformanceThresholds } from '../../../tests/utils/performance-monitoring'

// Comprehensive performance monitoring
const customThresholds: Partial<PerformanceThresholds> = {
  maxDuration: 500,
  maxMemoryUsage: 10 * 1024 * 1024, // 10MB
  maxNetworkRequests: 5,
  maxResponseTime: 200,
  maxRerenders: 3
}

const testFn = withPerformanceMonitoring(
  async () => {
    // Test implementation
  },
  'Test Name',
  [TestCategory.PERFORMANCE, TestCategory.INTEGRATION],
  customThresholds
)
```

### Example Test Patterns:

#### Basic Component Test:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Component from '../Component.vue'

describe('Component', () => {
  it('should test behavior', () => {
    const wrapper = mount(Component, { props: { simple: true } })
    expect(wrapper.exists()).toBe(true)
  })
})
```

#### Component with RouterLink:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockRouter } from '../../../tests/utils/router'
import Component from '../Component.vue'

describe('Component with Router', () => {
  it('should handle routing', () => {
    const { mockRouter } = createMockRouter()
    const wrapper = mount(Component, {
      global: {
        plugins: [mockRouter]
      }
    })

    expect(wrapper.find('a[href="/receipts"]').exists()).toBe(true)
  })
})
```

#### Integration Test with Complete User Flow:
```typescript
import { categorizedDescribe, categorizedIt, TestCategory, CategoryCombos } from '../../../tests/utils/categories'
import { withPerformanceMonitoring } from '../../../tests/utils/performance-monitoring'

categorizedDescribe('User Registration Flow', CategoryCombos.INTEGRATION_VIEW, () => {
  categorizedIt('should complete registration and verification',
    [TestCategory.INTEGRATION, TestCategory.CRITICAL],
    withPerformanceMonitoring(async () => {
      // 1. Navigate to registration
      await router.push('/register')
      await wrapper.vm.$nextTick()

      // 2. Fill registration form
      await wrapper.find('[data-testid="first-name"]').setValue('John')
      await wrapper.find('[data-testid="email"]').setValue('john@example.com')

      // 3. Submit registration
      await wrapper.find('[data-testid="register-btn"]').trigger('click')

      // 4. Verify email verification flow
      expect(wrapper.find('[data-testid="verification-sent"]').exists()).toBe(true)

      // 5. Simulate email verification
      await wrapper.find('[data-testid="verify-btn"]').trigger('click')

      // 6. Verify successful completion
      expect(wrapper.text()).toContain('Account verified successfully')
    }, 'Complete Registration Flow', [TestCategory.INTEGRATION, TestCategory.AUTH], {
      maxDuration: 2000,
      maxNetworkRequests: 10
    })
  )
})
```

#### Error Handling Integration Test:
```typescript
categorizedDescribe('Error Handling', [TestCategory.INTEGRATION, TestCategory.ERROR_HANDLING], () => {
  categorizedIt('should handle network errors with retry',
    [TestCategory.ERROR_HANDLING, TestCategory.NETWORK],
    withPerformanceMonitoring(async () => {
      // Mock network failure
      mockAxios.onGet('/api/data').networkError()

      // Trigger action that causes error
      await wrapper.find('[data-testid="load-data"]').trigger('click')

      // Verify error boundary shows error
      expect(wrapper.find('[data-testid="error-display"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Network error')

      // Test retry functionality
      mockAxios.reset()
      mockAxios.onGet('/api/data').reply(200, { data: 'success' })

      await wrapper.find('[data-testid="retry-btn"]').trigger('click')

      // Verify successful retry
      expect(wrapper.find('[data-testid="error-display"]').exists()).toBe(false)
    }, 'Network Error Recovery', [TestCategory.ERROR_HANDLING, TestCategory.NETWORK])
  )
})
```

#### Performance Test with Monitoring:
```typescript
categorizedDescribe('Performance Tests', [TestCategory.PERFORMANCE], () => {
  categorizedIt('should handle large datasets efficiently',
    [TestCategory.PERFORMANCE, TestCategory.SLOW],
    withPerformanceMonitoring(async () => {
      // Generate large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        data: new Array(100).fill(Math.random())
      }))

      // Mount component with large dataset
      wrapper = mount(DataTableComponent, {
        props: { items: largeDataset },
        global: { plugins: [pinia, router, i18n] }
      })

      await wrapper.vm.$nextTick()

      // Verify rendering performance
      expect(wrapper.findAll('[data-testid^="item-"]')).toHaveLength(1000)

      // Test scrolling performance
      const scrollContainer = wrapper.find('[data-testid="scroll-container"]')
      await scrollContainer.trigger('scroll', { target: { scrollTop: 5000 } })

      // Verify virtual scrolling or pagination works
      expect(wrapper.vm.visibleItems.length).toBeLessThanOrEqual(50)
    }, 'Large Dataset Rendering', [TestCategory.PERFORMANCE, TestCategory.SLOW], {
      maxDuration: 1000,
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB
      maxRerenders: 10
    })
  )
})
```

## 🔄 Development Workflow

### Starting Development:
1. Ensure Node v22: `nvm use` or use `npm run nvm:dev`
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`
4. Access: `http://localhost:5173`

### Code Quality Commands:
- `npm run lint`: ESLint with Vue/TypeScript rules
- `npm run type-check`: Vue TSC type checking
- `npm run format`: Prettier code formatting

### Build Commands:
- `npm run build`: Production build with type checking
- `npm run preview`: Preview production build
- `npm run build:analyze`: Bundle analyzer

## 📂 Key Project Structure

```
shoptrack-frontend/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── __tests__/       # Component tests
│   │   ├── charts/          # Chart components (Chart.js)
│   │   ├── reports/         # Report components
│   │   └── receipts/        # Receipt components
│   ├── views/               # Page components
│   ├── stores/              # Pinia stores
│   ├── services/            # API services
│   ├── composables/         # Vue composables
│   ├── types/               # TypeScript definitions
│   └── router/              # Vue Router config
├── tests/
│   ├── setup.ts             # Test setup
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── utils/               # Test utilities
├── scripts/
│   ├── check-node-version.cjs    # Node version checker
│   └── with-nvm.sh              # Auto-switch script
├── vitest.config.ts         # Vitest configuration
├── .nvmrc                   # Node version (22)
└── package.json             # Dependencies & scripts
```

## 🎯 Key Features & Architecture

### Plugin System:
- Extensible receipt processing plugins
- Plugin registry and auto-detection
- Dynamic plugin loading and configuration

### State Management (Pinia):
- `usePluginStore`: Plugin management
- `useReportsStore`: Reports and analytics
- `useReceiptsStore`: Receipt data management

### Chart Visualizations:
- Chart.js integration with vue-chartjs
- Lazy-loaded chart components
- Interactive price trend visualizations

### API Integration:
- Axios-based HTTP client
- Proxy configuration for backend API
- TypeScript API response types

## 🚨 Important Notes for Claude

### When Working on Tests:
1. **Always use Node v22**: Use `npm run nvm:test:run` if version issues
2. **Mock composables properly**: Provide complete mock return values
3. **Use Vue Test Utils**: Mount components with proper props
4. **Test file location**: Place in `src/components/__tests__/` or `tests/`
5. **RouterLink components**: Use `createMockRouter()` from `tests/utils/router.ts`
   - Import: `import { createMockRouter } from '../../../tests/utils/router'`
   - Mount: `global: { plugins: [mockRouter] }`
   - Avoid component stubs for RouterLink

### When Writing Integration Tests:
1. **Use categorized tests**: Apply appropriate `TestCategory` tags for selective running
2. **Mock APIs comprehensively**: Use `MockAdapter` for complete API simulation
3. **Test complete user flows**: Cover entire journeys from start to finish
4. **Include error scenarios**: Test network failures, validation errors, timeouts
5. **Monitor performance**: Use `withPerformanceMonitoring` for critical flows
6. **Use realistic data**: Generate test data that matches real-world scenarios
7. **Test accessibility**: Include ARIA labels and keyboard navigation tests
8. **Verify state management**: Ensure Pinia stores update correctly throughout flows

### Performance Testing Guidelines:
1. **Set appropriate thresholds**: Use category-based defaults or custom thresholds
2. **Monitor all metrics**: Duration, memory, network requests, rerenders
3. **Test edge cases**: Large datasets, slow networks, memory constraints
4. **Use realistic scenarios**: Simulate actual user behavior patterns
5. **Track regression**: Set strict thresholds for critical performance tests
6. **Generate reports**: Use `generatePerformanceReport()` for analysis

### When Working on Components:
1. **Use Composition API**: Prefer `<script setup>` syntax
2. **TypeScript interfaces**: Define props and emits with types
3. **TailwindCSS**: Use utility classes for styling
4. **Accessibility**: Include ARIA labels and semantic HTML

### When Adding Dependencies:
1. **Check Node version**: Ensure running Node v22
2. **Install with npm**: `npm install <package>`
3. **Update types**: Add `@types/<package>` if needed
4. **Update tests**: Mock new dependencies if needed

### Command Preferences:
- **Use auto-switching commands** when Node version issues occur
- **Run tests** with `npm run test:run` for quick validation
- **Type check** with `npm run type-check` before commits
- **Lint code** with `npm run lint` to fix style issues
- **Run integration tests** with `TEST_CATEGORIES=integration npm run test:run`
- **Run performance tests** with `TEST_CATEGORIES=performance npm run test:run`
- **Generate performance reports** after test runs for analysis

## 📋 Development Checklist

When working on this project:

- [ ] Use Node v22 (via `nvm use` or auto-switching commands)
- [ ] Write tests for new components/functions
- [ ] Follow TypeScript best practices
- [ ] Use Composition API for Vue components
- [ ] Add proper error handling
- [ ] Update documentation when adding features
- [ ] Run `npm run lint` and `npm run type-check`
- [ ] Test in development mode before building

## 🔧 Troubleshooting Common Issues

### Node Version Errors:
```bash
# Problem: Wrong Node version
# Solution: Use auto-switching command
npm run nvm:dev
npm run nvm:test:run
```

### Test Failures:
```bash
# Check test setup and mocks
npm run test:run

# Run specific test file  
npx vitest src/components/__tests__/ComponentName.test.ts
```

### Build Issues:
```bash
# Type check first
npm run type-check

# Then build
npm run build
```

This documentation ensures consistent development practices and helps avoid common issues when working on the ShopTrack frontend project.