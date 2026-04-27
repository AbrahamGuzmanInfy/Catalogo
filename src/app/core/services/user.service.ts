import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { AppUserProfile, SyncProfilePayload } from '../models/user.model';

const API_BASE_URL = 'https://hs5rkunm27jueyzgyhqliykv7u0sizsx.lambda-url.us-east-2.on.aws';

/**
 * Gestiona las operaciones HTTP de perfil y sincronización de usuarios.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  /**
   * Sincroniza un usuario autenticado de Cognito con la tabla de negocio.
   * @param payload Identidad base proveniente de Cognito.
   */
  syncProfile(payload: SyncProfilePayload): Observable<AppUserProfile> {
    return this.http.post<AppUserProfile>(`${API_BASE_URL}/usuarios/sync`, payload);
  }
}
