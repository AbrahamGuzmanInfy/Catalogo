import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import type { Category, CategoriesResponse, CategoryUpsertPayload } from '../models/category.model';

const API_BASE_URL = 'https://hs5rkunm27jueyzgyhqliykv7u0sizsx.lambda-url.us-east-2.on.aws';

/**
 * Centraliza las operaciones HTTP relacionadas con categorías.
 */
@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);

  /**
   * Obtiene las categorías visibles del catálogo.
   */
  getCategories(): Observable<Category[]> {
    return this.http
      .get<CategoriesResponse>(`${API_BASE_URL}/categorias`)
      .pipe(map((response) => response.items ?? []));
  }

  /**
   * Crea una categoría nueva.
   * @param payload Datos capturados en el formulario de categoría.
   */
  createCategory(payload: CategoryUpsertPayload): Observable<Category> {
    return this.http.post<Category>(`${API_BASE_URL}/categorias`, payload);
  }

  /**
   * Actualiza una categoría existente.
   * @param categoryId Identificador numérico de la categoría.
   * @param payload Datos normalizados del formulario.
   */
  updateCategory(categoryId: string, payload: CategoryUpsertPayload): Observable<Category> {
    return this.http.patch<Category>(`${API_BASE_URL}/categorias/${categoryId}`, payload);
  }

  /**
   * Elimina una categoría del catálogo.
   * @param categoryId Identificador numérico de la categoría.
   */
  deleteCategory(categoryId: string): Observable<unknown> {
    return this.http.delete(`${API_BASE_URL}/categorias/${categoryId}`);
  }
}
