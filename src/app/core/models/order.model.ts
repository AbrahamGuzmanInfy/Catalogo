export interface VentaDetalle {
  venta_detalle_id?: string;
  venta_id?: string;
  detalle_id?: string;
  producto_id?: string;
  nombre?: string;
  nombre_producto?: string;
  cantidad?: number;
  precio_unitario?: number;
  descuento?: number;
  subtotal?: number;
  dedicatoria?: string;
}

export interface Venta {
  venta_id: string;
  usuario_id: string;
  estatus: string;
  items_count?: number;
  items: VentaDetalle[];
  subtotal: number;
  descuento: number;
  envio: number;
  impuestos: number;
  total: number;
  moneda: string;
  metodo_entrega: string;
  metodo_pago: string;
  fecha_entrega: string;
  created_at: string;
  updated_at: string;
  detailsLoaded?: boolean;
}

export interface VentasResponse {
  items: Venta[];
}

export interface CreateVentaResponse {
  venta_id: string;
  estatus: string;
  total: number;
}

export interface CreateVentaPayload {
  usuario_id: string;
  estatus: string;
  cliente: {
    nombre: string;
    email: string;
  };
  items: Array<{
    producto_id: string;
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    dedicatoria: string;
  }>;
  envio: number;
  moneda: string;
  metodo_pago: string;
}
