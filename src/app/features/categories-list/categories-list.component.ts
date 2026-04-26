import { Component, EventEmitter, OnInit, Output, computed, inject, signal } from '@angular/core';
import type { Category } from '../../core/models/category.model';
import { CategoryService } from '../../core/services/category.service';
import { ProductService } from '../../core/services/product.service';
import { SearchBarComponent } from '../../shared/search-bar/search-bar.component';

@Component({
  selector: 'app-categories-list',
  imports: [SearchBarComponent],
  templateUrl: './categories-list.component.html',
})
/**
 * Administra el inventario de categorias desde la vista de lista.
 */
export class CategoriesListComponent implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly productService = inject(ProductService);

  @Output() back = new EventEmitter<void>();
  @Output() createRequested = new EventEmitter<void>();
  @Output() editRequested = new EventEmitter<Category>();

  public readonly categoryListItems = signal<Category[]>([]);
  public readonly products = signal<Array<{ categoriaIds?: string[] }>>([]);
  public readonly categoryListSearchTerm = signal('');
  public readonly filteredCategoriesList = computed(() => {
    const term = this.normalizeSearch(this.categoryListSearchTerm());
    const categories = this.categoryListItems();

    if (!term) return categories;

    return categories.filter((category) =>
      [category.nombre, category.slug]
        .filter((value): value is string => Boolean(value))
        .some((value) => this.normalizeSearch(value).includes(term)),
    );
  });

  public categoryFormSuccess = '';
  public categoryFormError = '';
  public deletingCategoryId = '';

  /**
   * Carga las categorias y productos necesarios para la vista administrativa.
   */
  ngOnInit(): void {
    this.loadData();
  }

  /**
   * Actualiza la busqueda del listado administrativo de categorias.
   * @param event Evento input emitido por la barra de busqueda.
   */
  updateCategoryListSearch(event: Event): void {
    this.categoryListSearchTerm.set((event.target as HTMLInputElement).value);
  }

  /**
   * Genera la etiqueta con el total de productos asociados a una categoria.
   * @param category Categoria evaluada.
   */
  getCategoryProductLabel(category: Category): string {
    const count = this.products().filter((product) => product.categoriaIds?.includes(category.categoria_id)).length;
    return count === 1 ? '1 producto' : `${count} productos`;
  }

  /**
   * Solicita abrir el formulario de edicion para una categoria existente.
   * @param category Categoria elegida en la lista.
   */
  startEditCategoryFromList(category: Category): void {
    this.editRequested.emit(category);
  }

  /**
   * Solicita abrir el formulario para crear una categoria nueva.
   */
  openNewCategoryForm(): void {
    this.createRequested.emit();
  }

  /**
   * Elimina una categoria despues de confirmacion del usuario.
   * @param category Categoria a eliminar.
   */
  deleteCategory(category: Category): void {
    if (this.deletingCategoryId) return;
    if (!window.confirm(`Eliminar la categoría "${category.nombre}"?`)) return;

    this.deletingCategoryId = category.categoria_id;
    this.categoryFormError = '';
    this.categoryFormSuccess = '';

    this.categoryService.deleteCategory(category.categoria_id).subscribe({
      next: () => {
        this.deletingCategoryId = '';
        this.categoryFormSuccess = 'Categoría eliminada correctamente.';
        this.loadData();
      },
      error: () => {
        this.deletingCategoryId = '';
        this.categoryFormError = 'No se pudo eliminar la categoría.';
      },
    });
  }

  /**
   * Carga categorias y productos para poblar el panel administrativo.
   */
  private loadData(): void {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categoryListItems.set(categories);
      },
      error: () => {
        this.categoryListItems.set([]);
      },
    });

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
   * Normaliza textos para la busqueda administrativa de categorias.
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
