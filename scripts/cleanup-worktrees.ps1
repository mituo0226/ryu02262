# ワークツリークリーンアップスクリプト
# 無駄に残っているワークツリーを削除します

$WorktreeBasePath = "C:\Users\mituo\.cursor\worktrees\kaede"
$LocalProjectPath = "C:\Users\mituo\Desktop\kaede"

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "ワークツリークリーンアップ" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# ワークツリーディレクトリの存在確認
if (-not (Test-Path $WorktreeBasePath)) {
    Write-Host "ワークツリーディレクトリが見つかりません: $WorktreeBasePath" -ForegroundColor Green
    exit 0
}

# ワークツリーの一覧を取得
$worktrees = Get-ChildItem -Path $WorktreeBasePath -Directory -ErrorAction SilentlyContinue

if ($worktrees.Count -eq 0) {
    Write-Host "削除対象のワークツリーはありません" -ForegroundColor Green
    exit 0
}

Write-Host "見つかったワークツリー: $($worktrees.Count)個" -ForegroundColor Yellow
Write-Host ""

# 各ワークツリーを確認して削除
$deletedCount = 0
$skippedCount = 0

foreach ($worktree in $worktrees) {
    $worktreePath = $worktree.FullName
    
    Write-Host "処理中: $($worktree.Name)" -ForegroundColor Cyan
    
    # Gitリポジトリとして有効か確認
    $gitDir = Join-Path $worktreePath ".git"
    if (Test-Path $gitDir) {
        # Gitリポジトリとして有効な場合は、未コミットの変更を確認
        Push-Location $worktreePath
        try {
            $status = git status --porcelain 2>$null
            $hasUncommittedChanges = $status -ne $null -and $status.Length -gt 0
            
            if ($hasUncommittedChanges) {
                Write-Host "  ⚠️ 未コミットの変更があるためスキップ" -ForegroundColor Yellow
                $skippedCount++
            } else {
                # 未コミットの変更がなければ削除
                Remove-Item -Path $worktreePath -Recurse -Force -ErrorAction SilentlyContinue
                if (-not (Test-Path $worktreePath)) {
                    Write-Host "  ✓ 削除完了" -ForegroundColor Green
                    $deletedCount++
                } else {
                    Write-Host "  ✗ 削除失敗" -ForegroundColor Red
                    $skippedCount++
                }
            }
        } catch {
            Write-Host "  ✗ エラー: $_" -ForegroundColor Red
            $skippedCount++
        } finally {
            Pop-Location
        }
    } else {
        # Gitリポジトリでない場合は単純に削除
        Remove-Item -Path $worktreePath -Recurse -Force -ErrorAction SilentlyContinue
        if (-not (Test-Path $worktreePath)) {
            Write-Host "  ✓ 削除完了（Gitリポジトリではない）" -ForegroundColor Green
            $deletedCount++
        } else {
            Write-Host "  ✗ 削除失敗" -ForegroundColor Red
            $skippedCount++
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "クリーンアップ結果" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "削除: $deletedCount個" -ForegroundColor Green
Write-Host "スキップ: $skippedCount個" -ForegroundColor Yellow
Write-Host ""

if ($deletedCount -gt 0) {
    Write-Host "✓ クリーンアップが完了しました" -ForegroundColor Green
} else {
    Write-Host "削除されたワークツリーはありませんでした" -ForegroundColor Yellow
}
