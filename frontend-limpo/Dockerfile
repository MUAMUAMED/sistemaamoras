# Etapa 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Build arguments para variáveis de ambiente no build time
ARG VITE_API_URL
ARG REACT_APP_API_URL

# Variáveis de ambiente para o build (Vite precisa no build time)
ENV VITE_API_URL=${VITE_API_URL}
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV CI=false

# Copiar package files primeiro para cache de dependências
COPY package*.json ./

# Instalar TODAS as dependências (incluindo devDependencies para build)
# Não definir NODE_ENV=production aqui para instalar devDependencies
RUN npm ci --legacy-peer-deps

# Copiar todos os arquivos do frontend
COPY . .

# Build da aplicação (Vite gera dist/)
# Definir NODE_ENV=production apenas para o build
RUN NODE_ENV=production npm run build

# Verificar se dist/ foi criado
RUN ls -la dist/ || (echo "ERRO: dist/ não foi criado!" && exit 1)

# Etapa 2: Servidor estático (produção)
FROM node:20-alpine

WORKDIR /app

# Instalar serve para servir arquivos estáticos
RUN npm install -g serve

# Copiar apenas os arquivos de build (dist) da etapa anterior
COPY --from=build /app/dist ./dist

# Expor porta 8080
EXPOSE 8080

# Comando para servir os arquivos estáticos
CMD ["serve", "-s", "dist", "-l", "8080"]

