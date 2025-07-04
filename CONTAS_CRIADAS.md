# Contas Criadas - Sistema Amoras Capital

## Usuários Criados pelo Seed

### 1. Administrador
- **Email**: admin@amorascapital.com
- **Senha**: admin123
- **Função**: ADMIN
- **Permissões**: Acesso total ao sistema

### 2. Atendente
- **Email**: atendente@amorascapital.com
- **Senha**: atendente123
- **Função**: ATTENDANT
- **Permissões**: Acesso limitado - leads, vendas, produtos

### 3. Gerente
- **Email**: gerente@amorascapital.com
- **Senha**: gerente123
- **Função**: MANAGER
- **Permissões**: Acesso médio - relatórios, configurações

## Dados Criados
- **Usuários**: 3
- **Categorias**: 6
- **Estampas**: 12
- **Tamanhos**: 7
- **Produtos**: 3
- **Leads**: 4
- **Interações**: 3
- **Vendas**: 1
- **Itens vendidos**: 2
- **Movimentações**: 2
- **Logs webhook**: 2

## Como Acessar
1. Acesse: http://localhost:3000
2. Use um dos emails e senhas acima
3. Faça login no sistema

## Funcionalidades por Perfil

### ADMIN
- Gerenciar usuários
- Configurações do sistema
- Todos os módulos ERP/CRM
- Relatórios completos

### MANAGER
- Gerenciar produtos
- Gerenciar leads
- Relatórios de vendas
- Configurações limitadas

### ATTENDANT
- Visualizar produtos
- Gerenciar leads
- Processar vendas
- Scanner de produtos

## Comandos Úteis

```bash
# Executar seed novamente (se necessário)
cd backend
npm run db:seed

# Verificar banco de dados
npm run db:studio

# Executar sistema completo
npm run dev
```

Data de criação: 07/01/2025 