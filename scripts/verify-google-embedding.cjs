// Executar na raiz do backend publicado. Somente leitura de catálogo/estoque.
// Duas chamadas reais ao provedor: comparação com vetor existente e busca HTTP.
const { prisma } = require('../dist/config/database');
const { vectorDatabase } = require('../dist/config/vector-database');
const { embedImages, imageEmbeddingModel } = require('../dist/services/image-embedding.service');

async function run() {
  const model = imageEmbeddingModel();
  const rows = await vectorDatabase().$queryRawUnsafe(
    'SELECT "productImageId", embedding::text AS vector FROM product_image_embeddings WHERE model=$1 LIMIT 40', model);
  const image = await prisma.productImage.findFirst({ where: {
    id: { in: rows.map((r) => r.productImageId) }, data: { not: null }, type: 'ROUPA', product: { active: true, isDraft: false },
  } });
  if (!image) throw new Error('Nenhuma foto indexada disponível para verificação.');
  const mimeType = image.mimeType || image.url;
  const values = await embedImages([{ data: Buffer.from(image.data), mimeType }]);
  const stored = JSON.parse(rows.find((r) => r.productImageId === image.id).vector);
  const cosine = values.reduce((n, v, i) => n + v * stored[i], 0) /
    Math.sqrt(values.reduce((n, v) => n + v * v, 0) * stored.reduce((n, v) => n + v * v, 0));
  const user = await prisma.user.findFirst({ where: { active: true }, select: { id: true, email: true, role: true } });
  if (!user || !process.env.JWT_SECRET) throw new Error('Autenticação do backend não disponível.');
  const token = require('jsonwebtoken').sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '2m' });
  const form = new FormData();
  const uploadMime = image.mimeType || (/\.webp$/.test(image.url) ? 'image/webp' : /\.png$/.test(image.url) ? 'image/png' : 'image/jpeg');
  form.append('images', new Blob([Buffer.from(image.data)], { type: uploadMime }), 'photo.' + uploadMime.split('/')[1]);
  const response = await fetch('http://127.0.0.1:' + (process.env.PORT || 8080) + '/api/mobile-stock/restock/search', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form, signal: AbortSignal.timeout(45000),
  });
  const body = await response.json();
  const result = { timestamp: new Date().toISOString(), provider: process.env.IMAGE_EMBEDDING_PROVIDER, model,
    gatewayConfigured: !!process.env.IMAGE_EMBEDDING_GATEWAY_URL, dimensions: values.length, storedVectorCosine: cosine,
    restockHttpStatus: response.status, matches: body.matches?.length,
    sourceProductFound: body.matches?.some((m) => m.product.id === image.productId) || false, stockModified: false };
  console.log(JSON.stringify(result));
  if (response.status !== 200 || !result.sourceProductFound || cosine < 0.99) process.exitCode = 1;
}
run().catch((error) => {
  let message = String(error.message);
  for (const key of ['IMAGE_EMBEDDING_API_KEY', 'IMAGE_EMBEDDING_GATEWAY_TOKEN', 'OPENROUTER_API_KEY', 'JWT_SECRET']) {
    if (process.env[key]) message = message.split(process.env[key]).join('[REDACTED]');
  }
  console.log(JSON.stringify({ error: message })); process.exitCode = 1;
}).finally(async () => { await prisma.$disconnect(); await vectorDatabase().$disconnect(); });
