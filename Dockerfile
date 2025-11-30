# Etapa 1: Build
# Dockerfile exclusivo para FRONTEND - totalmente independente
FROM node:20-alpine AS build

WORKDIR /app

# Build arguments para variáveis de ambiente no build time
ARG REACT_APP_API_URL
ARG VITE_API_URL

# Variáveis de ambiente para o build (Vite precisa no build time)
# IMPORTANTE: Não definir NODE_ENV=production aqui para instalar devDependencies
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV VITE_API_URL=$VITE_API_URL

# LOG: Mostrar versões e informações iniciais
RUN echo "============================================" && \
    echo "🐳 INICIANDO BUILD DO FRONTEND" && \
    echo "============================================" && \
    echo "📦 Node version: $(node --version)" && \
    echo "📦 NPM version: $(npm --version)" && \
    echo "📦 Working directory: $(pwd)" && \
    echo "============================================"

# Copiar package.json primeiro
COPY package.json package-lock.json* ./

# LOG: Mostrar informações do package.json
RUN echo "📄 Verificando package.json..." && \
    cat package.json | grep -E '"name"|"version"|"build"' && \
    echo "✅ package.json copiado com sucesso"

# Instalar TODAS as dependências (incluindo devDependencies)
# IMPORTANTE: Não definir NODE_ENV=production para garantir que devDependencies sejam instaladas
RUN echo "📥 Instalando dependências (incluindo devDependencies)..." && \
    npm install --legacy-peer-deps --no-audit && \
    npm cache clean --force && \
    echo "✅ Dependências instaladas com sucesso"

# Verificar que vite foi instalado corretamente (deve estar nas devDependencies)
RUN echo "🔍 Verificando instalação do vite..." && \
    npm list vite || (echo "⚠️ Vite não encontrado, instalando..." && npm install vite@^7.0.1 @vitejs/plugin-react@^5.1.1 --save-dev --legacy-peer-deps) && \
    echo "✅ Vite verificado/instalado" && \
    npm list vite

# Copiar todos os arquivos do frontend (incluindo vite.config.ts)
COPY . .

# LOG: Verificar arquivos importantes
RUN echo "📂 Verificando arquivos copiados..." && \
    echo "📄 vite.config.ts existe: $(test -f vite.config.ts && echo 'SIM' || echo 'NÃO')" && \
    echo "📄 package.json existe: $(test -f package.json && echo 'SIM' || echo 'NÃO')" && \
    echo "📂 node_modules existe: $(test -d node_modules && echo 'SIM' || echo 'NÃO')" && \
    echo "✅ Arquivos copiados"

# Instalar dependência opcional do rollup para Alpine Linux
RUN echo "📦 Instalando rollup para Alpine Linux..." && \
    npm install @rollup/rollup-linux-x64-musl --save-optional --legacy-peer-deps || echo "⚠️ Rollup opcional não instalado (continuando...)" && \
    echo "✅ Rollup processado"

# Verificar que vite está instalado e disponível antes do build
RUN echo "🔍 Verificando caminho do vite antes do build..." && \
    echo "📂 node_modules/vite existe: $(test -d node_modules/vite && echo 'SIM' || echo 'NÃO')" && \
    echo "📄 node_modules/vite/bin/vite.js existe: $(test -f node_modules/vite/bin/vite.js && echo 'SIM' || echo 'NÃO')" && \
    (test -f node_modules/vite/bin/vite.js || (echo "⚠️ Vite bin não encontrado, reinstalando..." && npm install vite@^7.0.1 @vitejs/plugin-react@^5.1.1 --save-dev --legacy-peer-deps)) && \
    ls -la node_modules/.bin/ | grep vite || echo "⚠️ Nenhum binário vite encontrado em .bin/" && \
    echo "✅ Verificação do vite concluída"

# Build: primeiro compila TypeScript, depois executa vite usando node diretamente
# Isso garante que o vite.config.ts consegue importar o módulo vite do node_modules
RUN echo "🔨 Iniciando build..." && \
    echo "📝 Passo 1: Compilando TypeScript..." && \
    npx tsc && \
    echo "✅ TypeScript compilado com sucesso" && \
    echo "📝 Passo 2: Executando vite build..." && \
    echo "🔧 Comando: node ./node_modules/vite/bin/vite.js build" && \
    node ./node_modules/vite/bin/vite.js build && \
    echo "✅ Build concluído com sucesso!" && \
    echo "📂 Verificando dist/..." && \
    ls -la dist/ | head -10 || echo "⚠️ Pasta dist/ não encontrada"

# Etapa 2: Servidor estático
FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve
COPY --from=build /app/dist ./dist

EXPOSE 8080

CMD ["serve", "-s", "dist", "-l", "8080"]

