# Script para limpar cache do TypeScript e resolver erros
Write-Host "🧹 Limpando cache do TypeScript..." -ForegroundColor Yellow

# Remover pasta-frontend se existir
if (Test-Path "pasta-frontend") {
    Write-Host "❌ Removendo pasta-frontend..." -ForegroundColor Red
    Remove-Item -Recurse -Force "pasta-frontend" -ErrorAction SilentlyContinue
    Write-Host "✅ pasta-frontend removida" -ForegroundColor Green
} else {
    Write-Host "✅ pasta-frontend não existe" -ForegroundColor Green
}

# Limpar cache do TypeScript
Write-Host "`n🧹 Limpando cache..." -ForegroundColor Yellow

# Remover arquivos de build info
Get-ChildItem -Path . -Filter "*.tsbuildinfo" -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

# Remover node_modules/.cache se existir
$cachePaths = @(
    "node_modules/.cache",
    "frontend/node_modules/.cache",
    "backend/node_modules/.cache",
    ".next",
    ".turbo"
)

foreach ($cachePath in $cachePaths) {
    if (Test-Path $cachePath) {
        Remove-Item -Recurse -Force $cachePath -ErrorAction SilentlyContinue
        Write-Host "✅ Removido: $cachePath" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "✅ Limpeza concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Feche e reabra o VS Code/Cursor" -ForegroundColor White
Write-Host "   2. Ou pressione Ctrl+Shift+P e digite: 'TypeScript: Restart TS Server'" -ForegroundColor White
Write-Host ""

