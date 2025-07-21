@echo off
echo ========================================
echo    Sistema Amoras Capital - CONFIGURAR AMBIENTE
echo ========================================
echo.
echo Configurando arquivo .env do backend...

cd backend

echo DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/amoras_capital?sslmode=disable" > .env
echo JWT_SECRET="sua_chave_secreta_jwt_super_segura_para_desenvolvimento" >> .env
echo JWT_EXPIRES_IN="7d" >> .env
echo PORT=3001 >> .env
echo NODE_ENV="development" >> .env
echo CORS_ORIGIN="http://localhost:3000" >> .env

cd ..

echo.
echo Arquivo .env configurado com sucesso!
echo.
echo Configurações aplicadas:
echo - Banco de dados: PostgreSQL local (porta 5432)
echo - Backend: Porta 3001
echo - Frontend: Porta 3000
echo.
echo Para iniciar o sistema completo, execute:
echo iniciar-sistema-completo.bat
echo ========================================
echo.
pause 