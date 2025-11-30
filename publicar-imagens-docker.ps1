# Script para gerar e publicar imagens Docker no Docker Hub
# Uso: .\publicar-imagens-docker.ps1

param(
    [string]$DockerUser = "",
    [switch]$SkipLogin = $false
)

Write-Host ""
Write-Host "🐳 ========================================" -ForegroundColor Cyan
Write-Host "🐳 Publicar Imagens Docker - Sistema Amoras" -ForegroundColor Cyan
Write-Host "🐳 ========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Docker está instalado
Write-Host "[1/7] Verificando Docker..." -ForegroundColor Yellow
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker não encontrado! Instale o Docker Desktop primeiro." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker encontrado" -ForegroundColor Green
Write-Host ""

# Verificar login no Docker Hub
Write-Host "[2/7] Verificando login no Docker Hub..." -ForegroundColor Yellow
$dockerLoginCheck = docker info 2>&1 | Select-String -Pattern "Username"
if (-not $dockerLoginCheck) {
    if (-not $SkipLogin) {
        Write-Host "⚠️  Você precisa fazer login no Docker Hub primeiro." -ForegroundColor Yellow
        Write-Host "   Execute: docker login" -ForegroundColor Cyan
        Write-Host "   Ou forneça seu username: .\publicar-imagens-docker.ps1 -DockerUser seu-usuario" -ForegroundColor Cyan
        Write-Host ""
        $doLogin = Read-Host "Deseja fazer login agora? (S/N)"
        if ($doLogin -eq "S" -or $doLogin -eq "s") {
            docker login
            if ($LASTEXITCODE -ne 0) {
                Write-Host "❌ Erro ao fazer login" -ForegroundColor Red
                exit 1
            }
        } else {
            exit 1
        }
    }
} else {
    Write-Host "✅ Já está logado no Docker Hub" -ForegroundColor Green
}

# Obter username do Docker Hub
if ([string]::IsNullOrEmpty($DockerUser)) {
    Write-Host ""
    Write-Host "[3/7] Obtendo username do Docker Hub..." -ForegroundColor Yellow
    $dockerInfo = docker info 2>&1
    $usernameMatch = $dockerInfo | Select-String -Pattern "Username:\s+(\w+)" 
    if ($usernameMatch) {
        $DockerUser = $usernameMatch.Matches[0].Groups[1].Value
        Write-Host "✅ Username detectado: $DockerUser" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Não foi possível detectar o username automaticamente" -ForegroundColor Yellow
        $DockerUser = Read-Host "Digite seu username do Docker Hub"
        if ([string]::IsNullOrEmpty($DockerUser)) {
            Write-Host "❌ Username é obrigatório" -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "[3/7] Usando username fornecido: $DockerUser" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📦 Imagens que serão criadas:" -ForegroundColor Cyan
Write-Host "   Backend:  $DockerUser/amoras-backend:latest" -ForegroundColor White
Write-Host "   Frontend: $DockerUser/amoras-frontend:latest" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Continuar? (S/N)"
if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "❌ Operação cancelada" -ForegroundColor Yellow
    exit 0
}

Write-Host ""

# Mudar para diretório do projeto
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

# ============================================
# BACKEND
# ============================================
Write-Host "[4/7] 📦 Build Backend..." -ForegroundColor Yellow
Write-Host "   Diretório: $projectRoot\backend" -ForegroundColor Gray
Set-Location "$projectRoot\backend"

Write-Host "   Executando: docker build -t $DockerUser/amoras-backend:latest ." -ForegroundColor Gray
$backendBuild = docker build -t "$DockerUser/amoras-backend:latest" . 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Backend build concluído com sucesso!" -ForegroundColor Green
} else {
    Write-Host "   ❌ Erro no build do Backend" -ForegroundColor Red
    Write-Host $backendBuild -ForegroundColor Red
    Set-Location $projectRoot
    exit 1
}

Write-Host ""

# ============================================
# FRONTEND
# ============================================
Write-Host "[5/7] 📦 Build Frontend..." -ForegroundColor Yellow
Write-Host "   Diretório: $projectRoot\frontend" -ForegroundColor Gray
Set-Location "$projectRoot\frontend"

Write-Host "   Executando: docker build -t $DockerUser/amoras-frontend:latest ." -ForegroundColor Gray
$frontendBuild = docker build -t "$DockerUser/amoras-frontend:latest" . 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Frontend build concluído com sucesso!" -ForegroundColor Green
} else {
    Write-Host "   ❌ Erro no build do Frontend" -ForegroundColor Red
    Write-Host $frontendBuild -ForegroundColor Red
    Set-Location $projectRoot
    exit 1
}

Write-Host ""

# ============================================
# PUSH BACKEND
# ============================================
Write-Host "[6/7] 📤 Publicando Backend no Docker Hub..." -ForegroundColor Yellow
Write-Host "   Imagem: $DockerUser/amoras-backend:latest" -ForegroundColor Gray
Write-Host "   (Isso pode demorar alguns minutos...)" -ForegroundColor Gray

$backendPush = docker push "$DockerUser/amoras-backend:latest" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Backend publicado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "   ❌ Erro ao publicar Backend" -ForegroundColor Red
    Write-Host $backendPush -ForegroundColor Red
    Write-Host ""
    Write-Host "   💡 Dica: Verifique se:" -ForegroundColor Yellow
    Write-Host "      - Você está logado no Docker Hub (docker login)" -ForegroundColor Yellow
    Write-Host "      - O repositório existe no Docker Hub" -ForegroundColor Yellow
    Write-Host "      - Você tem permissão para fazer push" -ForegroundColor Yellow
    Set-Location $projectRoot
    exit 1
}

Write-Host ""

# ============================================
# PUSH FRONTEND
# ============================================
Write-Host "[7/7] 📤 Publicando Frontend no Docker Hub..." -ForegroundColor Yellow
Write-Host "   Imagem: $DockerUser/amoras-frontend:latest" -ForegroundColor Gray
Write-Host "   (Isso pode demorar alguns minutos...)" -ForegroundColor Gray

$frontendPush = docker push "$DockerUser/amoras-frontend:latest" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Frontend publicado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "   ❌ Erro ao publicar Frontend" -ForegroundColor Red
    Write-Host $frontendPush -ForegroundColor Red
    Write-Host ""
    Write-Host "   💡 Dica: Verifique se:" -ForegroundColor Yellow
    Write-Host "      - Você está logado no Docker Hub (docker login)" -ForegroundColor Yellow
    Write-Host "      - O repositório existe no Docker Hub" -ForegroundColor Yellow
    Write-Host "      - Você tem permissão para fazer push" -ForegroundColor Yellow
    Set-Location $projectRoot
    exit 1
}

# Voltar para diretório raiz
Set-Location $projectRoot

Write-Host ""
Write-Host "✅ ========================================" -ForegroundColor Green
Write-Host "✅ Todas as imagens foram publicadas!" -ForegroundColor Green
Write-Host "✅ ========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Imagens disponíveis no Docker Hub:" -ForegroundColor Cyan
Write-Host "   Backend:  $DockerUser/amoras-backend:latest" -ForegroundColor White
Write-Host "   Frontend: $DockerUser/amoras-frontend:latest" -ForegroundColor White
Write-Host ""
Write-Host "🌐 URLs das imagens:" -ForegroundColor Cyan
Write-Host "   Backend:  https://hub.docker.com/r/$DockerUser/amoras-backend" -ForegroundColor White
Write-Host "   Frontend: https://hub.docker.com/r/$DockerUser/amoras-frontend" -ForegroundColor White
Write-Host ""
Write-Host "💡 Para usar no EasyPanel/VPS:" -ForegroundColor Yellow
Write-Host "   Backend:  ${DockerUser}/amoras-backend:latest" -ForegroundColor White
Write-Host "   Frontend: ${DockerUser}/amoras-frontend:latest" -ForegroundColor White
Write-Host ""

