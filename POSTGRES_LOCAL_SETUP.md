# 🐘 PostgreSQL Local - Setup e Teste

## 📋 OVERVIEW
Guia para configurar PostgreSQL localmente e testar o sistema antes do deploy.

## ✅ VERIFICAÇÃO DE COMPATIBILIDADE

### Sistema está 100% compatível com PostgreSQL:
- ✅ **Schema Prisma**: Configurado para PostgreSQL
- ✅ **Dependências**: @prisma/client v5.7.1 (suporta PostgreSQL)
- ✅ **Sintaxe SQL**: Toda compatível com PostgreSQL
- ✅ **Tipos de dados**: TEXT, TIMESTAMP(3), BOOLEAN (PostgreSQL nativo)

### ⚠️ **Problema Atual**: Apenas falta configurar DATABASE_URL

## 🚀 OPÇÃO 1: PostgreSQL com Docker (Recomendado)

### 1.1 Instalar Docker
```bash
# Baixe e instale Docker Desktop
# https://www.docker.com/products/docker-desktop/
```

### 1.2 Criar PostgreSQL Container
```bash
# Criar e executar PostgreSQL
docker run --name postgres-amoras \
  -e POSTGRES_USER=amoras \
  -e POSTGRES_PASSWORD=123456 \
  -e POSTGRES_DB=amoras_capital \
  -p 5432:5432 \
  -d postgres:15

# Verificar se está rodando
docker ps
```

### 1.3 Configurar .env no Backend
```bash
# Na pasta backend/, crie o arquivo .env
cd backend
cp env.example .env
```

Edite o arquivo `.env`:
```env
# PostgreSQL Local
DATABASE_URL="postgresql://amoras:123456@localhost:5432/amoras_capital"

# JWT
JWT_SECRET="meu_jwt_secret_super_seguro_min_32_chars"
JWT_EXPIRES_IN="7d"

# Server
NODE_ENV="development"
PORT=3001

# CORS
CORS_ORIGINS="http://localhost:3000"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000

# Uploads
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=5242880

# Logs
LOG_LEVEL="info"

# Company
COMPANY_NAME="Amoras Capital"
SALE_NUMBER_PREFIX="AC"
```

### 1.4 Executar Migrações
```bash
cd backend

# Gerar cliente Prisma
npx prisma generate

# Aplicar schema ao banco
npx prisma db push

# Popular com dados de teste
npx prisma db seed
```

### 1.5 Testar o Sistema
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm start
```

## 🛠️ OPÇÃO 2: PostgreSQL Nativo (Windows)

### 2.1 Instalar PostgreSQL
```bash
# Baixe PostgreSQL 15+
# https://www.postgresql.org/download/windows/
# Durante instalação:
# - Usuário: postgres
# - Senha: 123456
# - Porta: 5432
```

### 2.2 Criar Banco de Dados
```bash
# Abra cmd como administrador
psql -U postgres

# No terminal do PostgreSQL:
CREATE DATABASE amoras_capital;
CREATE USER amoras WITH PASSWORD '123456';
GRANT ALL PRIVILEGES ON DATABASE amoras_capital TO amoras;
\q
```

### 2.3 Configurar .env
Use a mesma configuração da Opção 1.

## 🐳 OPÇÃO 3: Docker Compose (Avançado)

### 3.1 Criar docker-compose.yml
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    container_name: postgres-amoras
    environment:
      POSTGRES_USER: amoras
      POSTGRES_PASSWORD: 123456
      POSTGRES_DB: amoras_capital
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 3.2 Executar
```bash
# Subir banco
docker-compose up -d

# Parar banco
docker-compose down
```

## ✅ VERIFICAÇÃO DE FUNCIONAMENTO

### Teste 1: Conexão com Banco
```bash
cd backend
npx prisma db push
# Deve mostrar: "Your database is now in sync with your schema"
```

### Teste 2: Backend Funcionando
```bash
cd backend
npm run dev
# Deve mostrar: "[INFO] Servidor rodando na porta 3001"
```

### Teste 3: APIs Respondendo
```bash
# Teste básico
curl http://localhost:3001/api/categories
# Deve retornar: []
```

### Teste 4: Frontend Conectando
```bash
cd frontend
npm start
# Abra: http://localhost:3000
# Não deve haver erros 500 no console
```

## 🔧 COMANDOS ÚTEIS

### PostgreSQL com Docker
```bash
# Parar container
docker stop postgres-amoras

# Iniciar container
docker start postgres-amoras

# Acessar terminal do PostgreSQL
docker exec -it postgres-amoras psql -U amoras -d amoras_capital

# Ver logs do container
docker logs postgres-amoras

# Remover container (CUIDADO: apaga dados)
docker rm -f postgres-amoras
```

### Prisma
```bash
# Visualizar banco no navegador
npx prisma studio

# Resetar banco (apaga tudo)
npx prisma migrate reset

# Verificar schema
npx prisma validate

# Aplicar mudanças
npx prisma db push
```

## 🚨 TROUBLESHOOTING

### Erro: "Environment variable not found: DATABASE_URL"
```bash
# Verifique se o arquivo .env existe
ls backend/.env

# Se não existir, crie:
cd backend
cp env.example .env
# Edite o arquivo .env com as configurações acima
```

### Erro: "Connection refused"
```bash
# Verifique se PostgreSQL está rodando
docker ps | grep postgres

# Se não estiver, inicie:
docker start postgres-amoras
```

### Erro: "Schema validation failed"
```bash
# Regenere o cliente Prisma
cd backend
npx prisma generate
```

### Frontend com erros 500
```bash
# Verifique se backend está rodando
curl http://localhost:3001/api/categories

# Verifique logs do backend
# Terminal onde rodou npm run dev
```

## 💡 DICAS

1. **Use Docker**: Mais fácil de configurar e limpar
2. **Mantenha dados**: Use volumes no Docker para persistir dados
3. **Teste migrações**: Sempre teste migrações localmente primeiro
4. **Backup**: Faça backup antes de mudanças grandes

## 🎯 RESULTADO ESPERADO
Após seguir este guia:
- ✅ PostgreSQL rodando localmente
- ✅ Backend conectando ao banco
- ✅ APIs funcionando (sem erros 500)
- ✅ Frontend carregando normalmente
- ✅ Sistema pronto para testes

---
**📋 Arquivo criado para resolver ambiente local de desenvolvimento** 