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
RUN npm ci --legacy-peer-deps && \
    npm cache clean --force

# Copiar código fonte do frontend
COPY frontend/ ./

# Build Arguments para variáveis de ambiente no build-time
ARG REACT_APP_API_URL=/api
ARG VITE_API_URL=/api
ARG NODE_ENV=production

# Configurar variáveis de ambiente para build (Vite precisa no build time)
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV VITE_API_URL=${VITE_API_URL}
ENV NODE_ENV=${NODE_ENV}
ENV GENERATE_SOURCEMAP=false
ENV INLINE_RUNTIME_CHUNK=false

# Build da aplicação frontend com Vite
RUN npm run build

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
RUN npm ci --legacy-peer-deps && \
    npm cache clean --force

# Copiar schema Prisma
COPY backend/prisma ./prisma/

# Gerar Prisma Client (necessário antes do build)
RUN npx prisma generate

# Copiar código fonte do backend
COPY backend/ ./

# Compilar TypeScript
RUN npm run build

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

# Copiar scripts do backend
COPY backend/scripts ./backend/scripts
COPY backend/docker-entrypoint.sh ./backend/docker-entrypoint.sh

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
RUN chmod +x /app/docker-entrypoint-fullstack.sh && \
    chmod +x /app/backend/docker-entrypoint.sh

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

