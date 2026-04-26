import { Injectable, inject } from '@angular/core';
import type { CartItem } from '../models/cart.model';
import type { CreateVentaPayload } from '../models/order.model';
import type { Product } from '../models/product.model';
import type { TestUser } from '../models/user.model';
import { OrderService } from '../services/order.service';

const DEDICATION_MAX_LENGTH = 160;
const SHIPPING_AMOUNT = 5;

/**
 * Mantiene el estado compartido del carrito, dedicatorias y checkout.
 */
@Injectable({ providedIn: 'root' })
export class CartState {
  private readonly orderService = inject(OrderService);
  private readonly productDedications = new Map<string, string>();

  public cartItems: CartItem[] = [];
  public checkoutLoading = false;
  public checkoutError = '';
  public checkoutSuccess = '';
  public dedicationPanelOpen = false;
  public dedicationDraft = '';
  public dedicationProduct: Product | null = null;

  /**
   * Límite permitido de caracteres para una dedicatoria.
   */
  get dedicationMaxLength(): number {
    return DEDICATION_MAX_LENGTH;
  }

  /**
   * Devuelve el contador de caracteres del borrador de dedicatoria.
   */
  get dedicationCounter(): string {
    return `${this.dedicationDraft.length}/${this.dedicationMaxLength}`;
  }

  /**
   * Cantidad total de piezas agregadas al carrito.
   */
  get cartQuantity(): number {
    return this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Indica si existe al menos un item en el carrito.
   */
  get hasCartItems(): boolean {
    return this.cartQuantity > 0;
  }

  /**
   * Subtotal formateado del carrito.
   */
  get subtotal(): string {
    return this.formatCurrency(this.subtotalAmount);
  }

  /**
   * Importe de envío visible para el estado actual del carrito.
   */
  get shipping(): string {
    return this.hasCartItems ? this.formatCurrency(SHIPPING_AMOUNT) : this.formatCurrency(0);
  }

  /**
   * Total formateado con subtotal y envío.
   */
  get total(): string {
    return this.formatCurrency(this.subtotalAmount + (this.hasCartItems ? SHIPPING_AMOUNT : 0));
  }

  /**
   * Agrega un producto al carrito o incrementa su cantidad si ya estaba presente.
   * @param product Producto seleccionado desde catálogo o detalle.
   */
  addToCart(product: Product | null): void {
    if (!product) return;

    const dedication = this.getProductDedication(product).trim();
    const existingItem = this.cartItems.find((item) => item.product.producto_id === product.producto_id);
    if (existingItem) {
      existingItem.quantity += 1;
      if (dedication) existingItem.dedication = dedication;
    } else {
      this.cartItems = [...this.cartItems, { product, quantity: 1, ...(dedication ? { dedication } : {}) }];
    }
  }

  /**
   * Aumenta en una unidad la cantidad de un item del carrito.
   * @param item Item a modificar.
   */
  increaseCartItem(item: CartItem): void {
    item.quantity += 1;
  }

  /**
   * Reduce la cantidad de un item o lo elimina si llega a cero.
   * @param item Item a modificar.
   */
  decreaseCartItem(item: CartItem): void {
    if (item.quantity <= 1) {
      this.cartItems = this.cartItems.filter((cartItem) => cartItem.product.producto_id !== item.product.producto_id);
      return;
    }

    item.quantity -= 1;
  }

  /**
   * Obtiene la dedicatoria asociada a un producto.
   * @param product Producto consultado.
   */
  getProductDedication(product: Product | null): string {
    if (!product) return '';

    const cartItem = this.cartItems.find((item) => item.product.producto_id === product.producto_id);
    return cartItem?.dedication ?? this.productDedications.get(product.producto_id) ?? '';
  }

  /**
   * Abre el panel de dedicatoria para un producto específico.
   * @param product Producto al que se editará la dedicatoria.
   * @param event Evento opcional para detener propagación o navegación.
   */
  openDedication(product: Product, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.dedicationProduct = product;
    this.dedicationDraft = this.getProductDedication(product);
    this.dedicationPanelOpen = true;
  }

  /**
   * Sincroniza el borrador de dedicatoria con el textarea.
   * @param event Evento input del campo de texto.
   */
  updateDedicationDraft(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value.slice(0, this.dedicationMaxLength);
    this.dedicationDraft = value;
  }

  /**
   * Cierra el panel de dedicatoria y limpia el contexto temporal.
   */
  closeDedicationPanel(): void {
    this.dedicationPanelOpen = false;
    this.dedicationDraft = '';
    this.dedicationProduct = null;
  }

  /**
   * Guarda la dedicatoria redactada sobre el producto activo.
   */
  saveDedication(): void {
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

  /**
   * Genera un pedido usando el carrito actual para el usuario activo.
   * @param currentUser Usuario de prueba seleccionado en sesión.
   */
  checkout(currentUser: TestUser): void {
    if (!this.hasCartItems || this.checkoutLoading) return;

    this.checkoutLoading = true;
    this.checkoutError = '';
    this.checkoutSuccess = '';

    const payload: CreateVentaPayload = {
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
      envio: this.hasCartItems ? SHIPPING_AMOUNT : 0,
      moneda: 'MXN',
      metodo_pago: 'pendiente',
    };

    this.orderService.createOrder(payload).subscribe({
      next: (venta) => {
        this.cartItems = [];
        this.productDedications.clear();
        this.checkoutLoading = false;
        this.checkoutSuccess = `Pedido creado: ${venta.venta_id}`;
      },
      error: () => {
        this.checkoutLoading = false;
        this.checkoutError = 'No se pudo finalizar el pedido. Intenta nuevamente.';
      },
    });
  }

  /**
   * Calcula el subtotal numérico antes de aplicar formato para UI.
   */
  private get subtotalAmount(): number {
    return this.cartItems.reduce((sum, item) => sum + this.priceToNumber(item.product.price) * item.quantity, 0);
  }

  /**
   * Convierte un precio en texto a un número utilizable para cálculos.
   * @param price Valor textual del precio.
   */
  private priceToNumber(price: string): number {
    const value = Number(String(price).replace(/[^0-9.]/g, ''));
    return Number.isFinite(value) ? value : 0;
  }

  /**
   * Da formato monetario simple para mostrar importes en la interfaz.
   * @param value Valor numérico a mostrar.
   */
  private formatCurrency(value: number): string {
    return `$${value.toFixed(2)}`;
  }
}
