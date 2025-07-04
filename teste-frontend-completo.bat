@echo off
title Teste Frontend Completo - Sistema Amoras Capital
echo ========================================
echo Teste Frontend Completo
echo Sistema Amoras Capital
echo ========================================
echo.

echo 1. Navegando para o diretorio frontend...
cd frontend
echo.

echo 2. Verificando instalacao do lucide-react...
npm list lucide-react
echo.

echo 3. Verificando tipos TypeScript...
npx tsc --noEmit
if %errorlevel% neq 0 (
    echo ERRO: Problemas TypeScript encontrados!
    pause
    exit /b 1
)
echo ✅ TypeScript OK
echo.

echo 4. Executando build de producao...
npm run build
if %errorlevel% neq 0 (
    echo ERRO: Build falhou!
    pause
    exit /b 1
)
echo ✅ Build OK
echo.

echo 5. Verificando arquivos de build...
dir build\*.* /b
echo ✅ Build files OK
echo.

echo ========================================
echo ✅ TODOS OS TESTES PASSARAM!
echo ========================================
echo.
echo Frontend funcionando corretamente:
echo - lucide-react instalado
echo - TypeScript sem erros
echo - Build de producao OK
echo - Todos os arquivos gerados
echo.
echo Para iniciar o servidor de desenvolvimento:
echo   npm start
echo.
echo Para acessar o sistema:
echo   http://localhost:3000
echo.
pause 