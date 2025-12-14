# Gitフックのセットアップスクリプト
# このスクリプトを実行して、ワークツリーでのコミットを防ぐフックをインストール

$ProjectRoot = "C:\Users\mituo\Desktop\kaede"
$HooksDir = Join-Path $ProjectRoot ".git\hooks"
$ScriptsDir = Join-Path $ProjectRoot "scripts"

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Gitフックのセットアップ" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# 現在のディレクトリを確認
$CurrentPath = (Get-Location).Path
if ($CurrentPath -ne $ProjectRoot) {
    Write-Host "警告: 正しいディレクトリに移動してください" -ForegroundColor Red
    Write-Host "   cd C:\Users\mituo\Desktop\kaede" -ForegroundColor Cyan
    exit 1
}

# フックディレクトリの確認
if (-not (Test-Path $HooksDir)) {
    Write-Host "エラー: .git\hooks ディレクトリが見つかりません" -ForegroundColor Red
    exit 1
}

# pre-commit.ps1フックをコピー
$HookSource = Join-Path $ScriptsDir "pre-commit.ps1"
$HookTarget = Join-Path $HooksDir "pre-commit.ps1"

if (Test-Path $HookSource) {
    Copy-Item -Path $HookSource -Destination $HookTarget -Force
    Write-Host "✅ pre-commit.ps1 フックをインストールしました" -ForegroundColor Green
} else {
    Write-Host "⚠️ 警告: pre-commit.ps1 が見つかりません" -ForegroundColor Yellow
    Write-Host "   フックファイルを作成します..." -ForegroundColor Yellow
    
    # フックファイルを作成
    $HookContent = @'
# ワークツリーでのコミットを防ぐpre-commitフック（PowerShell版）

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
'@
    
    Set-Content -Path $HookTarget -Value $HookContent -Encoding UTF8
    Write-Host "✅ pre-commit.ps1 フックを作成しました" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "セットアップ完了" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "これで、ワークツリーでのコミットは自動的にブロックされます。" -ForegroundColor Green
