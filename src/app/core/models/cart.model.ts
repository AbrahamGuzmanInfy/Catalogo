import type { Product } from './product.model';

export interface CartItem {
  product: Product;
  quantity: number;
  dedication?: string;
}
