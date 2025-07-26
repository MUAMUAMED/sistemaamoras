# 📦 Criar Repositórios Separados

Este guia mostra como separar o projeto em repositórios distintos para facilitar o deploy.

## 🚀 Opção 1: Criação Manual

### 1. Criar Repositórios no GitHub

Acesse https://github.com/new e crie:

1. **`amoras-capital-backend`** - Repositório do Backend
2. **`amoras-capital-frontend`** - Repositório do Frontend

### 2. Configurar Backend

```bash
# Criar pasta temporária para backend
mkdir amoras-backend-repo
cd amoras-backend-repo

# Inicializar git
git init

# Copiar arquivos do backend
cp -r ../backend/* .
cp ../backend/.gitignore .
cp ../GUIA_INSTALACAO_VPS_EASYPANEL.md .
cp ../easypanel-config.md .

# Configurar git
git add .
git commit -m "🚀 Initial commit - Amoras Capital Backend"

# Conectar ao repositório
git remote add origin https://github.com/SEU_USUARIO/amoras-capital-backend.git
git branch -M main
git push -u origin main
```

### 3. Configurar Frontend

```bash
# Voltar à pasta raiz
cd ..

# Criar pasta temporária para frontend
mkdir amoras-frontend-repo
cd amoras-frontend-repo

# Inicializar git
git init

# Copiar arquivos do frontend
cp -r ../frontend/* .
cp ../frontend/.gitignore .

# Configurar git
git add .
git commit -m "🎨 Initial commit - Amoras Capital Frontend"

# Conectar ao repositório
git remote add origin https://github.com/SEU_USUARIO/amoras-capital-frontend.git
git branch -M main
git push -u origin main
```

## 🛠️ Opção 2: Script Automatizado (Windows)

### 1. Criar script `create-repos.ps1`

```powershell
# Script para criar repositórios separados
Write-Host "🚀 Criando repositórios separados..." -ForegroundColor Green

# Verificar se está na pasta correta
if (!(Test-Path "backend") -or !(Test-Path "frontend")) {
    Write-Host "❌ Execute este script na raiz do projeto!" -ForegroundColor Red
    exit 1
}

# Criar repositório do Backend
Write-Host "📦 Configurando repositório do Backend..." -ForegroundColor Blue
New-Item -ItemType Directory -Force -Path "amoras-backend-repo"
Set-Location "amoras-backend-repo"

git init
Copy-Item -Recurse -Force "../backend/*" "."
Copy-Item -Force "../backend/.gitignore" "."
Copy-Item -Force "../GUIA_INSTALACAO_VPS_EASYPANEL.md" "."
Copy-Item -Force "../easypanel-config.md" "."

git add .
git commit -m "🚀 Initial commit - Amoras Capital Backend"

Write-Host "✅ Backend configurado!" -ForegroundColor Green
Write-Host "🔗 Conecte ao repositório:" -ForegroundColor Yellow
Write-Host "git remote add origin https://github.com/SEU_USUARIO/amoras-capital-backend.git"
Write-Host "git push -u origin main"

# Voltar e criar repositório do Frontend
Set-Location ".."
Write-Host "🎨 Configurando repositório do Frontend..." -ForegroundColor Blue
New-Item -ItemType Directory -Force -Path "amoras-frontend-repo"
Set-Location "amoras-frontend-repo"

git init
Copy-Item -Recurse -Force "../frontend/*" "."
Copy-Item -Force "../frontend/.gitignore" "."

git add .
git commit -m "🎨 Initial commit - Amoras Capital Frontend"

Write-Host "✅ Frontend configurado!" -ForegroundColor Green
Write-Host "🔗 Conecte ao repositório:" -ForegroundColor Yellow
Write-Host "git remote add origin https://github.com/SEU_USUARIO/amoras-capital-frontend.git"
Write-Host "git push -u origin main"

Set-Location ".."
Write-Host "🎉 Repositórios criados com sucesso!" -ForegroundColor Green
```

### 2. Executar script
```powershell
.\create-repos.ps1
```

## 📋 Configuração no EasyPanel

### Backend Repository
```yaml
Name: amoras-backend
Repository: https://github.com/SEU_USUARIO/amoras-capital-backend.git
Branch: main
Dockerfile: Dockerfile.production
```

### Frontend Repository
```yaml
Name: amoras-frontend
Repository: https://github.com/SEU_USUARIO/amoras-capital-frontend.git
Branch: main
Dockerfile: Dockerfile.production
```

## 🔧 Arquivos Incluídos

### Backend Repository
- ✅ Todo código do backend
- ✅ `Dockerfile.production`
- ✅ `README.md` específico
- ✅ `.gitignore` otimizado
- ✅ `env.example`
- ✅ Guias de instalação

### Frontend Repository
- ✅ Todo código do frontend
- ✅ `Dockerfile.production`
- ✅ `nginx.conf`
- ✅ `README.md` específico
- ✅ `.gitignore` otimizado
- ✅ `env.example`

## 🚀 Deploy Final

Após criar os repositórios:

1. **Configure o EasyPanel** apontando para os novos repositórios
2. **Configure as variáveis de ambiente** em cada aplicação
3. **Faça o deploy** seguindo a ordem: Database → Backend → Frontend

---

**✅ Repositórios prontos para deploy separado!** 