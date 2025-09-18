# Accessibility Testing Guide - ShopTrack Frontend

This document provides comprehensive guidelines for implementing and testing accessibility in the ShopTrack frontend application.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Accessibility Standards](#accessibility-standards)
3. [Testing Tools](#testing-tools)
4. [Testing Workflow](#testing-workflow)
5. [Component Testing Guidelines](#component-testing-guidelines)
6. [Integration Testing Guidelines](#integration-testing-guidelines)
7. [Common Accessibility Patterns](#common-accessibility-patterns)
8. [Accessibility Checklist](#accessibility-checklist)
9. [Troubleshooting](#troubleshooting)
10. [Resources](#resources)

## 🎯 Overview

The ShopTrack frontend application is committed to providing an accessible experience for all users, including those using assistive technologies. Our accessibility testing infrastructure uses **jest-axe** and comprehensive testing utilities to ensure WCAG 2.1 AA compliance.

### Key Features

- **Automated accessibility testing** with jest-axe
- **Comprehensive test utilities** for different accessibility scenarios
- **Integration with existing test framework** (Vitest + Vue Test Utils)
- **Performance monitoring** for accessibility features
- **Detailed reporting** and violation tracking

## 📏 Accessibility Standards

We follow the **Web Content Accessibility Guidelines (WCAG) 2.1** at **Level AA** compliance:

### WCAG 2.1 Principles

1. **Perceivable** - Information must be presentable in ways users can perceive
2. **Operable** - Interface components must be operable
3. **Understandable** - Information and UI operation must be understandable
4. **Robust** - Content must be robust enough for various assistive technologies

### Specific Guidelines

- **Color Contrast**: Minimum 4.5:1 ratio for normal text, 3:1 for large text
- **Keyboard Navigation**: All interactive elements must be keyboard accessible
- **Screen Reader Support**: Proper ARIA labels, roles, and properties
- **Focus Management**: Visible focus indicators and logical tab order
- **Semantic HTML**: Use proper HTML elements for their intended purpose

## 🛠️ Testing Tools

### Primary Tools

- **jest-axe**: Automated accessibility testing library
- **@axe-core/playwright**: For end-to-end accessibility testing
- **Vue Test Utils**: Component testing framework
- **Vitest**: Test runner with accessibility extensions

### Accessibility Profiles

Our testing infrastructure includes several preconfigured profiles:

```typescript
// Basic - Essential accessibility checks
testAccessibility(wrapper, 'ComponentName', 'basic')

// Comprehensive - Full WCAG 2.1 AA testing
testAccessibility(wrapper, 'ComponentName', 'comprehensive')

// Strict - WCAG 2.1 AAA + best practices
testAccessibility(wrapper, 'ComponentName', 'strict')

// Forms - Form-specific accessibility checks
testAccessibility(wrapper, 'ComponentName', 'forms')

// Navigation - Navigation-specific checks
testAccessibility(wrapper, 'ComponentName', 'navigation')
```

## 🔄 Testing Workflow

### 1. Component Development Workflow

```typescript
// 1. Create component with accessibility features
// 2. Write accessibility tests alongside regular tests
// 3. Run accessibility tests during development
// 4. Fix violations before committing

import { testAccessibility, testKeyboardAccessibility } from '../../../tests/utils/accessibility'

describe('MyComponent Accessibility', () => {
  it('should be fully accessible', async () => {
    const wrapper = mount(MyComponent)

    // Basic accessibility test
    await testAccessibility(wrapper, 'MyComponent')

    // Keyboard accessibility test
    await testKeyboardAccessibility(wrapper, 'MyComponent')
  })
})
```

### 2. Integration Testing Workflow

```typescript
// Test complete user flows for accessibility
categorizedIt('should maintain accessibility throughout user flow',
  [TestCategory.ACCESSIBILITY, TestCategory.INTEGRATION],
  async () => {
    // Navigate through application
    // Test accessibility at each step
    // Verify focus management
    // Check ARIA live regions
  }
)
```

### 3. CI/CD Integration

```bash
# Run accessibility tests in CI
npm run test:accessibility

# Run with specific categories
TEST_CATEGORIES=accessibility npm run test:run

# Generate accessibility report
npm run test:accessibility:report
```

## 🧩 Component Testing Guidelines

### Basic Component Test

```typescript
import { testAccessibility } from '../../../tests/utils/accessibility'

describe('Button Component', () => {
  it('should be accessible', async () => {
    const wrapper = mount(Button, {
      props: { label: 'Click me' }
    })

    await testAccessibility(wrapper, 'Button')
  })
})
```

### Form Component Test

```typescript
import { testFullAccessibility } from '../../../tests/utils/accessibility'

describe('ContactForm', () => {
  it('should be fully accessible', async () => {
    const wrapper = mount(ContactForm)

    const results = await testFullAccessibility(wrapper, 'ContactForm', {
      profile: 'forms',
      testKeyboard: true,
      testAria: true,
      testSemantics: true
    })

    expect(results.axeResult.passed).toBe(true)
    expect(results.keyboardResult?.keyboardAccessible).toBe(true)
    expect(results.ariaResult?.passed).toBe(true)
  })
})
```

### Modal Component Test

```typescript
describe('Modal Accessibility', () => {
  it('should manage focus correctly', async () => {
    const wrapper = mount(Modal, {
      props: { isOpen: true }
    })

    // Test modal accessibility
    await testAccessibility(wrapper, 'Modal')

    // Test focus trap
    const focusableElements = wrapper.element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    expect(focusableElements.length).toBeGreaterThan(0)

    // Test ARIA attributes
    const modal = wrapper.find('[role="dialog"]')
    expect(modal.attributes('aria-modal')).toBe('true')
    expect(modal.attributes('aria-labelledby')).toBeTruthy()
  })
})
```

## 🔗 Integration Testing Guidelines

### Navigation Flow Testing

```typescript
categorizedIt('should maintain keyboard navigation throughout app',
  [TestCategory.ACCESSIBILITY, TestCategory.KEYBOARD],
  async () => {
    // Test navigation between pages
    // Verify skip links work
    // Check focus management on route changes
    // Test dropdown menus and subnavigation
  }
)
```

### Form Flow Testing

```typescript
categorizedIt('should handle form submission accessibly',
  [TestCategory.ACCESSIBILITY, TestCategory.FORMS],
  async () => {
    // Test form validation messages
    // Verify error announcements
    // Check success feedback
    // Test progress indicators
  }
)
```

### Error Handling Testing

```typescript
categorizedIt('should handle errors accessibly',
  [TestCategory.ACCESSIBILITY, TestCategory.ERROR_HANDLING],
  async () => {
    // Test error message announcements
    // Verify focus management on errors
    // Check retry functionality
    // Test error recovery flows
  }
)
```

## 🎨 Common Accessibility Patterns

### 1. Form Labels and Descriptions

```vue
<template>
  <div class="field-group">
    <label for="email">Email Address</label>
    <input
      id="email"
      v-model="email"
      type="email"
      required
      aria-describedby="email-help"
      :aria-invalid="errors.email ? 'true' : 'false'"
    />
    <div id="email-help" class="help-text">
      We'll never share your email
    </div>
    <div v-if="errors.email" role="alert" class="error">
      {{ errors.email }}
    </div>
  </div>
</template>
```

### 2. Button States

```vue
<template>
  <button
    @click="toggle"
    :aria-pressed="isPressed.toString()"
    :aria-label="isPressed ? 'Hide content' : 'Show content'"
  >
    {{ isPressed ? 'Hide' : 'Show' }}
  </button>
</template>
```

### 3. Loading States

```vue
<template>
  <div
    v-if="isLoading"
    role="status"
    aria-live="polite"
    aria-label="Loading content"
  >
    <div class="spinner" aria-hidden="true"></div>
    <span class="sr-only">Loading...</span>
  </div>
</template>
```

### 4. Modal Dialog

```vue
<template>
  <div
    v-if="isOpen"
    class="modal-backdrop"
    @click="close"
    @keydown.esc="close"
  >
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="descId"
      @click.stop
    >
      <h2 :id="titleId">{{ title }}</h2>
      <p :id="descId">{{ description }}</p>

      <button @click="close" aria-label="Close modal">×</button>
    </div>
  </div>
</template>
```

### 5. Data Tables

```vue
<template>
  <table role="table" aria-describedby="table-description">
    <caption>Receipt data</caption>
    <div id="table-description" class="sr-only">
      Table showing receipt information with sortable columns
    </div>

    <thead>
      <tr>
        <th
          role="columnheader"
          @click="sort('date')"
          :aria-sort="getSortDirection('date')"
          tabindex="0"
        >
          Date
        </th>
      </tr>
    </thead>
  </table>
</template>
```

### 6. Live Regions

```vue
<template>
  <div>
    <!-- For important announcements -->
    <div
      id="announcements"
      aria-live="assertive"
      aria-atomic="true"
      class="sr-only"
    >
      {{ urgentMessage }}
    </div>

    <!-- For status updates -->
    <div
      id="status"
      aria-live="polite"
      class="sr-only"
    >
      {{ statusMessage }}
    </div>
  </div>
</template>
```

## ✅ Accessibility Checklist

### Component Checklist

- [ ] **Semantic HTML**: Use proper HTML elements
- [ ] **Keyboard Navigation**: All interactive elements accessible via keyboard
- [ ] **Focus Indicators**: Visible focus states for all interactive elements
- [ ] **ARIA Labels**: Proper labels for all form controls and buttons
- [ ] **Color Contrast**: Meet WCAG 2.1 AA contrast requirements
- [ ] **Screen Reader Testing**: Test with actual screen readers
- [ ] **Error Messages**: Properly announced validation errors
- [ ] **Loading States**: Accessible progress indicators
- [ ] **Dynamic Content**: Live regions for content updates

### Integration Checklist

- [ ] **Skip Links**: Functional skip navigation
- [ ] **Landmark Regions**: Proper HTML5 landmarks
- [ ] **Heading Hierarchy**: Logical heading structure
- [ ] **Focus Management**: Proper focus on route changes
- [ ] **Form Flows**: Accessible form submission and validation
- [ ] **Error Handling**: Accessible error states and recovery
- [ ] **Modal Dialogs**: Proper focus trapping and management
- [ ] **Data Tables**: Accessible table structure and interactions

### Testing Checklist

- [ ] **Automated Tests**: jest-axe tests for all components
- [ ] **Manual Testing**: Keyboard-only navigation testing
- [ ] **Screen Reader Testing**: Test with NVDA, JAWS, or VoiceOver
- [ ] **Browser Testing**: Test across different browsers
- [ ] **Mobile Testing**: Test on mobile devices with assistive tech
- [ ] **Performance Testing**: Ensure accessibility features don't impact performance

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. Color Contrast Violations

```scss
// ❌ Poor contrast
.button {
  background: #ccc;
  color: #ddd;
}

// ✅ Good contrast
.button {
  background: #0066cc;
  color: #ffffff;
}
```

#### 2. Missing Form Labels

```vue
<!-- ❌ Missing label -->
<input type="email" placeholder="Email" />

<!-- ✅ Proper label -->
<label for="email">Email Address</label>
<input id="email" type="email" />
```

#### 3. Inaccessible Buttons

```vue
<!-- ❌ No accessible name -->
<button @click="close">×</button>

<!-- ✅ Accessible name -->
<button @click="close" aria-label="Close dialog">×</button>
```

#### 4. Focus Management Issues

```javascript
// ❌ Focus lost after action
function openModal() {
  isOpen.value = true
}

// ✅ Proper focus management
function openModal() {
  previousFocus = document.activeElement
  isOpen.value = true
  nextTick(() => {
    modalFirstElement.focus()
  })
}
```

### Debugging Accessibility Issues

1. **Use browser dev tools** accessibility panel
2. **Run axe-core** in browser console
3. **Test with screen readers** (NVDA, JAWS, VoiceOver)
4. **Use keyboard-only navigation**
5. **Check color contrast** with tools like WebAIM

## 📚 Resources

### Standards and Guidelines

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Articles](https://webaim.org/articles/)

### Testing Tools

- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Web Accessibility Evaluator](https://wave.webaim.org/)
- [Color Contrast Analyzers](https://www.tpgi.com/color-contrast-checker/)

### Screen Readers

- [NVDA](https://www.nvaccess.org/) (Windows, Free)
- [JAWS](https://www.freedomscientific.com/products/software/jaws/) (Windows, Commercial)
- [VoiceOver](https://www.apple.com/accessibility/vision/) (macOS/iOS, Built-in)

### Vue.js Accessibility Resources

- [Vue.js Accessibility Guide](https://vuejs.org/guide/best-practices/accessibility.html)
- [Vue A11y Community](https://vue-a11y.github.io/)

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install --save-dev jest-axe @axe-core/playwright
```

### 2. Run Accessibility Tests

```bash
# Run all accessibility tests
npm run test:accessibility

# Run specific accessibility categories
TEST_CATEGORIES=accessibility npm run test:run

# Run with coverage
npm run test:accessibility:coverage
```

### 3. Add to New Components

```typescript
import { testAccessibility } from '../../../tests/utils/accessibility'

describe('NewComponent', () => {
  it('should be accessible', async () => {
    const wrapper = mount(NewComponent)
    await testAccessibility(wrapper, 'NewComponent')
  })
})
```

### 4. Integrate with CI/CD

Add accessibility testing to your CI pipeline to catch issues early.

---

## 📞 Support

For questions about accessibility testing or implementation:

1. Check this documentation first
2. Review existing test examples
3. Consult WCAG 2.1 guidelines
4. Test with actual assistive technologies

Remember: **Accessibility is not optional** - it's a fundamental requirement for creating inclusive web applications that work for everyone.