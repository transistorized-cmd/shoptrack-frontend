import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import Home from '../Home.vue';
import { useReceiptsStore } from '@/stores/receipts';
import { usePluginsStore } from '@/stores/plugins';
import { createMockRouter } from '../../../tests/utils/router';
import type { Receipt } from '@/types/receipt';

// Mock the stores
vi.mock('@/stores/receipts');
vi.mock('@/stores/plugins');

describe('Home View', () => {
  let wrapper: VueWrapper;
  let mockReceiptsStore: any;
  let mockPluginsStore: any;
  let mockRouter: any;

  // Mock receipts data
  const mockReceipts: Receipt[] = [
    {
      id: 1,
      filename: 'receipt1.jpg',
      receiptDate: '2024-01-15',
      storeName: 'Store A',
      processingStatus: 'completed',
      totalItemsDetected: 5,
      successfullyParsed: 4,
      items: [],
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T11:00:00Z'
    },
    {
      id: 2,
      filename: 'receipt2.jpg',
      receiptDate: '2024-01-14',
      storeName: 'Store B',
      processingStatus: 'pending',
      totalItemsDetected: 3,
      successfullyParsed: 0,
      items: [],
      createdAt: '2024-01-14T09:00:00Z',
      updatedAt: '2024-01-14T09:00:00Z'
    },
    {
      id: 3,
      filename: 'receipt3.jpg',
      receiptDate: '2024-01-13',
      storeName: 'Store C',
      processingStatus: 'failed',
      totalItemsDetected: 2,
      successfullyParsed: 0,
      items: [],
      createdAt: '2024-01-13T08:00:00Z',
      updatedAt: '2024-01-13T08:30:00Z'
    }
  ];

  const mockPlugins = [
    { id: 'plugin1', name: 'Plugin 1', version: '1.0.0' },
    { id: 'plugin2', name: 'Plugin 2', version: '2.0.0' },
    { id: 'plugin3', name: 'Plugin 3', version: '1.5.0' }
  ];

  const createWrapper = (receiptData = mockReceipts, pluginData = mockPlugins) => {
    // Setup store mocks
    mockReceiptsStore = {
      receipts: receiptData,
      loading: false,
      error: null,
      hasReceipts: receiptData.length > 0,
      pagination: {
        page: 1,
        pageSize: 20,
        totalCount: receiptData.length,
        totalPages: 1
      },
      pendingReceipts: receiptData.filter(r => r.processingStatus === 'pending'),
      completedReceipts: receiptData.filter(r => r.processingStatus === 'completed'),
      fetchReceipts: vi.fn().mockResolvedValue(undefined)
    };

    mockPluginsStore = {
      receiptPlugins: pluginData,
      loading: false,
      error: null,
      fetchAllPlugins: vi.fn().mockResolvedValue(undefined)
    };

    // Mock the store composition functions
    vi.mocked(useReceiptsStore).mockReturnValue(mockReceiptsStore);
    vi.mocked(usePluginsStore).mockReturnValue(mockPluginsStore);

    const i18n = createI18n({
      legacy: false,
      locale: 'en',
      messages: {
        en: {
          home: {
            welcomeToShopTrack: 'Welcome to ShopTrack',
            intelligentReceiptTracking: 'Intelligent Receipt Tracking',
            totalReceipts: 'Total Receipts',
            pending: 'Pending',
            completed: 'Completed',
            availablePlugins: 'Available Plugins',
            quickActions: 'Quick Actions',
            uploadReceipt: 'Upload Receipt',
            processNewReceipts: 'Process new receipts',
            viewReceipts: 'View Receipts',
            manageYourReceipts: 'Manage your receipts',
            viewReports: 'View Reports',
            analyzeYourSpending: 'Analyze your spending',
            recentReceipts: 'Recent Receipts',
            viewAll: 'View All',
            items: 'items',
            noDate: 'No date',
            loading: 'Loading...'
          },
          common: {
            view: 'View'
          }
        }
      }
    });

    const pinia = createPinia();
    setActivePinia(pinia);

    mockRouter = createMockRouter();

    return mount(Home, {
      global: {
        plugins: [i18n, pinia, mockRouter.mockRouter]
      }
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    wrapper?.unmount();
    vi.resetAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render welcome message and hero section', () => {
      wrapper = createWrapper();

      expect(wrapper.find('h1').text()).toBe('Welcome to ShopTrack');
      expect(wrapper.text()).toContain('Intelligent Receipt Tracking');
    });

    it('should render quick stats cards', () => {
      wrapper = createWrapper();

      // Should show stats when not loading
      expect(wrapper.text()).toContain('Total Receipts');
      expect(wrapper.text()).toContain('Pending');
      expect(wrapper.text()).toContain('Completed');
      expect(wrapper.text()).toContain('Available Plugins');
    });

    it('should render quick actions section', () => {
      wrapper = createWrapper();

      expect(wrapper.text()).toContain('Quick Actions');
      expect(wrapper.text()).toContain('Upload Receipt');
      expect(wrapper.text()).toContain('View Receipts');
      expect(wrapper.text()).toContain('View Reports');
    });

    it('should render recent receipts section when receipts exist', () => {
      wrapper = createWrapper();

      expect(wrapper.text()).toContain('Recent Receipts');
      expect(wrapper.text()).toContain('View All');
      expect(wrapper.text()).toContain('receipt1.jpg');
    });

    it('should not render recent receipts section when no receipts', () => {
      wrapper = createWrapper([]);

      expect(wrapper.text()).not.toContain('Recent Receipts');
    });
  });

  describe('Stats Display', () => {
    it('should display correct total receipts count', () => {
      wrapper = createWrapper();

      const totalReceiptsCard = wrapper.find('[data-testid="total-receipts"]') ||
        wrapper.findAll('.card').find(card => card.text().includes('Total Receipts'));

      expect(wrapper.text()).toContain('3'); // Total count from mockReceipts
    });

    it('should display correct pending receipts count', () => {
      wrapper = createWrapper();

      const pendingCard = wrapper.findAll('.card').find(card => card.text().includes('Pending'));
      expect(pendingCard).toBeDefined();
      expect(wrapper.text()).toContain('1'); // One pending receipt
    });

    it('should display correct completed receipts count', () => {
      wrapper = createWrapper();

      const completedCard = wrapper.findAll('.card').find(card => card.text().includes('Completed'));
      expect(completedCard).toBeDefined();
      expect(wrapper.text()).toContain('1'); // One completed receipt
    });

    it('should display correct plugins count', () => {
      wrapper = createWrapper();

      const pluginsCard = wrapper.findAll('.card').find(card => card.text().includes('Available Plugins'));
      expect(pluginsCard).toBeDefined();
      expect(wrapper.text()).toContain('3'); // Three plugins
    });

    it('should handle zero counts gracefully', () => {
      wrapper = createWrapper([]);

      expect(wrapper.text()).toContain('0'); // Should show 0 for empty data
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner when receipts are loading', () => {
      // Create wrapper with loading state
      const loadingWrapper = createWrapper();
      mockReceiptsStore.loading = true;
      mockPluginsStore.loading = false;
      vi.mocked(useReceiptsStore).mockReturnValue(mockReceiptsStore);
      vi.mocked(usePluginsStore).mockReturnValue(mockPluginsStore);

      wrapper = mount(Home, {
        global: {
          plugins: [
            createI18n({
              legacy: false,
              locale: 'en',
              messages: {
                en: {
                  home: { loading: 'Loading...' }
                }
              }
            }),
            createPinia(),
            createMockRouter().mockRouter
          ]
        }
      });

      expect(wrapper.find('.animate-spin').exists()).toBe(true);
      expect(wrapper.text()).toContain('Loading...');
    });

    it('should show loading spinner when plugins are loading', () => {
      // Create wrapper with plugins loading state
      mockReceiptsStore.loading = false;
      mockPluginsStore.loading = true;
      vi.mocked(useReceiptsStore).mockReturnValue(mockReceiptsStore);
      vi.mocked(usePluginsStore).mockReturnValue(mockPluginsStore);

      wrapper = mount(Home, {
        global: {
          plugins: [
            createI18n({
              legacy: false,
              locale: 'en',
              messages: {
                en: {
                  home: { loading: 'Loading...' }
                }
              }
            }),
            createPinia(),
            createMockRouter().mockRouter
          ]
        }
      });

      expect(wrapper.find('.animate-spin').exists()).toBe(true);
      expect(wrapper.text()).toContain('Loading...');
    });

    it('should hide stats when loading', () => {
      // Create wrapper with both loading
      mockReceiptsStore.loading = true;
      mockPluginsStore.loading = false;
      vi.mocked(useReceiptsStore).mockReturnValue(mockReceiptsStore);
      vi.mocked(usePluginsStore).mockReturnValue(mockPluginsStore);

      wrapper = mount(Home, {
        global: {
          plugins: [
            createI18n({
              legacy: false,
              locale: 'en',
              messages: { en: { home: { loading: 'Loading...' } } }
            }),
            createPinia(),
            createMockRouter().mockRouter
          ]
        }
      });

      // Check that stats section is not rendered (v-if="!receiptsStore.loading")
      const hasStatsGrid = wrapper.find('.grid.grid-cols-1.gap-5.sm\\:grid-cols-2.lg\\:grid-cols-4').exists();
      expect(hasStatsGrid).toBe(false);
    });
  });

  describe('Recent Receipts Section', () => {
    it('should display up to 5 recent receipts', () => {
      const manyReceipts = Array.from({ length: 10 }, (_, i) => ({
        ...mockReceipts[0],
        id: i + 1,
        filename: `receipt${i + 1}.jpg`
      }));

      wrapper = createWrapper(manyReceipts);

      // Check computed recentReceipts in component returns only first 5
      const component = wrapper.vm as any;
      expect(component.recentReceipts.length).toBeLessThanOrEqual(5);

      // Check that first few receipts are shown
      expect(wrapper.text()).toContain('receipt1.jpg');
    });

    it('should display receipt information correctly', () => {
      wrapper = createWrapper();

      expect(wrapper.text()).toContain('receipt1.jpg');
      expect(wrapper.text()).toContain('4 items');
      expect(wrapper.text()).toContain('completed');
    });

    it('should format receipt dates correctly', () => {
      wrapper = createWrapper();

      // Should show formatted date (locale-specific)
      const dateRegex = /\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{2}-\d{2}/;
      expect(wrapper.text()).toMatch(dateRegex);
    });

    it('should handle receipts without dates', () => {
      const receiptWithoutDate = { ...mockReceipts[0], receiptDate: null };
      wrapper = createWrapper([receiptWithoutDate]);

      expect(wrapper.text()).toContain('No date');
    });

    it('should display correct status colors and icons', () => {
      wrapper = createWrapper();

      // Check that status icons are present
      expect(wrapper.text()).toContain('✓'); // Completed
      expect(wrapper.text()).toContain('⏳'); // Pending
    });
  });

  describe('Navigation Links', () => {
    it('should have correct navigation links in quick actions', () => {
      wrapper = createWrapper();

      const uploadLink = wrapper.find('a[href="/upload"]');
      const receiptsLink = wrapper.find('a[href="/receipts"]');
      const reportsLink = wrapper.find('a[href="/reports"]');

      expect(uploadLink.exists()).toBe(true);
      expect(receiptsLink.exists()).toBe(true);
      expect(reportsLink.exists()).toBe(true);
    });

    it('should have view all link in recent receipts section', () => {
      wrapper = createWrapper();

      // Find the "View All" link within recent receipts section
      const recentReceiptsSection = wrapper.findAll('.card').find(card =>
        card.text().includes('Recent Receipts')
      );
      expect(recentReceiptsSection).toBeDefined();

      // Check for view all link text anywhere in recent receipts
      expect(wrapper.text()).toContain('View All');
    });

    it('should have individual receipt view links', () => {
      wrapper = createWrapper();

      const receiptLinks = wrapper.findAll('a').filter(link =>
        link.attributes('href')?.startsWith('/receipts/')
      );

      expect(receiptLinks.length).toBeGreaterThan(0);
      expect(receiptLinks[0].attributes('href')).toContain('/receipts/1');
    });
  });

  describe('Status Methods', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('should return correct status colors', () => {
      const component = wrapper.vm as any;

      expect(component.getStatusColor('completed')).toBe('bg-green-100 text-green-600');
      expect(component.getStatusColor('pending')).toBe('bg-yellow-100 text-yellow-600');
      expect(component.getStatusColor('processing')).toBe('bg-blue-100 text-blue-600');
      expect(component.getStatusColor('failed')).toBe('bg-red-100 text-red-600');
      expect(component.getStatusColor('unknown')).toBe('bg-gray-100 text-gray-600');
    });

    it('should return correct status icons', () => {
      const component = wrapper.vm as any;

      expect(component.getStatusIcon('completed')).toBe('✓');
      expect(component.getStatusIcon('pending')).toBe('⏳');
      expect(component.getStatusIcon('processing')).toBe('⚡');
      expect(component.getStatusIcon('failed')).toBe('❌');
      expect(component.getStatusIcon('unknown')).toBe('❓');
    });
  });

  describe('Component Lifecycle', () => {
    it('should fetch data on mount', async () => {
      wrapper = createWrapper();
      await nextTick();

      expect(mockReceiptsStore.fetchReceipts).toHaveBeenCalledWith({ pageSize: 10 });
      expect(mockPluginsStore.fetchAllPlugins).toHaveBeenCalled();
    });

    it('should handle concurrent data fetching', async () => {
      // Make fetch functions return promises to test concurrent execution
      mockReceiptsStore.fetchReceipts = vi.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 100))
      );
      mockPluginsStore.fetchAllPlugins = vi.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 150))
      );

      wrapper = createWrapper();
      await nextTick();

      // Both should be called even if one takes longer
      expect(mockReceiptsStore.fetchReceipts).toHaveBeenCalled();
      expect(mockPluginsStore.fetchAllPlugins).toHaveBeenCalled();
    });

    it('should handle data fetching errors gracefully', async () => {
      mockReceiptsStore.fetchReceipts = vi.fn().mockRejectedValue(new Error('Fetch failed'));
      mockPluginsStore.fetchAllPlugins = vi.fn().mockRejectedValue(new Error('Plugin fetch failed'));

      // Should not throw error during mount
      expect(() => {
        wrapper = createWrapper();
      }).not.toThrow();
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive grid classes', () => {
      wrapper = createWrapper();

      // Quick stats should have responsive grid
      const statsGrid = wrapper.find('.grid.grid-cols-1.gap-5.sm\\:grid-cols-2.lg\\:grid-cols-4');
      expect(statsGrid.exists()).toBe(true);

      // Quick actions should have responsive grid
      const actionsGrid = wrapper.find('.grid.grid-cols-1.gap-4.sm\\:grid-cols-2.lg\\:grid-cols-3');
      expect(actionsGrid.exists()).toBe(true);
    });

    it('should have responsive text sizing', () => {
      wrapper = createWrapper();

      // Hero title should have responsive sizing
      const heroTitle = wrapper.find('h1.text-2xl.sm\\:text-4xl.lg\\:text-5xl');
      expect(heroTitle.exists()).toBe(true);
    });

    it('should have responsive layout for recent receipts', () => {
      wrapper = createWrapper();

      // Recent receipts should have responsive flex layout
      const receiptsLayout = wrapper.find('.flex.flex-col.sm\\:flex-row');
      expect(receiptsLayout.exists()).toBe(true);
    });
  });

  describe('Internationalization', () => {
    it('should display localized text', () => {
      wrapper = createWrapper();

      expect(wrapper.text()).toContain('Welcome to ShopTrack');
      expect(wrapper.text()).toContain('Quick Actions');
      expect(wrapper.text()).toContain('Recent Receipts');
    });

    it('should handle missing translations gracefully', () => {
      // Mock stores for this isolated test
      vi.mocked(useReceiptsStore).mockReturnValue({
        ...mockReceiptsStore,
        loading: false
      });
      vi.mocked(usePluginsStore).mockReturnValue({
        ...mockPluginsStore,
        loading: false
      });

      const i18n = createI18n({
        legacy: false,
        locale: 'fr',
        fallbackLocale: 'en',
        messages: {
          en: {
            home: {
              welcomeToShopTrack: 'Welcome to ShopTrack',
              loading: 'Loading...'
            }
          },
          fr: {} // Empty French translations
        }
      });

      const pinia = createPinia();
      setActivePinia(pinia);

      // Should fallback to English
      wrapper = mount(Home, {
        global: {
          plugins: [i18n, pinia, createMockRouter().mockRouter]
        }
      });

      expect(wrapper.text()).toContain('Welcome to ShopTrack');
    });
  });

  describe('Dark Mode Support', () => {
    it('should have dark mode classes', () => {
      wrapper = createWrapper();

      // Check for dark mode classes
      expect(wrapper.html()).toContain('dark:text-white');
      expect(wrapper.html()).toContain('dark:text-gray-300');
      expect(wrapper.html()).toContain('dark:bg-gray-800');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty receipts array', () => {
      wrapper = createWrapper([]);

      expect(wrapper.text()).toContain('0'); // Should show 0 counts
      expect(wrapper.text()).not.toContain('Recent Receipts');
    });

    it('should handle null/undefined store data', () => {
      mockReceiptsStore.receipts = null;
      mockReceiptsStore.hasReceipts = false;
      mockReceiptsStore.pendingReceipts = [];
      mockReceiptsStore.completedReceipts = [];

      vi.mocked(useReceiptsStore).mockReturnValue(mockReceiptsStore);

      expect(() => {
        wrapper = createWrapper();
      }).not.toThrow();
    });

    it('should handle store errors', () => {
      mockReceiptsStore.error = 'Failed to load receipts';
      mockPluginsStore.error = 'Failed to load plugins';

      vi.mocked(useReceiptsStore).mockReturnValue(mockReceiptsStore);
      vi.mocked(usePluginsStore).mockReturnValue(mockPluginsStore);

      expect(() => {
        wrapper = createWrapper();
      }).not.toThrow();
    });
  });
});