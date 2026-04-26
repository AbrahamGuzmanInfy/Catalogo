import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { Venta } from '../../core/models/order.model';

@Component({
  selector: 'app-order-card',
  templateUrl: './order-card.component.html',
})
/**
 * Presenta un resumen visual reutilizable de un pedido.
 */
export class OrderCardComponent {
  @Input({ required: true }) order!: Venta;
  @Input() expanded = false;
  @Input() loading = false;
  @Input() statusLabel = '';
  @Input() createdAt = '';
  @Input() itemLabel = '';
  @Output() toggle = new EventEmitter<Venta>();

  /**
   * Formatea el subtotal de un item para mostrarlo con dos decimales.
   * @param value Valor subtotal a presentar.
   */
  subtotalLabel(value: number | undefined): string {
    return Number(value || 0).toFixed(2);
  }
}


