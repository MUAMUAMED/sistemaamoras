import { prisma } from '../config/database';
import { disconnectVectorDatabase } from '../config/vector-database';
import { indexProductImage, isProductImageIndexed } from '../services/product-image-embedding.service';

async function run() {
  const argument = process.argv.find((value) => value.startsWith('--limit='));
  const limit = Math.max(1, Number(argument?.slice(8) || process.env.VISUAL_INDEX_LIMIT || 1000000));
  // Inclui roupas inativas: se elas voltarem ao catálogo, já estarão prontas.
  const images = await prisma.productImage.findMany({ where: { type: 'ROUPA' }, select: { id: true, url: true, mimeType: true, data: true }, orderBy: { createdAt: 'asc' }, take: limit });
  let indexed = 0; let alreadyIndexed = 0; let skipped = 0;
  for (const image of images) {
    try {
      if (await isProductImageIndexed(image.id)) { alreadyIndexed += 1; continue; }
      await indexProductImage(image);
      indexed += 1; console.log(`[${indexed}/${images.length}] indexada: ${image.url}`);
    } catch (error) { skipped += 1; console.warn(`Ignorada ${image.url}:`, error instanceof Error ? error.message : error); }
  }
  console.log(`Índice visual concluído: ${indexed} nova(s), ${alreadyIndexed} já indexada(s), ${skipped} ignorada(s).`);
}

run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); await disconnectVectorDatabase(); });
