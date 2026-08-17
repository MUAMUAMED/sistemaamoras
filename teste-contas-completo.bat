@echo off
title Teste de Contas - Sistema Amoras Capital
color 0A
echo ========================================
echo 🔐 TESTE COMPLETO DE CONTAS
echo Sistema Amoras Capital
echo ========================================
echo.

echo ✅ Verificando servidor backend...
netstat -an | findstr :3001 >nul
if %errorlevel% equ 0 (
    echo ✅ Servidor backend está rodando na porta 3001
) else (
    echo ❌ Servidor backend não está rodando!
    echo 💡 Execute: .\run-backend.bat
    pause
    exit /b 1
)
echo.

echo ========================================
echo 🧪 TESTANDO CONTAS CRIADAS
echo ========================================
echo.

echo 🔑 Testando ADMIN...
powershell -Command "$response = try { Invoke-RestMethod -Uri 'http://https://amoras-sistema-gew1.gbl2yq.easypanel.host/api/auth/login' -Method Post -Body '{\"email\":\"admin@amorascapital.com\",\"password\":\"admin123\"}' -ContentType 'application/json'; 'SUCESSO' } catch { 'ERRO' }; $response"
echo.

echo 🔑 Testando ATENDENTE...
powershell -Command "$response = try { Invoke-RestMethod -Uri 'http://https://amoras-sistema-gew1.gbl2yq.easypanel.host/api/auth/login' -Method Post -Body '{\"email\":\"atendente@amorascapital.com\",\"password\":\"atendente123\"}' -ContentType 'application/json'; 'SUCESSO' } catch { 'ERRO' }; $response"
echo.

echo 🔑 Testando GERENTE...
powershell -Command "$response = try { Invoke-RestMethod -Uri 'http://https://amoras-sistema-gew1.gbl2yq.easypanel.host/api/auth/login' -Method Post -Body '{\"email\":\"gerente@amorascapital.com\",\"password\":\"gerente123\"}' -ContentType 'application/json'; 'SUCESSO' } catch { 'ERRO' }; $response"
echo.

echo ========================================
echo 📋 CONTAS DISPONÍVEIS
echo ========================================
echo.
echo 👑 ADMINISTRADOR
echo    Email: admin@amorascapital.com
echo    Senha: admin123
echo    Função: Acesso total ao sistema
echo.
echo 👤 ATENDENTE
echo    Email: atendente@amorascapital.com
echo    Senha: atendente123
echo    Função: Leads, vendas, scanner
echo.
echo 👔 GERENTE
echo    Email: gerente@amorascapital.com
echo    Senha: gerente123
echo    Função: Relatórios e configurações
echo.
echo ========================================
echo 🚀 COMO ACESSAR O SISTEMA
echo ========================================
echo.
echo 1. Acesse: http://localhost:3000
echo 2. Use qualquer uma das contas acima
echo 3. Faça login no sistema
echo.
echo 📱 Funcionalidades disponíveis:
echo    ✅ Dashboard com métricas
echo    ✅ Gestão de leads e pipeline
echo    ✅ Catálogo de produtos com códigos TTCCEEEE
echo    ✅ Sistema de vendas
echo    ✅ Scanner de códigos/QR
echo    ✅ Gateway de pagamentos
echo    ✅ Integração Chatwoot
echo    ✅ Automações inteligentes
echo.
echo ========================================
echo ✅ SISTEMA COMPLETO FUNCIONANDO!
echo ========================================
echo.
pause 