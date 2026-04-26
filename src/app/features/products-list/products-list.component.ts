import { Component, EventEmitter, OnInit, Output, computed, inject, signal } from '@angular/core';
import type { Product, ProductUpsertPayload } from '../../core/models/product.model';
import { ProductService } from '../../core/services/product.service';
import { SearchBarComponent } from '../../shared/search-bar/search-bar.component';

@Component({
  selector: 'app-products-list',
  imports: [SearchBarComponent],
  templateUrl: './products-list.component.html',
})
/**
 * Administra la lista de productos con busqueda, edicion, eliminacion y activacion.
 */
export class ProductsListComponent implements OnInit {
  private readonly productService = inject(ProductService);

  @Output() back = new EventEmitter<void>();
  @Output() createRequested = new EventEmitter<void>();
  @Output() editRequested = new EventEmitter<Product>();

  public readonly productListItems = signal<Product[]>([]);
  public readonly productListSearchTerm = signal('');
  public readonly filteredProductsList = computed(() => {
    const term = this.normalizeSearch(this.productListSearchTerm());
    const products = this.productListItems();

    if (!term) return products;

    return products.filter((product) =>
      [product.name, product.slug, product.description]
        .filter((value): value is string => Boolean(value))
        .some((value) => this.normalizeSearch(value).includes(term)),
    );
  });

  public productFormSuccess = '';
  public productFormError = '';
  public deletingProductId = '';
  public togglingProductId = '';

  /**
   * Carga el inventario completo al abrir la vista administrativa.
   */
  ngOnInit(): void {
    this.loadProducts();
  }

  /**
   * Actualiza el termino de busqueda del inventario.
   * @param event Evento input emitido por la barra de busqueda.
   */
  updateProductListSearch(event: Event): void {
    this.productListSearchTerm.set((event.target as HTMLInputElement).value);
  }

  /**
   * Determina si un producto se encuentra activo en el catalogo.
   * @param product Producto evaluado.
   */
  isProductActive(product: Product): boolean {
    return String(product.activo ?? 'true').toLowerCase() === 'true';
  }

  /**
   * Solicita abrir el formulario para editar un producto.
   * @param product Producto seleccionado.
   */
  startEditProductFromList(product: Product): void {
    this.editRequested.emit(product);
  }

  /**
   * Solicita abrir el formulario para crear un producto nuevo.
   */
  openNewProductForm(): void {
    this.createRequested.emit();
  }

  /**
   * Elimina un producto despues de confirmacion del usuario.
   * @param product Producto a eliminar.
   */
  deleteProduct(product: Product): void {
    if (this.deletingProductId) return;
    if (!window.confirm(`Eliminar el producto "${product.name}"?`)) return;

    this.deletingProductId = product.producto_id;
    this.productFormError = '';
    this.productFormSuccess = '';

    this.productService.deleteProduct(product.producto_id).subscribe({
      next: () => {
        this.deletingProductId = '';
        this.productFormSuccess = 'Producto eliminado correctamente.';
        this.loadProducts();
      },
      error: () => {
        this.deletingProductId = '';
        this.productFormError = 'No se pudo eliminar el producto.';
      },
    });
  }

  /**
   * Activa o desactiva un producto existente.
   * @param product Producto a actualizar.
   */
  toggleProductActive(product: Product): void {
    if (this.togglingProductId) return;

    const nextActive = !this.isProductActive(product);
    this.togglingProductId = product.producto_id;
    this.productFormError = '';
    this.productFormSuccess = '';

    const payload: ProductUpsertPayload = {
      nombre: product.name,
      precio: this.priceToNumber(product.price),
      imagen_url: product.image,
      detalle_imagen_url: product.detailImage || product.image,
      descripcion: product.description,
      model3d_url: product.model3dUrl || '',
      orden: product.orden ?? 0,
      activo: nextActive,
      categoria_ids: product.categoriaIds ?? [],
    };

    this.productService.updateProduct(product.producto_id, payload).subscribe({
      next: () => {
        this.togglingProductId = '';
        this.productFormSuccess = nextActive ? 'Producto reactivado correctamente.' : 'Producto desactivado correctamente.';
        this.loadProducts();
      },
      error: () => {
        this.togglingProductId = '';
        this.productFormError = nextActive ? 'No se pudo reactivar el producto.' : 'No se pudo desactivar el producto.';
      },
    });
  }

  /**
   * Carga el inventario completo incluyendo productos inactivos.
   */
  private loadProducts(): void {
    this.productService.getProducts(true).subscribe({
      next: (products) => {
        this.productListItems.set(products);
      },
      error: () => {
        this.productListItems.set([]);
      },
    });
  }

  /**
   * Normaliza textos para el buscador administrativo de productos.
   * @param value Texto a normalizar.
   */
  private normalizeSearch(value: string): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  /**
   * Convierte un precio en texto a numero para enviarlo al backend.
   * @param price Precio textual del producto.
   */
  private priceToNumber(price: string): number {
    const value = Number(String(price).replace(/[^0-9.]/g, ''));
    return Number.isFinite(value) ? value : 0;
  }
}
