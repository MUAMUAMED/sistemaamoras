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

# Copiar package.json da raiz (este é o package.json correto para o frontend)
COPY package.json package-lock.json* ./

# Instalar todas as dependências (incluindo devDependencies para o build)
RUN npm install --legacy-peer-deps --prefer-offline --no-audit && \
    npm cache clean --force

# Copiar todos os arquivos do frontend (de dentro da pasta frontend/)
COPY frontend/ .

# Instalar dependência opcional do rollup para Alpine Linux
RUN npm install @rollup/rollup-linux-x64-musl --save-optional --legacy-peer-deps || true

# Build da aplicação frontend usando o script do package.json
# O script "build" no package.json executa: "tsc && vite build"
RUN npm run build

# Etapa 2: Servidor estático
FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve
COPY --from=build /app/dist ./dist

EXPOSE 8080

CMD ["serve", "-s", "dist", "-l", "8080"]

