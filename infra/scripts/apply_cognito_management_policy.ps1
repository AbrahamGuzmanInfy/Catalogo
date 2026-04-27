param(
    [string]$UserName = "AbrahamGuzman",
    [string]$PolicyName = "bloomy-cognito-management"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$policyPath = Join-Path $repoRoot "infra\\iam\\cognito-management-policy.json"

if (-not (Test-Path -LiteralPath $policyPath)) {
    throw "No se encontró el archivo de política: $policyPath"
}

Write-Host "Aplicando política '$PolicyName' al usuario '$UserName'..."

aws iam put-user-policy `
    --user-name $UserName `
    --policy-name $PolicyName `
    --policy-document ("file://{0}" -f $policyPath)

Write-Host "Política aplicada correctamente."
