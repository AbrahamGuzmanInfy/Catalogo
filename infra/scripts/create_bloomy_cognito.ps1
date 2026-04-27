param(
    [string]$Region = "us-east-2",
    [string]$PoolName = "BloomyUsers",
    [string]$ClientName = "BloomyWebApp"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$outputDir = Join-Path $repoRoot "infra\\cognito"
if (-not (Test-Path -LiteralPath $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

Write-Host "Creando User Pool '$PoolName' en $Region..."

$poolResponse = aws cognito-idp create-user-pool `
    --region $Region `
    --pool-name $PoolName `
    --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false,TemporaryPasswordValidityDays=7}" `
    --auto-verified-attributes email `
    --username-attributes email `
    --username-configuration "CaseSensitive=false" `
    --mfa-configuration OFF `
    --account-recovery-setting "RecoveryMechanisms=[{Name=verified_email,Priority=1}]" `
    --user-pool-tier ESSENTIALS `
    --output json | ConvertFrom-Json

$userPoolId = $poolResponse.UserPool.Id
if (-not $userPoolId) {
    throw "No se pudo obtener el userPoolId del resultado de Cognito."
}

Write-Host "Creando App Client '$ClientName'..."

$clientResponse = aws cognito-idp create-user-pool-client `
    --region $Region `
    --user-pool-id $userPoolId `
    --client-name $ClientName `
    --no-generate-secret `
    --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH `
    --prevent-user-existence-errors ENABLED `
    --read-attributes email email_verified name `
    --write-attributes email name `
    --refresh-token-validity 30 `
    --access-token-validity 60 `
    --id-token-validity 60 `
    --token-validity-units "AccessToken=minutes,IdToken=minutes,RefreshToken=days" `
    --output json | ConvertFrom-Json

$clientId = $clientResponse.UserPoolClient.ClientId
if (-not $clientId) {
    throw "No se pudo obtener el userPoolClientId del resultado de Cognito."
}

$summary = [ordered]@{
    region = $Region
    userPoolId = $userPoolId
    userPoolClientId = $clientId
    poolName = $PoolName
    clientName = $ClientName
}

$summaryJson = $summary | ConvertTo-Json -Depth 5
$summaryPath = Join-Path $outputDir "bloomy-cognito-output.json"
$summaryJson | Set-Content -LiteralPath $summaryPath -Encoding UTF8

Write-Host "Cognito creado correctamente."
Write-Host $summaryJson
Write-Host "Resumen guardado en $summaryPath"
