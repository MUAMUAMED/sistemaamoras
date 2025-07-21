# Sistema Amoras Capital - Guia Completo

## 🚀 Início Rápido

### Primeira Configuração

1. **Instalar Docker Desktop**
   - Baixe e instale o [Docker Desktop](https://www.docker.com/products/docker-desktop/)
   - Inicie o Docker Desktop

2. **Configurar Ambiente**
   ```bash
   configurar-ambiente.bat
   ```

3. **Inicializar Banco de Dados**
   ```bash
   inicializar-banco.bat
   ```

4. **Iniciar Sistema Completo**
   ```bash
   iniciar-sistema-completo.bat
   ```

### Uso Diário

- **Menu Principal**: `menu-principal-completo.bat`
- **Iniciar Sistema**: `iniciar-sistema-completo.bat`
- **Parar Sistema**: `parar-sistema.bat`
- **Ver Logs**: `ver-logs.bat`
- **Testar Sistema**: `teste-sistema-completo.bat`

## 📋 Scripts Disponíveis

### Scripts Principais
- `menu-principal-completo.bat` - Menu interativo para gerenciar o sistema
- `iniciar-sistema-completo.bat` - Inicia todos os serviços via Docker
- `parar-sistema.bat` - Para todos os serviços
- `teste-sistema-completo.bat` - Testa se todos os serviços estão funcionando

### Scripts de Configuração
- `configurar-ambiente.bat` - Configura o arquivo .env do backend
- `inicializar-banco.bat` - Inicializa o banco PostgreSQL e executa migrações

### Scripts de Monitoramento
- `ver-logs.bat` - Visualiza logs dos serviços
- `menu-principal-completo.bat` - Opção 7 para ver status dos serviços

## 🗄️ Arquitetura do Sistema

### Serviços Docker
- **PostgreSQL** (porta 5432) - Banco de dados principal
- **Backend** (porta 3001) - API Node.js/Express
- **Frontend** (porta 3000) - React/TypeScript
- **Redis** (porta 6379) - Cache e sessões
- **Nginx** (porta 80) - Proxy reverso

### URLs de Acesso
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Nginx**: http://localhost:80
- **API Docs**: http://localhost:3001/api-docs

## 🔐 Credenciais de Teste

### Usuários Padrão
- **Admin**: admin@amorascapital.com / admin123
- **Atendente**: atendente@amorascapital.com / atendente123

## 🛠️ Comandos Docker Úteis

### Verificar Status
```bash
docker-compose ps
```

### Ver Logs
```bash
# Todos os serviços
docker-compose logs -f

# Serviço específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Reiniciar Serviços
```bash
# Reiniciar todos
docker-compose restart

# Reiniciar serviço específico
docker-compose restart backend
```

### Limpar Dados
```bash
# Parar e remover containers
docker-compose down

# Parar, remover containers e volumes (CUIDADO!)
docker-compose down -v
```

## 🔧 Solução de Problemas

### Banco de Dados Não Inicia
1. Verifique se o Docker está rodando
2. Execute: `inicializar-banco.bat`
3. Verifique logs: `docker-compose logs postgres`

### Backend Não Conecta ao Banco
1. Verifique se o PostgreSQL está rodando: `docker-compose ps postgres`
2. Teste conexão: `docker-compose exec postgres pg_isready -U postgres`
3. Verifique arquivo .env: `type backend\.env`

### Frontend Não Carrega
1. Verifique se o backend está rodando: `docker-compose ps backend`
2. Teste API: `curl http://localhost:3001/health`
3. Verifique logs: `docker-compose logs frontend`

### Portas Ocupadas
1. Pare todos os serviços: `parar-sistema.bat`
2. Mate processos nas portas: `kill-ports.bat`
3. Reinicie: `iniciar-sistema-completo.bat`

## 📁 Estrutura de Arquivos

```
sistemaamoras/
├── backend/                 # API Node.js
│   ├── .env                # Configurações do backend
│   ├── src/                # Código fonte
│   └── prisma/             # Schema e migrações do banco
├── frontend/               # React/TypeScript
├── nginx/                  # Configuração do proxy
│   ├── nginx.conf
│   └── ssl/
├── docker-compose.yml      # Configuração dos serviços
└── *.bat                   # Scripts de gerenciamento
```

## 🔄 Fluxo de Desenvolvimento

### Modo Desenvolvimento
1. Use `inicializar-banco.bat` para ter apenas o banco rodando
2. Use `iniciar-sistema.bat` para rodar backend/frontend localmente
3. Modifique código e veja mudanças em tempo real

### Modo Produção
1. Use `iniciar-sistema-completo.bat` para rodar tudo via Docker
2. Todas as mudanças precisam rebuildar as imagens

## 📝 Logs e Debug

### Ver Logs em Tempo Real
```bash
# Todos os serviços
docker-compose logs -f

# Serviço específico
docker-compose logs -f backend
```

### Acessar Container
```bash
# Backend
docker-compose exec backend sh

# Banco de dados
docker-compose exec postgres psql -U postgres -d amoras_capital
```

## 🚨 Problemas Comuns

### Erro: "Docker não está instalado"
- Instale o Docker Desktop
- Inicie o Docker Desktop
- Aguarde o ícone ficar verde

### Erro: "Porta já em uso"
- Execute `kill-ports.bat`
- Ou pare outros serviços que usem as portas 3000, 3001, 5432

### Erro: "Banco de dados não conecta"
- Verifique se o PostgreSQL está rodando
- Execute `inicializar-banco.bat`
- Verifique o arquivo `.env` do backend

### Erro: "Containers não iniciam"
- Verifique se há espaço em disco
- Reinicie o Docker Desktop
- Execute `docker-compose down` e depois `iniciar-sistema-completo.bat` 