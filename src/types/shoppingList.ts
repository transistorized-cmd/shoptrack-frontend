export type ShoppingListStatus = 'active' | 'completed' | 'archived';
export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error';

export interface ShoppingList {
  id: number;
  name: string;
  status: ShoppingListStatus;
  totalItems: number;
  checkedItems: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ShoppingListItem {
  id: number;
  productId: number;
  name: string;
  emoji?: string;
  category?: string;
  quantity?: number;
  isChecked: boolean;
  checkedAt?: string;
  sortOrder: number;
}

export interface ShoppingListDetail extends ShoppingList {
  categories: ShoppingListCategoryGroup[];
}

export interface ShoppingListCategoryGroup {
  category: string;
  emoji: string;
  allUnchecked: boolean;
  itemCount: number;
  items: ShoppingListItem[];
}

// Offline types
export interface LocalShoppingList extends ShoppingList {
  localId: string;
  syncStatus: SyncStatus;
  lastSyncedAt?: string;
}

export interface LocalShoppingListItem extends ShoppingListItem {
  localId: string;
  localListId: string;
  syncStatus: SyncStatus;
}

export interface PendingChange {
  id: string;
  type: 'create' | 'update' | 'delete' | 'toggle';
  entityType: 'list' | 'item';
  entityId: string | number;
  parentId?: string | number; // For items, the list ID
  payload: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  idempotencyKey: string;
}

export interface ProductSearchResult {
  id: number;
  itemNameOriginal: string;
  nombre: string;
  emoji: string;
  tagUuid?: string;
  category?: string;
  hasNfc: boolean;
  isFavorite: boolean;
}

// API request/response types
export interface CreateShoppingListRequest {
  name: string;
}

export interface UpdateShoppingListRequest {
  name?: string;
  status?: ShoppingListStatus;
}

export interface AddShoppingListItemRequest {
  productId: number;
  quantity?: number;
}

export interface UpdateShoppingListItemRequest {
  quantity?: number;
}

export interface ProductSearchQuery {
  q?: string;
  tagUuid?: string;
  category?: string;
  hasNfc?: boolean;
  favoritesOnly?: boolean;
}
