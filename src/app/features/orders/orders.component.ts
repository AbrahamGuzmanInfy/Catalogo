import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import type { Venta, VentaDetalle } from '../../core/models/order.model';
import type { AppUserProfile } from '../../core/models/user.model';
import { OrderService } from '../../core/services/order.service';
import { OrderCardComponent } from '../../shared/order-card/order-card.component';

@Component({
  selector: 'app-orders',
  imports: [OrderCardComponent],
  templateUrl: './orders.component.html',
})
/**
 * Presenta el historial de pedidos del usuario activo y sus detalles.
 */
export class OrdersComponent implements OnChanges {
  private readonly orderService = inject(OrderService);

  @Input({ required: true }) currentUser!: AppUserProfile;
  @Output() back = new EventEmitter<void>();

  public readonly orders = signal<Venta[]>([]);
  public readonly ordersLoading = signal(false);
  public readonly ordersError = signal('');
  public readonly hasOrders = computed(() => this.orders().length > 0);
  public expandedOrderIds = new Set<string>();
  public loadingOrderIds = new Set<string>();

  /**
   * Recarga pedidos cuando cambia el usuario activo.
   * @param changes Cambios de inputs recibidos por el componente.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentUser']?.currentValue) {
      this.loadOrders();
    }
  }

  /**
   * Carga los pedidos del usuario actual.
   */
  loadOrders(): void {
    this.ordersLoading.set(true);
    this.ordersError.set('');
    this.expandedOrderIds.clear();
    this.loadingOrderIds.clear();

    this.orderService.getOrdersByUser(this.currentUser.usuario_id).subscribe({
      next: (orders) => {
        this.orders.set(orders.map((order) => ({ ...order, detailsLoaded: false })));
        this.ordersLoading.set(false);
        this.ordersError.set('');
      },
      error: () => {
        this.orders.set([]);
        this.ordersLoading.set(false);
        this.ordersError.set('No se pudieron cargar los pedidos.');
      },
    });
  }

  /**
   * Indica si un pedido esta expandido en pantalla.
   * @param order Pedido consultado.
   */
  isOrderExpanded(order: Venta): boolean {
    return this.expandedOrderIds.has(order.venta_id);
  }

  /**
   * Indica si un pedido sigue cargando su detalle.
   * @param order Pedido consultado.
   */
  isOrderLoading(order: Venta): boolean {
    return this.loadingOrderIds.has(order.venta_id);
  }

  /**
   * Expande o colapsa el detalle de un pedido.
   * @param order Pedido seleccionado.
   */
  toggleOrderDetails(order: Venta): void {
    if (this.isOrderExpanded(order)) {
      this.expandedOrderIds.delete(order.venta_id);
      return;
    }

    this.expandedOrderIds.add(order.venta_id);
    if (order.detailsLoaded || this.loadingOrderIds.has(order.venta_id)) {
      return;
    }

    this.loadingOrderIds.add(order.venta_id);
    this.orderService.getOrderById(order.venta_id).subscribe({
      next: (response) => {
        this.orders.set(
          this.orders().map((current) =>
            current.venta_id === order.venta_id
              ? { ...current, items: response.items ?? [], items_count: response.items_count ?? current.items_count, detailsLoaded: true }
              : current,
          ),
        );
        this.loadingOrderIds.delete(order.venta_id);
      },
      error: () => {
        this.loadingOrderIds.delete(order.venta_id);
      },
    });
  }

  /**
   * Calcula la cantidad total de productos en un pedido.
   * @param order Pedido evaluado.
   */
  orderItemCount(order: Venta): number {
    if (typeof order.items_count === 'number' && Number.isFinite(order.items_count)) {
      return order.items_count;
    }
    return (order.items ?? []).reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
  }

  /**
   * Devuelve la etiqueta singular o plural para el numero de productos.
   * @param order Pedido evaluado.
   */
  orderItemLabel(order: Venta): string {
    const count = this.orderItemCount(order);
    return count === 1 ? '1 producto' : `${count} productos`;
  }

  /**
   * Formatea la fecha de creacion del pedido para la UI.
   * @param order Pedido evaluado.
   */
  orderCreatedAt(order: Venta): string {
    if (!order.created_at) return 'Sin fecha';

    const parsed = new Date(order.created_at);
    if (Number.isNaN(parsed.getTime())) return order.created_at;

    return parsed.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  /**
   * Traduce el estatus interno del pedido a una etiqueta legible.
   * @param status Estatus crudo devuelto por backend.
   */
  orderStatusLabel(status: string): string {
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

  /**
   * Resuelve el nombre visible de un item del pedido.
   * @param item Item devuelto en el detalle de la venta.
   */
  orderItemName(item: VentaDetalle): string {
    return item.nombre_producto || item.nombre || 'Producto';
  }

  /**
   * Da formato monetario al subtotal de un item.
   * @param item Item devuelto en el detalle de la venta.
   */
  orderItemSubtotal(item: VentaDetalle): string {
    return `$${Number(item.subtotal || 0).toFixed(2)}`;
  }
}
