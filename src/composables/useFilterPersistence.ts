import { ref, watch, onMounted } from "vue";

const STORAGE_PREFIX = "shoptrack-filters-";

export interface ReceiptFilters {
  startDate: string;
  endDate: string;
  search: string;
}

export interface ReportDateRange {
  startDate: string;
  endDate: string;
}

export type ReportFilters = Record<string, ReportDateRange>;

/**
 * Composable for persisting receipt filters to localStorage
 */
export function useReceiptFilterPersistence() {
  const STORAGE_KEY = `${STORAGE_PREFIX}receipts`;

  const filters = ref<ReceiptFilters>({
    startDate: "",
    endDate: "",
    search: "",
  });

  const hasActiveFilters = ref(false);

  // Load filters from localStorage on mount
  const loadFilters = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ReceiptFilters>;
        filters.value = {
          startDate: parsed.startDate || "",
          endDate: parsed.endDate || "",
          search: parsed.search || "",
        };
      }
    } catch (error) {
      console.warn("Failed to load receipt filters from localStorage:", error);
    }
    updateHasActiveFilters();
  };

  // Save filters to localStorage
  const saveFilters = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters.value));
    } catch (error) {
      console.warn("Failed to save receipt filters to localStorage:", error);
    }
    updateHasActiveFilters();
  };

  const updateHasActiveFilters = () => {
    hasActiveFilters.value =
      filters.value.startDate !== "" ||
      filters.value.endDate !== "" ||
      filters.value.search !== "";
  };

  // Clear a specific filter
  const clearFilter = (key: keyof ReceiptFilters) => {
    filters.value[key] = "";
    saveFilters();
  };

  // Clear all filters
  const clearAllFilters = () => {
    filters.value = {
      startDate: "",
      endDate: "",
      search: "",
    };
    saveFilters();
  };

  // Watch for filter changes and persist
  watch(
    filters,
    () => {
      saveFilters();
    },
    { deep: true }
  );

  // Load on creation
  loadFilters();

  return {
    filters,
    hasActiveFilters,
    clearFilter,
    clearAllFilters,
    loadFilters,
    saveFilters,
  };
}

/**
 * Composable for persisting report date ranges to localStorage (per plugin)
 */
export function useReportFilterPersistence() {
  const STORAGE_KEY = `${STORAGE_PREFIX}reports`;

  const dateRanges = ref<ReportFilters>({});

  // Load date ranges from localStorage
  const loadDateRanges = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        dateRanges.value = JSON.parse(stored) as ReportFilters;
      }
    } catch (error) {
      console.warn("Failed to load report filters from localStorage:", error);
    }
  };

  // Save date ranges to localStorage
  const saveDateRanges = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dateRanges.value));
    } catch (error) {
      console.warn("Failed to save report filters to localStorage:", error);
    }
  };

  // Get date range for a specific plugin
  const getDateRange = (pluginKey: string): ReportDateRange => {
    return (
      dateRanges.value[pluginKey] || {
        startDate: "",
        endDate: "",
      }
    );
  };

  // Set date range for a specific plugin
  const setDateRange = (pluginKey: string, range: Partial<ReportDateRange>) => {
    const current = getDateRange(pluginKey);
    dateRanges.value[pluginKey] = {
      startDate: range.startDate ?? current.startDate,
      endDate: range.endDate ?? current.endDate,
    };
    saveDateRanges();
  };

  // Check if a plugin has active filters
  const hasActiveFilter = (pluginKey: string): boolean => {
    const range = dateRanges.value[pluginKey];
    return range ? range.startDate !== "" || range.endDate !== "" : false;
  };

  // Clear date range for a specific plugin
  const clearDateRange = (pluginKey: string) => {
    if (dateRanges.value[pluginKey]) {
      dateRanges.value[pluginKey] = {
        startDate: "",
        endDate: "",
      };
      saveDateRanges();
    }
  };

  // Clear a specific field for a plugin
  const clearDateField = (
    pluginKey: string,
    field: "startDate" | "endDate"
  ) => {
    if (dateRanges.value[pluginKey]) {
      dateRanges.value[pluginKey][field] = "";
      saveDateRanges();
    }
  };

  // Clear all report filters
  const clearAllDateRanges = () => {
    dateRanges.value = {};
    saveDateRanges();
  };

  // Watch for changes and persist
  watch(
    dateRanges,
    () => {
      saveDateRanges();
    },
    { deep: true }
  );

  // Load on creation
  loadDateRanges();

  return {
    dateRanges,
    getDateRange,
    setDateRange,
    hasActiveFilter,
    clearDateRange,
    clearDateField,
    clearAllDateRanges,
    loadDateRanges,
    saveDateRanges,
  };
}
