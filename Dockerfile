FROM node:20-slim
LABEL "language"="nodejs"
LABEL "framework"="express"

WORKDIR /src

# Instalar dependências do sistema necessárias para o Prisma
RUN apt-get update -y \
    && apt-get install -y openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY certificates/icp-brasil-v10.crt /usr/local/share/ca-certificates/icp-brasil-v10.crt
RUN openssl x509 \
      -in /usr/local/share/ca-certificates/icp-brasil-v10.crt \
      -noout -checkend 0 \
    && update-ca-certificates

ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/icp-brasil-v10.crt
ENV SEFAZ_CA_CERT_PATH=/usr/local/share/ca-certificates/icp-brasil-v10.crt

COPY package*.json ./
RUN npm install

COPY . ./

# Gerar Prisma Client
RUN npx prisma generate

# Build do TypeScript
RUN npm run build

EXPOSE 8080

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/index.js"]
