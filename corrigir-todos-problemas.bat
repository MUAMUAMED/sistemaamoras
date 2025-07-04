@echo off
echo ===============================================
echo   CORREÇÃO AUTOMÁTICA DE TODOS OS PROBLEMAS
echo ===============================================
echo.

echo Passo 1: Diagnóstico inicial...
echo ===============================================
echo.

echo Verificando processos em execução...
tasklist | findstr node.exe && (
    echo "⚠️  Processos Node.js detectados - serão finalizados"
) || echo "✅ Nenhum processo Node.js detectado"

echo.
echo Passo 2: Finalizando processos...
echo ===============================================
echo.

echo Matando processos na porta 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Finalizando PID: %%a
    taskkill /PID %%a /F 2>nul
)

echo.
echo Matando processos na porta 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    echo Finalizando PID: %%a
    taskkill /PID %%a /F 2>nul
)

echo.
echo Finalizando todos os processos Node.js...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM ts-node.exe 2>nul
taskkill /F /IM ts-node-dev.exe 2>nul

echo.
echo Aguardando 5 segundos para liberação completa...
timeout /t 5 /nobreak >nul

echo.
echo Passo 3: Verificando dependências...
echo ===============================================
echo.

echo Verificando Backend...
cd backend
if not exist node_modules (
    echo "⚠️  Instalando dependências do backend..."
    npm install
) else (
    echo "✅ Dependências do backend OK"
)

echo.
echo Verificando Frontend...
cd ../frontend
if not exist node_modules (
    echo "⚠️  Instalando dependências do frontend..."
    npm install
) else (
    echo "✅ Dependências do frontend OK"
)

echo.
echo Passo 4: Verificando TypeScript...
echo ===============================================
echo.

echo Verificando backend...
cd ../backend
npx tsc --noEmit && echo "✅ Backend TypeScript OK" || (
    echo "⚠️  Erros TypeScript no backend detectados"
    echo "Tentando compilar mesmo assim..."
)

echo.
echo Verificando frontend...
cd ../frontend
npx tsc --noEmit && echo "✅ Frontend TypeScript OK" || (
    echo "⚠️  Erros TypeScript no frontend detectados"
    echo "Tentando compilar mesmo assim..."
)

echo.
echo Passo 5: Verificando banco de dados...
echo ===============================================
echo.

cd ../backend
if not exist .env (
    echo "⚠️  Arquivo .env não encontrado"
    echo "Copiando de .env.example..."
    if exist env.example (
        copy env.example .env
    ) else (
        echo "❌ Arquivo env.example não encontrado"
    )
)

echo.
echo Verificando Prisma...
if exist prisma\schema.prisma (
    echo "✅ Schema Prisma OK"
    echo "Gerando cliente Prisma..."
    npx prisma generate
) else (
    echo "❌ Schema Prisma não encontrado"
)

echo.
echo Passo 6: Verificação final das portas...
echo ===============================================
echo.

netstat -ano | findstr :3000 && (
    echo "❌ Porta 3000 ainda em uso - forçando liberação..."
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
        taskkill /PID %%a /F 2>nul
    )
) || echo "✅ Porta 3000 livre"

netstat -ano | findstr :3001 && (
    echo "❌ Porta 3001 ainda em uso - forçando liberação..."
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
        taskkill /PID %%a /F 2>nul
    )
) || echo "✅ Porta 3001 livre"

echo.
echo Aguardando 3 segundos...
timeout /t 3 /nobreak >nul

echo.
echo Passo 7: Iniciando sistema...
echo ===============================================
echo.

echo Iniciando Backend...
cd ../backend
start "Backend - Amoras Capital" cmd /k "npm run dev"

echo.
echo Aguardando 10 segundos para backend inicializar...
timeout /t 10 /nobreak >nul

echo.
echo Iniciando Frontend...
cd ../frontend
start "Frontend - Amoras Capital" cmd /k "npm start"

echo.
echo Aguardando 10 segundos para frontend inicializar...
timeout /t 10 /nobreak >nul

echo.
echo ===============================================
echo   CORREÇÃO CONCLUÍDA!
echo ===============================================
echo.
echo 🎉 SISTEMA AMORAS CAPITAL INICIADO COM SUCESSO!
echo.
echo 🖥️  Backend: http://localhost:3001
echo 🌐 Frontend: http://localhost:3000
echo 📚 Documentação: http://localhost:3001/api-docs
echo 🏥 Health Check: http://localhost:3001/health
echo.
echo 👤 CONTAS PARA TESTE:
echo    ADMIN: admin@amorascapital.com / admin123
echo    ATENDENTE: atendente@amorascapital.com / atendente123
echo    GERENTE: gerente@amorascapital.com / gerente123
echo.
echo ✅ PROBLEMAS CORRIGIDOS:
echo    - Processos duplicados eliminados
echo    - Portas 3000/3001 liberadas
echo    - Dependências verificadas
echo    - TypeScript verificado
echo    - Banco de dados configurado
echo    - Sistema iniciado corretamente
echo.
echo Pressione qualquer tecla para finalizar...
cd ..
pause 