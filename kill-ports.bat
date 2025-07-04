@echo off
echo ===============================================
echo   MATANDO PROCESSOS NAS PORTAS 3000 E 3001
echo ===============================================
echo.

echo Verificando processos na porta 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Matando processo PID: %%a
    taskkill /PID %%a /F 2>nul
)

echo.
echo Verificando processos na porta 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    echo Matando processo PID: %%a
    taskkill /PID %%a /F 2>nul
)

echo.
echo Matando todos os processos Node.js...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM ts-node.exe 2>nul
taskkill /F /IM ts-node-dev.exe 2>nul

echo.
echo Aguardando 3 segundos para liberação das portas...
timeout /t 3 /nobreak >nul

echo.
echo ===============================================
echo   VERIFICAÇÃO FINAL
echo ===============================================
echo.

echo Verificando se as portas estão livres...
netstat -ano | findstr :3000 && echo "⚠️  Porta 3000 ainda em uso" || echo "✅ Porta 3000 livre"
netstat -ano | findstr :3001 && echo "⚠️  Porta 3001 ainda em uso" || echo "✅ Porta 3001 livre"

echo.
echo Processos finalizados!
echo Agora você pode iniciar o sistema novamente.
echo.
pause 