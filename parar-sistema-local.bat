@echo off
echo ========================================
echo    Sistema Amoras Capital - PARAR LOCAL
echo ========================================
echo.
echo Parando processos do sistema...

echo Parando processos na porta 3000 (Frontend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo Parando processos na porta 3001 (Backend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo.
echo Sistema parado com sucesso!
echo.
echo Para iniciar novamente:
echo - iniciar-sistema-local.bat (modo local)
echo - iniciar-sistema-completo.bat (modo Docker)
echo ========================================
echo.
pause 