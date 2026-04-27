import { Amplify } from 'aws-amplify';
import {
  confirmResetPassword,
  confirmSignUp,
  fetchAuthSession,
  getCurrentUser,
  resendSignUpCode,
  resetPassword,
  signIn,
  signOut,
  signUp,
} from 'aws-amplify/auth';
import { COGNITO_CONFIG, isCognitoConfigured } from './cognito.config';
import type { AuthIdentity } from '../models/user.model';

let configured = false;

export interface SignInResultPayload {
  nextStep: string;
}

export interface SignUpResultPayload {
  nextStep: string;
}

/**
 * Aplica la configuración de Cognito para que Amplify Auth pueda operar.
 */
export function configureCognitoAuth(): void {
  if (configured || !isCognitoConfigured()) return;

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: COGNITO_CONFIG.userPoolId,
        userPoolClientId: COGNITO_CONFIG.userPoolClientId,
        loginWith: {
          email: COGNITO_CONFIG.loginWithEmail,
        },
        signUpVerificationMethod: 'code',
      },
    },
  });

  configured = true;
}

/**
 * Indica si la configuración actual permite operar contra Cognito.
 */
export function canUseCognitoAuth(): boolean {
  return isCognitoConfigured();
}

/**
 * Intenta recuperar la identidad autenticada actual.
 */
export async function getAuthenticatedIdentity(): Promise<AuthIdentity | null> {
  if (!canUseCognitoAuth()) return null;
  configureCognitoAuth();

  try {
    const user = await getCurrentUser();
    const session = await fetchAuthSession();
    const payload = session.tokens?.idToken?.payload ?? {};
    const email = String(payload['email'] || user.signInDetails?.loginId || '').trim();
    const nombre = String(payload['name'] || payload['given_name'] || email || 'Usuario').trim();

    if (!user.userId || !email) return null;

    return {
      sub: user.userId,
      email,
      nombre,
    };
  } catch {
    return null;
  }
}

/**
 * Ejecuta el registro de un usuario con email y contraseña.
 */
export async function registerWithEmail(nombre: string, email: string, password: string): Promise<SignUpResultPayload> {
  configureCognitoAuth();
  const result = await signUp({
    username: email,
    password,
    options: {
      userAttributes: {
        email,
        name: nombre,
      },
    },
  });

  return {
    nextStep: result.nextStep.signUpStep,
  };
}

/**
 * Confirma el código de registro de una cuenta pendiente.
 */
export async function confirmEmailRegistration(email: string, code: string): Promise<void> {
  configureCognitoAuth();
  await confirmSignUp({
    username: email,
    confirmationCode: code,
  });
}

/**
 * Reenvía el código de confirmación para una cuenta pendiente.
 */
export async function resendRegistrationCode(email: string): Promise<void> {
  configureCognitoAuth();
  await resendSignUpCode({
    username: email,
  });
}

/**
 * Inicia sesión con email y contraseña.
 */
export async function loginWithEmail(email: string, password: string): Promise<SignInResultPayload> {
  configureCognitoAuth();
  const result = await signIn({
    username: email,
    password,
  });

  return {
    nextStep: result.nextStep.signInStep,
  };
}

/**
 * Inicia el flujo de recuperación de contraseña.
 */
export async function startPasswordReset(email: string): Promise<void> {
  configureCognitoAuth();
  await resetPassword({
    username: email,
  });
}

/**
 * Confirma una nueva contraseña usando el código de recuperación.
 */
export async function completePasswordReset(email: string, code: string, newPassword: string): Promise<void> {
  configureCognitoAuth();
  await confirmResetPassword({
    username: email,
    confirmationCode: code,
    newPassword,
  });
}

/**
 * Cierra la sesión actual y revoca tokens locales.
 */
export async function logoutCurrentSession(): Promise<void> {
  if (!canUseCognitoAuth()) return;
  configureCognitoAuth();
  await signOut({ global: true });
}
