# ⚡ Deploy VPS - Resumo Rápido

## 🚀 Checklist de Deploy

### ✅ Pré-Deploy
- [ ] Código no Git/GitHub
- [ ] Domínios configurados (api.exemplo.com, app.exemplo.com)
- [ ] EasyPanel instalado na VPS

### ✅ 1. Database (PostgreSQL)
```yaml
Nome: amoras-capital-db
Template: PostgreSQL 15
DB: amoras_capital
User: amoras_user
```

### ✅ 2. Backend
```yaml
Nome: amoras-backend
Repo: seu-repositorio.git
Path: ./backend
Dockerfile: Dockerfile.production
Domain: api.exemplo.com
```

**ENV Variables:**
```env
DATABASE_URL=postgresql://amoras_user:SENHA@amoras-capital-db:5432/amoras_capital
JWT_SECRET=seu_jwt_super_secreto_32_chars_min
NODE_ENV=production
CORS_ORIGINS=https://app.exemplo.com
```

### ✅ 3. Frontend
```yaml
Nome: amoras-frontend  
Repo: seu-repositorio.git
Path: ./frontend
Dockerfile: Dockerfile.production
Domain: app.exemplo.com
```

**ENV Variables:**
```env
REACT_APP_API_URL=https://api.exemplo.com/api
NODE_ENV=production
```

### ✅ 4. Pós-Deploy
```bash
# No backend container:
npx prisma migrate deploy
npx prisma db seed
```

## 🔍 Verificações

- ✅ https://api.exemplo.com/health
- ✅ https://app.exemplo.com/health  
- ✅ https://app.exemplo.com (login funciona)
- ✅ https://api.exemplo.com/api-docs

## 🆘 Problemas?

1. **500 Error:** Verificar DATABASE_URL
2. **CORS Error:** Verificar CORS_ORIGINS
3. **Build Error:** Verificar Dockerfile paths
4. **DB Error:** Executar migrations

---

**�� Sistema no ar!** 