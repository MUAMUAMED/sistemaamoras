@echo off
echo ========================================
echo    Sistema Amoras Capital - LOGS
echo ========================================
echo.
echo Escolha uma opção:
echo 1. Ver logs de todos os serviços
echo 2. Ver logs do backend
echo 3. Ver logs do frontend
echo 4. Ver logs do banco de dados
echo 5. Ver logs do Redis
echo 6. Ver logs do Nginx
echo.
set /p opcao="Digite sua opção (1-6): "

if "%opcao%"=="1" (
    echo Mostrando logs de todos os serviços...
    docker-compose logs -f
) else if "%opcao%"=="2" (
    echo Mostrando logs do backend...
    docker-compose logs -f backend
) else if "%opcao%"=="3" (
    echo Mostrando logs do frontend...
    docker-compose logs -f frontend
) else if "%opcao%"=="4" (
    echo Mostrando logs do banco de dados...
    docker-compose logs -f postgres
) else if "%opcao%"=="5" (
    echo Mostrando logs do Redis...
    docker-compose logs -f redis
) else if "%opcao%"=="6" (
    echo Mostrando logs do Nginx...
    docker-compose logs -f nginx
) else (
    echo Opção inválida!
    pause
    exit /b 1
)

echo.
echo Pressione Ctrl+C para sair dos logs
pause 