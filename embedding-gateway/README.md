# Gateway privado de embeddings

Executa no servidor Oracle São Paulo já utilizado pelo usuário. O backend Amoras permanece em seu servidor atual; somente as fotos necessárias para embeddings passam por este gateway HTTPS autenticado antes de chegar à API oficial Google. Essa saída resolveu o erro de localização retornado ao IP do backend Tencent.

Não altera o modelo, o espaço vetorial ou a cota do projeto Google. Não usa contas OAuth da CLIProxyAPI. Não encaminha outras APIs, não grava imagens e não registra credenciais.

Variáveis do gateway: `IMAGE_EMBEDDING_API_KEY` (Google), `EMBEDDING_GATEWAY_ACCESS_TOKEN` (token aleatório de no mínimo 32 caracteres), `PORT` (8080).

Variáveis do backend: `IMAGE_EMBEDDING_PROVIDER=google`, `IMAGE_EMBEDDING_MODEL=google/gemini-embedding-2`, `IMAGE_EMBEDDING_GATEWAY_URL` (URL HTTPS), `IMAGE_EMBEDDING_GATEWAY_TOKEN` (mesmo token privado). Todas as credenciais são configuradas no ambiente Zeabur.

Rota: `POST /v1beta/models/gemini-embedding-2:embedContent` com `Authorization: Bearer ...`. Aceita uma a seis imagens JPEG/PNG, 768 dimensões, até 20 MB e duas chamadas simultâneas. O backend converte WebP para PNG. `GET /health` não exige autenticação. Erros de cota retornam 429; não há fallback pago.

Validação local: `node test.cjs`. Publicação independente no branch `codex/google-embedding-gateway`; serviço `amoras-embedding-gateway` no projeto Oracle existente.
