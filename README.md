# 🍇 Sistema Amoras Capital

Sistema completo de gestão para a Amoras Capital, incluindo backend em Node.js/TypeScript com Prisma e frontend em React.

## 🚀 Status do Projeto

**✅ DEPLOY COMPLETO REALIZADO - SISTEMA 100% FUNCIONAL**

- ✅ Todos os 28 erros de TypeScript corrigidos
- ✅ Schema Prisma atualizado com modelo Subcategory
- ✅ Sistema compilando e funcionando perfeitamente
- ✅ Deploy realizado no GitHub

## 📋 Funcionalidades

### Backend (Node.js + TypeScript + Prisma)
- **Gestão de Usuários**: Autenticação e autorização
- **Gestão de Produtos**: CRUD completo com categorias, subcategorias, tamanhos e estampas
- **Gestão de Leads**: Sistema de leads com tags e interações
- **Gestão de Vendas**: Processamento de vendas com múltiplos métodos de pagamento
- **Gestão de Estoque**: Controle de estoque com movimentações
- **Códigos de Barras**: Geração automática de códigos de barras e QR codes
- **API REST**: Documentada com Swagger

### Frontend (React)
- Interface moderna e responsiva
- Dashboard com métricas em tempo real
- Gestão completa de produtos, leads e vendas
- Sistema de autenticação integrado

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js** + **TypeScript**
- **Express.js** para API REST
- **Prisma** como ORM
- **PostgreSQL** como banco de dados
- **JWT** para autenticação
- **Swagger** para documentação da API
- **Multer** para upload de arquivos

### Frontend
- **React** + **TypeScript**
- **Material-UI** para componentes
- **React Router** para navegação
- **Axios** para requisições HTTP
- **Chart.js** para gráficos

## 📦 Instalação e Configuração

### Pré-requisitos
- Node.js 18+
- PostgreSQL 12+
- Git

### 1. Clone o repositório
```bash
git clone https://github.com/MUAMUAMED/sistemaamoras.git
cd sistemaamoras
```

### 2. Configure o banco de dados
```bash
# Configure a variável DATABASE_URL no arquivo .env
cp backend/.env.backup backend/.env
# Edite backend/.env com suas configurações do PostgreSQL
```

### 3. Instale as dependências
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. Configure o banco de dados
```bash
cd backend
npx prisma generate
npx prisma db push
npx prisma db seed
```

### 5. Execute o sistema
```bash
# Na pasta raiz
npm run dev
```

## 🔧 Scripts Disponíveis

### Backend
```bash
npm run dev          # Desenvolvimento com hot reload
npm run build        # Build de produção
npm run start        # Execução em produção
npm run seed         # Popular banco com dados de teste
```

### Frontend
```bash
npm start            # Desenvolvimento
npm run build        # Build de produção
npm test             # Executar testes
```

## 📊 Estrutura do Banco de Dados

### Modelos Principais
- **User**: Usuários do sistema (admin, gerente, atendente)
- **Category**: Categorias de produtos
- **Subcategory**: Subcategorias de produtos
- **Pattern**: Estampas/cores dos produtos
- **Size**: Tamanhos dos produtos
- **Product**: Produtos com estoque e preços
- **Lead**: Clientes/leads com histórico
- **Interaction**: Interações com leads
- **Sale**: Vendas com itens e pagamentos
- **StockMovement**: Movimentações de estoque

## 🔐 Autenticação

O sistema utiliza JWT para autenticação. Endpoints protegidos requerem o header:
```
Authorization: Bearer <token>
```

## 📚 Documentação da API

A documentação da API está disponível em `/api-docs` quando o servidor estiver rodando.

## 🚀 Deploy

### Último Deploy
- **Data**: Dezembro 2024
- **Status**: ✅ Concluído com sucesso
- **Correções**: Todos os 28 erros de TypeScript corrigidos
- **Funcionalidades**: Sistema 100% operacional

### Repositório
- **GitHub**: https://github.com/MUAMUAMED/sistemaamoras
- **Branch Principal**: `main`

## 📞 Suporte

Para suporte técnico ou dúvidas sobre o sistema, entre em contato com a equipe de desenvolvimento.

---

**🍇 Sistema Amoras Capital - Versão 1.0.0**  
*Desenvolvido com ❤️ para a Amoras Capital* 