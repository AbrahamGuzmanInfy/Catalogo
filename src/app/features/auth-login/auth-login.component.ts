import { Component, EventEmitter, Output, inject } from '@angular/core';
import { SessionState } from '../../core/state/session.state';

@Component({
  selector: 'app-auth-login',
  templateUrl: './auth-login.component.html',
})
export class AuthLoginComponent {
  private readonly session = inject(SessionState);

  @Output() registerRequested = new EventEmitter<void>();
  @Output() forgotPasswordRequested = new EventEmitter<void>();
  @Output() signedIn = new EventEmitter<void>();
  @Output() confirmationRequired = new EventEmitter<void>();
  @Output() passwordResetRequired = new EventEmitter<void>();

  public email = '';
  public password = '';

  get loading(): boolean {
    return this.session.authenticating();
  }

  get error(): string {
    return this.session.authError();
  }

  get cognitoConfigured(): boolean {
    return this.session.isConfigured;
  }

  async submit(): Promise<void> {
    const next = await this.session.signIn(this.email, this.password);
    if (next === 'confirm-sign-up') {
      this.confirmationRequired.emit();
      return;
    }
    if (next === 'reset-password') {
      this.passwordResetRequired.emit();
      return;
    }
    if (this.session.isAuthenticated) {
      this.signedIn.emit();
    }
  }
}
