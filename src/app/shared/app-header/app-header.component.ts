import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './app-header.component.html',
})
export class AppHeaderComponent {
  @Input() title = 'Bloomy';
  @Input() hasCartItems = false;
  @Input() hasTools = false;
  @Output() cartClick = new EventEmitter<void>();
}

