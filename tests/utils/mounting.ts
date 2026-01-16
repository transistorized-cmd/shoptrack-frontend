/**
 * Vue Test Utils mounting helpers
 * Provides utilities for both shallow and full mounting with common configurations
 */
import {
  mount,
  shallowMount,
  VueWrapper,
  MountingOptions,
} from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import { createPinia, setActivePinia } from "pinia";
import { Component, defineComponent, ref } from "vue";
import { vi } from "vitest";
import { createMockRouter } from "./router";
import {
  createAuthStoreMock,
  createAuthenticatedAuthStoreMock,
  createUnauthenticatedAuthStoreMock,
} from "./authStore";
import type { User } from "@/types/auth";

/**
 * Default mounting options for consistent test setup
 */
export interface TestMountingOptions<T = any> extends MountingOptions<T> {
  /**
   * Whether to provide i18n plugin
   * @default true
   */
  withI18n?: boolean;

  /**
   * Whether to provide Pinia store
   * @default true
   */
  withPinia?: boolean;

  /**
   * Whether to provide Vue Router
   * @default true
   */
  withRouter?: boolean;

  /**
   * i18n locale to use
   * @default 'en'
   */
  locale?: string;

  /**
   * Additional i18n messages for testing
   */
  i18nMessages?: Record<string, any>;

  /**
   * Custom stubs for child components
   */
  componentStubs?: Record<string, Component | string | boolean>;

  /**
   * Auth store configuration
   */
  authStore?: {
    /**
     * Whether user should be authenticated
     * @default false
     */
    authenticated?: boolean;
    /**
     * Custom user data (implies authenticated: true)
     */
    user?: Partial<User>;
    /**
     * Custom auth store mock
     */
    customMock?: ReturnType<typeof createAuthStoreMock>;
  };
}

/**
 * Create reactive test locale for mocking useTranslation
 */
export function createTestLocale(initialLocale = "en") {
  const locale = ref(initialLocale);
  const setLocale = vi.fn((newLocale: string) => {
    locale.value = newLocale;
  });

  return { locale, setLocale };
}

/**
 * Create test i18n instance with common translations
 */
export function createTestI18n(
  locale = "en",
  additionalMessages: Record<string, any> = {},
) {
  const baseMessages = {
    en: {
      common: {
        loading: "Loading...",
        error: "Error",
        cancel: "Cancel",
        save: "Save",
        delete: "Delete",
        edit: "Edit",
        view: "View",
        close: "Close",
      },
      search: {
        placeholder: "Search...",
        noResults: "No results found",
        groups: {
          receipts: "Receipts",
          items: "Items",
          categories: "Categories",
        },
        types: {
          receipt: "Receipt",
          item: "Item",
          category: "Category",
        },
      },
      receipts: {
        title: "Receipts",
        upload: "Upload Receipt",
        processing: "Processing...",
        failed: "Processing Failed",
        completed: "Processing Complete",
        noReceipts: "No receipts found",
      },
      notifications: {
        title: "Notifications",
        markAllRead: "Mark all as read",
        noNotifications: "No notifications",
      },
      ...(additionalMessages[locale] || {}),
    },
    es: {
      common: {
        loading: "Cargando...",
        error: "Error",
        cancel: "Cancelar",
        save: "Guardar",
        delete: "Eliminar",
        edit: "Editar",
        view: "Ver",
        close: "Cerrar",
      },
      search: {
        placeholder: "Buscar...",
        noResults: "No se encontraron resultados",
        groups: {
          receipts: "Recibos",
          items: "Artículos",
          categories: "Categorías",
        },
        types: {
          receipt: "Recibo",
          item: "Artículo",
          category: "Categoría",
        },
      },
      receipts: {
        title: "Recibos",
        upload: "Subir Recibo",
        processing: "Procesando...",
        failed: "Procesamiento Fallido",
        completed: "Procesamiento Completo",
        noReceipts: "No se encontraron recibos",
      },
      notifications: {
        title: "Notificaciones",
        markAllRead: "Marcar todo como leído",
        noNotifications: "Sin notificaciones",
      },
      ...(additionalMessages["es"] || {}),
    },
  };

  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: "en",
    messages: baseMessages,
  });
}

/**
 * Common component stubs for shallow mounting
 */
export const commonStubs = {
  // Router components
  RouterLink: {
    name: "RouterLink",
    template: "<a><slot /></a>",
    props: ["to"],
  },
  RouterView: {
    name: "RouterView",
    template: '<div data-testid="router-view"><slot /></div>',
  },

  // Icon components
  ChevronDownIcon: {
    name: "ChevronDownIcon",
    template: '<svg data-testid="chevron-down-icon" />',
  },
  ChevronUpIcon: {
    name: "ChevronUpIcon",
    template: '<svg data-testid="chevron-up-icon" />',
  },
  BellIcon: {
    name: "BellIcon",
    template: '<svg data-testid="bell-icon" />',
  },
  SunIcon: {
    name: "SunIcon",
    template: '<svg data-testid="sun-icon" />',
  },
  MoonIcon: {
    name: "MoonIcon",
    template: '<svg data-testid="moon-icon" />',
  },
  ComputerDesktopIcon: {
    name: "ComputerDesktopIcon",
    template: '<svg data-testid="computer-desktop-icon" />',
  },
  MagnifyingGlassIcon: {
    name: "MagnifyingGlassIcon",
    template: '<svg data-testid="magnifying-glass-icon" />',
  },
  XMarkIcon: {
    name: "XMarkIcon",
    template: '<svg data-testid="x-mark-icon" />',
  },

  // Chart components
  Line: {
    name: "Line",
    template: '<div data-testid="line-chart" />',
    props: ["data", "options"],
  },

  // Complex components often stubbed
  SearchInput: {
    name: "SearchInput",
    template: '<input data-testid="search-input" />',
    props: ["modelValue"],
    emits: ["update:modelValue"],
  },
  SearchResultsDropdown: {
    name: "SearchResultsDropdown",
    template: '<div data-testid="search-results-dropdown" />',
    props: ["results", "visible"],
  },
  NotificationMenu: {
    name: "NotificationMenu",
    template: '<div data-testid="notification-menu" />',
    props: ["visible"],
  },
  ThemeToggle: {
    name: "ThemeToggle",
    template: '<button data-testid="theme-toggle" />',
    props: ["simple"],
  },
  LanguageSwitcher: {
    name: "LanguageSwitcher",
    template: '<select data-testid="language-switcher" />',
  },
  QuickUpload: {
    name: "QuickUpload",
    template: '<div data-testid="quick-upload" />',
  },
  ReceiptCard: {
    name: "ReceiptCard",
    template: '<div data-testid="receipt-card" />',
    props: ["receipt"],
    emits: ["delete", "edit"],
  },
  ReceiptDetailModal: {
    name: "ReceiptDetailModal",
    template: '<div data-testid="receipt-detail-modal" />',
    props: ["visible", "receipt"],
    emits: ["close"],
  },
  LocalizedDateInput: {
    name: "LocalizedDateInput",
    template: '<input data-testid="localized-date-input" />',
    props: ["modelValue", "id"],
    emits: ["update:modelValue", "change"],
  },
  NotificationContainer: {
    name: "NotificationContainer",
    template: '<div data-testid="notification-container" />',
  },
  ErrorBoundary: {
    name: "ErrorBoundary",
    template: '<div data-testid="error-boundary"><slot /></div>',
  },
  EnhancedErrorBoundary: {
    name: "EnhancedErrorBoundary",
    template: '<div data-testid="enhanced-error-boundary"><slot /></div>',
  },
} as const;

/**
 * Get default mounting options with common plugins
 */
function getDefaultMountingOptions<T>(
  options: TestMountingOptions<T> = {},
): MountingOptions<T> {
  const {
    withI18n = true,
    withPinia = true,
    withRouter = true,
    locale = "en",
    i18nMessages = {},
    componentStubs = {},
    authStore,
    ...vueMountingOptions
  } = options;

  const plugins: any[] = [];
  let pinia: ReturnType<typeof createPinia> | undefined;

  if (withPinia) {
    pinia = createPinia();
    setActivePinia(pinia);
    plugins.push(pinia);

    // Setup auth store if configured
    if (authStore) {
      let authStoreMock: ReturnType<typeof createAuthStoreMock>;

      if (authStore.customMock) {
        authStoreMock = authStore.customMock;
      } else if (authStore.user || authStore.authenticated) {
        authStoreMock = createAuthenticatedAuthStoreMock(authStore.user || {});
      } else {
        authStoreMock = createUnauthenticatedAuthStoreMock();
      }

      // The auth store mock is now set up through the global mock in setup.ts
      // Individual tests can override this by importing and setting their own mock
    }
  }

  if (withI18n) {
    plugins.push(createTestI18n(locale, i18nMessages));
  }

  if (withRouter) {
    const { mockRouter } = createMockRouter();
    plugins.push(mockRouter);
  }

  return {
    global: {
      plugins,
      stubs: {
        ...commonStubs,
        ...componentStubs,
        ...vueMountingOptions.global?.stubs,
      },
      ...vueMountingOptions.global,
    },
    ...vueMountingOptions,
  };
}

/**
 * Mount component with full rendering and common setup
 * Use for integration tests and when you need full component behavior
 */
export function mountComponent<T extends Component>(
  component: T,
  options: TestMountingOptions<T> = {},
): VueWrapper {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mount(component as any, getDefaultMountingOptions(options) as any);
}

/**
 * Shallow mount component with minimal child rendering
 * Use for unit tests focusing on the component's own logic
 */
export function shallowMountComponent<T extends Component>(
  component: T,
  options: TestMountingOptions<T> = {},
): VueWrapper {
  const mountingOptions = getDefaultMountingOptions({
    // Automatically stub all child components for shallow mounting
    componentStubs: {
      ...commonStubs,
      ...options.componentStubs,
    },
    ...options,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return shallowMount(component as any, mountingOptions as any);
}

/**
 * Mount component for testing props and events (shallow by default)
 */
export function mountForProps<T extends Component>(
  component: T,
  props: Record<string, unknown> = {},
  options: TestMountingOptions<T> = {},
): VueWrapper {
  return shallowMountComponent(component, {
    props: props as TestMountingOptions<T>["props"],
    ...options,
  });
}

/**
 * Mount component for testing slots
 */
export function mountWithSlots<T extends Component>(
  component: T,
  slots: Record<string, string | Component> = {},
  options: TestMountingOptions<T> = {},
): VueWrapper {
  return shallowMountComponent(component, {
    slots,
    ...options,
  });
}

/**
 * Mount component for testing events
 */
export function mountForEvents<T extends Component>(
  component: T,
  options: TestMountingOptions<T> = {},
): VueWrapper {
  return shallowMountComponent(component, options);
}

/**
 * Mount view component (typically needs full mounting for navigation testing)
 */
export function mountView<T extends Component>(
  component: T,
  options: TestMountingOptions<T> = {},
): VueWrapper {
  return mountComponent(component, {
    withRouter: true,
    withPinia: true,
    withI18n: true,
    ...options,
  });
}

/**
 * Mount view component with shallow child components
 * Use when testing view logic without needing complex child behavior
 */
export function shallowMountView<T extends Component>(
  component: T,
  options: TestMountingOptions<T> = {},
): VueWrapper {
  return shallowMountComponent(component, {
    withRouter: true,
    withPinia: true,
    withI18n: true,
    ...options,
  });
}

/**
 * Mount component with authenticated user
 */
export function mountWithAuthenticatedUser<T extends Component>(
  component: T,
  userOverrides: Partial<User> = {},
  options: TestMountingOptions<T> = {},
): VueWrapper {
  return mountComponent(component, {
    authStore: {
      authenticated: true,
      user: userOverrides,
    },
    ...options,
  });
}

/**
 * Mount component with unauthenticated state
 */
export function mountWithUnauthenticatedUser<T extends Component>(
  component: T,
  options: TestMountingOptions<T> = {},
): VueWrapper {
  return mountComponent(component, {
    authStore: {
      authenticated: false,
    },
    ...options,
  });
}

/**
 * Mount view with authenticated user (commonly needed pattern)
 */
export function mountViewWithAuth<T extends Component>(
  component: T,
  userOverrides: Partial<User> = {},
  options: TestMountingOptions<T> = {},
): VueWrapper {
  return mountWithAuthenticatedUser(component, userOverrides, {
    withRouter: true,
    withPinia: true,
    withI18n: true,
    ...options,
  });
}

/**
 * Helper to create a minimal test component for testing composables
 */
export function createTestComponent(setup: () => any) {
  return defineComponent({
    setup,
    template:
      '<div data-testid="test-component">{{ JSON.stringify($data) }}</div>',
  });
}

/**
 * Mount test component specifically for composable testing
 */
export function mountComposable<T>(
  composableSetup: () => T,
  options: TestMountingOptions = {},
): { wrapper: VueWrapper; result: T } {
  let result: T;

  const TestComponent = createTestComponent(() => {
    result = composableSetup();
    return result;
  });

  const wrapper = shallowMountComponent(TestComponent, options);

  return { wrapper, result: result! };
}

/**
 * Common test patterns
 */
export const testPatterns = {
  /**
   * Test that a component renders without errors
   */
  shouldRender: (component: Component, options: TestMountingOptions = {}) => {
    const wrapper = shallowMountComponent(component, options);
    expect(wrapper.exists()).toBe(true);
    return wrapper;
  },

  /**
   * Test that a component accepts props correctly
   */
  shouldAcceptProps: (
    component: Component,
    props: Record<string, any>,
    expectedContent?: string | RegExp,
  ) => {
    const wrapper = mountForProps(component, props);
    expect(wrapper.exists()).toBe(true);
    if (expectedContent) {
      if (typeof expectedContent === "string") {
        expect(wrapper.text()).toContain(expectedContent);
      } else {
        expect(wrapper.text()).toMatch(expectedContent);
      }
    }
    return wrapper;
  },

  /**
   * Test that a component emits events correctly
   */
  shouldEmitEvent: async (
    component: Component,
    triggerAction: (wrapper: VueWrapper) => void | Promise<void>,
    expectedEvent: string,
    expectedPayload?: any,
  ) => {
    const wrapper = mountForEvents(component);
    await triggerAction(wrapper);

    const emitted = wrapper.emitted();
    expect(emitted[expectedEvent]).toBeTruthy();

    if (expectedPayload !== undefined) {
      expect(emitted[expectedEvent]?.[0]).toEqual([expectedPayload]);
    }

    return wrapper;
  },

  /**
   * Test component with various slot configurations
   */
  shouldRenderSlots: (
    component: Component,
    slots: Record<string, string | Component>,
    expectedContent: string | RegExp,
  ) => {
    const wrapper = mountWithSlots(component, slots);

    if (typeof expectedContent === "string") {
      expect(wrapper.text()).toContain(expectedContent);
    } else {
      expect(wrapper.text()).toMatch(expectedContent);
    }

    return wrapper;
  },
} as const;
