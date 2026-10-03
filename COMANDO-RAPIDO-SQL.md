# ⚡ Comando Rápido para Criar Usuário no PostgreSQL

## 🚀 Opção 1: Script PowerShell (Mais Fácil)

```powershell
.\criar-usuario-terminal.ps1
```

---

## 📝 Opção 2: Comando Manual (Copie e Cole)

### Passo 1: Gerar hash bcrypt da senha

```powershell
# Substitua "sua-senha-123" pela senha que você quer
docker exec amoras-backend node -e "const bcrypt=require('bcryptjs');bcrypt.hash('sua-senha-123',10).then(h=>console.log(h));"
```

**Copie o hash que aparecer** (algo como: `$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy`)

### Passo 2: Inserir no banco

```powershell
# Substitua:
# - "teste@test.com" pelo email desejado
# - "COLE_O_HASH_AQUI" pelo hash gerado no passo 1

docker exec -i amoras-postgres psql -U postgres -d amoras_capital -c "INSERT INTO users (id, name, email, password, role, active, \"createdAt\", \"updatedAt\") VALUES ('cl' || substr(md5(random()::text || clock_timestamp()::text), 1, 24), 'Usuário Teste', 'teste@test.com', 'COLE_O_HASH_AQUI', 'ADMIN', true, NOW(), NOW()) RETURNING email, role;"
```

---

## 🎯 Opção 3: Tudo em Um Comando (Automático)

```powershell
# Gera email, senha, hash e insere tudo automaticamente
$email = "teste_$(Get-Random)@test.com"
$senha = "teste123"
$hash = docker exec amoras-backend node -e "const bcrypt=require('bcryptjs');bcrypt.hash('$senha',10).then(h=>console.log(h));"
$hash = $hash.Trim()
docker exec -i amoras-postgres psql -U postgres -d amoras_capital -c "INSERT INTO users (id, name, email, password, role, active, \"createdAt\", \"updatedAt\") VALUES ('cl' || substr(md5(random()::text || clock_timestamp()::text), 1, 24), 'Usuário Teste', '$email', '$hash', 'ADMIN', true, NOW(), NOW()) RETURNING email, role;"
Write-Host "Email: $email"
Write-Host "Senha: $senha"
```

---

## 🔍 Verificar Usuário Criado

```powershell
docker exec -it amoras-postgres psql -U postgres -d amoras_capital -c "SELECT id, name, email, role, active FROM users ORDER BY \"createdAt\" DESC LIMIT 1;"
```

---

## ⚠️ IMPORTANTE: Como Executar SQL Corretamente

### ❌ ERRADO (o que você estava fazendo):
```bash
# Entrar no shell do container e colar SQL
docker exec -it amoras-postgres sh
# Depois colar o SQL (NÃO FUNCIONA!)
```

### ✅ CORRETO:
```powershell
# Opção 1: Via psql direto
docker exec -i amoras-postgres psql -U postgres -d amoras_capital -c "SEU_SQL_AQUI"

# Opção 2: Via arquivo SQL
docker exec -i amoras-postgres psql -U postgres -d amoras_capital < arquivo.sql

# Opção 3: Entrar no psql interativo
docker exec -it amoras-postgres psql -U postgres -d amoras_capital
# Depois digite o SQL e pressione Enter
```

---

## 📋 Exemplo Completo Passo a Passo

```powershell
# 1. Verificar se containers estão rodando
docker ps

# 2. Gerar hash da senha "minhasenha123"
docker exec amoras-backend node -e "const bcrypt=require('bcryptjs');bcrypt.hash('minhasenha123',10).then(h=>console.log(h));"

# 3. Copiar o hash gerado (exemplo: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy)

# 4. Inserir no banco (cole o hash no lugar de COLE_O_HASH)
docker exec -i amoras-postgres psql -U postgres -d amoras_capital -c "INSERT INTO users (id, name, email, password, role, active, \"createdAt\", \"updatedAt\") VALUES ('cl' || substr(md5(random()::text || clock_timestamp()::text), 1, 24), 'Meu Usuário', 'meuemail@test.com', 'COLE_O_HASH', 'ADMIN', true, NOW(), NOW()) RETURNING email, role;"

# 5. Verificar
docker exec -it amoras-postgres psql -U postgres -d amoras_capital -c "SELECT email, role FROM users WHERE email = 'meuemail@test.com';"
```

---

## 🧪 Testar Login

```powershell
curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"meuemail@test.com\",\"password\":\"minhasenha123\"}"
```

---

**Dica:** Use o script `criar-usuario-terminal.ps1` para automatizar tudo! 🚀

