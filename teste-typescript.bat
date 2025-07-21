@echo off
echo ========================================
echo    Sistema Amoras Capital - TESTE TYPESCRIPT
echo ========================================
echo.
echo Verificando erros de TypeScript no frontend...
echo.

cd frontend

echo Executando verificação de tipos...
npx tsc --noEmit

if %errorlevel% equ 0 (
    echo.
    echo ✓ Nenhum erro de TypeScript encontrado!
    echo.
    echo Para iniciar o frontend em modo de desenvolvimento:
    echo npm start
) else (
    echo.
    echo ✗ Erros de TypeScript encontrados!
    echo.
    echo Para ver os erros detalhados:
    echo npx tsc --noEmit --pretty
)

cd ..

echo.
echo ========================================
pause 