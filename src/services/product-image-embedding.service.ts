import fs from 'fs';
import path from 'path';
import { embedImages, vectorLiteral } from './image-embedding.service';
import { vectorDatabase } from '../config/vector-database';

import { prisma } from '../config/database';

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

/** Garante que a extensão pgvector, a tabela de embeddings e o índice HNSW existam. */
let setupPromise: Promise<void> | null = null;
export async function ensureVisualSearchSetup(): Promise<void> {
  if (setupPromise) return setupPromise;
  setupPromise = (async () => {
    const dbUrl = process.env.VECTOR_DATABASE_URL || process.env.DATABASE_URL;
    if (!dbUrl) return;
    try {
      const db = vectorDatabase();
      await db.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector');
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "product_image_embeddings" (
          "productImageId" TEXT NOT NULL PRIMARY KEY,
          "embedding" vector(768) NOT NULL,
          "model" TEXT NOT NULL DEFAULT 'google/gemini-embedding-2',
          "dimensions" INTEGER NOT NULL DEFAULT 768,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "product_image_embeddings_dimensions_check" CHECK ("dimensions" = 768)
        )
      `);
      await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "product_image_embeddings_embedding_hnsw_idx" ON "product_image_embeddings" USING hnsw ("embedding" vector_cosine_ops)');
      console.log('[PGVECTOR] Tabela product_image_embeddings e índice HNSW inicializados.');
    } catch (err: any) {
      console.warn('[PGVECTOR] Aviso ao verificar/criar estrutura pgvector:', err?.message || err);
      setupPromise = null;
    }
  })();
  return setupPromise;
}

/** Obtém o buffer da imagem no banco de dados se não estiver no disco local. */
async function resolveImageBuffer(image: ProductImageForIndex): Promise<Buffer | null> {
  if (image.data) return image.data;
  try {
    let dbImg = image.id ? await (prisma as any).productImage.findUnique({
      where: { id: image.id },
      select: { data: true },
    }) : null;

    if (!dbImg?.data && image.url) {
      const pathname = new URL(image.url, 'http://local').pathname;
      const filename = path.basename(pathname);
      dbImg = await (prisma as any).productImage.findFirst({
        where: {
          OR: [
            { filename },
            { url: image.url },
            { url: { endsWith: filename } },
          ],
          data: { not: null },
        },
        select: { data: true },
      });
    }

    if (dbImg?.data) {
      return Buffer.from(dbImg.data);
    }
  } catch (err: any) {
    console.warn('[EMBED] Falha ao consultar buffer no banco:', err?.message || err);
  }
  return null;
}

/** Indexação idempotente: repetir não gera uma segunda linha no pgvector. */
export async function indexProductImage(image: ProductImageForIndex): Promise<boolean> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const dbUrl = process.env.VECTOR_DATABASE_URL || process.env.DATABASE_URL;
  if (!apiKey || !dbUrl) return false;

  await ensureVisualSearchSetup();

  const localPath = localImagePath(image.url);
  const buffer = await resolveImageBuffer(image);

  const vector = await embedImages([{
    path: localPath || undefined,
    data: buffer || undefined,
    url: image.url,
    mimeType: image.mimeType || image.url
  }]);

  await vectorDatabase().$executeRawUnsafe(
    'INSERT INTO product_image_embeddings ("productImageId", embedding, model, dimensions) VALUES ($1, $2::vector, $3, 768) ON CONFLICT ("productImageId") DO UPDATE SET embedding = EXCLUDED.embedding, model = EXCLUDED.model, dimensions = EXCLUDED.dimensions, "updatedAt" = CURRENT_TIMESTAMP',
    image.id, vectorLiteral(vector), process.env.OPENROUTER_EMBEDDING_MODEL || 'google/gemini-embedding-2',
  );
  return true;
}

/** Obtém o vetor de 768 dimensões para a imagem, indexando se ainda não estiver no banco. */
export async function getOrIndexImageVector(image: ProductImageForIndex): Promise<number[] | null> {
  await ensureVisualSearchSetup();
  const dbUrl = process.env.VECTOR_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) return null;

  const db = vectorDatabase();

  // 1. Tentar ler do banco se já existir
  if (image.id && !image.id.startsWith('temp-')) {
    try {
      const existing = await db.$queryRawUnsafe<Array<{ embedding: string }>>(
        'SELECT embedding::text AS embedding FROM product_image_embeddings WHERE "productImageId" = $1 LIMIT 1',
        image.id
      );
      if (existing?.[0]?.embedding) {
        const parsed = existing[0].embedding
          .replace(/^\[/, '')
          .replace(/\]$/, '')
          .split(',')
          .map(Number);
        if (parsed.length === 768 && parsed.every((n) => Number.isFinite(n))) {
          return parsed;
        }
      }
    } catch (e: any) {
      console.warn('[PGVECTOR] Falha ao consultar embedding existente:', e?.message || e);
    }
  }

  // 2. Se não existir, gerar embedding usando a IA do OpenRouter
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn('[PGVECTOR] OPENROUTER_API_KEY ausente para busca visual.');
    return null;
  }

  const localPath = localImagePath(image.url);
  const buffer = await resolveImageBuffer(image);

  try {
    const vector = await embedImages([{
      path: localPath || undefined,
      data: buffer || undefined,
      url: image.url,
      mimeType: image.mimeType || image.url,
    }]);

    if (image.id && !image.id.startsWith('temp-')) {
      await db.$executeRawUnsafe(
        'INSERT INTO product_image_embeddings ("productImageId", embedding, model, dimensions) VALUES ($1, $2::vector, $3, 768) ON CONFLICT ("productImageId") DO UPDATE SET embedding = EXCLUDED.embedding, model = EXCLUDED.model, dimensions = EXCLUDED.dimensions, "updatedAt" = CURRENT_TIMESTAMP',
        image.id,
        vectorLiteral(vector),
        process.env.OPENROUTER_EMBEDDING_MODEL || 'google/gemini-embedding-2',
      );
    }

    return vector;
  } catch (err: any) {
    console.error('[PGVECTOR] Erro ao gerar vetor da imagem:', err?.message || err);
    return null;
  }
}

/** Auto-indexa fotos de amostra de estampas ativas caso o banco vetorial esteja vazio ou com poucos registros. */
let isAutoIndexing = false;
export async function autoIndexCatalogImages(limit = 40): Promise<number> {
  if (isAutoIndexing) return 0;
  const apiKey = process.env.OPENROUTER_API_KEY;
  const dbUrl = process.env.VECTOR_DATABASE_URL || process.env.DATABASE_URL;
  if (!apiKey || !dbUrl) return 0;

  isAutoIndexing = true;
  let indexedCount = 0;
  try {
    await ensureVisualSearchSetup();
    const db = vectorDatabase();

    // Buscar imagens de roupas ativas que pertençam a estampas ativas
    const images = await (prisma as any).productImage.findMany({
      where: {
        type: 'ROUPA',
        product: {
          active: true,
          patternId: { not: null },
          pattern: { active: true },
        },
      },
      select: { id: true, url: true, mimeType: true, data: true },
      take: limit * 2,
      orderBy: { createdAt: 'desc' },
    });

    for (const img of images) {
      if (indexedCount >= limit) break;
      const check = await db.$queryRawUnsafe<Array<{ exists: boolean }>>(
        'SELECT EXISTS (SELECT 1 FROM product_image_embeddings WHERE "productImageId" = $1) AS exists',
        img.id
      );
      if (check?.[0]?.exists) continue;

      try {
        await indexProductImage(img);
        indexedCount++;
      } catch (err) {
        console.warn(`[AUTO-INDEX] Falha na imagem ${img.id}:`, err);
      }
    }
    if (indexedCount > 0) {
      console.log(`[AUTO-INDEX] ${indexedCount} novas imagens do catálogo foram indexadas no pgvector.`);
    }
  } catch (err: any) {
    console.warn('[AUTO-INDEX] Erro durante auto-indexação:', err?.message || err);
  } finally {
    isAutoIndexing = false;
  }
  return indexedCount;
}

export async function isProductImageIndexed(imageId: string): Promise<boolean> {
  const rows = await vectorDatabase().$queryRawUnsafe<Array<{ indexed: boolean }>>(
    'SELECT EXISTS (SELECT 1 FROM product_image_embeddings WHERE "productImageId" = $1) AS indexed', imageId,
  );
  return rows[0]?.indexed === true;
}
