import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { View } from '../../core/models/navigation.model';

@Component({
  selector: 'app-bottom-nav',
  templateUrl: './app-bottom-nav.component.html',
})
/**
 * Renderiza la navegación inferior persistente de la aplicación.
 */
export class AppBottomNavComponent {
  @Input() activeView: View = 'home';
  @Input() detailReturnView: Exclude<View, 'detail'> = 'home';
  @Output() select = new EventEmitter<Exclude<View, 'detail'>>();

  /**
   * Evalúa si una opción del menú inferior debe mostrarse como activa.
   * @param view Vista candidata del menú.
   */
  isActive(view: Exclude<View, 'detail'>): boolean {
    if (this.activeView === 'detail') return this.detailReturnView === view;
    if (view === 'profile') {
      return this.activeView === 'profile'
        || this.activeView === 'orders'
        || this.activeView === 'products'
        || this.activeView === 'category-list'
        || this.activeView === 'add-product'
        || this.activeView === 'add-category';
    }
    return this.activeView === view;
  }
}


