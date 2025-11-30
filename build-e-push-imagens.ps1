# Script simplificado para build e push de imagens Docker
param(
    [Parameter(Mandatory=$true)]
    [string]$DockerUser
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Build e Push - Imagens Docker" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot
if (-not $projectRoot) {
    $projectRoot = Get-Location
}

# BACKEND
Write-Host "[1/4] Build Backend..." -ForegroundColor Yellow
Set-Location "$projectRoot\backend"
docker build -t "$DockerUser/amoras-backend:latest" .
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Build do Backend falhou" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Backend build concluido" -ForegroundColor Green
Write-Host ""

# FRONTEND
Write-Host "[2/4] Build Frontend..." -ForegroundColor Yellow
Set-Location "$projectRoot\frontend"

# Se REACT_APP_API_URL não foi passado, usar /api como padrão (proxy relativo)
$apiUrl = $env:REACT_APP_API_URL
if (-not $apiUrl) {
    $apiUrl = "/api"
    Write-Host "Aviso: REACT_APP_API_URL não definida, usando '/api' (proxy relativo)" -ForegroundColor Yellow
} else {
    Write-Host "Usando REACT_APP_API_URL: $apiUrl" -ForegroundColor Cyan
}

docker build `
    --build-arg REACT_APP_API_URL="$apiUrl" `
    --build-arg VITE_API_URL="$apiUrl" `
    --build-arg NODE_ENV=production `
    -t "$DockerUser/amoras-frontend:latest" .

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Build do Frontend falhou" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Frontend build concluido" -ForegroundColor Green
Write-Host ""

# PUSH BACKEND
Write-Host "[3/4] Push Backend..." -ForegroundColor Yellow
docker push "$DockerUser/amoras-backend:latest"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Push do Backend falhou" -ForegroundColor Red
    Write-Host "Dica: Execute 'docker login' primeiro" -ForegroundColor Yellow
    exit 1
}
Write-Host "OK: Backend publicado" -ForegroundColor Green
Write-Host ""

# PUSH FRONTEND
Write-Host "[4/4] Push Frontend..." -ForegroundColor Yellow
docker push "$DockerUser/amoras-frontend:latest"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Push do Frontend falhou" -ForegroundColor Red
    Write-Host "Dica: Execute 'docker login' primeiro" -ForegroundColor Yellow
    exit 1
}
Write-Host "OK: Frontend publicado" -ForegroundColor Green
Write-Host ""

Set-Location $projectRoot

Write-Host "========================================" -ForegroundColor Green
Write-Host "SUCESSO: Todas as imagens publicadas!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Imagens:" -ForegroundColor Cyan
Write-Host "  Backend:  $DockerUser/amoras-backend:latest"
Write-Host "  Frontend: $DockerUser/amoras-frontend:latest"
Write-Host ""


