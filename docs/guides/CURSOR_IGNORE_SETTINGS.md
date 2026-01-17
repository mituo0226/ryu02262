# Cursor の作業用フォルダー除外設定

## 概要

メインプロジェクトフォルダー（`C:\Users\mituo\Desktop\kaede`）で作業する際、作業用フォルダー（`.wrangler`）のファイルが優先されないように設定する方法です。

## 設定ファイル

### 1. `.cursorignore` ファイル

プロジェクトルートに `.cursorignore` ファイルを作成し、作業用フォルダーを除外します。

**主な除外対象**:
- `.wrangler/` ディレクトリ
- `C:\Users\mituo\.wrangler/` ディレクトリ
- ワークツリー（`.cursor/worktrees/`）
- ビルド成果物（`node_modules/`, `dist/`, `build/`）
- ログファイル（`*.log`）
- 一時ファイル（`*.tmp`, `*.temp`）

### 2. `.cursorrules` ファイル

`.cursorrules` ファイルに、作業用フォルダーを優先しないように明示的に指示を追加します。

## `.cursorignore` ファイルの更新方法

`.cursorignore` ファイルを以下の内容で更新してください：

```
# Cursor が読み込まないようにするファイル・ディレクトリ
# メインプロジェクトフォルダー（C:\Users\mituo\Desktop\kaede）で作業する際、
# 作業用フォルダー（.wrangler）のファイルが優先されないように設定

# ========================================
# Wrangler の作業用ディレクトリ（最優先で除外）
# ========================================
# プロジェクト内の .wrangler
.wrangler/
.wrangler/**
**/.wrangler/
**/.wrangler/**

# ホームディレクトリの .wrangler（絶対パス）
C:\Users\mituo\.wrangler/
C:\Users\mituo\.wrangler/**

# .wrangler 配下のすべてのファイルとディレクトリ
**/.wrangler/**/*
.wrangler/tmp/
.wrangler/state/
.wrangler/deploy/
.wrangler/**/*.js
.wrangler/**/*.ts
.wrangler/**/*.json
.wrangler/**/*.log

# ========================================
# ワークツリー（誤認識を防ぐ）
# ========================================
.cursor/worktrees/
C:\Users\mituo\.cursor\worktrees/
**/.cursor/worktrees/

# ========================================
# ビルド成果物
# ========================================
node_modules/
dist/
build/
out/
.next/
.nuxt/
.vite/

# ========================================
# ログファイル
# ========================================
*.log
logs/
*.log.*

# ========================================
# 一時ファイル
# ========================================
*.tmp
*.temp
.tmp/
.temp/
.cache/
*.cache

# ========================================
# システムファイル
# ========================================
.DS_Store
Thumbs.db
desktop.ini
*.swp
*.swo
*~

# ========================================
# その他の作業用ファイル
# ========================================
*.backup
*.bak
*.old
*.orig
```

## 設定の確認方法

### `.cursorignore` の確認

```powershell
# プロジェクトルートで確認
Get-Content .cursorignore
```

### Cursor の再起動

設定を反映するには、Cursor を再起動してください。

## 効果

### 設定前
- `.wrangler` ディレクトリ内のファイルが検索結果に含まれる
- AI が作業用フォルダーのファイルを読み込む
- 作業が重くなる

### 設定後
- `.wrangler` ディレクトリ内のファイルが検索結果から除外される
- AI がメインプロジェクトフォルダーのファイルのみを読み込む
- 作業が軽くなる

## トラブルシューティング

### まだ `.wrangler` のファイルが読み込まれている場合

1. **Cursor を再起動**
   - 設定変更後は必ず Cursor を再起動してください

2. **`.cursorignore` の確認**
   - `.cursorignore` ファイルが正しく作成されているか確認
   - パターンが正しいか確認

3. **プロジェクトを再度開く**
   - Cursor でプロジェクトを閉じて、再度開き直す

4. **`.cursorignore` のパターンを確認**
   - ワイルドカード（`**`）が正しく使用されているか確認
   - 絶対パスと相対パスの両方を指定しているか確認

## 関連ファイル

- `.cursorignore` - Cursor が無視するファイル・ディレクトリのパターン
- `.cursorrules` - Cursor AI 向けのルール定義
- `.gitignore` - Git が無視するファイル・ディレクトリのパターン

## 注意事項

- `.cursorignore` と `.gitignore` は別の目的で使用されます
  - `.cursorignore`: Cursor エディタがファイルを読み込まないようにする
  - `.gitignore`: Git がファイルを追跡しないようにする
- 両方に適切な設定を追加することを推奨します
