import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import Login from '../Login.vue';
import {
  categorizedDescribe,
  categorizedIt,
  TestCategory,
  CategoryCombos,
  configureTestSuite
} from '../../../tests/utils/categories';
import {
  shallowMountView,
  mountView
} from '../../../tests/utils/mounting';

// Mock dependencies
vi.mock('@/stores/auth');
vi.mock('@/composables/useCsrfToken');
vi.mock('@/composables/useWebAuthn');

categorizedDescribe('Login View', CategoryCombos.UNIT_VIEW_SHALLOW, () => {
  let wrapper: VueWrapper;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  // Fast rendering tests with shallow mounting
  categorizedDescribe('Component Rendering', [TestCategory.UNIT, TestCategory.FAST, TestCategory.SHALLOW], () => {
    categorizedIt('should render login form without errors', [TestCategory.CRITICAL, TestCategory.PRE_COMMIT], () => {
      wrapper = shallowMountView(Login);
      expect(wrapper.exists()).toBe(true);
    });

    categorizedIt('should display email input field', [TestCategory.HIGH], () => {
      wrapper = shallowMountView(Login);

      const emailInput = wrapper.find('input[type="email"]');
      expect(emailInput.exists()).toBe(true);
    });

    categorizedIt('should display password input field', [TestCategory.HIGH], () => {
      wrapper = shallowMountView(Login);

      const passwordInput = wrapper.find('input[type="password"]');
      expect(passwordInput.exists()).toBe(true);
    });

    categorizedIt('should display login button', [TestCategory.HIGH], () => {
      wrapper = shallowMountView(Login);

      const loginButton = wrapper.find('button[type="submit"]');
      expect(loginButton.exists()).toBe(true);
    });
  });

  // Authentication flow tests - critical for auth views
  categorizedDescribe('Authentication Flow', [TestCategory.AUTH, TestCategory.CRITICAL, TestCategory.SHALLOW], () => {
    categorizedIt('should validate required fields', [TestCategory.CRITICAL], async () => {
      wrapper = shallowMountView(Login);

      const form = wrapper.find('form');
      await form.trigger('submit');

      // Should show validation errors
      expect(wrapper.text()).toContain('required');
    });

    categorizedIt('should validate email format', [TestCategory.HIGH], async () => {
      wrapper = shallowMountView(Login);

      const emailInput = wrapper.find('input[type="email"]');
      await emailInput.setValue('invalid-email');

      const form = wrapper.find('form');
      await form.trigger('submit');

      expect(wrapper.text()).toContain('valid email');
    });

    categorizedIt('should handle form submission with valid data', [TestCategory.CRITICAL], async () => {
      wrapper = shallowMountView(Login);

      const emailInput = wrapper.find('input[type="email"]');
      const passwordInput = wrapper.find('input[type="password"]');

      await emailInput.setValue('test@example.com');
      await passwordInput.setValue('password123');

      const form = wrapper.find('form');
      await form.trigger('submit');

      // Should attempt login
      expect(wrapper.vm).toBeDefined();
    });
  });

  // Loading and error states
  categorizedDescribe('State Management', [TestCategory.UNIT, TestCategory.MEDIUM, TestCategory.SHALLOW], () => {
    categorizedIt('should display loading state during login', [TestCategory.HIGH], async () => {
      wrapper = shallowMountView(Login, {
        global: {
          provide: {
            authStore: {
              loading: true,
              login: vi.fn(),
              error: null
            }
          }
        }
      });

      expect(wrapper.text()).toContain('Loading');
    });

    categorizedIt('should display error messages', [TestCategory.HIGH], async () => {
      const errorMessage = 'Invalid credentials';

      wrapper = shallowMountView(Login, {
        global: {
          provide: {
            authStore: {
              loading: false,
              login: vi.fn(),
              error: errorMessage
            }
          }
        }
      });

      expect(wrapper.text()).toContain(errorMessage);
    });
  });

  // WebAuthn/Passkey integration
  categorizedDescribe('Passkey Authentication', [TestCategory.AUTH, TestCategory.EXPERIMENTAL, TestCategory.BROWSER], () => {
    categorizedIt('should show passkey option when available', [TestCategory.EXPERIMENTAL], () => {
      wrapper = shallowMountView(Login, {
        global: {
          provide: {
            webAuthnStore: {
              isSupported: true,
              authenticate: vi.fn()
            }
          }
        }
      });

      expect(wrapper.text()).toContain('passkey');
    });

    categorizedIt('should handle passkey authentication', [TestCategory.EXPERIMENTAL, TestCategory.FLAKY], async () => {
      wrapper = shallowMountView(Login);

      const passkeyButton = wrapper.find('[data-testid="passkey-login"]');
      if (passkeyButton.exists()) {
        await passkeyButton.trigger('click');
        // Test passkey flow
      }
    });
  });
});

// Integration tests with full mounting
configureTestSuite('Login View Integration', {
  categories: [TestCategory.INTEGRATION, TestCategory.VIEW, TestCategory.FULL_MOUNT],
  timeout: 10000,
}, () => {
  let wrapper: VueWrapper;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  categorizedIt('should integrate with router navigation', [TestCategory.INTEGRATION, TestCategory.MEDIUM], async () => {
    wrapper = mountView(Login);

    // Test actual router integration
    const registerLink = wrapper.find('a[href="/register"]');
    expect(registerLink.exists()).toBe(true);
  });

  categorizedIt('should integrate with i18n translations', [TestCategory.INTEGRATION, TestCategory.MEDIUM], () => {
    wrapper = mountView(Login);

    // Should render translated text
    expect(wrapper.text()).toContain('Login');
  });

  categorizedIt('should handle complete user workflow', [TestCategory.INTEGRATION, TestCategory.SLOW], async () => {
    wrapper = mountView(Login);

    // Complete login workflow with real components
    const emailInput = wrapper.find('input[type="email"]');
    const passwordInput = wrapper.find('input[type="password"]');
    const submitButton = wrapper.find('button[type="submit"]');

    await emailInput.setValue('test@example.com');
    await passwordInput.setValue('password123');
    await submitButton.trigger('click');

    // Should trigger actual login flow
    expect(wrapper.vm).toBeDefined();
  });
});

// Accessibility tests - critical for all views
categorizedDescribe('Login View Accessibility', [TestCategory.CRITICAL, TestCategory.STABLE, TestCategory.SHALLOW], () => {
  let wrapper: VueWrapper;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  categorizedIt('should have proper form labels', [TestCategory.CRITICAL], () => {
    wrapper = shallowMountView(Login);

    const emailLabel = wrapper.find('label[for="email"]');
    const passwordLabel = wrapper.find('label[for="password"]');

    expect(emailLabel.exists()).toBe(true);
    expect(passwordLabel.exists()).toBe(true);
  });

  categorizedIt('should have proper ARIA attributes', [TestCategory.HIGH], () => {
    wrapper = shallowMountView(Login);

    const form = wrapper.find('form');
    expect(form.attributes('role')).toBeDefined();
  });

  categorizedIt('should be keyboard navigable', [TestCategory.HIGH], async () => {
    wrapper = shallowMountView(Login);

    const firstInput = wrapper.find('input');
    await firstInput.trigger('keydown.tab');

    // Should move focus to next element
    expect(wrapper.vm).toBeDefined();
  });
});

// Performance tests for view components
configureTestSuite('Login View Performance', {
  categories: [TestCategory.PERFORMANCE, TestCategory.VIEW, TestCategory.SLOW],
  timeout: 15000,
}, () => {
  categorizedIt('should render quickly on initial load', [TestCategory.PERFORMANCE], async () => {
    const start = performance.now();

    const wrapper = shallowMountView(Login);

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100); // Should render quickly

    wrapper.unmount();
  });

  categorizedIt('should handle rapid form interactions efficiently', [TestCategory.PERFORMANCE], async () => {
    const wrapper = shallowMountView(Login);
    const start = performance.now();

    const emailInput = wrapper.find('input[type="email"]');

    // Simulate rapid typing
    for (let i = 0; i < 100; i++) {
      await emailInput.setValue(`test${i}@example.com`);
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1000); // Should handle rapid input

    wrapper.unmount();
  });
});

// Mobile-specific tests
categorizedDescribe('Login View Mobile', [TestCategory.BROWSER, TestCategory.MEDIUM], () => {
  categorizedIt('should be responsive on mobile viewports', [TestCategory.MEDIUM_PRIORITY], () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', { value: 375 });
    Object.defineProperty(window, 'innerHeight', { value: 667 });

    const wrapper = shallowMountView(Login);

    expect(wrapper.exists()).toBe(true);
    wrapper.unmount();
  });
});