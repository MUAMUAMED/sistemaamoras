# Script para testar build Docker localmente (simulando VPS)
# Este script executa os mesmos passos que seriam executados no VPS/EasyPanel

param(
    [switch]$FullBuild = $false,
    [switch]$StopOnError = $false
)

$ErrorActionPreference = if ($StopOnError) { "Stop" } else { "Continue" }

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTE DE BUILD DOCKER (Simula VPS)  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Docker está instalado
Write-Host "[1/8] Verificando Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: $dockerVersion" -ForegroundColor Green
    } else {
        throw "Docker nao encontrado"
    }
} catch {
    Write-Host "  ERRO: Docker nao esta instalado ou nao esta no PATH" -ForegroundColor Red
    Write-Host "  Instale Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Verificar se docker-compose está disponível
Write-Host "[2/8] Verificando Docker Compose..." -ForegroundColor Yellow
try {
    $composeVersion = docker-compose --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: $composeVersion" -ForegroundColor Green
    } else {
        Write-Host "  AVISO: docker-compose nao encontrado (usando docker compose)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  AVISO: docker-compose nao encontrado" -ForegroundColor Yellow
}

# Preparar ambiente (agora na raiz)
Write-Host "[3/8] Preparando ambiente..." -ForegroundColor Yellow
$projectRoot = $PSScriptRoot
if (-not $projectRoot) {
    $projectRoot = Get-Location
}
Set-Location $projectRoot
Write-Host "  OK: Diretorio: $projectRoot" -ForegroundColor Green

# Verificar arquivos essenciais
Write-Host "[4/8] Verificando arquivos essenciais..." -ForegroundColor Yellow
$requiredFiles = @("Dockerfile", "package.json", "tsconfig.json", "prisma\schema.prisma")
$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
        Write-Host "  ERRO: $file nao encontrado!" -ForegroundColor Red
    } else {
        Write-Host "  OK: $file" -ForegroundColor Green
    }
}
if ($missingFiles.Count -gt 0) {
    Write-Host "  ERRO: Arquivos essenciais faltando!" -ForegroundColor Red
    exit 1
}

# Limpar builds anteriores (opcional)
if ($FullBuild) {
    Write-Host "[5/8] Limpando builds anteriores..." -ForegroundColor Yellow
    docker rmi backend-test 2>$null
    Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
    Write-Host "  OK: Limpeza concluida" -ForegroundColor Green
} else {
    Write-Host "[5/8] Pulando limpeza (use -FullBuild para limpar)" -ForegroundColor Yellow
}

# TESTE 1: Build do Docker (simula VPS)
Write-Host "[6/8] TESTE PRINCIPAL: Build do Docker..." -ForegroundColor Cyan
Write-Host "  Este e o passo critico que sera executado no VPS" -ForegroundColor White
Write-Host ""

$buildOutput = ""
$buildErrors = ""

try {
    Write-Host "  Executando: docker build -t backend-test ." -ForegroundColor Yellow
    Write-Host "  (Aguarde, isso pode demorar alguns minutos...)" -ForegroundColor White
    Write-Host ""
    
    if ($StopOnError) {
        docker build -t backend-test . 2>&1 | Tee-Object -Variable buildOutput
    } else {
        docker build -t backend-test . 2>&1 | Tee-Object -Variable buildOutput | Out-String
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "  SUCESSO: Build concluido sem erros!" -ForegroundColor Green
        
        # Salvar log do build
        $buildOutput | Out-File -FilePath "build-log.txt" -Encoding UTF8
        Write-Host "  Log salvo em: build-log.txt" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "  ERRO: Build falhou!" -ForegroundColor Red
        
        # Extrair erros
        $buildErrors = $buildOutput | Select-String -Pattern "error|Error|ERROR|failed|Failed|TS\d{4}" | Select-Object -First 20
        
        if ($buildErrors) {
            Write-Host ""
            Write-Host "  Erros encontrados:" -ForegroundColor Red
            $buildErrors | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
        }
        
        # Salvar log completo
        $buildOutput | Out-File -FilePath "build-errors.txt" -Encoding UTF8
        Write-Host ""
        Write-Host "  Log completo de erros salvo em: build-errors.txt" -ForegroundColor Yellow
        
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "  ERRO CRITICO: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# TESTE 2: Verificar imagem criada
Write-Host "[7/8] Verificando imagem Docker..." -ForegroundColor Yellow
$imageInfo = docker images backend-test --format "{{.Repository}}:{{.Tag}} - {{.Size}}" 2>&1
if ($LASTEXITCODE -eq 0 -and $imageInfo) {
    Write-Host "  OK: Imagem criada: $imageInfo" -ForegroundColor Green
} else {
    Write-Host "  AVISO: Imagem nao encontrada" -ForegroundColor Yellow
}

# TESTE 3: Testar execução (simulando startup)
Write-Host "[8/8] TESTE DE EXECUCAO: Testando container..." -ForegroundColor Cyan
Write-Host "  (Isso simula o que acontece quando o container inicia no VPS)" -ForegroundColor White
Write-Host ""

# Criar container temporário para verificar se inicia
try {
    Write-Host "  Criando container de teste..." -ForegroundColor Yellow
    
    # Remover container anterior se existir
    docker rm -f backend-test-container 2>$null
    
    # Criar e testar container (vai falhar na conexão com DB, mas mostra erros de build)
    $containerOutput = docker run --rm --name backend-test-container `
        -e NODE_ENV=production `
        -e PORT=3001 `
        -e DATABASE_URL="postgresql://test:test@localhost:5432/test" `
        -e JWT_SECRET="test_secret_key_for_docker_build_test_only" `
        backend-test sh -c "ls -la dist/ && echo 'Build files OK!' && node dist/index.js --help || echo 'App check done'" 2>&1
    
    if ($containerOutput) {
        Write-Host ""
        Write-Host "  Saida do container:" -ForegroundColor White
        $containerOutput | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
        
        # Verificar se dist/ foi criado corretamente
        if ($containerOutput -match "dist/") {
            Write-Host ""
            Write-Host "  SUCESSO: Arquivos compilados encontrados no container!" -ForegroundColor Green
        }
    }
    
} catch {
    Write-Host "  AVISO: Nao foi possivel testar container (normal se Docker nao estiver rodando)" -ForegroundColor Yellow
}

# Resumo final
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMO DO TESTE                      " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($LASTEXITCODE -eq 0 -or -not $buildErrors) {
    Write-Host "  Status: SUCESSO" -ForegroundColor Green
    Write-Host "  Seu build passou no teste local!" -ForegroundColor Green
    Write-Host "  Isso significa que provavelmente funcionara no VPS tambem." -ForegroundColor Green
    Write-Host ""
    Write-Host "  Proximos passos:" -ForegroundColor Cyan
    Write-Host "    1. Teste com docker-compose: docker-compose build backend" -ForegroundColor White
    Write-Host "    2. Se tudo OK, faca o deploy no VPS/EasyPanel" -ForegroundColor White
} else {
    Write-Host "  Status: FALHOU" -ForegroundColor Red
    Write-Host "  Corrija os erros acima antes de fazer deploy no VPS!" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Verifique:" -ForegroundColor Yellow
    Write-Host "    - Arquivo build-errors.txt para detalhes" -ForegroundColor White
    Write-Host "    - Se todas as dependencias estao no package.json" -ForegroundColor White
    Write-Host "    - Se o TypeScript compila sem erros localmente" -ForegroundColor White
}

Write-Host ""
Write-Host "Para testar build completo novamente: .\test-docker-build.ps1 -FullBuild" -ForegroundColor Cyan



