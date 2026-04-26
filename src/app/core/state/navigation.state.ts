import { Injectable } from '@angular/core';
import type { View } from '../models/navigation.model';
import type { Product } from '../models/product.model';

/**
 * Interpreta el hash actual de la URL y lo traduce a una vista válida de la app.
 */
function viewFromHash(): View {
  if (window.location.hash.startsWith('#producto-')) return 'detail';
  if (window.location.hash === '#categorias') return 'categories';
  if (window.location.hash === '#carrito') return 'cart';
  if (window.location.hash === '#perfil') return 'profile';
  if (window.location.hash === '#pedidos') return 'orders';
  if (window.location.hash === '#productos-list') return 'products';
  if (window.location.hash === '#categorias-list') return 'category-list';
  if (window.location.hash === '#agregar-producto') return 'add-product';
  if (window.location.hash === '#agregar-categoria') return 'add-category';
  return 'home';
}

/**
 * Devuelve el hash correspondiente a una vista navegable distinta del detalle.
 * @param view Vista destino solicitada.
 */
function hashForView(view: Exclude<View, 'detail'>): string {
  if (view === 'categories') return '#categorias';
  if (view === 'cart') return '#carrito';
  if (view === 'profile') return '#perfil';
  if (view === 'orders') return '#pedidos';
  if (view === 'products') return '#productos-list';
  if (view === 'category-list') return '#categorias-list';
  if (view === 'add-product') return '#agregar-producto';
  if (view === 'add-category') return '#agregar-categoria';
  return window.location.pathname;
}

/**
 * Coordina la navegación central de Bloomy basada en estados y hash de URL.
 */
@Injectable({ providedIn: 'root' })
export class NavigationState {
  public activeView: View = viewFromHash();
  public selectedProduct: Product | null = null;
  public selectedCategoryId = '';
  private detailReturnView: Exclude<View, 'detail'> = 'home';

  /**
   * Expone la vista a la que debe volver el detalle de producto.
   */
  get currentDetailReturnView(): Exclude<View, 'detail'> {
    return this.detailReturnView;
  }

  /**
   * Selecciona un producto a partir del slug presente en la URL.
   * @param products Lista de productos ya cargada por el catálogo.
   */
  selectProductFromHash(products: Product[]): void {
    if (!window.location.hash.startsWith('#producto-')) return;
    const slug = window.location.hash.replace('#producto-', '');
    this.selectedProduct = products.find((product) => product.slug === slug) ?? products[0] ?? null;
  }

  /**
   * Abre el detalle de un producto y sincroniza la URL.
   * @param product Producto seleccionado por el usuario.
   * @param returnView Vista desde la cual se abrió el detalle.
   */
  showProduct(product: Product, returnView: Exclude<View, 'detail'> = 'home'): void {
    this.detailReturnView = returnView;
    this.selectedProduct = product;
    this.activeView = 'detail';
    window.history.replaceState(null, '', `#producto-${product.slug || product.producto_id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Regresa desde detalle hacia la vista previa registrada.
   */
  showDetailBack(): void {
    this.showView(this.detailReturnView);
  }

  /**
   * Cambia la vista activa, actualiza el hash y lleva el scroll al inicio.
   * @param view Vista destino.
   * @param event Evento opcional de navegación para cancelar el comportamiento nativo.
   */
  showView(view: Exclude<View, 'detail'>, event?: Event): void {
    event?.preventDefault();
    this.selectedProduct = null;
    this.activeView = view;
    window.history.replaceState(null, '', hashForView(view));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Actualiza la categoría actualmente seleccionada para el catálogo.
   * @param categoryId Identificador de la categoría activa.
   */
  setSelectedCategory(categoryId: string): void {
    this.selectedCategoryId = categoryId;
  }

  /**
   * Guarda una categoría y abre el catálogo para mostrarla filtrada.
   * @param categoryId Identificador de la categoría elegida desde la vista de categorías.
   */
  openCategory(categoryId: string): void {
    this.selectedCategoryId = categoryId;
    this.showView('home');
  }
}
