const http = require('node:http');
const { createHash, timingSafeEqual } = require('node:crypto');

// Relay privado no servidor Oracle do usuário, na mesma região Brasil.
// Encaminha somente embeddings de imagem para o endpoint oficial da Google.
const PATH = '/v1beta/models/gemini-embedding-2:embedContent';
const MAX_BODY = 20 * 1024 * 1024;
const digest = (value) => createHash('sha256').update(value).digest();

function createGateway({ apiKey, accessToken, transport = fetch }) {
  if (!apiKey || !accessToken || accessToken.length < 32) throw new Error('Configure as credenciais do gateway no ambiente.');
  let active = 0;
  const send = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
  const handle = async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') return send(res, 200, { status: 'ok', service: 'amoras-image-embedding-gateway' });
    if (req.method !== 'POST' || req.url !== PATH) return send(res, 404, { error: 'Rota não encontrada.' });
    const received = typeof req.headers.authorization === 'string' ? req.headers.authorization.replace(/^Bearer /, '') : '';
    if (!timingSafeEqual(digest(received), digest(accessToken))) return send(res, 401, { error: 'Acesso não autorizado.' });
    if (active >= 2) return send(res, 429, { error: 'Gateway ocupado. Aguarde e tente novamente.' });
    if (Number(req.headers['content-length']) > MAX_BODY) return send(res, 413, { error: 'Imagens excedem o limite do gateway.' });
    active++;
    try {
      const chunks = []; let length = 0;
      for await (const chunk of req) {
        length += chunk.length;
        if (length > MAX_BODY) return send(res, 413, { error: 'Imagens excedem o limite do gateway.' });
        chunks.push(chunk);
      }
      let payload;
      try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { return send(res, 400, { error: 'JSON inválido.' }); }
      const parts = payload.content?.parts;
      if (payload.outputDimensionality !== 768 || !Array.isArray(parts) || parts.length < 1 || parts.length > 6 ||
        parts.some((p) => !['image/jpeg', 'image/png'].includes(p.inlineData?.mimeType) || typeof p.inlineData?.data !== 'string' || !p.inlineData.data)) {
        return send(res, 400, { error: 'Envie de uma a seis imagens JPEG/PNG e solicite 768 dimensões.' });
      }
      const response = await transport(`https://generativelanguage.googleapis.com${PATH}`, {
        method: 'POST', headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { parts }, outputDimensionality: 768 }), signal: AbortSignal.timeout(30000),
      });
      const raw = (await response.text()).split(apiKey).join('[REDACTED]').split(accessToken).join('[REDACTED]');
      res.writeHead(response.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(raw);
    } catch {
      if (!res.headersSent) send(res, 502, { error: 'Não foi possível consultar a Google. Tente novamente.' });
    } finally { active--; }
  };
  const server = http.createServer((req, res) => { handle(req, res).catch(() => { if (!res.headersSent) send(res, 500, { error: 'Erro do gateway.' }); }); });
  server.requestTimeout = 45000;
  server.headersTimeout = 15000;
  return server;
}

if (require.main === module) {
  const server = createGateway({ apiKey: process.env.IMAGE_EMBEDDING_API_KEY, accessToken: process.env.EMBEDDING_GATEWAY_ACCESS_TOKEN });
  server.listen(Number(process.env.PORT || 8080), '0.0.0.0', () => console.log('Gateway de embeddings pronto.'));
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
}
module.exports = { createGateway };
