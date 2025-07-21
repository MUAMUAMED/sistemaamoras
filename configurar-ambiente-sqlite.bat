@echo off
echo ========================================
echo    Sistema Amoras Capital - CONFIGURAR SQLITE
echo ========================================
echo.
echo Configurando ambiente para SQLite (desenvolvimento local)...
echo.

cd backend

echo Configurando arquivo .env para SQLite...
echo DATABASE_URL="file:./dev.db" > .env
echo JWT_SECRET="sua_chave_secreta_jwt_super_segura_para_desenvolvimento" >> .env
echo JWT_EXPIRES_IN="7d" >> .env
echo PORT=3001 >> .env
echo NODE_ENV="development" >> .env
echo CORS_ORIGIN="http://localhost:3000" >> .env

cd ..

echo.
echo Arquivo .env configurado com SQLite!
echo.
echo Configurações aplicadas:
echo - Banco de dados: SQLite local (dev.db)
echo - Backend: Porta 3001
echo - Frontend: Porta 3000
echo.
echo Para iniciar o sistema localmente:
echo iniciar-sistema-local.bat
echo ========================================
echo.
pause 