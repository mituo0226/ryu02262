# ワークツリーでのコミットを防ぐpre-commitフック（PowerShell版）
# このファイルは setup-git-hooks.ps1 によって .git/hooks/ にコピーされます

$ExpectedPath = "C:\Users\mituo\Desktop\kaede"
$CurrentPath = (git rev-parse --show-toplevel 2>$null)

if (-not $CurrentPath) {
    Write-Host "警告: Gitリポジトリが見つかりません" -ForegroundColor Yellow
    exit 0
}

# パスを正規化（大文字小文字を無視）
$CurrentPathNormalized = $CurrentPath.ToLower().TrimEnd('\', '/')
$ExpectedPathNormalized = $ExpectedPath.ToLower().TrimEnd('\', '/')

if ($CurrentPathNormalized -ne $ExpectedPathNormalized) {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "❌ エラー: ワークツリーでのコミットは禁止されています" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "現在の作業ディレクトリ: $CurrentPath" -ForegroundColor Yellow
    Write-Host "期待されるディレクトリ: $ExpectedPath" -ForegroundColor Yellow
    Write-Host ""
    
    if ($CurrentPath -like "*\.cursor\worktrees\kaede\*") {
        Write-Host "⚠️ ワークツリーで作業しています" -ForegroundColor Red
        Write-Host "   ワークツリーでの作業は禁止されています" -ForegroundColor Red
        Write-Host ""
        Write-Host "正しいディレクトリに移動してからコミットしてください:" -ForegroundColor Yellow
        Write-Host "   cd C:\Users\mituo\Desktop\kaede" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "もしワークツリーで変更を行った場合は、以下のスクリプトで同期できます:" -ForegroundColor Yellow
        Write-Host "   .\scripts\sync-from-worktree.ps1 `"$CurrentPath`"" -ForegroundColor Cyan
    } else {
        Write-Host "正しいディレクトリに移動してからコミットしてください:" -ForegroundColor Yellow
        Write-Host "   cd C:\Users\mituo\Desktop\kaede" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "コミットをキャンセルします。" -ForegroundColor Red
    exit 1
}

exit 0



