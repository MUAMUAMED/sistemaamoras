# Script para criar repositórios separados - Amoras Capital
# Execute este script na raiz do projeto

Write-Host "🚀 Criando repositórios separados para Amoras Capital..." -ForegroundColor Green
Write-Host ""

# Verificar se está na pasta correta
if (!(Test-Path "backend") -or !(Test-Path "frontend")) {
    Write-Host "❌ Execute este script na raiz do projeto (onde estão as pastas backend e frontend)!" -ForegroundColor Red
    exit 1
}

# Verificar se git está instalado
try {
    git --version | Out-Null
} catch {
    Write-Host "❌ Git não está instalado! Instale o Git primeiro." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Verificações OK! Criando repositórios..." -ForegroundColor Green
Write-Host ""

# ================================
# CRIAR REPOSITÓRIO DO BACKEND
# ================================
Write-Host "📦 Configurando repositório do Backend..." -ForegroundColor Blue

# Limpar pasta se existir
if (Test-Path "amoras-backend-repo") {
    Remove-Item -Recurse -Force "amoras-backend-repo"
}

# Criar pasta do backend
New-Item -ItemType Directory -Force -Path "amoras-backend-repo" | Out-Null
Set-Location "amoras-backend-repo"

# Inicializar git
git init | Out-Null

# Copiar arquivos do backend
Write-Host "📋 Copiando arquivos do backend..."
Copy-Item -Recurse -Force "../backend/*" "." -ErrorAction SilentlyContinue
Copy-Item -Force "../backend/.gitignore" "." -ErrorAction SilentlyContinue

# Copiar guias de instalação
Copy-Item -Force "../GUIA_INSTALACAO_VPS_EASYPANEL.md" "." -ErrorAction SilentlyContinue
Copy-Item -Force "../easypanel-config.md" "." -ErrorAction SilentlyContinue
Copy-Item -Force "../RESUMO_DEPLOY_VPS.md" "." -ErrorAction SilentlyContinue

# Configurar git
git add . | Out-Null
git commit -m "🚀 Initial commit - Amoras Capital Backend API

✅ Node.js + TypeScript + Express
✅ Prisma ORM + PostgreSQL  
✅ JWT Authentication
✅ CRM + ERP APIs
✅ Swagger Documentation
✅ Docker production ready
✅ EasyPanel compatible

Backend completo para o sistema Amoras Capital" | Out-Null

Write-Host "✅ Backend repository configurado!" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Para conectar ao GitHub, execute:" -ForegroundColor Yellow
Write-Host "cd amoras-backend-repo" -ForegroundColor Gray
Write-Host "git remote add origin https://github.com/SEU_USUARIO/amoras-capital-backend.git" -ForegroundColor Gray
Write-Host "git branch -M main" -ForegroundColor Gray
Write-Host "git push -u origin main" -ForegroundColor Gray
Write-Host ""

# ================================
# CRIAR REPOSITÓRIO DO FRONTEND
# ================================
Set-Location ".."
Write-Host "🎨 Configurando repositório do Frontend..." -ForegroundColor Blue

# Limpar pasta se existir
if (Test-Path "amoras-frontend-repo") {
    Remove-Item -Recurse -Force "amoras-frontend-repo"
}

# Criar pasta do frontend
New-Item -ItemType Directory -Force -Path "amoras-frontend-repo" | Out-Null
Set-Location "amoras-frontend-repo"

# Inicializar git
git init | Out-Null

# Copiar arquivos do frontend
Write-Host "📋 Copiando arquivos do frontend..."
Copy-Item -Recurse -Force "../frontend/*" "." -ErrorAction SilentlyContinue
Copy-Item -Force "../frontend/.gitignore" "." -ErrorAction SilentlyContinue

# Configurar git
git add . | Out-Null
git commit -m "🎨 Initial commit - Amoras Capital Frontend

✅ React 18 + TypeScript
✅ Tailwind CSS + Responsive Design
✅ React Query + Axios
✅ CRM + ERP Interface
✅ Authentication + Protected Routes
✅ Nginx + Docker production ready
✅ EasyPanel compatible

Frontend completo para o sistema Amoras Capital" | Out-Null

Write-Host "✅ Frontend repository configurado!" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Para conectar ao GitHub, execute:" -ForegroundColor Yellow
Write-Host "cd amoras-frontend-repo" -ForegroundColor Gray
Write-Host "git remote add origin https://github.com/SEU_USUARIO/amoras-capital-frontend.git" -ForegroundColor Gray
Write-Host "git branch -M main" -ForegroundColor Gray
Write-Host "git push -u origin main" -ForegroundColor Gray
Write-Host ""

# Voltar à pasta raiz
Set-Location ".."

# ================================
# RESUMO FINAL
# ================================
Write-Host "🎉 Repositórios criados com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Pastas criadas:" -ForegroundColor Cyan
Write-Host "   📦 amoras-backend-repo/  - Backend repository" -ForegroundColor Gray
Write-Host "   🎨 amoras-frontend-repo/ - Frontend repository" -ForegroundColor Gray
Write-Host ""

Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "1. 🌐 Criar repositórios no GitHub:" -ForegroundColor White
Write-Host "   - amoras-capital-backend" -ForegroundColor Gray
Write-Host "   - amoras-capital-frontend" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 🔗 Conectar e fazer push dos repositórios (comandos acima)" -ForegroundColor White
Write-Host ""
Write-Host "3. ⚙️ Configurar no EasyPanel:" -ForegroundColor White
Write-Host "   - Database: PostgreSQL 15" -ForegroundColor Gray
Write-Host "   - Backend: Docker + Repository" -ForegroundColor Gray
Write-Host "   - Frontend: Docker + Repository" -ForegroundColor Gray
Write-Host ""

Write-Host "📚 Documentação disponível:" -ForegroundColor Cyan
Write-Host "   - GUIA_INSTALACAO_VPS_EASYPANEL.md" -ForegroundColor Gray
Write-Host "   - easypanel-config.md" -ForegroundColor Gray
Write-Host "   - RESUMO_DEPLOY_VPS.md" -ForegroundColor Gray
Write-Host ""

Write-Host "Sistema pronto para deploy na VPS!" -ForegroundColor Green 