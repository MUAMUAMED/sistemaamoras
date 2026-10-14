# Script para verificar status do build
Write-Host ""
Write-Host "🔍 Verificando Status do Build" -ForegroundColor Cyan
Write-Host ""

# Verificar se a imagem foi criada
Write-Host "Imagens do Frontend:" -ForegroundColor Yellow
docker images mohameduyyyyyy/amoras-frontend

Write-Host ""
Write-Host "Processos Docker em execução:" -ForegroundColor Yellow
docker ps

Write-Host ""
Write-Host "💡 Dica: Se a imagem aparecer acima, o build foi concluído!" -ForegroundColor Green
Write-Host "   Para fazer push: docker push mohameduyyyyyy/amoras-frontend:latest" -ForegroundColor Cyan
Write-Host ""

