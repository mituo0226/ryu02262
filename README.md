# 鑑定サイトプロジェクト

## ⚠️ 重要：開発を始める前に必ず確認

### 作業ディレクトリの確認

**このディレクトリで作業していますか？**
```
C:\Users\mituo\Desktop\kaede
```

**❌ ワークツリー (`C:\Users\mituo\.cursor\worktrees\kaede\*`) で作業しないでください！**

作業ディレクトリの確認方法、ワークツリー対策など、詳細は [WORKDIR_GUIDE.md](docs/guides/WORKDIR_GUIDE.md) を参照してください。

**クイック確認**:
```powershell
.\scripts\check-workdir.ps1
```

---

### ファイルの役割を理解する

各鑑定士には**2種類の設定ファイル**があります：

| ファイル | 役割 | 修正が必要な場合 |
|---------|------|----------------|
| `functions\_lib\characters\*.js` | **バックエンド**<br>AIの性格・話し方・プロンプト | AIの返答内容を変えたい |
| `public\js\features\*.js` | **フロントエンド**<br>UI・カード表示・動作 | ボタンやアニメーションを変えたい |

**詳細**: [FILE_STRUCTURE.md](docs/FILE_STRUCTURE.md) を参照

**開発ガイド**: [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) を参照

---

## プロジェクト構成

マッチングサイト内の鑑定サイトページを制作するプロジェクトです。

## 📋 制作ルール（重要）

### ページ制作の順序

1. **まず `public/index.html` で制作**
   - CSSファイル（`public/styles.css`）を使用して通常のWebサイトとして制作
   - Cloudflareなどでの独立公開を想定
   - レスポンシブ対応、モダンなデザインを実装

2. **その後、`index-no-css.html` でCSSなし版を制作**
   - `public/index.html` の内容をベースに変換
   - **すべてのスタイルをインラインスタイル（`style`属性）に変換**
   - `<style>`タグ、`<link rel="stylesheet">`、外部CSSファイルは使用禁止
   - マッチングサイト内システム用（CSSが使えない環境のため）

### 必須事項

- ✅ `public/index.html` を先に制作・更新する
- ✅ `index-no-css.html` は `public/index.html` の内容を基に作成
- ✅ CSSあり版を変更したら、必ずCSSなし版も同期して更新する
- ❌ `index-no-css.html` に `<style>` タグや外部CSSファイルの参照は禁止

## ファイル構成

```
kaede/
├── public/
│   ├── index.html      # CSSあり版（メイン）
│   ├── styles.css      # スタイルシート
│   ├── photo/          # 画像フォルダ
│   │   ├── rogo.png
│   │   ├── kaede.png
│   │   ├── kaon.png
│   │   ├── yukino.png
│   │   └── sora.png
│   └── noncss/
│       └── index.html  # 将来用（現在は使用していない）
├── index-no-css.html   # CSSなし版（ルートディレクトリ）
├── .cursorrules        # Cursor AI向けルール定義
└── README.md           # このファイル
```

## 鑑定士情報

- **楓（かえで）** - 1974年2月26日生まれ、大阪市生野区
- **香音（かおん）** - 1988年12月20日生まれ、神奈川県藤沢市
- **雪乃（ゆきの）** - 1998年8月1日生まれ、埼玉県所沢市
- **水野ソラ（みずの そら）** - 1977年4月10日生まれ、長野県松本市

## 技術仕様

### `public/index.html` (CSSあり版)
- 外部CSSファイル使用可能
- レスポンシブ対応
- モダンなデザイン
- Cloudflareで公開可能

### `index-no-css.html` (CSSなし版)
- インラインスタイルのみ
- CSS関連タグ禁止
- マッチングサイト内システム用
- 画像URLはシステム側でランダム化される想定

## ユーザー登録と会話履歴

- Cloudflare Pages Functions に以下の API を追加  
  - `POST /api/auth/register` : 新規登録（生年月日・ニックネーム＋神様割り当て）  
  - `POST /api/auth/login` : ログイン（登録情報で認証）  
  - `POST /api/consult` : DeepSeek 連携 + D1 会話履歴
- D1 データベース `DB` には `users` / `conversations` テーブルを用意
- 環境変数  
  - `DEEPSEEK_API_KEY`（既存）  
  - `AUTH_SECRET`（ユーザートークン署名用の任意文字列）
- フロントエンド  
  - `public/pages/auth/register.html` / `login.html`  
  - `public/pages/chat/chat-example.html` が `userToken` を必須チェックし、未ログイン時は登録画面へリダイレクト

## 管理者向け

- 画面: `public/pages/admin/dashboard.html`（マルチデバイス対応 UI）
- API
  - `GET/PUT/DELETE /api/admin/users`
  - `GET /api/admin/conversations`
- 追加環境変数
  - `ADMIN_TOKEN` : 管理者専用トークン。Cloudflare Pages ダッシュボード  
    `Settings > Functions > Add Variable` から `ADMIN_TOKEN` を追加し、任意の安全な値を設定してください。
  - 管理画面で同じトークンを入力するとユーザー情報・会話履歴の参照／編集／退会が行えます。

## 作業用フォルダーの管理

作業ディレクトリの確認、ワークツリーの禁止、`.wrangler` ディレクトリのクリーンアップなど、作業用フォルダーに関する詳細な情報は以下を参照してください：

**詳細ガイド**: [WORKDIR_GUIDE.md](docs/guides/WORKDIR_GUIDE.md)

### クイックリファレンス

- **作業ディレクトリ確認**: `.\scripts\check-workdir.ps1`
- **Wrangler クリーンアップ**: `.\scripts\auto-cleanup-wrangler-silent.ps1`
- **自動クリーンアップ設定**: `.\scripts\setup-auto-cleanup-task.ps1`

## 注意事項

- 画像パス: `photo/` フォルダを基準とした相対パス
- メールリンク: `/inquiry?cid={鑑定士ID}&from=list` 形式
- フッター: © 2025 守護神鑑定サイト
