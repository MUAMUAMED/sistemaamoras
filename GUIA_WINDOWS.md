# Guia de Instalação - Windows

## Sistema ERP/CRM Amoras Capital

### Pré-requisitos

1. **Node.js** (versão 18 ou superior)
   - Download: https://nodejs.org/
   - Instalar com todas as opções padrão

2. **PostgreSQL** (versão 12 ou superior)
   - Download: https://www.postgresql.org/download/windows/
   - Configurar com usuário `postgres` e senha `postgres`

3. **Git** (opcional, para clonar o repositório)
   - Download: https://git-scm.com/download/windows

### Instalação

1. **Baixar o projeto** (se não tiver Git)
   - Fazer download do ZIP do projeto
   - Extrair para uma pasta (ex: `C:\sistemaamoras`)

2. **Configurar banco de dados**
   ```sql
   -- Conectar no PostgreSQL como usuário postgres
   CREATE DATABASE amoras_capital;
   CREATE USER amoras_user WITH PASSWORD 'amoras_password';
   GRANT ALL PRIVILEGES ON DATABASE amoras_capital TO amoras_user;
   ```

3. **Instalar dependências**
   
   **Backend:**
   ```powershell
   cd backend
   npm install
   ```

   **Frontend:**
   ```powershell
   cd frontend
   npm install
   ```

4. **Configurar variáveis de ambiente**
   - Copiar `backend/env.example` para `backend/.env`
   - Ajustar as configurações no arquivo `.env`

5. **Configurar banco de dados**
   ```powershell
   cd backend
   npx prisma migrate dev
   npm run seed
   ```

### Executando o Sistema

#### Opção 1: Scripts Batch (Recomendado)
```powershell
# Executar backend
.\run-backend.bat

# Executar frontend (em outra janela)
.\run-frontend.bat

# Ou iniciar ambos automaticamente
.\start-system.bat
```

#### Opção 2: PowerShell Script
```powershell
# Permitir execução de scripts PowerShell (uma vez)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Executar script
.\iniciar-sistema.ps1
```

#### Opção 3: Comandos Manuais
```powershell
# Backend (terminal 1)
cd backend
npm run dev

# Frontend (terminal 2)
cd frontend
npm start
```

### Acessando o Sistema

- **Frontend:** http://localhost:3000
- **Backend:** http://https://amoras-sistema-gew1.gbl2yq.easypanel.host
- **API Docs:** http://https://amoras-sistema-gew1.gbl2yq.easypanel.host/api-docs

### Usuários Padrão

```
Administrador:
Email: admin@amorascapital.com
Senha: admin123

Atendente:
Email: atendente@amorascapital.com
Senha: atendente123
```

### Problemas Comuns

#### 1. Erro "&&" não reconhecido
**Solução:** Use os scripts `.bat` ou `.ps1` fornecidos

#### 2. Erro TypeScript no frontend
**Solução:** Já corrigido na versão atual

#### 3. Porta ocupada
**Solução:** 
```powershell
# Verificar processos nas portas
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Matar processo se necessário
taskkill /PID <PID> /F
```

#### 4. Erro de conexão com banco
**Solução:** Verificar se PostgreSQL está rodando
```powershell
# Verificar serviços
Get-Service postgresql*
```

### Estrutura do Projeto

```
sistemaamoras/
├── backend/          # API Node.js + TypeScript
├── frontend/         # React + TypeScript
├── run-backend.bat   # Script para backend
├── run-frontend.bat  # Script para frontend
├── start-system.bat  # Script para ambos
├── iniciar-sistema.ps1 # Script PowerShell
└── README.md         # Documentação completa
```

### Funcionalidades Implementadas

#### ERP (Sistema de Gestão)
- ✅ Produtos com código TTCCEEEE
- ✅ Códigos de barras EAN-13
- ✅ QR codes para produtos
- ✅ Controle de estoque
- ✅ Scanner de vendas
- ✅ Gateways de pagamento

#### CRM (Gestão de Relacionamento)
- ✅ Pipeline com 8 status
- ✅ Sistema de scoring
- ✅ Gestão de interações
- ✅ Integração Chatwoot
- ✅ Automações inteligentes

#### Automações
- ✅ ERP ↔ CRM integrados
- ✅ Atualização automática de leads
- ✅ Controle de estoque automático
- ✅ Scoring baseado em comportamento
- ✅ Reativação de leads frios

### Suporte

Para problemas específicos:
1. Verificar logs em `backend/logs/`
2. Consultar documentação da API
3. Verificar configurações no `.env`

### Próximos Passos

1. Configurar Chatwoot (opcional)
2. Configurar gateways de pagamento
3. Personalizar layout da loja
4. Adicionar produtos reais
5. Treinar equipe no sistema 