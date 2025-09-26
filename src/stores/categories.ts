import { defineStore } from "pinia";
import { ref, computed, onUnmounted } from "vue";
import { categoriesService, type CategoryDto } from "@/services/categories";

export const useCategoriesStore = defineStore("categories", () => {
  const byLocale = ref<Record<string, CategoryDto[]>>({});
  const loading = ref(false);
  const error = ref<string | null>(null);
  let refreshInterval: NodeJS.Timeout | null = null;

  const nameByLocale = computed(() => {
    const out: Record<string, Record<number, string>> = {};
    for (const [loc, list] of Object.entries(byLocale.value)) {
      out[loc] = {} as Record<number, string>;
      for (const c of list) out[loc][c.id] = c.name;
    }
    return out;
  });

  const getName = (id?: number, loc?: string): string | undefined => {
    if (!id) return undefined;
    if (loc && nameByLocale.value[loc] && nameByLocale.value[loc][id]) {
      return nameByLocale.value[loc][id];
    }
    // fallback to any available locale
    for (const map of Object.values(nameByLocale.value)) {
      if (map[id]) return map[id];
    }
    return undefined;
  };

  const fetchCategories = async (loc: string) => {
    loading.value = true;
    error.value = null;
    try {
      const list = await categoriesService.getCategories(loc);
      byLocale.value = { ...byLocale.value, [loc]: list };
    } catch (err: any) {
      error.value = err?.message || "Failed to load categories";
    } finally {
      loading.value = false;
    }
  };

  const fetchAllLocales = async (locales: string[]) => {
    loading.value = true;
    error.value = null;
    try {
      await Promise.all(locales.map((loc) => fetchCategories(loc)));
    } catch (err: any) {
      error.value = err?.message || "Failed to load categories";
    } finally {
      loading.value = false;
    }
  };

  const startAutoRefresh = (intervalMs = 30000) => {
    stopAutoRefresh();
    refreshInterval = setInterval(async () => {
      // Refresh all currently loaded locales
      const loadedLocales = Object.keys(byLocale.value);
      if (loadedLocales.length > 0) {
        await fetchAllLocales(loadedLocales);
      }
    }, intervalMs);
  };

  const stopAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  };

  // Cleanup interval on store unmount
  onUnmounted(() => {
    stopAutoRefresh();
  });

  return {
    byLocale,
    nameByLocale,
    getName,
    loading,
    error,
    fetchCategories,
    fetchAllLocales,
    startAutoRefresh,
    stopAutoRefresh,
  };
});
