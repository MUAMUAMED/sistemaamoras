@echo off
echo ========================================
echo    Sistema Amoras Capital - INICIAR LOCAL
echo ========================================
echo.
echo Este script irá iniciar o sistema localmente:
echo - Backend (Node.js)
echo - Frontend (React)
echo.
echo NOTA: Para usar com banco de dados PostgreSQL,
echo você precisa ter o PostgreSQL instalado e rodando.
echo.

echo Verificando se o Node.js está instalado...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Node.js não está instalado!
    echo Por favor, instale o Node.js em: https://nodejs.org/
    pause
    exit /b 1
)

echo ✓ Node.js encontrado!

echo.
echo Verificando se as dependências estão instaladas...
if not exist "backend\node_modules" (
    echo Instalando dependências do backend...
    cd backend
    npm install
    cd ..
)

if not exist "frontend\node_modules" (
    echo Instalando dependências do frontend...
    cd frontend
    npm install
    cd ..
)

echo.
echo Configurando ambiente...
call configurar-ambiente.bat

echo.
echo Iniciando Backend...
start "Amoras Capital - Backend" cmd /k "cd backend && npm run dev"

echo.
echo Aguardando 5 segundos para o backend iniciar...
timeout /t 5 /nobreak > nul

echo.
echo Iniciando Frontend...
start "Amoras Capital - Frontend" cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo Sistema iniciado localmente!
echo.
echo URLs do Sistema:
echo - Frontend: http://localhost:3000
echo - Backend: http://https://amoras-sistema-gew1.gbl2yq.easypanel.host
echo - API Docs: http://https://amoras-sistema-gew1.gbl2yq.easypanel.host/api-docs
echo.
echo Credenciais de teste:
echo - Admin: admin@amorascapital.com / admin123
echo - Atendente: atendente@amorascapital.com / atendente123
echo.
echo Para parar o sistema, feche as janelas dos terminais.
echo ========================================
echo.
pause 