import api from "./api";
import { getCurrentLocale } from "@/i18n";

export interface CategoryDto {
  id: number;
  key: string;
  name: string;
  parentId?: number | null;
  icon?: string | null;
  color?: string | null;
  sortOrder: number;
}

export const categoriesService = {
  async getCategories(locale?: string): Promise<CategoryDto[]> {
    const loc = locale || getCurrentLocale();
    const res = await api.get("/categories", { params: { locale: loc } });
    return res.data as CategoryDto[];
  },
};
