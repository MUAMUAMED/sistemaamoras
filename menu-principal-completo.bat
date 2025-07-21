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
echo [2] Configurar ambiente SQLite (Local)
echo [3] Inicializar banco PostgreSQL (Docker)
echo [4] Inicializar banco SQLite (Local)
echo [5] Iniciar sistema completo (Docker)
echo [6] Iniciar sistema local (SQLite)
echo [7] Ver logs do sistema (Docker)
echo [8] Parar sistema Docker
echo [9] Parar sistema local
echo [10] Status dos serviços
echo [11] Backup do banco de dados
echo [12] Restaurar backup
echo [13] Limpar dados (cuidado!)
echo [14] Testar sistema completo
echo [15] Testar TypeScript
echo [0] Sair
echo.
echo ========================================
set /p opcao="Digite sua opção: "

if "%opcao%"=="1" (
    call configurar-ambiente.bat
    goto menu
) else if "%opcao%"=="2" (
    call configurar-ambiente-sqlite.bat
    goto menu
) else if "%opcao%"=="3" (
    call inicializar-banco.bat
    goto menu
) else if "%opcao%"=="4" (
    call inicializar-banco-sqlite.bat
    goto menu
) else if "%opcao%"=="5" (
    call iniciar-sistema-completo.bat
    goto menu
) else if "%opcao%"=="6" (
    call iniciar-sistema-local.bat
    goto menu
) else if "%opcao%"=="7" (
    call ver-logs.bat
    goto menu
) else if "%opcao%"=="8" (
    call parar-sistema.bat
    goto menu
) else if "%opcao%"=="9" (
    call parar-sistema-local.bat
    goto menu
) else if "%opcao%"=="10" (
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
) else if "%opcao%"=="11" (
    call backup-banco.bat
    goto menu
) else if "%opcao%"=="12" (
    call restaurar-backup.bat
    goto menu
) else if "%opcao%"=="13" (
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
) else if "%opcao%"=="14" (
    call teste-sistema-completo.bat
    goto menu
) else if "%opcao%"=="15" (
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