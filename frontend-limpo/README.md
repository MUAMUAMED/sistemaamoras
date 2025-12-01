# Frontend Amoras Capital - Versão Corrigida

## 🔧 Correções Aplicadas

### Problema Identificado
O Dockerfile anterior estava tentando copiar de `/app/frontend/build`, mas:
- O projeto usa **Vite**, que gera a pasta `dist/` (não `build/`)
- O projeto está na raiz, não em uma subpasta `frontend/`

### Soluções Implementadas

1. **Dockerfile Corrigido**
   - ✅ Copia corretamente de `/app/dist` (gerado pelo Vite)
   - ✅ Usa multi-stage build otimizado
   - ✅ Define `CI=false` para evitar falhas por warnings
   - ✅ Define `NODE_ENV=production` para build otimizado
   - ✅ Verifica se `dist/` foi criado antes de copiar

2. **Estrutura Otimizada**
   - ✅ Apenas arquivos necessários para o build
   - ✅ `.dockerignore` configurado para excluir arquivos desnecessários
   - ✅ Cache de dependências otimizado (package.json copiado primeiro)

3. **Variáveis de Ambiente**
   - ✅ Suporta `VITE_API_URL` e `REACT_APP_API_URL`
   - ✅ Configurado para build time (necessário para Vite)

## 🚀 Como Usar

### Build Local
```bash
docker build -t amoras-frontend \
  --build-arg VITE_API_URL=https://amorasbackend.zeabur.app/api \
  .
```

### Executar Localmente
```bash
docker run -p 8080:8080 amoras-frontend
```

### Deploy
O Dockerfile está pronto para deploy em plataformas como:
- Zeabur
- Railway
- Render
- Docker Hub

## 📦 Estrutura

```
frontend-limpo/
├── Dockerfile          # Dockerfile corrigido e otimizado
├── .dockerignore       # Arquivos ignorados no build
├── package.json        # Dependências do projeto
├── vite.config.ts      # Configuração do Vite
├── tsconfig.json       # Configuração TypeScript
├── tailwind.config.js  # Configuração Tailwind
├── postcss.config.js   # Configuração PostCSS
├── index.html          # HTML principal
├── public/             # Arquivos estáticos públicos
└── src/                # Código fonte da aplicação
```

## ⚠️ Notas Importantes

- O Vite gera a pasta `dist/` por padrão (não `build/`)
- As variáveis de ambiente devem ser passadas no build time (ARG/ENV)
- O servidor serve os arquivos na porta 8080
- O build usa `npm ci` para instalação determinística

