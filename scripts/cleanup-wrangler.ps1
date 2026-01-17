# .wrangler ディレクトリのクリーンアップスクリプト
# 無限に増える .wrangler ディレクトリを削除して、作業を軽くします

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  .wrangler ディレクトリのクリーンアップ" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# クリーンアップ対象のディレクトリ
$cleanupTargets = @(
    # プロジェクト内の .wrangler
    "C:\Users\mituo\Desktop\kaede\.wrangler",
    # ホームディレクトリの .wrangler
    "C:\Users\mituo\.wrangler"
)

$totalSize = 0
$deletedCount = 0

foreach ($target in $cleanupTargets) {
    if (Test-Path $target) {
        Write-Host "検出: $target" -ForegroundColor Yellow
        
        # ディレクトリサイズを計算
        $size = (Get-ChildItem -Path $target -Recurse -ErrorAction SilentlyContinue | 
                 Measure-Object -Property Length -Sum).Sum
        $sizeMB = [math]::Round($size / 1MB, 2)
        $totalSize += $size
        
        Write-Host "  サイズ: $sizeMB MB" -ForegroundColor Cyan
        
        # 削除確認
        $confirm = Read-Host "  このディレクトリを削除しますか？ (y/N)"
        if ($confirm -eq "y" -or $confirm -eq "Y") {
            try {
                Remove-Item -Path $target -Recurse -Force -ErrorAction Stop
                Write-Host "  ✅ 削除完了: $target" -ForegroundColor Green
                $deletedCount++
            } catch {
                Write-Host "  ❌ 削除エラー: $_" -ForegroundColor Red
            }
        } else {
            Write-Host "  スキップしました" -ForegroundColor Yellow
        }
        Write-Host ""
    }
}

# 結果サマリー
Write-Host "========================================" -ForegroundColor Cyan
if ($deletedCount -gt 0) {
    $totalSizeMB = [math]::Round($totalSize / 1MB, 2)
    Write-Host "クリーンアップ完了: $deletedCount 個のディレクトリを削除" -ForegroundColor Green
    Write-Host "解放された容量: $totalSizeMB MB" -ForegroundColor Green
} else {
    Write-Host "削除されたディレクトリはありません" -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "注意: 次回 'wrangler dev' を実行すると、.wrangler ディレクトリは再生成されます。" -ForegroundColor Yellow
Write-Host "これは正常な動作です。" -ForegroundColor Yellow
