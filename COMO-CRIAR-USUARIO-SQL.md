# 👤 Criar Usuário de Teste via SQL no PostgreSQL

Guia para criar usuário diretamente no PostgreSQL usando comandos SQL.

---

## 🚀 Opção 1: Script PowerShell Automático (Recomendado)

### Executar:

```powershell
# Na raiz do projeto
.\criar-usuario-postgres.ps1
```

**O que faz:**
- ✅ Gera email e senha aleatórios
- ✅ Gera hash bcrypt da senha
- ✅ Insere usuário diretamente no PostgreSQL
- ✅ Mostra as credenciais criadas

---

## 🔧 Opção 2: Script Simples e Rápido

```powershell
.\criar-usuario-sql-simples.ps1
```

Versão mais direta e rápida.

---

## 📝 Opção 3: Comando Manual no Terminal

### Passo 1: Gerar hash bcrypt da senha

Primeiro, você precisa gerar o hash bcrypt. Use o container backend:

```powershell
# Gerar hash de uma senha específica
docker exec amoras-backend node -e "const bcrypt=require('bcryptjs');bcrypt.hash('sua-senha-123',10).then(h=>console.log(h));"
```

**Exemplo de saída:**
```
$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
```

### Passo 2: Inserir no PostgreSQL

```powershell
# Entrar no PostgreSQL
docker exec -it amoras-postgres psql -U postgres -d amoras_capital
```

Dentro do PostgreSQL, execute:

```sql
-- Substitua os valores abaixo
INSERT INTO users (id, name, email, password, role, active, "createdAt", "updatedAt")
VALUES (
    'cl' || substr(md5(random()::text || clock_timestamp()::text), 1, 24),
    'Usuário Teste',
    'teste@test.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',  -- Cole o hash gerado aqui
    'ADMIN',
    true,
    NOW(),
    NOW()
)
RETURNING id, name, email, role;
```

### Passo 3: Verificar

```sql
SELECT id, name, email, role, active FROM users ORDER BY "createdAt" DESC LIMIT 1;
```

---

## 🎯 Opção 4: Tudo em Um Comando

```powershell
# Gerar email, senha e hash, depois inserir tudo de uma vez
$email = "teste_$(Get-Random)@test.com"
$senha = "teste123"
$hash = docker exec amoras-backend node -e "const bcrypt=require('bcryptjs');bcrypt.hash('$senha',10).then(h=>console.log(h));"
$hash = $hash.Trim()

docker exec -i amoras-postgres psql -U postgres -d amoras_capital -c "INSERT INTO users (id, name, email, password, role, active, \"createdAt\", \"updatedAt\") VALUES ('cl' || substr(md5(random()::text || clock_timestamp()::text), 1, 24), 'Usuário Teste', '$email', '$hash', 'ADMIN', true, NOW(), NOW()) RETURNING email, role;"

Write-Host "Email: $email"
Write-Host "Senha: $senha"
```

---

## 📋 Estrutura da Tabela `users`

```sql
CREATE TABLE users (
    id        TEXT PRIMARY KEY,      -- CUID format
    name      TEXT NOT NULL,
    email     TEXT UNIQUE NOT NULL,
    password  TEXT NOT NULL,          -- Hash bcrypt
    role      TEXT DEFAULT 'ATTENDANT',  -- ADMIN, MANAGER, ATTENDANT
    active    BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);
```

---

## 🔍 Verificar Usuários Criados

### Ver todos os usuários:

```powershell
docker exec -it amoras-postgres psql -U postgres -d amoras_capital -c "SELECT id, name, email, role, active FROM users;"
```

### Ver último usuário criado:

```powershell
docker exec -it amoras-postgres psql -U postgres -d amoras_capital -c "SELECT id, name, email, role, active, \"createdAt\" FROM users ORDER BY \"createdAt\" DESC LIMIT 1;"
```

### Entrar no PostgreSQL interativo:

```powershell
docker exec -it amoras-postgres psql -U postgres -d amoras_capital
```

Depois execute:
```sql
SELECT * FROM users;
\q  -- Para sair
```

---

## 🧪 Testar Login

Após criar o usuário, teste o login:

```powershell
# Usando curl
curl -X POST http://localhost:3001/api/auth/login `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"teste@test.com\",\"password\":\"sua-senha\"}"
```

---

## ❓ Problemas Comuns

### 1. Erro: "relation users does not exist"
**Solução:** Execute as migrations primeiro:
```powershell
docker exec amoras-backend npx prisma migrate deploy
```

### 2. Erro: "duplicate key value violates unique constraint"
**Solução:** O email já existe. Use um email diferente ou delete o usuário existente.

### 3. Hash bcrypt inválido
**Solução:** Certifique-se de usar o hash completo gerado pelo bcrypt (começa com `$2a$10$`).

### 4. Container não encontrado
**Solução:** 
```powershell
docker-compose up -d
```

---

## 💡 Dicas

- **Guarde as credenciais**: Email e senha são mostrados apenas uma vez
- **Hash bcrypt**: Sempre use 10 rounds (padrão de segurança)
- **Role**: Pode ser `ADMIN`, `MANAGER` ou `ATTENDANT`
- **ID**: É gerado automaticamente no formato CUID

---

## 📚 Comandos Úteis

```powershell
# Ver todos os usuários
docker exec -it amoras-postgres psql -U postgres -d amoras_capital -c "SELECT * FROM users;"

# Deletar um usuário
docker exec -it amoras-postgres psql -U postgres -d amoras_capital -c "DELETE FROM users WHERE email = 'teste@test.com';"

# Atualizar senha de um usuário
# (Primeiro gere o hash da nova senha)
docker exec -it amoras-postgres psql -U postgres -d amoras_capital -c "UPDATE users SET password = 'NOVO_HASH_AQUI' WHERE email = 'teste@test.com';"
```

---

**Pronto! Agora você pode criar usuários diretamente no PostgreSQL! 🎉**

