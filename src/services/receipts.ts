import api from "./api";
import { getCurrentLocale } from "@/i18n";
import type {
  Receipt,
  ReceiptItem,
  ReceiptQuery,
  PagedResult,
} from "@/types/receipt";
import type { ProcessingResult } from "@/types/plugin";

export const receiptsService = {
  async getReceipts(params?: ReceiptQuery): Promise<PagedResult<Receipt>> {
    const locale = getCurrentLocale();
    const response = await api.get("/receipts", { params: { locale, ...(params || {}) } });
    return response.data;
  },

  async getReceipt(id: number): Promise<Receipt> {
    const locale = getCurrentLocale();
    const response = await api.get(`/receipts/${id}`, { params: { locale } });
    return response.data;
  },

  async createReceipt(receipt: Partial<Receipt>): Promise<Receipt> {
    const response = await api.post("/receipts", receipt);
    return response.data;
  },

  async updateReceipt(id: number, receipt: Partial<Receipt>): Promise<Receipt> {
    const response = await api.put(`/receipts/${id}`, receipt);
    return response.data;
  },

  async deleteReceipt(id: number): Promise<void> {
    await api.delete(`/receipts/${id}`);
  },

  async getReceiptItems(receiptId: number): Promise<ReceiptItem[]> {
    const response = await api.get(`/receipts/${receiptId}/items`);
    return response.data;
  },

  async reprocessReceipt(
    id: number,
    pluginKey?: string,
  ): Promise<ProcessingResult> {
    const response = await api.post(`/receipts/${id}/reprocess`, null, {
      params: { pluginKey },
    });
    return response.data;
  },

  async uploadReceipt(
    file: File,
    pluginKey?: string,
  ): Promise<ProcessingResult> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      params: { pluginKey },
    });
    return response.data;
  },

  async validateFile(
    file: File,
    pluginKey?: string,
  ): Promise<{
    valid: boolean;
    message: string;
    plugin?: string;
    fileSize?: number;
    maxFileSize?: number;
    suggestedPlugin?: string;
    supportedTypes?: Record<string, string[]>;
  }> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post("/upload/validate", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      params: { pluginKey },
    });
    return response.data;
  },

  async getStoreNames(search?: string): Promise<string[]> {
    const response = await api.get("/receipts/store-names", {
      params: { search },
    });
    return response.data;
  },

  async getItemNames(search?: string): Promise<string[]> {
    const response = await api.get("/receipts/item-names", {
      params: { search },
    });
    return response.data;
  },

  async getCategories(search?: string): Promise<string[]> {
    const locale = getCurrentLocale();
    const response = await api.get("/receipts/categories", {
      params: { search, locale },
    });
    const data = response.data;
    if (Array.isArray(data)) {
      if (typeof data[0] === "string" || data.length === 0) {
        return data as string[];
      }
      // Map canonical form to localized names (fallback to raw)
      return (data as Array<{ raw?: string; name?: string }>).map(
        (x) => x.name || x.raw || "",
      );
    }
    return [];
  },

  async getUnits(search?: string): Promise<string[]> {
    const response = await api.get("/receipts/units", {
      params: { search },
    });
    return response.data;
  },

  async updateReceiptItem(
    itemId: number,
    itemData: Partial<ReceiptItem>,
  ): Promise<ReceiptItem> {
    const locale = getCurrentLocale();
    const response = await api.put(`/receipts/items/${itemId}`, itemData, { params: { locale } });
    return response.data;
  },
};
