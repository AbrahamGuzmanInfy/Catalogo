import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable, of } from 'rxjs';
import type { Product, ProductsResponse, ProductUpsertPayload } from '../models/product.model';

const API_BASE_URL = 'https://hs5rkunm27jueyzgyhqliykv7u0sizsx.lambda-url.us-east-2.on.aws';

/**
 * Centraliza las operaciones HTTP relacionadas con productos.
 */
@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);

  /**
   * Obtiene los productos del catálogo.
   * @param includeInactive Indica si deben incluirse productos desactivados para administración.
   */
  getProducts(includeInactive = false): Observable<Product[]> {
    const suffix = includeInactive ? '?include_inactive=true' : '';
    return this.http
      .get<ProductsResponse>(`${API_BASE_URL}/productos${suffix}`)
      .pipe(map((response) => response.items ?? []));
  }

  /**
   * Crea un producto nuevo en backend.
   * @param payload Datos preparados por el formulario de producto.
   */
  createProduct(payload: ProductUpsertPayload): Observable<Product> {
    return this.http.post<Product>(`${API_BASE_URL}/productos`, payload);
  }

  /**
   * Actualiza un producto existente.
   * @param productId Identificador numérico del producto.
   * @param payload Datos actualizados del producto.
   */
  updateProduct(productId: string, payload: ProductUpsertPayload): Observable<Product> {
    return this.http.patch<Product>(`${API_BASE_URL}/productos/${productId}`, payload);
  }

  /**
   * Elimina un producto del catálogo.
   * @param productId Identificador numérico del producto.
   */
  deleteProduct(productId: string): Observable<unknown> {
    return this.http.delete(`${API_BASE_URL}/productos/${productId}`);
  }

  /**
   * Vincula un producto con las categorías seleccionadas en administración.
   * @param productId Identificador del producto a relacionar.
   * @param categoryIds Colección de categorías seleccionadas.
   */
  linkProductCategories(productId: string, categoryIds: string[]): Observable<unknown[]> {
    if (!categoryIds.length) {
      return of([]);
    }

    return forkJoin(
      categoryIds.map((categoria_id) =>
        this.http.post(`${API_BASE_URL}/productos-categorias`, {
          categoria_id,
          producto_id: productId,
        }),
      ),
    );
  }
}
