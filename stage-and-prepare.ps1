# chat-ui リファクタ用: ステージング＋コミット準備
# 使い方: PowerShell でこのスクリプトを実行後、GitHub Desktop を開き、
#         COMMIT_MSG.txt の内容をコピーして貼り付け、「Commit to main」を押す。

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

git add public/js/chat-ui.js public/pages/chat/chat.html public/css/chat-ui.css
git status

Write-Host ""
Write-Host "完了: 上記3ファイルをステージしました。" -ForegroundColor Green
Write-Host "  1. GitHub Desktop を開く" -ForegroundColor Cyan
Write-Host "  2. COMMIT_MSG.txt を開き、中身をコピーして Summary に貼り付ける" -ForegroundColor Cyan
Write-Host "  3. 「Commit to main」を押す" -ForegroundColor Cyan
