import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { Category } from '../../core/models/category.model';

@Component({
  selector: 'app-category-chip-list',
  templateUrl: './category-chip-list.component.html',
})
export class CategoryChipListComponent {
  @Input() categories: Category[] = [];
  @Input() selectedCategoryId = '';
  @Output() select = new EventEmitter<Category>();
}


