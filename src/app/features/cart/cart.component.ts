import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import type { Product } from '../../core/models/product.model';
import { CartState } from '../../core/state/cart.state';
import { SessionState } from '../../core/state/session.state';
import { CartItemComponent } from '../../shared/cart-item/cart-item.component';

@Component({
  selector: 'app-cart',
  imports: [CartItemComponent],
  templateUrl: './cart.component.html',
})
export class CartComponent {
  public readonly cart = inject(CartState);
  public readonly session = inject(SessionState);
  @Input() active = false;

  @Output() openProduct = new EventEmitter<Product>();
  @Output() authRequired = new EventEmitter<void>();

  checkout(): void {
    if (!this.session.user) {
      this.authRequired.emit();
      return;
    }

    this.cart.checkout(this.session.user);
  }
}
