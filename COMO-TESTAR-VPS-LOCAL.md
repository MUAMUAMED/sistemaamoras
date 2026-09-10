# 🧪 Como Testar Localmente Antes de Deploy no VPS

Este guia mostra como testar o build do Docker localmente **exatamente como será executado no VPS**, para identificar erros antes do deploy.

---

## 📋 Pré-requisitos

1. **Docker Desktop instalado**
   - Baixe em: https://www.docker.com/products/docker-desktop
   - Instale e reinicie o computador
   - Verifique: `docker --version`

2. **Docker Desktop rodando**
   - Abra o Docker Desktop
   - Aguarde até aparecer "Docker Desktop is running"

---

## 🚀 Opção 1: Teste Rápido (Apenas Build)

Testa apenas o build do Docker, simulando o que acontece no VPS durante o build.

### Como usar:

```powershell
# Na raiz do projeto
.\test-docker-build.ps1
```

### O que faz:
- ✅ Verifica se Docker está instalado
- ✅ Verifica arquivos essenciais
- ✅ Executa `docker build` (mesmo comando do VPS)
- ✅ Verifica se build foi bem-sucedido
- ✅ Testa se container inicia corretamente

### Resultado:
- Se **SUCESSO**: ✅ Seu código provavelmente funcionará no VPS
- Se **FALHOU**: ❌ Corrija os erros antes de fazer deploy

---

## 🔥 Opção 2: Teste Completo (Build + Execução)

Testa o build E a execução completa simulando o ambiente VPS (backend + postgres).

### Como usar:

```powershell
# Na raiz do projeto
.\test-vps-local.ps1
```

### O que faz:
1. **Build do Docker** (mesmo que Opção 1)
2. **Docker Compose completo**:
   - Cria container PostgreSQL
   - Cria container Backend
   - Simula ambiente de produção
3. **Testes de conectividade**:
   - Verifica se containers iniciam
   - Testa health endpoint
   - Mostra logs completos

### Resultado:
- Se **SUCESSO**: ✅ Ambiente completo funcionando (pronto para VPS)
- Se **FALHOU**: ❌ Veja logs detalhados para corrigir

---

## 📊 O que cada teste verifica:

### ✅ Teste de Build (Opção 1)
- [ ] Docker está instalado
- [ ] Arquivos essenciais existem
- [ ] `npm install` funciona
- [ ] `npx prisma generate` funciona
- [ ] `npm run build` (TypeScript) compila sem erros
- [ ] Arquivos `dist/` foram gerados
- [ ] Imagem Docker foi criada
- [ ] Container inicia sem erros de sintaxe

### ✅ Teste Completo (Opção 2)
- [ ] Todos os itens do Teste de Build
- [ ] PostgreSQL inicia corretamente
- [ ] Backend conecta no PostgreSQL
- [ ] Prisma migrations executam
- [ ] Aplicação inicia sem erros
- [ ] Health endpoint responde

---

## 🔍 Interpretando os Resultados

### ✅ Build Bem-Sucedido
```
✅ Build bem-sucedido!
✅ Seu build passou no teste local!
✅ Isso significa que provavelmente funcionará no VPS também.
```

**Ação**: Pode fazer deploy no VPS com confiança! 🚀

---

### ❌ Build Falhou

**Erros Comuns:**

#### 1. Erro de TypeScript (`TS2305`, `TS2345`, etc.)
```
src/config/logger.ts(69,10): error TS2305: Module has no exported member
```

**Solução**: 
- Corrija erros de TypeScript
- Teste localmente: `cd backend && npm run build`

#### 2. Erro de Prisma
```
Error: Cannot find module '@prisma/client'
```

**Solução**:
- Verifique se `prisma generate` está no Dockerfile
- Verifique se `@prisma/client` está no `package.json`

#### 3. Erro de Dependências
```
npm error ERESOLVE could not resolve
```

**Solução**:
- Verifique conflitos no `package.json`
- Use `npm ci --legacy-peer-deps`

#### 4. Erro de Arquivo Não Encontrado
```
COPY failed: file not found
```

**Solução**:
- Verifique se todos os arquivos estão no lugar
- Verifique `.dockerignore`

---

## 📝 Arquivos de Log Gerados

Após executar os testes, você terá:

- **`build-log.txt`** - Log completo do build Docker
- **`build-errors.txt`** - Apenas erros do build
- **`compose-build.log`** - Log do docker-compose build

Use esses arquivos para debugar problemas!

---

## 🛠️ Comandos Manuais (Alternativa)

Se preferir executar manualmente:

### Teste Build Docker:
```powershell
cd backend
docker build -t backend-test .
```

### Teste Docker Compose:
```powershell
# Build
docker-compose -f docker-compose.test.yml build

# Iniciar
docker-compose -f docker-compose.test.yml up

# Ver logs
docker-compose -f docker-compose.test.yml logs -f backend-test

# Parar
docker-compose -f docker-compose.test.yml down
```

---

## 🎯 Fluxo Recomendado

1. **Primeiro**: Execute `.\test-docker-build.ps1`
   - Se passar ✅, continue
   - Se falhar ❌, corrija e tente novamente

2. **Depois**: Execute `.\test-vps-local.ps1`
   - Se passar ✅, seu código está pronto para VPS!
   - Se falhar ❌, veja logs e corrija

3. **Finalmente**: Faça deploy no VPS/EasyPanel

---

## 💡 Dicas

- **Execute os testes sempre antes de fazer deploy**
- **Use `-FullBuild` para limpar cache**: `.\test-docker-build.ps1 -FullBuild`
- **Logs detalhados**: Sempre verifique os arquivos `.log` gerados
- **Teste localmente primeiro**: `cd backend && npm run build` antes de testar Docker

---

## ❓ Problemas Comuns

### Docker não encontrado
```
docker : O termo 'docker' não é reconhecido
```
**Solução**: Instale Docker Desktop e reinicie o computador

### Porta já em uso
```
Error: bind: address already in use
```
**Solução**: Pare containers anteriores: `docker-compose -f docker-compose.test.yml down`

### Erro de permissão
```
permission denied
```
**Solução**: Execute PowerShell como Administrador

---

## 📚 Mais Informações

- [Documentação Docker](https://docs.docker.com/)
- [EasyPanel Docs](https://easypanel.io/docs)
- [Guia de Deploy VPS](./GUIA_INSTALACAO_VPS_EASYPANEL.md)



