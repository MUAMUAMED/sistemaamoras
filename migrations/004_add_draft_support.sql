-- Add Draft Support Migration
-- This migration adds the isDraft field and makes barcode optional for draft products

-- Add the isDraft column to products table
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isDraft" BOOLEAN NOT NULL DEFAULT false;

-- Make barcode nullable (for draft products)
ALTER TABLE "products" ALTER COLUMN "barcode" DROP NOT NULL;

-- Make other fields nullable for draft support
ALTER TABLE "products" ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE "products" ALTER COLUMN "categoryId" DROP NOT NULL;
ALTER TABLE "products" ALTER COLUMN "sizeId" DROP NOT NULL;
ALTER TABLE "products" ALTER COLUMN "patternId" DROP NOT NULL;
ALTER TABLE "products" ALTER COLUMN "price" DROP NOT NULL;

-- Create an index for better query performance on drafts
CREATE INDEX IF NOT EXISTS "idx_products_isDraft" ON "products"("isDraft");

-- Add comment for documentation
COMMENT ON COLUMN "products"."isDraft" IS 'Indicates if the product is a draft (true) or a complete product (false)';

