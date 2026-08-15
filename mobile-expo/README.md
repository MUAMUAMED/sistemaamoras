# Amoras Produção (Android)

Aplicativo Expo focado exclusivamente no cadastro de roupas: login, até duas fotos, rascunho por IA, revisão humana e publicação no banco do ERP.

## Executar no Android

1. No terminal, entre em `mobile-expo` e execute `npm install`.
2. Copie `.env.example` para `.env` e informe a URL pública do serviço full-stack da Zeabur, sempre terminando em `/api`, por exemplo `https://amoras-backend-xxxxx.zeabur.app/api`.
3. Execute `npm run android` ou `npm start` e leia o QR Code com o Expo Go.

Para gerar um APK de teste instalável, autentique-se na conta Expo e execute `npx eas build --profile preview --platform android`.

## Backend necessário

O backend Zeabur precisa estar com a rota `/api/production` publicada e possuir `OPENROUTER_API_KEY` configurada. Opcionalmente defina `OPENROUTER_MODEL` (o padrão é `google/gemini-2.5-flash`). A chave nunca é enviada ao aplicativo. Defina também `PRODUCTION_DRAFT_SECRET` com um valor longo e exclusivo em produção.

Ao publicar, o servidor cria somente os registros que ainda não existem. Códigos de categoria, subcategoria e estampa são alocados no servidor e verificados contra colisões; as fotos temporárias do rascunho expiram após 30 minutos.
