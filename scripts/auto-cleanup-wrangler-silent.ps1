# .wrangler ディレクトリの自動クリーンアップスクリプト（自動削除＋報告）
# 確認なしで自動削除し、詳細な報告を出力します

param(
    [int]$MinSizeMB = 10,  # このサイズ（MB）以上のディレクトリのみ削除
    [int]$MaxFolders = 20,  # この数以上のフォルダーがある場合、古いものから削除（デフォルト: 20）
    [string]$LogFile = ""  # ログファイルパス（空の場合はコンソールのみ）
)

$scriptStartTime = Get-Date
$timestamp = $scriptStartTime.ToString("yyyy-MM-dd HH:mm:ss")

# ログ出力関数
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $logMessage = "[$timestamp] [$Level] $Message"
    
    # コンソール出力
    switch ($Level) {
        "INFO" { Write-Host $logMessage -ForegroundColor Cyan }
        "SUCCESS" { Write-Host $logMessage -ForegroundColor Green }
        "WARNING" { Write-Host $logMessage -ForegroundColor Yellow }
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        default { Write-Host $logMessage }
    }
    
    # ログファイル出力
    if ($LogFile -ne "") {
        Add-Content -Path $LogFile -Value $logMessage -Encoding UTF8
    }
}

# レポート用のデータ構造
$report = @{
    StartTime = $scriptStartTime
    EndTime = $null
    Targets = @()
    TotalDeleted = 0
    TotalSizeMB = 0
    Errors = @()
}

Write-Log "========================================"
Write-Log ".wrangler 自動クリーンアップ開始"
Write-Log "========================================"
Write-Log ""
if ($MaxFolders -gt 0) {
    Write-Log "フォルダー数制限: $MaxFolders 個" "INFO"
}
Write-Log "最小サイズ: $MinSizeMB MB" "INFO"
Write-Log ""

# クリーンアップ対象のディレクトリ
$cleanupTargets = @(
    @{
        Path = "C:\Users\mituo\Desktop\kaede\.wrangler"
        Description = "プロジェクト内の .wrangler"
    },
    @{
        Path = "C:\Users\mituo\.wrangler"
        Description = "ホームディレクトリの .wrangler"
    }
)

foreach ($targetInfo in $cleanupTargets) {
    $target = $targetInfo.Path
    $description = $targetInfo.Description
    
    if (Test-Path $target) {
        Write-Log "検出: $description" "INFO"
        Write-Log "  パス: $target" "INFO"
        
        try {
            # ディレクトリサイズを計算
            $size = (Get-ChildItem -Path $target -Recurse -ErrorAction SilentlyContinue | 
                     Measure-Object -Property Length -Sum).Sum
            $sizeMB = [math]::Round($size / 1MB, 2)
            
            # サブディレクトリ数をカウント
            $subDirectories = Get-ChildItem -Path $target -Directory -ErrorAction SilentlyContinue
            $folderCount = $subDirectories.Count
            
            Write-Log "  サイズ: $sizeMB MB" "INFO"
            Write-Log "  サブディレクトリ数: $folderCount" "INFO"
            
            $shouldDelete = $false
            $deleteReason = ""
            
            # フォルダー数制限チェック
            if ($MaxFolders -gt 0 -and $folderCount -gt $MaxFolders) {
                $shouldDelete = $true
                $deleteReason = "フォルダー数制限超過 ($folderCount > $MaxFolders)"
                Write-Log "  フォルダー数が制限を超えています ($folderCount > $MaxFolders)" "WARNING"
                
                # 古いフォルダーから順に削除
                $foldersToDelete = $folderCount - $MaxFolders
                Write-Log "  古いフォルダー $foldersToDelete 個を削除します..." "INFO"
                
                # 更新日時でソート（古い順）
                $sortedFolders = $subDirectories | Sort-Object LastWriteTime
                
                $deletedFolders = 0
                $deletedSize = 0
                
                foreach ($folder in $sortedFolders) {
                    if ($deletedFolders -ge $foldersToDelete) {
                        break
                    }
                    
                    try {
                        $folderSize = (Get-ChildItem -Path $folder.FullName -Recurse -ErrorAction SilentlyContinue | 
                                      Measure-Object -Property Length -Sum).Sum
                        $folderSizeMB = [math]::Round($folderSize / 1MB, 2)
                        
                        Write-Log "    削除: $($folder.Name) ($folderSizeMB MB, 更新: $($folder.LastWriteTime))" "INFO"
                        
                        Remove-Item -Path $folder.FullName -Recurse -Force -ErrorAction Stop
                        $deletedFolders++
                        $deletedSize += $folderSize
                        
                        Write-Log "    ✅ 削除完了" "SUCCESS"
                    } catch {
                        Write-Log "    ❌ 削除エラー: $_" "ERROR"
                    }
                }
                
                $deletedSizeMB = [math]::Round($deletedSize / 1MB, 2)
                Write-Log "  ✅ フォルダー $deletedFolders 個を削除しました (解放容量: $deletedSizeMB MB)" "SUCCESS"
                
                # レポートに追加
                $report.Targets += @{
                    Path = $target
                    Description = $description
                    SizeMB = $sizeMB
                    FolderCount = $folderCount
                    DeletedFolders = $deletedFolders
                    DeletedSizeMB = $deletedSizeMB
                    Deleted = $true
                    DeleteReason = $deleteReason
                }
                
                $report.TotalDeleted++
                $report.TotalSizeMB += $deletedSizeMB
            }
            # サイズチェック（フォルダー数制限で削除されなかった場合のみ）
            elseif ($sizeMB -ge $MinSizeMB) {
                # 自動削除実行
                Write-Log "  削除を実行します..." "INFO"
                
                $deleteStartTime = Get-Date
                Remove-Item -Path $target -Recurse -Force -ErrorAction Stop
                $deleteEndTime = Get-Date
                $deleteDuration = ($deleteEndTime - $deleteStartTime).TotalSeconds
                
                Write-Log "  ✅ 削除完了 (所要時間: $([math]::Round($deleteDuration, 2))秒)" "SUCCESS"
                
                # レポートに追加
                $report.Targets += @{
                    Path = $target
                    Description = $description
                    SizeMB = $sizeMB
                    FolderCount = $folderCount
                    Deleted = $true
                    DeleteDuration = $deleteDuration
                    DeleteReason = "サイズ制限 ($sizeMB MB >= $MinSizeMB MB)"
                }
                
                $report.TotalDeleted++
                $report.TotalSizeMB += $sizeMB
            } else {
                Write-Log "  サイズが小さいためスキップ ($sizeMB MB < $MinSizeMB MB)" "WARNING"
                
                # レポートに追加（スキップ）
                $report.Targets += @{
                    Path = $target
                    Description = $description
                    SizeMB = $sizeMB
                    FolderCount = $folderCount
                    Deleted = $false
                    Reason = "サイズが小さい ($sizeMB MB < $MinSizeMB MB)"
                }
            }
        } catch {
            $errorMessage = "削除エラー: $_"
            Write-Log "  ❌ $errorMessage" "ERROR"
            
            $report.Errors += @{
                Path = $target
                Description = $description
                Error = $_.Exception.Message
            }
        }
        
        Write-Log ""
    } else {
        Write-Log "存在しない: $description" "INFO"
        Write-Log "  パス: $target" "INFO"
        Write-Log ""
    }
}

# レポート生成
$report.EndTime = Get-Date
$totalDuration = ($report.EndTime - $report.StartTime).TotalSeconds

Write-Log "========================================" "INFO"
Write-Log "クリーンアップ完了レポート" "INFO"
Write-Log "========================================" "INFO"
Write-Log ""
Write-Log "実行時刻: $($report.StartTime.ToString('yyyy-MM-dd HH:mm:ss'))" "INFO"
Write-Log "所要時間: $([math]::Round($totalDuration, 2))秒" "INFO"
Write-Log ""

if ($report.TotalDeleted -gt 0) {
    Write-Log "削除されたディレクトリ: $($report.TotalDeleted) 個" "SUCCESS"
    Write-Log "解放された容量: $([math]::Round($report.TotalSizeMB, 2)) MB" "SUCCESS"
    Write-Log ""
    
    Write-Log "削除詳細:" "INFO"
    foreach ($target in $report.Targets) {
        if ($target.Deleted) {
            Write-Log "  ✅ $($target.Description)" "SUCCESS"
            Write-Log "     パス: $($target.Path)" "INFO"
            Write-Log "     サイズ: $($target.SizeMB) MB" "INFO"
            if ($target.FolderCount) {
                Write-Log "     フォルダー数: $($target.FolderCount)" "INFO"
            }
            if ($target.DeletedFolders) {
                Write-Log "     削除されたフォルダー数: $($target.DeletedFolders)" "INFO"
                Write-Log "     解放された容量: $($target.DeletedSizeMB) MB" "INFO"
            }
            if ($target.DeleteDuration) {
                Write-Log "     削除時間: $([math]::Round($target.DeleteDuration, 2))秒" "INFO"
            }
            if ($target.DeleteReason) {
                Write-Log "     削除理由: $($target.DeleteReason)" "INFO"
            }
        } else {
            Write-Log "  ⏭️  $($target.Description) - $($target.Reason)" "WARNING"
            if ($target.FolderCount) {
                Write-Log "     フォルダー数: $($target.FolderCount)" "INFO"
            }
        }
    }
} else {
    Write-Log "削除されたディレクトリはありません" "WARNING"
    Write-Log ""
    Write-Log "スキャン結果:" "INFO"
    foreach ($target in $report.Targets) {
        Write-Log "  ⏭️  $($target.Description) - $($target.Reason)" "WARNING"
    }
}

if ($report.Errors.Count -gt 0) {
    Write-Log ""
    Write-Log "エラーが発生しました:" "ERROR"
    foreach ($error in $report.Errors) {
        Write-Log "  ❌ $($error.Description)" "ERROR"
        Write-Log "     パス: $($error.Path)" "ERROR"
        Write-Log "     エラー: $($error.Error)" "ERROR"
    }
}

Write-Log ""
Write-Log "注意: 次回 'wrangler dev' を実行すると、.wrangler ディレクトリは再生成されます。" "WARNING"
Write-Log "これは正常な動作です。" "WARNING"
Write-Log "========================================" "INFO"

# ログファイルに保存した場合の通知
if ($LogFile -ne "") {
    Write-Log ""
    Write-Log "ログファイル: $LogFile" "INFO"
}
