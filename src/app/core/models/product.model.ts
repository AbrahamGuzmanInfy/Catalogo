export interface Product {
  producto_id: string;
  name: string;
  price: string;
  image: string;
  detailImage: string;
  alt: string;
  description: string;
  slug: string;
  model3dUrl?: string;
  categoriaIds?: string[];
  activo?: string;
  orden?: number;
}

export interface ProductsResponse {
  items: Product[];
}

export interface ProductUpsertPayload {
  nombre: string;
  precio: number;
  imagen_url: string;
  detalle_imagen_url: string;
  descripcion: string;
  model3d_url: string;
  orden: number;
  activo: boolean;
  categoria_ids?: string[];
}
