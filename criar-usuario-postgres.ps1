# Script para criar usuário de teste diretamente no PostgreSQL
# Gera email aleatório e senha, cria hash bcrypt e insere no banco

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CRIAR USUÁRIO NO POSTGRESQL          " -ForegroundColor Cyan
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

# Verificar se o container do PostgreSQL está rodando
$postgresContainer = docker ps --filter "name=amoras-postgres" --format "{{.Names}}"
if (-not $postgresContainer) {
    Write-Host "❌ Erro: Container 'amoras-postgres' não está rodando!" -ForegroundColor Red
    Write-Host "   Execute primeiro: docker-compose up" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Container PostgreSQL encontrado: $postgresContainer" -ForegroundColor Green
Write-Host ""

# Gerar email aleatório
$randomEmail = "teste_$(Get-Random -Minimum 1000 -Maximum 9999)@test.com"
Write-Host "📧 Email gerado: $randomEmail" -ForegroundColor Cyan

# Gerar senha aleatória
$chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
$password = ""
for ($i = 0; $i -lt 8; $i++) {
    $password += $chars[(Get-Random -Maximum $chars.Length)]
}

Write-Host "🔑 Senha gerada: $password" -ForegroundColor Cyan
Write-Host ""

# Gerar hash bcrypt usando Node.js no container backend
Write-Host "Gerando hash bcrypt da senha..." -ForegroundColor Yellow

# Verificar se backend está rodando (para gerar hash)
$backendContainer = docker ps --filter "name=amoras-backend" --format "{{.Names}}"
if ($backendContainer) {
    # Criar script temporário para gerar hash
    $hashScript = @"
const bcrypt = require('bcryptjs');
const password = '$password';
bcrypt.hash(password, 10).then(hash => {
    console.log(hash);
}).catch(err => {
    console.error('Erro:', err);
    process.exit(1);
});
"@
    
    $hashScript | Out-File -FilePath "temp-hash.js" -Encoding UTF8
    
    # Copiar script para container e executar
    docker cp temp-hash.js amoras-backend:/tmp/temp-hash.js | Out-Null
    $passwordHash = docker exec amoras-backend node /tmp/temp-hash.js
    
    # Limpar arquivo temporário
    Remove-Item temp-hash.js -ErrorAction SilentlyContinue
    
    if ($LASTEXITCODE -ne 0 -or -not $passwordHash) {
        Write-Host "❌ Erro ao gerar hash bcrypt!" -ForegroundColor Red
        exit 1
    }
    
    $passwordHash = $passwordHash.Trim()
    Write-Host "✅ Hash gerado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Container backend não encontrado. Usando hash pré-gerado..." -ForegroundColor Yellow
    Write-Host "   (Para gerar hash dinâmico, inicie o container backend)" -ForegroundColor Yellow
    
    # Hash bcrypt de "senha123" como fallback (você pode mudar a senha depois)
    $passwordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
    $password = "senha123"
    Write-Host "   Usando senha padrão: $password" -ForegroundColor Yellow
}

Write-Host ""

# Criar script SQL dinâmico
$sqlScript = @"
-- Criar usuário de teste
DO `$
DECLARE
    random_email TEXT := '$randomEmail';
    random_name TEXT := 'Usuário Teste $(Get-Random -Minimum 1000 -Maximum 9999)';
    random_id TEXT := 'cl' || substr(md5(random()::text || clock_timestamp()::text), 1, 24);
    password_hash TEXT := '$passwordHash';
BEGIN
    -- Inserir usuário
    INSERT INTO users (id, name, email, password, role, active, "createdAt", "updatedAt")
    VALUES (
        random_id,
        random_name,
        random_email,
        password_hash,
        'ADMIN',
        true,
        NOW(),
        NOW()
    );
    
    -- Mostrar resultado
    RAISE NOTICE '✅ Usuário criado com sucesso!';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '📧 Email: %', random_email;
    RAISE NOTICE '🔑 Senha: $password';
    RAISE NOTICE '👤 Nome: %', random_name;
    RAISE NOTICE '🎭 Role: ADMIN';
    RAISE NOTICE '🆔 ID: %', random_id;
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END `$;

-- Mostrar o usuário criado
SELECT id, name, email, role, active, "createdAt" 
FROM users 
WHERE email = '$randomEmail';
"@

# Salvar script SQL temporário
$sqlScript | Out-File -FilePath "temp-create-user.sql" -Encoding UTF8

Write-Host "Executando script SQL no PostgreSQL..." -ForegroundColor Yellow
Write-Host ""

# Executar SQL no PostgreSQL
docker exec -i amoras-postgres psql -U postgres -d amoras_capital -f /dev/stdin < temp-create-user.sql

# Limpar arquivo temporário
Remove-Item temp-create-user.sql -ErrorAction SilentlyContinue

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Usuário criado com sucesso no PostgreSQL!" -ForegroundColor Green
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "📧 Email: $randomEmail" -ForegroundColor White
    Write-Host "🔑 Senha: $password" -ForegroundColor White
    Write-Host "🎭 Role: ADMIN" -ForegroundColor White
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "💡 Guarde essas credenciais! Elas não serão mostradas novamente." -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Erro ao criar usuário. Verifique os logs acima." -ForegroundColor Red
    exit 1
}

