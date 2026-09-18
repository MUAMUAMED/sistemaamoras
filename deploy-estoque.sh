#!/bin/bash

# Script de Deploy - Nova Funcionalidade de Estoque por Localização
# Sistema Amoras Capital - EasyPanel

set -e

echo "🏪 Iniciando deploy da funcionalidade de Estoque por Localização..."
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

# 1. Gerar Migration para Estoque por Localização
log_info "📦 Preparando migration do banco de dados..."

cd backend

# Criar diretório de migrations se não existir
mkdir -p prisma/migrations

# Gerar migration
log_info "Gerando migration para estoque por localização..."
npx prisma migrate dev --name add_stock_locations --create-only

log_success "Migration gerada com sucesso!"

# 2. Backend Deploy
log_info "📦 Fazendo build do Backend..."

log_info "Instalando dependências do backend..."
npm ci --legacy-peer-deps

log_info "Gerando Prisma Client..."
npx prisma generate

log_info "Compilando TypeScript..."
npm run build

log_success "Backend compilado com sucesso!"

cd ..

# 3. Frontend Deploy
log_info "🎨 Fazendo build do Frontend..."

cd frontend

log_info "Instalando dependências do frontend..."
npm ci --legacy-peer-deps

log_info "Criando build de produção..."
npm run build

log_success "Frontend compilado com sucesso!"

cd ..

# 4. Verificações finais
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

log_success "✅ Build concluído com sucesso!"

# 5. Instruções para deploy no EasyPanel
echo ""
echo "🚀 ========================================="
echo "📋 INSTRUÇÕES PARA DEPLOY NO EASYPANEL"
echo "🚀 ========================================="
echo ""
log_info "1. Fazer commit e push das alterações:"
echo "   git add ."
echo "   git commit -m \"feat: Sistema de estoque por localização (Loja/Armazém)\""
echo "   git push origin main"
echo ""
log_info "2. No EasyPanel - Deploy Backend:"
echo "   - Acesse o container do backend"
echo "   - Clique em 'Deploy Now' ou aguarde deploy automático"
echo "   - Aguarde o deploy finalizar"
echo ""
log_warning "3. IMPORTANTE - Executar Migration no Banco:"
echo "   - Acesse o terminal do container backend no EasyPanel"
echo "   - Execute: npx prisma migrate deploy"
echo "   - Ou execute o SQL abaixo manualmente no PostgreSQL:"
echo ""

# 6. Gerar SQL manual para migration
log_info "📄 SQL para execução manual (caso necessário):"
echo "=================================================="
echo "-- Adicionar campos de estoque por localização"
echo "ALTER TABLE \"products\" ADD COLUMN IF NOT EXISTS \"stockLoja\" INTEGER NOT NULL DEFAULT 0;"
echo "ALTER TABLE \"products\" ADD COLUMN IF NOT EXISTS \"stockArmazem\" INTEGER NOT NULL DEFAULT 0;"
echo ""
echo "-- Adicionar campos de localização em movimentações"
echo "CREATE TYPE \"StockLocation\" AS ENUM ('LOJA', 'ARMAZEM');"
echo "ALTER TABLE \"stock_movements\" ADD COLUMN IF NOT EXISTS \"location\" \"StockLocation\";"
echo "ALTER TABLE \"stock_movements\" ADD COLUMN IF NOT EXISTS \"fromLocation\" \"StockLocation\";"
echo "ALTER TABLE \"stock_movements\" ADD COLUMN IF NOT EXISTS \"toLocation\" \"StockLocation\";"
echo ""
echo "-- Atualizar estoque total = loja + armazém (para produtos existentes)"
echo "UPDATE \"products\" SET \"stockLoja\" = \"stock\", \"stockArmazem\" = 0 WHERE \"stockLoja\" = 0 AND \"stockArmazem\" = 0;"
echo "=================================================="
echo ""

log_info "4. No EasyPanel - Deploy Frontend:"
echo "   - Acesse o container do frontend"
echo "   - Clique em 'Deploy Now' ou aguarde deploy automático"
echo ""

log_info "5. Verificar funcionamento:"
echo "   - Acesse a URL do sistema"
echo "   - Teste a página de produtos"
echo "   - Verifique se aparecem as informações de estoque por localização"
echo "   - Teste o botão 'Transfer' entre localizações"
echo ""

log_success "🎉 NOVAS FUNCIONALIDADES IMPLEMENTADAS:"
echo "   ✅ Estoque separado por Loja e Armazém"
echo "   ✅ Botões de Entrada e Saída por localização"
echo "   ✅ Modal de Transferência entre estoques"
echo "   ✅ Visualização de estoque por localização"
echo "   ✅ Histórico completo de movimentações"
echo "   ✅ APIs REST para gestão de estoque"
echo ""

log_info "📞 Em caso de problemas:"
echo "   - Verifique os logs do container no EasyPanel"
echo "   - Confirme se a migration foi executada com sucesso"
echo "   - Teste as APIs: /api/products (deve mostrar stockLoja e stockArmazem)"
echo ""

log_success "⏰ Deploy preparado! Siga as instruções acima para aplicar no EasyPanel."