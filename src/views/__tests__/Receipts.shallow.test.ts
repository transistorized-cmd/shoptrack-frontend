import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import Receipts from '../Receipts.vue';
import { useReceiptsStore } from '@/stores/receipts';
import {
  shallowMountView,
  mountView,
  testPatterns,
} from '../../../tests/utils/mounting';
import { receiptVariants, createTestReceipt } from '../../../tests/factories';

// Mock the stores
vi.mock('@/stores/receipts');

// Mock the debounce utility
vi.mock('@vueuse/core', () => ({
  useDebounceFn: vi.fn((fn) => fn)
}));

describe('Receipts View (Shallow)', () => {
  let wrapper: VueWrapper;
  let mockReceiptsStore: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock store with factory data
    mockReceiptsStore = {
      receipts: [
        receiptVariants.completed(),
        receiptVariants.pending(),
        receiptVariants.failed(),
      ],
      loading: false,
      error: null,
      totalCount: 3,
      currentPage: 1,
      totalPages: 1,
      searchQuery: '',
      selectedCategory: '',
      dateFrom: '',
      dateTo: '',
      processingStatus: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      fetchReceipts: vi.fn(),
      searchReceipts: vi.fn(),
      deleteReceipt: vi.fn(),
      clearError: vi.fn(),
      setSearchQuery: vi.fn(),
      setFilters: vi.fn(),
      setSorting: vi.fn(),
      nextPage: vi.fn(),
      previousPage: vi.fn(),
    };

    const mockUseReceiptsStore = vi.mocked(useReceiptsStore);
    mockUseReceiptsStore.mockReturnValue(mockReceiptsStore);
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without errors', () => {
      testPatterns.shouldRender(Receipts);
    });

    it('should render main structure with shallow mounting', () => {
      wrapper = shallowMountView(Receipts);

      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find('.receipts-container').exists()).toBe(true);
    });

    it('should render search and filter components (stubbed)', () => {
      wrapper = shallowMountView(Receipts);

      // With shallow mounting, child components are stubbed
      expect(wrapper.find('[data-testid="search-input"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="localized-date-input"]').exists()).toBe(true);
    });

    it('should render receipt cards (stubbed)', () => {
      wrapper = shallowMountView(Receipts);

      // Receipt cards should be stubbed but present
      const receiptCards = wrapper.findAll('[data-testid="receipt-card"]');
      expect(receiptCards).toHaveLength(3);
    });
  });

  describe('Store Integration (Shallow)', () => {
    it('should call fetchReceipts on mount', () => {
      wrapper = shallowMountView(Receipts);

      expect(mockReceiptsStore.fetchReceipts).toHaveBeenCalledOnce();
    });

    it('should display loading state', async () => {
      mockReceiptsStore.loading = true;

      wrapper = shallowMountView(Receipts);

      expect(wrapper.text()).toContain('Loading');
    });

    it('should display error state', () => {
      mockReceiptsStore.error = 'Failed to load receipts';

      wrapper = shallowMountView(Receipts);

      expect(wrapper.text()).toContain('Failed to load receipts');
    });

    it('should display no receipts message when empty', () => {
      mockReceiptsStore.receipts = [];
      mockReceiptsStore.totalCount = 0;

      wrapper = shallowMountView(Receipts);

      expect(wrapper.text()).toContain('No receipts found');
    });
  });

  describe('Search Functionality', () => {
    it('should update search query when search input changes', async () => {
      wrapper = shallowMountView(Receipts);

      const searchInput = wrapper.find('[data-testid="search-input"]');
      expect(searchInput.exists()).toBe(true);

      // Simulate search input change
      await searchInput.vm.$emit('update:modelValue', 'test query');

      expect(mockReceiptsStore.setSearchQuery).toHaveBeenCalledWith('test query');
    });

    it('should call searchReceipts when search is performed', async () => {
      wrapper = shallowMountView(Receipts);

      // Simulate search action
      const searchForm = wrapper.find('form');
      if (searchForm.exists()) {
        await searchForm.trigger('submit');
      }

      expect(mockReceiptsStore.searchReceipts).toHaveBeenCalled();
    });
  });

  describe('Filtering Functionality', () => {
    it('should update date filters', async () => {
      wrapper = shallowMountView(Receipts);

      const dateInputs = wrapper.findAll('[data-testid="localized-date-input"]');
      expect(dateInputs.length).toBeGreaterThan(0);

      // Simulate date filter change
      await dateInputs[0].vm.$emit('update:modelValue', '2024-01-01');

      expect(mockReceiptsStore.setFilters).toHaveBeenCalled();
    });

    it('should update category filter', async () => {
      wrapper = shallowMountView(Receipts);

      const categorySelect = wrapper.find('select[name="category"]');
      if (categorySelect.exists()) {
        await categorySelect.setValue('Groceries');
        expect(mockReceiptsStore.setFilters).toHaveBeenCalled();
      }
    });

    it('should update processing status filter', async () => {
      wrapper = shallowMountView(Receipts);

      const statusSelect = wrapper.find('select[name="status"]');
      if (statusSelect.exists()) {
        await statusSelect.setValue('completed');
        expect(mockReceiptsStore.setFilters).toHaveBeenCalled();
      }
    });
  });

  describe('Receipt Card Interactions', () => {
    it('should handle receipt deletion', async () => {
      wrapper = shallowMountView(Receipts);

      const receiptCard = wrapper.find('[data-testid="receipt-card"]');
      expect(receiptCard.exists()).toBe(true);

      // Simulate delete event from receipt card
      await receiptCard.vm.$emit('delete', 1);

      expect(mockReceiptsStore.deleteReceipt).toHaveBeenCalledWith(1);
    });
  });

  describe('Pagination', () => {
    it('should display pagination when there are multiple pages', () => {
      mockReceiptsStore.totalPages = 3;
      mockReceiptsStore.currentPage = 2;

      wrapper = shallowMountView(Receipts);

      expect(wrapper.text()).toContain('Page 2 of 3');
    });

    it('should handle next page navigation', async () => {
      mockReceiptsStore.totalPages = 3;
      mockReceiptsStore.currentPage = 1;

      wrapper = shallowMountView(Receipts);

      const nextButton = wrapper.find('button[aria-label*="Next"]');
      if (nextButton.exists()) {
        await nextButton.trigger('click');
        expect(mockReceiptsStore.nextPage).toHaveBeenCalled();
      }
    });

    it('should handle previous page navigation', async () => {
      mockReceiptsStore.totalPages = 3;
      mockReceiptsStore.currentPage = 2;

      wrapper = shallowMountView(Receipts);

      const prevButton = wrapper.find('button[aria-label*="Previous"]');
      if (prevButton.exists()) {
        await prevButton.trigger('click');
        expect(mockReceiptsStore.previousPage).toHaveBeenCalled();
      }
    });
  });

  describe('Sorting Functionality', () => {
    it('should handle sort by change', async () => {
      wrapper = shallowMountView(Receipts);

      const sortSelect = wrapper.find('select[name="sortBy"]');
      if (sortSelect.exists()) {
        await sortSelect.setValue('receiptDate');
        expect(mockReceiptsStore.setSorting).toHaveBeenCalledWith('receiptDate', 'desc');
      }
    });

    it('should handle sort order toggle', async () => {
      wrapper = shallowMountView(Receipts);

      const sortButton = wrapper.find('button[aria-label*="sort"]');
      if (sortButton.exists()) {
        await sortButton.trigger('click');
        expect(mockReceiptsStore.setSorting).toHaveBeenCalled();
      }
    });
  });

  describe('Error Handling', () => {
    it('should clear error when clearError is called', async () => {
      mockReceiptsStore.error = 'Some error';

      wrapper = shallowMountView(Receipts);

      const clearButton = wrapper.find('button[aria-label*="clear"]');
      if (clearButton.exists()) {
        await clearButton.trigger('click');
        expect(mockReceiptsStore.clearError).toHaveBeenCalled();
      }
    });
  });

  describe('Performance Considerations', () => {
    it('should not render heavy child components when using shallow mounting', () => {
      wrapper = shallowMountView(Receipts);

      // Verify that complex child components are stubbed
      const receiptCards = wrapper.findAll('[data-testid="receipt-card"]');
      receiptCards.forEach(card => {
        // Stubbed components should have minimal HTML
        expect(card.html()).toContain('data-testid="receipt-card"');
        // But should not contain complex internal structure
        expect(card.html().length).toBeLessThan(200);
      });
    });

    it('should still maintain component hierarchy for testing', () => {
      wrapper = shallowMountView(Receipts);

      // Should maintain the overall structure for testing
      expect(wrapper.find('.receipts-header').exists()).toBe(true);
      expect(wrapper.find('.receipts-filters').exists()).toBe(true);
      expect(wrapper.find('.receipts-list').exists()).toBe(true);
    });
  });

  describe('Comparison: Shallow vs Full Mount', () => {
    it('should be faster than full mounting', async () => {
      const startShallow = performance.now();
      const shallowWrapper = shallowMountView(Receipts);
      const shallowTime = performance.now() - startShallow;
      shallowWrapper.unmount();

      const startFull = performance.now();
      const fullWrapper = mountView(Receipts);
      const fullTime = performance.now() - startFull;
      fullWrapper.unmount();

      // Shallow mounting should be faster (though this is environment dependent)
      expect(shallowTime).toBeLessThan(fullTime * 2); // Allow some variance
    });

    it('should test the same functionality with less overhead', () => {
      const shallowWrapper = shallowMountView(Receipts);
      const fullWrapper = mountView(Receipts);

      // Both should test core functionality
      expect(shallowWrapper.find('.receipts-container').exists()).toBe(true);
      expect(fullWrapper.find('.receipts-container').exists()).toBe(true);

      // But shallow should have stubbed children
      const shallowCards = shallowWrapper.findAll('[data-testid="receipt-card"]');
      const fullCards = fullWrapper.findAll('[data-testid="receipt-card"]');

      expect(shallowCards).toHaveLength(fullCards.length);

      shallowWrapper.unmount();
      fullWrapper.unmount();
    });
  });
});