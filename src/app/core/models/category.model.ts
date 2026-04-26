export interface Category {
  categoria_id: string;
  nombre: string;
  slug: string;
  activa: string;
  orden: number;
  imageUrl?: string;
}

export interface CategoriesResponse {
  items: Category[];
}

export interface CategoryUpsertPayload {
  nombre: string;
  orden: number;
  imagen_url: string;
  activa: boolean;
}
