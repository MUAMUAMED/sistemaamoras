Write-Host "Adicionando arquivos ao staging..." -ForegroundColor Yellow

git add backend/src/middleware/auth.ts
git add backend/src/types/express.d.ts  
git add backend/src/routes/product.routes.ts
git add backend/src/routes/subcategory.routes.ts
git add backend/src/routes/lead.routes.ts
git add backend/src/routes/sale.routes.ts

Write-Host "Fazendo commit..." -ForegroundColor Yellow

$commitMsg = @"
Corrigir erros TypeScript: AuthenticatedRequest e tipos Express

- Alterar AuthenticatedRequest de interface para type com interseção
- Adicionar suporte ao tipo Multer no express.d.ts
- Remover definições locais duplicadas de AuthenticatedRequest
- Garantir que body, params e query estejam disponíveis em AuthenticatedRequest
"@

git commit -m $commitMsg

if ($LASTEXITCODE -eq 0) {
    Write-Host "Commit realizado com sucesso!" -ForegroundColor Green
    
    $branch = git rev-parse --abbrev-ref HEAD
    Write-Host "Branch atual: $branch" -ForegroundColor Cyan
    Write-Host "Fazendo push para GitHub..." -ForegroundColor Yellow
    
    git push origin $branch
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Push realizado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "Erro ao fazer push" -ForegroundColor Red
    }
} else {
    Write-Host "Erro ao fazer commit. Verifique se há alterações para commitar." -ForegroundColor Red
}

