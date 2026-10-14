# Script simples para criar usuário via terminal
# Execute este script no PowerShell

Write-Host "Criando usuário de teste..." -ForegroundColor Cyan

# Gerar email e senha aleatórios
$email = "teste_$(Get-Random -Minimum 1000 -Maximum 99999)@test.com"
$senha = "teste$(Get-Random -Minimum 1000 -Maximum 9999)"

Write-Host "Email: $email"
Write-Host "Senha: $senha"
Write-Host ""

# Gerar hash bcrypt
Write-Host "Gerando hash bcrypt..." -ForegroundColor Yellow
$backend = docker ps --filter "name=amoras-backend" --format "{{.Names}}"
if ($backend) {
    $hash = docker exec amoras-backend node -e "const bcrypt=require('bcryptjs');bcrypt.hash('$senha',10).then(h=>console.log(h));"
    $hash = $hash.Trim()
} else {
    Write-Host "⚠️  Backend não encontrado. Usando hash padrão (senha: senha123)" -ForegroundColor Yellow
    $hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
    $senha = "senha123"
}

Write-Host "Hash: $hash"
Write-Host ""

# Executar SQL diretamente
Write-Host "Inserindo no banco..." -ForegroundColor Yellow

# Criar SQL com aspas corretas para PostgreSQL (camelCase precisa de aspas duplas)
$sqlContent = @"
INSERT INTO users (id, name, email, password, role, active, "createdAt", "updatedAt") 
VALUES (
    'cl' || substr(md5(random()::text || clock_timestamp()::text), 1, 24), 
    'Usuário Teste', 
    '$email', 
    '$hash', 
    'ADMIN', 
    true, 
    NOW(), 
    NOW()
) 
RETURNING id, name, email, role;
"@

# Salvar em arquivo temporário
$sqlContent | Out-File -FilePath "temp-insert-user.sql" -Encoding UTF8 -NoNewline

# Copiar para container e executar
docker cp temp-insert-user.sql amoras-postgres:/tmp/temp-insert-user.sql
docker exec amoras-postgres psql -U postgres -d amoras_capital -f /tmp/temp-insert-user.sql

# Limpar arquivo temporário
Remove-Item temp-insert-user.sql -ErrorAction SilentlyContinue

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Usuário criado com sucesso!" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "📧 Email: $email" -ForegroundColor White
    Write-Host "🔑 Senha: $senha" -ForegroundColor White
    Write-Host "🎭 Role: ADMIN" -ForegroundColor White
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
} else {
    Write-Host "❌ Erro ao criar usuário" -ForegroundColor Red
}

