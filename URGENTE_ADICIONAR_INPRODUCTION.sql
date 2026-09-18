-- ===================================================
-- SCRIPT URGENTE: Adicionar campo inProduction
-- Execute este SQL diretamente no banco PostgreSQL
-- ===================================================

-- 1. Adicionar campo inProduction se não existir
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS "inProduction" BOOLEAN NOT NULL DEFAULT true;

-- 2. Atualizar produtos existentes para serem considerados "em produção"
UPDATE products 
SET "inProduction" = true 
WHERE "inProduction" IS NULL OR "inProduction" = false;

-- 3. Criar índice para performance
CREATE INDEX IF NOT EXISTS "idx_products_inProduction" ON products("inProduction");

-- 4. Verificar resultado
SELECT 
    id, 
    name, 
    "inProduction", 
    active,
    "createdAt"
FROM products 
ORDER BY "createdAt" DESC 
LIMIT 5;

-- ===================================================
-- Após executar este SQL, todos os produtos devem 
-- mostrar o status "Processando" na interface
-- ===================================================
