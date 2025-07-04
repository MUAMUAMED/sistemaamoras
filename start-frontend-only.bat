@echo off
echo ===============================================
echo   INICIANDO APENAS FRONTEND - AMORAS CAPITAL
echo ===============================================
echo.

echo Verificando e liberando porta 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Finalizando processo PID: %%a
    taskkill /PID %%a /F 2>nul
)

echo.
echo Aguardando 3 segundos...
timeout /t 3 /nobreak >nul

echo.
echo Verificando se porta 3000 está livre...
netstat -ano | findstr :3000 && (
    echo "❌ Porta 3000 ainda em uso"
    pause
    exit /b 1
) || echo "✅ Porta 3000 livre"

echo.
echo Iniciando Frontend...
cd frontend
npm start

echo.
echo Se chegou até aqui, algo deu errado...
pause 