import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProductViewer3d } from '../product-viewer-3d/product-viewer-3d';

export type ProductDetailProduct = {
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

@Component({
  selector: 'app-product-detail',
  imports: [ProductViewer3d],
  template: `
    <section class="detail-screen" aria-label="Detalle de producto">
      <button class="detail-back-button" type="button" aria-label="Regresar" (click)="back.emit()"><span aria-hidden="true">&#8249;</span></button>

      @if (product.model3dUrl) {
        @defer (when product.model3dUrl) {
          <app-product-viewer-3d class="detail-viewer-3d" [modelUrl]="product.model3dUrl" [alt]="product.alt" />
        } @placeholder {
          <img class="detail-image" [src]="product.detailImage" [alt]="product.alt" />
        }
      } @else {
        <img class="detail-image" [src]="product.detailImage" [alt]="product.alt" />
      }

      <h1>{{ product.name }}</h1>

      <div class="detail-meta">
        <p class="detail-rating" aria-label="5 estrellas">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
        <p class="detail-price">{{ product.price }}</p>
      </div>

      <p class="detail-description">{{ product.description }}</p>

      <button class="dedication-button" type="button">
        <img src="/icons/tdesign/edit-1.svg" alt="" aria-hidden="true" />
        <span>A&ntilde;adir Dedicatoria</span>
      </button>

      <button class="add-cart-button" type="button" (click)="addToCart.emit(product)">A&ntilde;adir al Carrito</button>
    </section>
  `,
})
export class ProductDetailComponent {
  @Input({ required: true }) product!: ProductDetailProduct;
  @Output() back = new EventEmitter<void>();
  @Output() addToCart = new EventEmitter<ProductDetailProduct>();
}