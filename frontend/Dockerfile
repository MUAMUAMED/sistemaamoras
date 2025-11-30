# Etapa 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Build arguments para variáveis de ambiente no build time
ARG REACT_APP_API_URL
ARG VITE_API_URL

# Variáveis de ambiente para o build (Vite precisa no build time)
# IMPORTANTE: Não definir NODE_ENV=production aqui para instalar devDependencies
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./

# Instalar todas as dependências (incluindo devDependencies para o build)
# Não usar --production para garantir que devDependencies sejam instaladas
RUN npm install --legacy-peer-deps --prefer-offline --no-audit && \
    npm cache clean --force

COPY . .

# Instalar dependência opcional do rollup para Alpine Linux (necessário para vite build)
RUN npm install @rollup/rollup-linux-x64-musl --save-optional --legacy-peer-deps || true

# Build da aplicação
RUN npm run build

# Etapa 2: Servidor estático
FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve
COPY --from=build /app/dist ./dist

EXPOSE 8080

CMD ["serve", "-s", "dist", "-l", "8080"] 