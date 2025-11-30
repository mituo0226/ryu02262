# データファイル説明

このディレクトリには、チャットシステムの設定とデータが保存されています。

## ファイル一覧

### `characters.json`
鑑定士の基本情報（名前、プロフィール、メッセージテンプレートなど）を定義します。

### `chat-behavior-config.json`
ゲストチャットHTMLとチャットHTMLの挙動の違い、各鑑定士の行動イベントを定義します。

## chat-behavior-config.json の構造

### chatTypes
ゲストチャットと登録ユーザーチャットの挙動の違いを定義します。

- **guest**: ゲストチャットHTML（`guest-chat.html`）の挙動
  - メッセージ制限: 10通まで
  - フェーズ管理: Kaedeのみ有効（フェーズ1-5）
  - ログインモーダル: なし
  - 守護神表示: なし

- **registered**: 登録ユーザーチャット（`chat.html`）の挙動
  - メッセージ制限: なし（無制限）
  - フェーズ管理: なし
  - ログインモーダル: あり
  - 守護神表示: あり
  - 守護神の儀式: Kaedeの場合、自動開始・必須

### characterEvents
各鑑定士の行動イベントを定義します。

#### kaede（楓）
- **guestChat**: ゲストチャットでの挙動
  - フェーズ1-5の管理
  - 守護神の儀式への同意（フェーズ4）
  
- **registeredChat**: 登録ユーザーチャットでの挙動
  - 守護神の儀式の自動開始
  - 守護神が決定するまで会話ブロック

#### その他の鑑定士
- 現在は特別なイベントなし

### guestHistoryManagement
ゲストユーザーの会話履歴の管理方法を定義します。

- 保存場所: sessionStorage
- データベース: user_id = 0 で保存
- 最大メッセージ数: 各鑑定士につき10通まで
- 移行: 登録完了時に登録ユーザーの履歴に移行し、ゲスト履歴を削除

### apiBehavior
API側の挙動を定義します。

- ゲストユーザー: フェーズ管理有効（Kaedeのみ）、メッセージ制限10通
- 登録ユーザー: フェーズ管理なし、メッセージ制限なし、守護神の儀式必須（Kaedeのみ）
- 登録ユーザーの会話履歴管理:
  - 最新10通のみ保存（10通を超える古いメッセージは削除）
  - 100通までの会話内容からプロフィール情報を抽出して記憶（圧縮された記憶）
  - プロフィール情報は`users.conversation_profile`カラムに保存
  - 最新10通の会話履歴と合わせて、会話の継続性を保つために使用

## 使用方法

### フロントエンド（JavaScript）
```javascript
// 設定を読み込む
await ChatData.loadBehaviorConfig();

// 現在のチャットタイプを取得
const chatType = ChatData.getChatType(); // 'guest' または 'registered'

// チャットタイプの設定を取得
const config = ChatData.getChatTypeConfig();

// キャラクターのイベント設定を取得
const events = ChatData.getCharacterEvents('kaede');

// フェーズ管理が有効かどうかを確認
const isPhaseEnabled = ChatData.isPhaseManagementEnabled('kaede');

// 守護神の儀式が必要かどうかを確認
const isRitualRequired = ChatData.isGuardianRitualRequired('kaede');
```

### API側（TypeScript）
```typescript
// 設定定数を参照
const guestLimit = GUEST_MESSAGE_LIMIT; // 10
const chatConfig = CHAT_BEHAVIOR_CONFIG;
const characterEvents = CHARACTER_EVENTS;
```

## 更新時の注意

- 設定ファイルを変更した場合、フロントエンドとAPI側の両方を確認してください
- API側の定数（`CHAT_BEHAVIOR_CONFIG`、`CHARACTER_EVENTS`）は、設定ファイルと同期を保つ必要があります
- 設定の変更は、既存の動作に影響を与える可能性があるため、慎重に行ってください

