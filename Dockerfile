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

# Copiar package.json primeiro
COPY package.json package-lock.json* ./

# Instalar TODAS as dependências (incluindo devDependencies)
# IMPORTANTE: Não definir NODE_ENV=production para garantir que devDependencies sejam instaladas
RUN npm install --legacy-peer-deps --no-audit && \
    npm cache clean --force

# Verificar que vite foi instalado corretamente (deve estar nas devDependencies)
RUN npm list vite || npm install vite@^7.0.1 @vitejs/plugin-react@^5.1.1 --save-dev --legacy-peer-deps

# Copiar todos os arquivos do frontend (incluindo vite.config.ts)
COPY . .

# Instalar dependência opcional do rollup para Alpine Linux
RUN npm install @rollup/rollup-linux-x64-musl --save-optional --legacy-peer-deps || true

# Verificar que vite está instalado e disponível antes do build
RUN test -f node_modules/vite/bin/vite.js || npm install vite@^7.0.1 @vitejs/plugin-react@^5.1.1 --save-dev --legacy-peer-deps

# Build: primeiro compila TypeScript, depois executa vite usando node diretamente
# Isso garante que o vite.config.ts consegue importar o módulo vite do node_modules
RUN npx tsc && node ./node_modules/vite/bin/vite.js build

# Etapa 2: Servidor estático
FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve
COPY --from=build /app/dist ./dist

EXPOSE 8080

CMD ["serve", "-s", "dist", "-l", "8080"]

