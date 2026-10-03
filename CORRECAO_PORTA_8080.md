# Correção - Porta 8080 do Frontend

## Data: 2024

## 🎯 Objetivo
Corrigir todo o sistema para usar consistentemente a porta **8080** para o frontend dentro dos containers Docker.

## ✅ Alterações Realizadas

### 1. **nginx/nginx.conf**
- ✅ Corrigido `upstream frontend` de `server frontend:3000` para `server frontend:8080`
- **Motivo**: O frontend roda na porta 8080 dentro do container, não na 3000

### 2. **nginx/configure-nginx.sh**
- ✅ Corrigido `upstream frontend` de `${FRONTEND_HOST}:80` para `${FRONTEND_HOST}:8080`
- **Motivo**: Script alternativo de configuração também precisa usar a porta correta

## 📋 Configuração Atual

### Portas do Frontend:
- **Dentro do container**: 8080 (porta interna do Docker)
- **No host (docker-compose)**: 3000:8080 (porta 3000 do host mapeia para 8080 do container)
- **Acesso via Nginx**: Porta 80 (nginx faz proxy para frontend:8080)

### Arquivos que já estavam corretos:
- ✅ `frontend/Dockerfile` - EXPOSE 8080
- ✅ `frontend/Dockerfile.production` - EXPOSE 8080
- ✅ `frontend/nginx.conf` - listen 8080
- ✅ `docker-compose.yml` - mapeamento "3000:8080"

### Arquivos que NÃO precisam mudar:
- ✅ `frontend/vite.config.ts` - port: 3000 (apenas para desenvolvimento local)
- ✅ `docker-compose.yml` - CORS_ORIGINS: localhost:3000 (porta do host, não do container)
- ✅ `backend/src/index.ts` - localhost:3000 (porta do host para CORS)

## 🔍 Verificação

Para verificar se está tudo correto:

```bash
# Verificar configuração do nginx
cat nginx/nginx.conf | grep -A 2 "upstream frontend"

# Deve mostrar:
# upstream frontend {
#     server frontend:8080;
# }

# Verificar docker-compose
cat docker-compose.yml | grep -A 1 "frontend:" | grep ports

# Deve mostrar:
# - "3000:8080"
```

## 🚀 Como Funciona Agora

1. **Frontend container** roda na porta **8080** internamente
2. **Docker-compose** expõe na porta **3000** do host
3. **Nginx** (porta 80) faz proxy para `frontend:8080`
4. **Usuário acessa** via porta 80 (nginx) ou porta 3000 (direto)

### Fluxo de Requisições:

**Via Nginx (recomendado):**
```
Usuário → localhost:80 → Nginx → frontend:8080
         → localhost:80/api → Nginx → backend:3001
```

**Direto (não recomendado em produção):**
```
Usuário → localhost:3000 → frontend:8080 (container)
         → localhost:3000/api → ❌ ERRO (serve retorna HTML)
```

## ⚠️ Importante

- **Sempre use o Nginx** (porta 80) em produção para que o proxy `/api` funcione
- Se acessar diretamente a porta 3000, as requisições `/api` não funcionarão
- O CORS está configurado para `localhost:3000` porque é a porta exposta no host

## 📝 Arquivos Modificados

1. `nginx/nginx.conf` - Corrigido upstream frontend para porta 8080
2. `nginx/configure-nginx.sh` - Corrigido upstream frontend para porta 8080

