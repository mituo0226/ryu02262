# 作業用フォルダー管理ガイド

## 概要

このプロジェクトでは、**正しい作業ディレクトリで作業すること**と、**作業用フォルダー（`.wrangler`、ワークツリー）を適切に管理すること**が重要です。

## ⚠️ 重要：作業ディレクトリの確認（必須・最優先）

**すべてのファイル編集・Git操作は、必ずローカルプロジェクト（`C:\Users\mituo\Desktop\kaede`）で行うこと。**

### 🚨 作業開始前の必須確認手順（毎回実行）

1. **作業ディレクトリを確認**: 
   ```powershell
   cd C:\Users\mituo\Desktop\kaede
   .\scripts\check-workdir.ps1
   ```
   このスクリプトが成功することを確認してから作業を開始

2. **ワークツリー（`.cursor\worktrees\kaede\*`）での作業は絶対禁止**
   - ワークツリーで変更しても、ローカルプロジェクトに反映されない
   - ワークツリーでコミットしても、GitHubにプッシュしても意味がない

3. **Git操作前の確認**: 
   ```powershell
   git status
   pwd  # または Get-Location
   ```
   現在のディレクトリが `C:\Users\mituo\Desktop\kaede` であることを確認

4. **コミット前の確認**: 
   - コミットするファイルがローカルプロジェクトにあることを確認
   - pre-commitフックが自動的にチェックします（ワークツリーでのコミットはブロックされます）

### ワークツリーとローカルプロジェクトの違い

- **ローカルプロジェクト**: `C:\Users\mituo\Desktop\kaede` ← **常にここで作業**
- **ワークツリー**: `C:\Users\mituo\.cursor\worktrees\kaede\*` ← **使用禁止**

### Git操作のルール

- **コミット**: 必ず `C:\Users\mituo\Desktop\kaede` で実行
- **プッシュ**: 必ず `C:\Users\mituo\Desktop\kaede` で実行
- **変更確認**: `git status`で作業ディレクトリを確認してから実行

## ワークツリー使用禁止と対策

### 問題の原因

Cursorが自動的にワークツリーを作成し、そこで作業してしまうことがあります。
- ワークツリーで行った変更は、ローカルプロジェクトに自動的に反映されません
- ワークツリーでコミットしても、GitHubにプッシュしても、実際のプロジェクトには反映されません

### 対策

#### 1. 作業前の確認

作業を開始する前に、必ず以下のスクリプトを実行してください：

```powershell
cd C:\Users\mituo\Desktop\kaede
.\scripts\check-workdir.ps1
```

このスクリプトは、正しいディレクトリで作業しているか確認し、Gitの状態も表示します。

#### 2. Gitフックによる自動チェック

`.git/hooks/pre-commit.ps1`が自動的に実行され、ワークツリーでのコミットを防ぎます。

#### 3. もしワークツリーで作業してしまった場合

以下のスクリプトで、ワークツリーの変更をローカルプロジェクトに同期できます：

```powershell
cd C:\Users\mituo\Desktop\kaede
.\scripts\sync-from-worktree.ps1 "C:\Users\mituo\.cursor\worktrees\kaede\<ワークツリー名>"
```

### 推奨される作業フロー

1. **作業開始前**: `.\scripts\check-workdir.ps1` を実行してディレクトリを確認
2. **ファイル編集**: ローカルプロジェクト（`C:\Users\mituo\Desktop\kaede`）で編集
3. **変更確認**: `git status` で変更を確認
4. **コミット**: `git add` → `git commit`（pre-commitフックが自動的にチェック）
5. **プッシュ**: `git push origin main`

### 確認コマンド

#### 現在のディレクトリを確認
```powershell
pwd
# または
Get-Location
```

#### Gitの状態を確認
```powershell
git status
```

#### リモートとの同期を確認
```powershell
git log origin/main..HEAD --oneline  # 未プッシュのコミット
git log HEAD..origin/main --oneline  # 未取得のコミット
```

### トラブルシューティング

#### ワークツリーでコミットしてしまった場合

1. ワークツリーのコミットハッシュを確認
   ```powershell
   cd C:\Users\mituo\.cursor\worktrees\kaede\<ワークツリー名>
   git log --oneline -1
   ```

2. ローカルプロジェクトに移動してマージ
   ```powershell
   cd C:\Users\mituo\Desktop\kaede
   git merge <コミットハッシュ>
   ```

3. プッシュ
   ```powershell
   git push origin main
   ```

#### pre-commitフックが動作しない場合

PowerShellの実行ポリシーを確認：
```powershell
Get-ExecutionPolicy
```

必要に応じて変更：
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## .wrangler ディレクトリのクリーンアップ

`.wrangler` ディレクトリは Wrangler の開発中に自動生成される作業用ディレクトリです。
このディレクトリが無限に増えると、AIが誤認識して作業が重くなる原因になります。

### クリーンアップ方法

#### 手動クリーンアップ（確認あり）
```powershell
.\scripts\cleanup-wrangler.ps1
```

#### 自動クリーンアップ（100MB以上の場合のみ確認）
```powershell
.\scripts\auto-cleanup-wrangler.ps1
```

#### 強制クリーンアップ（確認なし）
```powershell
.\scripts\auto-cleanup-wrangler.ps1 -Force
```

#### 完全自動クリーンアップ（確認なし＋詳細レポート）
```powershell
.\scripts\auto-cleanup-wrangler-silent.ps1
```

このスクリプトは確認なしで自動削除し、詳細なレポートを出力します。

**クリーンアップ条件**: 
- **10MB以上**のディレクトリを自動削除
- **フォルダー数制限**（デフォルト: 20個）: 20個を超えるフォルダーがある場合、古いものから削除

- ✅ 10MB以上 → 自動削除
- ✅ フォルダー数が20個超過 → 古いフォルダーから自動削除
- ⏭️ 10MB未満 かつ フォルダー数が20個以下 → スキップ

最小サイズを変更する場合：
```powershell
.\scripts\auto-cleanup-wrangler-silent.ps1 -MinSizeMB 50
```

フォルダー数制限を変更する場合：
```powershell
# 制限を10個に変更
.\scripts\auto-cleanup-wrangler-silent.ps1 -MaxFolders 10

# フォルダー数制限を無効にする
.\scripts\auto-cleanup-wrangler-silent.ps1 -MaxFolders 0
```

詳細な条件については [WRANGLER_CLEANUP_CONDITIONS.md](../guides/WRANGLER_CLEANUP_CONDITIONS.md) を参照してください。

ログファイルに保存する場合：
```powershell
.\scripts\auto-cleanup-wrangler-silent.ps1 -LogFile "cleanup-log.txt"
```

### クリーンアップ対象
- `C:\Users\mituo\Desktop\kaede\.wrangler` (プロジェクト内)
- `C:\Users\mituo\.wrangler` (ホームディレクトリ)

### 自動実行の設定（推奨）

毎日自動的にクリーンアップを実行するように設定できます：

```powershell
# Windows タスクスケジューラに登録（毎日午前2時に実行）
.\scripts\setup-auto-cleanup-task.ps1
```

登録後は、毎日自動的に `.wrangler` ディレクトリがクリーンアップされ、詳細なレポートがログファイルに記録されます。

### 注意
- クリーンアップ後、次回 `wrangler dev` を実行すると `.wrangler` ディレクトリは再生成されます（正常な動作です）
- `.wrangler` ディレクトリは `.gitignore` に含まれているため、Gitにはコミットされません
- 自動クリーンアップは確認なしで実行されますが、詳細なレポートが出力されます

## 作業用フォルダーの除外設定

メインプロジェクトフォルダーで作業する際、作業用フォルダー（`.wrangler`）のファイルが優先されないように設定されています。

### 除外対象
- `.wrangler/` ディレクトリ内のすべてのファイル
- `C:\Users\mituo\.wrangler/` ディレクトリ内のすべてのファイル
- `.wrangler` 配下のすべてのサブディレクトリとファイル

### 優先すべきファイル
- メインプロジェクトフォルダー（`C:\Users\mituo\Desktop\kaede`）内のファイルのみを読み込む
- `.wrangler` ディレクトリは一時的な作業用ファイルなので、コード検索やファイル参照から除外する
- `.cursorignore` ファイルに記載されているパターンに従う

### 注意事項
- `.wrangler` ディレクトリは Cloudflare Wrangler が自動生成する一時ファイルです
- これらのファイルを読み込むと、作業が重くなり、誤認識の原因になります
- 常にメインプロジェクトフォルダー内のファイルを優先してください

### 設定ファイル
- `.cursorignore` - Cursor が無視するファイル・ディレクトリのパターン
- `.cursorrules` - Cursor AI 向けのルール定義（作業用フォルダーを優先しない設定を含む）

詳細は [CURSOR_IGNORE_SETTINGS.md](../guides/CURSOR_IGNORE_SETTINGS.md) を参照してください。

## ⚠️ 作業用フォルダ（ワークツリー）が優先される構造の問題

### 現象

Cursor は **ワークスペースとしてワークツリー**（`C:\Users\mituo\.cursor\worktrees\kaede\*`）を開くことがあります。  
その場合、**編集・検索の対象がワークツリーになり、メインプロジェクトには反映されない**ことがあります。

- ワークスペース = ワークツリー → 相対パスや「プロジェクトルート」はワークツリーを指す
- ルールで「メインプロジェクトで作業」と書いても、**構造的にワークツリーが優先**されやすい

### 必須の運用

1. **ファイル編集時は、必ずメインプロジェクトの絶対パスを使う**
   - 使用するパス: `C:\Users\mituo\Desktop\kaede\public\js\...` など
   - 使用しないパス: `public\js\...`（ワークツリーを開いているとワークツリー側を指す）
2. **Cursor で開くフォルダは、可能な限りメインプロジェクトにする**
   - 開くフォルダ: `C:\Users\mituo\Desktop\kaede`
   - 開かないフォルダ: `C:\Users\mituo\.cursor\worktrees\kaede\xxx`
3. **修正後は、メインプロジェクトで変更があるか必ず確認する**
   - 例: `C:\Users\mituo\Desktop\kaede` で `git status` を実行して変更を確認

### AI・エージェント向けの明示

- ワークツリー内のファイルは **読み取り・編集・提案の対象にしない**
- 編集・作成するファイルは **常に `C:\Users\mituo\Desktop\kaede` 配下の絶対パス**で指定する
- ワークスペースがワークツリーになっていても、**作業先はメインプロジェクトに固定**する

## 関連ドキュメント

- [CURSOR_IGNORE_SETTINGS.md](../guides/CURSOR_IGNORE_SETTINGS.md) - Cursor の除外設定の詳細
- [WRANGLER_CLEANUP.md](../guides/WRANGLER_CLEANUP.md) - Wrangler クリーンアップの詳細
- [WRANGLER_CLEANUP_CONDITIONS.md](../guides/WRANGLER_CLEANUP_CONDITIONS.md) - クリーンアップ条件の詳細
