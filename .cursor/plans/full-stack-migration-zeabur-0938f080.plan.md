<!-- 0938f080-55c9-42e3-be36-31f9fe7bbdf3 afb1b5ea-bac2-4f65-aff2-d8a94aacbd5f -->
# Plano: Migração para Full-Stack com Container Único

## Objetivo

Criar uma aplicação full-stack unificada em um único container Docker que serve o frontend React via Nginx e faz proxy reverso para o backend Express, otimizada para deploy no Zeabur.

## Arquitetura Escolhida

**Container único com Nginx + Supervisor:**

- Nginx serve arquivos estáticos do frontend (porta 80)
- Nginx faz proxy reverso para backend Express (porta interna 3001)
- Supervisor gerencia processos Nginx e Node.js
- Backend roda apenas como API (sem servir estáticos)
- CORS simplificado (mesmo domínio, sem configuração externa)

## Estrutura de Arquivos a Criar/Modificar

### Arquivos Novos na Raiz

1. **`Dockerfile`** (raiz do projeto)

   - Multi-stage build:
     - Stage 1: Build frontend (Vite)
     - Stage 2: Build backend (TypeScript)
     - Stage 3: Produção (Nginx + Node.js)
   - Base: `node:20-alpine`
   - Usa supervisor para gerenciar processos
   - Expõe porta 80

2. **`supervisord.conf`** (raiz do projeto)

   - Configuração do Supervisor
   - Gerencia nginx e backend Node.js
   - Logs configurados

3. **`nginx-fullstack.conf`** (raiz do projeto)

   - Configuração Nginx completa
   - Serve arquivos estáticos do frontend
   - Proxy reverso `/api/*` para backend
   - Suporte a SPA routing
   - Headers de segurança
   - Configuração de uploads

4. **`docker-entrypoint-fullstack.sh`** (raiz do projeto)

   - Script de inicialização
   - Aguarda banco de dados
   - Aplica migrations do Prisma
   - Inicia supervisor

5. **`.dockerignore`** (raiz do projeto)

   - Ignora node_modules, dist, arquivos desnecessários
   - Otimiza contexto de build

6. **`.env.fullstack.example`** (raiz do projeto)

   - Exemplo de variáveis de ambiente para full-stack
   - Documentação das variáveis necessárias

### Arquivos a Modificar

1. **`backend/src/index.ts`**

   - Ajustar CORS para aceitar `localhost` e requisições do mesmo domínio
   - Remover necessidade de CORS_ORIGINS complexo em full-stack
   - Adicionar suporte a servir em modo full-stack

2. **`frontend/src/services/api.ts`**

   - Garantir que usa URL relativa `/api` por padrão
   - Remover necessidade de configuração externa de API_URL

3. **`package.json`** (raiz)

   - Adicionar scripts para build full-stack
   - Script para desenvolvimento local full-stack

### Detalhamento das Implementações

#### 1. Dockerfile (Raiz)

```dockerfile
# Multi-stage build:
# - frontend-builder: Build do React/Vite
# - backend-builder: Build do TypeScript
# - production: Nginx + Node.js + Supervisor
```

**Características:**

- Usa `npm ci` para builds determinísticos
- Build do frontend com variáveis de ambiente no build-time
- Build do backend com TypeScript compilado
- Nginx configuração otimizada
- Supervisor para gerenciar processos
- Health check configurado

#### 2. Nginx Configuration

**Localização:** `nginx-fullstack.conf`

**Configurações:**

- Porta 80 como padrão
- Root: `/var/www/html` (build do frontend)
- Location `/`: Serve SPA com fallback para `index.html`
- Location `/api/`: Proxy reverso para `http://127.0.0.1:3001/`
- Location `/uploads/`: Serve arquivos do backend
- Headers de segurança (HSTS, X-Frame-Options, etc.)
- Gzip compression
- Cache para assets estáticos

#### 3. Supervisor Configuration

**Localização:** `supervisord.conf`

**Processos:**

1. **nginx**: Servidor web (prioridade 100)
2. **backend**: Node.js API (prioridade 200)

   - Comando: `node dist/index.js`
   - Auto-restart configurado
   - Logs rotacionados

#### 4. Backend Modificações

**`backend/src/index.ts`:**

- CORS ajustado para full-stack:
  ```typescript
  // Em modo full-stack, aceita requisições do mesmo domínio
  origin: process.env.FULLSTACK_MODE === 'true' 
    ? true  // Permite mesmo domínio
    : corsOptions.origin  // Configuração original
  ```

- Porta interna: 3001 (não exposta externamente)
- Bind apenas em `127.0.0.1` quando em modo full-stack

#### 5. Frontend Modificações

**`frontend/src/services/api.ts`:**

- URL base padrão: `/api` (relativo)
- Suporte a variáveis de ambiente para override
- Não requer configuração de CORS externa

### Variáveis de Ambiente

**Obrigatórias:**

- `DATABASE_URL`: String de conexão PostgreSQL
- `JWT_SECRET`: Chave secreta JWT

**Opcionais (com defaults):**

- `NODE_ENV`: `production`
- `PORT`: `3001` (porta interna backend)
- `NGINX_PORT`: `80`
- `FULLSTACK_MODE`: `true`

### Fluxo de Build e Deploy

1. **Build Stage:**

   - Copia `frontend/package*.json` → instala deps → build Vite
   - Copia `backend/package*.json` → instala deps → build TypeScript
   - Copia Prisma schema → gera cliente

2. **Production Stage:**

   - Copia build frontend para `/var/www/html`
   - Copia build backend + node_modules
   - Instala Nginx e Supervisor
   - Configura scripts de inicialização

3. **Runtime:**

   - Entrypoint aguarda banco
   - Aplica migrations Prisma
   - Inicia Supervisor (Nginx + Backend)

## Checklist de Implementação

- [ ] Criar Dockerfile na raiz
- [ ] Criar nginx-fullstack.conf
- [ ] Criar supervisord.conf
- [ ] Criar docker-entrypoint-fullstack.sh
- [ ] Criar .dockerignore na raiz
- [ ] Criar .env.fullstack.example
- [ ] Ajustar backend/src/index.ts (CORS full-stack)
- [ ] Verificar frontend/src/services/api.ts (URL relativa)
- [ ] Atualizar package.json (scripts full-stack)
- [ ] Criar README-FULLSTACK.md com documentação
- [ ] Testar build localmente
- [ ] Verificar health checks
- [ ] Documentar variáveis de ambiente

## Benefícios da Arquitetura

1. **Segurança:**

   - Nginx como camada de proteção
   - CORS simplificado (mesmo domínio)
   - Headers de segurança configurados
   - Backend não exposto externamente

2. **Performance:**

   - Nginx otimizado para servir estáticos
   - Gzip compression
   - Cache de assets
   - Proxy reverso eficiente

3. **Simplicidade:**

   - Container único
   - Deploy simplificado
   - Variáveis de ambiente reduzidas
   - Menos configuração de rede

4. **Compatibilidade Zeabur:**

   - Porta única (80)
   - Health check configurado
   - Build otimizado
   - Logs estruturados

### To-dos

- [ ] Atualizar Dockerfile do frontend com correções do frontend-limpo (logs detalhados e caminho completo do vite)
- [ ] Atualizar package.json do frontend com script de build usando caminho completo do vite
- [ ] Verificar e atualizar correções TypeScript nos arquivos de páginas (Categories, Patterns, Sizes, Subcategories)
- [ ] Verificar atualizações do backend e mesclar se necessário
- [ ] Fazer commit e push das atualizações para snapshot-sistema-atual
- [ ] Criar Dockerfile na raiz do projeto com multi-stage build (frontend + backend + produção)
- [ ] Criar nginx-fullstack.conf com configuração completa de proxy reverso e servidor estático
- [ ] Criar supervisord.conf para gerenciar processos Nginx e Node.js
- [ ] Criar docker-entrypoint-fullstack.sh para inicialização com Prisma migrations
- [ ] Criar .dockerignore na raiz para otimizar contexto de build
- [ ] Criar .env.fullstack.example com documentação de variáveis de ambiente
- [ ] Ajustar backend/src/index.ts para suportar modo full-stack (CORS simplificado)
- [ ] Verificar e ajustar frontend/src/services/api.ts para usar URL relativa /api
- [ ] Atualizar package.json da raiz com scripts para build e desenvolvimento full-stack
- [ ] Criar README-FULLSTACK.md com documentação completa da arquitetura e deploy