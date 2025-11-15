# 鑑定サイトプロジェクト

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

## 注意事項

- 画像パス: `photo/` フォルダを基準とした相対パス
- メールリンク: `/inquiry?cid={鑑定士ID}&from=list` 形式
- フッター: © 2025 守護神鑑定サイト
