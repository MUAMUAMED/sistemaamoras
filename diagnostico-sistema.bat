@echo off
echo ===============================================
echo   DIAGNÓSTICO COMPLETO DO SISTEMA
echo ===============================================
echo.

echo 1. VERIFICAÇÃO DE PORTAS
echo ===============================================
echo.
echo Verificando porta 3000...
netstat -ano | findstr :3000 && (
    echo "❌ Porta 3000 EM USO:"
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
        echo "   PID: %%a"
    )
) || echo "✅ Porta 3000 LIVRE"

echo.
echo Verificando porta 3001...
netstat -ano | findstr :3001 && (
    echo "❌ Porta 3001 EM USO:"
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
        echo "   PID: %%a"
    )
) || echo "✅ Porta 3001 LIVRE"

echo.
echo 2. VERIFICAÇÃO DE PROCESSOS NODE.JS
echo ===============================================
echo.
tasklist | findstr node.exe && (
    echo "❌ Processos Node.js em execução:"
    tasklist | findstr node.exe
) || echo "✅ Nenhum processo Node.js detectado"

echo.
echo 3. VERIFICAÇÃO DE DEPENDÊNCIAS
echo ===============================================
echo.
echo Verificando Backend...
cd backend
if exist node_modules (
    echo "✅ Backend: node_modules existe"
) else (
    echo "❌ Backend: node_modules não existe"
)

if exist package.json (
    echo "✅ Backend: package.json existe"
) else (
    echo "❌ Backend: package.json não existe"
)

cd ../frontend
if exist node_modules (
    echo "✅ Frontend: node_modules existe"
) else (
    echo "❌ Frontend: node_modules não existe"
)

if exist package.json (
    echo "✅ Frontend: package.json existe"
) else (
    echo "❌ Frontend: package.json não existe"
)

echo.
echo 4. VERIFICAÇÃO DE BANCO DE DADOS
echo ===============================================
echo.
cd ../backend
if exist prisma\schema.prisma (
    echo "✅ Schema do Prisma existe"
) else (
    echo "❌ Schema do Prisma não existe"
)

if exist .env (
    echo "✅ Arquivo .env existe"
) else (
    echo "❌ Arquivo .env não existe"
)

echo.
echo 5. VERIFICAÇÃO DE ARQUIVOS IMPORTANTES
echo ===============================================
echo.
if exist src\index.ts (
    echo "✅ Backend: index.ts existe"
) else (
    echo "❌ Backend: index.ts não existe"
)

cd ../frontend
if exist src\index.tsx (
    echo "✅ Frontend: index.tsx existe"
) else (
    echo "❌ Frontend: index.tsx não existe"
)

if exist src\App.tsx (
    echo "✅ Frontend: App.tsx existe"
) else (
    echo "❌ Frontend: App.tsx não existe"
)

echo.
echo 6. TESTE DE COMPILAÇÃO TYPESCRIPT
echo ===============================================
echo.
cd ../backend
echo Testando compilação do backend...
npx tsc --noEmit && echo "✅ Backend: TypeScript OK" || echo "❌ Backend: Erros TypeScript"

cd ../frontend
echo Testando compilação do frontend...
npx tsc --noEmit && echo "✅ Frontend: TypeScript OK" || echo "❌ Frontend: Erros TypeScript"

echo.
echo ===============================================
echo   DIAGNÓSTICO CONCLUÍDO
echo ===============================================
echo.
echo Próximos passos:
echo 1. Execute kill-ports.bat para matar processos
echo 2. Execute start-system-clean.bat para iniciar limpo
echo 3. Ou execute corrigir-todos-problemas.bat para correção automática
echo.
cd ..
pause 