-- ===================================================
-- MIGRATION: MÚLTIPLAS IMAGENS POR PRODUTO
-- ===================================================

-- 1. Criar enum para tipos de imagem
DO $$ BEGIN
    CREATE TYPE "ProductImageType" AS ENUM ('ROUPA', 'IA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Criar tabela de imagens de produto
CREATE TABLE IF NOT EXISTS "product_images" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "ProductImageType" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- 3. Criar relacionamento com tabela products
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_fkey" 
FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS "product_images_productId_type_idx" ON "product_images"("productId", "type");

-- 5. Adicionar comentários para documentação
COMMENT ON TABLE "product_images" IS 'Galeria de imagens dos produtos com tipos ROUPA e IA';
COMMENT ON COLUMN "product_images"."type" IS 'Tipo da imagem: ROUPA (foto real) ou IA (imagem gerada)';
COMMENT ON COLUMN "product_images"."position" IS 'Posição da imagem na galeria (ordenação)';

-- 6. Migrar imagens existentes do campo imageUrl para a nova tabela
INSERT INTO "product_images" ("id", "productId", "url", "type", "position")
SELECT 
    'img_' || generate_random_uuid()::text,
    "id",
    "imageUrl",
    'ROUPA'::ProductImageType,
    0
FROM "products" 
WHERE "imageUrl" IS NOT NULL 
AND "imageUrl" != ''
AND NOT EXISTS (
    SELECT 1 FROM "product_images" pi 
    WHERE pi."productId" = "products"."id" 
    AND pi."url" = "products"."imageUrl"
);
