# 🚀 Amoras Capital - Backend API

Sistema de CRM e ERP para Amoras Capital - Backend Node.js com TypeScript, Prisma e PostgreSQL.

## 📋 Tecnologias

- **Node.js** 18+
- **TypeScript** 5.x
- **Express.js** 4.x
- **Prisma ORM** 5.x
- **PostgreSQL** 15+
- **JWT** Authentication
- **Swagger** Documentation

## 🛠️ Desenvolvimento Local

### Pré-requisitos
- Node.js 18+ 
- PostgreSQL 15+
- npm ou yarn

### Setup
```bash
# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env

# Executar migrations
npx prisma migrate dev

# Popular banco com dados iniciais
npx prisma db seed

# Iniciar servidor de desenvolvimento
npm run dev
```

### Variáveis de Ambiente (.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/amoras_capital"
JWT_SECRET="seu_jwt_secret_aqui"
NODE_ENV="development"
PORT=3001
```

## 🚀 Deploy em Produção

### EasyPanel/VPS

1. **Configurar PostgreSQL Database**
2. **Configurar variáveis de ambiente:**
```env
DATABASE_URL=postgresql://user:pass@host:5432/amoras_capital
JWT_SECRET=seu_jwt_super_secreto_32_chars_min
NODE_ENV=production
CORS_ORIGINS=https://app.exemplo.com
```

3. **Deploy usando Dockerfile.production**
4. **Executar migrations:**
```bash
npx prisma migrate deploy
npx prisma db seed
```

## 📚 API Documentation

- **Desenvolvimento:** http://https://amoras-sistema-gew1.gbl2yq.easypanel.host/api-docs
- **Produção:** https://api.exemplo.com/api-docs

## 🔍 Health Check

- **Endpoint:** `/health`
- **Desenvolvimento:** http://https://amoras-sistema-gew1.gbl2yq.easypanel.host/health
- **Produção:** https://api.exemplo.com/health

## 🗂️ Estrutura

```
src/
├── config/          # Configurações (DB, Logger)
├── middleware/      # Middlewares (Auth, Error)
├── routes/          # Rotas da API
├── services/        # Serviços de negócio
├── scripts/         # Scripts (Seed, etc)
└── index.ts         # Entrada da aplicação
```

## 🔐 Funcionalidades

- ✅ Autenticação JWT
- ✅ Gestão de Usuários
- ✅ CRM - Leads e Pipeline
- ✅ ERP - Produtos e Vendas
- ✅ Sistema de Codes/Barras
- ✅ Upload de Imagens
- ✅ Relatórios e Dashboard
- ✅ Integrações (Chatwoot, N8N)

## 📝 Scripts Disponíveis

```bash
npm run dev         # Desenvolvimento com hot reload
npm run build       # Build para produção
npm run start       # Iniciar servidor produção
npm run migrate:dev # Migrations desenvolvimento
npm run migrate:deploy # Deploy migrations produção
npm run db:seed     # Popular banco com dados
```

## 🛡️ Segurança

- Rate Limiting configurado
- CORS configurável
- Helmet para security headers
- Validação com Joi
- Sanitização de dados

## 📊 Monitoramento

- Health check endpoint
- Logs estruturados (Winston)
- Error tracking e handling

---

**Desenvolvido para Amoras Capital** 🌸 