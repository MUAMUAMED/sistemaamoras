@echo off
echo ========================================
echo    Sistema Amoras Capital - INICIALIZAR BANCO
echo ========================================
echo.
echo Este script irá:
echo 1. Iniciar apenas o banco de dados PostgreSQL
echo 2. Executar as migrações do Prisma
echo 3. Executar o seed inicial
echo.

echo Verificando se o Docker está instalado...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Docker não está instalado ou não está rodando!
    echo Por favor, instale o Docker Desktop e inicie-o.
    pause
    exit /b 1
)

echo Docker encontrado! Iniciando banco de dados...
echo.

echo Parando containers existentes (se houver)...
docker-compose down

echo.
echo Iniciando apenas o banco de dados PostgreSQL...
docker-compose up -d postgres

echo.
echo Aguardando banco de dados iniciar...
timeout /t 15 /nobreak > nul

echo.
echo Verificando se o banco está rodando...
docker-compose ps postgres

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
echo Banco de dados inicializado com sucesso!
echo.
echo Para iniciar o sistema completo, execute:
echo iniciar-sistema-completo.bat
echo.
echo Para iniciar apenas backend e frontend, execute:
echo iniciar-sistema.bat
echo ========================================
echo.
pause 