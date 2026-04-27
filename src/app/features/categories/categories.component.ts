import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import type { Category } from '../../core/models/category.model';
import type { Product } from '../../core/models/product.model';
import { CategoryService } from '../../core/services/category.service';
import { ProductService } from '../../core/services/product.service';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
})
/**
 * Muestra la lista de categorias con busqueda y navegacion de regreso al catalogo filtrado.
 */
export class CategoriesComponent implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly productService = inject(ProductService);

  @Input() categorySearchTerm = '';
  @Output() categoryOpened = new EventEmitter<string>();

  public readonly categories = signal<Category[]>([]);
  public readonly products = signal<Product[]>([]);
  public readonly filteredCategories = computed(() => {
    const term = this.normalizeSearch(this.categorySearchTerm);
    const categories = this.categories();

    if (!term) return categories;

    return categories.filter((category) =>
      [category.nombre, category.slug].some((value) =>
        this.normalizeSearch(value).includes(term),
      ),
    );
  });

  /**
   * Carga categorias y productos para calcular sus contadores.
   */
  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  /**
   * Notifica al shell que categoria debe abrirse en el catalogo.
   * @param category Categoria seleccionada por el usuario.
   */
  openCategory(category: Category): void {
    this.categoryOpened.emit(category.categoria_id);
  }

  /**
   * Resuelve la imagen visible de una categoria.
   * Usa la imagen propia cuando existe; si no, toma la primera imagen
   * de un producto asociado y, como ultimo recurso, usa el icono de la app.
   * @param category Categoria a representar.
   */
  getCategoryImage(category: Category): string {
    if (category.imageUrl?.trim()) {
      return category.imageUrl.trim();
    }

    const relatedProduct = this.products().find((product) =>
      product.categoriaIds?.includes(category.categoria_id) && product.image?.trim(),
    );

    if (relatedProduct?.image?.trim()) {
      return relatedProduct.image.trim();
    }

    return '/icons/app/icon-192.png';
  }

  /**
   * Calcula la etiqueta visible con el numero de productos asociados a una categoria.
   * @param category Categoria a evaluar.
   */
  getCategoryProductLabel(category: Category): string {
    const count = this.products().filter((product) => product.categoriaIds?.includes(category.categoria_id)).length;
    return count === 1 ? '1 producto' : `${count} productos`;
  }

  /**
   * Carga las categorias disponibles.
   */
  private loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
      },
      error: () => {
        this.categories.set([]);
      },
    });
  }

  /**
   * Carga los productos para poder contar su relacion con categorias.
   */
  private loadProducts(): void {
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products.set(products);
      },
      error: () => {
        this.products.set([]);
      },
    });
  }

  /**
   * Normaliza un texto para realizar busquedas tolerantes a acentos.
   * @param value Texto a normalizar.
   */
  private normalizeSearch(value: string): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
