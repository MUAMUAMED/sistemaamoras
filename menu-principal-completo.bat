@echo off
title Sistema Amoras Capital - Menu Principal
color 0A

:menu
cls
echo ========================================
echo    Sistema Amoras Capital - MENU PRINCIPAL
echo ========================================
echo.
echo Escolha uma opção:
echo.
echo [1] Configurar ambiente PostgreSQL (Docker)
echo [2] Inicializar banco PostgreSQL (Docker)
echo [3] Iniciar sistema completo (Docker)
echo [4] Iniciar sistema local (PostgreSQL)
echo [5] Ver logs do sistema (Docker)
echo [6] Parar sistema Docker
echo [7] Parar sistema local
echo [8] Status dos serviços
echo [9] Backup do banco de dados
echo [10] Restaurar backup
echo [11] Limpar dados (cuidado!)
echo [12] Testar sistema completo
echo [13] Testar TypeScript
echo [0] Sair
echo.
echo ========================================
set /p opcao="Digite sua opção: "

if "%opcao%"=="1" (
    call configurar-ambiente.bat
    goto menu
) else if "%opcao%"=="2" (
    call inicializar-banco.bat
    goto menu
) else if "%opcao%"=="3" (
    call iniciar-sistema-completo.bat
    goto menu
) else if "%opcao%"=="4" (
    call iniciar-sistema-local.bat
    goto menu
) else if "%opcao%"=="5" (
    call ver-logs.bat
    goto menu
) else if "%opcao%"=="6" (
    call parar-sistema.bat
    goto menu
) else if "%opcao%"=="7" (
    call parar-sistema-local.bat
    goto menu
) else if "%opcao%"=="8" (
    cls
    echo ========================================
    echo    Status dos Serviços
    echo ========================================
    echo.
    docker-compose ps
    echo.
    echo ========================================
    pause
    goto menu
) else if "%opcao%"=="9" (
    call backup-banco.bat
    goto menu
) else if "%opcao%"=="10" (
    call restaurar-backup.bat
    goto menu
) else if "%opcao%"=="11" (
    cls
    echo ========================================
    echo    LIMPAR DADOS - ATENÇÃO!
    echo ========================================
    echo.
    echo Esta ação irá:
    echo - Parar todos os containers
    echo - Remover volumes de dados
    echo - Limpar banco de dados
    echo.
    set /p confirmar="Tem certeza? (s/N): "
    if /i "%confirmar%"=="s" (
        echo Parando e removendo containers...
        docker-compose down -v
        echo Limpeza concluída!
    ) else (
        echo Operação cancelada.
    )
    pause
    goto menu
) else if "%opcao%"=="12" (
    call teste-sistema-completo.bat
    goto menu
) else if "%opcao%"=="13" (
    call teste-typescript.bat
    goto menu
) else if "%opcao%"=="0" (
    echo Saindo...
    exit /b 0
) else (
    echo Opção inválida!
    timeout /t 2 /nobreak > nul
    goto menu
) 