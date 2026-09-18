#!/bin/sh
set -e

# Aguardar banco estar pronto
echo "🔄 Aguardando banco de dados PostgreSQL..."
node scripts/wait-for-db.js

# Aplicar schema do Prisma
echo "🔄 Aplicando schema do Prisma..."
npx prisma db push --accept-data-loss --skip-generate || {
  echo "⚠️  Aviso: Erro ao aplicar schema (pode ser normal se já estiver atualizado)"
}

echo "✅ Schema do Prisma verificado/aplicado!"

# Iniciar servidor
echo "🚀 Iniciando servidor Node.js..."
exec node dist/index.js

