#!/bin/bash

# Script de Deploy - Sistema Amoras Capital
# Para uso em VPS com EasyPanel

set -e

echo "🚀 Iniciando deploy do Sistema Amoras Capital..."
echo "📅 $(date '+%Y-%m-%d %H:%M:%S')"

# Função para logs coloridos
log_info() {
    echo -e "\033[0;34m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

log_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

log_warning() {
    echo -e "\033[0;33m[WARNING]\033[0m $1"
}

# Verificar se estamos na raiz do projeto
if [ ! -f "package.json" ]; then
    log_error "Execute este script na raiz do projeto!"
    exit 1
fi

# 1. Backend Deploy
log_info "📦 Fazendo deploy do Backend..."

cd backend

log_info "Instalando dependências do backend..."
npm ci --only=production --legacy-peer-deps

log_info "Compilando TypeScript..."
npm run build

log_info "Gerando Prisma Client..."
npx prisma generate

log_info "Executando migrations..."
npx prisma migrate deploy

log_success "Backend compilado com sucesso!"

cd ..

# 2. Frontend Deploy
log_info "🎨 Fazendo deploy do Frontend..."

cd frontend

log_info "Instalando dependências do frontend..."
npm ci --legacy-peer-deps

log_info "Criando build de produção..."
npm run build

log_success "Frontend compilado com sucesso!"

cd ..

# 3. Verificações finais
log_info "🔍 Executando verificações finais..."

# Verificar se os arquivos de build existem
if [ ! -d "backend/dist" ]; then
    log_error "Build do backend não encontrado!"
    exit 1
fi

if [ ! -d "frontend/build" ]; then
    log_error "Build do frontend não encontrado!"
    exit 1
fi

# Verificar arquivos de configuração
if [ ! -f "backend/Dockerfile.production" ]; then
    log_warning "Dockerfile.production do backend não encontrado!"
fi

if [ ! -f "frontend/Dockerfile.production" ]; then
    log_warning "Dockerfile.production do frontend não encontrado!"
fi

if [ ! -f "frontend/nginx.conf" ]; then
    log_warning "nginx.conf do frontend não encontrado!"
fi

log_success "✅ Deploy concluído com sucesso!"
log_info "📋 Próximos passos:"
echo "   1. Suba os arquivos para o repositório Git"
echo "   2. Configure o EasyPanel para fazer deploy do repositório"
echo "   3. Configure as variáveis de ambiente no EasyPanel"
echo "   4. Execute o seed do banco: npm run db:seed"
echo ""
log_info "📞 Em caso de problemas, verifique os logs em /app/logs/" 