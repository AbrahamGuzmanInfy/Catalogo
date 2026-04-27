# Cognito para Bloomy

## 1. Dar permisos de administración Cognito al usuario IAM

```powershell
C:\Users\Abraham\Documents\GitHub\Catalogo\infra\scripts\apply_cognito_management_policy.ps1
```

## 2. Crear el User Pool y el App Client

```powershell
C:\Users\Abraham\Documents\GitHub\Catalogo\infra\scripts\create_bloomy_cognito.ps1
```

Esto genera un resumen en:

`C:\Users\Abraham\Documents\GitHub\Catalogo\infra\cognito\bloomy-cognito-output.json`

## 3. Actualizar el frontend con los ids creados

```powershell
C:\Users\Abraham\Documents\GitHub\Catalogo\infra\scripts\update_cognito_frontend_config.ps1 -UserPoolId "<USER_POOL_ID>" -UserPoolClientId "<CLIENT_ID>"
```

## 4. Verificar

```powershell
cd C:\Users\Abraham\Documents\GitHub\Catalogo
npm run build
```
