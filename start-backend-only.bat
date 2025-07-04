@echo off
echo ===============================================
echo   INICIANDO APENAS BACKEND - AMORAS CAPITAL
echo ===============================================
echo.

echo Verificando e liberando porta 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    echo Finalizando processo PID: %%a
    taskkill /PID %%a /F 2>nul
)

echo.
echo Aguardando 3 segundos...
timeout /t 3 /nobreak >nul

echo.
echo Verificando se porta 3001 está livre...
netstat -ano | findstr :3001 && (
    echo "❌ Porta 3001 ainda em uso"
    pause
    exit /b 1
) || echo "✅ Porta 3001 livre"

echo.
echo Iniciando Backend...
cd backend
npm run dev

echo.
echo Se chegou até aqui, algo deu errado...
pause 