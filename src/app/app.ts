import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';

type View = 'home' | 'detail' | 'categories' | 'cart' | 'profile';

const API_BASE_URL = 'https://hs5rkunm27jueyzgyhqliykv7u0sizsx.lambda-url.us-east-2.on.aws';

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
  protected cartItems: CartItem[] = [];

  protected readonly subtotal = '$80.00';
  protected readonly shipping = '$5.00';
  protected readonly total = '$85.00';

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
        this.products = response.items ?? [];
        this.cartItems = this.products.map((product) => ({ product, quantity: 1 }));
        this.productsError = '';
        this.selectProductFromHash();
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.products = [];
        this.cartItems = [];
        this.productsError = 'No se pudieron cargar los productos';
        this.changeDetector.detectChanges();
      },
    });
  }

  private selectProductFromHash(): void {
    if (!window.location.hash.startsWith('#producto-')) return;

    const slug = window.location.hash.replace('#producto-', '');
    this.selectedProduct = this.products.find((product) => product.slug === slug) ?? this.products[0] ?? null;
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