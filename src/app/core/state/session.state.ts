import { Injectable, inject, signal } from '@angular/core';
import {
  canUseCognitoAuth,
  completePasswordReset,
  confirmEmailRegistration,
  getAuthenticatedIdentity,
  loginWithEmail,
  logoutCurrentSession,
  registerWithEmail,
  resendRegistrationCode,
  startPasswordReset,
} from '../auth/cognito-auth.client';
import type { AppUserProfile, AuthIdentity } from '../models/user.model';
import { UserService } from '../services/user.service';

/**
 * Conserva la sesión autenticada y coordina los flujos de acceso con Cognito.
 */
@Injectable({ providedIn: 'root' })
export class SessionState {
  private readonly userService = inject(UserService);

  public readonly ready = signal(false);
  public readonly authenticating = signal(false);
  public readonly authError = signal('');
  public readonly currentIdentity = signal<AuthIdentity | null>(null);
  public readonly currentProfile = signal<AppUserProfile | null>(null);
  public readonly pendingConfirmationEmail = signal('');
  public readonly pendingResetEmail = signal('');

  constructor() {
    void this.initializeSession();
  }

  /**
   * Indica si Cognito está configurado en el frontend.
   */
  get isConfigured(): boolean {
    return canUseCognitoAuth();
  }

  /**
   * Indica si ya terminó la restauración inicial de sesión.
   */
  get isReady(): boolean {
    return this.ready();
  }

  /**
   * Indica si existe una sesión autenticada y sincronizada.
   */
  get isAuthenticated(): boolean {
    return Boolean(this.currentProfile());
  }

  /**
   * Expone el perfil de usuario autenticado actual.
   */
  get user(): AppUserProfile | null {
    return this.currentProfile();
  }

  /**
   * Expone si el rol actual puede gestionar catálogo.
   */
  get isOwnerRole(): boolean {
    const role = this.currentProfile()?.rol;
    return role === 'dueno' || role === 'admin';
  }

  /**
   * Expone si el rol actual corresponde a administración total.
   */
  get isAdminRole(): boolean {
    return this.currentProfile()?.rol === 'admin';
  }

  /**
   * Intenta restaurar una sesión previa al arrancar la aplicación.
   */
  async initializeSession(): Promise<void> {
    this.authError.set('');
    if (!this.isConfigured) {
      this.clearSession();
      this.ready.set(true);
      return;
    }

    try {
      const identity = await getAuthenticatedIdentity();
      if (!identity) {
        this.clearSession();
        this.ready.set(true);
        return;
      }

      this.currentIdentity.set(identity);
      await this.syncBusinessProfile(identity);
    } catch {
      this.clearSession();
      this.authError.set('No se pudo restaurar la sesión.');
    } finally {
      this.ready.set(true);
    }
  }

  /**
   * Ejecuta inicio de sesión con email y contraseña.
   * @param email Correo del usuario.
   * @param password Contraseña capturada.
   */
  async signIn(email: string, password: string): Promise<'done' | 'confirm-sign-up' | 'reset-password'> {
    this.authenticating.set(true);
    this.authError.set('');

    try {
      const result = await loginWithEmail(email.trim(), password);
      if (result.nextStep === 'CONFIRM_SIGN_UP') {
        this.pendingConfirmationEmail.set(email.trim());
        return 'confirm-sign-up';
      }

      if (result.nextStep === 'RESET_PASSWORD') {
        this.pendingResetEmail.set(email.trim());
        return 'reset-password';
      }

      const identity = await getAuthenticatedIdentity();
      if (!identity) {
        throw new Error('No se pudo recuperar la sesión después del acceso.');
      }

      this.currentIdentity.set(identity);
      await this.syncBusinessProfile(identity);
      return 'done';
    } catch (error) {
      this.authError.set(this.toFriendlyMessage(error, 'No se pudo iniciar sesión.'));
      return 'done';
    } finally {
      this.authenticating.set(false);
      this.ready.set(true);
    }
  }

  /**
   * Ejecuta el registro de una nueva cuenta.
   * @param nombre Nombre visible del usuario.
   * @param email Correo a registrar.
   * @param password Contraseña elegida.
   */
  async signUp(nombre: string, email: string, password: string): Promise<'confirm-sign-up' | 'done'> {
    this.authenticating.set(true);
    this.authError.set('');

    try {
      const normalizedEmail = email.trim();
      const result = await registerWithEmail(nombre.trim(), normalizedEmail, password);
      this.pendingConfirmationEmail.set(normalizedEmail);
      return result.nextStep === 'CONFIRM_SIGN_UP' ? 'confirm-sign-up' : 'done';
    } catch (error) {
      this.authError.set(this.toFriendlyMessage(error, 'No se pudo crear la cuenta.'));
      return 'done';
    } finally {
      this.authenticating.set(false);
    }
  }

  /**
   * Confirma una cuenta pendiente usando un código recibido por email.
   * @param code Código de verificación.
   * @param email Correo opcional; por defecto usa el pendiente en estado.
   */
  async confirmSignUp(code: string, email = this.pendingConfirmationEmail()): Promise<boolean> {
    this.authenticating.set(true);
    this.authError.set('');

    try {
      await confirmEmailRegistration(email.trim(), code.trim());
      return true;
    } catch (error) {
      this.authError.set(this.toFriendlyMessage(error, 'No se pudo confirmar la cuenta.'));
      return false;
    } finally {
      this.authenticating.set(false);
    }
  }

  /**
   * Reenvía el código de confirmación para una cuenta pendiente.
   * @param email Correo opcional; por defecto usa el pendiente en estado.
   */
  async resendSignUpCode(email = this.pendingConfirmationEmail()): Promise<boolean> {
    this.authenticating.set(true);
    this.authError.set('');

    try {
      await resendRegistrationCode(email.trim());
      return true;
    } catch (error) {
      this.authError.set(this.toFriendlyMessage(error, 'No se pudo reenviar el código.'));
      return false;
    } finally {
      this.authenticating.set(false);
    }
  }

  /**
   * Inicia el flujo de recuperación de contraseña.
   * @param email Correo de la cuenta.
   */
  async requestPasswordReset(email: string): Promise<boolean> {
    this.authenticating.set(true);
    this.authError.set('');

    try {
      const normalizedEmail = email.trim();
      await startPasswordReset(normalizedEmail);
      this.pendingResetEmail.set(normalizedEmail);
      return true;
    } catch (error) {
      this.authError.set(this.toFriendlyMessage(error, 'No se pudo iniciar la recuperación.'));
      return false;
    } finally {
      this.authenticating.set(false);
    }
  }

  /**
   * Completa el cambio de contraseña usando código y nueva contraseña.
   * @param code Código recibido por correo.
   * @param newPassword Nueva contraseña elegida.
   * @param email Correo opcional; por defecto usa el pendiente en estado.
   */
  async confirmPasswordReset(code: string, newPassword: string, email = this.pendingResetEmail()): Promise<boolean> {
    this.authenticating.set(true);
    this.authError.set('');

    try {
      await completePasswordReset(email.trim(), code.trim(), newPassword);
      return true;
    } catch (error) {
      this.authError.set(this.toFriendlyMessage(error, 'No se pudo actualizar la contraseña.'));
      return false;
    } finally {
      this.authenticating.set(false);
    }
  }

  /**
   * Cierra sesión y limpia el estado local.
   */
  async signOut(): Promise<void> {
    this.authError.set('');
    try {
      await logoutCurrentSession();
    } finally {
      this.clearSession();
      this.ready.set(true);
    }
  }

  /**
   * Limpia un error visible de autenticación.
   */
  clearAuthError(): void {
    this.authError.set('');
  }

  /**
   * Sincroniza el perfil del usuario autenticado con la tabla de negocio.
   * @param identity Identidad básica resuelta desde Cognito.
   */
  private async syncBusinessProfile(identity: AuthIdentity): Promise<void> {
    const profile = await new Promise<AppUserProfile>((resolve, reject) => {
      this.userService
        .syncProfile({
          cognito_sub: identity.sub,
          email: identity.email,
          nombre: identity.nombre,
        })
        .subscribe({
          next: (item) => resolve(item),
          error: reject,
        });
    });

    this.currentProfile.set(profile);
  }

  /**
   * Limpia completamente el contexto actual de sesión.
   */
  private clearSession(): void {
    this.currentIdentity.set(null);
    this.currentProfile.set(null);
  }

  /**
   * Traduce errores técnicos a un mensaje visible más claro.
   * @param error Error crudo recibido por Cognito o HTTP.
   * @param fallback Texto por defecto si no hay coincidencia conocida.
   */
  private toFriendlyMessage(error: unknown, fallback: string): string {
    const raw = String((error as { message?: string })?.message || '').toLowerCase();
    if (raw.includes('user already exists')) return 'Ya existe una cuenta con ese correo.';
    if (raw.includes('incorrect username or password')) return 'Correo o contraseña incorrectos.';
    if (raw.includes('user is not confirmed')) return 'Tu cuenta aún no ha sido confirmada.';
    if (raw.includes('code mismatch')) return 'El código ingresado no es válido.';
    if (raw.includes('expired')) return 'El código ha expirado. Solicita uno nuevo.';
    if (raw.includes('password')) return 'Revisa la contraseña e inténtalo nuevamente.';
    return fallback;
  }
}
