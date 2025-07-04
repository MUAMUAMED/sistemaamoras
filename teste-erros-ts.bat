@echo off
echo ========================================
echo   Teste de Erros TypeScript
echo ========================================
echo.

echo Navegando para o backend...
cd backend

echo.
echo Verificando erros TypeScript específicos...
echo.

echo ✅ Testando compilação do backend...
npx tsc --noEmit --showConfig

echo.
echo ✅ Testando apenas arquivo de leads...
npx tsc --noEmit src/routes/lead.routes.ts

echo.
echo ========================================
echo   Teste Concluído
echo ========================================
pause 