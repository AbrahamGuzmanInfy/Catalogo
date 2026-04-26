import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import type { Category } from '../../core/models/category.model';
import type { Product } from '../../core/models/product.model';
import { CategoryService } from '../../core/services/category.service';
import { ProductService } from '../../core/services/product.service';
import { ProductCardComponent } from '../../shared/product-card/product-card.component';

const RAMO_PRIMAVERA_MODEL_URL = '/models/ramo-primavera-mobile-draco.glb';

@Component({
  selector: 'app-catalog',
  imports: [ProductCardComponent],
  templateUrl: './catalog.component.html',
})
/**
 * Presenta el catalogo principal con productos filtrados por categoria y busqueda.
 */
export class CatalogComponent implements OnInit, OnChanges {
  private readonly categoryService = inject(CategoryService);
  private readonly productService = inject(ProductService);

  @Input() selectedCategoryId = '';
  @Input() productSearchTerm = '';
  @Output() selectedCategoryIdChange = new EventEmitter<string>();
  @Output() productSelected = new EventEmitter<Product>();
  @Output() productsLoaded = new EventEmitter<Product[]>();
  @Output() categoriesLoaded = new EventEmitter<Category[]>();

  public categories: Category[] = [];
  public products: Product[] = [];

  /**
   * Carga categorias y productos al iniciar la vista.
   */
  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  /**
   * Mantiene el contrato de cambios por input; el filtrado ya responde de forma reactiva.
   */
  ngOnChanges(_changes: SimpleChanges): void {
    // Input-driven filter only; no extra sync needed.
  }

  /**
   * Devuelve las categorias destacadas que se muestran como chips en home.
   */
  get homeCategories(): Category[] {
    return this.categories.slice(0, 4);
  }

  /**
   * Filtra productos por categoria seleccionada y termino de busqueda.
   */
  get filteredProducts(): Product[] {
    const term = this.normalizeSearch(this.productSearchTerm);
    let items = this.products;

    if (this.selectedCategoryId) {
      items = items.filter((product) => product.categoriaIds?.includes(this.selectedCategoryId));
    }

    if (!term) return items;

    return items.filter((product) =>
      [product.name, product.description, product.slug].some((value) =>
        this.normalizeSearch(value).includes(term),
      ),
    );
  }

  /**
   * Notifica al shell que debe abrir el detalle del producto seleccionado.
   * @param product Producto elegido por el usuario.
   */
  showProduct(product: Product): void {
    this.productSelected.emit(product);
  }

  /**
   * Carga la lista de categorias disponibles para el catalogo.
   */
  private loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.categoriesLoaded.emit(categories);
      },
      error: () => {
        this.categories = [];
        this.categoriesLoaded.emit([]);
      },
    });
  }

  /**
   * Carga los productos visibles y aplica fallbacks locales de modelo 3D.
   */
  private loadProducts(): void {
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products = this.withModelFallbacks(products);
        this.productsLoaded.emit(this.products);
      },
      error: () => {
        this.products = [];
        this.productsLoaded.emit([]);
      },
    });
  }

  /**
   * Completa modelos 3D faltantes para productos que tienen un fallback conocido.
   * @param products Productos recibidos desde backend.
   */
  private withModelFallbacks(products: Product[]): Product[] {
    return products.map((product) => {
      if (product.model3dUrl || product.slug !== 'ramo-primavera') return product;
      return { ...product, model3dUrl: RAMO_PRIMAVERA_MODEL_URL };
    });
  }

  /**
   * Normaliza textos para comparaciones de busqueda sin acentos ni diferencias de mayusculas.
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
