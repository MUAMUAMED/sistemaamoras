# 🐳 Como Rodar o Sistema no Docker Desktop

Guia passo a passo para executar o sistema completo no Docker Desktop.

---

## ✅ Pré-requisitos

1. **Docker Desktop instalado e rodando**
   - Verifique se está rodando: procure pelo ícone do Docker na bandeja do sistema
   - Se não estiver, abra o Docker Desktop e aguarde até aparecer "Docker Desktop is running"

2. **Verificar instalação**
   ```powershell
   docker --version
   docker-compose --version
   ```

---

## 🚀 Opção 1: Rodar Sistema Completo (Recomendado)

Esta opção sobe todos os serviços: PostgreSQL, Backend, Frontend, Nginx e Redis.

### Passo 1: Preparar variáveis de ambiente

1. **Backend**: Copie o arquivo de exemplo e configure:
   ```powershell
   cd backend
   copy env.local.example .env
   ```
   
   Edite o arquivo `.env` e configure:
   ```
   DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/amoras_capital
   JWT_SECRET=sua_chave_jwt_super_secreta_aqui
   PORT=3001
   NODE_ENV=production
   ```

2. **Frontend**: Se necessário, configure as variáveis de ambiente do frontend.

### Passo 2: Build e iniciar todos os serviços

```powershell
# Na raiz do projeto
docker-compose up --build
```

**O que acontece:**
- ✅ Build das imagens do backend e frontend
- ✅ Criação do banco PostgreSQL
- ✅ Inicialização de todos os serviços
- ✅ Execução automática das migrations do Prisma

### Passo 3: Acessar o sistema

Após alguns minutos (aguarde os builds terminarem):

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Nginx**: http://localhost:80

### Passo 4: Ver logs

Para ver os logs de todos os serviços:
```powershell
docker-compose logs -f
```

Para ver logs de um serviço específico:
```powershell
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Passo 5: Parar o sistema

```powershell
# Parar containers (mantém dados)
docker-compose down

# Parar e remover volumes (limpa banco de dados)
docker-compose down -v
```

---

## 🔧 Opção 2: Rodar Apenas Backend + PostgreSQL

Se você só quer testar o backend:

### Passo 1: Criar arquivo docker-compose simplificado

Crie um arquivo `docker-compose.dev.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: amoras-postgres
    environment:
      POSTGRES_DB: amoras_capital
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - amoras-network

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: amoras-backend
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:postgres123@postgres:5432/amoras_capital
      JWT_SECRET: sua_chave_jwt_super_secreta_aqui
      PORT: 3001
    ports:
      - "3001:3001"
    depends_on:
      - postgres
    networks:
      - amoras-network
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs

volumes:
  postgres_data:

networks:
  amoras-network:
    driver: bridge
```

### Passo 2: Rodar

```powershell
docker-compose -f docker-compose.dev.yml up --build
```

---

## 🧪 Opção 3: Usar Scripts de Teste

O projeto já tem scripts PowerShell prontos:

### Teste rápido (apenas build):
```powershell
.\test-docker-build.ps1
```

### Teste completo (build + execução):
```powershell
.\test-vps-local.ps1
```

---

## 📋 Comandos Úteis

### Ver containers rodando
```powershell
docker ps
```

### Ver todas as imagens
```powershell
docker images
```

### Entrar no container
```powershell
# Backend
docker exec -it amoras-backend sh

# PostgreSQL
docker exec -it amoras-postgres psql -U postgres -d amoras_capital
```

### Rebuild sem cache
```powershell
docker-compose build --no-cache
docker-compose up
```

### Limpar tudo (containers, imagens, volumes)
```powershell
# Cuidado: isso remove TUDO!
docker-compose down -v
docker system prune -a --volumes
```

### Ver uso de recursos
```powershell
docker stats
```

---

## ❓ Problemas Comuns

### 1. Porta já em uso
```
Error: bind: address already in use
```

**Solução:**
- Pare o serviço que está usando a porta
- Ou mude a porta no `docker-compose.yml`

### 2. Docker não está rodando
```
Cannot connect to the Docker daemon
```

**Solução:**
- Abra o Docker Desktop
- Aguarde até aparecer "Docker Desktop is running"

### 3. Erro de permissão
```
permission denied
```

**Solução:**
- Execute PowerShell como Administrador
- Ou verifique permissões do Docker Desktop

### 4. Build falha
```
npm ERR! code ERESOLVE
```

**Solução:**
- Verifique se o Dockerfile está correto
- Tente: `docker-compose build --no-cache`

### 5. Banco não conecta
```
Error: connect ECONNREFUSED
```

**Solução:**
- Aguarde alguns segundos (PostgreSQL demora para iniciar)
- Verifique se o container do postgres está rodando: `docker ps`
- Verifique logs: `docker-compose logs postgres`

---

## 🎯 Fluxo Recomendado

1. **Primeira vez:**
   ```powershell
   docker-compose up --build
   ```
   Aguarde os builds terminarem (pode demorar alguns minutos)

2. **Próximas vezes:**
   ```powershell
   docker-compose up
   ```
   (Mais rápido, usa cache)

3. **Após mudanças no código:**
   ```powershell
   docker-compose up --build
   ```
   (Rebuild para pegar as mudanças)

4. **Para parar:**
   ```powershell
   docker-compose down
   ```

---

## 📚 Próximos Passos

- ✅ Sistema rodando localmente
- 📖 Veja [COMO-TESTAR-VPS-LOCAL.md](./COMO-TESTAR-VPS-LOCAL.md) para testar antes do deploy
- 🚀 Veja [GUIA_INSTALACAO_VPS_EASYPANEL.md](./GUIA_INSTALACAO_VPS_EASYPANEL.md) para deploy no VPS

---

## 💡 Dicas

- **Primeira execução**: Pode demorar 5-10 minutos (download de imagens e builds)
- **Próximas execuções**: Muito mais rápido (usa cache)
- **Logs**: Sempre verifique os logs se algo não funcionar
- **Recursos**: Docker Desktop usa bastante RAM, feche outros programas se necessário

