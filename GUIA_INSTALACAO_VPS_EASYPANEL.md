# 🚀 Guia de Instalação VPS - EasyPanel
## Sistema Amoras Capital - CRM & ERP

Este guia detalha como instalar o sistema na VPS usando EasyPanel com frontend e backend separados.

---

## 📋 Pré-requisitos

- VPS com Ubuntu 20.04+ ou Debian 11+
- EasyPanel instalado e configurado
- Domínio configurado (ex: `exemplo.com`)
- Certificado SSL/TLS

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   PostgreSQL    │
│   (React)       │───▶│   (Node.js)     │───▶│   Database      │
│ frontend.com    │    │  api.exemplo.com│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🔧 1. Preparação dos Arquivos

### 1.1 Backend - Ajustes de Configuração

**Arquivo: `backend/.env.production`**
```env
# Banco de Dados PostgreSQL
DATABASE_URL="postgresql://usuario:senha@localhost:5432/amoras_capital"

# JWT
JWT_SECRET="seu_jwt_secret_super_secreto_aqui_min_32_chars"
JWT_EXPIRES_IN="7d"

# Servidor
NODE_ENV="production"
PORT=3001

# Rate Limiting (Produção)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=500

# CORS Origins
CORS_ORIGINS="https://frontend.exemplo.com,https://app.exemplo.com"

# Logs
LOG_LEVEL="info"

# Uploads
UPLOAD_DIR="/app/uploads"
MAX_FILE_SIZE=5242880

# Chatwoot (Opcional)
CHATWOOT_URL=""
CHATWOOT_TOKEN=""

# N8N Webhook (Opcional)
N8N_WEBHOOK_URL=""

# Mercado Pago (Opcional)
MP_ACCESS_TOKEN=""
MP_PUBLIC_KEY=""
```

**Arquivo: `backend/Dockerfile.production`**
```dockerfile
FROM node:18-alpine

# Instalar dependências do sistema
RUN apk add --no-cache \
    openssl \
    libc6-compat

WORKDIR /app

# Copiar package files
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências
RUN npm ci --only=production --legacy-peer-deps

# Gerar Prisma Client
RUN npx prisma generate

# Copiar código fonte
COPY . .

# Compilar TypeScript
RUN npm run build

# Criar diretórios necessários
RUN mkdir -p uploads logs

# Configurar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Definir permissões
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expor porta
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://https://amoras-sistema-gew1.gbl2yq.easypanel.host/health || exit 1

# Comando de inicialização
CMD ["npm", "start"]
```

**Arquivo: `backend/package.json` - Adicionar scripts**
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "start:prod": "NODE_ENV=production node dist/index.js",
    "migrate:deploy": "npx prisma migrate deploy",
    "db:seed": "npx prisma db seed"
  }
}
```

### 1.2 Frontend - Ajustes de Configuração

**Arquivo: `frontend/.env.production`**
```env
# API Backend
REACT_APP_API_URL=https://api.exemplo.com
REACT_APP_API_TIMEOUT=30000

# Ambiente
NODE_ENV=production
GENERATE_SOURCEMAP=false

# Build otimizations
INLINE_RUNTIME_CHUNK=false
```

**Arquivo: `frontend/Dockerfile.production`**
```dockerfile
# Estágio de build
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci --legacy-peer-deps

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Estágio de produção
FROM nginx:alpine

# Instalar curl para health check
RUN apk add --no-cache curl

# Copiar arquivos de build
COPY --from=builder /app/build /usr/share/nginx/html

# Configuração do Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost || exit 1

# Expor porta
EXPOSE 80

# Comando de inicialização
CMD ["nginx", "-g", "daemon off;"]
```

**Arquivo: `frontend/nginx.conf`**
```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logs
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    server {
        listen 80;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # SPA fallback
        location / {
            try_files $uri $uri/ /index.html;
        }

        # API proxy (opcional)
        location /api/ {
            proxy_pass https://api.exemplo.com/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### 1.3 Ajustar URLs no Frontend

**Arquivo: `frontend/src/services/api.ts`**
```typescript
// Configuração base do Axios
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://api.exemplo.com/api',
  timeout: parseInt(process.env.REACT_APP_API_TIMEOUT || '30000'),
});
```

---

## 🛠️ 2. Configuração no EasyPanel

### 2.1 Configurar PostgreSQL Database

1. **Criar Database**:
   - Nome: `amoras-capital-db`
   - Template: `PostgreSQL 15`
   - Database Name: `amoras_capital`
   - Username: `amoras_user`
   - Password: `senha_super_segura`

2. **Configurações de Conexão**:
   - Host: `amoras-capital-db`
   - Port: `5432`
   - SSL: Enabled

### 2.2 Configurar Backend API

1. **Criar App**:
   - Nome: `amoras-backend`
   - Template: `Docker`
   - Repository: `https://github.com/seu-usuario/sistemaamoras.git`
   - Branch: `main`
   - Build Command: `cd backend && docker build -f Dockerfile.production -t amoras-backend .`

2. **Environment Variables**:
```env
DATABASE_URL=postgresql://amoras_user:senha_super_segura@amoras-capital-db:5432/amoras_capital
JWT_SECRET=seu_jwt_secret_super_secreto_aqui_min_32_chars_production
NODE_ENV=production
PORT=3001
CORS_ORIGINS=https://app.exemplo.com
```

3. **Volumes**:
   - `/app/uploads` → Volume persistente para uploads
   - `/app/logs` → Volume persistente para logs

4. **Domínio**:
   - Domain: `api.exemplo.com`
   - SSL: Enabled (Let's Encrypt)

5. **Health Check**:
   - Path: `/health`
   - Port: `3001`

### 2.3 Configurar Frontend

1. **Criar App**:
   - Nome: `amoras-frontend`
   - Template: `Docker`
   - Repository: `https://github.com/seu-usuario/sistemaamoras.git`
   - Branch: `main`
   - Build Command: `cd frontend && docker build -f Dockerfile.production -t amoras-frontend .`

2. **Environment Variables**:
```env
REACT_APP_API_URL=https://api.exemplo.com/api
NODE_ENV=production
GENERATE_SOURCEMAP=false
```

3. **Domínio**:
   - Domain: `app.exemplo.com`
   - SSL: Enabled (Let's Encrypt)

---

## 🗄️ 3. Configuração do Banco de Dados

### 3.1 Schema Prisma para PostgreSQL

**Arquivo: `backend/prisma/schema.prisma`**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ... resto do schema permanece igual ...
```

### 3.2 Migrations

```bash
# No servidor backend, executar:
npx prisma migrate deploy
npx prisma db seed
```

---

## 🚀 4. Deploy e Inicialização

### 4.1 Ordem de Deploy

1. **PostgreSQL Database** (primeiro)
2. **Backend API** (segundo)
3. **Frontend** (terceiro)

### 4.2 Scripts de Deploy

**Arquivo: `deploy.sh`**
```bash
#!/bin/bash

echo "🚀 Iniciando deploy do Sistema Amoras Capital..."

# 1. Backend
echo "📦 Fazendo deploy do Backend..."
cd backend
npm ci --only=production
npm run build
npx prisma migrate deploy
npx prisma generate

# 2. Frontend
echo "🎨 Fazendo deploy do Frontend..."
cd ../frontend
npm ci
npm run build

echo "✅ Deploy concluído!"
```

---

## 🔧 5. Configurações de Produção

### 5.1 Security Headers (Backend)

**Arquivo: `backend/src/index.ts`**
```typescript
// Configurações de segurança para produção
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS para produção
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['https://app.exemplo.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
```

### 5.2 Rate Limiting (Produção)

```typescript
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '500'), // 500 req/15min
  message: 'Muitas requisições. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development', // Só em dev
});
```

---

## 📊 6. Monitoramento e Logs

### 6.1 Health Checks

**Backend Health Check** (`/health`):
```typescript
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'amoras-capital-api',
    version: process.env.npm_package_version || '1.0.0'
  });
});
```

### 6.2 Logging

- **Backend**: Logs em `/app/logs/`
- **Frontend**: Logs do Nginx
- **Database**: Logs do PostgreSQL

---

## 🔐 7. Backup e Segurança

### 7.1 Backup do Banco

```bash
# Script de backup diário
#!/bin/bash
pg_dump postgresql://user:pass@host:5432/amoras_capital > backup_$(date +%Y%m%d).sql
```

### 7.2 SSL/TLS

- Certificados automáticos via Let's Encrypt no EasyPanel
- HTTPS obrigatório para todas as conexões
- HSTS headers habilitados

---

## 📝 8. Checklist de Deploy

- [ ] PostgreSQL configurado e rodando
- [ ] Variables de ambiente configuradas
- [ ] Backend deployado e respondendo
- [ ] Frontend deployado e carregando
- [ ] SSL/HTTPS funcionando
- [ ] Health checks passando
- [ ] Banco populado com seed
- [ ] Teste de login funcionando
- [ ] Uploads funcionando
- [ ] Logs sendo gerados

---

## 🆘 9. Troubleshooting

### Problemas Comuns:

1. **500 Error no Backend**:
   - Verificar DATABASE_URL
   - Executar migrations: `npx prisma migrate deploy`

2. **Frontend não carrega**:
   - Verificar REACT_APP_API_URL
   - Verificar CORS no backend

3. **Uploads não funcionam**:
   - Verificar permissões do volume `/app/uploads`
   - Verificar UPLOAD_DIR no .env

4. **Rate Limiting muito restritivo**:
   - Ajustar RATE_LIMIT_MAX_REQUESTS
   - Verificar RATE_LIMIT_WINDOW_MS

---

## 📞 Suporte

Para suporte técnico:
- Logs: Verificar `/app/logs/` no backend
- Health: `https://api.exemplo.com/health`
- Docs: `https://api.exemplo.com/api-docs`

---

**🎉 Sistema pronto para produção!** 