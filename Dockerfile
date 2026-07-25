FROM node:20-slim
LABEL "language"="nodejs"
LABEL "framework"="express"

WORKDIR /src

# Instalar dependências do sistema necessárias para o Prisma
RUN apt-get update -y \
    && apt-get install -y openssl ca-certificates curl \
    && curl -fsSL \
       https://acraiz.icpbrasil.gov.br/credenciadas/RAIZ/ICP-Brasilv10.crt \
       -o /usr/local/share/ca-certificates/icp-brasil-v10.crt \
    && openssl x509 \
       -in /usr/local/share/ca-certificates/icp-brasil-v10.crt \
       -noout -checkend 0 \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/icp-brasil-v10.crt

COPY package*.json ./
RUN npm install

COPY . ./

# Gerar Prisma Client
RUN npx prisma generate

# Build do TypeScript
RUN npm run build

EXPOSE 8080

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/index.js"]
