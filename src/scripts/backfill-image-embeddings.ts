import path from 'path';
import { prisma } from '../config/database';
import { disconnectVectorDatabase, vectorDatabase } from '../config/vector-database';
import { embedImages, vectorLiteral } from '../services/image-embedding.service';

function filePath(url: string) {
  if (!/^\/?uploads\/products\/product-[\w-]+\.[a-zA-Z0-9]+$/.test(new URL(url, 'http://local').pathname)) return null;
  return path.resolve(process.cwd(), `.${new URL(url, 'http://local').pathname}`);
}

async function run() {
  const vectors = vectorDatabase();
  const argument = process.argv.find((value) => value.startsWith('--limit='));
  const limit = Math.max(1, Number(argument?.slice(8) || process.env.VISUAL_INDEX_LIMIT || 1000000));
  const images = await prisma.productImage.findMany({ where: { type: 'ROUPA', product: { active: true } }, select: { id: true, url: true, mimeType: true }, orderBy: { createdAt: 'asc' }, take: limit });
  let indexed = 0; let skipped = 0;
  for (const image of images) {
    const localPath = filePath(image.url);
    if (!localPath) { skipped += 1; continue; }
    try {
      const vector = await embedImages([{ path: localPath, mimeType: image.mimeType || image.url }]);
      await vectors.$executeRawUnsafe(`INSERT INTO product_image_embeddings ("productImageId", embedding, model, dimensions) VALUES ($1, $2::vector, $3, 768) ON CONFLICT ("productImageId") DO UPDATE SET embedding = EXCLUDED.embedding, model = EXCLUDED.model, dimensions = EXCLUDED.dimensions, "updatedAt" = CURRENT_TIMESTAMP`, image.id, vectorLiteral(vector), process.env.OPENROUTER_EMBEDDING_MODEL || 'google/gemini-embedding-2');
      indexed += 1; console.log(`[${indexed}/${images.length}] indexada: ${image.url}`);
    } catch (error) { skipped += 1; console.warn(`Ignorada ${image.url}:`, error instanceof Error ? error.message : error); }
  }
  console.log(`Índice visual concluído: ${indexed} foto(s) indexada(s), ${skipped} ignorada(s).`);
}

run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); await disconnectVectorDatabase(); });
