# Script para download e instalação do Docker Desktop no Windows
# Execute como Administrador para instalação automática

Write-Host "Docker Desktop - Download e Instalacao" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan

# URL de download do Docker Desktop (versão mais recente)
$dockerUrl = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
$downloadPath = "$env:TEMP\DockerDesktopInstaller.exe"

Write-Host ""
Write-Host "Baixando Docker Desktop..." -ForegroundColor Yellow

try {
    # Baixar Docker Desktop
    Invoke-WebRequest -Uri $dockerUrl -OutFile $downloadPath -UseBasicParsing
    
    if (Test-Path $downloadPath) {
        $fileSize = (Get-Item $downloadPath).Length / 1MB
        $sizeMB = [math]::Round($fileSize, 2)
        Write-Host "Download concluido! ($sizeMB MB)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Arquivo salvo em: $downloadPath" -ForegroundColor Cyan
        
        Write-Host ""
        Write-Host "IMPORTANTE:" -ForegroundColor Yellow
        Write-Host "1. Execute o instalador como Administrador" -ForegroundColor White
        Write-Host "2. Durante a instalacao, marque 'Use WSL 2 instead of Hyper-V'" -ForegroundColor White
        Write-Host "3. Reinicie o computador apos a instalacao" -ForegroundColor White
        
        Write-Host ""
        Write-Host "Deseja abrir o instalador agora? (S/N)" -ForegroundColor Cyan
        $response = Read-Host
        
        if ($response -eq "S" -or $response -eq "s") {
            Write-Host ""
            Write-Host "Abrindo instalador..." -ForegroundColor Yellow
            Start-Process $downloadPath -Verb RunAs
        } else {
            Write-Host ""
            Write-Host "Execute manualmente: Start-Process '$downloadPath' -Verb RunAs" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host ""
    Write-Host "Erro ao baixar Docker Desktop!" -ForegroundColor Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Tente baixar manualmente de: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Apos instalar:" -ForegroundColor Cyan
Write-Host "1. Reinicie o computador" -ForegroundColor White
Write-Host "2. Abra Docker Desktop" -ForegroundColor White
Write-Host "3. Verifique com: docker --version" -ForegroundColor White
