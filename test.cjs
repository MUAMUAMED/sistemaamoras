const assert = require('node:assert/strict');
const { createGateway } = require('./server.cjs');
const token = 'test-gateway-token-with-at-least-32-characters';
const apiKey = 'test-google-api-key';
let calls = 0;
let upstreamStatus = 200;
const server = createGateway({ apiKey, accessToken: token, transport: async (url, init) => {
  calls++; assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent');
  assert.equal(init.headers['x-goog-api-key'], apiKey); assert.equal(init.headers.Authorization, undefined);
  const body = JSON.parse(init.body); assert.equal(body.outputDimensionality, 768); assert.equal(body.content.parts.length, 1);
  return new Response(JSON.stringify(upstreamStatus === 200 ? { embedding: { values: Array(768).fill(0.1) } } : { error: { message: `quota ${apiKey} ${token}` } }), { status: upstreamStatus });
} });
async function run() {
  server.listen(0, '127.0.0.1'); await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const path = '/v1beta/models/gemini-embedding-2:embedContent';
  const payload = { content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'cGhvdG8=' } }] }, outputDimensionality: 768 };
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  assert.equal((await fetch(base + '/health')).status, 200);
  assert.equal((await fetch(base + path, { method: 'POST', body: JSON.stringify(payload) })).status, 401); assert.equal(calls, 0);
  assert.equal((await fetch(base + '/v1/chat/completions', { method: 'POST', headers, body: '{}' })).status, 404);
  assert.equal((await fetch(base + path, { method: 'POST', headers, body: '{}' })).status, 400); assert.equal(calls, 0);
  const success = await fetch(base + path, { method: 'POST', headers, body: JSON.stringify(payload) });
  assert.equal(success.status, 200); assert.equal((await success.json()).embedding.values.length, 768); assert.equal(calls, 1);
  upstreamStatus = 429;
  const limit = await fetch(base + path, { method: 'POST', headers, body: JSON.stringify(payload) });
  assert.equal(limit.status, 429); const raw = await limit.text(); assert.ok(!raw.includes(apiKey) && !raw.includes(token)); assert.equal(calls, 2);
  console.log('Gateway: autenticação, rota restrita, payload, vetor e erros sem segredos aprovados.');
}
run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
