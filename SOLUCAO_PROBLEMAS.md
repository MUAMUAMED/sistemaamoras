# Solução de Problemas - Sistema Amoras Capital

## 🚨 Problemas Comuns e Soluções

### 1. Backend Não Conecta (ERR_CONNECTION_REFUSED)

**Sintomas:**
- Erro "Failed to load resource: net::ERR_CONNECTION_REFUSED"
- Frontend roda mas não consegue acessar a API

**Soluções:**

#### Opção A: Usar Sistema Local (Recomendado)
```bash
# 1. Configurar SQLite
configurar-ambiente-sqlite.bat

# 2. Inicializar banco
inicializar-banco-sqlite.bat

# 3. Iniciar sistema
iniciar-sistema-local.bat
```

#### Opção B: Usar Docker (se instalado)
```bash
# 1. Instalar Docker Desktop
# 2. Configurar ambiente
configurar-ambiente.bat

# 3. Inicializar banco
inicializar-banco.bat

# 4. Iniciar sistema
iniciar-sistema-completo.bat
```

### 2. Favicon com Erro 500

**Sintomas:**
- Erro "favicon.ico: Failed to load resource: 500"

**Solução:**
- O favicon foi corrigido automaticamente
- Se persistir, verifique se o arquivo `frontend/public/favicon.ico` existe

### 3. React Router Warnings

**Sintomas:**
- Avisos sobre "React Router Future Flag Warning"

**Solução:**
- São apenas avisos, não afetam a funcionalidade
- Pode ser ignorado ou resolvido atualizando o React Router

### 4. Docker Não Instalado

**Sintomas:**
- Erro "docker não é reconhecido como comando"

**Solução:**
- Use o modo local com SQLite
- Ou instale Docker Desktop: https://www.docker.com/products/docker-desktop/

### 5. Portas Ocupadas

**Sintomas:**
- Erro "EADDRINUSE" ou "porta já em uso"

**Solução:**
```bash
# Parar sistema local
parar-sistema-local.bat

# Ou matar processos manualmente
kill-ports.bat
```

### 6. Dependências Não Instaladas

**Sintomas:**
- Erro "Cannot find module"

**Solução:**
```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

## 🔧 Scripts de Diagnóstico

### Verificar Status dos Serviços
```bash
# Verificar portas em uso
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Verificar processos Node.js
tasklist | findstr node
```

### Testar Conexões
```bash
# Testar backend
curl http://localhost:3001/health

# Testar frontend
curl http://localhost:3000
```

### Verificar Logs
```bash
# Logs do backend (se rodando)
cd backend
npm run dev

# Logs do frontend (se rodando)
cd frontend
npm start
```

## 📋 Fluxo de Solução Rápida

### Para Usuários Sem Docker:
1. **Configurar SQLite**: `configurar-ambiente-sqlite.bat`
2. **Inicializar banco**: `inicializar-banco-sqlite.bat`
3. **Iniciar sistema**: `iniciar-sistema-local.bat`

### Para Usuários Com Docker:
1. **Configurar PostgreSQL**: `configurar-ambiente.bat`
2. **Inicializar banco**: `inicializar-banco.bat`
3. **Iniciar sistema**: `iniciar-sistema-completo.bat`

## 🎯 Menu Principal Atualizado

Use `menu-principal-completo.bat` para acessar todas as opções:

- **[1]** Configurar PostgreSQL (Docker)
- **[2]** Configurar SQLite (Local) ← **Recomendado sem Docker**
- **[3]** Inicializar banco PostgreSQL
- **[4]** Inicializar banco SQLite ← **Recomendado sem Docker**
- **[5]** Iniciar sistema Docker
- **[6]** Iniciar sistema local ← **Recomendado sem Docker**
- **[7]** Ver logs (Docker)
- **[8]** Parar sistema Docker
- **[9]** Parar sistema local
- **[10]** Status dos serviços
- **[11]** Backup do banco
- **[12]** Restaurar backup
- **[13]** Limpar dados
- **[14]** Testar sistema
- **[15]** Testar TypeScript

## 🔐 Credenciais de Teste

- **Admin**: admin@amorascapital.com / admin123
- **Atendente**: atendente@amorascapital.com / atendente123

## 📞 Suporte

Se os problemas persistirem:

1. Execute `teste-sistema-completo.bat` para diagnóstico
2. Verifique os logs com `ver-logs.bat`
3. Teste TypeScript com `teste-typescript.bat`
4. Use o menu principal para navegar entre opções

## ✅ Checklist de Verificação

- [ ] Node.js instalado
- [ ] Dependências instaladas (npm install)
- [ ] Ambiente configurado (.env)
- [ ] Banco inicializado
- [ ] Backend rodando (porta 3001)
- [ ] Frontend rodando (porta 3000)
- [ ] Sem erros de TypeScript
- [ ] Login funcionando 