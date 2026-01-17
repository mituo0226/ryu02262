# Windows タスクスケジューラに自動クリーンアップタスクを登録するスクリプト
# 毎日自動的に .wrangler ディレクトリをクリーンアップします

$taskName = "Kaede-Wrangler-AutoCleanup"
$scriptPath = Join-Path $PSScriptRoot "auto-cleanup-wrangler-silent.ps1"
$logDir = Join-Path $PSScriptRoot "..\logs"
$logFile = Join-Path $logDir "wrangler-cleanup-$(Get-Date -Format 'yyyy-MM').log"

# ログディレクトリを作成
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    Write-Host "ログディレクトリを作成しました: $logDir" -ForegroundColor Green
}

# 既存のタスクを削除（存在する場合）
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "既存のタスクを削除しました: $taskName" -ForegroundColor Yellow
}

# タスクのアクションを定義
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -LogFile `"$logFile`""

# タスクのトリガーを定義（毎日午前2時に実行）
$trigger = New-ScheduledTaskTrigger -Daily -At 2am

# タスクの設定
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable:$false

# タスクを登録
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Kaede プロジェクトの .wrangler ディレクトリを自動クリーンアップ" `
    -User $env:USERNAME | Out-Null

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "自動クリーンアップタスクを登録しました" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "タスク名: $taskName" -ForegroundColor Yellow
Write-Host "実行スケジュール: 毎日 午前2時" -ForegroundColor Yellow
Write-Host "スクリプト: $scriptPath" -ForegroundColor Yellow
Write-Host "ログファイル: $logFile" -ForegroundColor Yellow
Write-Host ""
Write-Host "タスクの確認:" -ForegroundColor Cyan
Write-Host "  Get-ScheduledTask -TaskName `"$taskName`"" -ForegroundColor White
Write-Host ""
Write-Host "タスクの削除:" -ForegroundColor Cyan
Write-Host "  Unregister-ScheduledTask -TaskName `"$taskName`" -Confirm:`$false" -ForegroundColor White
Write-Host ""
