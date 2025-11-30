# Etapa 1: Build
# Dockerfile exclusivo para FRONTEND - totalmente independente
FROM node:20-alpine AS build

WORKDIR /app

# LOG: Mostrar versões e informações iniciais
RUN echo "============================================" && \
    echo "🐳 INICIANDO BUILD DO FRONTEND" && \
    echo "============================================" && \
    echo "📦 Node version: $(node --version)" && \
    echo "📦 NPM version: $(npm --version)" && \
    echo "📦 Working directory: $(pwd)" && \
    echo "============================================"

# Build arguments para variáveis de ambiente no build time
ARG REACT_APP_API_URL
ARG VITE_API_URL

# Variáveis de ambiente para o build (Vite precisa no build time)
# IMPORTANTE: Não definir NODE_ENV=production aqui para instalar devDependencies
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV VITE_API_URL=${VITE_API_URL}

# LOG: Mostrar variáveis de ambiente
RUN echo "🔧 Variáveis de ambiente:" && \
    echo "   REACT_APP_API_URL=${REACT_APP_API_URL}" && \
    echo "   VITE_API_URL=${VITE_API_URL}"

# Copiar package files primeiro
COPY package*.json ./

# LOG: Verificar arquivos copiados
RUN echo "📄 Verificando package files..." && \
    echo "   package.json existe: $(test -f package.json && echo 'SIM' || echo 'NÃO')" && \
    echo "   package-lock.json existe: $(test -f package-lock.json && echo 'SIM' || echo 'NÃO')" && \
    echo "📦 Informações do package.json:" && \
    cat package.json | grep -E '"name"|"version"' && \
    echo "✅ Package files copiados"

# Instalar TODAS as dependências (incluindo devDependencies para build)
# ✅ Usar npm ci para instalação determinística (requer package-lock.json)
RUN echo "📥 Instalando dependências com npm ci..." && \
    echo "   Comando: npm ci --legacy-peer-deps" && \
    npm ci --legacy-peer-deps && \
    echo "✅ Dependências instaladas com sucesso" && \
    echo "📦 Verificando instalação do vite:" && \
    (test -d node_modules/vite && echo "   ✅ Vite instalado em node_modules/vite" || echo "   ❌ Vite NÃO instalado") && \
    (test -f node_modules/vite/bin/vite.js && echo "   ✅ vite.js encontrado" || echo "   ❌ vite.js NÃO encontrado") && \
    echo "📦 Verificando instalação do typescript:" && \
    (test -d node_modules/typescript && echo "   ✅ TypeScript instalado" || echo "   ❌ TypeScript NÃO instalado")

# Copiar todos os arquivos do frontend
COPY . .

# LOG: Verificar arquivos importantes
RUN echo "📂 Verificando arquivos do frontend..." && \
    echo "   vite.config.ts existe: $(test -f vite.config.ts && echo 'SIM' || echo 'NÃO')" && \
    echo "   tsconfig.json existe: $(test -f tsconfig.json && echo 'SIM' || echo 'NÃO')" && \
    echo "   src/ existe: $(test -d src && echo 'SIM' || echo 'NÃO')" && \
    echo "   public/ existe: $(test -d public && echo 'SIM' || echo 'NÃO')" && \
    echo "✅ Arquivos do frontend copiados"

# Build da aplicação
RUN echo "🔨 Iniciando build da aplicação..." && \
    echo "📝 Executando: npm run build" && \
    echo "   O script 'build' executa: tsc && vite build" && \
    npm run build && \
    echo "✅ Build concluído com sucesso!" && \
    echo "📂 Verificando pasta dist/..." && \
    (test -d dist && echo "   ✅ Pasta dist/ criada" || echo "   ❌ Pasta dist/ NÃO criada") && \
    echo "📦 Conteúdo da pasta dist/ (primeiros 10 itens):" && \
    (ls -la dist/ | head -10 || echo "   ⚠️ Não foi possível listar dist/")

# Etapa 2: Servidor estático (produção)
FROM node:20-alpine

WORKDIR /app

# LOG: Etapa de produção
RUN echo "============================================" && \
    echo "🚀 ETAPA DE PRODUÇÃO" && \
    echo "============================================" && \
    echo "📦 Node version: $(node --version)" && \
    echo "📦 NPM version: $(npm --version)"

# Instalar serve para servir arquivos estáticos
RUN echo "📦 Instalando serve..." && \
    npm install -g serve && \
    echo "✅ Serve instalado" && \
    serve --version

# Copiar apenas os arquivos de build (dist)
COPY --from=build /app/dist ./dist

# LOG: Verificar arquivos copiados
RUN echo "📂 Verificando arquivos copiados da etapa de build..." && \
    (test -d dist && echo "   ✅ Pasta dist/ copiada" || echo "   ❌ Pasta dist/ NÃO copiada") && \
    echo "📦 Conteúdo da pasta dist/:" && \
    (ls -la dist/ | head -10 || echo "   ⚠️ Não foi possível listar dist/")

EXPOSE 8080

CMD ["serve", "-s", "dist", "-l", "8080"]

