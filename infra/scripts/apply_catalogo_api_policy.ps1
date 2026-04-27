param(
    [string]$Region = "us-east-2",
    [string]$RoleName = "catalogo-api-role",
    [string]$PolicyName = "catalogo-api-permissions"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$policyPath = Join-Path $repoRoot "infra\\iam\\catalogo-api-permissions-policy.json"

if (-not (Test-Path -LiteralPath $policyPath)) {
    throw "No se encontró el archivo de política: $policyPath"
}

Write-Host "Aplicando política '$PolicyName' al rol '$RoleName' en la región '$Region'..."

aws iam put-role-policy `
    --role-name $RoleName `
    --policy-name $PolicyName `
    --policy-document ("file://{0}" -f $policyPath)

Write-Host "Política aplicada correctamente."
