# 🐳 Como Fazer Build e Push Manualmente

## 📋 Passo a Passo Simples

### 1. Abrir PowerShell

Abra o PowerShell no diretório do projeto:
```
D:\sistemaamoras
```

### 2. Build do Frontend

Execute estes comandos **um por vez**:

```powershell
cd frontend
```

```powershell
docker build --build-arg REACT_APP_API_URL="/api" --build-arg VITE_API_URL="/api" -t mohameduyyyyyy/amoras-frontend:latest .
```

**⏱️ Isso pode levar alguns minutos (5-10 minutos)**

### 3. Verificar se o Build Funcionou

Após o build terminar, verifique:

```powershell
docker images mohameduyyyyyy/amoras-frontend
```

Se aparecer a imagem listada, o build foi bem-sucedido!

### 4. Fazer Login no Docker Hub (se necessário)

```powershell
docker login
```

Digite:
- **Username:** `mohameduyyyyyy`
- **Password:** (sua senha do Docker Hub)

### 5. Push para Docker Hub

```powershell
docker push mohameduyyyyyy/amoras-frontend:latest
```

**⏱️ Isso também pode levar alguns minutos**

### 6. Verificar no Docker Hub

Acesse: https://hub.docker.com/r/mohameduyyyyyy/amoras-frontend

---

## 🔄 Build do Backend (se precisar atualizar)

Se precisar rebuildar o backend também:

```powershell
cd D:\sistemaamoras\backend
```

```powershell
docker build -t mohameduyyyyyy/amoras-backend:latest .
```

```powershell
docker push mohameduyyyyyy/amoras-backend:latest
```

---

## ⚠️ Problemas Comuns

### Erro: "Cannot connect to Docker daemon"
- **Solução:** Certifique-se de que o Docker Desktop está rodando

### Erro: "unauthorized: authentication required"
- **Solução:** Execute `docker login` primeiro

### Erro: "repository does not exist"
- **Solução:** Crie o repositório no Docker Hub primeiro:
  - https://hub.docker.com/repositories/create
  - Nome: `amoras-frontend` ou `amoras-backend`

### Build muito lento
- **Normal:** O primeiro build pode levar 10-15 minutos
- Builds subsequentes são mais rápidos (cache)

---

## ✅ Checklist

- [ ] Docker Desktop está rodando
- [ ] Está no diretório correto (`D:\sistemaamoras\frontend`)
- [ ] Executou o comando de build
- [ ] Build terminou sem erros
- [ ] Fez login no Docker Hub (`docker login`)
- [ ] Executou o push
- [ ] Verificou no Docker Hub que a imagem está lá

---

**Data:** 2025-01-22
**Status:** Guia para execução manual ✅

