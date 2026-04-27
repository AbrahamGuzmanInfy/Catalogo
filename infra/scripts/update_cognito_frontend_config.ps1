param(
    [Parameter(Mandatory = $true)]
    [string]$UserPoolId,

    [Parameter(Mandatory = $true)]
    [string]$UserPoolClientId
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$configPath = Join-Path $repoRoot "src\\app\\core\\auth\\cognito.config.ts"

if (-not (Test-Path -LiteralPath $configPath)) {
    throw "No se encontró el archivo: $configPath"
}

$content = Get-Content -LiteralPath $configPath -Raw
$content = [regex]::Replace($content, "userPoolId:\s*'[^']*'", "userPoolId: '$UserPoolId'")
$content = [regex]::Replace($content, "userPoolClientId:\s*'[^']*'", "userPoolClientId: '$UserPoolClientId'")
Set-Content -LiteralPath $configPath -Value $content -Encoding UTF8

Write-Host "Configuración frontend actualizada en $configPath"
