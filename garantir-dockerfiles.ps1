# Script para garantir que os Dockerfiles estejam nas branches corretas

Write-Host "=== Garantindo Dockerfiles nas branches corretas ===" -ForegroundColor Green

# 1. Backend-only branch
Write-Host "`n1. Verificando branch backend-only..." -ForegroundColor Yellow
git checkout backend-only
if ($LASTEXITCODE -eq 0) {
    if (Test-Path "backend/Dockerfile") {
        Write-Host "   Dockerfile do backend encontrado!" -ForegroundColor Green
        git add backend/Dockerfile
        git commit -m "Garantir Dockerfile do backend visível no GitHub" --allow-empty
        git push origin backend-only
        Write-Host "   Backend-only atualizado!" -ForegroundColor Green
    } else {
        Write-Host "   ERRO: Dockerfile do backend não encontrado!" -ForegroundColor Red
    }
} else {
    Write-Host "   ERRO: Não foi possível mudar para branch backend-only" -ForegroundColor Red
}

# 2. Frontend-only branch
Write-Host "`n2. Verificando branch frontend-only..." -ForegroundColor Yellow
git checkout frontend-only
if ($LASTEXITCODE -eq 0) {
    if (Test-Path "frontend/Dockerfile") {
        Write-Host "   Dockerfile do frontend encontrado!" -ForegroundColor Green
        git add frontend/Dockerfile
        git commit -m "Garantir Dockerfile do frontend visível no GitHub" --allow-empty
        git push origin frontend-only
        Write-Host "   Frontend-only atualizado!" -ForegroundColor Green
    } else {
        Write-Host "   Dockerfile do frontend não encontrado. Criando..." -ForegroundColor Yellow
        
        # Criar Dockerfile do frontend baseado no que vimos anteriormente
        $dockerfileContent = @"
# Etapa 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Build arguments para variáveis de ambiente no build time
ARG REACT_APP_API_URL
ARG VITE_API_URL

# Variáveis de ambiente para o build (Vite precisa no build time)
# IMPORTANTE: Não definir NODE_ENV=production aqui para instalar devDependencies
ENV REACT_APP_API_URL=`$REACT_APP_API_URL
ENV VITE_API_URL=`$VITE_API_URL

COPY package*.json ./

# Instalar todas as dependências (incluindo devDependencies para o build)
# Não usar --production para garantir que devDependencies sejam instaladas
RUN npm install --legacy-peer-deps --prefer-offline --no-audit && \
    npm cache clean --force

COPY . .

# Instalar dependência opcional do rollup para Alpine Linux (necessário para vite build)
RUN npm install @rollup/rollup-linux-x64-musl --save-optional --legacy-peer-deps || true

# Verificar instalação do vite e build da aplicação
RUN npm list vite
RUN npm run build

# Etapa 2: Servidor estático
FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve
COPY --from=build /app/dist ./dist

EXPOSE 8080

CMD ["serve", "-s", "dist", "-l", "8080"]
"@
        
        # Criar diretório frontend se não existir
        if (-not (Test-Path "frontend")) {
            New-Item -ItemType Directory -Path "frontend" -Force | Out-Null
        }
        
        # Criar o Dockerfile
        $dockerfileContent | Out-File -FilePath "frontend/Dockerfile" -Encoding UTF8
        
        git add frontend/Dockerfile
        git commit -m "Adicionar Dockerfile do frontend"
        git push origin frontend-only
        Write-Host "   Dockerfile do frontend criado e enviado!" -ForegroundColor Green
    }
} else {
    Write-Host "   ERRO: Não foi possível mudar para branch frontend-only" -ForegroundColor Red
}

Write-Host "`n=== Concluído! ===" -ForegroundColor Green
Write-Host "Os Dockerfiles agora estão visíveis nas respectivas branches no GitHub!" -ForegroundColor Cyan

