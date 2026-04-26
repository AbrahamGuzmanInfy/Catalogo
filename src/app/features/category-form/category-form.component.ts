import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import type { Category, CategoryUpsertPayload } from '../../core/models/category.model';
import { CategoryService } from '../../core/services/category.service';
import { MediaUploadService } from '../../core/services/media-upload.service';

@Component({
  selector: 'app-category-form',
  templateUrl: './category-form.component.html',
})
/**
 * Gestiona la captura y edición de categorías del catálogo.
 */
export class CategoryFormComponent implements OnChanges {
  private readonly categoryService = inject(CategoryService);
  private readonly mediaUploadService = inject(MediaUploadService);

  @Input() editingCategory: Category | null = null;
  @Output() back = new EventEmitter<void>();
  @Output() cancelEdit = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  public categoryFormName = '';
  public categoryFormOrder = '';
  public categoryFormImageUrl = '';
  public categoryFormLoading = false;
  public categoryUploadLoading = false;
  public categoryFormSuccess = '';
  public categoryFormError = '';
  public editingCategoryId = '';

  /**
   * Rehidrata el formulario cuando cambia la categoría en edición.
   * @param changes Cambios de inputs entregados por Angular.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editingCategory']) {
      this.hydrateFromInput();
    }
  }

  /**
   * Sincroniza el nombre de la categoría con el formulario.
   * @param event Evento input del campo nombre.
   */
  updateCategoryFormName(event: Event): void {
    this.categoryFormName = (event.target as HTMLInputElement).value;
  }

  /**
   * Sincroniza el orden de despliegue de la categoría.
   * @param event Evento input del campo orden.
   */
  updateCategoryFormOrder(event: Event): void {
    this.categoryFormOrder = (event.target as HTMLInputElement).value;
  }

  /**
   * Sube una imagen para la categoría actual.
   * @param event Evento change del selector de archivos.
   */
  async onCategoryImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.categoryUploadLoading = true;
    this.categoryFormError = '';

    try {
      this.categoryFormImageUrl = await this.mediaUploadService.uploadImage(file, 'categories');
    } catch {
      this.categoryFormError = 'No se pudo subir la imagen de la categoría.';
    } finally {
      this.categoryUploadLoading = false;
      input.value = '';
    }
  }

  /**
   * Crea o actualiza una categoría usando los datos del formulario.
   */
  submitCategory(): void {
    if (this.categoryFormLoading || this.categoryUploadLoading) return;

    const nombre = this.categoryFormName.trim();
    if (!nombre) {
      this.categoryFormError = 'Escribe el nombre de la categoría.';
      this.categoryFormSuccess = '';
      return;
    }

    this.categoryFormLoading = true;
    this.categoryFormError = '';
    this.categoryFormSuccess = '';

    const payload: CategoryUpsertPayload = {
      nombre,
      orden: Number(this.categoryFormOrder || 0),
      imagen_url: this.categoryFormImageUrl.trim(),
      activa: true,
    };

    const request$ = this.editingCategoryId
      ? this.categoryService.updateCategory(this.editingCategoryId, payload)
      : this.categoryService.createCategory(payload);

    const isEditing = Boolean(this.editingCategoryId);
    request$.subscribe({
      next: () => {
        this.categoryFormLoading = false;
        this.resetCategoryForm(false);
        this.categoryFormSuccess = isEditing ? 'Categoría actualizada correctamente.' : 'Categoría creada correctamente.';
        this.saved.emit();
      },
      error: () => {
        this.categoryFormLoading = false;
        this.categoryFormError = isEditing
          ? 'No se pudo actualizar la categoría. Intenta nuevamente.'
          : 'No se pudo crear la categoría. Intenta nuevamente.';
      },
    });
  }

  /**
   * Cancela la edición actual y limpia el formulario.
   */
  cancelEditCategory(): void {
    this.resetCategoryForm(false);
    this.categoryFormError = '';
    this.categoryFormSuccess = '';
    this.cancelEdit.emit();
  }

  /**
   * Copia los datos de la categoría en edición al formulario visual.
   */
  private hydrateFromInput(): void {
    if (!this.editingCategory) {
      this.resetCategoryForm(false);
      return;
    }

    const category = this.editingCategory;
    this.editingCategoryId = category.categoria_id;
    this.categoryFormName = category.nombre;
    this.categoryFormOrder = String(category.orden ?? 0);
    this.categoryFormImageUrl = category.imageUrl || '';
    this.categoryFormSuccess = '';
    this.categoryFormError = '';
  }

  /**
   * Restaura el formulario a su estado inicial.
   * @param emitCancel Indica si además debe notificarse la cancelación al contenedor.
   */
  private resetCategoryForm(emitCancel = true): void {
    this.categoryFormName = '';
    this.categoryFormOrder = '';
    this.categoryFormImageUrl = '';
    this.editingCategoryId = '';
    if (emitCancel) {
      this.cancelEdit.emit();
    }
  }
}
