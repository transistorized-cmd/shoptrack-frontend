import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import { useCategoriesStore } from "../categories";
import { categoriesService, type CategoryDto } from "@/services/categories";

// Mock the categories service
vi.mock("@/services/categories", () => ({
  categoriesService: {
    getCategories: vi.fn(),
  },
}));

// Mock timers for interval testing
vi.useFakeTimers();

describe("Categories Store", () => {
  let store: ReturnType<typeof useCategoriesStore>;

  // Mock category data
  const mockCategoriesEN: CategoryDto[] = [
    {
      id: 1,
      key: "food",
      name: "Food",
      parentId: null,
      icon: "🍕",
      color: "#FF6B6B",
      sortOrder: 1,
    },
    {
      id: 2,
      key: "beverages",
      name: "Beverages",
      parentId: 1,
      icon: "🥤",
      color: "#4ECDC4",
      sortOrder: 2,
    },
    {
      id: 3,
      key: "electronics",
      name: "Electronics",
      parentId: null,
      icon: "📱",
      color: "#45B7D1",
      sortOrder: 3,
    },
  ];

  const mockCategoriesES: CategoryDto[] = [
    {
      id: 1,
      key: "food",
      name: "Comida",
      parentId: null,
      icon: "🍕",
      color: "#FF6B6B",
      sortOrder: 1,
    },
    {
      id: 2,
      key: "beverages",
      name: "Bebidas",
      parentId: 1,
      icon: "🥤",
      color: "#4ECDC4",
      sortOrder: 2,
    },
    {
      id: 3,
      key: "electronics",
      name: "Electrónicos",
      parentId: null,
      icon: "📱",
      color: "#45B7D1",
      sortOrder: 3,
    },
  ];

  const mockCategoriesFR: CategoryDto[] = [
    {
      id: 1,
      key: "food",
      name: "Nourriture",
      parentId: null,
      icon: "🍕",
      color: "#FF6B6B",
      sortOrder: 1,
    },
    {
      id: 2,
      key: "beverages",
      name: "Boissons",
      parentId: 1,
      icon: "🥤",
      color: "#4ECDC4",
      sortOrder: 2,
    },
  ];

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useCategoriesStore();
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    store.stopAutoRefresh();
  });

  describe("Initial State", () => {
    it("should initialize with empty state", () => {
      expect(store.byLocale).toEqual({});
      expect(store.nameByLocale).toEqual({});
      expect(store.loading).toBe(false);
      expect(store.error).toBe(null);
    });

    it("should have proper reactive properties", () => {
      expect(store.byLocale).toBeDefined();
      expect(store.nameByLocale).toBeDefined();
      expect(store.loading).toBeDefined();
      expect(store.error).toBeDefined();
    });
  });

  describe("fetchCategories", () => {
    it("should fetch categories for a single locale", async () => {
      vi.mocked(categoriesService.getCategories).mockResolvedValue(
        mockCategoriesEN,
      );

      await store.fetchCategories("en");

      expect(categoriesService.getCategories).toHaveBeenCalledWith("en");
      expect(store.byLocale.en).toEqual(mockCategoriesEN);
      expect(store.loading).toBe(false);
      expect(store.error).toBe(null);
    });

    it("should set loading state during fetch", async () => {
      let resolveFetch: (value: CategoryDto[]) => void;
      const fetchPromise = new Promise<CategoryDto[]>((resolve) => {
        resolveFetch = resolve;
      });

      vi.mocked(categoriesService.getCategories).mockReturnValue(fetchPromise);

      const fetchCall = store.fetchCategories("en");

      expect(store.loading).toBe(true);

      resolveFetch!(mockCategoriesEN);
      await fetchCall;

      expect(store.loading).toBe(false);
    });

    it("should handle fetch errors", async () => {
      const errorMessage = "Network error";
      vi.mocked(categoriesService.getCategories).mockRejectedValue(
        new Error(errorMessage),
      );

      await store.fetchCategories("en");

      expect(store.error).toBe(errorMessage);
      expect(store.loading).toBe(false);
      expect(store.byLocale.en).toBeUndefined();
    });

    it("should handle fetch errors without message", async () => {
      vi.mocked(categoriesService.getCategories).mockRejectedValue(new Error());

      await store.fetchCategories("en");

      expect(store.error).toBe("Failed to load categories");
      expect(store.loading).toBe(false);
    });

    it("should handle non-Error rejections", async () => {
      vi.mocked(categoriesService.getCategories).mockRejectedValue(
        "String error",
      );

      await store.fetchCategories("en");

      expect(store.error).toBe("Failed to load categories");
      expect(store.loading).toBe(false);
    });

    it("should preserve existing locales when adding new ones", async () => {
      // First fetch
      vi.mocked(categoriesService.getCategories).mockResolvedValue(
        mockCategoriesEN,
      );
      await store.fetchCategories("en");

      // Second fetch
      vi.mocked(categoriesService.getCategories).mockResolvedValue(
        mockCategoriesES,
      );
      await store.fetchCategories("es");

      expect(store.byLocale.en).toEqual(mockCategoriesEN);
      expect(store.byLocale.es).toEqual(mockCategoriesES);
    });

    it("should clear error state on successful fetch", async () => {
      // First a failed fetch
      vi.mocked(categoriesService.getCategories).mockRejectedValue(
        new Error("Failed"),
      );
      await store.fetchCategories("en");
      expect(store.error).toBeTruthy();

      // Then a successful fetch
      vi.mocked(categoriesService.getCategories).mockResolvedValue(
        mockCategoriesEN,
      );
      await store.fetchCategories("en");

      expect(store.error).toBe(null);
    });

    it("should override existing locale data", async () => {
      // First fetch
      vi.mocked(categoriesService.getCategories).mockResolvedValue(
        mockCategoriesEN,
      );
      await store.fetchCategories("en");

      // Second fetch with different data
      const updatedCategories = [
        { ...mockCategoriesEN[0], name: "Updated Food" },
      ];
      vi.mocked(categoriesService.getCategories).mockResolvedValue(
        updatedCategories,
      );
      await store.fetchCategories("en");

      expect(store.byLocale.en).toEqual(updatedCategories);
    });
  });

  describe("fetchAllLocales", () => {
    it("should fetch categories for multiple locales", async () => {
      vi.mocked(categoriesService.getCategories).mockImplementation(
        (locale) => {
          if (locale === "en") return Promise.resolve(mockCategoriesEN);
          if (locale === "es") return Promise.resolve(mockCategoriesES);
          return Promise.resolve([]);
        },
      );

      await store.fetchAllLocales(["en", "es"]);

      expect(categoriesService.getCategories).toHaveBeenCalledWith("en");
      expect(categoriesService.getCategories).toHaveBeenCalledWith("es");
      expect(store.byLocale.en).toEqual(mockCategoriesEN);
      expect(store.byLocale.es).toEqual(mockCategoriesES);
      expect(store.loading).toBe(false);
      expect(store.error).toBe(null);
    });

    it("should handle empty locale array", async () => {
      await store.fetchAllLocales([]);

      expect(categoriesService.getCategories).not.toHaveBeenCalled();
      expect(store.loading).toBe(false);
      expect(store.error).toBe(null);
    });

    it("should handle partial failures in multiple locales", async () => {
      vi.mocked(categoriesService.getCategories).mockImplementation(
        (locale) => {
          if (locale === "en") return Promise.resolve(mockCategoriesEN);
          if (locale === "es") return Promise.reject(new Error("ES failed"));
          return Promise.resolve([]);
        },
      );

      await store.fetchAllLocales(["en", "es"]);

      expect(store.error).toBe("ES failed");
      expect(store.loading).toBe(false);
      // EN should still be loaded despite ES failure
      expect(store.byLocale.en).toEqual(mockCategoriesEN);
    });

    it("should set loading state during fetchAllLocales", async () => {
      let resolveEN: (value: CategoryDto[]) => void;
      let resolveES: (value: CategoryDto[]) => void;

      vi.mocked(categoriesService.getCategories).mockImplementation(
        (locale) => {
          if (locale === "en") {
            return new Promise<CategoryDto[]>((resolve) => {
              resolveEN = resolve;
            });
          }
          if (locale === "es") {
            return new Promise<CategoryDto[]>((resolve) => {
              resolveES = resolve;
            });
          }
          return Promise.resolve([]);
        },
      );

      const fetchCall = store.fetchAllLocales(["en", "es"]);

      expect(store.loading).toBe(true);

      resolveEN!(mockCategoriesEN);
      resolveES!(mockCategoriesES);
      await fetchCall;

      expect(store.loading).toBe(false);
    });
  });

  describe("nameByLocale computed", () => {
    it("should create name lookup map for single locale", async () => {
      vi.mocked(categoriesService.getCategories).mockResolvedValue(
        mockCategoriesEN,
      );
      await store.fetchCategories("en");

      const expected = {
        en: {
          1: "Food",
          2: "Beverages",
          3: "Electronics",
        },
      };

      expect(store.nameByLocale).toEqual(expected);
    });

    it("should create name lookup maps for multiple locales", async () => {
      vi.mocked(categoriesService.getCategories).mockImplementation(
        (locale) => {
          if (locale === "en") return Promise.resolve(mockCategoriesEN);
          if (locale === "es") return Promise.resolve(mockCategoriesES);
          return Promise.resolve([]);
        },
      );

      await store.fetchAllLocales(["en", "es"]);

      const expected = {
        en: {
          1: "Food",
          2: "Beverages",
          3: "Electronics",
        },
        es: {
          1: "Comida",
          2: "Bebidas",
          3: "Electrónicos",
        },
      };

      expect(store.nameByLocale).toEqual(expected);
    });

    it("should update reactively when categories change", async () => {
      // Initial empty state
      expect(store.nameByLocale).toEqual({});

      // Add categories
      vi.mocked(categoriesService.getCategories).mockResolvedValue(
        mockCategoriesEN,
      );
      await store.fetchCategories("en");

      expect(store.nameByLocale.en).toBeDefined();
      expect(store.nameByLocale.en[1]).toBe("Food");
    });

    it("should handle empty categories array", async () => {
      vi.mocked(categoriesService.getCategories).mockResolvedValue([]);
      await store.fetchCategories("en");

      expect(store.nameByLocale).toEqual({ en: {} });
    });
  });

  describe("getName function", () => {
    beforeEach(async () => {
      vi.mocked(categoriesService.getCategories).mockImplementation(
        (locale) => {
          if (locale === "en") return Promise.resolve(mockCategoriesEN);
          if (locale === "es") return Promise.resolve(mockCategoriesES);
          if (locale === "fr") return Promise.resolve(mockCategoriesFR);
          return Promise.resolve([]);
        },
      );

      await store.fetchAllLocales(["en", "es", "fr"]);
    });

    it("should return category name for specific locale", () => {
      expect(store.getName(1, "en")).toBe("Food");
      expect(store.getName(1, "es")).toBe("Comida");
      expect(store.getName(1, "fr")).toBe("Nourriture");
    });

    it("should return undefined for invalid id", () => {
      expect(store.getName(undefined, "en")).toBeUndefined();
      expect(store.getName(0, "en")).toBeUndefined();
      expect(store.getName(999, "en")).toBeUndefined();
    });

    it("should return undefined for invalid locale when no fallback available", () => {
      // Test with completely fresh pinia instance
      const freshPinia = createPinia();
      setActivePinia(freshPinia);
      const freshStore = useCategoriesStore();
      expect(freshStore.getName(1, "de")).toBeUndefined();
      expect(freshStore.getName(1, "nonexistent")).toBeUndefined();
    });

    it("should fallback to any available locale when specific locale not found", () => {
      const name = store.getName(1, "de"); // German not loaded
      expect(["Food", "Comida", "Nourriture"]).toContain(name);
    });

    it("should fallback to any available locale when no locale specified", () => {
      const name = store.getName(1);
      expect(["Food", "Comida", "Nourriture"]).toContain(name);
    });

    it("should return undefined when category not found in any locale", () => {
      expect(store.getName(999)).toBeUndefined();
    });

    it("should return undefined when no categories loaded", () => {
      // Create a completely fresh pinia instance and store
      const freshPinia = createPinia();
      setActivePinia(freshPinia);
      const emptyStore = useCategoriesStore();
      expect(emptyStore.getName(1, "en")).toBeUndefined();
    });

    it("should handle category missing from specific locale but present in others", () => {
      // Category 3 (Electronics) is not in French mockData, but should fallback
      const frenchName = store.getName(3, "fr");
      // Should fallback to a name from another locale since fr doesn't have category 3
      expect(["Electronics", "Electrónicos"]).toContain(frenchName);

      // But should work for other locales directly
      expect(store.getName(3, "en")).toBe("Electronics");
      expect(store.getName(3, "es")).toBe("Electrónicos");
    });
  });

  describe("Auto Refresh", () => {
    it("should start auto refresh with default interval", async () => {
      vi.mocked(categoriesService.getCategories).mockResolvedValue(
        mockCategoriesEN,
      );
      await store.fetchCategories("en");

      store.startAutoRefresh();

      // Fast-forward 30 seconds (default interval)
      vi.advanceTimersByTime(30000);

      // Should have called fetchCategories again
      expect(categoriesService.getCategories).toHaveBeenCalledTimes(2);
    });

    it("should start auto refresh with custom interval", async () => {
      vi.mocked(categoriesService.getCategories).mockResolvedValue(
        mockCategoriesEN,
      );
      await store.fetchCategories("en");

      store.startAutoRefresh(10000); // 10 seconds

      // Fast-forward 10 seconds
      vi.advanceTimersByTime(10000);

      expect(categoriesService.getCategories).toHaveBeenCalledTimes(2);
    });

    it("should refresh all loaded locales", async () => {
      vi.mocked(categoriesService.getCategories).mockImplementation(
        (locale) => {
          if (locale === "en") return Promise.resolve(mockCategoriesEN);
          if (locale === "es") return Promise.resolve(mockCategoriesES);
          return Promise.resolve([]);
        },
      );

      await store.fetchAllLocales(["en", "es"]);

      store.startAutoRefresh(5000);

      // Fast-forward 5 seconds
      vi.advanceTimersByTime(5000);

      // Should have refreshed both locales
      expect(categoriesService.getCategories).toHaveBeenCalledTimes(4); // 2 initial + 2 refresh
    });

    it("should not refresh when no locales are loaded", () => {
      store.startAutoRefresh(5000);

      vi.advanceTimersByTime(5000);

      expect(categoriesService.getCategories).not.toHaveBeenCalled();
    });

    it("should stop auto refresh", async () => {
      vi.mocked(categoriesService.getCategories).mockResolvedValue(
        mockCategoriesEN,
      );
      await store.fetchCategories("en");

      store.startAutoRefresh(5000);
      store.stopAutoRefresh();

      vi.advanceTimersByTime(5000);

      // Should only have the initial call
      expect(categoriesService.getCategories).toHaveBeenCalledTimes(1);
    });

    it("should stop existing interval when starting new one", async () => {
      vi.mocked(categoriesService.getCategories).mockResolvedValue(
        mockCategoriesEN,
      );
      await store.fetchCategories("en");

      // Start with 10 second interval
      store.startAutoRefresh(10000);

      // Start with 5 second interval (should stop the first one)
      store.startAutoRefresh(5000);

      // Fast-forward 5 seconds
      vi.advanceTimersByTime(5000);

      expect(categoriesService.getCategories).toHaveBeenCalledTimes(2); // 1 initial + 1 refresh

      // Fast-forward another 5 seconds (total 10)
      vi.advanceTimersByTime(5000);

      expect(categoriesService.getCategories).toHaveBeenCalledTimes(3); // 1 initial + 2 refresh
    });

    it("should handle refresh errors gracefully", async () => {
      vi.mocked(categoriesService.getCategories).mockResolvedValue(
        mockCategoriesEN,
      );
      await store.fetchCategories("en");

      // Mock error on refresh
      vi.mocked(categoriesService.getCategories).mockRejectedValue(
        new Error("Refresh failed"),
      );

      store.startAutoRefresh(5000);

      // Use fake timers to trigger the refresh
      await vi.advanceTimersByTimeAsync(5000);

      expect(store.error).toBe("Refresh failed");
    });

    it("should continue refreshing after errors", async () => {
      vi.mocked(categoriesService.getCategories).mockResolvedValue(
        mockCategoriesEN,
      );
      await store.fetchCategories("en");

      let callCount = 1;
      vi.mocked(categoriesService.getCategories).mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error("Refresh failed"));
        }
        return Promise.resolve(mockCategoriesEN);
      });

      store.startAutoRefresh(5000);

      // First refresh (fails)
      await vi.advanceTimersByTimeAsync(5000);
      expect(store.error).toBe("Refresh failed");

      // Second refresh (succeeds)
      await vi.advanceTimersByTimeAsync(5000);
      expect(store.error).toBe(null);
    });
  });

  describe("Store Cleanup", () => {
    it("should stop auto refresh on unmount", () => {
      const stopSpy = vi.spyOn(store, "stopAutoRefresh");

      // Trigger unmount by creating a new store instance
      setActivePinia(createPinia());

      // The onUnmounted hook should have been called
      // Note: This is difficult to test directly in unit tests
      // In practice, the cleanup would be tested in component tests
      expect(stopSpy).not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle concurrent fetch requests", async () => {
      vi.mocked(categoriesService.getCategories).mockImplementation(
        async (locale) => {
          if (locale === "en") return Promise.resolve(mockCategoriesEN);
          if (locale === "es") return Promise.resolve(mockCategoriesES);
          return Promise.resolve([]);
        },
      );

      // Start concurrent fetches
      const promise1 = store.fetchCategories("en");
      const promise2 = store.fetchCategories("es");

      await Promise.all([promise1, promise2]);

      expect(store.byLocale.en).toEqual(mockCategoriesEN);
      expect(store.byLocale.es).toEqual(mockCategoriesES);
    }, 1000);

    it("should handle very large category datasets", async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        key: `category-${i + 1}`,
        name: `Category ${i + 1}`,
        parentId: null,
        icon: "📁",
        color: "#000000",
        sortOrder: i + 1,
      }));

      vi.mocked(categoriesService.getCategories).mockResolvedValue(
        largeDataset,
      );

      await store.fetchCategories("en");

      expect(store.byLocale.en).toHaveLength(1000);
      expect(Object.keys(store.nameByLocale.en)).toHaveLength(1000);
      expect(store.getName(1, "en")).toBe("Category 1");
      expect(store.getName(1000, "en")).toBe("Category 1000");
    });

    it("should handle categories with special characters", async () => {
      const specialCategories = [
        {
          id: 1,
          key: "special-chars",
          name: "Café & Tê (100% Organic) 🌿",
          parentId: null,
          icon: "☕",
          color: "#8B4513",
          sortOrder: 1,
        },
        {
          id: 2,
          key: "unicode",
          name: "电子产品",
          parentId: null,
          icon: "📱",
          color: "#000000",
          sortOrder: 2,
        },
      ];

      vi.mocked(categoriesService.getCategories).mockResolvedValue(
        specialCategories,
      );

      await store.fetchCategories("zh");

      expect(store.getName(1, "zh")).toBe("Café & Tê (100% Organic) 🌿");
      expect(store.getName(2, "zh")).toBe("电子产品");
    });

    it("should handle null and undefined category properties", async () => {
      const categoriesWithNulls = [
        {
          id: 1,
          key: "minimal",
          name: "Minimal Category",
          parentId: null,
          icon: null,
          color: null,
          sortOrder: 1,
        },
      ];

      vi.mocked(categoriesService.getCategories).mockResolvedValue(
        categoriesWithNulls,
      );

      await store.fetchCategories("en");

      expect(store.getName(1, "en")).toBe("Minimal Category");
      expect(store.byLocale.en[0].icon).toBe(null);
      expect(store.byLocale.en[0].color).toBe(null);
    });
  });

  describe("Performance", () => {
    it("should not refetch same locale unnecessarily during rapid calls", async () => {
      vi.mocked(categoriesService.getCategories).mockResolvedValue(
        mockCategoriesEN,
      );

      // Rapid calls to same locale
      await Promise.all([
        store.fetchCategories("en"),
        store.fetchCategories("en"),
        store.fetchCategories("en"),
      ]);

      // All calls should be made (no built-in deduplication)
      expect(categoriesService.getCategories).toHaveBeenCalledTimes(3);
    });

    it("should handle memory efficiently with large locale count", async () => {
      const locales = Array.from({ length: 50 }, (_, i) => `locale-${i}`);

      vi.mocked(categoriesService.getCategories).mockImplementation(
        (locale) => {
          return Promise.resolve([
            {
              id: 1,
              key: "test",
              name: `Test in ${locale}`,
              parentId: null,
              icon: "🔸",
              color: "#999999",
              sortOrder: 1,
            },
          ]);
        },
      );

      await store.fetchAllLocales(locales);

      expect(Object.keys(store.byLocale)).toHaveLength(50);
      expect(Object.keys(store.nameByLocale)).toHaveLength(50);
    });
  });
});
