# 👤 Como Criar Usuário de Teste no Docker

Guia para criar um usuário de teste com email e senha aleatórios no sistema rodando no Docker.

---

## 🚀 Opção 1: Usar Script PowerShell (Recomendado)

### Passo 1: Certifique-se que o sistema está rodando

```powershell
# Verificar se os containers estão rodando
docker ps
```

Você deve ver o container `amoras-backend` rodando.

### Passo 2: Executar o script

```powershell
# Na raiz do projeto
.\criar-usuario-teste.ps1
```

**O que o script faz:**
- ✅ Verifica se Docker está rodando
- ✅ Verifica se o container backend está ativo
- ✅ Copia o script para o container (se necessário)
- ✅ Executa o script e cria o usuário
- ✅ Mostra email e senha gerados

### Resultado:

Você verá algo assim:
```
✅ Usuário criado com sucesso!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email: teste_abc123@test.com
🔑 Senha: XyZ9aBc2
👤 Nome: Usuário Teste xyz
🎭 Role: ADMIN
🆔 ID: clx1234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Guarde essas credenciais! Elas não serão mostradas novamente.
```

---

## 🔧 Opção 2: Comando Manual no Docker

Se preferir executar manualmente:

### Passo 1: Copiar script para o container

```powershell
docker cp backend/scripts/create-test-user.js amoras-backend:/app/scripts/create-test-user.js
```

### Passo 2: Executar o script

```powershell
docker exec -it amoras-backend node scripts/create-test-user.js
```

---

## 📍 Onde Rodar no Docker

### ✅ Local Correto: Dentro do Container `amoras-backend`

O script **DEVE** ser executado dentro do container `amoras-backend` porque:

1. **Tem acesso ao banco**: O container backend está conectado ao PostgreSQL
2. **Tem as dependências**: Node.js, Prisma, bcryptjs estão instalados
3. **Tem as variáveis de ambiente**: DATABASE_URL está configurada

### ❌ NÃO rode no seu PC local

Não execute `node scripts/create-test-user.js` diretamente no seu PC porque:
- Pode não ter as dependências instaladas
- Não terá acesso ao banco PostgreSQL do Docker
- DATABASE_URL pode estar diferente

---

## 🎯 Estrutura dos Arquivos

```
sistemaamoras/
├── criar-usuario-teste.ps1          ← Script PowerShell (executa no PC)
└── backend/
    └── scripts/
        └── create-test-user.js      ← Script Node.js (executa no container)
```

**Fluxo:**
1. Você executa `criar-usuario-teste.ps1` no seu PC
2. O script PowerShell executa `create-test-user.js` dentro do container Docker
3. O script Node.js cria o usuário no banco de dados

---

## 🔍 Verificar se Funcionou

### Opção 1: Ver no banco de dados

```powershell
# Entrar no PostgreSQL
docker exec -it amoras-postgres psql -U postgres -d amoras_capital

# Ver usuários
SELECT id, name, email, role, active FROM users;

# Sair
\q
```

### Opção 2: Testar login na API

```powershell
# Fazer login com as credenciais geradas
curl -X POST http://localhost:3001/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"teste_abc123@test.com","password":"XyZ9aBc2"}'
```

---

## ❓ Problemas Comuns

### 1. Container não está rodando
```
❌ Erro: Container 'amoras-backend' não está rodando!
```

**Solução:**
```powershell
docker-compose up -d
```

### 2. Script não encontrado
```
❌ Erro ao copiar script para o container!
```

**Solução:**
- Verifique se o arquivo existe: `backend/scripts/create-test-user.js`
- Execute manualmente: `docker cp backend/scripts/create-test-user.js amoras-backend:/app/scripts/create-test-user.js`

### 3. Erro de conexão com banco
```
❌ Erro ao criar usuário: Can't reach database server
```

**Solução:**
- Verifique se o PostgreSQL está rodando: `docker ps | grep postgres`
- Aguarde alguns segundos após iniciar os containers

### 4. Email já existe
```
❌ Erro: Email já existe. Tente novamente.
```

**Solução:**
- Execute novamente (gera novo email aleatório)
- Ou delete o usuário existente no banco

---

## 💡 Dicas

- **Guarde as credenciais**: O script mostra apenas uma vez
- **Role padrão**: O usuário é criado como `ADMIN` (pode editar o script para mudar)
- **Múltiplos usuários**: Execute o script quantas vezes quiser para criar vários usuários
- **Senha segura**: A senha gerada tem 8 caracteres aleatórios (letras e números)

---

## 🔄 Criar Usuário com Credenciais Específicas

Se quiser criar um usuário com email e senha específicos, você pode:

### Opção 1: Editar o script temporariamente

Edite `backend/scripts/create-test-user.js` e substitua:

```javascript
const email = generateRandomEmail();
const plainPassword = generateRandomPassword();
```

Por:

```javascript
const email = 'seu-email@test.com';
const plainPassword = 'sua-senha-123';
```

### Opção 2: Usar a API de registro

Se você já tiver um usuário admin, pode usar a rota `/api/auth/register`:

```powershell
curl -X POST http://localhost:3001/api/auth/register `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer SEU_TOKEN_JWT" `
  -d '{"name":"Nome do Usuário","email":"email@test.com","password":"senha123","role":"ADMIN"}'
```

---

**Pronto! Agora você pode criar usuários de teste facilmente! 🎉**

