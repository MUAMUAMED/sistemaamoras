# ============================================
# Full-Stack Dockerfile para Zeabur
# Container único com Nginx + Backend Express
# ============================================

# Stage 1: Build Frontend (React + Vite)
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copiar package files do frontend
COPY frontend/package*.json ./

# Instalar dependências do frontend (incluindo devDependencies para build)
# IMPORTANTE: Não permitir que NODE_ENV=production bloqueie devDependencies
RUN unset NODE_ENV && \
    npm ci --legacy-peer-deps && \
    npm cache clean --force && \
    echo "✅ Dependências do frontend instaladas (incluindo dev)"

# Verificar instalação do vite
RUN echo "🔍 Verificando instalação do vite..." && \
    (test -d node_modules/vite && echo "✅ vite instalado" || echo "❌ vite NÃO instalado") && \
    (test -f node_modules/vite/bin/vite.js && echo "✅ vite.js encontrado" || echo "❌ vite.js NÃO encontrado") && \
    ls -la node_modules/.bin/ | grep vite || echo "⚠️ Verificando .bin"

# Copiar código fonte do frontend
COPY frontend/ ./

# Re-verificar após COPY
RUN echo "🔍 Verificando após COPY..." && \
    (test -d node_modules/vite && echo "✅ vite ainda existe" || echo "❌ vite foi removido!") && \
    (test -f node_modules/vite/bin/vite.js && echo "✅ vite.js ainda existe" || echo "❌ vite.js foi removido!")

# Build Arguments para variáveis de ambiente no build-time
# IMPORTANTE: NODE_ENV só é usado DURANTE o build do Vite, NÃO durante npm ci
ARG REACT_APP_API_URL=/api
ARG VITE_API_URL=/api
ARG NODE_ENV_BUILD=production

# Configurar variáveis de ambiente para build (Vite precisa no build time)
# Mas só APÓS as dependências já estarem instaladas
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV VITE_API_URL=${VITE_API_URL}
ENV NODE_ENV=${NODE_ENV_BUILD}
ENV GENERATE_SOURCEMAP=false
ENV INLINE_RUNTIME_CHUNK=false

# Adicionar node_modules/.bin ao PATH para encontrar vite
ENV PATH="/app/frontend/node_modules/.bin:${PATH}"

# Build da aplicação frontend com Vite
RUN echo "🔨 Iniciando build..." && \
    echo "📦 PATH: $PATH" && \
    echo "📦 Verificando vite:" && \
    (which vite && echo "✅ vite encontrado no PATH" || echo "⚠️ vite não no PATH, usando npx") && \
    (npx vite --version && echo "✅ npx vite funciona" || echo "❌ npx vite falhou") && \
    npm run build && \
    echo "✅ Build concluído!" && \
    (test -d dist && echo "✅ Pasta dist/ criada" || echo "❌ Pasta dist/ NÃO criada")

# Stage 2: Build Backend (Node.js + TypeScript)
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Instalar dependências do sistema para build
RUN apk add --no-cache \
    openssl \
    libc6-compat \
    curl \
    git

# Copiar package files do backend
COPY backend/package*.json ./

# Instalar TODAS as dependências (incluindo devDependencies para build)
# CRÍTICO: Remover qualquer NODE_ENV=production que possa vir do ambiente do Zeabur
# Isso garante que devDependencies (TypeScript) sejam instaladas
RUN unset NODE_ENV && \
    echo "🔍 NODE_ENV atual: ${NODE_ENV:-não definido}" && \
    npm ci --legacy-peer-deps && \
    npm cache clean --force && \
    echo "✅ Dependências do backend instaladas" && \
    echo "📦 Verificando TypeScript..." && \
    (test -d node_modules/typescript && echo "✅ TypeScript encontrado" || (echo "❌ TypeScript não encontrado, instalando..." && npm install typescript@^5.9.2 --save-dev --legacy-peer-deps)) && \
    (test -f node_modules/.bin/tsc && echo "✅ tsc disponível" || (echo "❌ tsc não encontrado, instalando TypeScript..." && npm install typescript@^5.9.2 --save-dev --legacy-peer-deps)) && \
    echo "📦 Versão do TypeScript:" && \
    npm list typescript 2>&1 | head -2

# Verificar instalação do TypeScript
RUN echo "🔍 Verificando TypeScript..." && \
    (test -d node_modules/typescript && echo "✅ typescript instalado" || echo "❌ typescript NÃO instalado") && \
    (test -f node_modules/.bin/tsc && echo "✅ tsc encontrado" || echo "❌ tsc NÃO encontrado") && \
    (npx tsc --version && echo "✅ npx tsc funciona" || echo "❌ npx tsc falhou")

# Adicionar node_modules/.bin ao PATH
ENV PATH="/app/backend/node_modules/.bin:${PATH}"

# Copiar schema Prisma
COPY backend/prisma ./prisma/

# Gerar Prisma Client (necessário antes do build)
RUN npx prisma generate

# Copiar código fonte do backend
# IMPORTANTE: Copiar apenas arquivos necessários, NÃO node_modules
COPY backend/src ./src/
COPY backend/tsconfig.json ./
COPY backend/scripts ./scripts/

# NÃO copiar backend/node_modules aqui - já foi instalado acima

# Verificar novamente após COPY
RUN echo "🔍 Verificando TypeScript após COPY..." && \
    (test -d node_modules/typescript && echo "✅ typescript ainda instalado" || echo "❌ typescript foi removido!") && \
    (which tsc && echo "✅ tsc no PATH" || echo "⚠️ tsc não no PATH") && \
    (npx tsc --version && echo "✅ npx tsc ainda funciona" || echo "❌ npx tsc não funciona mais")

# Compilar TypeScript - garantir que TypeScript está instalado e usar npx diretamente
RUN echo "🔨 Verificando TypeScript antes da compilação..." && \
    echo "📦 Listando node_modules/typescript..." && \
    ls -la node_modules/ | grep typescript || echo "⚠️ typescript não encontrado em node_modules" && \
    echo "📦 Verificando node_modules/.bin/tsc..." && \
    ls -la node_modules/.bin/ | grep tsc || echo "⚠️ tsc não encontrado em .bin" && \
    echo "📦 Verificando se TypeScript está instalado..." && \
    npm list typescript 2>&1 | head -5 || echo "⚠️ npm list typescript falhou" && \
    echo "🔨 Compilando TypeScript usando npx..." && \
    npx tsc --version && \
    npx tsc && \
    echo "✅ TypeScript compilado com sucesso!"

# Verificar se o build foi bem-sucedido
RUN test -d dist && test -f dist/index.js || (echo "Build failed!" && exit 1)

# Stage 3: Production (Nginx + Node.js + Supervisor)
FROM node:20-alpine AS production

# Instalar dependências do sistema
RUN apk add --no-cache \
    nginx \
    supervisor \
    curl \
    openssl \
    postgresql-client \
    dumb-init

# Criar diretórios necessários
RUN mkdir -p \
    /app \
    /var/www/html \
    /var/log/supervisor \
    /run/nginx \
    /etc/supervisor/conf.d \
    /app/backend/uploads/products \
    /app/backend/uploads/temp \
    /app/backend/logs

WORKDIR /app

# Copiar build do frontend (Vite usa 'dist')
COPY --from=frontend-builder /app/frontend/dist /var/www/html

# Copiar build do backend
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY --from=backend-builder /app/backend/prisma ./backend/prisma

# Copiar apenas os scripts JavaScript necessários (não TypeScript)
# wait-for-db.js é necessário e já está como .js
COPY backend/scripts/wait-for-db.js ./backend/scripts/wait-for-db.js

# Instalar APENAS dependências de produção do backend
WORKDIR /app/backend
RUN npm ci --only=production --legacy-peer-deps && \
    npm cache clean --force

# Gerar Prisma Client para produção
RUN npx prisma generate

# Voltar para raiz
WORKDIR /app

# Copiar configurações
COPY nginx-fullstack.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker-entrypoint-fullstack.sh /app/docker-entrypoint-fullstack.sh

# Tornar scripts executáveis
RUN chmod +x /app/docker-entrypoint-fullstack.sh

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app /var/www/html /var/log/supervisor /run/nginx && \
    chown -R nodejs:nodejs /app/backend/uploads /app/backend/logs

# Build arguments para runtime
ARG DATABASE_URL
ARG JWT_SECRET
ARG FULLSTACK_MODE=true

# Variáveis de ambiente
ENV DATABASE_URL=${DATABASE_URL}
ENV JWT_SECRET=${JWT_SECRET}
ENV FULLSTACK_MODE=${FULLSTACK_MODE}
ENV NODE_ENV=production
ENV PORT=3001
ENV NGINX_PORT=80

# Expor porta 80 (Nginx)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Usar dumb-init para gerenciamento adequado de processos
ENTRYPOINT ["dumb-init", "--"]

# Script de inicialização
CMD ["/app/docker-entrypoint-fullstack.sh"]

