import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';
import { ProductDetailComponent } from './product-detail/product-detail';

type View = 'home' | 'detail' | 'categories' | 'cart' | 'profile' | 'orders' | 'products' | 'category-admin' | 'add-product' | 'add-category';

const API_BASE_URL = 'https://hs5rkunm27jueyzgyhqliykv7u0sizsx.lambda-url.us-east-2.on.aws';
const RAMO_PRIMAVERA_MODEL_URL = '/models/ramo-primavera-mobile-draco.glb';
const INSTALL_DISMISSED_KEY = 'petal-install-dismissed-session';
const IOS_INSTALL_DISMISSED_KEY = 'petal-ios-install-dismissed-session';
const DEDICATION_MAX_LENGTH = 160;
const TEST_USER_ROLE_KEY = 'petal-test-user-role';

type TestRole = 'dueno' | 'cliente';

type TestUser = {
  usuario_id: string;
  nombre: string;
  rol: TestRole;
  email: string;
};

const TEST_USERS: Record<TestRole, TestUser> = {
  dueno: {
    usuario_id: '1',
    nombre: 'Dueno Demo',
    rol: 'dueno',
    email: 'dueno@petalco.test',
  },
  cliente: {
    usuario_id: '2',
    nombre: 'Cliente Demo',
    rol: 'cliente',
    email: 'cliente@petalco.test',
  },
};

function viewFromHash(): View {
  if (window.location.hash.startsWith('#producto-')) return 'detail';
  if (window.location.hash === '#categorias') return 'categories';
  if (window.location.hash === '#carrito') return 'cart';
  if (window.location.hash === '#perfil') return 'profile';
  if (window.location.hash === '#pedidos') return 'orders';
  if (window.location.hash === '#productos-admin') return 'products';
  if (window.location.hash === '#categorias-admin') return 'category-admin';
  if (window.location.hash === '#agregar-producto') return 'add-product';
  if (window.location.hash === '#agregar-categoria') return 'add-category';
  return 'home';
}

function hashForView(view: Exclude<View, 'detail'>): string {
  if (view === 'categories') return '#categorias';
  if (view === 'cart') return '#carrito';
  if (view === 'profile') return '#perfil';
  if (view === 'orders') return '#pedidos';
  if (view === 'products') return '#productos-admin';
  if (view === 'category-admin') return '#categorias-admin';
  if (view === 'add-product') return '#agregar-producto';
  if (view === 'add-category') return '#agregar-categoria';
  return window.location.pathname;
}

type Category = {
  categoria_id: string;
  nombre: string;
  slug: string;
  activa: string;
  orden: number;
  imageUrl?: string;
};

type CategoriesResponse = {
  items: Category[];
};

type Product = {
  producto_id: string;
  name: string;
  price: string;
  image: string;
  detailImage: string;
  alt: string;
  description: string;
  slug: string;
  model3dUrl?: string;
  categoriaIds?: string[];
  activo?: string;
  orden?: number;
};

type ProductsResponse = {
  items: Product[];
};

type CartItem = {
  product: Product;
  quantity: number;
  dedication?: string;
};

type CreateVentaResponse = {
  venta_id: string;
  estatus: string;
  total: number;
};

type VentaDetalle = {
  venta_detalle_id?: string;
  venta_id?: string;
  detalle_id?: string;
  producto_id?: string;
  nombre?: string;
  nombre_producto?: string;
  cantidad?: number;
  precio_unitario?: number;
  descuento?: number;
  subtotal?: number;
  dedicatoria?: string;
};

type Venta = {
  venta_id: string;
  usuario_id: string;
  estatus: string;
  items_count?: number;
  items: VentaDetalle[];
  subtotal: number;
  descuento: number;
  envio: number;
  impuestos: number;
  total: number;
  moneda: string;
  metodo_entrega: string;
  metodo_pago: string;
  fecha_entrega: string;
  created_at: string;
  updated_at: string;
  detailsLoaded?: boolean;
};

type VentasResponse = {
  items: Venta[];
};

type CreateCategoryResponse = Category;
type CreateProductResponse = Product;

type PresignUploadResponse = {
  uploadUrl: string;
  fileUrl: string;
  key: string;
  bucket: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

@Component({
  selector: 'app-root',
  imports: [ProductDetailComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);

  protected categories: Category[] = [];
  protected categoriesError = '';
  protected products: Product[] = [];
  protected adminProducts: Product[] = [];
  protected productsError = '';
  protected productSearchTerm = '';
  protected adminProductSearchTerm = '';
  protected categorySearchTerm = '';
  protected adminCategorySearchTerm = '';
  protected selectedCategoryId = '';
  protected cartItems: CartItem[] = [];
  protected checkoutLoading = false;
  protected checkoutError = '';
  protected checkoutSuccess = '';
  protected orders: Venta[] = [];
  protected ordersLoading = false;
  protected ordersError = '';
  protected expandedOrderIds = new Set<string>();
  protected loadingOrderIds = new Set<string>();
  protected dedicationPanelOpen = false;
  protected dedicationDraft = '';
  protected dedicationProduct: Product | null = null;
  protected readonly dedicationMaxLength = DEDICATION_MAX_LENGTH;
  protected categoryFormName = '';
  protected categoryFormOrder = '';
  protected categoryFormImageUrl = '';
  protected categoryFormLoading = false;
  protected categoryUploadLoading = false;
  protected categoryFormSuccess = '';
  protected categoryFormError = '';
  protected editingCategoryId = '';
  protected deletingCategoryId = '';
  protected productFormName = '';
  protected productFormPrice = '';
  protected productFormImageUrl = '';
  protected productFormDetailImageUrl = '';
  protected productFormDescription = '';
  protected productFormModel3dUrl = '';
  protected productFormOrder = '';
  protected productFormCategoryIds: string[] = [];
  protected productFormLoading = false;
  protected productImageUploadLoading = false;
  protected productDetailUploadLoading = false;
  protected productFormSuccess = '';
  protected productFormError = '';
  protected editingProductId = '';
  protected deletingProductId = '';
  protected togglingProductId = '';
  protected currentTestRole: TestRole = 'dueno';
  private readonly productDedications = new Map<string, string>();
  protected showInstallPrompt = false;
  protected canInstallApp = false;
  protected isIosInstallHelp = false;
  private deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
  private readonly zoomCleanupCallbacks: Array<() => void> = [];

  protected readonly shippingAmount = 5;

  protected activeView: View = viewFromHash();
  protected selectedProduct: Product | null = null;
  private detailReturnView: Exclude<View, 'detail'> = 'home';

  ngOnInit(): void {
    this.restoreCurrentTestRole();
    this.disableBrowserZoom();
    this.loadCategories();
    this.loadProducts();
    this.setupInstallPrompt();
  }

  ngOnDestroy(): void {
    this.zoomCleanupCallbacks.forEach((cleanup) => cleanup());
    this.zoomCleanupCallbacks.length = 0;
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

  private restoreCurrentTestRole(): void {
    try {
      const stored = localStorage.getItem(TEST_USER_ROLE_KEY);
      if (stored === 'dueno' || stored === 'cliente') {
        this.currentTestRole = stored;
      }
    } catch {
      this.currentTestRole = 'dueno';
    }
  }

  private persistCurrentTestRole(): void {
    try {
      localStorage.setItem(TEST_USER_ROLE_KEY, this.currentTestRole);
    } catch {
      // Ignore storage issues.
    }
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
      this.changeDetector.detectChanges();
    });

    window.addEventListener('appinstalled', () => {
      this.dismissInstallPrompt();
    });
  }

  protected async installApp(): Promise<void> {
    if (!this.deferredInstallPrompt) return;

    const promptEvent = this.deferredInstallPrompt;
    this.deferredInstallPrompt = null;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    this.dismissInstallPrompt();
  }

  protected dismissInstallPrompt(): void {
    this.showInstallPrompt = false;
    this.canInstallApp = false;
    this.deferredInstallPrompt = null;
    if (this.isIosInstallHelp) {
      this.markIosInstallPromptDismissed();
    } else {
      this.markInstallPromptDismissed();
    }
    this.changeDetector.detectChanges();
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
      // Private mode can block storage; the banner can simply reappear later.
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
      // Safari private mode can block storage; the banner can simply reappear later.
    }
  }

  private isIosDevice(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    const touchPoints = navigator.maxTouchPoints || 0;

    return /iphone|ipad|ipod/.test(userAgent) || (platform === 'macintel' && touchPoints > 1);
  }

  private loadCategories(): void {
    this.http.get<CategoriesResponse>(`${API_BASE_URL}/categorias`).subscribe({
      next: (response) => {
        this.categories = response.items ?? [];
        this.categoriesError = '';
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.categories = [];
        this.categoriesError = 'No se pudieron cargar las categorias';
        this.changeDetector.detectChanges();
      },
    });
  }

  private loadProducts(): void {
    this.http.get<ProductsResponse>(`${API_BASE_URL}/productos`).subscribe({
      next: (response) => {
        this.products = this.withModelFallbacks(response.items ?? []);
        this.productsError = '';
        this.selectProductFromHash();
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.products = [];
        this.productsError = 'No se pudieron cargar los productos';
        this.changeDetector.detectChanges();
      },
    });
  }

  private loadAdminProducts(): void {
    this.http.get<ProductsResponse>(`${API_BASE_URL}/productos?include_inactive=true`).subscribe({
      next: (response) => {
        this.adminProducts = this.withModelFallbacks(response.items ?? []);
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.adminProducts = [];
        this.changeDetector.detectChanges();
      },
    });
  }

  private loadOrders(): void {
    this.ordersLoading = true;
    this.ordersError = '';
    const usuarioId = encodeURIComponent(this.currentTestUser.usuario_id);

    this.http.get<VentasResponse>(`${API_BASE_URL}/ventas?usuario_id=${usuarioId}`).subscribe({
      next: (response) => {
        this.orders = (response.items ?? []).map((order) => ({ ...order, detailsLoaded: false }));
        this.ordersLoading = false;
        this.ordersError = '';
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.orders = [];
        this.ordersLoading = false;
        this.ordersError = 'No se pudieron cargar los pedidos.';
        this.changeDetector.detectChanges();
      },
    });
  }

  private withModelFallbacks(products: Product[]): Product[] {
    return products.map((product) => {
      if (product.model3dUrl || product.slug !== 'ramo-primavera') return product;
      return { ...product, model3dUrl: RAMO_PRIMAVERA_MODEL_URL };
    });
  }

  private selectProductFromHash(): void {
    if (!window.location.hash.startsWith('#producto-')) return;

    const slug = window.location.hash.replace('#producto-', '');
    this.selectedProduct = this.products.find((product) => product.slug === slug) ?? this.products[0] ?? null;
  }

  protected get homeCategories(): Category[] {
    return this.categories.slice(0, 4);
  }

  protected get currentTestUser(): TestUser {
    return TEST_USERS[this.currentTestRole];
  }

  protected get isOwnerRole(): boolean {
    return this.currentTestRole === 'dueno';
  }

  protected get filteredProducts(): Product[] {
    const term = this.normalizeSearch(this.productSearchTerm);
    let items = this.products;

    if (this.selectedCategoryId) {
      items = items.filter((product) => product.categoriaIds?.includes(this.selectedCategoryId));
    }

    if (!term) return items;

    return items.filter((product) =>
      [product.name, product.description, product.slug]
        .some((value) => this.normalizeSearch(value).includes(term)),
    );
  }

  protected get filteredAdminProducts(): Product[] {
    const term = this.normalizeSearch(this.adminProductSearchTerm);
    if (!term) return this.adminProducts;

    return this.adminProducts.filter((product) =>
      [product.name, product.slug, product.description]
        .filter((value): value is string => Boolean(value))
        .some((value) => this.normalizeSearch(value).includes(term)),
    );
  }

  protected get filteredCategories(): Category[] {
    const term = this.normalizeSearch(this.categorySearchTerm);
    if (!term) return this.categories;

    return this.categories.filter((category) =>
      [category.nombre, category.slug]
        .some((value) => this.normalizeSearch(value).includes(term)),
    );
  }

  protected get filteredAdminCategories(): Category[] {
    const term = this.normalizeSearch(this.adminCategorySearchTerm);
    if (!term) return this.categories;

    return this.categories.filter((category) =>
      [category.nombre, category.slug]
        .filter((value): value is string => Boolean(value))
        .some((value) => this.normalizeSearch(value).includes(term)),
    );
  }

  protected updateProductSearch(event: Event): void {
    this.productSearchTerm = (event.target as HTMLInputElement).value;
  }

  protected updateAdminProductSearch(event: Event): void {
    this.adminProductSearchTerm = (event.target as HTMLInputElement).value;
  }

  protected updateCategorySearch(event: Event): void {
    this.categorySearchTerm = (event.target as HTMLInputElement).value;
  }

  protected updateAdminCategorySearch(event: Event): void {
    this.adminCategorySearchTerm = (event.target as HTMLInputElement).value;
  }

  protected selectHomeCategory(category: Category): void {
    this.selectedCategoryId = this.selectedCategoryId === category.categoria_id ? '' : category.categoria_id;
  }

  protected openCategory(category: Category): void {
    this.selectedCategoryId = category.categoria_id;
    this.productSearchTerm = '';
    this.categorySearchTerm = '';
    this.showView('home');
  }

  protected getCategoryProductCount(category: Category): number {
    return this.products.filter((product) => product.categoriaIds?.includes(category.categoria_id)).length;
  }

  protected getCategoryProductLabel(category: Category): string {
    const count = this.getCategoryProductCount(category);
    return count === 1 ? '1 producto' : `${count} productos`;
  }

  protected isHomeCategorySelected(category: Category): boolean {
    return this.selectedCategoryId === category.categoria_id;
  }

  protected updateCategoryFormName(event: Event): void {
    this.categoryFormName = (event.target as HTMLInputElement).value;
  }

  protected updateCategoryFormOrder(event: Event): void {
    this.categoryFormOrder = (event.target as HTMLInputElement).value;
  }

  protected updateCategoryFormImageUrl(event: Event): void {
    this.categoryFormImageUrl = (event.target as HTMLInputElement).value;
  }

  protected async onCategoryImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.categoryUploadLoading = true;
    this.categoryFormError = '';

    try {
      this.categoryFormImageUrl = await this.uploadMedia(file, 'categories');
    } catch {
      this.categoryFormError = 'No se pudo subir la imagen de la categoria.';
    } finally {
      this.categoryUploadLoading = false;
      input.value = '';
      this.changeDetector.detectChanges();
    }
  }

  protected updateProductFormName(event: Event): void {
    this.productFormName = (event.target as HTMLInputElement).value;
  }

  protected updateProductFormPrice(event: Event): void {
    this.productFormPrice = (event.target as HTMLInputElement).value;
  }

  protected updateProductFormImageUrl(event: Event): void {
    this.productFormImageUrl = (event.target as HTMLInputElement).value;
  }

  protected updateProductFormDetailImageUrl(event: Event): void {
    this.productFormDetailImageUrl = (event.target as HTMLInputElement).value;
  }

  protected updateProductFormDescription(event: Event): void {
    this.productFormDescription = (event.target as HTMLTextAreaElement).value;
  }

  protected updateProductFormModel3dUrl(event: Event): void {
    this.productFormModel3dUrl = (event.target as HTMLInputElement).value;
  }

  protected updateProductFormOrder(event: Event): void {
    this.productFormOrder = (event.target as HTMLInputElement).value;
  }

  protected async onProductMainImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.productImageUploadLoading = true;
    this.productFormError = '';

    try {
      const uploadedUrl = await this.uploadMedia(file, 'products');
      this.productFormImageUrl = uploadedUrl;
      if (!this.productFormDetailImageUrl.trim()) {
        this.productFormDetailImageUrl = uploadedUrl;
      }
    } catch {
      this.productFormError = 'No se pudo subir la imagen principal.';
    } finally {
      this.productImageUploadLoading = false;
      input.value = '';
      this.changeDetector.detectChanges();
    }
  }

  protected async onProductDetailImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.productDetailUploadLoading = true;
    this.productFormError = '';

    try {
      this.productFormDetailImageUrl = await this.uploadMedia(file, 'products');
    } catch {
      this.productFormError = 'No se pudo subir la imagen detalle.';
    } finally {
      this.productDetailUploadLoading = false;
      input.value = '';
      this.changeDetector.detectChanges();
    }
  }

  private async uploadMedia(file: File, folder: 'products' | 'categories'): Promise<string> {
    const presign = await firstValueFrom(this.http.post<PresignUploadResponse>(`${API_BASE_URL}/uploads/presign`, {
      fileName: file.name,
      contentType: file.type || 'image/jpeg',
      folder,
    }));

    if (!presign?.uploadUrl || !presign.fileUrl) {
      throw new Error('No se recibio URL de carga');
    }

    const uploadResponse = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'image/jpeg',
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error('No se pudo cargar el archivo');
    }

    return presign.fileUrl;
  }

  protected toggleProductCategory(categoryId: string): void {
    if (this.productFormCategoryIds.includes(categoryId)) {
      this.productFormCategoryIds = this.productFormCategoryIds.filter((item) => item !== categoryId);
      return;
    }

    this.productFormCategoryIds = [...this.productFormCategoryIds, categoryId];
  }

  protected isProductCategorySelected(categoryId: string): boolean {
    return this.productFormCategoryIds.includes(categoryId);
  }

  protected isProductActive(product: Product): boolean {
    return String(product.activo ?? 'true').toLowerCase() === 'true';
  }

  protected openProfileAdmin(view: 'add-product' | 'add-category'): void {
    if (!this.isOwnerRole) {
      this.showView('profile');
      return;
    }
    this.resetCategoryMessages();
    this.resetProductMessages();
    this.showView(view);
  }

  protected openProductsAdmin(): void {
    if (!this.isOwnerRole) {
      this.showView('profile');
      return;
    }
    this.resetProductMessages();
    this.showView('products');
  }

  protected openCategoryAdmin(): void {
    if (!this.isOwnerRole) {
      this.showView('profile');
      return;
    }
    this.resetCategoryMessages();
    this.showView('category-admin');
  }

  protected switchTestRole(role: TestRole): void {
    if (this.currentTestRole === role) return;

    this.currentTestRole = role;
    this.persistCurrentTestRole();

    if (!this.isOwnerRole && (this.activeView === 'products' || this.activeView === 'category-admin' || this.activeView === 'add-product' || this.activeView === 'add-category')) {
      this.showView('profile');
      return;
    }

    if (this.activeView === 'orders') {
      this.loadOrders();
    }

    this.changeDetector.detectChanges();
  }

  protected submitCategory(): void {
    if (this.categoryFormLoading || this.categoryUploadLoading) return;

    const nombre = this.categoryFormName.trim();
    if (!nombre) {
      this.categoryFormError = 'Escribe el nombre de la categoria.';
      this.categoryFormSuccess = '';
      return;
    }

    this.categoryFormLoading = true;
    this.categoryFormError = '';
    this.categoryFormSuccess = '';

    const payload = {
      nombre,
      orden: Number(this.categoryFormOrder || 0),
      imagen_url: this.categoryFormImageUrl.trim(),
      activa: true,
    };

    const request$ = this.editingCategoryId
      ? this.http.patch<CreateCategoryResponse>(`${API_BASE_URL}/categorias/${this.editingCategoryId}`, payload)
      : this.http.post<CreateCategoryResponse>(`${API_BASE_URL}/categorias`, payload);

    const isEditing = Boolean(this.editingCategoryId);
    request$.subscribe({
      next: () => {
        this.categoryFormLoading = false;
        this.resetCategoryForm();
        this.categoryFormSuccess = isEditing ? 'Categoria actualizada correctamente.' : 'Categoria creada correctamente.';
        this.loadCategories();
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.categoryFormLoading = false;
        this.categoryFormError = isEditing
          ? 'No se pudo actualizar la categoria. Intenta nuevamente.'
          : 'No se pudo crear la categoria. Intenta nuevamente.';
        this.changeDetector.detectChanges();
      },
    });
  }

  protected submitProduct(): void {
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
      this.productFormError = 'Agrega una descripcion del producto.';
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

    const payload = {
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
      ? this.http.patch<CreateProductResponse>(`${API_BASE_URL}/productos/${this.editingProductId}`, {
          ...payload,
          categoria_ids: this.productFormCategoryIds,
        })
      : this.http.post<CreateProductResponse>(`${API_BASE_URL}/productos`, payload);

    request$.subscribe({
      next: (product) => {
        if (this.editingProductId) {
          this.handleProductCreated(product, true);
          return;
        }

        const categoryIds = [...this.productFormCategoryIds];
        if (!categoryIds.length) {
          this.handleProductCreated(product);
          return;
        }

        forkJoin(
          categoryIds.map((categoria_id) =>
            this.http.post(`${API_BASE_URL}/productos-categorias`, {
              categoria_id,
              producto_id: product.producto_id,
            }),
          ),
        ).subscribe({
          next: () => this.handleProductCreated(product),
          error: () => {
            this.productFormLoading = false;
            this.productFormError = 'El producto se creo, pero no se pudieron guardar sus categorias.';
            this.loadProducts();
            this.changeDetector.detectChanges();
          },
        });
      },
      error: () => {
        this.productFormLoading = false;
        this.productFormError = this.editingProductId
          ? 'No se pudo actualizar el producto. Intenta nuevamente.'
          : 'No se pudo crear el producto. Intenta nuevamente.';
        this.changeDetector.detectChanges();
      },
    });
  }

  private handleProductCreated(product: CreateProductResponse, updated = false): void {
    this.productFormLoading = false;
    this.resetProductForm();
    this.productFormSuccess = updated ? `${product.name} se actualizo correctamente.` : `${product.name} se agrego correctamente.`;
    this.loadProducts();
    this.loadAdminProducts();
    this.loadCategories();
    this.changeDetector.detectChanges();
  }

  private resetCategoryMessages(): void {
    this.categoryFormError = '';
    this.categoryFormSuccess = '';
  }

  private resetProductMessages(): void {
    this.productFormError = '';
    this.productFormSuccess = '';
  }

  private resetCategoryForm(): void {
    this.categoryFormName = '';
    this.categoryFormOrder = '';
    this.categoryFormImageUrl = '';
    this.editingCategoryId = '';
  }

  private resetProductForm(): void {
    this.productFormName = '';
    this.productFormPrice = '';
    this.productFormImageUrl = '';
    this.productFormDetailImageUrl = '';
    this.productFormDescription = '';
    this.productFormModel3dUrl = '';
    this.productFormOrder = '';
    this.productFormCategoryIds = [];
    this.editingProductId = '';
  }

  protected startEditCategory(category: Category): void {
    this.editingCategoryId = category.categoria_id;
    this.categoryFormName = category.nombre;
    this.categoryFormOrder = String(category.orden ?? 0);
    this.categoryFormImageUrl = category.imageUrl || '';
    this.resetCategoryMessages();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected cancelEditCategory(): void {
    this.resetCategoryForm();
    this.resetCategoryMessages();
  }

  protected startEditCategoryFromAdmin(category: Category): void {
    this.startEditCategory(category);
    this.showView('add-category');
  }

  protected openNewCategoryForm(): void {
    this.resetCategoryForm();
    this.resetCategoryMessages();
    this.showView('add-category');
  }

  protected deleteCategory(category: Category): void {
    if (this.deletingCategoryId) return;
    if (!window.confirm(`Eliminar la categoria "${category.nombre}"?`)) return;

    this.deletingCategoryId = category.categoria_id;
    this.resetCategoryMessages();

    this.http.delete(`${API_BASE_URL}/categorias/${category.categoria_id}`).subscribe({
      next: () => {
        if (this.editingCategoryId === category.categoria_id) {
          this.resetCategoryForm();
        }
        this.deletingCategoryId = '';
        this.categoryFormSuccess = 'Categoria eliminada correctamente.';
        this.loadCategories();
        this.loadProducts();
        this.loadAdminProducts();
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.deletingCategoryId = '';
        this.categoryFormError = 'No se pudo eliminar la categoria.';
        this.changeDetector.detectChanges();
      },
    });
  }

  protected startEditProduct(product: Product): void {
    this.editingProductId = product.producto_id;
    this.productFormName = product.name;
    this.productFormPrice = String(this.priceToNumber(product.price));
    this.productFormImageUrl = product.image;
    this.productFormDetailImageUrl = product.detailImage || product.image;
    this.productFormDescription = product.description;
    this.productFormModel3dUrl = product.model3dUrl || '';
    this.productFormOrder = String(product.orden ?? 0);
    this.productFormCategoryIds = [...(product.categoriaIds ?? [])];
    this.resetProductMessages();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected cancelEditProduct(): void {
    this.resetProductForm();
    this.resetProductMessages();
  }

  protected startEditProductFromInventory(product: Product): void {
    this.startEditProduct(product);
    this.showView('add-product');
  }

  protected openNewProductForm(): void {
    this.resetProductForm();
    this.resetProductMessages();
    this.showView('add-product');
  }

  protected deleteProduct(product: Product): void {
    if (this.deletingProductId) return;
    if (!window.confirm(`Eliminar el producto "${product.name}"?`)) return;

    this.deletingProductId = product.producto_id;
    this.resetProductMessages();

    this.http.delete(`${API_BASE_URL}/productos/${product.producto_id}`).subscribe({
      next: () => {
        if (this.editingProductId === product.producto_id) {
          this.resetProductForm();
        }
        this.deletingProductId = '';
        this.productFormSuccess = 'Producto eliminado correctamente.';
        this.loadProducts();
        this.loadAdminProducts();
        this.loadCategories();
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.deletingProductId = '';
        this.productFormError = 'No se pudo eliminar el producto.';
        this.changeDetector.detectChanges();
      },
    });
  }

  protected toggleProductActive(product: Product): void {
    if (this.togglingProductId) return;

    const nextActive = !this.isProductActive(product);
    this.togglingProductId = product.producto_id;
    this.resetProductMessages();

    this.http.patch<CreateProductResponse>(`${API_BASE_URL}/productos/${product.producto_id}`, {
      nombre: product.name,
      precio: this.priceToNumber(product.price),
      imagen_url: product.image,
      detalle_imagen_url: product.detailImage || product.image,
      descripcion: product.description,
      model3d_url: product.model3dUrl || '',
      orden: product.orden ?? 0,
      activo: nextActive,
      categoria_ids: product.categoriaIds ?? [],
    }).subscribe({
      next: () => {
        this.togglingProductId = '';
        this.productFormSuccess = nextActive ? 'Producto reactivado correctamente.' : 'Producto desactivado correctamente.';
        this.loadProducts();
        this.loadAdminProducts();
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.togglingProductId = '';
        this.productFormError = nextActive ? 'No se pudo reactivar el producto.' : 'No se pudo desactivar el producto.';
        this.changeDetector.detectChanges();
      },
    });
  }

  private normalizeSearch(value: string): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  protected get cartQuantity(): number {
    return this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  protected get hasCartItems(): boolean {
    return this.cartQuantity > 0;
  }

  protected get subtotal(): string {
    return this.formatCurrency(this.subtotalAmount);
  }

  protected get shipping(): string {
    return this.hasCartItems ? this.formatCurrency(this.shippingAmount) : this.formatCurrency(0);
  }

  protected get total(): string {
    return this.formatCurrency(this.subtotalAmount + (this.hasCartItems ? this.shippingAmount : 0));
  }

  private get subtotalAmount(): number {
    return this.cartItems.reduce((sum, item) => sum + this.priceToNumber(item.product.price) * item.quantity, 0);
  }

  private priceToNumber(price: string): number {
    const value = Number(String(price).replace(/[^0-9.]/g, ''));
    return Number.isFinite(value) ? value : 0;
  }

  private formatCurrency(value: number): string {
    return `$${value.toFixed(2)}`;
  }

  protected orderItemCount(order: Venta): number {
    if (typeof order.items_count === 'number' && Number.isFinite(order.items_count)) {
      return order.items_count;
    }
    return (order.items ?? []).reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
  }

  protected orderItemLabel(order: Venta): string {
    const count = this.orderItemCount(order);
    return count === 1 ? '1 producto' : `${count} productos`;
  }

  protected isOrderExpanded(order: Venta): boolean {
    return this.expandedOrderIds.has(order.venta_id);
  }

  protected isOrderLoading(order: Venta): boolean {
    return this.loadingOrderIds.has(order.venta_id);
  }

  protected toggleOrderDetails(order: Venta): void {
    if (this.isOrderExpanded(order)) {
      this.expandedOrderIds.delete(order.venta_id);
      this.changeDetector.detectChanges();
      return;
    }

    this.expandedOrderIds.add(order.venta_id);
    if (order.detailsLoaded || this.loadingOrderIds.has(order.venta_id)) {
      this.changeDetector.detectChanges();
      return;
    }

    this.loadingOrderIds.add(order.venta_id);
    this.http.get<Venta>(`${API_BASE_URL}/ventas/${order.venta_id}`).subscribe({
      next: (response) => {
        this.orders = this.orders.map((current) =>
          current.venta_id === order.venta_id
            ? { ...current, items: response.items ?? [], items_count: response.items_count ?? current.items_count, detailsLoaded: true }
            : current,
        );
        this.loadingOrderIds.delete(order.venta_id);
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.loadingOrderIds.delete(order.venta_id);
        this.changeDetector.detectChanges();
      },
    });
  }

  protected orderItemName(item: VentaDetalle): string {
    return item.nombre_producto || item.nombre || 'Producto';
  }

  protected orderItemSubtotal(item: VentaDetalle): string {
    return this.formatCurrency(Number(item.subtotal || 0));
  }

  protected orderCreatedAt(order: Venta): string {
    if (!order.created_at) return 'Sin fecha';

    const parsed = new Date(order.created_at);
    if (Number.isNaN(parsed.getTime())) return order.created_at;

    return parsed.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  protected orderStatusLabel(status: string): string {
    const normalized = String(status || '').trim().toLowerCase();
    if (normalized === 'pendiente') return 'Pendiente';
    if (normalized === 'confirmada') return 'Confirmada';
    if (normalized === 'pagada') return 'Pagada';
    if (normalized === 'preparando') return 'Preparando';
    if (normalized === 'en_camino') return 'En camino';
    if (normalized === 'entregada') return 'Entregada';
    if (normalized === 'cancelada') return 'Cancelada';
    return status || 'Sin estatus';
  }

  protected checkout(): void {
    if (!this.hasCartItems || this.checkoutLoading) return;

    this.checkoutLoading = true;
    this.checkoutError = '';
    this.checkoutSuccess = '';

    const currentUser = this.currentTestUser;
    const payload = {
      usuario_id: currentUser.usuario_id,
      estatus: 'pendiente',
      cliente: {
        nombre: currentUser.nombre,
        email: currentUser.email,
      },
      items: this.cartItems.map((item) => ({
        producto_id: item.product.producto_id,
        nombre: item.product.name,
        cantidad: item.quantity,
        precio_unitario: this.priceToNumber(item.product.price),
        dedicatoria: item.dedication || '',
      })),
      envio: this.hasCartItems ? this.shippingAmount : 0,
      moneda: 'MXN',
      metodo_pago: 'pendiente',
    };

    this.http.post<CreateVentaResponse>(`${API_BASE_URL}/ventas`, payload).subscribe({
      next: (venta) => {
        this.cartItems = [];
        this.productDedications.clear();
        this.checkoutLoading = false;
        this.checkoutSuccess = `Pedido creado: ${venta.venta_id}`;
        if (this.activeView === 'orders') {
          this.loadOrders();
        }
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.checkoutLoading = false;
        this.checkoutError = 'No se pudo finalizar el pedido. Intenta nuevamente.';
        this.changeDetector.detectChanges();
      },
    });
  }

  protected get dedicationCounter(): string {
    return `${this.dedicationDraft.length}/${this.dedicationMaxLength}`;
  }

  protected getProductDedication(product: Product | null): string {
    if (!product) return '';

    const cartItem = this.cartItems.find((item) => item.product.producto_id === product.producto_id);
    return cartItem?.dedication ?? this.productDedications.get(product.producto_id) ?? '';
  }

  protected openDedication(product: Product, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.dedicationProduct = product;
    this.dedicationDraft = this.getProductDedication(product);
    this.dedicationPanelOpen = true;
    this.changeDetector.detectChanges();
  }

  protected updateDedicationDraft(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value.slice(0, this.dedicationMaxLength);
    this.dedicationDraft = value;
  }

  protected closeDedicationPanel(): void {
    this.dedicationPanelOpen = false;
    this.dedicationDraft = '';
    this.dedicationProduct = null;
  }

  protected saveDedication(): void {
    if (!this.dedicationProduct) return;

    const productId = this.dedicationProduct.producto_id;
    const dedication = this.dedicationDraft.trim();

    if (dedication) {
      this.productDedications.set(productId, dedication);
    } else {
      this.productDedications.delete(productId);
    }

    this.cartItems = this.cartItems.map((item) => {
      if (item.product.producto_id !== productId) return item;
      return dedication ? { ...item, dedication } : { product: item.product, quantity: item.quantity };
    });

    this.closeDedicationPanel();
  }

  protected addToCart(product: Product | null): void {
    if (!product) return;

    const dedication = this.getProductDedication(product).trim();
    const existingItem = this.cartItems.find((item) => item.product.producto_id === product.producto_id);
    if (existingItem) {
      existingItem.quantity += 1;
      if (dedication) existingItem.dedication = dedication;
    } else {
      this.cartItems = [...this.cartItems, { product, quantity: 1, ...(dedication ? { dedication } : {}) }];
    }

    this.showView('cart');
  }

  protected increaseQuantity(item: CartItem): void {
    item.quantity += 1;
  }

  protected decreaseQuantity(item: CartItem): void {
    if (item.quantity <= 1) {
      this.cartItems = this.cartItems.filter((cartItem) => cartItem.product.producto_id !== item.product.producto_id);
      return;
    }

    item.quantity -= 1;
  }

  protected showProduct(product: Product, returnView: Exclude<View, 'detail'> = 'home'): void {
    this.detailReturnView = returnView;
    this.selectedProduct = product;
    this.activeView = 'detail';
    window.history.replaceState(null, '', `#producto-${product.slug || product.producto_id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected showDetailBack(): void {
    this.showView(this.detailReturnView);
  }

  protected showView(view: Exclude<View, 'detail'>, event?: Event): void {
    event?.preventDefault();
    this.selectedProduct = null;
    this.activeView = view;
    window.history.replaceState(null, '', hashForView(view));
    if (view === 'home') {
      this.loadCategories();
      this.loadProducts();
    }
    if (view === 'categories' || view === 'products' || view === 'category-admin' || view === 'add-product' || view === 'add-category') {
      this.loadCategories();
    }
    if (view === 'products' || view === 'add-product') {
      this.loadAdminProducts();
    }
    if (view === 'orders') {
      this.loadOrders();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected isActive(view: Exclude<View, 'detail'>): boolean {
    if (this.activeView === 'detail') {
      return this.detailReturnView === view;
    }

    if (view === 'profile') {
        return this.activeView === 'profile' || this.activeView === 'orders' || this.activeView === 'products' || this.activeView === 'category-admin' || this.activeView === 'add-product' || this.activeView === 'add-category';
      }

    return this.activeView === view;
  }
}









