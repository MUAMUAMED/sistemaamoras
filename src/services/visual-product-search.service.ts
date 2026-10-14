import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { vectorDatabase } from '../config/vector-database';
import { embedImages, imageEmbeddingModel, vectorLiteral, ImageInput } from './image-embedding.service';
import { ensureVisualSearchSetup } from './product-image-embedding.service';
import { ModelFilters } from './catalog-identity.service';
import { stockProductInclude } from './mobile-stock.service';

/** Filtra os IDs no ERP antes de ordenar no banco vetorial separado. */
export async function rankedProductImages(inputs: ImageInput[], filters: ModelFilters = {}) {
  const productWhere = { active: true, isDraft: false, ...filters, pattern: { active: true, canonicalPatternId: null } };
  const candidates = filters.categoryId || filters.subcategoryId ? await prisma.productImage.findMany({
    where: { type: 'ROUPA', product: productWhere }, select: { id: true },
  }) : null;
  if (candidates && !candidates.length) return [];
  const vector = vectorLiteral(await embedImages(inputs));
  await ensureVisualSearchSetup();
  const model = imageEmbeddingModel();
  const restricted = candidates ? Prisma.sql`AND "productImageId" IN (${Prisma.join(candidates.map((image) => image.id))})` : Prisma.empty;
  const rows = await vectorDatabase().$queryRaw<Array<{ productImageId: string; score: number }>>(Prisma.sql`
    SELECT "productImageId", 1 - (embedding <=> ${vector}::vector) AS score FROM product_image_embeddings
    WHERE model IN (${model}, ${model.replace(/^google\//, '')}) ${restricted}
    ORDER BY embedding <=> ${vector}::vector LIMIT 500`);
  const scores = new Map(rows.map((row) => [row.productImageId, Number(row.score)]));
  const images = await prisma.productImage.findMany({ where: { id: { in: [...scores.keys()] }, type: 'ROUPA', product: productWhere },
    select: { id: true, url: true, product: { include: stockProductInclude } } });
  return images.map((image) => ({ ...image, score: scores.get(image.id)! })).filter((image) => Number.isFinite(image.score)).sort((a, b) => b.score - a.score);
}
