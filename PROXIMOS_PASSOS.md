# ✅ Próximos Passos para Finalizar o Sistema

Parabéns! O sistema foi criado com sucesso. Agora você precisa seguir estes passos para colocá-lo em funcionamento:

## 🚨 Passos Obrigatórios

### 1. Configurar o Banco de Dados PostgreSQL

**Opção A: Instalar PostgreSQL localmente**
```bash
# Download: https://www.postgresql.org/download/
# Após instalação, criar o banco:
createdb amoras_capital
```

**Opção B: Usar Docker (Recomendado)**
```bash
docker run --name postgres-amoras -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:13
docker exec -it postgres-amoras createdb -U postgres amoras_capital
```

### 2. Configurar Variáveis de Ambiente

Crie o arquivo `backend/.env` com base no `backend/env.example`:
```bash
cd backend
cp env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/amoras_capital?schema=public"
JWT_SECRET="sua-chave-secreta-jwt-muito-forte-aqui"
PORT=3001
NODE_ENV=development
```

### 3. Executar as Migrações do Banco

```bash
# A partir da pasta raiz do projeto
npm run db:migrate
npm run db:seed
```

### 4. Iniciar o Sistema

```bash
npm run dev
```

## 🌐 Acessar o Sistema

Após iniciar, acesse:
- **Frontend**: http://localhost:3000
- **Backend API**: http://https://amoras-sistema-gew1.gbl2yq.easypanel.host
- **Documentação**: http://https://amoras-sistema-gew1.gbl2yq.easypanel.host/api-docs

## 🔑 Fazer Login

Use uma das contas criadas automaticamente:
- **Admin**: admin@amorascapital.com / admin123
- **Atendente**: atendente@amorascapital.com / atendente123

## 📋 Verificar Funcionalidades

Após login, teste:
1. **Dashboard** - Visualize as métricas
2. **Leads** - Cadastre e gerencie leads
3. **Produtos** - Cadastre produtos com categorias
4. **Vendas** - Registre vendas
5. **Configurações** - Ajuste preferências

## 🔧 Resolução de Problemas

### Erro "Cannot find module"
```bash
# Reinstalar dependências
npm run install:all
```

### Erro de TypeScript no Frontend
```bash
cd frontend
npm install --legacy-peer-deps
```

### Erro de Conexão com Banco
```bash
# Verificar se PostgreSQL está rodando
psql -U postgres -l

# Testar conexão
psql -U postgres -d amoras_capital
```

### Erro de Porta em Uso
```bash
# Verificar processos na porta 3000/3001
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Matar processo se necessário
taskkill /PID <numero_do_pid> /F
```

## 🚀 Próximas Configurações (Opcional)

### 1. Configurar Integração com Chatwoot
- Cadastre-se no Chatwoot
- Configure webhook para `http://https://amoras-sistema-gew1.gbl2yq.easypanel.host/api/webhooks/chatwoot`
- Adicione o token no arquivo `.env`

### 2. Configurar Gateway de Pagamento
- Crie conta no Mercado Pago
- Obtenha access token
- Configure no arquivo `.env`

### 3. Configurar n8n para Automações
- Instale n8n: `npm install -g n8n`
- Execute: `n8n start`
- Configure workflows no http://localhost:5678

## 📞 Suporte

Se encontrar problemas:
1. Verifique o arquivo `CONFIGURACAO_BANCO.md`
2. Consulte os logs do sistema
3. Verifique se todas as dependências foram instaladas

## 🎉 Sistema Pronto!

Quando tudo estiver funcionando:
- ✅ Frontend carregando em localhost:3000
- ✅ Login funcionando
- ✅ Navegação entre páginas
- ✅ Dashboard mostrando dados
- ✅ CRUD de leads e produtos funcionando

**Parabéns! Seu sistema Amoras Capital está pronto para uso!** 🌸 