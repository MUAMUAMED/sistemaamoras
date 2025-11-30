# 🏗️ Como Fazer Build do Frontend Corretamente

## ⚠️ Problema Resolvido

O frontend estava com URLs hardcoded (`http://localhost:3001/api`) no código compilado. Agora está corrigido para **sempre usar variáveis de ambiente**.

---

## ✅ Correções Aplicadas

### 1. **api.ts** - Removido hardcode
- ❌ Antes: `http://localhost:3001/api` hardcoded
- ✅ Agora: Sempre usa `REACT_APP_API_URL` ou `VITE_API_URL`

### 2. **Dockerfile** - Suporte a variáveis no build
- ✅ Adicionado `ARG` e `ENV` para passar variáveis no build time
- ✅ Variáveis são injetadas durante o `npm run build`

---

## 🚀 Como Fazer Build Corretamente

### Opção 1: Build Local (para testar)

```powershell
cd frontend

# Definir variável de ambiente
$env:REACT_APP_API_URL="https://seu-backend-url.com/api"
# ou
$env:VITE_API_URL="https://seu-backend-url.com/api"

# Build
npm run build
```

### Opção 2: Build com Docker (Recomendado)

```powershell
cd frontend

# Build com variável de ambiente
docker build \
  --build-arg REACT_APP_API_URL="https://seu-backend-url.com/api" \
  --build-arg NODE_ENV=production \
  -t amoras-frontend:latest .
```

**Ou usando VITE_API_URL:**
```powershell
docker build \
  --build-arg VITE_API_URL="https://seu-backend-url.com/api" \
  --build-arg NODE_ENV=production \
  -t amoras-frontend:latest .
```

### Opção 3: Build e Push para Docker Hub

```powershell
# Definir variáveis
$BACKEND_URL = "https://amoras-backend-xxxxx.zeabur.app"
$DOCKER_USER = "mohameduyyyyyy"

# Build com variável de ambiente
docker build `
  --build-arg REACT_APP_API_URL="$BACKEND_URL/api" `
  --build-arg NODE_ENV=production `
  -t $DOCKER_USER/amoras-frontend:latest `
  .

# Push
docker push $DOCKER_USER/amoras-frontend:latest
```

---

## 📋 Variáveis de Ambiente Suportadas

O frontend aceita **qualquer uma** dessas variáveis (em ordem de prioridade):

1. `REACT_APP_API_URL` (recomendado)
2. `VITE_API_URL` (alternativa)
3. `process.env.REACT_APP_API_URL` (fallback)

**Formato esperado:**
```
https://seu-backend-url.com/api
```
ou
```
https://seu-backend-url.com/api/
```

O código automaticamente adiciona `/api` se não estiver presente.

---

## 🔧 No Zeabur/EasyPanel

### Ao fazer deploy:

1. **Se usar imagem pré-buildada:**
   - A variável `REACT_APP_API_URL` deve ser passada **no build time** (não runtime)
   - Você precisa rebuildar a imagem com a variável correta

2. **Se o Zeabur faz o build:**
   - Configure `REACT_APP_API_URL` nas variáveis de ambiente **ANTES** do build
   - O Zeabur vai injetar no build automaticamente

### Variáveis de ambiente no Zeabur:

```
REACT_APP_API_URL=https://amoras-backend-xxxxx.zeabur.app/api
NODE_ENV=production
GENERATE_SOURCEMAP=false
```

**⚠️ IMPORTANTE:** Se você já fez build da imagem sem a variável, precisa rebuildar!

---

## 🔄 Rebuild Necessário

Se você já fez push da imagem sem a variável de ambiente:

1. **Rebuild com a variável correta:**
   ```powershell
   docker build `
     --build-arg REACT_APP_API_URL="https://amoras-backend-xxxxx.zeabur.app/api" `
     -t mohameduyyyyyy/amoras-frontend:latest `
     .
   ```

2. **Push novamente:**
   ```powershell
   docker push mohameduyyyyyy/amoras-frontend:latest
   ```

3. **Redeploy no Zeabur**

---

## ✅ Verificação

Após o build, você pode verificar se a URL está correta:

1. Abra o arquivo compilado: `frontend/dist/assets/index-*.js`
2. Procure por `REACT_APP_API_URL` ou `VITE_API_URL`
3. Verifique se a URL do backend está presente

**Ou teste no navegador:**
1. Abra o DevTools (F12)
2. Vá em Network
3. Faça uma requisição
4. Verifique se a URL está correta (não deve ser `localhost:3001`)

---

## 📝 Resumo

- ✅ Hardcode removido
- ✅ Dockerfile atualizado para suportar variáveis no build
- ✅ Sempre use `REACT_APP_API_URL` ou `VITE_API_URL` no build
- ✅ Rebuild necessário se já fez build sem a variável

**Data:** 2025-01-22
**Status:** Corrigido ✅

