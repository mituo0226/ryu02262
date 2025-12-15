# ⚠️ ワークツリー使用禁止の警告

## 重要な注意事項

このプロジェクトでは、**ワークツリー（`.cursor\worktrees\kaede\*`）での作業は禁止**です。

## 正しい作業ディレクトリ

**常に以下のディレクトリで作業してください：**

```
C:\Users\mituo\Desktop\kaede
```

## ワークツリーとは

ワークツリーは、Cursorが自動的に作成する一時的な作業ディレクトリです。
- パス: `C:\Users\mituo\.cursor\worktrees\kaede\*`
- 問題: ワークツリーで行った変更は、ローカルプロジェクトに自動的に反映されません
- 結果: GitHubにプッシュしても、実際のプロジェクトには反映されない

## 作業前の確認手順

1. **現在のディレクトリを確認**
   ```powershell
   cd C:\Users\mituo\Desktop\kaede
   pwd
   ```

2. **Gitの状態を確認**
   ```powershell
   git status
   ```

3. **リモートとの同期を確認**
   ```powershell
   git log origin/main..HEAD --oneline
   git log HEAD..origin/main --oneline
   ```

## もしワークツリーで作業してしまった場合

1. ワークツリーの変更を確認
2. ローカルプロジェクトに変更をコピーまたはマージ
3. ローカルプロジェクトでコミット・プッシュ

## 推奨される作業フロー

1. ファイルを編集する前に、必ず `C:\Users\mituo\Desktop\kaede` にいることを確認
2. 変更を加える
3. `git status` で変更を確認
4. `git add` でステージング
5. `git commit` でコミット
6. `git push origin main` でGitHubにプッシュ



