import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ProductViewer3d } from './product-viewer-3d/product-viewer-3d';

type View = 'home' | 'detail' | 'categories' | 'cart' | 'profile';

const API_BASE_URL = 'https://hs5rkunm27jueyzgyhqliykv7u0sizsx.lambda-url.us-east-2.on.aws';
const RAMO_PRIMAVERA_MODEL_URL = '/models/ramo-primavera-mobile-draco.glb';

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
};

@Component({
  selector: 'app-root',
  imports: [ProductViewer3d],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
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

  protected readonly shippingAmount = 5;

  protected activeView: View = viewFromHash();
  protected selectedProduct: Product | null = null;

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
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

  protected addToCart(product: Product | null): void {
    if (!product) return;

    const existingItem = this.cartItems.find((item) => item.product.producto_id === product.producto_id);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      this.cartItems = [...this.cartItems, { product, quantity: 1 }];
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
  protected showProduct(product: Product): void {
    this.selectedProduct = product;
    this.activeView = 'detail';
    window.history.replaceState(null, '', `#producto-${product.slug || product.producto_id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    return this.activeView === view || (view === 'home' && this.activeView === 'detail');
  }
}
