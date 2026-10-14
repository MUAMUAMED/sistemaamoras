# 🔧 Solução para Erro de I/O do Docker

## ❌ Erro Encontrado

```
ERROR: failed to build: failed to solve: write /var/lib/docker/buildkit/containerd-overlayfs/metadata_v2.db: input/output error
```

## ✅ Soluções

### 1. Reiniciar Docker Desktop (Mais Comum)

1. Feche completamente o Docker Desktop
2. Aguarde 10 segundos
3. Abra o Docker Desktop novamente
4. Aguarde até aparecer "Docker Desktop is running"

### 2. Limpar Cache do Docker

```powershell
# Parar todos os containers
docker stop $(docker ps -aq)

# Limpar sistema (cuidado: remove imagens não utilizadas)
docker system prune -a --volumes
```

### 3. Reiniciar o Computador

Se o problema persistir, reinicie o Windows.

### 4. Verificar Espaço em Disco

Certifique-se de que há espaço suficiente no disco onde o Docker está instalado.

---

## 🚀 Após Resolver o Erro

Execute o build novamente:

```powershell
cd D:\sistemaamoras\frontend

docker build `
  --build-arg REACT_APP_API_URL="/api" `
  --build-arg VITE_API_URL="/api" `
  -t mohameduyyyyyy/amoras-frontend:latest .
```

Depois faça o push:

```powershell
docker push mohameduyyyyyy/amoras-frontend:latest
```

---

## ✅ Dockerfile Corrigido

O Dockerfile já está corrigido e pronto para uso. Ele:
- ✅ Instala todas as dependências (incluindo devDependencies)
- ✅ Instala o rollup necessário para Alpine Linux
- ✅ Usa as variáveis de ambiente corretamente
- ✅ Faz o build com `npm run build`

**Data:** 2025-01-22
**Status:** Dockerfile corrigido, aguardando resolução do erro de I/O

