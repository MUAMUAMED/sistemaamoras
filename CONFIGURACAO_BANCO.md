# Configuração do Banco de Dados PostgreSQL

## Instalação do PostgreSQL

### Windows
1. Baixe o PostgreSQL em: https://www.postgresql.org/download/windows/
2. Execute o instalador e siga as instruções
3. Anote a senha do usuário `postgres`

### Via Docker (Recomendado)
```bash
docker run --name postgres-amoras -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:13
```

## Configuração do Banco

1. **Criar o banco de dados:**
```sql
CREATE DATABASE amoras_capital;
```

2. **Configurar arquivo .env no backend:**
```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/amoras_capital?schema=public"

# JWT
JWT_SECRET="sua-chave-secreta-jwt-muito-forte-e-segura-aqui"

# Server
PORT=3001
NODE_ENV=development

# Chatwoot
CHATWOOT_URL="https://app.chatwoot.com"
CHATWOOT_WEBHOOK_SECRET="sua-chave-webhook-chatwoot"

# n8n
N8N_WEBHOOK_URL="http://localhost:5678/webhook"

# Payment Gateways
MERCADO_PAGO_ACCESS_TOKEN="seu-token-mercado-pago"
MERCADO_PAGO_WEBHOOK_SECRET="sua-chave-webhook-mercado-pago"

# Logs
LOG_LEVEL="info"
```

3. **Executar as migrações:**
```bash
cd backend
npm run db:migrate
npm run db:seed
```

## Comandos para Rodar o Sistema

1. **Instalar dependências:**
```bash
npm run install:all
```

2. **Rodar o sistema em desenvolvimento:**
```bash
npm run dev
```

3. **Acessar o sistema:**
- Frontend: http://localhost:3000
- Backend API: http://https://amoras-sistema-gew1.gbl2yq.easypanel.host
- Documentação API: http://https://amoras-sistema-gew1.gbl2yq.easypanel.host/api-docs

## Usuários de Teste

- **Admin:** admin@amorascapital.com / admin123
- **Atendente:** atendente@amorascapital.com / atendente123

## Verificação do Sistema

1. Acesse o frontend em http://localhost:3000
2. Faça login com as credenciais de teste
3. Teste as funcionalidades principais:
   - Dashboard com métricas
   - Gestão de leads
   - Cadastro de produtos
   - Registro de vendas
   - Configurações do sistema

## Solução de Problemas

### Erro de Conexão com o Banco
- Verifique se o PostgreSQL está rodando
- Confirme a URL de conexão no arquivo .env
- Teste a conexão: `psql -U postgres -d amoras_capital`

### Erro de Dependências
- Rode `npm install --legacy-peer-deps` no frontend
- Limpe o cache: `npm cache clean --force`

### Erro de Porta
- Verifique se as portas 3000 e 3001 estão livres
- Altere as portas no package.json se necessário 