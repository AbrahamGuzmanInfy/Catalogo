import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { CartItem } from '../../core/models/cart.model';
import type { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-cart-item',
  templateUrl: './cart-item.component.html',
})
export class CartItemComponent {
  @Input({ required: true }) item!: CartItem;
  @Output() openProduct = new EventEmitter<Product>();
  @Output() editDedication = new EventEmitter<Product>();
  @Output() increase = new EventEmitter<CartItem>();
  @Output() decrease = new EventEmitter<CartItem>();
}


