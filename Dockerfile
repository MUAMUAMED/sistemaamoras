FROM node:20-slim
LABEL "language"="nodejs"
LABEL "framework"="express"

WORKDIR /src

# Instalar dependências do sistema necessárias para o Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . ./

# Gerar Prisma Client
RUN npx prisma generate

# Build do TypeScript
RUN npm run build

EXPOSE 8080

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/index.js"]
