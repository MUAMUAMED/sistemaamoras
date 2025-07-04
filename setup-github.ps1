Write-Host "========================================" -ForegroundColor Green
Write-Host "    CONFIGURACAO DO GITHUB" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "1. Crie um repositorio no GitHub:" -ForegroundColor Yellow
Write-Host "   - Acesse: https://github.com/new" -ForegroundColor White
Write-Host "   - Nome: sistemaamoras" -ForegroundColor White
Write-Host "   - Descricao: Sistema completo ERP/CRM/PDV para Amoras Capital" -ForegroundColor White
Write-Host "   - Nao inicialize com README" -ForegroundColor White
Write-Host "   - Clique em 'Create repository'" -ForegroundColor White
Write-Host ""

Write-Host "2. Copie a URL do repositorio criado" -ForegroundColor Yellow
Write-Host "   Exemplo: https://github.com/seu-usuario/sistemaamoras.git" -ForegroundColor White
Write-Host ""

$githubUrl = Read-Host "Cole a URL do repositorio aqui"

Write-Host ""
Write-Host "3. Configurando o repositorio remoto..." -ForegroundColor Yellow
git remote add origin $githubUrl

Write-Host ""
Write-Host "4. Enviando o codigo para o GitHub..." -ForegroundColor Yellow
git push -u origin main

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "    CONFIGURACAO CONCLUIDA!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Seu repositorio esta disponivel em:" -ForegroundColor White
Write-Host $githubUrl -ForegroundColor Cyan
Write-Host ""
Read-Host "Pressione Enter para continuar" 