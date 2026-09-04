import fs from 'fs';
import path from 'path';
import { embedImages, vectorLiteral } from './image-embedding.service';
import { vectorDatabase } from '../config/vector-database';

type ProductImageForIndex = { id: string; url: string; mimeType?: string | null; data?: Buffer | null };

function localImagePath(url: string): string | null {
  const pathname = new URL(url, 'http://local').pathname;
  if (!/^\/?uploads\/products\/product-[\w-]+\.[a-zA-Z0-9]+$/.test(pathname)) return null;
  const relative = pathname.replace(/^\//, '');
  const candidates = [
    path.join(process.env.UPLOADS_BASE_DIR || process.cwd(), relative),
    path.join(process.cwd(), relative),
    path.join('/src', relative),
    path.join('/app', relative),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

/** Indexação idempotente: repetir não gera uma segunda linha no pgvector. */
export async function indexProductImage(image: ProductImageForIndex): Promise<boolean> {
  if (!process.env.OPENROUTER_API_KEY || !process.env.VECTOR_DATABASE_URL) return false;
  const localPath = localImagePath(image.url);
  const vector = await embedImages([{ path: localPath || undefined, data: image.data || undefined, mimeType: image.mimeType || image.url }]);
  await vectorDatabase().$executeRawUnsafe(
    'INSERT INTO product_image_embeddings ("productImageId", embedding, model, dimensions) VALUES ($1, $2::vector, $3, 768) ON CONFLICT ("productImageId") DO UPDATE SET embedding = EXCLUDED.embedding, model = EXCLUDED.model, dimensions = EXCLUDED.dimensions, "updatedAt" = CURRENT_TIMESTAMP',
    image.id, vectorLiteral(vector), process.env.OPENROUTER_EMBEDDING_MODEL || 'google/gemini-embedding-2',
  );
  return true;
}

export async function isProductImageIndexed(imageId: string): Promise<boolean> {
  const rows = await vectorDatabase().$queryRawUnsafe<Array<{ indexed: boolean }>>(
    'SELECT EXISTS (SELECT 1 FROM product_image_embeddings WHERE "productImageId" = $1) AS indexed', imageId,
  );
  return rows[0]?.indexed === true;
}
