import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.component.html',
})
export class SearchBarComponent {
  @Input() value = '';
  @Input() placeholder = '';
  @Input() ariaLabel = 'Buscar';
  @Output() valueChange = new EventEmitter<Event>();
}

