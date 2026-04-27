import { Component, EventEmitter, Output, inject } from '@angular/core';
import { SessionState } from '../../core/state/session.state';

@Component({
  selector: 'app-auth-password-reset',
  templateUrl: './auth-password-reset.component.html',
})
export class AuthPasswordResetComponent {
  private readonly session = inject(SessionState);

  @Output() loginRequested = new EventEmitter<void>();

  public email = this.session.pendingResetEmail();
  public code = '';
  public newPassword = '';
  public localMessage = '';

  get loading(): boolean {
    return this.session.authenticating();
  }

  get error(): string {
    return this.session.authError();
  }

  async requestCode(): Promise<void> {
    const success = await this.session.requestPasswordReset(this.email);
    if (success) {
      this.localMessage = 'Te enviamos un código para restablecer tu contraseña.';
    }
  }

  async confirmNewPassword(): Promise<void> {
    const success = await this.session.confirmPasswordReset(this.code, this.newPassword, this.email);
    if (success) {
      this.localMessage = 'Tu contraseña fue actualizada. Ya puedes iniciar sesión.';
    }
  }
}
