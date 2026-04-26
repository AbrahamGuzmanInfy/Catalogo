export type TestRole = 'dueno' | 'cliente';

export interface TestUser {
  usuario_id: string;
  nombre: string;
  rol: TestRole;
  email: string;
}
