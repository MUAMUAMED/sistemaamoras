# Etapa 1: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Etapa 2: Produção
FROM node:20-alpine

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./
COPY .env* ./

# Gera o Prisma Client na imagem final
RUN npx prisma generate

EXPOSE 3001

CMD ["node", "dist/index.js"] 