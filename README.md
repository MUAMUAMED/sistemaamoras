# 🍇 Sistema Amoras Capital

Sistema completo de ERP/CRM/PDV desenvolvido para a Amoras Capital, integrando gestão de negócios, relacionamento com clientes e vendas em uma única plataforma.

## 🚀 Funcionalidades

### 📊 ERP (Enterprise Resource Planning)
- **Gestão de Produtos**: Cadastro, categorização, estoque e preços
- **Controle de Estoque**: Movimentações, alertas de estoque baixo
- **Gestão de Vendas**: PDV integrado, histórico de vendas
- **Relatórios**: Dashboard com métricas em tempo real

### 👥 CRM (Customer Relationship Management)
- **Gestão de Leads**: Pipeline completo de vendas
- **Kanban Board**: Visualização e gestão de leads por status
- **Interações**: Histórico completo de contatos
- **Automações**: Reativação de leads frios e detecção de abandonos

### 💳 PDV (Point of Sale)
- **Vendas Rápidas**: Interface otimizada para vendas
- **Múltiplos Pagamentos**: PIX, cartão, dinheiro
- **Integração com Maquininhas**: APIs para Stone, PagSeguro, Cielo
- **Scanner de Código de Barras**: Leitura automática de produtos

### 🔗 Integrações
- **Chatwoot**: Atendimento ao cliente via WhatsApp
- **n8n**: Automações e workflows
- **APIs de Pagamento**: Gateways de pagamento
- **Webhooks**: Integração com sistemas externos

## 🛠️ Tecnologias

### Backend
- **Node.js** com TypeScript
- **Express.js** para API REST
- **Prisma ORM** com PostgreSQL
- **Redis** para cache e sessões
- **JWT** para autenticação
- **Multer** para upload de arquivos

### Frontend
- **React** com TypeScript
- **Tailwind CSS** para estilização
- **React Router** para navegação
- **React Beautiful DnD** para drag & drop
- **Axios** para requisições HTTP

### Banco de Dados
- **PostgreSQL** como banco principal
- **Redis** para cache e filas

### DevOps
- **Docker** para containerização
- **EasyPanel** para deploy
- **GitHub** para versionamento

## 📦 Instalação

### Pré-requisitos
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Git

### Desenvolvimento Local

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/sistemaamoras.git
cd sistemaamoras
```

2. **Instale as dependências**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. **Configure as variáveis de ambiente**
```bash
# Backend (.env)
DATABASE_URL="postgresql://usuario:senha@localhost:5432/amoras_capital"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="seu_jwt_secret_aqui"
NODE_ENV="development"

# Frontend (.env)
REACT_APP_API_URL="http://localhost:3001"
```

4. **Configure o banco de dados**
```bash
cd backend
npx prisma migrate dev
npx prisma generate
npm run seed
```

5. **Inicie o sistema**
```bash
# Raiz do projeto
npm run dev
```

### Deploy em Produção

#### EasyPanel (Recomendado)

1. **Instale o EasyPanel na VPS**
```bash
curl -fsSL https://get.easypanel.io | sh
```

2. **Crie as aplicações no EasyPanel:**
   - **PostgreSQL** (porta 5432)
   - **Redis** (porta 6379)
   - **Backend** (porta 3001)
   - **Frontend** (porta 3002)
   - **n8n** (porta 5678)
   - **Chatwoot** (porta 3000)

3. **Configure as variáveis de ambiente** conforme documentação

#### Docker Compose

```bash
# Clone e configure
git clone https://github.com/seu-usuario/sistemaamoras.git
cd sistemaamoras

# Configure .env
cp .env.example .env
nano .env

# Deploy
docker-compose up -d
```

## 🏗️ Estrutura do Projeto

```
sistemaamoras/
├── backend/                 # API Node.js/Express
│   ├── src/
│   │   ├── config/         # Configurações
│   │   ├── middleware/     # Middlewares
│   │   ├── routes/         # Rotas da API
│   │   ├── services/       # Lógica de negócio
│   │   └── index.ts        # Entrada da aplicação
│   ├── prisma/             # Schema e migrações
│   └── uploads/            # Arquivos enviados
├── frontend/               # Aplicação React
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/          # Páginas da aplicação
│   │   ├── services/       # Serviços de API
│   │   ├── stores/         # Gerenciamento de estado
│   │   └── types/          # Tipos TypeScript
│   └── public/             # Arquivos estáticos
├── docs/                   # Documentação
└── scripts/                # Scripts de automação
```

## 🔧 Configuração

### Variáveis de Ambiente

#### Backend
```env
# Database
DATABASE_URL="postgresql://usuario:senha@localhost:5432/amoras_capital"
REDIS_URL="redis://localhost:6379"

# JWT 
JWT_SECRET="seu_jwt_secret_super_seguro"

# Server
PORT=3001
NODE_ENV="production"

# Uploads
UPLOAD_PATH="./uploads"
MAX_FILE_SIZE=5242880
```

#### Frontend
```env
REACT_APP_API_URL="http://localhost:3001"
REACT_APP_VERSION="1.0.0"
```

### Banco de Dados

O sistema usa Prisma ORM com PostgreSQL. Principais tabelas:

- **users**: Usuários do sistema
- **leads**: Clientes e prospects
- **products**: Produtos e estoque
- **sales**: Vendas e transações
- **interactions**: Histórico de interações
- **categories**: Categorias de produtos

## 🔌 Integrações

### Chatwoot
- Webhook para criação automática de leads
- Integração via n8n para automações

### n8n
- Workflows para automação de processos
- Integração com APIs externas
- Webhooks para eventos do sistema

### APIs de Pagamento
- Stone
- PagSeguro
- Cielo LIO

## 📊 APIs

### Autenticação
```http
POST /api/auth/login
POST /api/auth/register
GET /api/auth/me
```

### Leads
```http
GET /api/leads
POST /api/leads
PUT /api/leads/:id
GET /api/leads/pipeline
```

### Produtos
```http
GET /api/products
POST /api/products
PUT /api/products/:id
POST /api/products/upload
```

### Vendas
```http
GET /api/sales
POST /api/sales
GET /api/sales/:id
```

### Webhooks
```http
POST /api/webhooks/chatwoot
POST /api/webhooks/n8n/create-lead
POST /api/webhooks/payment
```

## 🚀 Deploy

### EasyPanel (Recomendado)
1. Instale o EasyPanel na VPS
2. Crie as aplicações conforme documentação
3. Configure as variáveis de ambiente
4. Deploy automático via Git

### Docker
```bash
docker-compose up -d
```

### Manual
```bash
npm run build
npm start
```

## 🔒 Segurança

- **JWT** para autenticação
- **CORS** configurado
- **Rate limiting** implementado
- **Validação** de dados com Joi
- **Logs** de auditoria
- **Backup** automático do banco

## 📈 Monitoramento

- **Logs** estruturados com Winston
- **Health checks** para APIs
- **Métricas** de performance
- **Alertas** de estoque baixo
- **Dashboard** de monitoramento

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

- **Email**: suporte@amorascapital.com
- **WhatsApp**: (11) 99999-9999
- **Documentação**: [docs.amorascapital.com](https://docs.amorascapital.com)

## 🏆 Status do Projeto

- ✅ Backend API completa
- ✅ Frontend React funcional
- ✅ Sistema de autenticação
- ✅ Gestão de leads (CRM)
- ✅ Gestão de produtos (ERP)
- ✅ Sistema de vendas (PDV)
- ✅ Integração Chatwoot
- ✅ Integração n8n
- ✅ Upload de imagens
- ✅ Dashboard com métricas
- ✅ Kanban de leads
- 🔄 Deploy automatizado
- 🔄 Testes automatizados
- 🔄 CI/CD pipeline

---

**Desenvolvido com ❤️ para Amoras Capital** 