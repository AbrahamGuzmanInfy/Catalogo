$ErrorActionPreference = 'Stop'

$repo = 'C:\Users\Abraham\Documents\GitHub\Catalogo'
$backupDir = Join-Path $repo 'infra\dynamodb\backups\2026-04-21-numeric-id-migration'
$region = 'us-east-2'
$tempDir = Join-Path $backupDir 'requests'
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

function Load-TableBackup([string]$tableName) {
  return (Get-Content (Join-Path $backupDir "$tableName.json") -Raw | ConvertFrom-Json).Items
}

function Clone-Item($item) {
  return ($item | ConvertTo-Json -Depth 30 | ConvertFrom-Json)
}

function Get-StringAttr($item, [string]$name) {
  $property = $item.PSObject.Properties[$name]
  if (-not $property) { return '' }
  $value = $property.Value
  if ($null -eq $value) { return '' }
  if ($value.PSObject.Properties['S']) { return [string]$value.S }
  if ($value.PSObject.Properties['N']) { return [string]$value.N }
  return ''
}

function Get-NumberAttr($item, [string]$name) {
  $raw = Get-StringAttr $item $name
  if ([string]::IsNullOrWhiteSpace($raw)) { return 0 }
  return [int]$raw
}

function Set-StringAttr($item, [string]$name, [string]$value) {
  $item | Add-Member -Force -NotePropertyName $name -NotePropertyValue ([pscustomobject]@{ S = $value })
}

function Set-NumberAttr($item, [string]$name, [int]$value) {
  $item | Add-Member -Force -NotePropertyName $name -NotePropertyValue ([pscustomobject]@{ N = [string]$value })
}

function New-StringAttr([string]$value) {
  return [pscustomobject]@{ S = $value }
}

function Write-BatchRequest([string]$tableName, [array]$putItems, [array]$deleteKeys) {
  $requests = @()

  foreach ($item in $putItems) {
    $requests += [pscustomobject]@{
      PutRequest = [pscustomobject]@{
        Item = $item
      }
    }
  }

  foreach ($key in $deleteKeys) {
    $requests += [pscustomobject]@{
      DeleteRequest = [pscustomobject]@{
        Key = $key
      }
    }
  }

  $body = [pscustomobject]@{}
  $body | Add-Member -NotePropertyName $tableName -NotePropertyValue $requests
  $filePath = Join-Path $tempDir "$tableName-batch.json"
  $body | ConvertTo-Json -Depth 40 | Set-Content $filePath

  $result = aws dynamodb batch-write-item --region $region --request-items "file://$filePath" | ConvertFrom-Json
  if ($result.UnprocessedItems.PSObject.Properties.Count -gt 0) {
    throw "Hay UnprocessedItems en $tableName"
  }
}

function Write-PutBatch([string]$tableName, [array]$items, [string]$fileName) {
  $requests = foreach ($item in $items) {
    [pscustomobject]@{
      PutRequest = [pscustomobject]@{
        Item = $item
      }
    }
  }
  $body = [pscustomobject]@{}
  $body | Add-Member -NotePropertyName $tableName -NotePropertyValue $requests
  $filePath = Join-Path $tempDir $fileName
  $body | ConvertTo-Json -Depth 40 | Set-Content $filePath
  $result = aws dynamodb batch-write-item --region $region --request-items "file://$filePath" | ConvertFrom-Json
  if ($result.UnprocessedItems.PSObject.Properties.Count -gt 0) {
    throw "Hay UnprocessedItems en $tableName"
  }
}

$timestamp = [DateTime]::UtcNow.ToString('o')

$roles = @(Load-TableBackup 'catalogo_roles')
$users = @(Load-TableBackup 'catalogo_usuarios')
$categories = @(Load-TableBackup 'catalogo_categorias')
$products = @(Load-TableBackup 'catalogo_productos')
$productCategories = @(Load-TableBackup 'catalogo_productos_categorias')
$sales = @(Load-TableBackup 'catalogo_ventas')
$saleDetails = @(Load-TableBackup 'catalogo_ventas_detalle')
$payments = @(Load-TableBackup 'catalogo_pagos')

$rolesOrdered = $roles | Sort-Object `
  @{ Expression = { Get-NumberAttr $_ 'orden' } }, `
  @{ Expression = { Get-StringAttr $_ 'slug' } }, `
  @{ Expression = { Get-StringAttr $_ 'rol_id' } }

$roleMap = @{}
$newRoles = @()
for ($i = 0; $i -lt $rolesOrdered.Count; $i++) {
  $oldItem = $rolesOrdered[$i]
  $newId = [string]($i + 1)
  $roleMap[(Get-StringAttr $oldItem 'rol_id')] = $newId
  $updated = Clone-Item $oldItem
  Set-StringAttr $updated 'rol_id' $newId
  Set-StringAttr $updated 'updated_at' $timestamp
  $newRoles += $updated
}

$usersOrdered = $users | Sort-Object `
  @{ Expression = { [int]$roleMap[(Get-StringAttr $_ 'rol_id')] } }, `
  @{ Expression = { Get-StringAttr $_ 'email' } }, `
  @{ Expression = { Get-StringAttr $_ 'usuario_id' } }

$userMap = @{}
$newUsers = @()
for ($i = 0; $i -lt $usersOrdered.Count; $i++) {
  $oldItem = $usersOrdered[$i]
  $newId = [string]($i + 1)
  $oldUserId = Get-StringAttr $oldItem 'usuario_id'
  $userMap[$oldUserId] = $newId
  $updated = Clone-Item $oldItem
  Set-StringAttr $updated 'usuario_id' $newId
  Set-StringAttr $updated 'rol_id' $roleMap[(Get-StringAttr $oldItem 'rol_id')]
  Set-StringAttr $updated 'updated_at' $timestamp
  $newUsers += $updated
}

$categoriesOrdered = $categories | Sort-Object `
  @{ Expression = { Get-NumberAttr $_ 'orden' } }, `
  @{ Expression = { Get-StringAttr $_ 'nombre' } }, `
  @{ Expression = { Get-StringAttr $_ 'categoria_id' } }

$categoryMap = @{}
$newCategories = @()
for ($i = 0; $i -lt $categoriesOrdered.Count; $i++) {
  $oldItem = $categoriesOrdered[$i]
  $newId = [string]($i + 1)
  $categoryMap[(Get-StringAttr $oldItem 'categoria_id')] = $newId
  $updated = Clone-Item $oldItem
  Set-StringAttr $updated 'categoria_id' $newId
  Set-StringAttr $updated 'updated_at' $timestamp
  $newCategories += $updated
}

$productsOrdered = $products | Sort-Object `
  @{ Expression = { Get-NumberAttr $_ 'orden' } }, `
  @{ Expression = { Get-StringAttr $_ 'nombre' } }, `
  @{ Expression = { Get-StringAttr $_ 'producto_id' } }

$productMap = @{}
$newProducts = @()
for ($i = 0; $i -lt $productsOrdered.Count; $i++) {
  $oldItem = $productsOrdered[$i]
  $newId = [string]($i + 1)
  $productMap[(Get-StringAttr $oldItem 'producto_id')] = $newId
  $updated = Clone-Item $oldItem
  Set-StringAttr $updated 'producto_id' $newId
  Set-StringAttr $updated 'updated_at' $timestamp
  $newProducts += $updated
}

$productCategoriesOrdered = $productCategories | Sort-Object `
  @{ Expression = { [int]$categoryMap[(Get-StringAttr $_ 'categoria_id')] } }, `
  @{ Expression = { [int]$productMap[(Get-StringAttr $_ 'producto_id')] } }

$newProductCategories = foreach ($item in $productCategoriesOrdered) {
  $updated = Clone-Item $item
  if (-not $updated.PSObject.Properties['producto_categoria_id']) {
    Set-StringAttr $updated 'producto_categoria_id' ''
  }
  Set-StringAttr $updated 'categoria_id' $categoryMap[(Get-StringAttr $item 'categoria_id')]
  Set-StringAttr $updated 'producto_id' $productMap[(Get-StringAttr $item 'producto_id')]
  $updated
}
for ($i = 0; $i -lt $newProductCategories.Count; $i++) {
  Set-StringAttr $newProductCategories[$i] 'producto_categoria_id' ([string]($i + 1))
}

$salesOrdered = $sales | Sort-Object `
  @{ Expression = { Get-StringAttr $_ 'created_at' } }, `
  @{ Expression = { Get-StringAttr $_ 'venta_id' } }

$saleMap = @{}
$newSales = @()
$fallbackUserId = if ($userMap.ContainsKey('USER-CLIENTE-001')) { $userMap['USER-CLIENTE-001'] } else { '2' }
for ($i = 0; $i -lt $salesOrdered.Count; $i++) {
  $oldItem = $salesOrdered[$i]
  $oldSaleId = Get-StringAttr $oldItem 'venta_id'
  $newId = [string]($i + 1)
  $saleMap[$oldSaleId] = $newId
  $updated = Clone-Item $oldItem
  $oldUserId = Get-StringAttr $oldItem 'usuario_id'
  $newUserId = if ($userMap.ContainsKey($oldUserId)) { $userMap[$oldUserId] } else { $fallbackUserId }
  Set-StringAttr $updated 'venta_id' $newId
  Set-StringAttr $updated 'usuario_id' $newUserId
  Set-StringAttr $updated 'updated_at' $timestamp
  $newSales += $updated
}

$detailsBySale = @{}
foreach ($item in $saleDetails) {
  $oldSaleId = Get-StringAttr $item 'venta_id'
  if (-not $detailsBySale.ContainsKey($oldSaleId)) {
    $detailsBySale[$oldSaleId] = @()
  }
  $detailsBySale[$oldSaleId] += $item
}

$newSaleDetails = @()
foreach ($sale in $salesOrdered) {
  $oldSaleId = Get-StringAttr $sale 'venta_id'
  $details = @($detailsBySale[$oldSaleId] | Sort-Object `
    @{ Expression = { Get-StringAttr $_ 'created_at' } }, `
    @{ Expression = { Get-StringAttr $_ 'detalle_id' } })

  for ($i = 0; $i -lt $details.Count; $i++) {
    $oldDetail = $details[$i]
    $updated = Clone-Item $oldDetail
    Set-StringAttr $updated 'venta_id' $saleMap[$oldSaleId]
    $oldProductId = Get-StringAttr $oldDetail 'producto_id'
    if ($productMap.ContainsKey($oldProductId)) {
      Set-StringAttr $updated 'producto_id' $productMap[$oldProductId]
    }
    Set-StringAttr $updated 'detalle_id' ([string]($i + 1))
    Set-StringAttr $updated 'venta_detalle_id' ([string]($newSaleDetails.Count + 1))
    Set-StringAttr $updated 'updated_at' $timestamp
    $newSaleDetails += $updated
  }
}

$paymentsOrdered = $payments | Sort-Object `
  @{ Expression = { Get-StringAttr $_ 'created_at' } }, `
  @{ Expression = { Get-StringAttr $_ 'pago_id' } }

$paymentMap = @{}
$newPayments = @()
for ($i = 0; $i -lt $paymentsOrdered.Count; $i++) {
  $oldItem = $paymentsOrdered[$i]
  $oldPaymentId = Get-StringAttr $oldItem 'pago_id'
  $newId = [string]($i + 1)
  $paymentMap[$oldPaymentId] = $newId
  $updated = Clone-Item $oldItem
  Set-StringAttr $updated 'pago_id' $newId
  $oldSaleId = Get-StringAttr $oldItem 'venta_id'
  if ($saleMap.ContainsKey($oldSaleId)) {
    Set-StringAttr $updated 'venta_id' $saleMap[$oldSaleId]
  }
  Set-StringAttr $updated 'updated_at' $timestamp
  $newPayments += $updated
}

Write-BatchRequest 'catalogo_roles' $newRoles @(
  foreach ($item in $roles) { [pscustomobject]@{ rol_id = New-StringAttr (Get-StringAttr $item 'rol_id') } }
)

Write-BatchRequest 'catalogo_usuarios' $newUsers @(
  foreach ($item in $users) { [pscustomobject]@{ usuario_id = New-StringAttr (Get-StringAttr $item 'usuario_id') } }
)

Write-BatchRequest 'catalogo_categorias' $newCategories @(
  foreach ($item in $categories) { [pscustomobject]@{ categoria_id = New-StringAttr (Get-StringAttr $item 'categoria_id') } }
)

Write-BatchRequest 'catalogo_productos' $newProducts @(
  foreach ($item in $products) { [pscustomobject]@{ producto_id = New-StringAttr (Get-StringAttr $item 'producto_id') } }
)

Write-BatchRequest 'catalogo_productos_categorias' $newProductCategories @(
  foreach ($item in $productCategories) {
    [pscustomobject]@{
      categoria_id = New-StringAttr (Get-StringAttr $item 'categoria_id')
      producto_id = New-StringAttr (Get-StringAttr $item 'producto_id')
    }
  }
)

Write-BatchRequest 'catalogo_ventas' $newSales @(
  foreach ($item in $sales) { [pscustomobject]@{ venta_id = New-StringAttr (Get-StringAttr $item 'venta_id') } }
)

Write-BatchRequest 'catalogo_ventas_detalle' $newSaleDetails @(
  foreach ($item in $saleDetails) {
    [pscustomobject]@{
      venta_id = New-StringAttr (Get-StringAttr $item 'venta_id')
      detalle_id = New-StringAttr (Get-StringAttr $item 'detalle_id')
    }
  }
)

if ($payments.Count -gt 0) {
  Write-BatchRequest 'catalogo_pagos' $newPayments @(
    foreach ($item in $payments) { [pscustomobject]@{ pago_id = New-StringAttr (Get-StringAttr $item 'pago_id') } }
  )
}

$sequenceItems = @(
  [pscustomobject]@{ secuencia_id = New-StringAttr 'roles'; ultimo_valor = [pscustomobject]@{ N = [string]$newRoles.Count }; updated_at = New-StringAttr $timestamp },
  [pscustomobject]@{ secuencia_id = New-StringAttr 'usuarios'; ultimo_valor = [pscustomobject]@{ N = [string]$newUsers.Count }; updated_at = New-StringAttr $timestamp },
  [pscustomobject]@{ secuencia_id = New-StringAttr 'categorias'; ultimo_valor = [pscustomobject]@{ N = [string]$newCategories.Count }; updated_at = New-StringAttr $timestamp },
  [pscustomobject]@{ secuencia_id = New-StringAttr 'productos'; ultimo_valor = [pscustomobject]@{ N = [string]$newProducts.Count }; updated_at = New-StringAttr $timestamp },
  [pscustomobject]@{ secuencia_id = New-StringAttr 'productos_categorias'; ultimo_valor = [pscustomobject]@{ N = [string]$newProductCategories.Count }; updated_at = New-StringAttr $timestamp },
  [pscustomobject]@{ secuencia_id = New-StringAttr 'ventas'; ultimo_valor = [pscustomobject]@{ N = [string]$newSales.Count }; updated_at = New-StringAttr $timestamp },
  [pscustomobject]@{ secuencia_id = New-StringAttr 'ventas_detalle'; ultimo_valor = [pscustomobject]@{ N = [string]$newSaleDetails.Count }; updated_at = New-StringAttr $timestamp },
  [pscustomobject]@{ secuencia_id = New-StringAttr 'pagos'; ultimo_valor = [pscustomobject]@{ N = [string]$newPayments.Count }; updated_at = New-StringAttr $timestamp }
)

Write-PutBatch 'catalogo_secuencias' $sequenceItems 'catalogo_secuencias-batch.json'

[pscustomobject]@{
  role_map = $roleMap
  user_map = $userMap
  category_map = $categoryMap
  product_map = $productMap
  sale_map = $saleMap
  payment_map = $paymentMap
  fallback_user_id = $fallbackUserId
} | ConvertTo-Json -Depth 10
