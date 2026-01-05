# 🐳 Docker - Frontend Amoras Capital

Este documento explica como fazer build e push da imagem Docker do frontend para o Docker Hub.

## 📋 Pré-requisitos

1. **Docker Desktop** instalado e rodando
2. Conta no **Docker Hub** (criar em: https://hub.docker.com/signup)
3. Git configurado

## 🚀 Build e Push Rápido

### Opção 1: Usando o Script PowerShell (Recomendado)

```powershell
# 1. Edite o script docker-build-and-push.ps1 e configure seu usuário do Docker Hub
# Ou use diretamente:
.\docker-build-and-push.ps1 -DockerHubUsername seu-usuario -VITE_API_URL http://seu-backend:3001/api
```

### Opção 2: Comandos Manuais

#### 1. Build da Imagem

```powershell
# Build básico
docker build -t seu-usuario/amoras-capital-frontend:latest .

# Build com variáveis de ambiente
docker build `
  --build-arg VITE_API_URL=http://seu-backend:3001/api `
  -t seu-usuario/amoras-capital-frontend:latest .
```

#### 2. Login no Docker Hub

```powershell
docker login
```

#### 3. Push para o Docker Hub

```powershell
docker push seu-usuario/amoras-capital-frontend:latest
```

## 🔧 Variáveis de Ambiente no Build

O Dockerfile aceita as seguintes variáveis de ambiente durante o build:

- `VITE_API_URL`: URL completa da API (ex: `http://api.example.com/api`)
- `REACT_APP_API_URL`: URL alternativa da API (compatibilidade)

**Importante:** Essas variáveis são incorporadas no código durante o build. Se não forem definidas, o frontend usará proxy relativo (`/api`).

### Exemplo com Variáveis:

```powershell
docker build `
  --build-arg VITE_API_URL=https://api.amoras-capital.com/api `
  -t seu-usuario/amoras-capital-frontend:latest .
```

## 📦 Usar a Imagem

### Pull e Run

```powershell
# Pull da imagem
docker pull seu-usuario/amoras-capital-frontend:latest

# Run do container
docker run -p 8080:8080 seu-usuario/amoras-capital-frontend:latest
```

A aplicação estará disponível em: `http://localhost:8080`

## 🏷️ Tags e Versões

Recomendamos usar tags semânticas:

```powershell
# Versão específica
docker build -t seu-usuario/amoras-capital-frontend:v1.0.0 .
docker push seu-usuario/amoras-capital-frontend:v1.0.0

# Latest
docker build -t seu-usuario/amoras-capital-frontend:latest .
docker push seu-usuario/amoras-capital-frontend:latest
```

## 🔍 Troubleshooting

### Erro: "Cannot connect to the Docker daemon"

- Certifique-se de que o Docker Desktop está rodando
- Reinicie o Docker Desktop se necessário

### Erro: "denied: requested access to the resource is denied"

- Verifique se fez login: `docker login`
- Confirme que o nome da imagem está correto: `usuario/imagem`

### A aplicação não consegue conectar com a API

- Verifique se passou `VITE_API_URL` durante o build
- Confirme que a URL da API está correta e acessível

## 📝 Estrutura do Dockerfile

O Dockerfile usa **multi-stage build**:

1. **Build stage**: Compila o frontend (TypeScript + Vite)
2. **Production stage**: Serve os arquivos estáticos com `serve`

Isso resulta em uma imagem final menor e otimizada.

## 🔗 Links Úteis

- [Docker Hub](https://hub.docker.com/)
- [Documentação Docker](https://docs.docker.com/)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)

