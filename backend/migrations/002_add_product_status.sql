-- Add Product Status Migration
-- This migration adds the status field with ProductStatus enum to the products table

-- Create the enum for product status
DO $$ BEGIN
    CREATE TYPE "ProductStatus" AS ENUM ('PROCESSANDO', 'ATIVO', 'INATIVO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add the status column to products table
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "status" "ProductStatus" NOT NULL DEFAULT 'PROCESSANDO';

-- Set status based on current inProduction and active values
UPDATE "products" 
SET "status" = CASE 
    WHEN "inProduction" = true THEN 'PROCESSANDO'
    WHEN "active" = true THEN 'ATIVO'
    ELSE 'INATIVO'
END;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS "idx_products_status" ON "products"("status");

-- Add comment for documentation
COMMENT ON COLUMN "products"."status" IS 'Current status of the product: PROCESSANDO, ATIVO, or INATIVO';
