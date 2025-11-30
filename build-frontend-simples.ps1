# Script simples para build do frontend com logs visíveis
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Build Frontend - Com Logs Visiveis" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"

# Navegar para o diretório do frontend
$frontendDir = Join-Path $PSScriptRoot "frontend"
if (-not (Test-Path $frontendDir)) {
    Write-Host "ERRO: Diretório frontend não encontrado!" -ForegroundColor Red
    exit 1
}

Set-Location $frontendDir
Write-Host "Diretório: $frontendDir" -ForegroundColor Gray
Write-Host ""

# Verificar se Docker está rodando
Write-Host "Verificando Docker..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "OK: Docker está rodando" -ForegroundColor Green
} catch {
    Write-Host "ERRO: Docker não está rodando!" -ForegroundColor Red
    Write-Host "Inicie o Docker Desktop primeiro" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Iniciando BUILD..." -ForegroundColor Yellow
Write-Host "Isso pode levar 5-15 minutos..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Build com progresso visível
$buildCommand = "docker build --progress=plain --build-arg REACT_APP_API_URL=`"/api`" --build-arg VITE_API_URL=`"/api`" -t mohameduyyyyyy/amoras-frontend:latest ."

Write-Host "Comando: $buildCommand" -ForegroundColor Gray
Write-Host ""

# Executar build
Invoke-Expression $buildCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "BUILD CONCLUIDO COM SUCESSO!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    
    # Verificar imagem
    Write-Host "Verificando imagem criada..." -ForegroundColor Yellow
    docker images mohameduyyyyyy/amoras-frontend:latest
    
    Write-Host ""
    Write-Host "Próximo passo: docker push mohameduyyyyyy/amoras-frontend:latest" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "ERRO NO BUILD!" -ForegroundColor Red
    Write-Host "Código de saída: $LASTEXITCODE" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
}

Set-Location $PSScriptRoot

