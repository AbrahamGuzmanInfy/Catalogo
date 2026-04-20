import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ProductDetailComponent } from './product-detail/product-detail';

type View = 'home' | 'detail' | 'categories' | 'cart' | 'profile';

const API_BASE_URL = 'https://hs5rkunm27jueyzgyhqliykv7u0sizsx.lambda-url.us-east-2.on.aws';
const RAMO_PRIMAVERA_MODEL_URL = '/models/ramo-primavera-mobile-draco.glb';
const INSTALL_DISMISSED_KEY = 'petal-install-dismissed-session';
const IOS_INSTALL_DISMISSED_KEY = 'petal-ios-install-dismissed-session';
const DEDICATION_MAX_LENGTH = 160;

function viewFromHash(): View {
  if (window.location.hash.startsWith('#producto-')) return 'detail';
  if (window.location.hash === '#categorias') return 'categories';
  if (window.location.hash === '#carrito') return 'cart';
  if (window.location.hash === '#perfil') return 'profile';
  return 'home';
}

function hashForView(view: Exclude<View, 'detail'>): string {
  if (view === 'categories') return '#categorias';
  if (view === 'cart') return '#carrito';
  if (view === 'profile') return '#perfil';
  return window.location.pathname;
}

type Category = {
  categoria_id: string;
  nombre: string;
  slug: string;
  activa: string;
  orden: number;
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
  protected productsError = '';
  protected productSearchTerm = '';
  protected categorySearchTerm = '';
  protected selectedCategoryId = '';
  protected cartItems: CartItem[] = [];
  protected checkoutLoading = false;
  protected checkoutError = '';
  protected checkoutSuccess = '';
  protected dedicationPanelOpen = false;
  protected dedicationDraft = '';
  protected dedicationProduct: Product | null = null;
  protected readonly dedicationMaxLength = DEDICATION_MAX_LENGTH;
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

  protected get filteredCategories(): Category[] {
    const term = this.normalizeSearch(this.categorySearchTerm);
    if (!term) return this.categories;

    return this.categories.filter((category) =>
      [category.nombre, category.slug]
        .some((value) => this.normalizeSearch(value).includes(term)),
    );
  }

  protected updateProductSearch(event: Event): void {
    this.productSearchTerm = (event.target as HTMLInputElement).value;
  }

  protected updateCategorySearch(event: Event): void {
    this.categorySearchTerm = (event.target as HTMLInputElement).value;
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

  protected checkout(): void {
    if (!this.hasCartItems || this.checkoutLoading) return;

    this.checkoutLoading = true;
    this.checkoutError = '';
    this.checkoutSuccess = '';

    const payload = {
      usuario_id: 'INVITADO',
      estatus: 'pendiente',
      cliente: { nombre: 'Invitado' },
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
    if (view === 'categories') {
      this.loadCategories();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected isActive(view: Exclude<View, 'detail'>): boolean {
    if (this.activeView === 'detail') {
      return this.detailReturnView === view;
    }

    return this.activeView === view;
  }
}
