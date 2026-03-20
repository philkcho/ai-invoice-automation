# Windows 작업 스케줄러 자동 등록 스크립트
# 실행: PowerShell -ExecutionPolicy Bypass -File scripts/setup/setup-scheduled-tasks.ps1
# 관리자 권한 필요

#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"

$ProjectDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
$ScriptsDir = Join-Path $ProjectDir "scripts"
$LogDir = Join-Path $ProjectDir "logs"
$BashExe = "C:\Program Files\Git\bin\bash.exe"

# Git Bash 경로 확인
if (-not (Test-Path $BashExe)) {
    $BashExe = (Get-Command bash -ErrorAction SilentlyContinue).Source
    if (-not $BashExe) {
        Write-Error "Git Bash not found. Please install Git for Windows."
        exit 1
    }
}

Write-Host "=========================================="
Write-Host "  Invoice System - Scheduled Tasks Setup"
Write-Host "=========================================="
Write-Host "Project: $ProjectDir"
Write-Host "Bash:    $BashExe"
Write-Host ""

# 로그 디렉토리 생성
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

# 기존 작업 정리
$ExistingTasks = Get-ScheduledTask -TaskPath "\InvoiceSystem\" -ErrorAction SilentlyContinue
if ($ExistingTasks) {
    Write-Host "Removing existing scheduled tasks..."
    $ExistingTasks | Unregister-ScheduledTask -Confirm:$false
}

# 작업 스케줄러 폴더 경로
$TaskFolder = "\InvoiceSystem\"

function Register-InvoiceTask {
    param(
        [string]$Name,
        [string]$Script,
        [string]$Description,
        $Trigger,
        [int]$TimeoutMinutes = 30
    )

    $Action = New-ScheduledTaskAction `
        -Execute $BashExe `
        -Argument "$Script" `
        -WorkingDirectory $ProjectDir

    $Settings = New-ScheduledTaskSettingsSet `
        -ExecutionTimeLimit (New-TimeSpan -Minutes $TimeoutMinutes) `
        -StartWhenAvailable `
        -DontStopOnIdleEnd `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries

    $Principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType S4U -RunLevel Highest

    Register-ScheduledTask `
        -TaskName $Name `
        -TaskPath $TaskFolder `
        -Action $Action `
        -Trigger $Trigger `
        -Settings $Settings `
        -Principal $Principal `
        -Description $Description `
        -Force

    Write-Host "  [OK] $Name" -ForegroundColor Green
}

# ── 1. DB 백업 (매일 03:00) ──────────────────────────────
Register-InvoiceTask `
    -Name "DB-Backup" `
    -Script "$ScriptsDir/backup/backup-db.sh" `
    -Description "Daily PostgreSQL backup" `
    -Trigger (New-ScheduledTaskTrigger -Daily -At "03:00")

# ── 2. 미디어 백업 (매일 03:30) ──────────────────────────
Register-InvoiceTask `
    -Name "Media-Backup" `
    -Script "$ScriptsDir/backup/backup-media.sh" `
    -Description "Daily media files backup" `
    -Trigger (New-ScheduledTaskTrigger -Daily -At "03:30")

# ── 3. 백업 로테이션 (매일 04:00) ────────────────────────
Register-InvoiceTask `
    -Name "Backup-Rotation" `
    -Script "$ScriptsDir/backup/rotate-backups.sh" `
    -Description "Clean up old backup files" `
    -Trigger (New-ScheduledTaskTrigger -Daily -At "04:00") `
    -TimeoutMinutes 10

# ── 4. 헬스체크 (5분마다) ────────────────────────────────
# Windows 작업 스케줄러에서 5분 반복 설정
$HealthTrigger = New-ScheduledTaskTrigger -Once -At "00:00" `
    -RepetitionInterval (New-TimeSpan -Minutes 5) `
    -RepetitionDuration (New-TimeSpan -Days 9999)

Register-InvoiceTask `
    -Name "Health-Check" `
    -Script "$ScriptsDir/monitoring/health-check.sh" `
    -Description "Check system health every 5 minutes" `
    -Trigger $HealthTrigger `
    -TimeoutMinutes 5

# ── 5. 디스크 모니터링 (1시간마다) ────────────────────────
$DiskTrigger = New-ScheduledTaskTrigger -Once -At "00:00" `
    -RepetitionInterval (New-TimeSpan -Hours 1) `
    -RepetitionDuration (New-TimeSpan -Days 9999)

Register-InvoiceTask `
    -Name "Disk-Monitor" `
    -Script "$ScriptsDir/monitoring/disk-monitor.sh" `
    -Description "Monitor disk usage every hour" `
    -Trigger $DiskTrigger `
    -TimeoutMinutes 5

# ── 6. 시스템 시작 시 Docker 복구 ────────────────────────
$LogonTrigger = New-ScheduledTaskTrigger -AtLogOn

$DockerAction = New-ScheduledTaskAction `
    -Execute "docker" `
    -Argument "compose up -d" `
    -WorkingDirectory $ProjectDir

$DockerSettings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries

Register-ScheduledTask `
    -TaskName "Docker-Startup" `
    -TaskPath $TaskFolder `
    -Action $DockerAction `
    -Trigger $LogonTrigger `
    -Settings $DockerSettings `
    -Description "Start Docker services on login" `
    -Force

Write-Host "  [OK] Docker-Startup" -ForegroundColor Green

# ── 결과 확인 ────────────────────────────────────────────
Write-Host ""
Write-Host "=========================================="
Write-Host "  Registered Tasks:"
Write-Host "=========================================="
Get-ScheduledTask -TaskPath $TaskFolder | Format-Table TaskName, State, Description -AutoSize

Write-Host ""
Write-Host "To view tasks: Get-ScheduledTask -TaskPath '\InvoiceSystem\'"
Write-Host "To remove all: Get-ScheduledTask -TaskPath '\InvoiceSystem\' | Unregister-ScheduledTask"
