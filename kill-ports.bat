@echo off
echo Matando processos nas portas 3000 e 3001...

echo.
echo Processos na porta 3000:
netstat -ano | findstr :3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Matando processo %%a
    taskkill /PID %%a /F 2>nul
)

echo.
echo Processos na porta 3001:
netstat -ano | findstr :3001
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    echo Matando processo %%a
    taskkill /PID %%a /F 2>nul
)

echo.
echo Portas liberadas!
pause 