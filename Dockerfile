# Etapa 1: Build
# Dockerfile exclusivo para FRONTEND - totalmente independente
FROM node:20-alpine AS build

WORKDIR /app

# Build arguments para variáveis de ambiente no build time
ARG REACT_APP_API_URL
ARG VITE_API_URL

# Variáveis de ambiente para o build (Vite precisa no build time)
# IMPORTANTE: Não definir NODE_ENV=production aqui para instalar devDependencies
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV VITE_API_URL=${VITE_API_URL}

# Copiar package files primeiro
COPY package*.json ./

# Instalar TODAS as dependências (incluindo devDependencies para build)
# ✅ Usar npm ci para instalação determinística (requer package-lock.json)
# Se package-lock.json não existir, use: npm install --legacy-peer-deps
RUN npm ci --legacy-peer-deps

# Copiar todos os arquivos do frontend
COPY . .

# Build da aplicação
RUN npm run build

# Etapa 2: Servidor estático (produção)
FROM node:20-alpine

WORKDIR /app

# Instalar serve para servir arquivos estáticos
RUN npm install -g serve

# Copiar apenas os arquivos de build (dist)
COPY --from=build /app/dist ./dist

EXPOSE 8080

CMD ["serve", "-s", "dist", "-l", "8080"]

