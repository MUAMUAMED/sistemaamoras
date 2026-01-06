# Variáveis de Ambiente - Sistema Amoras Capital

Este documento lista todas as variáveis de ambiente necessárias para o sistema funcionar corretamente.

## 📋 Como Usar

1. **Docker Compose**: Crie um arquivo `.env` na raiz do projeto com as variáveis abaixo
2. **Backend**: Crie um arquivo `.env` na raiz do projeto (veja `env.local.example`)
3. **Frontend**: Configure as variáveis no build (veja `frontend/env.production.example`)

## 🔧 Variáveis Principais

### Ambiente
```bash
NODE_ENV=production  # ou development
```

### Backend API
```bash
PORT=3001
APP_URL=http://localhost:3001  # Em produção: https://api.seudominio.com
```

### Banco de Dados
```bash
DATABASE_URL=postgresql://usuario:senha@host:5432/amoras_capital
```

### JWT (Autenticação)
```bash
JWT_SECRET=sua_chave_jwt_super_secreta_aqui_min_32_caracteres
JWT_EXPIRES_IN=7d
```

### CORS (Cross-Origin Resource Sharing)
```bash
# URLs permitidas para acessar a API (separadas por vírgula)
CORS_ORIGINS=http://localhost:3000
# Em produção: https://app.seudominio.com,https://www.seudominio.com
```

### Frontend
```bash
# URL da API para o frontend (usado no build)
VITE_API_URL=/api
REACT_APP_API_URL=/api
# Em produção com domínio diferente: https://api.seudominio.com/api
```

### Nginx
```bash
# Nome do servidor (use _ para aceitar qualquer host)
NGINX_SERVER_NAME=_
```

## 📊 Variáveis Opcionais

### Rate Limiting
```bash
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000
```

### Uploads
```bash
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880  # 5MB em bytes
```

### Logs
```bash
LOG_LEVEL=info  # debug, info, warn, error
```

### Integrações
```bash
# Chatwoot
CHATWOOT_URL=
CHATWOOT_TOKEN=

# N8N Webhook
N8N_WEBHOOK_URL=

# Mercado Pago
MP_ACCESS_TOKEN=
MP_PUBLIC_KEY=
```

### Sistema
```bash
COMPANY_NAME=Amoras Capital
SALE_NUMBER_PREFIX=AC
```

## 🚀 Exemplo de Arquivo .env para Produção

```bash
# Ambiente
NODE_ENV=production

# Backend
PORT=3001
APP_URL=https://api.seudominio.com

# Banco de Dados
DATABASE_URL=postgresql://usuario_seguro:senha_forte@db.seudominio.com:5432/amoras_capital

# JWT
JWT_SECRET=chave_super_secreta_com_pelo_menos_32_caracteres_aleatorios_aqui
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGINS=https://app.seudominio.com,https://www.seudominio.com

# Frontend
VITE_API_URL=https://api.seudominio.com/api
REACT_APP_API_URL=https://api.seudominio.com/api

# Nginx
NGINX_SERVER_NAME=_

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=500

# Uploads
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=5242880

# Logs
LOG_LEVEL=info

# Sistema
COMPANY_NAME=Amoras Capital
SALE_NUMBER_PREFIX=AC
```

## ⚠️ Importante

1. **NUNCA** commite arquivos `.env` com valores reais no Git
2. **SEMPRE** use variáveis de ambiente em produção
3. **NUNCA** use `localhost` em produção - use domínios reais
4. **SEMPRE** use senhas fortes e segredos longos (mínimo 32 caracteres para JWT_SECRET)
5. **SEMPRE** configure `CORS_ORIGINS` com os domínios reais em produção

## 🔍 Verificação

Para verificar se todas as variáveis estão configuradas:

```bash
# Backend
cd backend
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL ? '✅ DATABASE_URL' : '❌ DATABASE_URL');"

# Docker Compose
docker-compose config
```

