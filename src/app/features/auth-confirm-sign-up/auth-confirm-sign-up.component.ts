import { Component, EventEmitter, Output, inject } from '@angular/core';
import { SessionState } from '../../core/state/session.state';

@Component({
  selector: 'app-auth-confirm-sign-up',
  templateUrl: './auth-confirm-sign-up.component.html',
})
export class AuthConfirmSignUpComponent {
  private readonly session = inject(SessionState);

  @Output() loginRequested = new EventEmitter<void>();

  public code = '';
  public localMessage = '';

  get email(): string {
    return this.session.pendingConfirmationEmail();
  }

  get loading(): boolean {
    return this.session.authenticating();
  }

  get error(): string {
    return this.session.authError();
  }

  async confirm(): Promise<void> {
    const success = await this.session.confirmSignUp(this.code, this.email);
    if (success) {
      this.localMessage = 'Tu cuenta ya fue confirmada. Ahora puedes iniciar sesión.';
    }
  }

  async resend(): Promise<void> {
    const success = await this.session.resendSignUpCode(this.email);
    if (success) {
      this.localMessage = 'Te enviamos un nuevo código de confirmación.';
    }
  }
}
