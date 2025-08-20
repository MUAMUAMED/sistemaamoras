@echo off
echo ========================================
echo   Sistema ERP/CRM Amoras Capital
echo ========================================
echo.
echo Iniciando backend e frontend...
echo.

REM Abrir nova janela para o backend
start "Backend - Amoras Capital" cmd /k "cd backend && npm run dev"

REM Aguardar um pouco antes de iniciar o frontend
timeout /t 5 /nobreak > nul

REM Abrir nova janela para o frontend  
start "Frontend - Amoras Capital" cmd /k "cd frontend && npm start"

echo.
echo ✅ Sistema iniciado com sucesso!
echo.
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend: http://https://amoras-sistema-gew1.emebtn.easypanel.host
echo 📚 API Docs: http://https://amoras-sistema-gew1.emebtn.easypanel.host/api-docs
echo.
echo Pressione qualquer tecla para fechar...
pause > nul 