# GitHubデスクトップの使い方ガイド

## 現在の状況

テストファイルを作成したため、以下のファイルが変更されています：

### コミットすべきファイル（推奨）

1. **`.gitignore`** - `node_modules`を除外するように更新
2. **`package.json`** - テストフレームワーク（Vitest）の設定
3. **`package-lock.json`** - 依存関係のロックファイル
4. **`vitest.config.js`** - Vitestの設定ファイル
5. **`tests/`** - テストファイル（`character-personality.test.js`と`README.md`）

### 除外されるファイル（`.gitignore`で自動除外）

- **`node_modules/`** - npmでインストールされた依存関係（自動的に除外されます）

## GitHubデスクトップでの操作手順

### 1. 変更内容の確認

1. GitHubデスクトップを開く
2. 左側の「Changes」タブを確認
3. 以下のファイルが表示されているはずです：
   - `.gitignore` (Modified)
   - `package.json` (New)
   - `package-lock.json` (New)
   - `vitest.config.js` (New)
   - `tests/` (New)

### 2. コミットメッセージの入力

1. 下部の「Summary」欄にコミットメッセージを入力
   - 例：「テストフレームワーク（Vitest）を追加し、各鑑定士の性格設定テストを作成」

2. （オプション）「Description」欄に詳細を記入
   - 例：
     ```
     - Vitestテストフレームワークを追加
     - 各鑑定士（楓、雪乃、ソラ、花音）の性格設定を検証するテストを作成
     - .gitignoreにnode_modulesを追加
     ```

### 3. コミットの実行

1. 「Commit to main」ボタンをクリック
2. 変更がローカルリポジトリにコミットされます

### 4. リモートへのプッシュ（オプション）

1. 上部の「Push origin」ボタンをクリック
2. 変更がGitHubのリモートリポジトリにアップロードされます

## 注意事項

### ✅ コミットすべきファイル

- `package.json` - プロジェクトの依存関係を定義
- `package-lock.json` - 依存関係のバージョンを固定
- `vitest.config.js` - テスト設定
- `tests/` - テストファイル
- `.gitignore` - Git除外設定

### ❌ コミットしないファイル

- `node_modules/` - 自動的に除外されます（`.gitignore`で設定済み）
- 個人の設定ファイル
- 一時ファイル

## テストの実行方法

コミット後、以下のコマンドでテストを実行できます：

```bash
# テストを実行
npm test

# ウォッチモードで実行（ファイル変更を監視）
npm run test:watch

# UIモードで実行（ブラウザで結果を確認）
npm run test:ui
```

## トラブルシューティング

### `node_modules`が表示される場合

`.gitignore`が正しく更新されているか確認してください。GitHubデスクトップを再読み込み（リフレッシュ）すると、`node_modules`が非表示になるはずです。

### ファイルが表示されない場合

1. GitHubデスクトップを再起動
2. リポジトリを再読み込み
3. `git status`コマンドで確認

## 次のステップ

1. テストを実行して動作確認
2. 必要に応じてテストケースを追加
3. 継続的にテストを実行して品質を保つ
