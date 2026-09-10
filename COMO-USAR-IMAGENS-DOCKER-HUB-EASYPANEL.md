# 🐳 Como Usar Imagens Docker Hub no EasyPanel

## 📋 Guia Passo a Passo

Este guia mostra como configurar as imagens Docker publicadas no Docker Hub na interface "Customize Prebuilt" do EasyPanel.

---

## 🎯 1. Configurar Backend (Primeiro App)

### 1.1 Campo "Image"
```
mohameduyyyyyyy/amoras-backend:latest
```

**Ou sem a tag (usa latest automaticamente):**
```
mohameduyyyyyyy/amoras-backend
```

### 1.2 Campo "Username" (Opcional)
- **Deixe vazio** se a imagem for **Public**
- **Preencha** `mohameduyyyyyyy` se a imagem for **Private**

### 1.3 Campo "Password" (Opcional)
- **Deixe vazio** se a imagem for **Public**
- **Preencha** sua senha do Docker Hub se a imagem for **Private**

### 1.4 Expandir "Environment Variables"
Clique na seção "Environment Variables" e adicione:

```env
DATABASE_URL=postgresql://usuario:senha@nome-do-banco:5432/amoras_capital
JWT_SECRET=sua_chave_jwt_super_secreta_min_32_caracteres_aqui
JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=3001
CORS_ORIGINS=https://seu-dominio.com,https://www.seu-dominio.com
```

**Exemplo real:**
```env
DATABASE_URL=postgresql://amoras_user:senha123@amoras-db:5432/amoras_capital
JWT_SECRET=minha_chave_super_secreta_12345678901234567890
JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=3001
CORS_ORIGINS=https://app.exemplo.com
```

### 1.5 Expandir "Ports"
Adicione o mapeamento de porta:

```
3001:3001
```

**Formato:** `PORTA_EXTERNA:PORTA_INTERNA`

### 1.6 Expandir "Volumes" (Opcional)
Se precisar de volumes persistentes:

```
/app/uploads:/app/uploads
/app/logs:/app/logs
```

### 1.7 Expandir "Start Command" (Opcional)
**Deixe vazio** - a imagem já tem o comando padrão configurado.

### 1.8 Clicar em "Deploy"
Após preencher tudo, clique no botão **"Deploy"** (roxo).

---

## 🎨 2. Configurar Frontend (Segundo App)

### 2.1 Campo "Image"
```
mohameduyyyyyyy/amoras-frontend:latest
```

**Ou sem a tag:**
```
mohameduyyyyyyy/amoras-frontend
```

### 2.2 Campo "Username" (Opcional)
- **Deixe vazio** se a imagem for **Public**
- **Preencha** `mohameduyyyyyyy` se a imagem for **Private**

### 2.3 Campo "Password" (Opcional)
- **Deixe vazio** se a imagem for **Public**
- **Preencha** sua senha do Docker Hub se a imagem for **Private**

### 2.4 Expandir "Environment Variables"
Clique na seção "Environment Variables" e adicione:

```env
REACT_APP_API_URL=https://api.seu-dominio.com/api
NODE_ENV=production
GENERATE_SOURCEMAP=false
```

**Exemplo real:**
```env
REACT_APP_API_URL=https://api.exemplo.com/api
NODE_ENV=production
GENERATE_SOURCEMAP=false
```

**⚠️ IMPORTANTE:** Substitua `https://api.exemplo.com` pela URL real do seu backend no EasyPanel.

### 2.5 Expandir "Ports"
Adicione o mapeamento de porta:

```
8080:8080
```

**Formato:** `PORTA_EXTERNA:PORTA_INTERNA`

### 2.6 Expandir "Volumes" (Opcional)
**Deixe vazio** - o frontend não precisa de volumes.

### 2.7 Expandir "Start Command" (Opcional)
**Deixe vazio** - a imagem já tem o comando padrão configurado.

### 2.8 Clicar em "Deploy"
Após preencher tudo, clique no botão **"Deploy"** (roxo).

---

## 📝 3. Resumo Rápido

### Backend:
```
Image: mohameduyyyyyyy/amoras-backend:latest
Username: (vazio se public)
Password: (vazio se public)
Environment Variables:
  DATABASE_URL=postgresql://...
  JWT_SECRET=...
  PORT=3001
  NODE_ENV=production
Ports: 3001:3001
```

### Frontend:
```
Image: mohameduyyyyyyy/amoras-frontend:latest
Username: (vazio se public)
Password: (vazio se public)
Environment Variables:
  REACT_APP_API_URL=https://api.seu-dominio.com/api
  NODE_ENV=production
Ports: 8080:8080
```

---

## 🔗 4. Links das Imagens no Docker Hub

Após fazer o push, as imagens estarão disponíveis em:

- **Backend:** https://hub.docker.com/r/mohameduyyyyyyy/amoras-backend
- **Frontend:** https://hub.docker.com/r/mohameduyyyyyyy/amoras-frontend

---

## ⚠️ 5. Importante

1. **Ordem de Deploy:**
   - ✅ Primeiro: Banco de Dados (PostgreSQL)
   - ✅ Segundo: Backend
   - ✅ Terceiro: Frontend

2. **URL do Backend:**
   - Use o domínio/URL que o EasyPanel gerou para o backend
   - Exemplo: `https://amoras-backend-xxxxx.easypanel.host`
   - Ou seu domínio customizado: `https://api.exemplo.com`

3. **DATABASE_URL:**
   - Use o nome do serviço do banco de dados no EasyPanel
   - Exemplo: Se o banco se chama `amoras-db`, use `amoras-db:5432`

4. **CORS_ORIGINS:**
   - Deve incluir a URL do frontend
   - Exemplo: `https://app.exemplo.com,https://www.exemplo.com`

---

## 🚀 6. Verificar se Funcionou

Após o deploy:

1. **Backend Health Check:**
   - Acesse: `https://seu-backend-url/health`
   - Deve retornar: `{"status":"ok"}`

2. **Frontend:**
   - Acesse a URL do frontend
   - Deve carregar a tela de login

3. **Teste de Login:**
   - Tente fazer login
   - Se for o primeiro acesso, deve aparecer a opção de criar conta

---

## 🆘 7. Troubleshooting

### Erro: "Image not found"
- Verifique se o push foi feito corretamente
- Verifique se o nome da imagem está correto
- Acesse: https://hub.docker.com/r/mohameduyyyyyyy/amoras-backend

### Erro: "Cannot connect to database"
- Verifique o `DATABASE_URL`
- Verifique se o banco está rodando
- Verifique se o nome do serviço está correto

### Frontend não carrega API
- Verifique `REACT_APP_API_URL`
- Verifique `CORS_ORIGINS` no backend
- Verifique se o backend está rodando

---

**Data:** 2025-01-22
**Status:** Guia completo para usar imagens Docker Hub no EasyPanel ✅

