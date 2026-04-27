import { Component, EventEmitter, Output, inject } from '@angular/core';
import { SessionState } from '../../core/state/session.state';

@Component({
  selector: 'app-auth-register',
  templateUrl: './auth-register.component.html',
})
export class AuthRegisterComponent {
  private readonly session = inject(SessionState);

  @Output() loginRequested = new EventEmitter<void>();
  @Output() confirmationRequired = new EventEmitter<void>();

  public nombre = '';
  public email = '';
  public password = '';
  public confirmPassword = '';
  public localError = '';

  get loading(): boolean {
    return this.session.authenticating();
  }

  get error(): string {
    return this.localError || this.session.authError();
  }

  get cognitoConfigured(): boolean {
    return this.session.isConfigured;
  }

  async submit(): Promise<void> {
    this.localError = '';
    if (this.password !== this.confirmPassword) {
      this.localError = 'Las contraseñas no coinciden.';
      return;
    }

    const next = await this.session.signUp(this.nombre, this.email, this.password);
    if (next === 'confirm-sign-up') {
      this.confirmationRequired.emit();
    }
  }
}
