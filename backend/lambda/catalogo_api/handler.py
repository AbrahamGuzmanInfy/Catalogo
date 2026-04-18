import json
import os
import re
import unicodedata
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3


dynamodb = boto3.resource('dynamodb')

CATEGORIAS_TABLE = os.environ.get('CATEGORIAS_TABLE', 'catalogo_categorias')
PRODUCTOS_TABLE = os.environ.get('PRODUCTOS_TABLE', 'catalogo_productos')
categorias_table = dynamodb.Table(CATEGORIAS_TABLE)
productos_table = dynamodb.Table(PRODUCTOS_TABLE)


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


def public_category(item: dict) -> dict:
    return {
        'categoria_id': item.get('categoria_id', ''),
        'nombre': item.get('nombre', ''),
        'slug': item.get('slug', ''),
        'activa': item.get('activa', 'true'),
        'orden': item.get('orden', 0),
        'created_at': item.get('created_at', ''),
        'updated_at': item.get('updated_at', ''),
    }


def price_text(value) -> str:
    return f'${decimal_value(value):.2f}'


def public_product(item: dict) -> dict:
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
        'slug': item.get('slug') or slugify(name),
        'activo': item.get('activo', 'true'),
        'orden': item.get('orden', 0),
        'created_at': item.get('created_at', ''),
        'updated_at': item.get('updated_at', ''),
    }


def list_categorias() -> dict:
    items = [public_category(item) for item in scan_all(categorias_table)]
    items = [item for item in items if item.get('categoria_id') != '__meta__sequence']
    items = [item for item in items if is_active(item, 'activa')]
    items.sort(key=lambda item: (int(item.get('orden') or 0), item.get('nombre', '').lower()))
    return response(200, {'items': items})


def list_productos() -> dict:
    items = [public_product(item) for item in scan_all(productos_table)]
    items = [item for item in items if item.get('producto_id') != '__meta__sequence']
    items = [item for item in items if is_active(item, 'activo')]
    items.sort(key=lambda item: (int(item.get('orden') or 0), item.get('name', '').lower()))
    return response(200, {'items': items})


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
        'activo': 'true' if payload.get('activo', True) else 'false',
        'orden': decimal_value(payload.get('orden', 0)),
        'created_at': str(payload.get('created_at') or timestamp),
        'updated_at': timestamp,
    }
    productos_table.put_item(Item=item)
    return response(201, public_product(item))


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

        if resource == 'productos':
            if method == 'GET' and len(parts) == 1:
                return list_productos()
            if method == 'POST' and len(parts) == 1:
                return create_producto(parse_body(event))

        return response(404, {'message': 'Ruta no encontrada'})
    except ValueError as error:
        return response(400, {'message': str(error)})
    except Exception as error:
        return response(500, {'message': 'Error interno', 'detail': str(error)})