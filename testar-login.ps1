Write-Host "🔐 Testando login das contas criadas..." -ForegroundColor Green
Write-Host ""

$API_URL = "http://https://amoras-sistema-gew1.emebtn.easypanel.host/api"

$contas = @(
    @{email="admin@amorascapital.com"; senha="admin123"; nome="Administrador"},
    @{email="atendente@amorascapital.com"; senha="atendente123"; nome="Atendente"},
    @{email="gerente@amorascapital.com"; senha="gerente123"; nome="Gerente"}
)

# Verificar se o servidor está rodando
try {
    $health = Invoke-RestMethod -Uri "$API_URL/health" -Method Get
    Write-Host "✅ Servidor backend está funcionando!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Servidor backend não está respondendo!" -ForegroundColor Red
    Write-Host "   Certifique-se que o backend está rodando na porta 3001" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Para iniciar o servidor:" -ForegroundColor Yellow
    Write-Host "   cd backend && npm run dev" -ForegroundColor Yellow
    exit
}

# Testar login para cada conta
foreach ($conta in $contas) {
    try {
        $body = @{
            email = $conta.email
            password = $conta.senha
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$API_URL/auth/login" -Method Post -Body $body -ContentType "application/json"
        
        if ($response.token) {
            Write-Host "✅ $($conta.nome) - Login bem-sucedido!" -ForegroundColor Green
            Write-Host "   Email: $($conta.email)" -ForegroundColor White
            Write-Host "   Função: $($response.user.role)" -ForegroundColor White
            Write-Host "   Token: $($response.token.Substring(0, 30))..." -ForegroundColor White
            Write-Host ""
        }
    } catch {
        Write-Host "❌ $($conta.nome) - Erro no login:" -ForegroundColor Red
        Write-Host "   Email: $($conta.email)" -ForegroundColor White
        Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
    }
}

Write-Host "📋 Contas disponíveis:" -ForegroundColor Cyan
foreach ($conta in $contas) {
    Write-Host "   $($conta.nome): $($conta.email) / $($conta.senha)" -ForegroundColor White
}

Write-Host ""
Write-Host "🌐 Acesse o sistema em: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Pressione qualquer tecla para continuar..."
Read-Host 