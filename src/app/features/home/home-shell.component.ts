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

const INSTALL_DISMISSED_KEY = 'petal-install-dismissed-session';
const IOS_INSTALL_DISMISSED_KEY = 'petal-ios-install-dismissed-session';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

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
  public showInstallPrompt = false;
  public canInstallApp = false;
  public isIosInstallHelp = false;

  private deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
  private readonly zoomCleanupCallbacks: Array<() => void> = [];

  /**
   * Indica si el header debe mostrar controles extra para la vista activa.
   */
  get headerHasTools(): boolean {
    return this.navigation.activeView === 'home' || this.navigation.activeView === 'categories';
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
    this.setupInstallPrompt();
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
   * Navega a la pantalla de recuperacion de contraseña.
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
   * Cierra la sesion actual y devuelve al login dentro del perfil.
   */
  async signOut(): Promise<void> {
    await this.session.signOut();
    this.navigation.showView('profile');
  }

  /**
   * Dispara el prompt de instalacion cuando el navegador lo permite.
   */
  async installApp(): Promise<void> {
    if (!this.deferredInstallPrompt) return;

    const promptEvent = this.deferredInstallPrompt;
    this.deferredInstallPrompt = null;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    this.dismissInstallPrompt();
  }

  /**
   * Oculta el banner de instalacion y persiste su descarte.
   */
  dismissInstallPrompt(): void {
    this.showInstallPrompt = false;
    this.canInstallApp = false;
    this.deferredInstallPrompt = null;
    if (this.isIosInstallHelp) {
      this.markIosInstallPromptDismissed();
    } else {
      this.markInstallPromptDismissed();
    }
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

  private setupInstallPrompt(): void {
    if (this.isStandaloneMode()) return;

    this.isIosInstallHelp = this.isIosDevice();
    if (this.isIosInstallHelp) {
      this.showInstallPrompt = !this.wasIosInstallPromptDismissed();
    } else if (this.wasInstallPromptDismissed()) {
      return;
    }

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredInstallPrompt = event as BeforeInstallPromptEvent;
      this.canInstallApp = true;
      this.showInstallPrompt = true;
    });

    window.addEventListener('appinstalled', () => {
      this.dismissInstallPrompt();
    });
  }

  private isStandaloneMode(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  }

  private wasInstallPromptDismissed(): boolean {
    try {
      return sessionStorage.getItem(INSTALL_DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private markInstallPromptDismissed(): void {
    try {
      sessionStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
    } catch {
      // Ignore storage issues.
    }
  }

  private wasIosInstallPromptDismissed(): boolean {
    try {
      return sessionStorage.getItem(IOS_INSTALL_DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private markIosInstallPromptDismissed(): void {
    try {
      sessionStorage.setItem(IOS_INSTALL_DISMISSED_KEY, 'true');
    } catch {
      // Ignore storage issues.
    }
  }

  private isIosDevice(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    const touchPoints = navigator.maxTouchPoints || 0;

    return /iphone|ipad|ipod/.test(userAgent) || (platform === 'macintel' && touchPoints > 1);
  }
}
