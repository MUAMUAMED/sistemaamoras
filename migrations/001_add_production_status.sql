-- AddProductionStatus Migration
-- This migration adds the inProduction field to the products table

-- Add the inProduction column to products table
ALTER TABLE "products" ADD COLUMN "inProduction" BOOLEAN NOT NULL DEFAULT true;

-- Create an index for better query performance
CREATE INDEX "idx_products_inProduction" ON "products"("inProduction");

-- Add comment for documentation
COMMENT ON COLUMN "products"."inProduction" IS 'Indicates if the product is currently in production phase';