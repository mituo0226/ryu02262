# すべてのワークツリーを削除するスクリプト
# 未コミットの変更がある場合はスキップします

$WorktreeBasePath = "C:\Users\mituo\.cursor\worktrees\kaede"

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "ワークツリー一括削除" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# ワークツリーディレクトリの存在確認
if (-not (Test-Path $WorktreeBasePath)) {
    Write-Host "ワークツリーディレクトリが見つかりません: $WorktreeBasePath" -ForegroundColor Green
    exit 0
}

# ワークツリーの一覧を取得（README_WORKTREE.mdを除く）
$worktrees = Get-ChildItem -Path $WorktreeBasePath -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne "README_WORKTREE.md" }

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
    $worktreeName = $worktree.Name
    
    Write-Host "処理中: $worktreeName" -ForegroundColor Cyan
    
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
                Write-Host "  変更内容:" -ForegroundColor Gray
                $status | Select-Object -First 5 | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
                $skippedCount++
            } else {
                # 未コミットの変更がなければ削除
                Write-Host "  → 削除中..." -ForegroundColor Yellow
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
        Write-Host "  → 削除中（Gitリポジトリではない）..." -ForegroundColor Yellow
        Remove-Item -Path $worktreePath -Recurse -Force -ErrorAction SilentlyContinue
        if (-not (Test-Path $worktreePath)) {
            Write-Host "  ✓ 削除完了" -ForegroundColor Green
            $deletedCount++
        } else {
            Write-Host "  ✗ 削除失敗" -ForegroundColor Red
            $skippedCount++
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "削除結果" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "削除: $deletedCount個" -ForegroundColor Green
Write-Host "スキップ: $skippedCount個" -ForegroundColor Yellow
Write-Host ""

if ($deletedCount -gt 0) {
    Write-Host "✓ クリーンアップが完了しました" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️ 重要: 今後はメインプロジェクトディレクトリで作業してください:" -ForegroundColor Yellow
    Write-Host "   C:\Users\mituo\Desktop\kaede" -ForegroundColor Cyan
} else {
    Write-Host "削除されたワークツリーはありませんでした" -ForegroundColor Yellow
    if ($skippedCount -gt 0) {
        Write-Host ""
        Write-Host "⚠️ 未コミットの変更があるワークツリーがあります。" -ForegroundColor Yellow
        Write-Host "   メインプロジェクトに反映してから再度実行してください。" -ForegroundColor Yellow
    }
}
