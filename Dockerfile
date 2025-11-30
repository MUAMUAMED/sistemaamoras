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
# Não usar --production para garantir que devDependencies sejam instaladas
# Remover --prefer-offline para garantir download das dependências
RUN npm install --legacy-peer-deps --no-audit && \
    npm cache clean --force

# Garantir que vite e suas dependências estejam instaladas (devDependencies)
RUN npm install vite@^7.0.1 @vitejs/plugin-react@^5.1.1 --save-dev --legacy-peer-deps

# Copiar todos os arquivos do frontend (já estão na raiz)
COPY . .

# Instalar dependência opcional do rollup para Alpine Linux
RUN npm install @rollup/rollup-linux-x64-musl --save-optional --legacy-peer-deps || true

# Build da aplicação frontend usando npm run build (usa o script do package.json)
RUN npm run build

# Etapa 2: Servidor estático
FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve
COPY --from=build /app/dist ./dist

EXPOSE 8080

CMD ["serve", "-s", "dist", "-l", "8080"]

