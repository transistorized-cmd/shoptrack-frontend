/**
 * i18n test utilities for proper locale switching support
 */
import { ref } from 'vue';
import { vi } from 'vitest';
import { createI18n } from 'vue-i18n';

/**
 * Create a reactive locale mock for useTranslation composable
 */
export function createTestLocale(initialLocale = 'en') {
  const locale = ref(initialLocale);
  const setLocale = vi.fn((newLocale: string) => {
    locale.value = newLocale;
  });

  return { locale, setLocale };
}

/**
 * Mock the useTranslation composable with proper locale switching
 */
export function mockUseTranslation(testLocale?: { locale: any; setLocale: any }) {
  const { locale, setLocale } = testLocale || createTestLocale();

  return vi.mock('@/composables/useTranslation', () => ({
    useTranslation: () => ({
      locale,
      setLocale,
      t: (key: string, params?: any) => {
        // Simple translation mock that returns key with locale prefix for testing
        if (params && typeof params === 'object') {
          // Handle interpolation
          return key.replace(/\{(\w+)\}/g, (match, paramKey) => params[paramKey] || match);
        }
        return key;
      },
    }),
  }));
}

/**
 * Mock the useDarkMode composable
 */
export function mockUseDarkMode(initialDarkMode = false) {
  const isDarkMode = ref(initialDarkMode);

  return vi.mock('@/composables/useDarkMode', () => ({
    useDarkMode: () => ({
      isDarkMode,
      toggleDarkMode: vi.fn(() => {
        isDarkMode.value = !isDarkMode.value;
      }),
    }),
  }));
}

/**
 * Mock the i18nUtils module
 */
export function mockI18nUtils() {
  return vi.mock('@/utils/i18nUtils', () => ({
    availableLocales: [
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'es', name: 'Español', flag: '🇪🇸' },
    ],
    getLocaleName: vi.fn((code: string) =>
      code === 'en' ? 'English' : code === 'es' ? 'Español' : code,
    ),
    getLocaleFlag: vi.fn((code: string) =>
      code === 'en' ? '🇺🇸' : code === 'es' ? '🇪🇸' : '🌐',
    ),
  }));
}

/**
 * Setup complete i18n mocking for locale switching tests
 */
export function setupI18nMocks(initialLocale = 'en', initialDarkMode = false) {
  const testLocale = createTestLocale(initialLocale);

  const translationMock = mockUseTranslation(testLocale);
  const darkModeMock = mockUseDarkMode(initialDarkMode);
  const i18nUtilsMock = mockI18nUtils();

  return {
    testLocale,
    mocks: {
      translationMock,
      darkModeMock,
      i18nUtilsMock,
    },
  };
}

/**
 * Create enhanced test i18n instance with locale switching capabilities
 */
export function createTestI18nInstance(locale = 'en', additionalMessages: Record<string, any> = {}) {
  const baseMessages = {
    en: {
      common: {
        loading: 'Loading...',
        error: 'Error',
        cancel: 'Cancel',
        save: 'Save',
        delete: 'Delete',
        edit: 'Edit',
        view: 'View',
        close: 'Close',
      },
      search: {
        placeholder: 'Search...',
        noResults: 'No results found',
        groups: {
          receipts: 'Receipts',
          items: 'Items',
          categories: 'Categories',
        },
        types: {
          receipt: 'Receipt',
          item: 'Item',
          category: 'Category',
        },
      },
      receipts: {
        title: 'Receipts',
        upload: 'Upload Receipt',
        processing: 'Processing...',
        failed: 'Processing Failed',
        completed: 'Processing Complete',
        noReceipts: 'No receipts found',
      },
      notifications: {
        title: 'Notifications',
        markAllRead: 'Mark all as read',
        noNotifications: 'No notifications',
      },
      ...additionalMessages.en || {},
    },
    es: {
      common: {
        loading: 'Cargando...',
        error: 'Error',
        cancel: 'Cancelar',
        save: 'Guardar',
        delete: 'Eliminar',
        edit: 'Editar',
        view: 'Ver',
        close: 'Cerrar',
      },
      search: {
        placeholder: 'Buscar...',
        noResults: 'No se encontraron resultados',
        groups: {
          receipts: 'Recibos',
          items: 'Artículos',
          categories: 'Categorías',
        },
        types: {
          receipt: 'Recibo',
          item: 'Artículo',
          category: 'Categoría',
        },
      },
      receipts: {
        title: 'Recibos',
        upload: 'Subir Recibo',
        processing: 'Procesando...',
        failed: 'Procesamiento Fallido',
        completed: 'Procesamiento Completo',
        noReceipts: 'No se encontraron recibos',
      },
      notifications: {
        title: 'Notificaciones',
        markAllRead: 'Marcar todo como leído',
        noNotifications: 'Sin notificaciones',
      },
      ...additionalMessages.es || {},
    },
  };

  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    messages: baseMessages,
  });
}

/**
 * Test locale switching functionality
 */
export async function testLocaleSwitch(
  testLocale: { locale: any; setLocale: any },
  wrapper: any,
  newLocale: string
) {
  // Change locale using the test locale mock
  testLocale.setLocale(newLocale);

  // Wait for Vue reactivity to update
  await wrapper.vm.$nextTick();

  // Verify the locale was changed
  expect(testLocale.locale.value).toBe(newLocale);
  expect(testLocale.setLocale).toHaveBeenCalledWith(newLocale);
}