# 🎨 Amoras Capital - Frontend

Sistema de CRM e ERP para Amoras Capital - Frontend React com TypeScript e Tailwind CSS.

## 📋 Tecnologias

- **React** 18+
- **TypeScript** 5.x
- **Tailwind CSS** 3.x
- **React Router** 6.x
- **React Query** (@tanstack/react-query)
- **Axios** para API calls
- **React Hot Toast** para notificações

## 🛠️ Desenvolvimento Local

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Backend API rodando

### Setup
```bash
# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env

# Iniciar servidor de desenvolvimento
npm start
```

### Variáveis de Ambiente (.env)
```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_API_TIMEOUT=30000
```

## 🚀 Deploy em Produção

### EasyPanel/VPS

1. **Configurar variáveis de ambiente:**
```env
REACT_APP_API_URL=https://api.exemplo.com/api
NODE_ENV=production
GENERATE_SOURCEMAP=false
```

2. **Deploy usando Dockerfile.production**
3. **Nginx configurado automaticamente**

## 🔍 Health Check

- **Endpoint:** `/health`
- **Desenvolvimento:** http://localhost:3000/health
- **Produção:** https://app.exemplo.com/health

## 🗂️ Estrutura

```
src/
├── components/      # Componentes reutilizáveis
├── pages/          # Páginas da aplicação
├── services/       # Serviços de API
├── stores/         # Estado global (Zustand)
├── types/          # Tipos TypeScript
├── App.tsx         # Componente principal
└── index.tsx       # Entrada da aplicação
```

## 🎯 Funcionalidades

### 📊 Dashboard
- Dashboard principal com navegação
- Dashboard ERP com métricas de produtos/vendas
- Dashboard CRM com métricas de leads

### 👥 CRM
- ✅ Gestão de Leads
- ✅ Pipeline Kanban
- ✅ Histórico de Interações
- ✅ Conversão de Leads

### 🏪 ERP
- ✅ Catálogo de Produtos
- ✅ Gestão de Categorias
- ✅ Gestão de Estampas/Padrões
- ✅ Gestão de Tamanhos
- ✅ Sistema de Vendas
- ✅ Scanner de Códigos de Barras

### 🔐 Autenticação
- ✅ Login/Logout
- ✅ Proteção de rotas
- ✅ Gerenciamento de sessão

## 📝 Scripts Disponíveis

```bash
npm start           # Desenvolvimento
npm run build       # Build para produção
npm test            # Executar testes
npm run eject       # Ejetar configuração (irreversível)
```

## 🎨 Interface

- Design responsivo
- Tema moderno e limpo
- Componentes acessíveis
- Navegação intuitiva
- Feedback visual (toasts, loading states)

## 🔗 Integração com Backend

- Axios configurado com interceptors
- Autenticação automática via JWT
- Error handling centralizado
- Cache inteligente com React Query
- Loading states automáticos

## 📱 Responsividade

- ✅ Desktop (1920px+)
- ✅ Laptop (1366px+)
- ✅ Tablet (768px+)
- ✅ Mobile (320px+)

## 🛡️ Segurança

- Proteção contra XSS
- Sanitização de dados
- Rotas protegidas
- Token JWT automático
- Logout em caso de token inválido

---

**Desenvolvido para Amoras Capital** 🌸 