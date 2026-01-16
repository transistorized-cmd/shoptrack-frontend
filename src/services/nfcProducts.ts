import api from "./api";

export interface NfcProductDto {
  id: number;
  itemNameOriginal: string;
  nombre: string;
  emoji: string;
  tagUuid: string | null;
  category: string | null;
  activo: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateNfcProductDto {
  itemNameOriginal: string;
  nombre: string;
  emoji?: string;
  tagUuid?: string;
  category?: string;
  activo?: boolean;
}

export interface UpdateNfcProductDto {
  itemNameOriginal?: string;
  nombre?: string;
  emoji?: string;
  tagUuid?: string;
  category?: string;
  activo?: boolean;
}

export interface ItemSuggestionDto {
  itemName: string;
  category: string | null;
  count: number;
}

export const nfcProductsService = {
  async getAll(activo?: boolean): Promise<NfcProductDto[]> {
    const params: Record<string, unknown> = {};
    if (activo !== undefined) {
      params.activo = activo;
    }
    const res = await api.get("/nfcproducts", { params });
    return res.data as NfcProductDto[];
  },

  async getById(id: number): Promise<NfcProductDto> {
    const res = await api.get(`/nfcproducts/${id}`);
    return res.data as NfcProductDto;
  },

  async getByTagUuid(tagUuid: string): Promise<NfcProductDto> {
    const res = await api.get(`/nfcproducts/by-tag/${encodeURIComponent(tagUuid)}`);
    return res.data as NfcProductDto;
  },

  async create(data: CreateNfcProductDto): Promise<NfcProductDto> {
    const res = await api.post("/nfcproducts", data);
    return res.data as NfcProductDto;
  },

  async update(id: number, data: UpdateNfcProductDto): Promise<NfcProductDto> {
    const res = await api.put(`/nfcproducts/${id}`, data);
    return res.data as NfcProductDto;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/nfcproducts/${id}`);
  },

  async toggle(id: number): Promise<NfcProductDto> {
    const res = await api.patch(`/nfcproducts/${id}/toggle`);
    return res.data as NfcProductDto;
  },

  async getItemSuggestions(search?: string): Promise<ItemSuggestionDto[]> {
    const params: Record<string, unknown> = {};
    if (search) {
      params.search = search;
    }
    const res = await api.get("/nfcproducts/item-suggestions", { params });
    return res.data as ItemSuggestionDto[];
  },
};
