$ErrorActionPreference = 'Stop'

$repo = 'C:\Users\Abraham\Documents\GitHub\Catalogo'
$region = 'us-east-2'
$tempDir = Join-Path $repo 'infra\dynamodb\temp-backfill'
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

function Write-JsonFile([string]$path, $object) {
  $object | ConvertTo-Json -Depth 30 | Set-Content $path
}

$relations = (aws dynamodb scan --region $region --table-name catalogo_productos_categorias | ConvertFrom-Json).Items |
  Sort-Object @{ Expression = { [int]$_.categoria_id.S } }, @{ Expression = { [int]$_.producto_id.S } }

$relationIndex = 1
foreach ($item in $relations) {
  $keyPath = Join-Path $tempDir "rel-key-$relationIndex.json"
  $valuesPath = Join-Path $tempDir "rel-values-$relationIndex.json"
  Write-JsonFile $keyPath @{
    categoria_id = @{ S = [string]$item.categoria_id.S }
    producto_id = @{ S = [string]$item.producto_id.S }
  }
  Write-JsonFile $valuesPath @{
    ':id' = @{ S = [string]$relationIndex }
  }
  aws dynamodb update-item `
    --region $region `
    --table-name catalogo_productos_categorias `
    --key "file://$keyPath" `
    --update-expression 'SET producto_categoria_id = :id' `
    --expression-attribute-values "file://$valuesPath" | Out-Null
  $relationIndex++
}

$details = (aws dynamodb scan --region $region --table-name catalogo_ventas_detalle | ConvertFrom-Json).Items |
  Sort-Object @{ Expression = { [int]$_.venta_id.S } }, @{ Expression = { [int]$_.detalle_id.S } }

$detailIndex = 1
foreach ($item in $details) {
  $keyPath = Join-Path $tempDir "detail-key-$detailIndex.json"
  $valuesPath = Join-Path $tempDir "detail-values-$detailIndex.json"
  Write-JsonFile $keyPath @{
    venta_id = @{ S = [string]$item.venta_id.S }
    detalle_id = @{ S = [string]$item.detalle_id.S }
  }
  Write-JsonFile $valuesPath @{
    ':id' = @{ S = [string]$detailIndex }
  }
  aws dynamodb update-item `
    --region $region `
    --table-name catalogo_ventas_detalle `
    --key "file://$keyPath" `
    --update-expression 'SET venta_detalle_id = :id' `
    --expression-attribute-values "file://$valuesPath" | Out-Null
  $detailIndex++
}

$sequenceItems = @(
  @{
    secuencia_id = @{ S = 'productos_categorias' }
    ultimo_valor = @{ N = [string]($relationIndex - 1) }
    updated_at = @{ S = [DateTime]::UtcNow.ToString('o') }
  },
  @{
    secuencia_id = @{ S = 'ventas_detalle' }
    ultimo_valor = @{ N = [string]($detailIndex - 1) }
    updated_at = @{ S = [DateTime]::UtcNow.ToString('o') }
  }
)

$seqCounter = 1
foreach ($item in $sequenceItems) {
  $itemPath = Join-Path $tempDir "sequence-$seqCounter.json"
  Write-JsonFile $itemPath $item
  aws dynamodb put-item --region $region --table-name catalogo_secuencias --item "file://$itemPath" | Out-Null
  $seqCounter++
}

Write-Output "Backfill completado: relaciones=$($relationIndex - 1), detalles=$($detailIndex - 1)"
