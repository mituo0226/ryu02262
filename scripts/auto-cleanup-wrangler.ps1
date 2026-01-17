# .wrangler ディレクトリの自動クリーンアップスクリプト（確認なし）
# 定期的に実行することを想定
# 
# 注意: このスクリプトは確認を求めます
# 完全自動実行の場合は auto-cleanup-wrangler-silent.ps1 を使用してください

param(
    [switch]$Force  # -Force フラグで確認をスキップ
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  .wrangler 自動クリーンアップ" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# クリーンアップ対象のディレクトリ
$cleanupTargets = @(
    "C:\Users\mituo\Desktop\kaede\.wrangler",
    "C:\Users\mituo\.wrangler"
)

$totalSize = 0
$deletedCount = 0
$skippedCount = 0

foreach ($target in $cleanupTargets) {
    if (Test-Path $target) {
        Write-Host "検出: $target" -ForegroundColor Yellow
        
        # ディレクトリサイズを計算
        $size = (Get-ChildItem -Path $target -Recurse -ErrorAction SilentlyContinue | 
                 Measure-Object -Property Length -Sum).Sum
        $sizeMB = [math]::Round($size / 1MB, 2)
        $totalSize += $size
        
        Write-Host "  サイズ: $sizeMB MB" -ForegroundColor Cyan
        
        # 削除実行
        if ($Force) {
            # -Force フラグがある場合は確認なしで削除
            $shouldDelete = $true
        } else {
            # サイズが 100MB 以上の場合のみ削除を提案
            if ($sizeMB -gt 100) {
                $confirm = Read-Host "  このディレクトリを削除しますか？ (y/N)"
                $shouldDelete = ($confirm -eq "y" -or $confirm -eq "Y")
            } else {
                Write-Host "  サイズが小さいためスキップします" -ForegroundColor Gray
                $shouldDelete = $false
                $skippedCount++
            }
        }
        
        if ($shouldDelete) {
            try {
                Remove-Item -Path $target -Recurse -Force -ErrorAction Stop
                Write-Host "  ✅ 削除完了: $target" -ForegroundColor Green
                $deletedCount++
            } catch {
                Write-Host "  ❌ 削除エラー: $_" -ForegroundColor Red
            }
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
} elseif ($skippedCount -gt 0) {
    Write-Host "スキップ: $skippedCount 個のディレクトリ（サイズが小さいため）" -ForegroundColor Yellow
} else {
    Write-Host "削除対象のディレクトリはありません" -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Cyan
