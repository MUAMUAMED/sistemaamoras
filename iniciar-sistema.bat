@echo off
echo ========================================
echo    Sistema Amoras Capital - INICIAR
echo ========================================
echo.
echo Iniciando Backend...
start "Amoras Capital - Backend" run-backend.bat
echo.
echo Aguardando 5 segundos...
timeout /t 5 /nobreak > nul
echo.
echo Iniciando Frontend...
start "Amoras Capital - Frontend" run-frontend.bat
echo.
echo ========================================
echo Sistema iniciado com sucesso!
echo.
echo URLs do Sistema:
echo - Frontend: http://localhost:3000
echo - Backend: http://https://amoras-sistema-gew1.gbl2yq.easypanel.host
echo - API Docs: http://https://amoras-sistema-gew1.gbl2yq.easypanel.host/api-docs
echo.
echo Credenciais de teste:
echo - Admin: admin@amorascapital.com / admin123
echo - Atendente: atendente@amorascapital.com / atendente123
echo ========================================
echo.
echo Pressione qualquer tecla para continuar...
pause > nul 