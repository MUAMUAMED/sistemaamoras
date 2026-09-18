# 🐳 Como Publicar Imagens Docker no Docker Hub

## ✅ Status Atual

As imagens Docker foram **construídas com sucesso** localmente:
- ✅ `amoras-backend:latest`
- ✅ `amoras-frontend:latest`

## 📋 Próximos Passos para Publicar

### 1. Criar Conta no Docker Hub (se ainda não tiver)

1. Acesse: https://hub.docker.com
2. Clique em "Sign Up"
3. Crie sua conta gratuita
4. Verifique seu email

### 2. Criar Repositórios no Docker Hub

Após fazer login no Docker Hub:

1. Acesse: https://hub.docker.com/repositories
2. Clique em "Create Repository"
3. Crie 2 repositórios:
   - **Nome:** `amoras-backend`
   - **Visibilidade:** Public (ou Private se preferir)
   - **Descrição:** Sistema Amoras Capital - Backend API
   
   - **Nome:** `amoras-frontend`
   - **Visibilidade:** Public (ou Private se preferir)
   - **Descrição:** Sistema Amoras Capital - Frontend React

### 3. Fazer Login no Docker Hub

No PowerShell, execute:

```powershell
docker login
```

Digite seu **username** e **password** do Docker Hub.

### 4. Fazer Tag e Push das Imagens

Substitua `SEU-USUARIO` pelo seu username do Docker Hub:

```powershell
# Tag Backend
docker tag amoras-backend:latest SEU-USUARIO/amoras-backend:latest

# Tag Frontend
docker tag amoras-frontend:latest SEU-USUARIO/amoras-frontend:latest

# Push Backend
docker push SEU-USUARIO/amoras-backend:latest

# Push Frontend
docker push SEU-USUARIO/amoras-frontend:latest
```

### 5. Usar Script Automatizado

Ou use o script que criei:

```powershell
.\build-e-push-imagens.ps1 -DockerUser SEU-USUARIO
```

**Exemplo:**
```powershell
.\build-e-push-imagens.ps1 -DockerUser joaosilva
```

---

## 🚀 Usar no EasyPanel/VPS

Após publicar, use estas imagens na interface:

### Backend:
```
SEU-USUARIO/amoras-backend:latest
```

**Environment Variables:**
```
DATABASE_URL=postgresql://usuario:senha@host:5432/amoras_capital
JWT_SECRET=sua_chave_jwt_super_secreta_aqui
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=production
CORS_ORIGINS=https://seu-dominio.com
```

**Ports:**
```
3001:3001
```

### Frontend:
```
SEU-USUARIO/amoras-frontend:latest
```

**Ports:**
```
8080:8080
```

---

## 📝 Verificar Imagens Publicadas

Após o push, você pode verificar em:
- Backend: `https://hub.docker.com/r/SEU-USUARIO/amoras-backend`
- Frontend: `https://hub.docker.com/r/SEU-USUARIO/amoras-frontend`

---

## ⚠️ Importante

1. **Repositórios devem existir** no Docker Hub antes do push
2. **Você precisa estar logado** (`docker login`)
3. **Imagens privadas** requerem autenticação no EasyPanel/VPS

---

## 🔄 Atualizar Imagens

Para atualizar as imagens no futuro:

```powershell
# 1. Rebuild
cd backend
docker build -t SEU-USUARIO/amoras-backend:latest .
docker push SEU-USUARIO/amoras-backend:latest

cd ../frontend
docker build -t SEU-USUARIO/amoras-frontend:latest .
docker push SEU-USUARIO/amoras-frontend:latest
```

Ou use o script:
```powershell
.\build-e-push-imagens.ps1 -DockerUser SEU-USUARIO
```

---

**Data:** 2025-11-22
**Status:** Imagens construídas localmente ✅


