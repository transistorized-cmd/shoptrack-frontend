// Search API types for ShopTrack frontend

export interface SearchRequest {
  query: string;
  locale?: string;
  limit?: number;
}

export interface SearchReceiptResult {
  id: number;
  storeName: string | null;
  receiptNumber: string | null;
  receiptDate: string | null; // ISO date string
}

export interface SearchItemResult {
  id: number;
  receiptId: number;
  itemName: string;
  category: {
    id: number | null;
    name: string | null;
    locale: string;
  } | null;
  receipt: {
    storeName: string | null;
    receiptNumber: string | null;
    receiptDate: string | null;
  };
}

export interface SearchCategoryResult {
  id: number;
  key: string;
  name: string;
  locale: string;
}

export interface SearchResponse {
  query: string;
  locale: string;
  receipts: SearchReceiptResult[];
  items: SearchItemResult[];
  categories: SearchCategoryResult[];
}

// UI-specific types for search component
export interface SearchResultItem {
  type: "receipt" | "item" | "category";
  id: number;
  primaryText: string;
  secondaryText?: string;
  icon: string;
  data: SearchReceiptResult | SearchItemResult | SearchCategoryResult;
}

export interface SearchConfig {
  debounceMs: number;
  minQueryLength: number;
  maxResults: number;
  placeholder: string;
}
