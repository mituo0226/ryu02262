# .wrangler ディレクトリのクリーンアップガイド

## 問題の説明

`.wrangler` ディレクトリは、Cloudflare Wrangler が開発中に自動生成する作業用ディレクトリです。
このディレクトリが無限に増え続けると、以下の問題が発生します：

1. **AIの誤認識**: Cursor AI が `.wrangler` ディレクトリをプロジェクトの一部として認識し、作業が重くなる
2. **ディスク容量の消費**: 不要なファイルが蓄積される
3. **検索の遅延**: ファイル検索時に大量のファイルをスキャンするため時間がかかる

## 解決策

### 1. `.cursorignore` ファイルの作成（推奨）

プロジェクトルートに `.cursorignore` ファイルを作成し、以下の内容を追加してください：

```
# Cursor が読み込まないようにするファイル・ディレクトリ

# Wrangler の作業用ディレクトリ（無限に増える可能性がある）
.wrangler/
**/.wrangler/
C:\Users\mituo\.wrangler/

# ワークツリー（誤認識を防ぐ）
.cursor/worktrees/
C:\Users\mituo\.cursor\worktrees/

# ビルド成果物
node_modules/
dist/
build/
.wrangler/
.wrangler/tmp/
.wrangler/**/*

# ログファイル
*.log

# 一時ファイル
*.tmp
*.temp
.cache/

# システムファイル
.DS_Store
Thumbs.db
desktop.ini
```

このファイルにより、Cursor AI が `.wrangler` ディレクトリを読み込まなくなります。

### 2. クリーンアップスクリプトの使用

#### 手動クリーンアップ（確認あり）
```powershell
cd C:\Users\mituo\Desktop\kaede
.\scripts\cleanup-wrangler.ps1
```

各ディレクトリの削除前に確認を求められます。

#### 自動クリーンアップ（100MB以上の場合のみ確認）
```powershell
cd C:\Users\mituo\Desktop\kaede
.\scripts\auto-cleanup-wrangler.ps1
```

サイズが 100MB 以上のディレクトリのみ削除を提案します。

#### 強制クリーンアップ（確認なし）
```powershell
cd C:\Users\mituo\Desktop\kaede
.\scripts\auto-cleanup-wrangler.ps1 -Force
```

確認なしで全ての `.wrangler` ディレクトリを削除します。

#### 完全自動クリーンアップ（確認なし＋詳細レポート）【推奨】
```powershell
cd C:\Users\mituo\Desktop\kaede
.\scripts\auto-cleanup-wrangler-silent.ps1
```

このスクリプトは：
- 確認なしで自動削除（10MB以上のディレクトリ）
- 詳細なレポートを出力
- ログファイルに保存可能

ログファイルに保存する場合：
```powershell
.\scripts\auto-cleanup-wrangler-silent.ps1 -LogFile "cleanup-log.txt"
```

最小サイズを変更する場合（例：50MB以上）：
```powershell
.\scripts\auto-cleanup-wrangler-silent.ps1 -MinSizeMB 50
```

### 3. 定期的なクリーンアップ

#### 手動実行
作業が重くなってきたと感じたら、定期的にクリーンアップを実行してください：

```powershell
# 週に1回程度を推奨
.\scripts\auto-cleanup-wrangler-silent.ps1
```

#### 自動実行（Windows タスクスケジューラ）
毎日自動的にクリーンアップを実行するように設定できます：

```powershell
# タスクスケジューラに登録（毎日午前2時に実行）
.\scripts\setup-auto-cleanup-task.ps1
```

登録後は、毎日自動的に `.wrangler` ディレクトリがクリーンアップされ、ログファイルに記録されます。

## クリーンアップ対象

以下のディレクトリがクリーンアップ対象です：

- `C:\Users\mituo\Desktop\kaede\.wrangler` (プロジェクト内)
- `C:\Users\mituo\.wrangler` (ホームディレクトリ)

## 注意事項

### 削除しても問題ない理由

- `.wrangler` ディレクトリは開発中の一時ファイルのみを保存します
- 次回 `wrangler dev` を実行すると自動的に再生成されます
- プロジェクトのソースコードには影響しません

### 削除後の動作

1. クリーンアップを実行
2. 次回 `wrangler dev` を実行
3. `.wrangler` ディレクトリが自動的に再生成される（正常な動作）

### Git との関係

`.wrangler` ディレクトリは `.gitignore` に含まれているため：
- Git にはコミットされません
- 削除しても Git の履歴には影響しません

## トラブルシューティング

### スクリプトが実行できない場合

PowerShell の実行ポリシーを確認：
```powershell
Get-ExecutionPolicy
```

必要に応じて変更：
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### ディレクトリが削除できない場合

1. `wrangler dev` が実行中でないか確認
2. 他のプロセスが `.wrangler` ディレクトリを使用していないか確認
3. 管理者権限で PowerShell を実行してから再度試す

### AI がまだ `.wrangler` を読み込んでいる場合

1. `.cursorignore` ファイルが正しく作成されているか確認
2. Cursor を再起動
3. プロジェクトを再度開き直す

## クリーンアップ条件の詳細

各スクリプトのクリーンアップ条件については、[WRANGLER_CLEANUP_CONDITIONS.md](WRANGLER_CLEANUP_CONDITIONS.md) を参照してください。

## 関連ファイル

- `.gitignore` - Git から除外するファイル（`.wrangler/` を含む）
- `scripts/cleanup-wrangler.ps1` - 手動クリーンアップスクリプト（確認あり）
- `scripts/auto-cleanup-wrangler.ps1` - 自動クリーンアップスクリプト（確認あり/なし）
- `scripts/auto-cleanup-wrangler-silent.ps1` - 完全自動クリーンアップスクリプト（確認なし＋詳細レポート）【推奨】
- `scripts/setup-auto-cleanup-task.ps1` - Windows タスクスケジューラ登録スクリプト
- `docs/guides/WRANGLER_CLEANUP_CONDITIONS.md` - クリーンアップ条件の詳細説明
