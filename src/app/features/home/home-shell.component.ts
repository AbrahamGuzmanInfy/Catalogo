import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import type { Category } from '../../core/models/category.model';
import type { Product } from '../../core/models/product.model';
import { CartState } from '../../core/state/cart.state';
import { NavigationState } from '../../core/state/navigation.state';
import { SessionState } from '../../core/state/session.state';
import { ProductDetailComponent } from '../product-detail/product-detail.component';
import { AppBottomNavComponent } from '../../shared/app-bottom-nav/app-bottom-nav.component';
import { AppHeaderComponent } from '../../shared/app-header/app-header.component';
import { CategoryChipListComponent } from '../../shared/category-chip-list/category-chip-list.component';
import { SearchBarComponent } from '../../shared/search-bar/search-bar.component';
import { AuthConfirmSignUpComponent } from '../auth-confirm-sign-up/auth-confirm-sign-up.component';
import { AuthLoginComponent } from '../auth-login/auth-login.component';
import { AuthPasswordResetComponent } from '../auth-password-reset/auth-password-reset.component';
import { AuthRegisterComponent } from '../auth-register/auth-register.component';
import { CartComponent } from '../cart/cart.component';
import { CategoriesComponent } from '../categories/categories.component';
import { CatalogComponent } from '../catalog/catalog.component';
import { CategoriesListComponent } from '../categories-list/categories-list.component';
import { CategoryFormComponent } from '../category-form/category-form.component';
import { ProductFormComponent } from '../product-form/product-form.component';
import { ProductsListComponent } from '../products-list/products-list.component';
import { OrdersComponent } from '../orders/orders.component';
import { UserComponent } from '../user/user.component';

@Component({
  selector: 'app-home-shell',
  imports: [
    AppHeaderComponent,
    AppBottomNavComponent,
    SearchBarComponent,
    CategoryChipListComponent,
    AuthLoginComponent,
    AuthRegisterComponent,
    AuthConfirmSignUpComponent,
    AuthPasswordResetComponent,
    CatalogComponent,
    CategoriesComponent,
    CartComponent,
    UserComponent,
    OrdersComponent,
    ProductsListComponent,
    CategoriesListComponent,
    ProductFormComponent,
    CategoryFormComponent,
    ProductDetailComponent,
  ],
  templateUrl: './home-shell.component.html',
})
/**
 * Orquesta el layout principal de la app y la navegacion entre features.
 */
export class HomeShellComponent implements OnInit, OnDestroy {
  public readonly navigation = inject(NavigationState);
  public readonly session = inject(SessionState);
  public readonly cart = inject(CartState);

  public editingProduct: Product | null = null;
  public editingCategory: Category | null = null;
  public homeCategories: Category[] = [];
  public homeProductSearchTerm = '';
  public categoriesSearchTerm = '';

  private readonly zoomCleanupCallbacks: Array<() => void> = [];

  /**
   * Indica si el header debe mostrar controles extra para la vista activa.
   */
  get headerHasTools(): boolean {
    return this.navigation.activeView === 'home' || this.navigation.activeView === 'categories';
  }

  /**
   * Indica si la vista activa corresponde al flujo de autenticacion
   * y debe mostrarse sin header global ni barra inferior.
   */
  get isAuthView(): boolean {
    return (
      (this.navigation.activeView === 'profile' && !this.session.isAuthenticated)
      || this.navigation.activeView === 'register'
      || this.navigation.activeView === 'confirm-sign-up'
      || this.navigation.activeView === 'reset-password'
    );
  }

  /**
   * Indica si la vista actual muestra barra de busqueda en el header.
   */
  get headerHasSearch(): boolean {
    return this.navigation.activeView === 'home' || this.navigation.activeView === 'categories';
  }

  /**
   * Indica si la vista actual muestra chips de categoria en el header.
   */
  get headerHasCategoryChips(): boolean {
    return this.navigation.activeView === 'home';
  }

  /**
   * Inicializa bloqueos de zoom e integra la deteccion de instalacion PWA.
   */
  ngOnInit(): void {
    this.disableBrowserZoom();
  }

  /**
   * Libera listeners registrados por el shell al destruirse.
   */
  ngOnDestroy(): void {
    this.zoomCleanupCallbacks.forEach((cleanup) => cleanup());
    this.zoomCleanupCallbacks.length = 0;
  }

  /**
   * Reintenta seleccionar un producto a partir del hash de la URL.
   * @param products Productos ya cargados por el catalogo.
   */
  selectProductFromHash(products: Product[]): void {
    this.navigation.selectProductFromHash(products);
  }

  /**
   * Actualiza las categorias visibles en los chips del header de home.
   * @param categories Categorias cargadas por el catalogo.
   */
  updateHomeCategories(categories: Category[]): void {
    this.homeCategories = categories.slice(0, 4);
  }

  /**
   * Actualiza la busqueda global de home desde el header.
   * @param event Evento input emitido por la barra de busqueda.
   */
  updateHomeProductSearch(event: Event): void {
    this.homeProductSearchTerm = (event.target as HTMLInputElement).value;
  }

  /**
   * Actualiza la busqueda global de categorias desde el header.
   * @param event Evento input emitido por la barra de busqueda.
   */
  updateCategoriesSearch(event: Event): void {
    this.categoriesSearchTerm = (event.target as HTMLInputElement).value;
  }

  /**
   * Alterna la categoria seleccionada dentro del home.
   * @param category Categoria elegida desde la fila de chips.
   */
  selectHomeCategory(category: Category): void {
    const categoryId = category.categoria_id;
    this.navigation.setSelectedCategory(this.navigation.selectedCategoryId === categoryId ? '' : categoryId);
  }

  /**
   * Navega a la pantalla de registro.
   */
  openRegister(): void {
    this.session.clearAuthError();
    this.navigation.showView('register');
  }

  /**
   * Navega a la pantalla de inicio de sesion.
   */
  openLogin(): void {
    this.session.clearAuthError();
    this.navigation.showView('profile');
  }

  /**
   * Navega a la pantalla de confirmacion de cuenta.
   */
  openConfirmation(): void {
    this.session.clearAuthError();
    this.navigation.showView('confirm-sign-up');
  }

  /**
   * Navega a la pantalla de recuperacion de contrase�a.
   */
  openPasswordReset(): void {
    this.session.clearAuthError();
    this.navigation.showView('reset-password');
  }

  /**
   * Navega a pedidos si existe sesion autenticada; de lo contrario abre login.
   */
  openOrders(): void {
    if (!this.session.isAuthenticated) {
      this.openLogin();
      return;
    }

    this.navigation.showView('orders');
  }

  /**
   * Abre la administracion de productos si el usuario tiene permisos.
   */
  openProductsList(): void {
    if (!this.session.isOwnerRole) {
      this.navigation.showView('profile');
      return;
    }

    this.editingProduct = null;
    this.navigation.showView('products');
  }

  /**
   * Abre la administracion de categorias si el usuario tiene permisos.
   */
  openCategoryList(): void {
    if (!this.session.isOwnerRole) {
      this.navigation.showView('profile');
      return;
    }

    this.editingCategory = null;
    this.navigation.showView('category-list');
  }

  /**
   * Prepara el flujo de edicion de un producto y navega al formulario.
   * @param product Producto seleccionado para edicion.
   */
  startEditProduct(product: Product): void {
    this.editingProduct = product;
    this.navigation.showView('add-product');
  }

  /**
   * Abre el formulario para crear un producto nuevo.
   */
  openNewProductForm(): void {
    this.editingProduct = null;
    this.navigation.showView('add-product');
  }

  /**
   * Limpia el contexto de edicion de producto sin cambiar de vista.
   */
  cancelProductEdit(): void {
    this.editingProduct = null;
  }

  /**
   * Limpia el contexto de edicion tras guardar un producto.
   */
  onProductSaved(): void {
    this.editingProduct = null;
    this.navigation.showView('products');
  }

  /**
   * Prepara el flujo de edicion de una categoria y navega al formulario.
   * @param category Categoria seleccionada para edicion.
   */
  startEditCategory(category: Category): void {
    this.editingCategory = category;
    this.navigation.showView('add-category');
  }

  /**
   * Abre el formulario para crear una categoria nueva.
   */
  openNewCategoryForm(): void {
    this.editingCategory = null;
    this.navigation.showView('add-category');
  }

  /**
   * Limpia el contexto de edicion de categoria sin cambiar de vista.
   */
  cancelCategoryEdit(): void {
    this.editingCategory = null;
  }

  /**
   * Limpia el contexto de edicion tras guardar una categoria.
   */
  onCategorySaved(): void {
    this.editingCategory = null;
    this.navigation.showView('category-list');
  }

  /**
   * Cierra el modal de confirmacion de producto agregado.
   */
  closeAddedProductModal(): void {
    this.cart.closeAddedProductModal();
  }

  /**
   * Cierra el modal y lleva al usuario de vuelta al home.
   */
  returnHomeFromAddedProductModal(): void {
    this.cart.closeAddedProductModal();
    this.navigation.showView('home');
  }

  /**
   * Lleva al usuario al carrito desde el modal de confirmacion.
   */
  openCartFromAddedProductModal(): void {
    this.cart.closeAddedProductModal();
    this.navigation.showView('cart');
  }

  /**
   * Cierra la sesion actual y devuelve al login dentro del perfil.
   */
  async signOut(): Promise<void> {
    await this.session.signOut();
    this.navigation.showView('profile');
  }

  private disableBrowserZoom(): void {
    let lastTouchEnd = 0;

    this.addZoomBlocker(document, 'gesturestart', (event) => event.preventDefault());
    this.addZoomBlocker(document, 'gesturechange', (event) => event.preventDefault());
    this.addZoomBlocker(document, 'gestureend', (event) => event.preventDefault());

    this.addZoomBlocker(document, 'touchstart', (event) => {
      const touchEvent = event as TouchEvent;
      if (touchEvent.touches.length > 1) touchEvent.preventDefault();
    });

    this.addZoomBlocker(document, 'touchmove', (event) => {
      const touchEvent = event as TouchEvent;
      if (touchEvent.touches.length > 1) event.preventDefault();
    });

    this.addZoomBlocker(document, 'touchend', (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) event.preventDefault();
      lastTouchEnd = now;
    });

    this.addZoomBlocker(window, 'wheel', (event) => {
      const wheelEvent = event as WheelEvent;
      if (wheelEvent.ctrlKey || wheelEvent.metaKey) wheelEvent.preventDefault();
    });

    this.addZoomBlocker(window, 'keydown', (event) => {
      const keyboardEvent = event as KeyboardEvent;
      const key = keyboardEvent.key.toLowerCase();
      const isZoomKey = key === '+' || key === '-' || key === '=' || key === '0';
      if ((keyboardEvent.ctrlKey || keyboardEvent.metaKey) && isZoomKey) keyboardEvent.preventDefault();
    });
  }

  private addZoomBlocker(target: EventTarget, eventName: string, handler: EventListener): void {
    const options: AddEventListenerOptions = { passive: false, capture: true };
    target.addEventListener(eventName, handler, options);
    this.zoomCleanupCallbacks.push(() => target.removeEventListener(eventName, handler, options));
  }

}
