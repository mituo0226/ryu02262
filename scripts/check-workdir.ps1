# 作業ディレクトリ確認スクリプト
# 修正作業を始める前に必ず実行してください

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  作業ディレクトリ確認" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 現在のディレクトリを取得
$currentDir = Get-Location
Write-Host "現在のディレクトリ:" -ForegroundColor Yellow
Write-Host "  $currentDir" -ForegroundColor White
Write-Host ""

# 期待されるディレクトリ
$expectedDir = "C:\Users\mituo\Desktop\kaede"

# 確認
if ($currentDir.Path -eq $expectedDir) {
    Write-Host "✅ 正しいディレクトリです！" -ForegroundColor Green
    Write-Host "   作業を開始できます。" -ForegroundColor Green
} elseif ($currentDir.Path -like "*\.cursor\worktrees\kaede\*") {
    Write-Host "⚠️  警告：ワークツリーで作業しようとしています！" -ForegroundColor Red
    Write-Host "   このディレクトリでの変更は、実際のサーバーに反映されません。" -ForegroundColor Red
    Write-Host "" 
    Write-Host "正しいディレクトリに移動してください：" -ForegroundColor Yellow
    Write-Host "  cd $expectedDir" -ForegroundColor White
    Write-Host ""
    exit 1
} else {
    Write-Host "⚠️  警告：期待されるディレクトリではありません。" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "期待されるディレクトリ: $expectedDir" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "このまま続行しますか？ (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "作業を中止しました。" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ファイルの存在確認" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 重要なファイルの存在を確認
$files = @(
    "functions\_lib\characters\yukino.js",
    "public\js\features\yukino-tarot.js",
    "public\js\chat-init.js"
)

$allExist = $true
foreach ($file in $files) {
    $fullPath = Join-Path $currentDir.Path $file
    if (Test-Path $fullPath) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file (見つかりません)" -ForegroundColor Red
        $allExist = $false
    }
}

Write-Host ""

if ($allExist) {
    Write-Host "すべての重要なファイルが存在します。" -ForegroundColor Green
} else {
    Write-Host "⚠️  一部のファイルが見つかりません。" -ForegroundColor Red
    Write-Host "   正しいディレクトリか確認してください。" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "準備完了！作業を開始できます。" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
