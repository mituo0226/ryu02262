# ワークツリーからローカルプロジェクトへの同期スクリプト
# 使用方法: .\scripts\sync-from-worktree.ps1 <ワークツリーパス>

param(
    [Parameter(Mandatory=$true)]
    [string]$WorktreePath
)

$LocalProjectPath = "C:\Users\mituo\Desktop\kaede"

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "ワークツリーからローカルプロジェクトへの同期" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "ワークツリーパス: $WorktreePath" -ForegroundColor Cyan
Write-Host "ローカルプロジェクト: $LocalProjectPath" -ForegroundColor Cyan
Write-Host ""

# ワークツリーの存在確認
if (-not (Test-Path $WorktreePath)) {
    Write-Host "エラー: ワークツリーパスが見つかりません: $WorktreePath" -ForegroundColor Red
    exit 1
}

# ローカルプロジェクトの存在確認
if (-not (Test-Path $LocalProjectPath)) {
    Write-Host "エラー: ローカルプロジェクトパスが見つかりません: $LocalProjectPath" -ForegroundColor Red
    exit 1
}

# ワークツリーのGit状態を確認
Push-Location $WorktreePath
$worktreeStatus = git status --short
$worktreeCommits = git log HEAD --oneline -5

Write-Host "ワークツリーの状態:" -ForegroundColor Yellow
if ($worktreeStatus) {
    Write-Host "未コミットの変更があります:" -ForegroundColor Red
    Write-Host $worktreeStatus
} else {
    Write-Host "未コミットの変更はありません" -ForegroundColor Green
}

Write-Host ""
Write-Host "ワークツリーの最新コミット:" -ForegroundColor Yellow
Write-Host $worktreeCommits
Write-Host ""

# ローカルプロジェクトのGit状態を確認
Pop-Location
Push-Location $LocalProjectPath
$localStatus = git status --short
$localCommits = git log HEAD --oneline -5

Write-Host "ローカルプロジェクトの状態:" -ForegroundColor Yellow
if ($localStatus) {
    Write-Host "未コミットの変更があります:" -ForegroundColor Red
    Write-Host $localStatus
} else {
    Write-Host "未コミットの変更はありません" -ForegroundColor Green
}

Write-Host ""
Write-Host "ローカルプロジェクトの最新コミット:" -ForegroundColor Yellow
Write-Host $localCommits
Write-Host ""

# ワークツリーのコミットをローカルプロジェクトにマージ
$worktreeCommit = (git -C $WorktreePath log -1 --format="%H")
$localCommit = (git log -1 --format="%H")

if ($worktreeCommit -ne $localCommit) {
    Write-Host "ワークツリーとローカルプロジェクトのコミットが異なります" -ForegroundColor Yellow
    Write-Host "ワークツリーのコミット: $worktreeCommit" -ForegroundColor Cyan
    Write-Host "ローカルプロジェクトのコミット: $localCommit" -ForegroundColor Cyan
    Write-Host ""
    
    $confirm = Read-Host "ワークツリーのコミットをローカルプロジェクトにマージしますか？ (y/n)"
    if ($confirm -eq "y" -or $confirm -eq "Y") {
        Write-Host "マージ中..." -ForegroundColor Yellow
        git merge $worktreeCommit --no-edit
        if ($LASTEXITCODE -eq 0) {
            Write-Host "マージが完了しました" -ForegroundColor Green
        } else {
            Write-Host "マージに失敗しました。手動で解決してください。" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "マージをキャンセルしました" -ForegroundColor Yellow
    }
} else {
    Write-Host "ワークツリーとローカルプロジェクトは同じコミットです" -ForegroundColor Green
}

Pop-Location

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "同期完了" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Yellow
