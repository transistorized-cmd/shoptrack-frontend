import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Receipt, ReceiptQuery, PagedResult } from "@/types/receipt";
import type { ProcessingResult } from "@/types/plugin";
import { receiptsService } from "@/services/receipts";
import { generateIdempotencyKey } from "@/utils/idempotency";

export const useReceiptsStore = defineStore("receipts", () => {
  // State
  const receipts = ref<Receipt[]>([]);
  const currentReceipt = ref<Receipt | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const pagination = ref({
    page: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
  });

  // Computed
  const hasReceipts = computed(() => receipts.value.length > 0);
  const pendingReceipts = computed(() =>
    receipts.value.filter((r) => r.processingStatus === "pending"),
  );
  const completedReceipts = computed(() =>
    receipts.value.filter((r) => r.processingStatus === "completed"),
  );

  // Actions
  const fetchReceipts = async (query?: ReceiptQuery) => {
    loading.value = true;
    error.value = null;

    try {
      const response: PagedResult<Receipt> =
        await receiptsService.getReceipts(query);
      receipts.value = response.data;
      pagination.value = {
        page: response.page,
        pageSize: response.pageSize,
        totalCount: response.totalCount,
        totalPages: response.totalPages,
      };
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to fetch receipts";
      console.error("Error fetching receipts:", err);
    } finally {
      loading.value = false;
    }
  };

  const fetchReceipt = async (id: number) => {
    loading.value = true;
    error.value = null;

    try {
      const receipt = await receiptsService.getReceipt(id);
      currentReceipt.value = receipt;
      return receipt;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to fetch receipt";
      console.error("Error fetching receipt:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const uploadReceipt = async (file: File, pluginKey?: string) => {
    loading.value = true;
    error.value = null;

    // Generate idempotency key for this upload operation
    const idempotencyKey = generateIdempotencyKey();

    try {
      const result: ProcessingResult = await receiptsService.uploadReceipt(
        file,
        pluginKey,
        idempotencyKey,
      );

      if (result.success && !result.isDuplicate) {
        receipts.value.unshift(result.receipt);
      }

      return result;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to upload receipt";
      console.error("Error uploading receipt:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteReceipt = async (id: number) => {
    loading.value = true;
    error.value = null;

    try {
      await receiptsService.deleteReceipt(id);
      receipts.value = receipts.value.filter((r) => r.id !== id);

      if (currentReceipt.value?.id === id) {
        currentReceipt.value = null;
      }
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to delete receipt";
      console.error("Error deleting receipt:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateReceipt = async (id: number, updates: Partial<Receipt>) => {
    loading.value = true;
    error.value = null;

    try {
      const updatedReceipt = await receiptsService.updateReceipt(id, updates);

      // Update the receipt in the list
      const index = receipts.value.findIndex((r) => r.id === id);
      if (index !== -1) {
        receipts.value[index] = updatedReceipt;
      }

      // Update current receipt if it's the same one
      if (currentReceipt.value?.id === id) {
        currentReceipt.value = updatedReceipt;
      }

      return updatedReceipt;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to update receipt";
      console.error("Error updating receipt:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const reprocessReceipt = async (id: number, pluginKey?: string) => {
    loading.value = true;
    error.value = null;

    try {
      const result = await receiptsService.reprocessReceipt(id, pluginKey);

      if (result.success) {
        // Update the receipt in the list
        const index = receipts.value.findIndex((r) => r.id === id);
        if (index !== -1) {
          receipts.value[index] = result.receipt;
        }

        // Update current receipt if it's the same one
        if (currentReceipt.value?.id === id) {
          currentReceipt.value = result.receipt;
        }
      }

      return result;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to reprocess receipt";
      console.error("Error reprocessing receipt:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  const getReceiptDetails = async (id: number) => {
    try {
      const receipt = await receiptsService.getReceipt(id);
      return receipt;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to fetch receipt details";
      console.error("Error fetching receipt details:", err);
      throw err;
    }
  };

  const clearCurrentReceipt = () => {
    currentReceipt.value = null;
  };

  return {
    // State
    receipts,
    currentReceipt,
    loading,
    error,
    pagination,

    // Computed
    hasReceipts,
    pendingReceipts,
    completedReceipts,

    // Actions
    fetchReceipts,
    fetchReceipt,
    uploadReceipt,
    updateReceipt,
    deleteReceipt,
    reprocessReceipt,
    getReceiptDetails,
    clearError,
    clearCurrentReceipt,
  };
});
