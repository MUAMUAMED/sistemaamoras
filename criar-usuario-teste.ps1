# Script para criar usuário de teste no banco de dados via Docker
# Gera email e senha aleatórios automaticamente

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CRIAR USUÁRIO DE TESTE               " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Docker está rodando
try {
    docker ps | Out-Null
} catch {
    Write-Host "❌ Erro: Docker não está rodando!" -ForegroundColor Red
    Write-Host "   Abra o Docker Desktop e tente novamente." -ForegroundColor Yellow
    exit 1
}

# Verificar se o container do backend está rodando
$backendContainer = docker ps --filter "name=amoras-backend" --format "{{.Names}}"
if (-not $backendContainer) {
    Write-Host "❌ Erro: Container 'amoras-backend' não está rodando!" -ForegroundColor Red
    Write-Host "   Execute primeiro: docker-compose up" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Container backend encontrado: $backendContainer" -ForegroundColor Green
Write-Host ""

# Verificar se o script existe no container
Write-Host "Verificando se o script existe..." -ForegroundColor Yellow
$scriptExists = docker exec amoras-backend test -f /app/scripts/create-test-user.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Script não encontrado no container. Copiando..." -ForegroundColor Yellow
    
    # Copiar script para o container
    docker cp scripts/create-test-user.js amoras-backend:/app/scripts/create-test-user.js
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao copiar script para o container!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Script copiado com sucesso!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Executando script de criação de usuário..." -ForegroundColor Cyan
Write-Host ""

# Executar o script dentro do container
docker exec -it amoras-backend node scripts/create-test-user.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Usuário criado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 Você pode usar essas credenciais para fazer login no sistema." -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Erro ao criar usuário. Verifique os logs acima." -ForegroundColor Red
    exit 1
}

