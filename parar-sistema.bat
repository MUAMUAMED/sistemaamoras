@echo off
echo ========================================
echo    Sistema Amoras Capital - PARAR
echo ========================================
echo.
echo Parando todos os serviços...
docker-compose down

echo.
echo Sistema parado com sucesso!
echo.
echo Para iniciar novamente, execute:
echo iniciar-sistema-completo.bat
echo ========================================
echo.
pause 