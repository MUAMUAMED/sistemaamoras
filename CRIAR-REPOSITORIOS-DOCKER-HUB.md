# 📦 Criar Repositórios no Docker Hub

## ⚠️ Erro Encontrado

O push falhou porque os repositórios ainda não existem no Docker Hub. Você precisa criá-los primeiro.

## 📋 Passo a Passo

### 1. Acesse o Docker Hub

1. Vá para: **https://hub.docker.com/repositories**
2. Faça login com sua conta (username: `mohameduyyyyyyy`)

### 2. Criar Repositório Backend

1. Clique no botão **"Create Repository"** (canto superior direito)
2. Preencha:
   - **Repository Name:** `amoras-backend`
   - **Visibility:** 
     - ✅ **Public** (recomendado - gratuito e fácil de usar)
     - ⚠️ **Private** (requer plano pago)
   - **Description:** `Sistema Amoras Capital - Backend API`
3. Clique em **"Create"**

### 3. Criar Repositório Frontend

1. Clique novamente em **"Create Repository"**
2. Preencha:
   - **Repository Name:** `amoras-frontend`
   - **Visibility:** 
     - ✅ **Public** (recomendado)
     - ⚠️ **Private** (requer plano pago)
   - **Description:** `Sistema Amoras Capital - Frontend React`
3. Clique em **"Create"**

### 4. Fazer Login no Docker (se ainda não fez)

No PowerShell, execute:

```powershell
docker login
```

Digite:
- **Username:** `mohameduyyyyyyy`
- **Password:** (sua senha do Docker Hub)

### 5. Publicar as Imagens

Depois de criar os repositórios e fazer login, execute:

```powershell
# Push Backend
docker push mohameduyyyyyyy/amoras-backend:latest

# Push Frontend
docker push mohameduyyyyyyy/amoras-frontend:latest
```

Ou use o script:

```powershell
.\build-e-push-imagens.ps1 -DockerUser mohameduyyyyyyy
```

---

## ✅ Depois de Criar os Repositórios

As imagens já estão com tag correta:
- ✅ `mohameduyyyyyyy/amoras-backend:latest`
- ✅ `mohameduyyyyyyy/amoras-frontend:latest`

Você só precisa:
1. ✅ Criar os repositórios no Docker Hub (passo acima)
2. ✅ Fazer login (`docker login`)
3. ✅ Fazer push (comandos acima)

---

## 🔗 Links Rápidos

- **Criar Repositório:** https://hub.docker.com/repositories/create
- **Meus Repositórios:** https://hub.docker.com/repositories
- **Meu Perfil:** https://hub.docker.com/u/mohameduyyyyyyy

---

## 💡 Dica

Se você escolher **Public**, qualquer pessoa pode baixar suas imagens (mas não modificar). É gratuito e funciona perfeitamente para deploy.

Se escolher **Private**, você precisará de um plano pago do Docker Hub.


