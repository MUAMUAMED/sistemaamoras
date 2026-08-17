@echo off
:menu
cls
echo ===============================================
echo   🌸 SISTEMA AMORAS CAPITAL - MENU PRINCIPAL
echo ===============================================
echo.
echo Escolha uma opção:
echo.
echo 1. 🚀 CORRIGIR TODOS OS PROBLEMAS (Recomendado)
echo 2. 🔍 DIAGNÓSTICO DO SISTEMA
echo 3. ⚡ MATAR PROCESSOS NAS PORTAS
echo 4. 🌐 INICIAR SISTEMA COMPLETO
echo 5. 🖥️  INICIAR APENAS BACKEND
echo 6. 🎨 INICIAR APENAS FRONTEND
echo 7. 📚 VER DOCUMENTAÇÃO
echo 8. ❌ SAIR
echo.
echo ===============================================
set /p escolha="Digite sua escolha (1-8): "

if %escolha%==1 goto corrigir
if %escolha%==2 goto diagnostico
if %escolha%==3 goto matar_processos
if %escolha%==4 goto iniciar_completo
if %escolha%==5 goto backend_only
if %escolha%==6 goto frontend_only
if %escolha%==7 goto documentacao
if %escolha%==8 goto sair

echo Opção inválida! Pressione qualquer tecla...
pause >nul
goto menu

:corrigir
cls
echo ===============================================
echo   🚀 CORREÇÃO AUTOMÁTICA DE TODOS OS PROBLEMAS
echo ===============================================
echo.
echo Este script irá:
echo ✅ Matar todos os processos conflitantes
echo ✅ Verificar e instalar dependências
echo ✅ Validar TypeScript
echo ✅ Configurar banco de dados
echo ✅ Iniciar sistema limpo
echo.
pause
call corrigir-todos-problemas.bat
pause
goto menu

:diagnostico
cls
echo ===============================================
echo   🔍 DIAGNÓSTICO DO SISTEMA
echo ===============================================
echo.
call diagnostico-sistema.bat
goto menu

:matar_processos
cls
echo ===============================================
echo   ⚡ MATANDO PROCESSOS NAS PORTAS
echo ===============================================
echo.
call kill-ports.bat
goto menu

:iniciar_completo
cls
echo ===============================================
echo   🌐 INICIANDO SISTEMA COMPLETO
echo ===============================================
echo.
call start-system-clean.bat
goto menu

:backend_only
cls
echo ===============================================
echo   🖥️  INICIANDO APENAS BACKEND
echo ===============================================
echo.
call start-backend-only.bat
goto menu

:frontend_only
cls
echo ===============================================
echo   🎨 INICIANDO APENAS FRONTEND
echo ===============================================
echo.
call start-frontend-only.bat
goto menu

:documentacao
cls
echo ===============================================
echo   📚 DOCUMENTAÇÃO DISPONÍVEL
echo ===============================================
echo.
echo 📄 PROBLEMAS_CORRIGIDOS_COMPLETO.md
echo    - Documentação completa de todos os problemas e soluções
echo.
echo 📄 CORRECOES_LOGIN_SALE.md
echo    - Correções específicas de login e vendas
echo.
echo 🎮 CONTAS PARA TESTE:
echo    ADMIN: admin@amorascapital.com / admin123
echo    ATENDENTE: atendente@amorascapital.com / atendente123
echo    GERENTE: gerente@amorascapital.com / gerente123
echo.
echo 🌐 LINKS DO SISTEMA:
echo    Backend: http://https://amoras-sistema-gew1.gbl2yq.easypanel.host
echo    Frontend: http://localhost:3000
echo    Documentação API: http://https://amoras-sistema-gew1.gbl2yq.easypanel.host/api-docs
echo    Health Check: http://https://amoras-sistema-gew1.gbl2yq.easypanel.host/health
echo.
pause
goto menu

:sair
cls
echo ===============================================
echo   👋 OBRIGADO POR USAR O SISTEMA AMORAS CAPITAL
echo ===============================================
echo.
echo Sistema desenvolvido com ❤️ para Amoras Capital
echo.
echo Para problemas futuros, execute:
echo .\menu-principal.bat
echo.
echo Até logo! 🌸
echo.
pause
exit

:eof 