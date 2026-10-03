# Script SIMPLES para criar usuário diretamente no PostgreSQL
# Versão mais direta - gera hash e insere via SQL

Write-Host "Criando usuário de teste no PostgreSQL..." -ForegroundColor Cyan
Write-Host ""

# Verificar containers
$postgres = docker ps --filter "name=amoras-postgres" --format "{{.Names}}"
if (-not $postgres) {
    Write-Host "❌ Container PostgreSQL não está rodando!" -ForegroundColor Red
    exit 1
}

# Gerar credenciais
$email = "teste_$(Get-Random -Minimum 1000 -Maximum 99999)@test.com"
$senha = "teste$(Get-Random -Minimum 1000 -Maximum 9999)"

Write-Host "📧 Email: $email"
Write-Host "🔑 Senha: $senha"
Write-Host ""

# Gerar hash bcrypt (usando backend se disponível)
$backend = docker ps --filter "name=amoras-backend" --format "{{.Names}}"
if ($backend) {
    $hashScript = "const bcrypt=require('bcryptjs');bcrypt.hash('$senha',10).then(h=>console.log(h));"
    $hash = docker exec amoras-backend node -e $hashScript
    $hash = $hash.Trim()
} else {
    Write-Host "⚠️  Backend não encontrado. Usando hash padrão (senha: senha123)" -ForegroundColor Yellow
    $hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
    $senha = "senha123"
}

# SQL para inserir
$sql = @"
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

# Executar
Write-Host "Inserindo no banco..." -ForegroundColor Yellow
echo $sql | docker exec -i amoras-postgres psql -U postgres -d amoras_capital

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Usuário criado!" -ForegroundColor Green
    Write-Host "📧 Email: $email" -ForegroundColor White
    Write-Host "🔑 Senha: $senha" -ForegroundColor White
} else {
    Write-Host "❌ Erro ao criar usuário" -ForegroundColor Red
}

