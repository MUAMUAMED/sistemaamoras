@echo off
echo ========================================
echo    Sistema Amoras Capital - INICIAR COMPLETO
echo ========================================
echo.
echo Este script irá iniciar o sistema completo com:
echo - Banco de dados PostgreSQL
echo - Backend API
echo - Frontend React
echo - Redis (cache)
echo - Nginx (proxy)
echo.
echo Verificando se o Docker está instalado...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Docker não está instalado ou não está rodando!
    echo Por favor, instale o Docker Desktop e inicie-o.
    pause
    exit /b 1
)

echo Docker encontrado! Iniciando sistema...
echo.

echo Parando containers existentes (se houver)...
docker-compose down

echo.
echo Iniciando todos os serviços...
docker-compose up -d

echo.
echo Aguardando serviços iniciarem...
timeout /t 10 /nobreak > nul

echo.
echo Verificando status dos serviços...
docker-compose ps

echo.
echo ========================================
echo Sistema iniciado com sucesso!
echo.
echo URLs do Sistema:
echo - Frontend: http://localhost:3000
echo - Backend: http://localhost:3001
echo - API Docs: http://localhost:3001/api-docs
echo - Nginx: http://localhost:80
echo.
echo Credenciais de teste:
echo - Admin: admin@amorascapital.com / admin123
echo - Atendente: atendente@amorascapital.com / atendente123
echo.
echo Para ver os logs em tempo real:
echo docker-compose logs -f
echo.
echo Para parar o sistema:
echo docker-compose down
echo ========================================
echo.
echo Pressione qualquer tecla para continuar...
pause > nul 