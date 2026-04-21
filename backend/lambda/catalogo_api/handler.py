import json
import os
import re
import unicodedata
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from botocore.config import Config


dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3', region_name=os.environ.get('AWS_REGION', os.environ.get('AWS_DEFAULT_REGION', 'us-east-2')), config=Config(signature_version='s3v4', s3={'addressing_style': 'virtual'}))

CATEGORIAS_TABLE = os.environ.get('CATEGORIAS_TABLE', 'catalogo_categorias')
PRODUCTOS_TABLE = os.environ.get('PRODUCTOS_TABLE', 'catalogo_productos')
PRODUCTOS_CATEGORIAS_TABLE = os.environ.get('PRODUCTOS_CATEGORIAS_TABLE', 'catalogo_productos_categorias')
VENTAS_TABLE = os.environ.get('VENTAS_TABLE', 'catalogo_ventas')
VENTAS_DETALLE_TABLE = os.environ.get('VENTAS_DETALLE_TABLE', 'catalogo_ventas_detalle')
PAGOS_TABLE = os.environ.get('PAGOS_TABLE', 'catalogo_pagos')
MEDIA_BUCKET = os.environ.get('MEDIA_BUCKET', 'media-app-1')
AWS_REGION = os.environ.get('AWS_REGION', os.environ.get('AWS_DEFAULT_REGION', 'us-east-2'))
MEDIA_BASE_URL = os.environ.get('MEDIA_BASE_URL', f'https://{MEDIA_BUCKET}.s3.{AWS_REGION}.amazonaws.com')

categorias_table = dynamodb.Table(CATEGORIAS_TABLE)
productos_table = dynamodb.Table(PRODUCTOS_TABLE)
productos_categorias_table = dynamodb.Table(PRODUCTOS_CATEGORIAS_TABLE)
ventas_table = dynamodb.Table(VENTAS_TABLE)
ventas_detalle_table = dynamodb.Table(VENTAS_DETALLE_TABLE)
pagos_table = dynamodb.Table(PAGOS_TABLE)


def serialize_value(value):
    if isinstance(value, Decimal):
        if value % 1 == 0:
            return int(value)
        return float(value)
    return value


def response(status_code: int, body: dict) -> dict:
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
        },
        'body': json.dumps(body, default=serialize_value),
    }


def parse_body(event: dict) -> dict:
    try:
        return json.loads(event.get('body') or '{}')
    except json.JSONDecodeError as error:
        raise ValueError('Payload invalido') from error


def path_parts(event: dict) -> list[str]:
    raw_path = event.get('rawPath', '')
    return [part for part in raw_path.split('/') if part]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def slugify(value: str) -> str:
    normalized = unicodedata.normalize('NFKD', value)
    ascii_text = normalized.encode('ascii', 'ignore').decode('ascii')
    slug = re.sub(r'[^a-zA-Z0-9]+', '-', ascii_text.lower()).strip('-')
    return slug or f'item-{uuid.uuid4().hex[:8]}'


def scan_all(table) -> list[dict]:
    items: list[dict] = []
    result = table.scan()
    items.extend(result.get('Items', []))

    while 'LastEvaluatedKey' in result:
        result = table.scan(ExclusiveStartKey=result['LastEvaluatedKey'])
        items.extend(result.get('Items', []))

    return items


def is_active(item: dict, field: str) -> bool:
    return str(item.get(field, 'true')).lower() == 'true'


def decimal_value(value, default='0') -> Decimal:
    if value in (None, ''):
        value = default
    return Decimal(str(value))


def dynamodb_value(value):
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {key: dynamodb_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [dynamodb_value(item) for item in value]
    return value


def query_params(event: dict) -> dict:
    return event.get('queryStringParameters') or {}


def safe_file_extension(filename: str, content_type: str) -> str:
    extension = os.path.splitext(filename or '')[1].lower()
    if extension in ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic'):
        return extension

    mapping = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
        'image/heic': '.heic',
    }
    return mapping.get(content_type.lower(), '.jpg')


def public_media_url(key: str) -> str:
    return f"{MEDIA_BASE_URL.rstrip('/')}/{key}"


def public_category(item: dict) -> dict:
    return {
        'categoria_id': item.get('categoria_id', ''),
        'nombre': item.get('nombre', ''),
        'slug': item.get('slug', ''),
        'activa': item.get('activa', 'true'),
        'orden': item.get('orden', 0),
        'created_at': item.get('created_at', ''),
        'updated_at': item.get('updated_at', ''),
        'imageUrl': item.get('imagen_url', ''),
    }


def price_text(value) -> str:
    return f'${decimal_value(value):.2f}'


def public_product(item: dict, categoria_ids: list[str] | None = None) -> dict:
    name = item.get('nombre') or item.get('name') or ''
    image = item.get('imagen_url') or item.get('image') or ''
    detail_image = item.get('detalle_imagen_url') or item.get('detailImage') or image
    return {
        'producto_id': item.get('producto_id', ''),
        'name': name,
        'price': item.get('price') or price_text(item.get('precio')),
        'image': image,
        'detailImage': detail_image,
        'alt': item.get('alt') or name,
        'description': item.get('descripcion') or item.get('description') or '',
        'model3dUrl': item.get('model3d_url') or item.get('model3dUrl') or '',
        'categoriaIds': categoria_ids or [],
        'slug': item.get('slug') or slugify(name),
        'activo': item.get('activo', 'true'),
        'orden': item.get('orden', 0),
        'created_at': item.get('created_at', ''),
        'updated_at': item.get('updated_at', ''),
    }


def public_venta(item: dict) -> dict:
    return {
        'venta_id': item.get('venta_id', ''),
        'usuario_id': item.get('usuario_id', 'INVITADO'),
        'estatus': item.get('estatus', 'pendiente'),
        'cliente': item.get('cliente', {}),
        'direccion_entrega': item.get('direccion_entrega', {}),
        'items': item.get('items', []),
        'subtotal': item.get('subtotal', 0),
        'descuento': item.get('descuento', 0),
        'envio': item.get('envio', 0),
        'impuestos': item.get('impuestos', 0),
        'total': item.get('total', 0),
        'moneda': item.get('moneda', 'MXN'),
        'metodo_entrega': item.get('metodo_entrega', 'domicilio'),
        'metodo_pago': item.get('metodo_pago', 'pendiente'),
        'fecha_entrega': item.get('fecha_entrega', ''),
        'created_at': item.get('created_at', ''),
        'updated_at': item.get('updated_at', ''),
    }


def public_venta_detalle(item: dict) -> dict:
    return {
        'venta_id': item.get('venta_id', ''),
        'detalle_id': item.get('detalle_id', ''),
        'producto_id': item.get('producto_id', ''),
        'nombre_producto': item.get('nombre_producto', ''),
        'cantidad': item.get('cantidad', 0),
        'precio_unitario': item.get('precio_unitario', 0),
        'descuento': item.get('descuento', 0),
        'subtotal': item.get('subtotal', 0),
        'dedicatoria': item.get('dedicatoria', ''),
        'created_at': item.get('created_at', ''),
        'updated_at': item.get('updated_at', ''),
    }


def public_pago(item: dict) -> dict:
    return {
        'pago_id': item.get('pago_id', ''),
        'venta_id': item.get('venta_id', ''),
        'estatus': item.get('estatus', 'pendiente'),
        'metodo_pago': item.get('metodo_pago', ''),
        'monto': item.get('monto', 0),
        'moneda': item.get('moneda', 'MXN'),
        'referencia': item.get('referencia', ''),
        'created_at': item.get('created_at', ''),
        'updated_at': item.get('updated_at', ''),
    }


def normalize_venta_items(items: list[dict]) -> tuple[list[dict], Decimal]:
    normalized_items: list[dict] = []
    subtotal = Decimal('0')

    for index, raw_item in enumerate(items, start=1):
        producto_id = str(raw_item.get('producto_id', '')).strip()
        nombre = str(raw_item.get('nombre') or raw_item.get('nombre_producto') or raw_item.get('name') or '').strip()
        cantidad = decimal_value(raw_item.get('cantidad', 1), 1)
        precio_unitario = decimal_value(raw_item.get('precio_unitario') or raw_item.get('precio') or raw_item.get('price'), 0)

        if not producto_id or not nombre:
            raise ValueError(f'El item {index} requiere producto_id y nombre')
        if cantidad <= 0:
            raise ValueError(f'El item {index} requiere cantidad mayor a 0')

        item_subtotal = cantidad * precio_unitario
        subtotal += item_subtotal
        normalized_items.append({
            'detalle_id': str(raw_item.get('detalle_id') or f'DET-{index:03d}'),
            'producto_id': producto_id,
            'nombre_producto': nombre,
            'cantidad': cantidad,
            'precio_unitario': precio_unitario,
            'descuento': decimal_value(raw_item.get('descuento', 0)),
            'subtotal': item_subtotal,
            'dedicatoria': str(raw_item.get('dedicatoria') or '').strip(),
        })

    return normalized_items, subtotal


def list_categorias() -> dict:
    items = [public_category(item) for item in scan_all(categorias_table)]
    items = [item for item in items if item.get('categoria_id') != '__meta__sequence']
    items = [item for item in items if is_active(item, 'activa')]
    items.sort(key=lambda item: (int(item.get('orden') or 0), item.get('nombre', '').lower()))
    return response(200, {'items': items})


def list_productos(event: dict) -> dict:
    params = query_params(event)
    include_inactive = str(params.get('include_inactive', '')).lower() in ('1', 'true', 'yes')
    relaciones = scan_all(productos_categorias_table)
    categorias_por_producto: dict[str, list[str]] = {}
    for relacion in relaciones:
        producto_id = str(relacion.get('producto_id', ''))
        categoria_id = str(relacion.get('categoria_id', ''))
        if producto_id and categoria_id:
            categorias_por_producto.setdefault(producto_id, []).append(categoria_id)

    items = [
        public_product(item, categorias_por_producto.get(str(item.get('producto_id', '')), []))
        for item in scan_all(productos_table)
    ]
    items = [item for item in items if item.get('producto_id') != '__meta__sequence']
    if not include_inactive:
        items = [item for item in items if is_active(item, 'activo')]
    items.sort(key=lambda item: (int(item.get('orden') or 0), item.get('name', '').lower()))
    return response(200, {'items': items})


def list_ventas(event: dict) -> dict:
    params = query_params(event)
    estatus = params.get('estatus')
    usuario_id = params.get('usuario_id')
    items = [public_venta(item) for item in scan_all(ventas_table)]

    if estatus:
        items = [item for item in items if item.get('estatus') == estatus]
    if usuario_id:
        items = [item for item in items if item.get('usuario_id') == usuario_id]

    items.sort(key=lambda item: item.get('created_at', ''), reverse=True)
    return response(200, {'items': items})


def get_venta(venta_id: str) -> dict:
    result = ventas_table.get_item(Key={'venta_id': venta_id})
    item = result.get('Item')
    if not item:
        return response(404, {'message': 'Venta no encontrada'})
    venta = public_venta(item)
    venta['items'] = venta_detalle_items(venta_id)
    return response(200, venta)


def venta_detalle_items(venta_id: str) -> list[dict]:
    result = ventas_detalle_table.query(
        KeyConditionExpression='venta_id = :venta_id',
        ExpressionAttributeValues={':venta_id': venta_id},
    )
    items = [public_venta_detalle(item) for item in result.get('Items', [])]

    while 'LastEvaluatedKey' in result:
        result = ventas_detalle_table.query(
            KeyConditionExpression='venta_id = :venta_id',
            ExpressionAttributeValues={':venta_id': venta_id},
            ExclusiveStartKey=result['LastEvaluatedKey'],
        )
        items.extend(public_venta_detalle(item) for item in result.get('Items', []))

    items.sort(key=lambda item: item.get('detalle_id', ''))
    return items


def list_ventas_detalle(event: dict) -> dict:
    params = query_params(event)
    venta_id = params.get('venta_id')
    producto_id = params.get('producto_id')
    items = [public_venta_detalle(item) for item in scan_all(ventas_detalle_table)]

    if venta_id:
        items = [item for item in items if item.get('venta_id') == venta_id]
    if producto_id:
        items = [item for item in items if item.get('producto_id') == producto_id]

    items.sort(key=lambda item: (item.get('venta_id', ''), item.get('detalle_id', '')))
    return response(200, {'items': items})


def list_pagos(event: dict) -> dict:
    params = query_params(event)
    venta_id = params.get('venta_id')
    estatus = params.get('estatus')
    items = [public_pago(item) for item in scan_all(pagos_table)]

    if venta_id:
        items = [item for item in items if item.get('venta_id') == venta_id]
    if estatus:
        items = [item for item in items if item.get('estatus') == estatus]

    items.sort(key=lambda item: item.get('created_at', ''), reverse=True)
    return response(200, {'items': items})


def create_upload_url(payload: dict) -> dict:
    file_name = str(payload.get('fileName') or payload.get('file_name') or '').strip()
    content_type = str(payload.get('contentType') or payload.get('content_type') or 'image/jpeg').strip().lower()
    folder = str(payload.get('folder') or 'products').strip().lower()

    if not file_name:
        return response(400, {'message': 'fileName es obligatorio'})
    if not content_type.startswith('image/'):
        return response(400, {'message': 'Solo se permiten imagenes'})

    safe_folder = 'categories' if folder == 'categories' else 'products'
    extension = safe_file_extension(file_name, content_type)
    key = f"uploads/{safe_folder}/{datetime.now(timezone.utc).strftime('%Y/%m')}/{uuid.uuid4().hex}{extension}"
    upload_url = s3_client.generate_presigned_url(
        'put_object',
        Params={
            'Bucket': MEDIA_BUCKET,
            'Key': key,
            'ContentType': content_type,
        },
        ExpiresIn=300,
    )

    return response(200, {
        'uploadUrl': upload_url,
        'fileUrl': public_media_url(key),
        'key': key,
        'bucket': MEDIA_BUCKET,
    })


def create_categoria(payload: dict) -> dict:
    nombre = str(payload.get('nombre', '')).strip()
    if not nombre:
        return response(400, {'message': 'El nombre es obligatorio'})

    timestamp = now_iso()
    item = {
        'categoria_id': str(payload.get('categoria_id') or f'CAT-{uuid.uuid4().hex[:10].upper()}'),
        'nombre': nombre,
        'slug': str(payload.get('slug') or slugify(nombre)).strip().lower(),
        'activa': 'true' if payload.get('activa', True) else 'false',
        'imagen_url': str(payload.get('imagen_url') or payload.get('imageUrl') or payload.get('image') or '').strip(),
        'orden': decimal_value(payload.get('orden', 0)),
        'created_at': timestamp,
        'updated_at': timestamp,
    }
    categorias_table.put_item(Item=item)
    return response(201, public_category(item))


def create_producto(payload: dict) -> dict:
    nombre = str(payload.get('nombre') or payload.get('name') or '').strip()
    if not nombre:
        return response(400, {'message': 'El nombre es obligatorio'})

    timestamp = now_iso()
    item = {
        'producto_id': str(payload.get('producto_id') or f'PROD-{uuid.uuid4().hex[:10].upper()}'),
        'nombre': nombre,
        'slug': str(payload.get('slug') or slugify(nombre)).strip().lower(),
        'precio': decimal_value(payload.get('precio') or payload.get('price'), 0),
        'imagen_url': str(payload.get('imagen_url') or payload.get('image') or '').strip(),
        'detalle_imagen_url': str(payload.get('detalle_imagen_url') or payload.get('detailImage') or payload.get('imagen_url') or payload.get('image') or '').strip(),
        'alt': str(payload.get('alt') or nombre).strip(),
        'descripcion': str(payload.get('descripcion') or payload.get('description') or '').strip(),
        'model3d_url': str(payload.get('model3d_url') or payload.get('model3dUrl') or '').strip(),
        'activo': 'true' if payload.get('activo', True) else 'false',
        'orden': decimal_value(payload.get('orden', 0)),
        'created_at': str(payload.get('created_at') or timestamp),
        'updated_at': timestamp,
    }
    productos_table.put_item(Item=item)
    return response(201, public_product(item))


def create_producto_categoria(payload: dict) -> dict:
    categoria_id = str(payload.get('categoria_id', '')).strip()
    producto_id = str(payload.get('producto_id', '')).strip()
    if not categoria_id or not producto_id:
        return response(400, {'message': 'categoria_id y producto_id son obligatorios'})

    item = {
        'categoria_id': categoria_id,
        'producto_id': producto_id,
        'created_at': str(payload.get('created_at') or now_iso()),
    }
    productos_categorias_table.put_item(Item=item)
    return response(201, item)


def replace_producto_categorias(producto_id: str, categoria_ids: list[str]) -> None:
    existing = productos_categorias_table.query(
        IndexName='producto_id-index',
        KeyConditionExpression='producto_id = :producto_id',
        ExpressionAttributeValues={':producto_id': producto_id},
    )
    relaciones = existing.get('Items', [])

    while 'LastEvaluatedKey' in existing:
        existing = productos_categorias_table.query(
            IndexName='producto_id-index',
            KeyConditionExpression='producto_id = :producto_id',
            ExpressionAttributeValues={':producto_id': producto_id},
            ExclusiveStartKey=existing['LastEvaluatedKey'],
        )
        relaciones.extend(existing.get('Items', []))

    with productos_categorias_table.batch_writer() as batch:
        for relacion in relaciones:
            categoria_id = str(relacion.get('categoria_id', '')).strip()
            if categoria_id:
                batch.delete_item(Key={'categoria_id': categoria_id, 'producto_id': producto_id})

        for categoria_id in categoria_ids:
            batch.put_item(Item={
                'categoria_id': categoria_id,
                'producto_id': producto_id,
                'created_at': now_iso(),
            })


def delete_categoria_relaciones(categoria_id: str) -> None:
    existing = productos_categorias_table.query(
        KeyConditionExpression='categoria_id = :categoria_id',
        ExpressionAttributeValues={':categoria_id': categoria_id},
    )
    relaciones = existing.get('Items', [])

    while 'LastEvaluatedKey' in existing:
        existing = productos_categorias_table.query(
            KeyConditionExpression='categoria_id = :categoria_id',
            ExpressionAttributeValues={':categoria_id': categoria_id},
            ExclusiveStartKey=existing['LastEvaluatedKey'],
        )
        relaciones.extend(existing.get('Items', []))

    with productos_categorias_table.batch_writer() as batch:
        for relacion in relaciones:
            producto_id = str(relacion.get('producto_id', '')).strip()
            if producto_id:
                batch.delete_item(Key={'categoria_id': categoria_id, 'producto_id': producto_id})


def update_categoria(categoria_id: str, payload: dict) -> dict:
    result = categorias_table.get_item(Key={'categoria_id': categoria_id})
    existing = result.get('Item')
    if not existing:
        return response(404, {'message': 'Categoria no encontrada'})

    nombre = str(payload.get('nombre') or existing.get('nombre') or '').strip()
    if not nombre:
        return response(400, {'message': 'El nombre es obligatorio'})

    updated = {
        **existing,
        'nombre': nombre,
        'slug': str(payload.get('slug') or slugify(nombre)).strip().lower(),
        'activa': 'true' if payload.get('activa', existing.get('activa', 'true')) not in (False, 'false', 'False', 0, '0') else 'false',
        'imagen_url': str(payload.get('imagen_url') or payload.get('imageUrl') or payload.get('image') or existing.get('imagen_url') or '').strip(),
        'orden': decimal_value(payload.get('orden', existing.get('orden', 0))),
        'updated_at': now_iso(),
    }
    categorias_table.put_item(Item=updated)
    return response(200, public_category(updated))


def delete_categoria(categoria_id: str) -> dict:
    result = categorias_table.get_item(Key={'categoria_id': categoria_id})
    if 'Item' not in result:
        return response(404, {'message': 'Categoria no encontrada'})

    delete_categoria_relaciones(categoria_id)
    categorias_table.delete_item(Key={'categoria_id': categoria_id})
    return response(200, {'deleted': True, 'categoria_id': categoria_id})


def update_producto(producto_id: str, payload: dict) -> dict:
    result = productos_table.get_item(Key={'producto_id': producto_id})
    existing = result.get('Item')
    if not existing:
        return response(404, {'message': 'Producto no encontrado'})

    nombre = str(payload.get('nombre') or payload.get('name') or existing.get('nombre') or '').strip()
    if not nombre:
        return response(400, {'message': 'El nombre es obligatorio'})

    imagen_url = str(payload.get('imagen_url') or payload.get('image') or existing.get('imagen_url') or '').strip()
    descripcion = str(payload.get('descripcion') or payload.get('description') or existing.get('descripcion') or '').strip()
    if not imagen_url:
        return response(400, {'message': 'La imagen es obligatoria'})
    if not descripcion:
        return response(400, {'message': 'La descripcion es obligatoria'})

    updated = {
        **existing,
        'nombre': nombre,
        'slug': str(payload.get('slug') or slugify(nombre)).strip().lower(),
        'precio': decimal_value(payload.get('precio') or payload.get('price'), existing.get('precio', 0)),
        'imagen_url': imagen_url,
        'detalle_imagen_url': str(payload.get('detalle_imagen_url') or payload.get('detailImage') or imagen_url).strip(),
        'alt': str(payload.get('alt') or existing.get('alt') or nombre).strip(),
        'descripcion': descripcion,
        'model3d_url': str(payload.get('model3d_url') or payload.get('model3dUrl') or existing.get('model3d_url') or '').strip(),
        'activo': 'true' if payload.get('activo', existing.get('activo', 'true')) not in (False, 'false', 'False', 0, '0') else 'false',
        'orden': decimal_value(payload.get('orden', existing.get('orden', 0))),
        'updated_at': now_iso(),
    }
    productos_table.put_item(Item=updated)

    raw_categoria_ids = payload.get('categoria_ids')
    if isinstance(raw_categoria_ids, list):
        categoria_ids = sorted({str(item).strip() for item in raw_categoria_ids if str(item).strip()})
        replace_producto_categorias(producto_id, categoria_ids)
        return response(200, public_product(updated, categoria_ids))

    return response(200, public_product(updated))


def delete_producto(producto_id: str) -> dict:
    result = productos_table.get_item(Key={'producto_id': producto_id})
    if 'Item' not in result:
        return response(404, {'message': 'Producto no encontrado'})

    replace_producto_categorias(producto_id, [])
    productos_table.delete_item(Key={'producto_id': producto_id})
    return response(200, {'deleted': True, 'producto_id': producto_id})


def create_venta(payload: dict) -> dict:
    raw_items = payload.get('items') or []
    if not isinstance(raw_items, list) or not raw_items:
        return response(400, {'message': 'La venta requiere al menos un item'})

    try:
        items, subtotal = normalize_venta_items(raw_items)
    except ValueError as error:
        return response(400, {'message': str(error)})

    descuento = decimal_value(payload.get('descuento', 0))
    envio = decimal_value(payload.get('envio', 0))
    impuestos = decimal_value(payload.get('impuestos', 0))
    total = decimal_value(payload.get('total'), subtotal - descuento + envio + impuestos)
    timestamp = now_iso()

    item = {
        'venta_id': str(payload.get('venta_id') or f'VEN-{uuid.uuid4().hex[:12].upper()}'),
        'usuario_id': str(payload.get('usuario_id') or 'INVITADO'),
        'estatus': str(payload.get('estatus') or 'pendiente'),
        'cliente': dynamodb_value(payload.get('cliente') or {}),
        'direccion_entrega': dynamodb_value(payload.get('direccion_entrega') or {}),
        'items_count': len(items),
        'subtotal': subtotal,
        'descuento': descuento,
        'envio': envio,
        'impuestos': impuestos,
        'total': total,
        'moneda': str(payload.get('moneda') or 'MXN'),
        'metodo_entrega': str(payload.get('metodo_entrega') or 'domicilio'),
        'metodo_pago': str(payload.get('metodo_pago') or 'pendiente'),
        'created_at': timestamp,
        'updated_at': timestamp,
    }
    fecha_entrega = str(payload.get('fecha_entrega') or '').strip()
    if fecha_entrega:
        item['fecha_entrega'] = fecha_entrega

    ventas_table.put_item(Item=item)
    for detalle in items:
        detalle_item = {**detalle, 'venta_id': item['venta_id'], 'created_at': timestamp, 'updated_at': timestamp}
        ventas_detalle_table.put_item(Item=detalle_item)

    venta = public_venta(item)
    venta['items'] = items
    return response(201, venta)


def update_venta_estatus(venta_id: str, payload: dict) -> dict:
    estatus = str(payload.get('estatus', '')).strip()
    if not estatus:
        return response(400, {'message': 'El estatus es obligatorio'})

    result = ventas_table.update_item(
        Key={'venta_id': venta_id},
        UpdateExpression='SET estatus = :estatus, updated_at = :updated_at',
        ExpressionAttributeValues={
            ':estatus': estatus,
            ':updated_at': now_iso(),
        },
        ReturnValues='ALL_NEW',
    )
    return response(200, public_venta(result.get('Attributes', {})))


def create_pago(payload: dict) -> dict:
    venta_id = str(payload.get('venta_id', '')).strip()
    if not venta_id:
        return response(400, {'message': 'venta_id es obligatorio'})

    timestamp = now_iso()
    item = {
        'pago_id': str(payload.get('pago_id') or f'PAGO-{uuid.uuid4().hex[:12].upper()}'),
        'venta_id': venta_id,
        'estatus': str(payload.get('estatus') or 'pendiente'),
        'metodo_pago': str(payload.get('metodo_pago') or '').strip(),
        'monto': decimal_value(payload.get('monto'), 0),
        'moneda': str(payload.get('moneda') or 'MXN'),
        'referencia': str(payload.get('referencia') or '').strip(),
        'created_at': timestamp,
        'updated_at': timestamp,
    }
    pagos_table.put_item(Item=item)

    if item['estatus'] in ('aprobado', 'pagado'):
        ventas_table.update_item(
            Key={'venta_id': venta_id},
            UpdateExpression='SET estatus = :estatus, metodo_pago = :metodo_pago, updated_at = :updated_at',
            ExpressionAttributeValues={
                ':estatus': 'pagada',
                ':metodo_pago': item['metodo_pago'] or 'registrado',
                ':updated_at': timestamp,
            },
        )

    return response(201, public_pago(item))


def lambda_handler(event, context):
    method = event.get('requestContext', {}).get('http', {}).get('method', '')
    parts = path_parts(event)

    if method == 'OPTIONS':
        return response(200, {'ok': True})

    try:
        if not parts:
            return response(200, {'message': 'Catalogo API activa'})

        resource = parts[0]

        if resource == 'categorias':
            if method == 'GET' and len(parts) == 1:
                return list_categorias()
            if method == 'POST' and len(parts) == 1:
                return create_categoria(parse_body(event))
            if method == 'PATCH' and len(parts) == 2:
                return update_categoria(parts[1], parse_body(event))
            if method == 'DELETE' and len(parts) == 2:
                return delete_categoria(parts[1])

        if resource == 'productos':
            if method == 'GET' and len(parts) == 1:
                return list_productos(event)
            if method == 'POST' and len(parts) == 1:
                return create_producto(parse_body(event))
            if method == 'PATCH' and len(parts) == 2:
                return update_producto(parts[1], parse_body(event))
            if method == 'DELETE' and len(parts) == 2:
                return delete_producto(parts[1])

        if resource in ('productos-categorias', 'productos_categorias'):
            if method == 'POST' and len(parts) == 1:
                return create_producto_categoria(parse_body(event))

        if resource == 'ventas':
            if method == 'GET' and len(parts) == 1:
                return list_ventas(event)
            if method == 'POST' and len(parts) == 1:
                return create_venta(parse_body(event))
            if method == 'GET' and len(parts) == 2:
                return get_venta(parts[1])
            if method == 'PATCH' and len(parts) == 3 and parts[2] == 'estatus':
                return update_venta_estatus(parts[1], parse_body(event))

        if resource in ('ventas-detalle', 'ventas_detalle'):
            if method == 'GET' and len(parts) == 1:
                return list_ventas_detalle(event)

        if resource == 'uploads':
            if method == 'POST' and len(parts) == 2 and parts[1] == 'presign':
                return create_upload_url(parse_body(event))

        if resource == 'pagos':
            if method == 'GET' and len(parts) == 1:
                return list_pagos(event)
            if method == 'POST' and len(parts) == 1:
                return create_pago(parse_body(event))

        return response(404, {'message': 'Ruta no encontrada'})
    except ValueError as error:
        return response(400, {'message': str(error)})
    except Exception as error:
        return response(500, {'message': 'Error interno', 'detail': str(error)})

