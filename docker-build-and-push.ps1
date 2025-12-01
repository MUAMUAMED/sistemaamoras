# Script para fazer build e push da imagem Docker para o Docker Hub
# Frontend - Sistema Amoras Capital

param(
    [Parameter(Mandatory=$false)]
    [string]$DockerHubUsername = "seu-usuario-dockerhub",
    
    [Parameter(Mandatory=$false)]
    [string]$ImageName = "amoras-capital-frontend",
    
    [Parameter(Mandatory=$false)]
    [string]$Tag = "latest",
    
    [Parameter(Mandatory=$false)]
    [string]$VITE_API_URL = "",
    
    [Parameter(Mandatory=$false)]
    [string]$REACT_APP_API_URL = ""
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "🐳 Docker Build & Push - Frontend" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se o Docker está instalado e rodando
Write-Host "🔍 Verificando Docker..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    Write-Host "✅ Docker instalado" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker não encontrado. Por favor, instale o Docker Desktop." -ForegroundColor Red
    exit 1
}

# Construir o nome completo da imagem
$FullImageName = if ($DockerHubUsername -eq "seu-usuario-dockerhub") {
    Write-Host "⚠️  ATENÇÃO: Você precisa configurar seu usuário do Docker Hub!" -ForegroundColor Yellow
    Write-Host "   Edite o script e defina -DockerHubUsername com seu usuário" -ForegroundColor Yellow
    Write-Host "   Ou use: .\docker-build-and-push.ps1 -DockerHubUsername seu-usuario" -ForegroundColor Yellow
    exit 1
} else {
    "${DockerHubUsername}/${ImageName}"
}

$FullImageNameWithTag = "${FullImageName}:${Tag}"

Write-Host ""
Write-Host "📋 Configurações:" -ForegroundColor Cyan
Write-Host "   Imagem: $FullImageNameWithTag" -ForegroundColor White
Write-Host "   Tag: $Tag" -ForegroundColor White

if ($VITE_API_URL) {
    Write-Host "   VITE_API_URL: $VITE_API_URL" -ForegroundColor White
} else {
    Write-Host "   ⚠️  VITE_API_URL não definida (será vazia no build)" -ForegroundColor Yellow
}

if ($REACT_APP_API_URL) {
    Write-Host "   REACT_APP_API_URL: $REACT_APP_API_URL" -ForegroundColor White
}

Write-Host ""

# Construir os argumentos de build
$BuildArgs = @()

if ($VITE_API_URL) {
    $BuildArgs += "--build-arg"
    $BuildArgs += "VITE_API_URL=$VITE_API_URL"
}

if ($REACT_APP_API_URL) {
    $BuildArgs += "--build-arg"
    $BuildArgs += "REACT_APP_API_URL=$REACT_APP_API_URL"
}

# Build da imagem
Write-Host "🔨 Fazendo build da imagem Docker..." -ForegroundColor Yellow
Write-Host "   Comando: docker build $($BuildArgs -join ' ') -t $FullImageNameWithTag ." -ForegroundColor Gray
Write-Host ""

$buildCommand = @("build") + $BuildArgs + @("-t", $FullImageNameWithTag, "-f", "Dockerfile", ".")

try {
    docker $buildCommand
    if ($LASTEXITCODE -ne 0) {
        throw "Build falhou"
    }
    Write-Host ""
    Write-Host "✅ Build concluído com sucesso!" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "❌ Erro ao fazer build da imagem: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Perguntar se deseja fazer push
$shouldPush = Read-Host "Deseja fazer push para o Docker Hub? (S/N)"

if ($shouldPush -ne "S" -and $shouldPush -ne "s") {
    Write-Host "⏭️  Push cancelado. A imagem foi construída localmente." -ForegroundColor Yellow
    Write-Host "   Para fazer push depois, execute:" -ForegroundColor Gray
    Write-Host "   docker push $FullImageNameWithTag" -ForegroundColor Gray
    exit 0
}

Write-Host ""

# Login no Docker Hub (se necessário)
Write-Host "🔐 Verificando login no Docker Hub..." -ForegroundColor Yellow

try {
    docker info | Select-String -Pattern "Username" | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Já está logado no Docker Hub" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Você precisa fazer login no Docker Hub" -ForegroundColor Yellow
    Write-Host "   Execute: docker login" -ForegroundColor White
    docker login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Falha no login. Push cancelado." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Push da imagem
Write-Host "📤 Fazendo push para o Docker Hub..." -ForegroundColor Yellow
Write-Host "   Imagem: $FullImageNameWithTag" -ForegroundColor Gray
Write-Host ""

try {
    docker push $FullImageNameWithTag
    if ($LASTEXITCODE -ne 0) {
        throw "Push falhou"
    }
    Write-Host ""
    Write-Host "✅ Push concluído com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Imagem disponível em:" -ForegroundColor Cyan
    Write-Host "   https://hub.docker.com/r/$FullImageName" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Para usar a imagem:" -ForegroundColor Cyan
    Write-Host "   docker pull $FullImageNameWithTag" -ForegroundColor White
    Write-Host "   docker run -p 8080:8080 $FullImageNameWithTag" -ForegroundColor White
} catch {
    Write-Host ""
    Write-Host "❌ Erro ao fazer push: $_" -ForegroundColor Red
    exit 1
}

