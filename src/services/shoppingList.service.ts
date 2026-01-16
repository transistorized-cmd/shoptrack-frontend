import api from "./api";
import type {
  ShoppingList,
  ShoppingListDetail,
  ShoppingListItem,
  CreateShoppingListRequest,
  UpdateShoppingListRequest,
  AddShoppingListItemRequest,
  UpdateShoppingListItemRequest,
  ProductSearchResult,
  ProductSearchQuery,
} from "@/types/shoppingList";

export const shoppingListService = {
  // Shopping Lists
  async getLists(): Promise<ShoppingList[]> {
    const res = await api.get("/shopping-lists");
    return res.data as ShoppingList[];
  },

  async getList(id: number): Promise<ShoppingListDetail> {
    const res = await api.get(`/shopping-lists/${id}`);
    return res.data as ShoppingListDetail;
  },

  async createList(data: CreateShoppingListRequest): Promise<ShoppingList> {
    const res = await api.post("/shopping-lists", data);
    return res.data as ShoppingList;
  },

  async updateList(
    id: number,
    data: UpdateShoppingListRequest
  ): Promise<ShoppingList> {
    const res = await api.put(`/shopping-lists/${id}`, data);
    return res.data as ShoppingList;
  },

  async deleteList(id: number): Promise<void> {
    await api.delete(`/shopping-lists/${id}`);
  },

  async completeList(id: number): Promise<ShoppingList> {
    const res = await api.post(`/shopping-lists/${id}/complete`);
    return res.data as ShoppingList;
  },

  // Shopping List Items
  async addItem(
    listId: number,
    data: AddShoppingListItemRequest
  ): Promise<ShoppingListItem> {
    const res = await api.post(`/shopping-lists/${listId}/items`, data);
    return res.data as ShoppingListItem;
  },

  async updateItem(
    listId: number,
    itemId: number,
    data: UpdateShoppingListItemRequest
  ): Promise<ShoppingListItem> {
    const res = await api.put(`/shopping-lists/${listId}/items/${itemId}`, data);
    return res.data as ShoppingListItem;
  },

  async deleteItem(listId: number, itemId: number): Promise<void> {
    await api.delete(`/shopping-lists/${listId}/items/${itemId}`);
  },

  async toggleItem(listId: number, itemId: number): Promise<ShoppingListItem> {
    const res = await api.patch(`/shopping-lists/${listId}/items/${itemId}/toggle`);
    return res.data as ShoppingListItem;
  },

  async toggleAllItems(listId: number, checked: boolean): Promise<void> {
    await api.patch(`/shopping-lists/${listId}/items/toggle-all`, { checked });
  },

  // Product Search
  async searchProducts(query: ProductSearchQuery): Promise<ProductSearchResult[]> {
    const params: Record<string, unknown> = {};
    if (query.q) params.q = query.q;
    if (query.tagUuid) params.tagUuid = query.tagUuid;
    if (query.category) params.category = query.category;
    if (query.hasNfc !== undefined) params.hasNfc = query.hasNfc;
    if (query.favoritesOnly) params.favoritesOnly = query.favoritesOnly;

    const res = await api.get("/products/search", { params });
    return res.data as ProductSearchResult[];
  },

  // Favorites
  async getFavorites(): Promise<ProductSearchResult[]> {
    const res = await api.get("/user/favorites");
    return res.data as ProductSearchResult[];
  },

  async addFavorite(productId: number): Promise<void> {
    await api.post(`/user/favorites/${productId}`);
  },

  async removeFavorite(productId: number): Promise<void> {
    await api.delete(`/user/favorites/${productId}`);
  },

  async isFavorite(productId: number): Promise<boolean> {
    const res = await api.get(`/user/favorites/${productId}`);
    return (res.data as { isFavorite: boolean }).isFavorite;
  },
};
