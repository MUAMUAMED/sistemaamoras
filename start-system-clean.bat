@echo off
echo ===============================================
echo   INICIANDO SISTEMA AMORAS CAPITAL - LIMPO
echo ===============================================
echo.

echo Passo 1: Matando processos existentes...
echo Verificando processos na porta 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Matando processo PID: %%a
    taskkill /PID %%a /F 2>nul
)

echo.
echo Verificando processos na porta 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    echo Matando processo PID: %%a
    taskkill /PID %%a /F 2>nul
)

echo.
echo Matando todos os processos Node.js...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM ts-node.exe 2>nul
taskkill /F /IM ts-node-dev.exe 2>nul

echo.
echo Aguardando 5 segundos para liberação das portas...
timeout /t 5 /nobreak >nul

echo.
echo Passo 2: Verificando se as portas estão livres...
netstat -ano | findstr :3000 && (
    echo "❌ Porta 3000 ainda em uso. Abortando..."
    pause
    exit /b 1
) || echo "✅ Porta 3000 livre"

netstat -ano | findstr :3001 && (
    echo "❌ Porta 3001 ainda em uso. Abortando..."
    pause
    exit /b 1
) || echo "✅ Porta 3001 livre"

echo.
echo Passo 3: Iniciando Backend...
cd backend
start "Backend - Amoras Capital" cmd /k "npm run dev"

echo.
echo Aguardando 10 segundos para o backend inicializar...
timeout /t 10 /nobreak >nul

echo.
echo Passo 4: Iniciando Frontend...
cd ../frontend
start "Frontend - Amoras Capital" cmd /k "npm start"

echo.
echo Aguardando 10 segundos para o frontend inicializar...
timeout /t 10 /nobreak >nul

echo.
echo ===============================================
echo   SISTEMA INICIADO COM SUCESSO!
echo ===============================================
echo.
echo 🖥️  Backend: http://https://amoras-sistema-gew1.emebtn.easypanel.host
echo 🌐 Frontend: http://localhost:3000
echo 📚 Documentação: http://https://amoras-sistema-gew1.emebtn.easypanel.host/api-docs
echo 🏥 Health Check: http://https://amoras-sistema-gew1.emebtn.easypanel.host/health
echo.
echo Contas para teste:
echo   👤 ADMIN: admin@amorascapital.com / admin123
echo   👤 ATENDENTE: atendente@amorascapital.com / atendente123
echo   👤 GERENTE: gerente@amorascapital.com / gerente123
echo.
echo Pressione qualquer tecla para finalizar...
pause >nul 