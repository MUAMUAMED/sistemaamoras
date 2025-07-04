@echo off
echo ========================================
echo   Teste do Sistema Amoras Capital
echo ========================================
echo.

echo Verificando Node.js...
node --version
if errorlevel 1 (
    echo ❌ Node.js não encontrado
    pause
    exit /b 1
)

echo Verificando npm...
npm --version
if errorlevel 1 (
    echo ❌ npm não encontrado
    pause
    exit /b 1
)

echo.
echo Verificando dependências do backend...
cd backend
if not exist node_modules (
    echo ⚠️  Instalando dependências do backend...
    npm install
)

echo.
echo Verificando dependências do frontend...
cd ..\frontend
if not exist node_modules (
    echo ⚠️  Instalando dependências do frontend...
    npm install
)

echo.
echo Testando build do TypeScript...
cd ..\backend
npx tsc --noEmit
if errorlevel 1 (
    echo ❌ Erro no TypeScript do backend
    pause
    exit /b 1
)

cd ..\frontend
npx tsc --noEmit
if errorlevel 1 (
    echo ❌ Erro no TypeScript do frontend
    pause
    exit /b 1
)

echo.
echo ✅ Todos os testes passaram!
echo.
echo Sistema pronto para uso:
echo - Backend: npm run dev (na pasta backend)
echo - Frontend: npm start (na pasta frontend)
echo - Ou use: start-system.bat
echo.
pause 