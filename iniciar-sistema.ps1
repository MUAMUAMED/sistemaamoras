Write-Host "========================================" -ForegroundColor Green
Write-Host "   Sistema ERP/CRM Amoras Capital" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Iniciando backend e frontend..." -ForegroundColor Yellow
Write-Host ""

# Verificar se o Node.js está instalado
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js não encontrado. Por favor, instale o Node.js primeiro." -ForegroundColor Red
    exit 1
}

# Verificar se o npm está instalado
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm não encontrado. Por favor, instale o npm primeiro." -ForegroundColor Red
    exit 1
}

# Abrir nova janela para o backend
Write-Host "🚀 Iniciando backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev" -WindowStyle Normal

# Aguardar 5 segundos antes de iniciar o frontend
Write-Host "⏳ Aguardando 5 segundos..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Abrir nova janela para o frontend
Write-Host "🎨 Iniciando frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm start" -WindowStyle Normal

Write-Host ""
Write-Host "✅ Sistema iniciado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Blue
Write-Host "🔧 Backend: http://https://amoras-sistema-gew1.gbl2yq.easypanel.host" -ForegroundColor Blue
Write-Host "📚 API Docs: http://https://amoras-sistema-gew1.gbl2yq.easypanel.host/api-docs" -ForegroundColor Blue
Write-Host ""
Write-Host "Pressione qualquer tecla para fechar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 