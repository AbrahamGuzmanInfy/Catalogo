import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  @Output() viewMore = new EventEmitter<Product>();
}


