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
# O build TypeScript precisa de typescript e demais dependências de desenvolvimento,
# mesmo quando NODE_ENV=production está definido no serviço.
RUN npm install --include=dev

COPY . ./

# Gerar Prisma Client
RUN npx prisma generate

# Build do TypeScript
RUN npm run build

EXPOSE 8080

# O banco de produção possui dados e evolui por migrações aditivas revisadas.
# A aplicação não tenta sincronizar schema no boot: esse passo pode bloquear
# a inicialização ou aplicar uma mudança fora da revisão explicitamente aprovada.
CMD ["node", "dist/index.js"]
