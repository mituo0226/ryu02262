# 作業ディレクトリ確認スクリプト
# このスクリプトを実行して、正しいディレクトリで作業しているか確認

$ExpectedPath = "C:\Users\mituo\Desktop\kaede"
$CurrentPath = (Get-Location).Path

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "作業ディレクトリ確認" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "期待されるパス: $ExpectedPath" -ForegroundColor Cyan
Write-Host "現在のパス:     $CurrentPath" -ForegroundColor Cyan
Write-Host ""

if ($CurrentPath -eq $ExpectedPath) {
    Write-Host "✅ 正しいディレクトリで作業しています" -ForegroundColor Green
    Write-Host ""
    
    # Gitの状態を確認
    $status = git status --short
    $branch = git branch --show-current
    $remoteStatus = git log origin/main..HEAD --oneline
    $localStatus = git log HEAD..origin/main --oneline
    
    Write-Host "Gitブランチ: $branch" -ForegroundColor Cyan
    Write-Host ""
    
    if ($status) {
        Write-Host "未コミットの変更:" -ForegroundColor Yellow
        Write-Host $status
    } else {
        Write-Host "未コミットの変更はありません" -ForegroundColor Green
    }
    
    Write-Host ""
    if ($remoteStatus) {
        Write-Host "⚠️ 未プッシュのコミットがあります:" -ForegroundColor Yellow
        Write-Host $remoteStatus
    } else {
        Write-Host "✅ すべてのコミットがプッシュ済みです" -ForegroundColor Green
    }
    
    if ($localStatus) {
        Write-Host "⚠️ 未取得のコミットがあります:" -ForegroundColor Yellow
        Write-Host $localStatus
        Write-Host "git pull を実行してください" -ForegroundColor Yellow
    } else {
        Write-Host "✅ リモートと同期されています" -ForegroundColor Green
    }
    
} else {
    Write-Host "❌ 警告: 間違ったディレクトリで作業しています！" -ForegroundColor Red
    Write-Host ""
    
    if ($CurrentPath -like "*\.cursor\worktrees\kaede\*") {
        Write-Host "⚠️ ワークツリーで作業しています" -ForegroundColor Red
        Write-Host "   ワークツリーでの作業は禁止されています" -ForegroundColor Red
        Write-Host ""
        Write-Host "正しいディレクトリに移動してください:" -ForegroundColor Yellow
        Write-Host "   cd C:\Users\mituo\Desktop\kaede" -ForegroundColor Cyan
    } else {
        Write-Host "正しいディレクトリに移動してください:" -ForegroundColor Yellow
        Write-Host "   cd C:\Users\mituo\Desktop\kaede" -ForegroundColor Cyan
    }
    
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow

