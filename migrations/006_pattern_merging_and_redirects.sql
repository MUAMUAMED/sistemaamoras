-- Unificação de estampas semelhantes e redirecionamento de códigos de barras / QR codes impressos

-- 1. Coluna de estampa canônica na tabela patterns
ALTER TABLE "patterns" ADD COLUMN IF NOT EXISTS "canonicalPatternId" TEXT;

-- 2. Tabela de redirecionamentos de código de estampa (para QR Codes e Códigos de Barras impressos)
CREATE TABLE IF NOT EXISTS "pattern_redirects" (
  "id" TEXT NOT NULL,
  "sourcePatternId" TEXT NOT NULL,
  "sourcePatternCode" TEXT NOT NULL,
  "sourcePatternName" TEXT NOT NULL,
  "targetPatternId" TEXT NOT NULL,
  "targetPatternCode" TEXT NOT NULL,
  "targetPatternName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pattern_redirects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pattern_redirects_sourcePatternCode_key"
  ON "pattern_redirects"("sourcePatternCode");

CREATE INDEX IF NOT EXISTS "pattern_redirects_sourcePatternId_idx"
  ON "pattern_redirects"("sourcePatternId");

CREATE INDEX IF NOT EXISTS "pattern_redirects_targetPatternId_idx"
  ON "pattern_redirects"("targetPatternId");

CREATE INDEX IF NOT EXISTS "pattern_redirects_targetPatternCode_idx"
  ON "pattern_redirects"("targetPatternCode");

-- 3. Tabela de aliases de códigos de barras de produtos já impressos
CREATE TABLE IF NOT EXISTS "product_barcode_aliases" (
  "id" TEXT NOT NULL,
  "barcode" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_barcode_aliases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_barcode_aliases_barcode_key"
  ON "product_barcode_aliases"("barcode");

CREATE INDEX IF NOT EXISTS "product_barcode_aliases_productId_idx"
  ON "product_barcode_aliases"("productId");
