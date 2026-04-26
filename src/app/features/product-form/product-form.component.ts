import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import type { Category } from '../../core/models/category.model';
import type { Product, ProductUpsertPayload } from '../../core/models/product.model';
import { CategoryService } from '../../core/services/category.service';
import { MediaUploadService } from '../../core/services/media-upload.service';
import { ProductService } from '../../core/services/product.service';

@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
})
/**
 * Gestiona la creación y edición de productos del catálogo.
 */
export class ProductFormComponent implements OnInit, OnChanges {
  private readonly categoryService = inject(CategoryService);
  private readonly mediaUploadService = inject(MediaUploadService);
  private readonly productService = inject(ProductService);

  @Input() editingProduct: Product | null = null;
  @Output() back = new EventEmitter<void>();
  @Output() cancelEdit = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  public categories: Category[] = [];
  public productFormName = '';
  public productFormPrice = '';
  public productFormImageUrl = '';
  public productFormDetailImageUrl = '';
  public productFormDescription = '';
  public productFormModel3dUrl = '';
  public productFormOrder = '';
  public productFormCategoryIds: string[] = [];
  public productFormLoading = false;
  public productImageUploadLoading = false;
  public productDetailUploadLoading = false;
  public productFormSuccess = '';
  public productFormError = '';
  public editingProductId = '';

  /**
   * Carga categorías y rehidrata el formulario si existe un producto en edición.
   */
  ngOnInit(): void {
    this.loadCategories();
    this.hydrateFromInput();
  }

  /**
   * Rehidrata el formulario cuando cambia el producto en edición.
   * @param changes Cambios de inputs entregados por Angular.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editingProduct']) {
      this.hydrateFromInput();
    }
  }

  /**
   * Sincroniza el nombre del producto con el formulario.
   * @param event Evento input del campo nombre.
   */
  updateProductFormName(event: Event): void {
    this.productFormName = (event.target as HTMLInputElement).value;
  }

  /**
   * Sincroniza el precio del producto con el formulario.
   * @param event Evento input del campo precio.
   */
  updateProductFormPrice(event: Event): void {
    this.productFormPrice = (event.target as HTMLInputElement).value;
  }

  /**
   * Sincroniza la descripción del producto.
   * @param event Evento input del textarea de descripción.
   */
  updateProductFormDescription(event: Event): void {
    this.productFormDescription = (event.target as HTMLTextAreaElement).value;
  }

  /**
   * Sincroniza la URL del modelo 3D asociada al producto.
   * @param event Evento input del campo modelo 3D.
   */
  updateProductFormModel3dUrl(event: Event): void {
    this.productFormModel3dUrl = (event.target as HTMLInputElement).value;
  }

  /**
   * Sincroniza el orden de despliegue del producto.
   * @param event Evento input del campo orden.
   */
  updateProductFormOrder(event: Event): void {
    this.productFormOrder = (event.target as HTMLInputElement).value;
  }

  /**
   * Indica si una categoría está seleccionada dentro del formulario.
   * @param categoryId Identificador de la categoría consultada.
   */
  isProductCategorySelected(categoryId: string): boolean {
    return this.productFormCategoryIds.includes(categoryId);
  }

  /**
   * Alterna la asociación de una categoría con el producto actual.
   * @param categoryId Identificador de la categoría a alternar.
   */
  toggleProductCategory(categoryId: string): void {
    if (this.productFormCategoryIds.includes(categoryId)) {
      this.productFormCategoryIds = this.productFormCategoryIds.filter((item) => item !== categoryId);
      return;
    }

    this.productFormCategoryIds = [...this.productFormCategoryIds, categoryId];
  }

  /**
   * Sube y asigna la imagen principal del producto.
   * @param event Evento change del selector de archivos principal.
   */
  async onProductMainImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.productImageUploadLoading = true;
    this.productFormError = '';

    try {
      const uploadedUrl = await this.mediaUploadService.uploadImage(file, 'products');
      this.productFormImageUrl = uploadedUrl;
      if (!this.productFormDetailImageUrl.trim()) {
        this.productFormDetailImageUrl = uploadedUrl;
      }
    } catch {
      this.productFormError = 'No se pudo subir la imagen principal.';
    } finally {
      this.productImageUploadLoading = false;
      input.value = '';
    }
  }

  /**
   * Sube y asigna la imagen de detalle del producto.
   * @param event Evento change del selector de archivos de detalle.
   */
  async onProductDetailImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.productDetailUploadLoading = true;
    this.productFormError = '';

    try {
      this.productFormDetailImageUrl = await this.mediaUploadService.uploadImage(file, 'products');
    } catch {
      this.productFormError = 'No se pudo subir la imagen detalle.';
    } finally {
      this.productDetailUploadLoading = false;
      input.value = '';
    }
  }

  /**
   * Crea o actualiza un producto según el contexto actual del formulario.
   */
  submitProduct(): void {
    if (this.productFormLoading || this.productImageUploadLoading || this.productDetailUploadLoading) return;

    const nombre = this.productFormName.trim();
    const imagenUrl = this.productFormImageUrl.trim();
    const descripcion = this.productFormDescription.trim();
    const precio = Number(this.productFormPrice || 0);

    if (!nombre) {
      this.productFormError = 'Escribe el nombre del producto.';
      this.productFormSuccess = '';
      return;
    }

    if (!imagenUrl) {
      this.productFormError = 'Agrega la imagen principal del producto.';
      this.productFormSuccess = '';
      return;
    }

    if (!descripcion) {
      this.productFormError = 'Agrega una descripción del producto.';
      this.productFormSuccess = '';
      return;
    }

    if (!Number.isFinite(precio) || precio <= 0) {
      this.productFormError = 'El precio debe ser mayor a 0.';
      this.productFormSuccess = '';
      return;
    }

    this.productFormLoading = true;
    this.productFormError = '';
    this.productFormSuccess = '';

    const payload: ProductUpsertPayload = {
      nombre,
      precio,
      imagen_url: imagenUrl,
      detalle_imagen_url: this.productFormDetailImageUrl.trim() || imagenUrl,
      descripcion,
      model3d_url: this.productFormModel3dUrl.trim(),
      orden: Number(this.productFormOrder || 0),
      activo: true,
    };

    const request$ = this.editingProductId
      ? this.productService.updateProduct(this.editingProductId, {
          ...payload,
          categoria_ids: this.productFormCategoryIds,
        })
      : this.productService.createProduct(payload);

    request$.subscribe({
      next: (product) => {
        if (this.editingProductId) {
          this.handleProductSaved(product, true);
          return;
        }

        const categoryIds = [...this.productFormCategoryIds];
        if (!categoryIds.length) {
          this.handleProductSaved(product);
          return;
        }

        this.productService.linkProductCategories(product.producto_id, categoryIds).subscribe({
          next: () => this.handleProductSaved(product),
          error: () => {
            this.productFormLoading = false;
            this.productFormError = 'El producto se creó, pero no se pudieron guardar sus categorías.';
          },
        });
      },
      error: () => {
        this.productFormLoading = false;
        this.productFormError = this.editingProductId
          ? 'No se pudo actualizar el producto. Intenta nuevamente.'
          : 'No se pudo crear el producto. Intenta nuevamente.';
      },
    });
  }

  /**
   * Cancela la edición actual y devuelve el formulario a estado limpio.
   */
  cancelEditProduct(): void {
    this.resetProductForm(false);
    this.productFormError = '';
    this.productFormSuccess = '';
    this.cancelEdit.emit();
  }

  /**
   * Ejecuta la limpieza posterior a una creación o actualización exitosa.
   * @param product Producto devuelto por backend.
   * @param updated Indica si la operación fue una actualización.
   */
  private handleProductSaved(product: Product, updated = false): void {
    this.productFormLoading = false;
    this.resetProductForm(false);
    this.productFormSuccess = updated
      ? `${product.name} se actualizó correctamente.`
      : `${product.name} se agregó correctamente.`;
    this.saved.emit();
  }

  /**
   * Carga las categorías disponibles para el selector del formulario.
   */
  private loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: () => {
        this.categories = [];
      },
    });
  }

  /**
   * Copia el producto en edición al estado visual del formulario.
   */
  private hydrateFromInput(): void {
    if (!this.editingProduct) {
      this.resetProductForm(false);
      return;
    }

    const product = this.editingProduct;
    this.editingProductId = product.producto_id;
    this.productFormName = product.name;
    this.productFormPrice = String(this.priceToNumber(product.price));
    this.productFormImageUrl = product.image;
    this.productFormDetailImageUrl = product.detailImage || product.image;
    this.productFormDescription = product.description;
    this.productFormModel3dUrl = product.model3dUrl || '';
    this.productFormOrder = String(product.orden ?? 0);
    this.productFormCategoryIds = [...(product.categoriaIds ?? [])];
    this.productFormSuccess = '';
    this.productFormError = '';
  }

  /**
   * Limpia todos los campos del formulario.
   * @param emitCancel Indica si además debe notificarse cancelación al contenedor.
   */
  private resetProductForm(emitCancel = true): void {
    this.productFormName = '';
    this.productFormPrice = '';
    this.productFormImageUrl = '';
    this.productFormDetailImageUrl = '';
    this.productFormDescription = '';
    this.productFormModel3dUrl = '';
    this.productFormOrder = '';
    this.productFormCategoryIds = [];
    this.editingProductId = '';
    if (emitCancel) {
      this.cancelEdit.emit();
    }
  }

  /**
   * Convierte un precio en texto a número para validación y envío.
   * @param price Precio textual capturado o mostrado.
   */
  private priceToNumber(price: string): number {
    const value = Number(String(price).replace(/[^0-9.]/g, ''));
    return Number.isFinite(value) ? value : 0;
  }
}
