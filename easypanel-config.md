# 🚀 Configuração EasyPanel - Sistema Amoras Capital

## 📋 Pré-requisitos

1. **VPS com Ubuntu/Debian**
2. **EasyPanel instalado**
3. **Domínio configurado (opcional)**

## 🔧 Instalação do EasyPanel

```bash
# Conectar na VPS
ssh usuario@IP_DA_VPS

# Instalar EasyPanel
curl -fsSL https://get.easypanel.io | sh

# Acessar o painel
# http://IP_DA_VPS:3000
```

## 🏗️ Configuração das Aplicações

### 1. PostgreSQL Database

**Configurações:**
- **Nome:** `amoras-postgres`
- **Tipo:** Database
- **Versão:** 15
- **Porta:** 5432

**Variáveis de Ambiente:**
```env
POSTGRES_DB=amoras_capital
POSTGRES_USER=amoras_user
POSTGRES_PASSWORD=Amoras2024!@#
```

### 2. Redis Database

**Configurações:**
- **Nome:** `amoras-redis`
- **Tipo:** Database
- **Versão:** 7-alpine
- **Porta:** 6379

### 3. Backend API

**Configurações:**
- **Nome:** `amoras-backend`
- **Tipo:** App
- **Porta:** 3001
- **Repositório:** `https://github.com/seu-usuario/sistemaamoras.git`
- **Branch:** `main`
- **Pasta:** `backend`

**Build Command:**
```bash
npm ci
npx prisma generate
```

**Start Command:**
```bash
npm start
```

**Variáveis de Ambiente:**
```env
DATABASE_URL=postgresql://amoras_user:Amoras2024!@#@amoras-postgres:5432/amoras_capital
REDIS_URL=redis://amoras-redis:6379
JWT_SECRET=amoras_jwt_secret_super_seguro_2024
NODE_ENV=production
PORT=3001
```

**Volumes:**
- `./uploads:/app/uploads`
- `./logs:/app/logs`

### 4. Frontend React

**Configurações:**
- **Nome:** `amoras-frontend`
- **Tipo:** App
- **Porta:** 3002
- **Repositório:** `https://github.com/seu-usuario/sistemaamoras.git`
- **Branch:** `main`
- **Pasta:** `frontend`

**Build Command:**
```bash
npm ci
npm run build
```

**Start Command:**
```bash
npm start
```

**Variáveis de Ambiente:**
```env
REACT_APP_API_URL=http://IP_DA_VPS:3001
PORT=3002
```

### 5. n8n

**Configurações:**
- **Nome:** `amoras-n8n`
- **Tipo:** App
- **Porta:** 5678
- **Imagem:** `n8nio/n8n`

**Variáveis de Ambiente:**
```env
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=AmorasN8N2024!@#
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=http
WEBHOOK_URL=http://IP_DA_VPS:5678
GENERIC_TIMEZONE=America/Sao_Paulo
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=amoras-postgres
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=amoras_user
DB_POSTGRESDB_PASSWORD=Amoras2024!@#
```

### 6. Chatwoot

**Configurações:**
- **Nome:** `amoras-chatwoot`
- **Tipo:** App
- **Porta:** 3000
- **Imagem:** `chatwoot/chatwoot:latest`

**Variáveis de Ambiente:**
```env
INSTALLATION_NAME=Amoras Capital
DEFAULT_LOCALE=pt
SECRET_KEY_BASE=amoras_chatwoot_secret_2024_super_seguro
FRONTEND_URL=http://IP_DA_VPS:3000
POSTGRES_HOST=amoras-postgres
POSTGRES_USERNAME=amoras_user
POSTGRES_PASSWORD=Amoras2024!@#
POSTGRES_DATABASE=chatwoot
REDIS_URL=redis://amoras-redis:6379
REDIS_SIDEKIQ_URL=redis://amoras-redis:6379
```

## 🔄 Ordem de Deploy

1. **PostgreSQL** (aguardar estar online)
2. **Redis** (aguardar estar online)
3. **Backend** (aguardar estar online)
4. **Frontend** (aguardar estar online)
5. **n8n** (aguardar estar online)
6. **Chatwoot** (aguardar estar online)

## 🗄️ Configuração do Banco

Após o backend estar online:

1. **Acesse os logs do backend**
2. **Execute as migrações:**
```bash
# No terminal do EasyPanel (backend)
npx prisma migrate deploy
npx prisma generate
npm run seed
```

## 🔗 URLs de Acesso

- **Sistema ERP/CRM:** `http://IP_DA_VPS:3002`
- **n8n:** `http://IP_DA_VPS:5678`
- **Chatwoot:** `http://IP_DA_VPS:3000`

## 🔐 Credenciais Padrão

### Sistema ERP/CRM
- **Email:** `admin@amorascapital.com`
- **Senha:** `senha123`

### n8n
- **Usuário:** `admin`
- **Senha:** `AmorasN8N2024!@#`

## 🔧 Configuração de Domínio (Opcional)

### 1. Configurar DNS
```
A    sistema.seu-dominio.com    → IP_DA_VPS
A    n8n.seu-dominio.com        → IP_DA_VPS
A    chat.seu-dominio.com       → IP_DA_VPS
```

### 2. Configurar Proxy Reverso
No EasyPanel, configure proxy reverso para cada aplicação:

**Sistema:**
- **Domínio:** `sistema.seu-dominio.com`
- **Porta:** `3002`

**n8n:**
- **Domínio:** `n8n.seu-dominio.com`
- **Porta:** `5678`

**Chatwoot:**
- **Domínio:** `chat.seu-dominio.com`
- **Porta:** `3000`

## 🔍 Troubleshooting

### Problemas Comuns

1. **Backend não conecta ao banco:**
   - Verifique se PostgreSQL está online
   - Confirme as variáveis de ambiente
   - Verifique os logs do backend

2. **Frontend não carrega:**
   - Verifique se o backend está online
   - Confirme a URL da API no frontend
   - Verifique os logs do frontend

3. **n8n não inicia:**
   - Verifique se PostgreSQL está online
   - Confirme as variáveis de ambiente
   - Verifique os logs do n8n

4. **Chatwoot não inicia:**
   - Verifique se PostgreSQL e Redis estão online
   - Confirme as variáveis de ambiente
   - Verifique os logs do Chatwoot

### Logs Úteis

```bash
# Ver logs do backend
docker logs amoras-backend

# Ver logs do frontend
docker logs amoras-frontend

# Ver logs do n8n
docker logs amoras-n8n

# Ver logs do Chatwoot
docker logs amoras-chatwoot
```

## 📞 Suporte

Se encontrar problemas:

1. **Verifique os logs** de cada aplicação
2. **Confirme as variáveis** de ambiente
3. **Teste as conexões** entre serviços
4. **Consulte a documentação** do EasyPanel

---

**Configuração concluída! 🎉** 