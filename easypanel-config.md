# 🎛️ Configuração EasyPanel - Sistema Amoras Capital

## 📦 1. PostgreSQL Database

**Nome:** `amoras-capital-db`
**Template:** PostgreSQL 15

### Configurações:
```yaml
Database Name: amoras_capital
Username: amoras_user
Password: [GERAR SENHA SEGURA]
Port: 5432
```

### Internal Connection String:
```
postgresql://amoras_user:SUA_SENHA@amoras-capital-db:5432/amoras_capital
```

---

## 🔧 2. Backend API

**Nome:** `amoras-backend`
**Template:** Docker

### Source:
```yaml
Repository: https://github.com/SEU_USUARIO/sistemaamoras.git
Branch: main
Build Path: ./backend
Dockerfile: Dockerfile.production
```

### Environment Variables:
```env
# Database
DATABASE_URL=postgresql://amoras_user:SUA_SENHA@amoras-capital-db:5432/amoras_capital

# JWT
JWT_SECRET=seu_jwt_secret_super_secreto_aqui_min_32_chars_production_2024
JWT_EXPIRES_IN=7d

# Server
NODE_ENV=production
PORT=3001

# CORS - SUBSTITUA pelos seus domínios
CORS_ORIGINS=https://app.seudominio.com,https://frontend.seudominio.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=500

# Uploads & Logs
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=5242880
LOG_LEVEL=info

# Optional integrations
CHATWOOT_URL=
CHATWOOT_TOKEN=
N8N_WEBHOOK_URL=
MP_ACCESS_TOKEN=
MP_PUBLIC_KEY=
```

### Volumes:
- **Name:** `amoras-uploads` → **Mount:** `/app/uploads`
- **Name:** `amoras-logs` → **Mount:** `/app/logs`

### Domain:
- **Domain:** `api.seudominio.com`
- **SSL:** Let's Encrypt (Auto)

### Health Check:
- **Path:** `/health`
- **Port:** `3001`
- **Interval:** 30s

### Resources:
- **CPU:** 1 vCPU
- **Memory:** 1 GB
- **Storage:** 10 GB

---

## 🎨 3. Frontend

**Nome:** `amoras-frontend`
**Template:** Docker

### Source:
```yaml
Repository: https://github.com/SEU_USUARIO/sistemaamoras.git
Branch: main
Build Path: ./frontend
Dockerfile: Dockerfile.production
```

### Environment Variables:
```env
# API Backend - SUBSTITUA pelo seu domínio
REACT_APP_API_URL=https://api.seudominio.com/api
REACT_APP_API_TIMEOUT=30000

# Build
NODE_ENV=production
GENERATE_SOURCEMAP=false
INLINE_RUNTIME_CHUNK=false
```

### Domain:
- **Domain:** `app.seudominio.com` ou `seudominio.com`
- **SSL:** Let's Encrypt (Auto)

### Health Check:
- **Path:** `/health`
- **Port:** `80`
- **Interval:** 30s

### Resources:
- **CPU:** 0.5 vCPU
- **Memory:** 512 MB
- **Storage:** 5 GB

---

## 🚀 4. Ordem de Deploy

1. **PostgreSQL Database** (Primeiro)
2. **Backend API** (Segundo) 
3. **Frontend** (Terceiro)

---

## 📋 5. Comandos Pós-Deploy

### No Backend (Primeira vez):
```bash
# Executar migrations
npx prisma migrate deploy

# Popular banco com dados iniciais
npx prisma db seed
```

### Verificações:
```bash
# Health check backend
curl https://api.seudominio.com/health

# Health check frontend
curl https://app.seudominio.com/health

# API docs
https://api.seudominio.com/api-docs
```

---

## 🔐 6. Security Checklist

- [ ] SSL/HTTPS habilitado para todos os domínios
- [ ] Variáveis de ambiente sensíveis configuradas
- [ ] CORS_ORIGINS configurado corretamente
- [ ] JWT_SECRET único e seguro (min 32 chars)
- [ ] Database password forte
- [ ] Rate limiting configurado
- [ ] Health checks funcionando

---

## 📊 7. Monitoramento

### Logs:
- **Backend:** Volume `/app/logs`
- **Frontend:** Nginx logs
- **Database:** PostgreSQL logs

### Metrics:
- **CPU/Memory:** EasyPanel dashboard
- **Health Status:** Health check endpoints
- **Response Time:** /health endpoints

---

## 🆘 8. Troubleshooting

### Backend não inicia:
1. Verificar `DATABASE_URL`
2. Verificar se PostgreSQL está rodando
3. Executar migrations: `npx prisma migrate deploy`

### Frontend não carrega:
1. Verificar `REACT_APP_API_URL`
2. Verificar CORS no backend
3. Verificar logs do Nginx

### 500 Errors:
1. Verificar logs em `/app/logs/error.log`
2. Verificar connection string do banco
3. Verificar se migrations foram executadas

### CORS Errors:
1. Verificar `CORS_ORIGINS` no backend
2. Verificar se domínios estão corretos
3. Verificar HTTPS vs HTTP

---

## 🔄 9. Updates & Maintenance

### Deploy de Updates:
1. Push para branch `main` no Git
2. EasyPanel fará rebuild automático
3. Verificar health checks após deploy

### Database Migrations:
```bash
# Criar nova migration (local)
npx prisma migrate dev --name nome_da_migration

# Deploy para produção (automático)
npx prisma migrate deploy
```

### Backup Database:
```bash
pg_dump postgresql://user:pass@host:5432/amoras_capital > backup.sql
```

---

**✅ Sistema pronto para produção no EasyPanel!** 