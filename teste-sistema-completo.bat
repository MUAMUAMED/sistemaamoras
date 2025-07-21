@echo off
echo ========================================
echo    Sistema Amoras Capital - TESTE COMPLETO
echo ========================================
echo.
echo Este script irá testar se todos os serviços estão funcionando.
echo.

echo [1/6] Verificando se o Docker está rodando...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Docker não está instalado ou não está rodando!
    pause
    exit /b 1
)
echo ✓ Docker está funcionando

echo.
echo [2/6] Verificando se os containers estão rodando...
docker-compose ps | findstr "Up" >nul
if %errorlevel% neq 0 (
    echo ERRO: Containers não estão rodando!
    echo Execute: iniciar-sistema-completo.bat
    pause
    exit /b 1
)
echo ✓ Containers estão rodando

echo.
echo [3/6] Testando conexão com o banco de dados...
docker-compose exec -T postgres pg_isready -U postgres >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Banco de dados não está respondendo!
    pause
    exit /b 1
)
echo ✓ Banco de dados está funcionando

echo.
echo [4/6] Testando API do backend...
curl -s http://localhost:3001/health >nul 2>&1
if %errorlevel% neq 0 (
    echo AVISO: Backend pode não estar respondendo ainda...
    echo Aguardando 10 segundos...
    timeout /t 10 /nobreak > nul
    curl -s http://localhost:3001/health >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERRO: Backend não está respondendo!
        pause
        exit /b 1
    )
)
echo ✓ Backend está funcionando

echo.
echo [5/6] Testando frontend...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo AVISO: Frontend pode não estar respondendo ainda...
    echo Aguardando 5 segundos...
    timeout /t 5 /nobreak > nul
    curl -s http://localhost:3000 >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERRO: Frontend não está respondendo!
        pause
        exit /b 1
    )
)
echo ✓ Frontend está funcionando

echo.
echo [6/6] Testando Nginx...
curl -s http://localhost:80 >nul 2>&1
if %errorlevel% neq 0 (
    echo AVISO: Nginx pode não estar respondendo ainda...
    echo Aguardando 5 segundos...
    timeout /t 5 /nobreak > nul
    curl -s http://localhost:80 >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERRO: Nginx não está respondendo!
        pause
        exit /b 1
    )
)
echo ✓ Nginx está funcionando

echo.
echo ========================================
echo ✓ TODOS OS TESTES PASSARAM!
echo.
echo Sistema funcionando corretamente:
echo - Frontend: http://localhost:3000
echo - Backend: http://localhost:3001
echo - Nginx: http://localhost:80
echo.
echo Credenciais de teste:
echo - Admin: admin@amorascapital.com / admin123
echo - Atendente: atendente@amorascapital.com / atendente123
echo ========================================
echo.
pause 