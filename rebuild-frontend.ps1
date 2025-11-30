# Script para rebuild do frontend com variáveis de ambiente corretas
# Uso: .\rebuild-frontend.ps1 -BackendUrl "https://seu-backend-url.com" -DockerUser "mohameduyyyyyy"

param(
    [Parameter(Mandatory=$true)]
    [string]$BackendUrl,
    
    [Parameter(Mandatory=$false)]
    [string]$DockerUser = "mohameduyyyyyy",
    
    [Parameter(Mandatory=$false)]
    [string]$Tag = "latest"
)

Write-Host ""
Write-Host "🏗️  Rebuild do Frontend com Variáveis de Ambiente" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Garantir que a URL termina com /api
if (-not $BackendUrl.EndsWith("/api")) {
    if ($BackendUrl.EndsWith("/")) {
        $BackendUrl = "$BackendUrl" + "api"
    } else {
        $BackendUrl = "$BackendUrl/api"
    }
}

Write-Host "📦 Configurações:" -ForegroundColor Yellow
Write-Host "   Backend URL: $BackendUrl" -ForegroundColor White
Write-Host "   Docker User: $DockerUser" -ForegroundColor White
Write-Host "   Tag: $Tag" -ForegroundColor White
Write-Host ""

# Navegar para o diretório do frontend
$frontendDir = Join-Path $PSScriptRoot "frontend"
if (-not (Test-Path $frontendDir)) {
    Write-Host "❌ Erro: Diretório frontend não encontrado!" -ForegroundColor Red
    exit 1
}

Set-Location $frontendDir

Write-Host "🔨 Iniciando build do Docker..." -ForegroundColor Cyan
Write-Host ""

# Build da imagem com variáveis de ambiente
$imageName = "$DockerUser/amoras-frontend:$Tag"

docker build `
    --build-arg REACT_APP_API_URL="$BackendUrl" `
    --build-arg VITE_API_URL="$BackendUrl" `
    --build-arg NODE_ENV=production `
    -t $imageName `
    .

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Erro no build!" -ForegroundColor Red
    Set-Location $PSScriptRoot
    exit 1
}

Write-Host ""
Write-Host "✅ Build concluído com sucesso!" -ForegroundColor Green
Write-Host ""

# Perguntar se quer fazer push
$push = Read-Host "Deseja fazer push para o Docker Hub? (S/N)"

if ($push -eq "S" -or $push -eq "s" -or $push -eq "Y" -or $push -eq "y") {
    Write-Host ""
    Write-Host "📤 Fazendo push para Docker Hub..." -ForegroundColor Cyan
    
    docker push $imageName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Push concluído com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 Imagem disponível em:" -ForegroundColor Cyan
        Write-Host "   https://hub.docker.com/r/$DockerUser/amoras-frontend" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "❌ Erro no push!" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "✅ Processo concluído!" -ForegroundColor Green
Write-Host ""

Set-Location $PSScriptRoot

