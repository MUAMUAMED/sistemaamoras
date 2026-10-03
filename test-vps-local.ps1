# Script completo para testar localmente como se fosse VPS
# Simula todo o processo de build e deploy do VPS/EasyPanel

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTE COMPLETO VPS (Local)           " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"

# Opção 1: Teste rápido (apenas build)
Write-Host "Escolha o tipo de teste:" -ForegroundColor Yellow
Write-Host "  1. Teste Rapido (apenas build Docker)" -ForegroundColor White
Write-Host "  2. Teste Completo (build + docker-compose + execucao)" -ForegroundColor White
Write-Host ""
$testType = Read-Host "Digite o numero (1 ou 2)"

if ($testType -eq "1") {
    Write-Host ""
    Write-Host "Executando teste rapido..." -ForegroundColor Cyan
    & "$PSScriptRoot\test-docker-build.ps1" -FullBuild -StopOnError
    exit
}

# Opção 2: Teste completo
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PASSO 1: Teste de Build Docker       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

& "$PSScriptRoot\test-docker-build.ps1" -FullBuild

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERRO: Build falhou! Corrija os erros antes de continuar." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PASSO 2: Teste com Docker Compose    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Isso simula o ambiente completo do VPS (backend + postgres)" -ForegroundColor White
Write-Host ""

# Verificar se docker-compose está disponível
$composeCmd = "docker-compose"
try {
    docker-compose --version | Out-Null
} catch {
    $composeCmd = "docker compose"
}

Write-Host "Parando containers de teste anteriores..." -ForegroundColor Yellow
& $composeCmd -f docker-compose.test.yml down -v 2>$null

Write-Host ""
Write-Host "Construindo imagens..." -ForegroundColor Yellow
& $composeCmd -f docker-compose.test.yml build --no-cache 2>&1 | Tee-Object -FilePath "compose-build.log"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERRO: Build do docker-compose falhou!" -ForegroundColor Red
    Write-Host "Verifique o arquivo compose-build.log" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Iniciando containers de teste..." -ForegroundColor Yellow
Write-Host "(Aguarde alguns segundos para inicializacao...)" -ForegroundColor White
Write-Host ""

# Iniciar em background
& $composeCmd -f docker-compose.test.yml up -d

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Verificando logs do backend..." -ForegroundColor Cyan
Write-Host "(Os primeiros logs mostram se ha erros de inicializacao)" -ForegroundColor White
Write-Host ""

# Mostrar logs
& $composeCmd -f docker-compose.test.yml logs backend-test | Select-Object -Last 50

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PASSO 3: Testes de Conectividade     " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se container está rodando
$containerStatus = docker ps --filter "name=backend-test" --format "{{.Status}}" 2>&1
if ($containerStatus -match "Up") {
    Write-Host "  OK: Container backend-test esta rodando" -ForegroundColor Green
    Write-Host "  Status: $containerStatus" -ForegroundColor Gray
} else {
    Write-Host "  ERRO: Container backend-test nao esta rodando!" -ForegroundColor Red
    Write-Host "  Verifique os logs acima para erros" -ForegroundColor Yellow
}

# Testar health endpoint (se disponível)
Write-Host ""
Write-Host "Testando endpoint de health..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3002/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "  OK: Health check respondeu com sucesso!" -ForegroundColor Green
    }
} catch {
    Write-Host "  AVISO: Health check nao respondeu (normal se app ainda estiver iniciando)" -ForegroundColor Yellow
    Write-Host "  Tente novamente em alguns segundos: curl http://localhost:3002/health" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMO FINAL                          " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Status dos containers
Write-Host "Status dos containers:" -ForegroundColor Yellow
& $composeCmd -f docker-compose.test.yml ps

Write-Host ""
Write-Host "Para ver logs em tempo real:" -ForegroundColor Cyan
Write-Host "  $composeCmd -f docker-compose.test.yml logs -f backend-test" -ForegroundColor White

Write-Host ""
Write-Host "Para parar os containers de teste:" -ForegroundColor Cyan
Write-Host "  $composeCmd -f docker-compose.test.yml down" -ForegroundColor White

Write-Host ""
Write-Host "Para testar novamente (limpo):" -ForegroundColor Cyan
Write-Host "  $composeCmd -f docker-compose.test.yml down -v" -ForegroundColor White
Write-Host "  .\test-vps-local.ps1" -ForegroundColor White

Write-Host ""
Write-Host "Se tudo passou nos testes, seu codigo esta pronto para VPS!" -ForegroundColor Green



