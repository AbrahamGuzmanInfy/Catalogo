import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { Product as ProductDetailProduct } from '../../core/models/product.model';
import { ProductViewer3d } from '../../product-viewer-3d/product-viewer-3d.component';

@Component({
  selector: 'app-product-detail',
  imports: [ProductViewer3d],
  templateUrl: './product-detail.component.html',
})
export class ProductDetailComponent {
  @Input({ required: true }) product!: ProductDetailProduct;
  @Input() dedication = '';
  @Output() back = new EventEmitter<void>();
  @Output() addToCart = new EventEmitter<ProductDetailProduct>();
  @Output() editDedication = new EventEmitter<ProductDetailProduct>();
}
