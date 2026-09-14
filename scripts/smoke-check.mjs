const baseUrl = (process.env.SMOKE_BASE_URL || 'https://amorasbackenddd.zeabur.app').replace(/\/$/, '');

async function expectStatus(path, expected) {
  const response = await fetch(`${baseUrl}${path}`, { method: path.includes('/production/draft') ? 'POST' : 'GET' });
  if (response.status !== expected) throw new Error(`${path}: esperado ${expected}, recebido ${response.status}`);
  return response;
}

await expectStatus('/health', 200);
const catalogResponse = await expectStatus('/api/commercial/catalog', 200);
const catalog = await catalogResponse.json();
if (!Array.isArray(catalog.products)) throw new Error('Catálogo público sem lista de produtos.');
await expectStatus('/api/production/draft', 401);

console.log(`Smoke check concluído: ${catalog.products.length} produto(s) no catálogo.`);
