import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import type { CreateVentaPayload, CreateVentaResponse, Venta, VentasResponse } from '../models/order.model';

const API_BASE_URL = 'https://hs5rkunm27jueyzgyhqliykv7u0sizsx.lambda-url.us-east-2.on.aws';

/**
 * Gestiona las operaciones HTTP relacionadas con pedidos y ventas.
 */
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);

  /**
   * Recupera los pedidos vinculados a un usuario.
   * @param usuarioId Identificador numérico del usuario activo.
   */
  getOrdersByUser(usuarioId: string): Observable<Venta[]> {
    const encodedId = encodeURIComponent(usuarioId);
    return this.http
      .get<VentasResponse>(`${API_BASE_URL}/ventas?usuario_id=${encodedId}`)
      .pipe(map((response) => response.items ?? []));
  }

  /**
   * Recupera el detalle completo de un pedido.
   * @param orderId Identificador numérico de la venta.
   */
  getOrderById(orderId: string): Observable<Venta> {
    return this.http.get<Venta>(`${API_BASE_URL}/ventas/${orderId}`);
  }

  /**
   * Crea una venta a partir del estado actual del carrito.
   * @param payload Cliente, items y totales preparados para checkout.
   */
  createOrder(payload: CreateVentaPayload): Observable<CreateVentaResponse> {
    return this.http.post<CreateVentaResponse>(`${API_BASE_URL}/ventas`, payload);
  }
}
