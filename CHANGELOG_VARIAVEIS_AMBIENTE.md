# Changelog - Ajustes de Variáveis de Ambiente

## Data: 2024

## 🎯 Objetivo
Remover todos os usos hardcoded de `localhost` e garantir que o sistema use **apenas variáveis de ambiente** configuráveis.

## ✅ Alterações Realizadas

### 1. **docker-compose.yml**
- ✅ Todas as variáveis agora usam `${VARIAVEL:-valor_padrao}` 
- ✅ Adicionado suporte para `APP_URL`
- ✅ Frontend agora recebe variáveis de ambiente no build via `args`
- ✅ Variáveis configuráveis:
  - `NODE_ENV`
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN`
  - `PORT`
  - `CORS_ORIGINS`
  - `APP_URL`
  - `REACT_APP_API_URL`
  - `VITE_API_URL`

### 2. **nginx/nginx.conf**
- ✅ Alterado `server_name localhost;` para `server_name _;`
- ✅ Agora aceita qualquer host (mais flexível para produção)

### 3. **docker-compose.test.yml**
- ✅ Todas as variáveis agora usam variáveis de ambiente com fallbacks
- ✅ Adicionado suporte para `APP_URL`

### 4. **frontend/vite.config.ts**
- ✅ Melhorado para verificar múltiplas variáveis de ambiente
- ✅ Agora verifica `VITE_API_URL` e `REACT_APP_API_URL`

### 5. **backend/src/config/env.ts**
- ✅ `APP_URL` agora só usa `localhost` como fallback em desenvolvimento
- ✅ Em produção, `APP_URL` DEVE ser definido (não usa fallback)

### 6. **backend/env.local.example**
- ✅ Adicionado suporte para variáveis de ambiente com fallbacks
- ✅ Documentação melhorada

### 7. **frontend/env.production.example**
- ✅ Documentação expandida e melhorada
- ✅ Exemplos mais claros de uso

### 8. **push-frontend.ps1**
- ✅ Agora lê variáveis de ambiente do sistema
- ✅ Usa `REACT_APP_API_URL` ou `VITE_API_URL` se disponíveis
- ✅ Fallback para `/api` se nenhuma estiver definida

### 9. **Documentação**
- ✅ Criado `VARIAVEIS_AMBIENTE.md` com documentação completa
- ✅ Criado este changelog

## 📋 Variáveis de Ambiente Principais

### Obrigatórias em Produção:
- `DATABASE_URL` - URL do banco de dados PostgreSQL
- `JWT_SECRET` - Chave secreta para JWT (mínimo 32 caracteres)
- `CORS_ORIGINS` - URLs permitidas (separadas por vírgula)
- `APP_URL` - URL completa da API (em produção)

### Recomendadas:
- `VITE_API_URL` ou `REACT_APP_API_URL` - URL da API para o frontend
- `NODE_ENV` - Ambiente (development/production)
- `PORT` - Porta do backend (padrão: 3001)

## 🚀 Como Usar

1. **Criar arquivo `.env` na raiz do projeto:**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=sua_chave_secreta_aqui_min_32_chars
CORS_ORIGINS=https://app.seudominio.com
APP_URL=https://api.seudominio.com
VITE_API_URL=https://api.seudominio.com/api
```

2. **Usar com docker-compose:**
```bash
docker-compose up --build
```

3. **O sistema agora usa as variáveis definidas no `.env`**

## ⚠️ Importante

- **NUNCA** commite arquivos `.env` com valores reais
- **SEMPRE** defina `CORS_ORIGINS` em produção
- **SEMPRE** defina `APP_URL` em produção
- **SEMPRE** use domínios reais em produção (não localhost)

## 🔍 Verificação

Para verificar se as variáveis estão sendo usadas:

```bash
# Ver configuração do docker-compose
docker-compose config

# Ver variáveis do backend
cd backend && node -e "require('dotenv').config(); console.log(process.env)"
```

## 📝 Arquivos Modificados

1. `docker-compose.yml`
2. `docker-compose.test.yml`
3. `nginx/nginx.conf`
4. `frontend/vite.config.ts`
5. `backend/src/config/env.ts`
6. `backend/env.local.example`
7. `frontend/env.production.example`
8. `push-frontend.ps1`

## 📄 Arquivos Criados

1. `VARIAVEIS_AMBIENTE.md` - Documentação completa
2. `CHANGELOG_VARIAVEIS_AMBIENTE.md` - Este arquivo

