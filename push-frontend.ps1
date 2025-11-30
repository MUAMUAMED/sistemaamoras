# Script para build e push do frontend
Write-Host ""
Write-Host "🏗️  Build e Push do Frontend" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

$frontendDir = Join-Path $PSScriptRoot "frontend"
Set-Location $frontendDir

# Ler variáveis de ambiente ou usar valores padrão
$reactAppApiUrl = $env:REACT_APP_API_URL
if ([string]::IsNullOrEmpty($reactAppApiUrl)) {
    $reactAppApiUrl = $env:VITE_API_URL
}
if ([string]::IsNullOrEmpty($reactAppApiUrl)) {
    $reactAppApiUrl = "/api"
}

Write-Host "📦 Fazendo build da imagem..." -ForegroundColor Yellow
Write-Host "   Usando API URL: $reactAppApiUrl" -ForegroundColor Gray
docker build --build-arg REACT_APP_API_URL="$reactAppApiUrl" --build-arg VITE_API_URL="$reactAppApiUrl" -t mohameduyyyyyy/amoras-frontend:latest .

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Erro no build!" -ForegroundColor Red
    Set-Location $PSScriptRoot
    exit 1
}

Write-Host ""
Write-Host "✅ Build concluído com sucesso!" -ForegroundColor Green
Write-Host ""

Write-Host "📤 Fazendo push para Docker Hub..." -ForegroundColor Yellow
docker push mohameduyyyyyy/amoras-frontend:latest

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Erro no push!" -ForegroundColor Red
    Write-Host "💡 Dica: Execute 'docker login' primeiro" -ForegroundColor Yellow
    Set-Location $PSScriptRoot
    exit 1
}

Write-Host ""
Write-Host "✅ Push concluído com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Imagem disponível em:" -ForegroundColor Cyan
Write-Host "   https://hub.docker.com/r/mohameduyyyyyy/amoras-frontend" -ForegroundColor White
Write-Host ""

Set-Location $PSScriptRoot

