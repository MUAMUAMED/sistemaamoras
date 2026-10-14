const assert = require('node:assert/strict');
const { embedImages, hasImageEmbeddingCredentials, imageEmbeddingModel } = require('../dist/services/image-embedding.service');
const nativeFetch = global.fetch;
const inputs = [{ data: Buffer.from('photo-one'), mimeType: 'image/jpeg' }, { data: Buffer.from('photo-two'), mimeType: 'image/png' }];
let calls = 0;
let passed = 0;
const pass = (name) => { passed++; console.log(`OK ${passed}: ${name}`); };

async function run() {
  process.env.IMAGE_EMBEDDING_PROVIDER = 'google';
  process.env.IMAGE_EMBEDDING_MODEL = 'gemini-embedding-2';
  process.env.IMAGE_EMBEDDING_API_KEY = 'test-google-secret';
  process.env.OPENROUTER_API_KEY = 'test-openrouter-secret';
  delete process.env.GEMINI_API_KEY;
  assert.equal(imageEmbeddingModel(), 'google/gemini-embedding-2');
  assert.equal(hasImageEmbeddingCredentials(), true);
  global.fetch = async (url, options) => {
    calls++;
    assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent');
    assert.equal(options.headers['x-goog-api-key'], 'test-google-secret');
    assert.equal(options.headers.Authorization, undefined);
    const payload = JSON.parse(options.body);
    assert.equal(payload.outputDimensionality, 768);
    assert.equal(payload.content.parts.length, 2);
    assert.deepEqual(payload.content.parts.map((p) => p.inlineData.mimeType), ['image/jpeg', 'image/png']);
    assert.equal(Buffer.from(payload.content.parts[0].inlineData.data, 'base64').toString(), 'photo-one');
    return new Response(JSON.stringify({ embedding: { values: Array(768).fill(0.1) } }), { status: 200 });
  };
  assert.equal((await embedImages(inputs)).length, 768);
  assert.equal(calls, 1);
  pass('Google aceita duas fotos em uma chamada, usa chave dedicada e preserva identidade/dimensão');

  global.fetch = async () => { calls++; return new Response(JSON.stringify({ error: { message: 'quota exceeded' } }), { status: 429 }); };
  const beforeQuota = calls;
  await assert.rejects(embedImages(inputs), (error) => error.statusCode === 429 && /cota.*atingida/.test(error.message));
  assert.equal(calls - beforeQuota, 1);
  pass('cota esgotada é informada sem cobrança automática em outro provedor');

  delete process.env.IMAGE_EMBEDDING_API_KEY;
  assert.equal(hasImageEmbeddingCredentials(), false);
  const beforeMissing = calls;
  await assert.rejects(embedImages(inputs), /IMAGE_EMBEDDING_API_KEY/);
  assert.equal(calls, beforeMissing);
  pass('Google sem chave não usa a chave OpenRouter disponível');

  process.env.IMAGE_EMBEDDING_API_KEY = 'test-google-secret';
  global.fetch = async () => new Response(JSON.stringify({ error: { message: 'bad key test-google-secret' } }), { status: 403 });
  await assert.rejects(embedImages(inputs), (error) => error.message.includes('[REDACTED]') && !error.message.includes('test-google-secret'));
  pass('mensagens de erro não expõem a chave');

  global.fetch = async () => new Response(JSON.stringify({ embedding: { values: Array(3072).fill(0.1) } }), { status: 200 });
  await assert.rejects(embedImages(inputs), /vetor inválido/);
  global.fetch = async () => new Response(JSON.stringify({ embedding: { values: Array(768).fill(null) } }), { status: 200 });
  await assert.rejects(embedImages(inputs), /vetor inválido/);
  pass('vetores com dimensão errada ou valores nulos são recusados');

  await assert.rejects(embedImages([]), /entre uma e seis/);
  await assert.rejects(embedImages(Array(7).fill(inputs[0])), /entre uma e seis/);
  pass('limite de fotos é validado antes do envio');

  process.env.IMAGE_EMBEDDING_PROVIDER = 'openrouter';
  process.env.IMAGE_EMBEDDING_MODEL = 'google/gemini-embedding-2';
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://openrouter.ai/api/v1/embeddings');
    assert.equal(options.headers.Authorization, 'Bearer test-openrouter-secret');
    const payload = JSON.parse(options.body);
    assert.equal(payload.dimensions, 768);
    assert.equal(payload.input[0].content[0].type, 'image_url');
    return new Response(JSON.stringify({ data: [{ embedding: Array(768).fill(0.1) }] }), { status: 200 });
  };
  assert.equal((await embedImages(inputs)).length, 768);
  pass('configuração explícita anterior continua compatível com OpenRouter');
  console.log(`${passed} cenários de embeddings aprovados, sem chamadas externas.`);
}
run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => { global.fetch = nativeFetch; });
