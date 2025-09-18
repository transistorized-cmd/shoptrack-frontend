/**
 * Accessibility testing utilities using jest-axe
 * Provides comprehensive accessibility testing infrastructure for Vue components
 */

import { configureAxe, toHaveNoViolations } from 'jest-axe';
import { VueWrapper } from '@vue/test-utils';
import { TestCategory } from './categories';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Accessibility test categories
export enum AccessibilityCategory {
  KEYBOARD = 'keyboard',
  SCREEN_READER = 'screen-reader',
  COLOR_CONTRAST = 'color-contrast',
  FOCUS_MANAGEMENT = 'focus-management',
  ARIA_LABELS = 'aria-labels',
  FORM_LABELS = 'form-labels',
  SEMANTIC_HTML = 'semantic-html',
  LANDMARKS = 'landmarks',
  HEADINGS = 'headings',
  IMAGES = 'images',
  TABLES = 'tables',
  LISTS = 'lists'
}

// Accessibility violation severity levels
export enum ViolationSeverity {
  MINOR = 'minor',
  MODERATE = 'moderate',
  SERIOUS = 'serious',
  CRITICAL = 'critical'
}

// Configuration for different accessibility test profiles
export const AccessibilityProfiles = {
  // Basic accessibility checks for all components
  BASIC: {
    tags: ['wcag2a', 'wcag2aa'],
    rules: {
      'color-contrast': { enabled: true },
      'keyboard-trap': { enabled: true },
      'focus-order-semantics': { enabled: true },
      'aria-valid-attr': { enabled: true },
      'button-name': { enabled: true },
      'form-field-multiple-labels': { enabled: true },
      'input-image-alt': { enabled: true },
      'label': { enabled: true },
      'link-name': { enabled: true }
    }
  },

  // Comprehensive checks for critical user flows
  COMPREHENSIVE: {
    tags: ['wcag2a', 'wcag2aa', 'wcag2aaa', 'best-practice'],
    rules: {
      'color-contrast': { enabled: true },
      'color-contrast-enhanced': { enabled: true },
      'keyboard-trap': { enabled: true },
      'focus-order-semantics': { enabled: true },
      'sequential-focus-indicator': { enabled: true },
      'aria-valid-attr': { enabled: true },
      'aria-valid-attr-value': { enabled: true },
      'aria-roles': { enabled: true },
      'button-name': { enabled: true },
      'form-field-multiple-labels': { enabled: true },
      'input-image-alt': { enabled: true },
      'label': { enabled: true },
      'link-name': { enabled: true },
      'heading-order': { enabled: true },
      'landmark-unique': { enabled: true },
      'region': { enabled: true },
      'list': { enabled: true },
      'listitem': { enabled: true },
      'table-fake-caption': { enabled: true },
      'td-headers-attr': { enabled: true },
      'th-has-data-cells': { enabled: true }
    }
  },

  // Strict checks for production-ready components
  STRICT: {
    tags: ['wcag2a', 'wcag2aa', 'wcag2aaa', 'best-practice', 'experimental'],
    rules: {
      'color-contrast': { enabled: true },
      'color-contrast-enhanced': { enabled: true },
      'keyboard-trap': { enabled: true },
      'focus-order-semantics': { enabled: true },
      'sequential-focus-indicator': { enabled: true },
      'aria-valid-attr': { enabled: true },
      'aria-valid-attr-value': { enabled: true },
      'aria-roles': { enabled: true },
      'aria-required-attr': { enabled: true },
      'aria-required-children': { enabled: true },
      'aria-required-parent': { enabled: true },
      'button-name': { enabled: true },
      'form-field-multiple-labels': { enabled: true },
      'input-image-alt': { enabled: true },
      'label': { enabled: true },
      'link-name': { enabled: true },
      'heading-order': { enabled: true },
      'landmark-unique': { enabled: true },
      'region': { enabled: true },
      'list': { enabled: true },
      'listitem': { enabled: true },
      'table-fake-caption': { enabled: true },
      'td-headers-attr': { enabled: true },
      'th-has-data-cells': { enabled: true },
      'image-alt': { enabled: true },
      'image-redundant-alt': { enabled: true }
    }
  },

  // Custom profile for forms
  FORMS: {
    tags: ['wcag2a', 'wcag2aa'],
    rules: {
      'label': { enabled: true },
      'form-field-multiple-labels': { enabled: true },
      'input-image-alt': { enabled: true },
      'aria-valid-attr': { enabled: true },
      'aria-required-attr': { enabled: true },
      'button-name': { enabled: true },
      'color-contrast': { enabled: true },
      'keyboard-trap': { enabled: true }
    }
  },

  // Custom profile for navigation
  NAVIGATION: {
    tags: ['wcag2a', 'wcag2aa'],
    rules: {
      'link-name': { enabled: true },
      'button-name': { enabled: true },
      'landmark-unique': { enabled: true },
      'region': { enabled: true },
      'heading-order': { enabled: true },
      'keyboard-trap': { enabled: true },
      'focus-order-semantics': { enabled: true },
      'color-contrast': { enabled: true }
    }
  }
};

// Configure axe for Vue testing
export const axe = configureAxe({
  globalOptions: {
    reporter: 'v2'
  },
  // Default configuration
  ...AccessibilityProfiles.BASIC
});

// Enhanced axe configurations for different test scenarios
export const axeComprehensive = configureAxe({
  globalOptions: {
    reporter: 'v2'
  },
  ...AccessibilityProfiles.COMPREHENSIVE
});

export const axeStrict = configureAxe({
  globalOptions: {
    reporter: 'v2'
  },
  ...AccessibilityProfiles.STRICT
});

export const axeForms = configureAxe({
  globalOptions: {
    reporter: 'v2'
  },
  ...AccessibilityProfiles.FORMS
});

export const axeNavigation = configureAxe({
  globalOptions: {
    reporter: 'v2'
  },
  ...AccessibilityProfiles.NAVIGATION
});

// Accessibility test result interface
export interface AccessibilityTestResult {
  componentName: string;
  testName: string;
  profile: string;
  violations: any[];
  passed: boolean;
  timestamp: number;
  categories: AccessibilityCategory[];
}

// Accessibility test utilities class
export class AccessibilityTester {
  private results: AccessibilityTestResult[] = [];

  /**
   * Test a Vue component wrapper for accessibility violations
   */
  async testComponent(
    wrapper: VueWrapper,
    options: {
      componentName: string;
      testName: string;
      profile?: 'basic' | 'comprehensive' | 'strict' | 'forms' | 'navigation';
      categories?: AccessibilityCategory[];
      customRules?: any;
    }
  ): Promise<AccessibilityTestResult> {
    const {
      componentName,
      testName,
      profile = 'basic',
      categories = [],
      customRules
    } = options;

    // Select appropriate axe configuration
    let axeConfig = axe;
    switch (profile) {
      case 'comprehensive':
        axeConfig = axeComprehensive;
        break;
      case 'strict':
        axeConfig = axeStrict;
        break;
      case 'forms':
        axeConfig = axeForms;
        break;
      case 'navigation':
        axeConfig = axeNavigation;
        break;
      default:
        axeConfig = axe;
    }

    // Apply custom rules if provided
    if (customRules) {
      axeConfig = configureAxe({
        globalOptions: { reporter: 'v2' },
        rules: customRules
      });
    }

    // Get the DOM element from the wrapper
    const element = wrapper.element;

    // Run accessibility tests
    const results = await axeConfig(element);

    // Create test result
    const testResult: AccessibilityTestResult = {
      componentName,
      testName,
      profile,
      violations: results.violations,
      passed: results.violations.length === 0,
      timestamp: Date.now(),
      categories
    };

    // Store result for reporting
    this.results.push(testResult);

    // Log violations if any
    if (results.violations.length > 0) {
      console.error(`🚫 Accessibility violations found in ${componentName}:`);
      results.violations.forEach((violation, index) => {
        console.error(`  ${index + 1}. ${violation.id}: ${violation.description}`);
        console.error(`     Impact: ${violation.impact}`);
        console.error(`     Help: ${violation.helpUrl}`);
        violation.nodes.forEach((node: any, nodeIndex: number) => {
          console.error(`     Node ${nodeIndex + 1}: ${node.target.join(', ')}`);
          console.error(`     HTML: ${node.html}`);
        });
      });
    }

    return testResult;
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation(
    wrapper: VueWrapper,
    options: {
      focusableSelector?: string;
      expectedFocusOrder?: string[];
      testEscape?: boolean;
      testEnterSpace?: boolean;
    } = {}
  ): Promise<{
    focusableElements: Element[];
    focusOrder: string[];
    keyboardAccessible: boolean;
    issues: string[];
  }> {
    const {
      focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      expectedFocusOrder = [],
      testEscape = true,
      testEnterSpace = true
    } = options;

    const issues: string[] = [];
    const focusableElements = Array.from(
      wrapper.element.querySelectorAll(focusableSelector)
    ).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });

    const focusOrder: string[] = [];

    // Test focus order
    for (const element of focusableElements) {
      (element as HTMLElement).focus();
      const focused = document.activeElement;
      if (focused === element) {
        focusOrder.push(element.tagName + (element.id ? `#${element.id}` : ''));
      } else {
        issues.push(`Element ${element.tagName} cannot receive focus`);
      }
    }

    // Test expected focus order if provided
    if (expectedFocusOrder.length > 0 && expectedFocusOrder.length !== focusOrder.length) {
      issues.push(`Focus order mismatch: expected ${expectedFocusOrder.length} elements, found ${focusOrder.length}`);
    }

    // Test keyboard interactions
    if (testEnterSpace) {
      const buttons = wrapper.element.querySelectorAll('button, [role="button"]');
      buttons.forEach((button, index) => {
        const hasKeyHandler = button.getAttribute('onkeydown') ||
                             button.getAttribute('onkeyup') ||
                             button.getAttribute('onkeypress');

        if (!hasKeyHandler) {
          // Note: In a real test, you'd simulate key events and check responses
          // This is a simplified check for demonstration
        }
      });
    }

    return {
      focusableElements,
      focusOrder,
      keyboardAccessible: issues.length === 0,
      issues
    };
  }

  /**
   * Test ARIA attributes and labels
   */
  testAriaLabeling(wrapper: VueWrapper): {
    missingLabels: Element[];
    invalidAria: Element[];
    issues: string[];
    passed: boolean;
  } {
    const issues: string[] = [];
    const missingLabels: Element[] = [];
    const invalidAria: Element[] = [];

    // Check for missing labels
    const formElements = wrapper.element.querySelectorAll('input, select, textarea');
    formElements.forEach(element => {
      const hasLabel = element.getAttribute('aria-label') ||
                      element.getAttribute('aria-labelledby') ||
                      wrapper.element.querySelector(`label[for="${element.id}"]`);

      if (!hasLabel && element.getAttribute('type') !== 'hidden') {
        missingLabels.push(element);
        issues.push(`Form element ${element.tagName} missing accessible label`);
      }
    });

    // Check for buttons without accessible names
    const buttons = wrapper.element.querySelectorAll('button, [role="button"]');
    buttons.forEach(button => {
      const hasName = button.textContent?.trim() ||
                     button.getAttribute('aria-label') ||
                     button.getAttribute('aria-labelledby') ||
                     button.querySelector('img')?.getAttribute('alt');

      if (!hasName) {
        missingLabels.push(button);
        issues.push(`Button element missing accessible name`);
      }
    });

    // Check for images without alt text
    const images = wrapper.element.querySelectorAll('img');
    images.forEach(img => {
      const hasAlt = img.getAttribute('alt') !== null;
      const isDecorative = img.getAttribute('role') === 'presentation' ||
                          img.getAttribute('alt') === '';

      if (!hasAlt && !isDecorative) {
        missingLabels.push(img);
        issues.push(`Image missing alt attribute`);
      }
    });

    // Check for invalid ARIA attributes (simplified check)
    const elementsWithAria = wrapper.element.querySelectorAll('[aria-*]');
    elementsWithAria.forEach(element => {
      const ariaAttributes = Array.from(element.attributes)
        .filter(attr => attr.name.startsWith('aria-'));

      ariaAttributes.forEach(attr => {
        // This is a simplified check - in a real implementation,
        // you'd validate against the ARIA specification
        if (attr.value === '' && attr.name !== 'aria-label') {
          invalidAria.push(element);
          issues.push(`Empty ARIA attribute: ${attr.name}`);
        }
      });
    });

    return {
      missingLabels,
      invalidAria,
      issues,
      passed: issues.length === 0
    };
  }

  /**
   * Test color contrast (requires actual color computation)
   */
  async testColorContrast(wrapper: VueWrapper): Promise<{
    passed: boolean;
    issues: string[];
    elements: { element: Element; ratio: number; required: number }[];
  }> {
    // Note: This is a simplified implementation
    // In a real scenario, you'd need to compute actual color contrast ratios
    const issues: string[] = [];
    const elements: { element: Element; ratio: number; required: number }[] = [];

    // Run axe color contrast check
    const results = await axe(wrapper.element, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });

    const colorContrastViolations = results.violations.filter(
      violation => violation.id === 'color-contrast'
    );

    colorContrastViolations.forEach(violation => {
      violation.nodes.forEach((node: any) => {
        issues.push(`Color contrast insufficient: ${node.target.join(', ')}`);
      });
    });

    return {
      passed: issues.length === 0,
      issues,
      elements
    };
  }

  /**
   * Test semantic HTML structure
   */
  testSemanticStructure(wrapper: VueWrapper): {
    passed: boolean;
    issues: string[];
    landmarks: Element[];
    headings: Element[];
  } {
    const issues: string[] = [];
    const landmarks = Array.from(wrapper.element.querySelectorAll(
      'main, nav, aside, section, article, header, footer, [role="main"], [role="navigation"], [role="complementary"], [role="banner"], [role="contentinfo"]'
    ));
    const headings = Array.from(wrapper.element.querySelectorAll('h1, h2, h3, h4, h5, h6'));

    // Check heading hierarchy
    if (headings.length > 0) {
      let previousLevel = 0;
      headings.forEach((heading, index) => {
        const level = parseInt(heading.tagName.charAt(1));
        if (index === 0 && level !== 1) {
          issues.push(`First heading should be h1, found ${heading.tagName}`);
        } else if (level > previousLevel + 1) {
          issues.push(`Heading hierarchy skipped: ${heading.tagName} after h${previousLevel}`);
        }
        previousLevel = level;
      });
    }

    // Check for landmark regions
    const hasMain = landmarks.some(el =>
      el.tagName.toLowerCase() === 'main' || el.getAttribute('role') === 'main'
    );

    if (!hasMain && wrapper.element.children.length > 0) {
      issues.push('Missing main landmark region');
    }

    // Check for skip links
    const skipLinks = wrapper.element.querySelectorAll('a[href^="#"]');
    const hasSkipLink = Array.from(skipLinks).some(link =>
      link.textContent?.toLowerCase().includes('skip') ||
      link.textContent?.toLowerCase().includes('jump')
    );

    if (landmarks.length > 2 && !hasSkipLink) {
      issues.push('Consider adding skip navigation links');
    }

    return {
      passed: issues.length === 0,
      issues,
      landmarks,
      headings
    };
  }

  /**
   * Generate accessibility test report
   */
  generateReport(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    violationsByImpact: Record<string, number>;
    violationsByRule: Record<string, number>;
    results: AccessibilityTestResult[];
  } {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    const violationsByImpact: Record<string, number> = {};
    const violationsByRule: Record<string, number> = {};

    this.results.forEach(result => {
      result.violations.forEach(violation => {
        // Count by impact
        violationsByImpact[violation.impact] = (violationsByImpact[violation.impact] || 0) + 1;

        // Count by rule
        violationsByRule[violation.id] = (violationsByRule[violation.id] || 0) + 1;
      });
    });

    return {
      totalTests,
      passedTests,
      failedTests,
      violationsByImpact,
      violationsByRule,
      results: this.results
    };
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.results = [];
  }
}

// Global accessibility tester instance
export const accessibilityTester = new AccessibilityTester();

// Helper functions for common accessibility tests

/**
 * Quick accessibility test for any Vue component
 */
export async function testAccessibility(
  wrapper: VueWrapper,
  componentName: string,
  profile: 'basic' | 'comprehensive' | 'strict' | 'forms' | 'navigation' = 'basic'
): Promise<void> {
  const result = await accessibilityTester.testComponent(wrapper, {
    componentName,
    testName: 'Basic accessibility test',
    profile
  });

  expect(result.violations).toHaveLength(0);
}

/**
 * Test component with keyboard navigation
 */
export async function testKeyboardAccessibility(
  wrapper: VueWrapper,
  componentName: string
): Promise<void> {
  const keyboardResult = await accessibilityTester.testKeyboardNavigation(wrapper);

  if (!keyboardResult.keyboardAccessible) {
    throw new Error(`Keyboard accessibility issues in ${componentName}: ${keyboardResult.issues.join(', ')}`);
  }

  expect(keyboardResult.focusableElements.length).toBeGreaterThan(0);
  expect(keyboardResult.keyboardAccessible).toBe(true);
}

/**
 * Test ARIA labels and attributes
 */
export function testAriaAccessibility(
  wrapper: VueWrapper,
  componentName: string
): void {
  const ariaResult = accessibilityTester.testAriaLabeling(wrapper);

  if (!ariaResult.passed) {
    throw new Error(`ARIA accessibility issues in ${componentName}: ${ariaResult.issues.join(', ')}`);
  }

  expect(ariaResult.passed).toBe(true);
}

/**
 * Comprehensive accessibility test combining all checks
 */
export async function testFullAccessibility(
  wrapper: VueWrapper,
  componentName: string,
  options: {
    profile?: 'basic' | 'comprehensive' | 'strict' | 'forms' | 'navigation';
    testKeyboard?: boolean;
    testAria?: boolean;
    testSemantics?: boolean;
    testColorContrast?: boolean;
  } = {}
): Promise<{
  axeResult: AccessibilityTestResult;
  keyboardResult?: any;
  ariaResult?: any;
  semanticsResult?: any;
  colorContrastResult?: any;
}> {
  const {
    profile = 'comprehensive',
    testKeyboard = true,
    testAria = true,
    testSemantics = true,
    testColorContrast = true
  } = options;

  // Run axe accessibility test
  const axeResult = await accessibilityTester.testComponent(wrapper, {
    componentName,
    testName: 'Full accessibility test',
    profile
  });

  const results: any = { axeResult };

  // Run additional tests if requested
  if (testKeyboard) {
    results.keyboardResult = await accessibilityTester.testKeyboardNavigation(wrapper);
  }

  if (testAria) {
    results.ariaResult = accessibilityTester.testAriaLabeling(wrapper);
  }

  if (testSemantics) {
    results.semanticsResult = accessibilityTester.testSemanticStructure(wrapper);
  }

  if (testColorContrast) {
    results.colorContrastResult = await accessibilityTester.testColorContrast(wrapper);
  }

  // Assert that all tests pass
  expect(axeResult.violations).toHaveLength(0);

  if (testKeyboard && results.keyboardResult) {
    expect(results.keyboardResult.keyboardAccessible).toBe(true);
  }

  if (testAria && results.ariaResult) {
    expect(results.ariaResult.passed).toBe(true);
  }

  if (testSemantics && results.semanticsResult) {
    expect(results.semanticsResult.passed).toBe(true);
  }

  if (testColorContrast && results.colorContrastResult) {
    expect(results.colorContrastResult.passed).toBe(true);
  }

  return results;
}

// Export accessibility test categories for use with test categorization
export const AccessibilityTestCategories = {
  BASIC: [TestCategory.UNIT, TestCategory.ACCESSIBILITY, TestCategory.FAST],
  COMPREHENSIVE: [TestCategory.INTEGRATION, TestCategory.ACCESSIBILITY, TestCategory.MEDIUM],
  STRICT: [TestCategory.INTEGRATION, TestCategory.ACCESSIBILITY, TestCategory.CRITICAL, TestCategory.SLOW],
  KEYBOARD: [TestCategory.UNIT, TestCategory.ACCESSIBILITY, TestCategory.USER_INTERACTION],
  ARIA: [TestCategory.UNIT, TestCategory.ACCESSIBILITY, TestCategory.SCREEN_READER],
  FORMS: [TestCategory.UNIT, TestCategory.ACCESSIBILITY, TestCategory.FORM_LABELS],
  NAVIGATION: [TestCategory.INTEGRATION, TestCategory.ACCESSIBILITY, TestCategory.LANDMARKS]
};

// Add accessibility category to existing test categories
declare module './categories' {
  enum TestCategory {
    ACCESSIBILITY = 'accessibility'
  }
}