@echo off
echo.
echo ========================================
echo   🍇 Setup Local - Sistema Amoras
echo ========================================
echo.

echo [1/6] Verificando Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker não encontrado!
    echo    Instale Docker Desktop: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)
echo ✅ Docker encontrado

echo.
echo [2/6] Iniciando PostgreSQL...
docker run --name postgres-amoras-dev -e POSTGRES_USER=amoras -e POSTGRES_PASSWORD=123456 -e POSTGRES_DB=amoras_capital -p 5432:5432 -d postgres:15-alpine
if %errorlevel% equ 0 (
    echo ✅ PostgreSQL iniciado
) else (
    echo ⚠️  PostgreSQL já existe, tentando iniciar...
    docker start postgres-amoras-dev
    echo ✅ PostgreSQL iniciado
)

echo.
echo [3/6] Aguardando PostgreSQL ficar pronto...
timeout /t 5 /nobreak >nul
echo ✅ PostgreSQL pronto

echo.
echo [4/6] Configurando ambiente backend...
cd backend
copy env.local.example .env >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Arquivo .env criado
) else (
    echo ⚠️  Arquivo .env já existe
)

echo.
echo [5/6] Instalando dependências e configurando banco...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Erro ao instalar dependências
    pause
    exit /b 1
)
echo ✅ Dependências instaladas

echo.
echo Gerando cliente Prisma...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ❌ Erro ao gerar cliente Prisma
    pause
    exit /b 1
)
echo ✅ Cliente Prisma gerado

echo.
echo Aplicando schema ao banco...
call npx prisma db push
if %errorlevel% neq 0 (
    echo ❌ Erro ao aplicar schema
    pause
    exit /b 1
)
echo ✅ Schema aplicado

echo.
echo Populando banco com dados de teste...
call npx prisma db seed
if %errorlevel% neq 0 (
    echo ⚠️  Erro ao popular banco (normal se já tiver dados)
) else (
    echo ✅ Banco populado com dados de teste
)

cd..

echo.
echo [6/6] Instalando dependências do frontend...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Erro ao instalar dependências do frontend
    pause
    exit /b 1
)
echo ✅ Dependências do frontend instaladas
cd..

echo.
echo ========================================
echo   🎉 Setup Concluído com Sucesso!
echo ========================================
echo.
echo Para iniciar o sistema:
echo.
echo 1. Backend:  cd backend ^&^& npm run dev
echo 2. Frontend: cd frontend ^&^& npm start
echo.
echo URLs:
echo - Frontend: http://localhost:3000
echo - Backend:  http://https://amoras-sistema-gew1.emebtn.easypanel.host
echo - API Docs: http://https://amoras-sistema-gew1.emebtn.easypanel.host/api-docs
echo.
echo Banco de dados:
echo - Host: localhost:5432
echo - User: amoras
echo - Pass: 123456
echo - DB:   amoras_capital
echo.
pause 