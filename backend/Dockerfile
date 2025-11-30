# Backend Dockerfile - Único arquivo otimizado para produção
# Compatível com docker-compose e deploy em VPS/EasyPanel

# ============================================
# Stage 1: Build (compilação TypeScript)
# ============================================
FROM node:20-alpine AS builder

# Instalar dependências do sistema necessárias para build
RUN apk add --no-cache \
    openssl \
    libc6-compat \
    curl \
    git

WORKDIR /app

# Copiar arquivos de dependências primeiro (para cache do Docker)
COPY package*.json ./
COPY prisma ./prisma/

# Instalar TODAS as dependências (incluindo devDependencies para build)
RUN npm ci --legacy-peer-deps --prefer-offline --no-audit && \
    npm cache clean --force

# Gerar Prisma Client (necessário antes do build)
RUN npx prisma generate

# Copiar código fonte
COPY . .

# Compilar TypeScript
RUN npm run build

# Verificar se o build foi bem-sucedido
RUN test -d dist && test -f dist/index.js || (echo "Build failed!" && exit 1)

# ============================================
# Stage 2: Production (imagem final otimizada)
# ============================================
FROM node:20-alpine AS production

# Instalar dependências do sistema para produção
RUN apk add --no-cache \
    openssl \
    curl \
    dumb-init \
    postgresql-client \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

WORKDIR /app

# Copiar package files
COPY --from=builder /app/package*.json ./

# Instalar APENAS dependências de produção (otimização de tamanho)
RUN npm ci --only=production --legacy-peer-deps --prefer-offline --no-audit && \
    npm cache clean --force

# Copiar arquivos compilados do builder
COPY --from=builder /app/dist ./dist

# Copiar schema Prisma (necessário para migrations)
COPY --from=builder /app/prisma ./prisma

# Copiar scripts de inicialização
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
COPY --from=builder /app/scripts ./scripts

# Gerar Prisma Client para produção
RUN npx prisma generate

# Criar diretórios necessários e tornar script executável
RUN mkdir -p uploads/products uploads/temp logs && \
    chmod -R 755 uploads logs && \
    chmod +x /app/docker-entrypoint.sh && \
    chown -R nodejs:nodejs /app

# Configurar usuário não-root (segurança)
USER nodejs

# Expor porta (usa PORT da env ou padrão 3001)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3001}/health || exit 1

# Usar dumb-init para gerenciamento adequado de processos
ENTRYPOINT ["dumb-init", "--"]

# Script de inicialização com Prisma automático
# Aguarda banco estar pronto, aplica schema e inicia servidor
CMD ["/app/docker-entrypoint.sh"]
