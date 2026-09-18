ALTER TABLE "commercial_products"
ADD COLUMN "yampiProductId" TEXT,
ADD COLUMN "yampiSkuId" TEXT,
ADD COLUMN "yampiSyncedAt" TIMESTAMP(3),
ADD COLUMN "yampiSyncError" TEXT;

CREATE UNIQUE INDEX "commercial_products_yampiProductId_key"
ON "commercial_products"("yampiProductId");

CREATE UNIQUE INDEX "commercial_products_yampiSkuId_key"
ON "commercial_products"("yampiSkuId");
