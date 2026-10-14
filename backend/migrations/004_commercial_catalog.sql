-- Catalogo comercial separado do ERP operacional.
-- O produto comercial guarda apresentacao/fotos e referencia o produto real do ERP.

CREATE TABLE IF NOT EXISTS "commercial_categories" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "commercial_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "commercial_categories_slug_key"
  ON "commercial_categories"("slug");

CREATE TABLE IF NOT EXISTS "commercial_products" (
  "id" TEXT NOT NULL,
  "erpProductId" TEXT NOT NULL,
  "categoryId" TEXT,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "shortDescription" TEXT,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "material" TEXT,
  "careInstructions" TEXT,
  "colorNotes" TEXT,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "commercial_products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "commercial_products_erpProductId_key"
  ON "commercial_products"("erpProductId");

CREATE UNIQUE INDEX IF NOT EXISTS "commercial_products_slug_key"
  ON "commercial_products"("slug");

CREATE INDEX IF NOT EXISTS "commercial_products_published_featured_idx"
  ON "commercial_products"("published", "featured");

CREATE INDEX IF NOT EXISTS "commercial_products_categoryId_idx"
  ON "commercial_products"("categoryId");

ALTER TABLE "commercial_products"
  ADD CONSTRAINT "commercial_products_erpProductId_fkey"
  FOREIGN KEY ("erpProductId") REFERENCES "products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commercial_products"
  ADD CONSTRAINT "commercial_products_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "commercial_categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "commercial_product_images" (
  "id" TEXT NOT NULL,
  "commercialProductId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "alt" TEXT,
  "isCover" BOOLEAN NOT NULL DEFAULT false,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "commercial_product_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "commercial_product_images_commercialProductId_idx"
  ON "commercial_product_images"("commercialProductId");

ALTER TABLE "commercial_product_images"
  ADD CONSTRAINT "commercial_product_images_commercialProductId_fkey"
  FOREIGN KEY ("commercialProductId") REFERENCES "commercial_products"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "commercial_site_settings" (
  "id" TEXT NOT NULL,
  "brandName" TEXT NOT NULL DEFAULT 'Amoras Capital',
  "announcement" TEXT,
  "whatsappUrl" TEXT,
  "instagramUrl" TEXT,
  "heroTitle" TEXT,
  "heroSubtitle" TEXT,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "commercial_site_settings_pkey" PRIMARY KEY ("id")
);
