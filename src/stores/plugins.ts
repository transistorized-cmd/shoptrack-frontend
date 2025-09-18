import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type {
  ReceiptPlugin,
  ReportPlugin,
  PluginStatistics,
} from "@/types/plugin";
import { pluginsService } from "@/services/plugins";

export const usePluginsStore = defineStore("plugins", () => {
  // State
  const receiptPlugins = ref<ReceiptPlugin[]>([]);
  const reportPlugins = ref<ReportPlugin[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const supportedFileTypes = ref<Record<string, string[]>>({});
  const statistics = ref<PluginStatistics | null>(null);

  // Computed
  const availableReceiptPlugins = computed(() =>
    receiptPlugins.value.filter((plugin) => plugin.type === "receipt"),
  );

  const enabledReportPlugins = computed(() =>
    reportPlugins.value.filter((plugin) => plugin.isEnabled),
  );

  const pluginsByCategory = computed(() => {
    const categories: Record<string, ReportPlugin[]> = {};
    reportPlugins.value.forEach((plugin) => {
      if (!categories[plugin.category]) {
        categories[plugin.category] = [];
      }
      categories[plugin.category].push(plugin);
    });
    return categories;
  });

  // Actions
  const fetchAllPlugins = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await pluginsService.getAllPlugins();
      receiptPlugins.value = response.receiptPlugins;
      reportPlugins.value = response.reportPlugins;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to fetch plugins";
      console.error("Error fetching plugins:", err);
    } finally {
      loading.value = false;
    }
  };

  const fetchSupportedFileTypes = async () => {
    try {
      // TODO: Implement getSupportedFileTypes in pluginsService
      // supportedFileTypes.value = await pluginsService.getSupportedFileTypes()
      console.log("Supported file types fetching not implemented yet");
    } catch (err) {
      console.error("Error fetching supported file types:", err);
    }
  };

  const fetchPluginStatistics = async () => {
    try {
      statistics.value = await pluginsService.getPluginStatistics();
    } catch (err) {
      console.error("Error fetching plugin statistics:", err);
    }
  };

  const getReceiptPlugin = (key: string): ReceiptPlugin | undefined => {
    return receiptPlugins.value.find((plugin) => plugin.key === key);
  };

  const getReportPlugin = (key: string): ReportPlugin | undefined => {
    return reportPlugins.value.find((plugin) => plugin.key === key);
  };

  const getPluginsForFileType = (fileExtension: string): ReceiptPlugin[] => {
    return receiptPlugins.value.filter((plugin) =>
      plugin.supportedFileTypes.includes(fileExtension.toLowerCase()),
    );
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    // State
    receiptPlugins,
    reportPlugins,
    loading,
    error,
    supportedFileTypes,
    statistics,

    // Computed
    availableReceiptPlugins,
    enabledReportPlugins,
    pluginsByCategory,

    // Actions
    fetchAllPlugins,
    fetchSupportedFileTypes,
    fetchPluginStatistics,
    getReceiptPlugin,
    getReportPlugin,
    getPluginsForFileType,
    clearError,
  };
});
