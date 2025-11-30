# Script para fazer commit e push das alterações

Write-Host "=== Fazendo commit e push das alterações ===" -ForegroundColor Green

# Verificar branch atual
$currentBranch = git branch --show-current
Write-Host "Branch atual: $currentBranch" -ForegroundColor Yellow

# Adicionar todas as alterações
Write-Host "`nAdicionando alterações ao staging..." -ForegroundColor Yellow
git add -A

# Verificar o que será commitado
$status = git status --short
if ($status) {
    Write-Host "`nArquivos alterados:" -ForegroundColor Cyan
    Write-Host $status
    
    # Commit das alterações
    $commitMessage = "Corrigir erros TypeScript: AuthenticatedRequest e tipos Express"
    Write-Host "`nFazendo commit com mensagem: $commitMessage" -ForegroundColor Yellow
    git commit -m $commitMessage
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Commit realizado com sucesso!" -ForegroundColor Green
        
        # Push para o GitHub
        Write-Host "`nEnviando alterações para o GitHub..." -ForegroundColor Yellow
        git push origin $currentBranch
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Push realizado com sucesso!" -ForegroundColor Green
        } else {
            Write-Host "❌ Erro ao fazer push" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ Erro ao fazer commit" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`nNenhuma alteração para commitar." -ForegroundColor Yellow
}

Write-Host "`n=== Concluído! ===" -ForegroundColor Green

