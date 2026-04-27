import { Component, EventEmitter, Output, inject } from '@angular/core';
import { SessionState } from '../../core/state/session.state';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
})
export class UserComponent {
  public readonly session = inject(SessionState);

  @Output() productsList = new EventEmitter<void>();
  @Output() categoriesList = new EventEmitter<void>();
  @Output() orders = new EventEmitter<void>();
  @Output() signOutRequested = new EventEmitter<void>();
}
