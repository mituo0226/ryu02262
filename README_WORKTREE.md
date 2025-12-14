# ワークツリー使用禁止と対策

## ⚠️ 重要な警告

このプロジェクトでは、**ワークツリー（`.cursor\worktrees\kaede\*`）での作業は禁止**です。

## 正しい作業ディレクトリ

**常に以下のディレクトリで作業してください：**

```
C:\Users\mituo\Desktop\kaede
```

## 問題の原因

Cursorが自動的にワークツリーを作成し、そこで作業してしまうことがあります。
- ワークツリーで行った変更は、ローカルプロジェクトに自動的に反映されません
- ワークツリーでコミットしても、GitHubにプッシュしても、実際のプロジェクトには反映されません

## 対策

### 1. 作業前の確認

作業を開始する前に、必ず以下のスクリプトを実行してください：

```powershell
cd C:\Users\mituo\Desktop\kaede
.\scripts\check-workdir.ps1
```

このスクリプトは、正しいディレクトリで作業しているか確認し、Gitの状態も表示します。

### 2. Gitフックによる自動チェック

`.git/hooks/pre-commit.ps1`が自動的に実行され、ワークツリーでのコミットを防ぎます。

### 3. もしワークツリーで作業してしまった場合

以下のスクリプトで、ワークツリーの変更をローカルプロジェクトに同期できます：

```powershell
cd C:\Users\mituo\Desktop\kaede
.\scripts\sync-from-worktree.ps1 "C:\Users\mituo\.cursor\worktrees\kaede\<ワークツリー名>"
```

## 推奨される作業フロー

1. **作業開始前**: `.\scripts\check-workdir.ps1` を実行してディレクトリを確認
2. **ファイル編集**: ローカルプロジェクト（`C:\Users\mituo\Desktop\kaede`）で編集
3. **変更確認**: `git status` で変更を確認
4. **コミット**: `git add` → `git commit`（pre-commitフックが自動的にチェック）
5. **プッシュ**: `git push origin main`

## 確認コマンド

### 現在のディレクトリを確認
```powershell
pwd
# または
Get-Location
```

### Gitの状態を確認
```powershell
git status
```

### リモートとの同期を確認
```powershell
git log origin/main..HEAD --oneline  # 未プッシュのコミット
git log HEAD..origin/main --oneline  # 未取得のコミット
```

## トラブルシューティング

### ワークツリーでコミットしてしまった場合

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

### pre-commitフックが動作しない場合

PowerShellの実行ポリシーを確認：
```powershell
Get-ExecutionPolicy
```

必要に応じて変更：
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

