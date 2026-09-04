import { prisma } from '../config/database';

async function run() {
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "product_image_embeddings" (
      "productImageId" TEXT NOT NULL PRIMARY KEY,
      "embedding" vector(768) NOT NULL,
      "model" TEXT NOT NULL DEFAULT 'google/gemini-embedding-2',
      "dimensions" INTEGER NOT NULL DEFAULT 768,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "product_image_embeddings_productImageId_fkey"
        FOREIGN KEY ("productImageId") REFERENCES "product_images"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "product_image_embeddings_dimensions_check" CHECK ("dimensions" = 768)
    )
  `);
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "product_image_embeddings_embedding_hnsw_idx" ON "product_image_embeddings" USING hnsw ("embedding" vector_cosine_ops)');
  console.log('Busca visual preparada: pgvector, tabela e índice HNSW estão prontos.');
}

run().catch((error) => { console.error('Não foi possível preparar a busca visual:', error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
