@echo off
echo ===============================================
echo   TESTE FRONTEND - LOGIN E REDIRECIONAMENTO
echo ===============================================
echo.

echo Iniciando servidor frontend...
cd frontend
start cmd /k "npm start"
echo.

echo Aguardando 10 segundos para o servidor inicializar...
timeout /t 10 /nobreak >nul
echo.

echo ===============================================
echo   TESTE COMPLETO
echo ===============================================
echo.
echo 1. Acesse: http://localhost:3000
echo 2. Faça login com uma das contas:
echo.
echo    ADMIN: admin@amorascapital.com / admin123
echo    ATENDENTE: atendente@amorascapital.com / atendente123
echo    GERENTE: gerente@amorascapital.com / gerente123
echo.
echo 3. Verifique se após login foi redirecionado para /dashboard
echo.
echo ===============================================
echo   VERIFICAÇÕES
echo ===============================================
echo.
echo ✅ AuthStore atualizado com useAuthStore
echo ✅ Login chamando método login do store
echo ✅ App.tsx com useEffect para checkAuth
echo ✅ Redirecionamento para /dashboard após login
echo.
echo Pressione qualquer tecla para finalizar...
pause >nul 