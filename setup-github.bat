@echo off
echo ========================================
echo    CONFIGURACAO DO GITHUB
echo ========================================
echo.

echo 1. Crie um repositorio no GitHub:
echo    - Acesse: https://github.com/new
echo    - Nome: sistemaamoras
echo    - Descricao: Sistema completo ERP/CRM/PDV para Amoras Capital
echo    - Nao inicialize com README
echo    - Clique em "Create repository"
echo.

echo 2. Copie a URL do repositorio criado
echo    Exemplo: https://github.com/seu-usuario/sistemaamoras.git
echo.

set /p GITHUB_URL="Cole a URL do repositorio aqui: "

echo.
echo 3. Configurando o repositorio remoto...
git remote add origin %GITHUB_URL%

echo.
echo 4. Enviando o codigo para o GitHub...
git push -u origin main

echo.
echo ========================================
echo    CONFIGURACAO CONCLUIDA!
echo ========================================
echo.
echo Seu repositorio esta disponivel em:
echo %GITHUB_URL%
echo.
pause 