# 🚀 Passo a Passo: Rodar Sistema Completo no Docker Desktop

Guia visual e prático para iniciar o sistema no Docker Desktop.

---

## 📍 Onde você está agora

Você está na tela do Docker Desktop, na aba **"Containers"**, sem containers rodando.

---

## ✅ Passo 1: Abrir o Terminal

Você tem 3 opções:

### Opção A: Terminal do Docker Desktop
1. Clique no botão **">_ Terminal"** na parte inferior do Docker Desktop
2. O terminal abrirá na pasta do projeto

### Opção B: PowerShell do Windows
1. Pressione `Windows + X`
2. Escolha **"Windows PowerShell"** ou **"Terminal"**
3. Navegue até a pasta do projeto:
   ```powershell
   cd D:\sistemaamoras
   ```

### Opção C: Terminal do VS Code/Cursor
1. No seu editor, pressione `` Ctrl + ` `` (Ctrl + crase)
2. O terminal abrirá na pasta do projeto

---

## 🎯 Passo 2: Executar o Comando

No terminal, execute este comando:

```powershell
docker-compose up --build
```

**O que este comando faz:**
- ✅ Faz o build das imagens do backend e frontend
- ✅ Baixa as imagens do PostgreSQL, Nginx e Redis
- ✅ Cria e inicia todos os containers
- ✅ Conecta tudo na mesma rede

---

## ⏳ Passo 3: Aguardar o Build

**Primeira vez pode demorar 5-10 minutos!**

Você verá muitas mensagens no terminal:
- `Building backend...`
- `Building frontend...`
- `Pulling postgres...`
- `Creating network...`
- `Creating container...`

**Isso é normal!** Aguarde até ver:
```
✅ amoras-postgres started
✅ amoras-backend started
✅ amoras-frontend started
✅ amoras-nginx started
✅ amoras-redis started
```

---

## 🎉 Passo 4: Verificar no Docker Desktop

1. **Volte para o Docker Desktop**
2. **Na aba "Containers"**, você verá 5 containers rodando:
   - 🟢 `amoras-postgres` (banco de dados)
   - 🟢 `amoras-backend` (API)
   - 🟢 `amoras-frontend` (interface web)
   - 🟢 `amoras-nginx` (proxy)
   - 🟢 `amoras-redis` (cache)

3. **Status**: Todos devem estar com status **"Running"** (verde)

---

## 🌐 Passo 5: Acessar o Sistema

Aguarde 1-2 minutos após os containers iniciarem (para o backend conectar no banco).

Depois, abra no navegador:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Nginx**: http://localhost

---

## 📊 Passo 6: Ver Logs (Opcional)

### No Docker Desktop:
1. Clique em um container (ex: `amoras-backend`)
2. Clique na aba **"Logs"**
3. Veja os logs em tempo real

### No Terminal:
```powershell
# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs apenas do backend
docker-compose logs -f backend

# Ver logs apenas do frontend
docker-compose logs -f frontend
```

---

## 🛑 Como Parar o Sistema

### Parar (mantém dados):
```powershell
docker-compose down
```

### Parar e limpar tudo (remove banco de dados):
```powershell
docker-compose down -v
```

---

## 🔄 Como Reiniciar

Depois de parar, para iniciar novamente:

```powershell
docker-compose up
```

(Sem `--build`, será mais rápido pois usa cache)

---

## ❓ Problemas Comuns

### 1. Porta já em uso
```
Error: bind: address already in use
```

**Solução:**
- Feche outros programas usando as portas 3000, 3001, 5432, 80
- Ou pare containers anteriores: `docker-compose down`

### 2. Build demora muito
**Normal na primeira vez!** Aguarde, pode demorar 10-15 minutos.

### 3. Container não inicia
- Clique no container no Docker Desktop
- Veja a aba **"Logs"** para ver o erro
- Compartilhe o erro para eu ajudar

### 4. Erro de permissão
```
permission denied
```

**Solução:**
- Execute PowerShell como Administrador
- Ou verifique permissões do Docker Desktop

---

## 📝 Resumo dos Comandos

```powershell
# Iniciar sistema completo (primeira vez)
docker-compose up --build

# Iniciar sistema (próximas vezes)
docker-compose up

# Parar sistema
docker-compose down

# Ver logs
docker-compose logs -f

# Ver status dos containers
docker ps
```

---

## 🎯 Próximos Passos

Após o sistema estar rodando:
1. ✅ Acesse http://localhost:3000
2. ✅ Teste o sistema
3. ✅ Veja os logs se houver problemas
4. ✅ Faça suas alterações no código

---

**Dica:** Deixe o terminal aberto para ver os logs em tempo real! 🚀

