export interface Receipt {
  id: number;
  filename: string;
  receiptDate?: string;
  imageHash?: string;
  receiptNumber?: string;
  storeName?: string;
  processingStatus: "pending" | "processing" | "completed" | "failed";
  claudeResponseJson?: ClaudeResponse;
  imageQualityAssessment?: string;
  totalItemsDetected: number;
  successfullyParsed: number;
  imageFile?: string;
  pngImage?: string;
  items?: ReceiptItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptItem {
  id: number;
  receiptId: number;
  itemName: string;
  quantity?: number;
  weightOriginal?: string;
  weightNormalizedKg?: number;
  unit?: string;
  pricePerUnit?: number;
  totalPrice: number;
  category?: {
    id?: number;
    name?: string;
    locale?: string;
  };
  categoryRaw?: string;
  notes?: string;
  confidence?: "low" | "medium" | "high" | "manual";
  createdAt: string;
  updatedAt: string;
}

export interface ClaudeResponse {
  [key: string]: any;
}

export interface ReceiptQuery {
  page?: number;
  pageSize?: number;
  processingStatus?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface PagedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
