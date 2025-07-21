@echo off
echo ========================================
echo    Sistema Amoras Capital - RESTAURAR BACKUP
echo ========================================
echo.
echo ATENÇÃO: Esta operação irá substituir todos os dados atuais!
echo.

set /p confirmar="Tem certeza que deseja restaurar backup? (s/N): "
if /i not "%confirmar%"=="s" (
    echo Restauração cancelada.
    pause
    exit /b 0
)

echo.
echo Verificando se a pasta de backups existe...
if not exist "backups" (
    echo ERRO: Pasta de backups não encontrada!
    pause
    exit /b 1
)

echo.
echo Listando arquivos de backup disponíveis:
echo.
dir backups\*.sql /b 2>nul
if %errorlevel% neq 0 (
    echo ERRO: Nenhum arquivo de backup encontrado!
    pause
    exit /b 1
)

echo.
set /p backup_file="Digite o nome do arquivo de backup (ex: amoras_capital_2025-07-18_17-30-00.sql): "

if not exist "backups\%backup_file%" (
    echo ERRO: Arquivo de backup não encontrado!
    pause
    exit /b 1
)

echo.
echo Verificando se o banco está rodando...
docker-compose ps postgres | findstr "Up" >nul
if %errorlevel% neq 0 (
    echo ERRO: Banco de dados não está rodando!
    echo Execute: inicializar-banco.bat
    pause
    exit /b 1
)

echo ✓ Banco de dados está rodando

echo.
echo ATENÇÃO: Restaurando backup...
echo Arquivo: backups\%backup_file%
echo.

docker-compose exec -T postgres psql -U postgres -d amoras_capital < "backups\%backup_file%"

if %errorlevel% equ 0 (
    echo.
    echo ✓ Backup restaurado com sucesso!
    echo.
    echo Para aplicar as mudanças, reinicie o sistema:
    echo parar-sistema.bat
    echo iniciar-sistema-completo.bat
) else (
    echo.
    echo ERRO: Falha ao restaurar backup!
    echo Verifique se o arquivo está correto e o banco está funcionando.
)

echo.
echo ========================================
pause 