@echo off
echo ========================================
echo    Sistema Amoras Capital - BACKUP BANCO
echo ========================================
echo.
echo Este script irá fazer backup do banco de dados PostgreSQL.
echo.

set /p confirmar="Deseja fazer backup do banco? (s/N): "
if /i not "%confirmar%"=="s" (
    echo Backup cancelado.
    pause
    exit /b 0
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
echo Criando pasta de backup...
if not exist "backups" mkdir backups

echo.
echo Gerando nome do arquivo de backup...
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "datestamp=%YYYY%-%MM%-%DD%_%HH%-%Min%-%Sec%"

set "backup_file=backups\amoras_capital_%datestamp%.sql"

echo.
echo Fazendo backup do banco de dados...
echo Arquivo: %backup_file%

docker-compose exec -T postgres pg_dump -U postgres -d amoras_capital > "%backup_file%"

if %errorlevel% equ 0 (
    echo.
    echo ✓ Backup realizado com sucesso!
    echo Arquivo salvo em: %backup_file%
    echo.
    echo Tamanho do arquivo:
    dir "%backup_file%" | findstr "%backup_file%"
) else (
    echo.
    echo ERRO: Falha ao fazer backup!
    echo Verifique se o banco está funcionando corretamente.
)

echo.
echo ========================================
pause 