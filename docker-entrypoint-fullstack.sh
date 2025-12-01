#!/bin/sh
set -e

echo "============================================"
echo "🚀 Iniciando aplicação Full-Stack"
echo "============================================"

# Aguardar banco de dados estar pronto
echo "🔄 Aguardando banco de dados PostgreSQL..."
cd /app/backend
node scripts/wait-for-db.js || {
    echo "❌ Erro ao conectar ao banco de dados"
    exit 1
}

# Aplicar schema do Prisma
echo "🔄 Aplicando schema do Prisma..."
npx prisma db push --accept-data-loss --skip-generate || {
    echo "⚠️  Aviso: Erro ao aplicar schema (pode ser normal se já estiver atualizado)"
}

# Gerar Prisma Client (garantir que está atualizado)
echo "🔄 Gerando Prisma Client..."
npx prisma generate || {
    echo "❌ Erro ao gerar Prisma Client"
    exit 1
}

echo "✅ Prisma configurado com sucesso!"
echo ""

# Criar diretórios necessários se não existirem
mkdir -p /app/backend/uploads/products /app/backend/uploads/temp /app/backend/logs

# Voltar para raiz
cd /app

echo "🚀 Iniciando Supervisor (Nginx + Backend)..."
echo "============================================"

# Iniciar Supervisor (gerencia Nginx e Backend)
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf

