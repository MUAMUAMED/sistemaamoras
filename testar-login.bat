@echo off
title Teste de Login - Sistema Amoras Capital
echo ========================================
echo 🔐 Teste de Login das Contas Criadas
echo Sistema Amoras Capital
echo ========================================
echo.

echo Verificando se o servidor backend está rodando...
curl -s -o nul -w "%%{http_code}" "http://https://amoras-sistema-gew1.emebtn.easypanel.host/api/health" > temp_response.txt
set /p response=<temp_response.txt
del temp_response.txt

if "%response%"=="200" (
    echo ✅ Servidor backend está funcionando!
    echo.
) else (
    echo ❌ Servidor backend não está respondendo!
    echo    Certifique-se que o backend está rodando na porta 3001
    echo.
    echo 💡 Para iniciar o servidor:
    echo    cd backend
    echo    npm run dev
    echo.
    pause
    exit /b 1
)

echo ========================================
echo Testando login das contas criadas...
echo ========================================
echo.

echo 🔑 Testando conta ADMIN...
curl -s -X POST "http://https://amoras-sistema-gew1.emebtn.easypanel.host/api/auth/login" ^
-H "Content-Type: application/json" ^
-d "{\"email\":\"admin@amorascapital.com\",\"password\":\"admin123\"}" > admin_response.txt

findstr /C:"token" admin_response.txt >nul
if %errorlevel%==0 (
    echo ✅ ADMIN - Login bem-sucedido!
    echo    Email: admin@amorascapital.com
    echo    Senha: admin123
) else (
    echo ❌ ADMIN - Erro no login!
    type admin_response.txt
)
echo.

echo 🔑 Testando conta ATENDENTE...
curl -s -X POST "http://https://amoras-sistema-gew1.emebtn.easypanel.host/api/auth/login" ^
-H "Content-Type: application/json" ^
-d "{\"email\":\"atendente@amorascapital.com\",\"password\":\"atendente123\"}" > atendente_response.txt

findstr /C:"token" atendente_response.txt >nul
if %errorlevel%==0 (
    echo ✅ ATENDENTE - Login bem-sucedido!
    echo    Email: atendente@amorascapital.com
    echo    Senha: atendente123
) else (
    echo ❌ ATENDENTE - Erro no login!
    type atendente_response.txt
)
echo.

echo 🔑 Testando conta GERENTE...
curl -s -X POST "http://https://amoras-sistema-gew1.emebtn.easypanel.host/api/auth/login" ^
-H "Content-Type: application/json" ^
-d "{\"email\":\"gerente@amorascapital.com\",\"password\":\"gerente123\"}" > gerente_response.txt

findstr /C:"token" gerente_response.txt >nul
if %errorlevel%==0 (
    echo ✅ GERENTE - Login bem-sucedido!
    echo    Email: gerente@amorascapital.com
    echo    Senha: gerente123
) else (
    echo ❌ GERENTE - Erro no login!
    type gerente_response.txt
)
echo.

echo ========================================
echo 📋 Contas disponíveis:
echo ========================================
echo.
echo 👑 ADMIN
echo    Email: admin@amorascapital.com
echo    Senha: admin123
echo.
echo 👤 ATENDENTE
echo    Email: atendente@amorascapital.com
echo    Senha: atendente123
echo.
echo 👔 GERENTE
echo    Email: gerente@amorascapital.com
echo    Senha: gerente123
echo.
echo ========================================
echo 🌐 Acesse o sistema em: http://localhost:3000
echo ========================================
echo.

rem Limpar arquivos temporários
del admin_response.txt 2>nul
del atendente_response.txt 2>nul
del gerente_response.txt 2>nul

pause 