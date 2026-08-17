# 🚀 Guia de Instalação - Sistema Amoras Capital

## 📋 Pré-requisitos
- Node.js v18+
- PostgreSQL v14+
- npm ou yarn

## 🔧 Instalação

### 1. Instalar dependências
```bash
npm run install:all
```

### 2. Configurar banco de dados
```bash
# Criar banco PostgreSQL
createdb amoras_capital

# Configurar .env no backend
cd backend
cp env.example .env
```

### 3. Executar migrações
```bash
cd backend
npm run db:migrate
npm run db:seed
```

### 4. Iniciar sistema
```bash
npm run dev
```

## 🌐 Acesso
- Frontend: http://localhost:3000
- API: http://https://amoras-sistema-gew1.gbl2yq.easypanel.host
- Documentação: http://https://amoras-sistema-gew1.gbl2yq.easypanel.host/api-docs

## 👤 Credenciais
- Admin: admin@amorascapital.com / admin123
- Atendente: atendente@amorascapital.com / atendente123

## 🐳 Docker
```bash
docker-compose up -d
``` 