# Full-Stack Migration - Zeabur

## Visão Geral

Esta é a versão full-stack do sistema Amoras Capital, onde frontend e backend são servidos em um único container Docker através de Nginx como proxy reverso. Esta arquitetura é otimizada para deploy no Zeabur e outras plataformas de container.

## Arquitetura

```
┌─────────────────────────────────────────┐
│         Container Docker                │
│                                         │
│  ┌─────────────┐      ┌──────────────┐ │
│  │    Nginx    │──────│   Backend    │ │
│  │  (Port 80)  │Proxy │  (Port 3001) │ │
│  └─────────────┘      └──────────────┘ │
│       │                                  │
│       │ Serve                            │
│       ▼                                  │
│  ┌─────────────┐                        │
│  │  Frontend   │                        │
│  │  (Static)   │                        │
│  └─────────────┘                        │
│                                         │
│  Supervisor gerencia Nginx + Backend    │
└─────────────────────────────────────────┘
```

### Componentes

- **Nginx**: Serve arquivos estáticos do frontend e faz proxy reverso para o backend
- **Backend Express**: API Node.js rodando na porta interna 3001
- **Supervisor**: Gerencia os processos Nginx e Backend
- **PostgreSQL**: Banco de dados externo (fora do container)

## Estrutura de Arquivos

```
.
├── Dockerfile                    # Dockerfile principal (multi-stage build)
├── nginx-fullstack.conf          # Configuração do Nginx
├── supervisord.conf              # Configuração do Supervisor
├── docker-entrypoint-fullstack.sh # Script de inicialização
├── .dockerignore                 # Arquivos ignorados no build
├── env.fullstack.example         # Exemplo de variáveis de ambiente
├── backend/                      # Código do backend
├── frontend/                     # Código do frontend
└── README-FULLSTACK.md           # Esta documentação
```

## Variáveis de Ambiente

### Obrigatórias

- `DATABASE_URL`: String de conexão PostgreSQL
  ```
  DATABASE_URL="postgresql://user:password@host:5432/database"
  ```

- `JWT_SECRET`: Chave secreta JWT (mínimo 32 caracteres)
  ```
  JWT_SECRET="sua_chave_secreta_min_32_caracteres_aqui"
  ```

### Opcionais

- `NODE_ENV`: Ambiente de execução (padrão: `production`)
- `PORT`: Porta interna do backend (padrão: `3001`)
- `FULLSTACK_MODE`: Ativa modo full-stack (padrão: `true`)
- `APP_URL`: URL da aplicação (para logs e referências)
- `LOG_LEVEL`: Nível de log (padrão: `info`)

Ver arquivo `env.fullstack.example` para lista completa.

## Build e Deploy

### Build Local

```bash
# Build da imagem
docker build \
  --build-arg REACT_APP_API_URL=/api \
  --build-arg VITE_API_URL=/api \
  -t amoras-capital-fullstack:latest .
```

Ou use o script:

```bash
npm run build:fullstack:prod
```

### Deploy no Zeabur

1. **Conectar repositório**: Conecte seu repositório Git no Zeabur

2. **Configurar variáveis de ambiente**:
   - `DATABASE_URL`: String de conexão do banco PostgreSQL
   - `JWT_SECRET`: Chave secreta JWT
   - Outras variáveis opcionais conforme necessário

3. **Configurar Dockerfile**: O Zeabur deve usar o `Dockerfile` na raiz

4. **Porta**: O container expõe a porta `80` (Nginx)

5. **Health Check**: O endpoint `/health` está disponível para health checks

### Variáveis de Ambiente no Zeabur

No painel do Zeabur, configure:

```
DATABASE_URL=postgresql://...
JWT_SECRET=sua_chave_secreta_min_32_chars
FULLSTACK_MODE=true
NODE_ENV=production
PORT=3001
```

## Como Funciona

### Build Process

1. **Stage 1 - Frontend Builder**:
   - Instala dependências do frontend
   - Executa build do Vite
   - Gera arquivos estáticos em `dist/`

2. **Stage 2 - Backend Builder**:
   - Instala dependências do backend
   - Gera Prisma Client
   - Compila TypeScript para JavaScript
   - Gera arquivos em `dist/`

3. **Stage 3 - Production**:
   - Copia build do frontend para `/var/www/html`
   - Copia build do backend e dependências
   - Instala Nginx e Supervisor
   - Configura scripts de inicialização

### Runtime Process

1. **Entrypoint Script** (`docker-entrypoint-fullstack.sh`):
   - Aguarda banco de dados estar pronto
   - Aplica schema do Prisma
   - Gera Prisma Client
   - Inicia Supervisor

2. **Supervisor**:
   - Inicia Nginx (porta 80)
   - Inicia Backend Node.js (porta interna 3001)
   - Gerencia restart automático dos processos

3. **Nginx**:
   - Serve arquivos estáticos do frontend em `/`
   - Faz proxy reverso `/api/*` para `http://127.0.0.1:3001/`
   - Serve arquivos de upload em `/uploads/`

## Rotas e Endpoints

### Frontend

- `/`: Aplicação React (SPA)
- `/*`: Qualquer rota React (com fallback para `index.html`)

### Backend API

- `/api/*`: Todas as rotas da API
- `/api/health`: Health check do backend
- `/api/auth/*`: Autenticação
- `/api/products/*`: Produtos
- `/api/leads/*`: Leads
- `/api/sales/*`: Vendas
- `/api-docs`: Documentação Swagger

### Arquivos

- `/uploads/*`: Arquivos de upload (produtos, etc.)

## Segurança

### CORS

Em modo full-stack, o CORS é simplificado:
- Backend aceita requisições do mesmo domínio (via Nginx)
- Nginx já filtra requisições antes de chegar ao backend
- Não é necessário configurar `CORS_ORIGINS` em modo full-stack

### Headers de Segurança

Nginx está configurado com headers de segurança:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: no-referrer-when-downgrade`

### Backend Não Exposto

O backend roda apenas em `127.0.0.1:3001`, não exposto externamente. Todas as requisições passam pelo Nginx.

## Performance

### Otimizações

- **Gzip Compression**: Habilitado para textos, JSON, CSS, JS
- **Cache de Assets**: Assets estáticos com cache de 1 ano
- **Cache de Uploads**: Arquivos de upload com cache de 7 dias
- **Nginx**: Servidor web otimizado para servir estáticos

### Limites

- **Upload Size**: 10MB por padrão (configurável)
- **Rate Limiting**: 500 requisições por 15 minutos (configurável)
- **Timeouts**: 60s para conexões do backend

## Desenvolvimento Local

### Modo Standalone (Desenvolvimento)

Para desenvolvimento, continue usando os comandos normais:

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm start
```

### Testar Build Full-Stack Localmente

```bash
# Build
docker build -t amoras-fullstack .

# Run (necessita banco PostgreSQL)
docker run -p 8080:80 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e JWT_SECRET="sua_chave_secreta_min_32_chars" \
  amoras-fullstack
```

Acesse: `http://localhost:8080`

## Troubleshooting

### Backend não inicia

1. Verifique logs do supervisor:
   ```bash
   docker exec <container> cat /var/log/supervisor/backend.err.log
   ```

2. Verifique conexão com banco:
   - `DATABASE_URL` está correto?
   - Banco está acessível?

### Frontend não carrega

1. Verifique se o build foi bem-sucedido:
   ```bash
   docker exec <container> ls -la /var/www/html
   ```

2. Verifique logs do Nginx:
   ```bash
   docker exec <container> cat /var/log/nginx/error.log
   ```

### Health Check falha

O health check usa `/health` que faz proxy para o backend. Verifique:
- Backend está rodando?
- Nginx está configurado corretamente?

## Comparação: Full-Stack vs Separado

### Full-Stack (Este Dockerfile)

**Vantagens:**
- ✅ Container único (deploy simples)
- ✅ CORS simplificado
- ✅ Menos configuração de rede
- ✅ Ideal para Zeabur e plataformas similares

**Desvantagens:**
- ❌ Não escala backend e frontend separadamente
- ❌ Rebuild completo para mudanças em qualquer parte

### Separado (Dockerfiles individuais)

**Vantagens:**
- ✅ Escalabilidade independente
- ✅ Deploys independentes
- ✅ Rebuild apenas do que mudou

**Desvantagens:**
- ❌ Mais complexo de configurar
- ❌ CORS mais complexo
- ❌ Mais variáveis de ambiente

## Migração de Standalone para Full-Stack

### O que muda:

1. **Backend**:
   - CORS aceita mesmo domínio (via `FULLSTACK_MODE=true`)
   - Bind apenas em `127.0.0.1` (não exposto externamente)

2. **Frontend**:
   - URL da API: `/api` (relativa)
   - Não precisa configurar `REACT_APP_API_URL` ou `VITE_API_URL` no build

3. **Variáveis de Ambiente**:
   - `FULLSTACK_MODE=true` deve estar definido
   - `CORS_ORIGINS` não é necessário em modo full-stack

## Suporte

Para questões ou problemas, consulte:
- [Backend README](../backend/README.md)
- [Frontend README](../frontend/README.md)
- [Documentação do Zeabur](https://zeabur.com/docs)

