import { Injectable } from '@angular/core';
import type { TestRole, TestUser } from '../models/user.model';

const TEST_USER_ROLE_KEY = 'petal-test-user-role';

const TEST_USERS: Record<TestRole, TestUser> = {
  dueno: {
    usuario_id: '1',
    nombre: 'Dueno Demo',
    rol: 'dueno',
    email: 'dueno@petalco.test',
  },
  cliente: {
    usuario_id: '2',
    nombre: 'Cliente Demo',
    rol: 'cliente',
    email: 'cliente@petalco.test',
  },
};

/**
 * Conserva el usuario de prueba seleccionado para el flujo local.
 */
@Injectable({ providedIn: 'root' })
export class SessionState {
  public currentTestRole: TestRole = 'dueno';

  constructor() {
    this.restoreCurrentTestRole();
  }

  /**
   * Expone el usuario asociado al rol de prueba actual.
   */
  get currentTestUser(): TestUser {
    return TEST_USERS[this.currentTestRole];
  }

  /**
   * Indica si el rol actual tiene permisos de administración de catálogo.
   */
  get isOwnerRole(): boolean {
    return this.currentTestRole === 'dueno';
  }

  /**
   * Cambia el rol de prueba activo y lo persiste en almacenamiento local.
   * @param role Nuevo rol seleccionado en la vista de usuario.
   */
  switchRole(role: TestRole): void {
    if (this.currentTestRole === role) return;
    this.currentTestRole = role;
    this.persistCurrentTestRole();
  }

  /**
   * Restaura desde localStorage el último rol usado.
   */
  private restoreCurrentTestRole(): void {
    try {
      const stored = localStorage.getItem(TEST_USER_ROLE_KEY);
      if (stored === 'dueno' || stored === 'cliente') {
        this.currentTestRole = stored;
      }
    } catch {
      this.currentTestRole = 'dueno';
    }
  }

  /**
   * Persiste el rol de prueba actual para próximas sesiones.
   */
  private persistCurrentTestRole(): void {
    try {
      localStorage.setItem(TEST_USER_ROLE_KEY, this.currentTestRole);
    } catch {
      // Ignore storage issues.
    }
  }
}
