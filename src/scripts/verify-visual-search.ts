import { disconnectVectorDatabase, vectorDatabase } from '../config/vector-database';
import { prisma } from '../config/database';

async function run() {
  const db = vectorDatabase();
  const extension = await db.$queryRawUnsafe<Array<{ installed: boolean }>>("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS installed");
  const rows = await db.$queryRawUnsafe<Array<{ embeddings: bigint }>>('SELECT COUNT(*)::bigint AS embeddings FROM product_image_embeddings');
  const dimensions = await db.$queryRawUnsafe<Array<{ dimensions: number; count: bigint }>>('SELECT dimensions, COUNT(*)::bigint AS count FROM product_image_embeddings GROUP BY dimensions ORDER BY dimensions');
  const operationalImages = await prisma.productImage.count({ where: { type: 'ROUPA' } });
  console.log(JSON.stringify({ pgvectorInstalled: extension[0]?.installed === true, operationalImages, embeddings: Number(rows[0]?.embeddings || 0), missing: Math.max(0, operationalImages - Number(rows[0]?.embeddings || 0)), dimensions: dimensions.map((row) => ({ dimensions: row.dimensions, count: Number(row.count) })) }));
}

run().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); await disconnectVectorDatabase(); });
