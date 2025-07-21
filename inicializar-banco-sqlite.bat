@echo off
echo ========================================
echo    Sistema Amoras Capital - INICIALIZAR SQLITE
echo ========================================
echo.
echo Este script irá:
echo 1. Configurar o ambiente para SQLite
echo 2. Executar as migrações do Prisma
echo 3. Executar o seed inicial
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
echo Configurando ambiente para SQLite...
call configurar-ambiente-sqlite.bat

echo.
echo Verificando se as dependências estão instaladas...
if not exist "backend\node_modules" (
    echo Instalando dependências do backend...
    cd backend
    npm install
    cd ..
)

echo.
echo Executando migrações do Prisma...
cd backend
npx prisma migrate deploy

echo.
echo Executando seed inicial...
npx prisma db seed

cd ..

echo.
echo ========================================
echo Banco SQLite inicializado com sucesso!
echo.
echo Para iniciar o sistema localmente:
echo iniciar-sistema-local.bat
echo ========================================
echo.
pause 