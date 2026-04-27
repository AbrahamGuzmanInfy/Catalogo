export type UserRole = 'admin' | 'dueno' | 'cliente';

export interface AuthIdentity {
  sub: string;
  email: string;
  nombre: string;
}

export interface AppUserProfile {
  usuario_id: string;
  cognito_sub: string;
  nombre: string;
  email: string;
  telefono?: string;
  rol: UserRole;
  rol_id: string;
  activo: boolean;
}

export interface SyncProfilePayload {
  cognito_sub: string;
  email: string;
  nombre: string;
  telefono?: string;
}
