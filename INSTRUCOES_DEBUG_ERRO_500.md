# 🚨 INSTRUÇÕES DE DEBUG - Erro 500 Produtos

## 🎯 SITUAÇÃO ATUAL
- Erro 500 persiste na listagem de produtos mesmo após correções
- Produtos existem no banco mas não carregam no frontend
- Precisa fazer REDEPLOY e verificar logs

---

## 🚀 PASSO 1: REDEPLOY URGENTE

**No EasyPanel:**
1. Vá para **Backend Service**
2. Clique em **"Deploy"** ou **"Redeploy"**
3. ⏱️ **Aguarde completar** (2-3 minutos)
4. ✅ **Aguarde status "Running"**

---

## 🔍 PASSO 2: VERIFICAR LOGS

**Após o redeploy, verifique os logs do backend:**

1. No EasyPanel → **Backend Service** → **"Logs"**
2. **Procure por estas mensagens** quando acessar `/api/products`:

### ✅ **Logs Esperados (Sistema OK):**
```
🔍 [PRODUCT LIST] Iniciando busca de produtos
🔌 [PRODUCT LIST] Testando conexão com banco...
✅ [PRODUCT LIST] Conexão com banco OK
📊 [PRODUCT LIST] Buscando produtos no banco...
✅ [PRODUCT LIST] Encontrados X produtos, retornando Y
🖼️ [PRODUCT LIST] Buscando imagens para Y produtos...
⚠️ [PRODUCT LIST] ProductImage table not found, returning empty images arrays
🎯 [PRODUCT LIST] Retornando Y produtos com imagens
```

### ❌ **Logs de Erro (Problema Identificado):**
```
💥 [PRODUCT LIST] Erro de conexão: [MENSAGEM]
💥 [PRODUCT LIST] Erro ao buscar produtos no banco: [MENSAGEM]
💥 [PRODUCT LIST] Erro geral: [MENSAGEM]
```

---

## 🧪 PASSO 3: TESTE MANUAL DA API

Execute este teste para verificar diretamente:

```bash
# Teste direto no servidor ou local
node teste-api-produtos.js
```

**Ou teste manual com curl:**
```bash
# 1. Fazer login
curl -X POST https://amoras-sistema-gew1.gbl2yq.easypanel.host/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@amorascapital.com","password":"admin123"}'

# 2. Usar o token para listar produtos
curl -X GET "https://amoras-sistema-gew1.gbl2yq.easypanel.host/api/products?page=1&limit=5" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## 🔧 PASSO 4: DIAGNÓSTICOS POSSÍVEIS

### 1. **Erro de Conexão Banco**
```
Logs: "Erro de conexão"
Solução: Verificar DATABASE_URL, restart PostgreSQL
```

### 2. **Problema Prisma Client**
```
Logs: "Cannot read properties" ou "is not a function"
Solução: Regenerar Prisma Client no container
```

### 3. **Tabela Inexistente**
```
Logs: "relation does not exist"
Solução: Executar migrations
```

### 4. **Timeout/Memory**
```
Logs: "timeout" ou sem logs
Solução: Restart container, verificar recursos
```

---

## 🎯 AÇÕES POR TIPO DE ERRO

### **Se erro de CONEXÃO:**
```bash
# No container do backend
npm run db:migrate
npx prisma generate
```

### **Se erro de TABELA:**
```bash
# Executar migration manual
npx prisma db push
```

### **Se Prisma Client corrompido:**
```bash
# Regenerar cliente
rm -rf node_modules/.prisma
npx prisma generate
```

---

## 📞 VERIFICAÇÃO FINAL

Após redeploy, teste:

1. **✅ Health check:** `GET /health`
2. **✅ Login:** `POST /api/auth/login`  
3. **✅ Produtos:** `GET /api/products`

**Status esperado:** Status 200 com lista de produtos

---

## 🚨 SE NADA FUNCIONAR

**Rollback de emergência:**
```bash
git revert HEAD~2  # Voltar 2 commits
git push origin main
```

**Depois redeploy com versão anterior estável.**

---

## 📋 COMMITS RECENTES
- `5c13860` - Debug logs extensivos
- `ae7c199` - Correção erro 500 
- `333e629` - Múltiplas imagens

**O problema deve aparecer nos logs após redeploy!** 🔍
