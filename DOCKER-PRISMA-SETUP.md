# 🐳 Configuração Docker + Prisma Automático

## ✅ O que foi implementado

### 1. **Healthcheck no PostgreSQL**
- Adicionado healthcheck no `docker-compose.yml`
- Backend aguarda PostgreSQL estar saudável antes de iniciar
- Evita erros de conexão no startup

### 2. **Script de Inicialização Automática**
- Criado `backend/docker-entrypoint.sh`
- Aguarda banco estar pronto usando script Node.js
- Aplica schema do Prisma automaticamente (`prisma db push`)
- Inicia servidor apenas após tudo estar configurado

### 3. **Script de Espera do Banco**
- Criado `backend/scripts/wait-for-db.js`
- Usa Prisma Client para verificar conexão
- Retry automático (30 tentativas, 2s cada = 60s máximo)
- Mensagens claras de progresso

### 4. **Dockerfile Atualizado**
- Instala `postgresql-client` para healthcheck
- Copia scripts de inicialização
- Torna scripts executáveis
- Mantém segurança (usuário não-root)

---

## 🔄 Fluxo de Inicialização

```
1. Docker Compose inicia PostgreSQL
   ↓
2. Healthcheck verifica se PostgreSQL está pronto
   ↓
3. Backend inicia (após PostgreSQL estar saudável)
   ↓
4. docker-entrypoint.sh executa:
   a) wait-for-db.js aguarda conexão
   b) prisma db push aplica schema
   c) node dist/index.js inicia servidor
```

---

## 📋 Arquivos Modificados/Criados

### Criados:
- `backend/docker-entrypoint.sh` - Script principal de inicialização
- `backend/scripts/wait-for-db.js` - Script para aguardar banco
- `DOCKER-PRISMA-SETUP.md` - Esta documentação

### Modificados:
- `docker-compose.yml` - Adicionado healthcheck e depends_on com condition
- `backend/Dockerfile` - Adicionado postgresql-client e scripts

---

## 🚀 Como Usar

### Iniciar Sistema Completo:
```bash
docker-compose up --build
```

### Reconstruir Apenas Backend:
```bash
docker-compose build backend
docker-compose up -d backend
```

### Ver Logs do Backend:
```bash
docker-compose logs -f backend
```

---

## ✅ Benefícios

1. **Automático**: Não precisa executar `prisma db push` manualmente
2. **Confiável**: Aguarda banco estar pronto antes de iniciar
3. **Seguro**: Usa healthcheck do Docker Compose
4. **Informativo**: Mensagens claras de progresso
5. **Resiliente**: Retry automático em caso de falha temporária

---

## 🔍 Verificação

Após iniciar, você verá nos logs:

```
🔄 Aguardando banco de dados PostgreSQL...
✅ Banco de dados pronto!
🔄 Aplicando schema do Prisma...
✅ Schema do Prisma verificado/aplicado!
🚀 Iniciando servidor Node.js...
```

---

## ⚠️ Notas Importantes

1. **`prisma db push`** é usado em vez de `prisma migrate deploy`
   - Mais adequado para desenvolvimento
   - Aplica schema diretamente sem migrations
   - Use `prisma migrate` em produção se preferir

2. **`--accept-data-loss`** permite recriar tabelas
   - Use com cuidado em produção
   - Em desenvolvimento, é seguro

3. **Healthcheck** garante ordem de inicialização
   - Backend só inicia após PostgreSQL estar pronto
   - Evita erros de conexão

---

## 🐛 Troubleshooting

### Backend não inicia:
```bash
# Ver logs
docker-compose logs backend

# Verificar se PostgreSQL está rodando
docker-compose ps postgres

# Verificar healthcheck
docker inspect amoras-postgres | grep -A 10 Health
```

### Schema não aplica:
```bash
# Executar manualmente
docker exec -it amoras-backend npx prisma db push
```

### Script não executa:
```bash
# Verificar permissões
docker exec -it amoras-backend ls -la /app/docker-entrypoint.sh

# Executar manualmente
docker exec -it amoras-backend /app/docker-entrypoint.sh
```

---

**Data de implementação:** 2025-11-22
**Versão:** 1.0.0

