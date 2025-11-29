# チャット画面の同期要件

## 重要な原則

**`chat-test.html`と`chat.html`は別々のチャット画面ではなく、同じチャット画面の簡易テスト版と本番版です。**

### 優先順位（重要）

**`chat.html`（本番版）が優先で会話の進行を行い、`chat-test.html`（テスト版）がそれを同期します。**

- `chat.html`: 本番環境のチャット画面（**メイン実装・優先**）
- `chat-test.html`: 本番環境のチャットの動きを簡易的に試験するために設置されたテスト版（**同期版**）

## 同期の必要性

### 必須同期項目

1. **API通信ロジック**
   - `/api/consult`へのリクエスト形式
   - レスポンスの処理方法
   - エラーハンドリング

2. **ユーザー認証・状態管理**
   - ゲストユーザーと登録ユーザーの判定
   - ユーザートークンの扱い
   - ユーザー情報の表示

3. **会話履歴管理**
   - ゲスト履歴のクリア処理
   - 会話履歴の読み込み・保存
   - 履歴の移行処理

4. **UI動作**
   - メッセージの表示方法
   - ユーザーステータスの表示
   - 登録ボタンの表示/非表示

5. **特殊機能**
   - 守護神の儀式の開始処理
   - 登録完了後の自動処理
   - フェーズ管理

### 変更時の手順（重要）

**基本方針: `chat.html`が優先で、`chat-test.html`がそれを同期する**

1. **本番環境（`chat.html`）を変更する場合（推奨）**
   - まず`chat.html`と関連するJavaScriptファイル（`chat-init.js`, `chat-api.js`, `chat-data.js`, `chat-ui.js`）を修正
   - **その後、`chat-test.html`を`chat.html`に合わせて同期する**
   - テスト環境で動作確認

2. **テスト環境（`chat-test.html`）で変更を試す場合**
   - テスト環境で動作確認後、**必ず本番環境（`chat.html`）に反映する**
   - その後、`chat-test.html`を`chat.html`に合わせて再同期する
   - テスト環境のみに変更を残さない

**重要**: `chat.html`が優先であり、すべての変更は`chat.html`から始めるべきです。`chat-test.html`は常に`chat.html`の動作を同期する形で維持してください。

## 現在の実装状況

### 共通ロジック（統合済み）

- **API通信**: `public/js/chat-api.js` - `ChatAPI.sendMessage()` を両環境で使用
  - テスト環境用オプション（`forceProvider`, `userToken`, `guestMetadata`）をサポート
- **本番環境**: `public/js/chat-init.js`, `public/js/chat-api.js`, `public/js/chat-data.js`, `public/js/chat-ui.js`
- **テスト環境**: `public/pages/admin/chat-test.html`
  - コアロジック（メッセージ送信、API通信）は共通の`ChatAPI.sendMessage()`を使用
  - テスト環境特有の機能（デバッグパネル、プロバイダー選択など）は`chat-test.html`内に実装

### 同期が必要な処理

1. **登録完了時の処理**
   - ゲスト履歴のクリア
   - 守護神の儀式の自動開始（カエデの場合）
   - ユーザー情報の表示

2. **会話履歴の管理**
   - ゲスト履歴の取得・クリア
   - 会話履歴の読み込み
   - 履歴の移行処理

3. **API通信**
   - メッセージ送信
   - エラーハンドリング
   - レスポンス処理

## 注意事項

⚠️ **重要**: `chat-test.html`と`chat.html`の動作が異なる場合、テスト環境での検証が意味をなさなくなります。

⚠️ **重要**: 本番環境の変更は必ずテスト環境にも反映し、テスト環境での変更も本番環境に反映してください。

## 統合の実現

### 実施済みの統合

1. **API通信の統合**
   - `chat-test.html`の`sendMessage()`関数と`startGuardianRitualInTest()`関数が、共通の`ChatAPI.sendMessage()`を使用するように変更
   - テスト環境用のオプション（`forceProvider`, `userToken`, `guestMetadata`）を`ChatAPI.sendMessage()`に追加
   - これにより、API通信ロジックは1つの関数に集約され、自動的に同期される

2. **外部ファイルの読み込み**
   - `chat-test.html`に`chat-api.js`を読み込むように追加
   - これにより、`chat-api.js`の変更が自動的に`chat-test.html`にも反映される

### 今後の改善案

将来的には、以下のロジックも共通化することを検討してください：
- 会話履歴管理（`ChatData`モジュールの使用）
- UI更新（`ChatUI`モジュールの使用）
- 初期化処理（`ChatInit`モジュールの使用）

ただし、テスト環境特有の機能（デバッグパネル、プロバイダー選択など）は`chat-test.html`内に残す必要があります。

