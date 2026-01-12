# データベースの会話履歴から鑑定士ごとの初回/再訪問を判断できるかの確認

## 質問

データベースの会話履歴からユーザーがどの鑑定士と会話したかを判断して、チャットに入ったときにその鑑定士が初めて会話する人なのか、過去に会話をしたことがある人なのかを判断させることは現在の設定で可能なのかどうかを確認。

## 1. データベース構造の確認

### conversationsテーブルの構造（current-schema.mdより）

| カラム名 | 型 | NOT NULL | 説明 |
|---------|-----|---------|------|
| id | INTEGER | 0 | PRIMARY KEY |
| user_id | INTEGER | 1 | ユーザーID（usersテーブル参照） |
| character_id | TEXT | 1 | 鑑定士ID（'kaede' | 'yukino' | 'sora' | 'kaon'） |
| role | TEXT | 1 | メッセージの役割（'user' | 'assistant'） |
| message | TEXT | 1 | メッセージ内容 |
| created_at | TEXT | 1 | 作成日時 |
| timestamp | DATETIME | 0 | タイムスタンプ |
| message_type | TEXT | 0 | メッセージタイプ（'normal' | 'system' | 'warning'） |
| is_guest_message | INTEGER | 0 | ゲストメッセージフラグ（使用しない） |

**重要なカラム**:
- ✅ `user_id`: ユーザーを識別
- ✅ `character_id`: 鑑定士を識別（'kaede' | 'yukino' | 'sora' | 'kaon'）
- ✅ `role`: メッセージの役割（'user' | 'assistant'）

### インデックス

- `idx_conversations_user_character_timestamp`: `(user_id, character_id, timestamp DESC)`
- `idx_conversations_user_character`: `(user_id, character_id)`

**結論**: `user_id`と`character_id`の組み合わせで、特定のユーザーが特定の鑑定士と会話した履歴を検索できます。

## 2. conversation-history.ts APIの確認

### 現在の実装

```typescript
// nickname + 生年月日からuser_idを解決
const user = await env.DB.prepare<UserRecord>(
  'SELECT id, nickname, birth_year, birth_month, birth_day, guardian FROM users WHERE nickname = ? AND birth_year = ? AND birth_month = ? AND birth_day = ?'
)
  .bind(nickname.trim(), Number(birthYear), Number(birthMonth), Number(birthDay))
  .first();

// ユーザーの会話履歴取得
const historyResults = await env.DB.prepare<ConversationRow>(
  `SELECT c.role, c.message as content, COALESCE(c.timestamp, c.created_at) as created_at
   FROM conversations c
   WHERE c.user_id = ? AND c.character_id = ?
   ORDER BY COALESCE(c.timestamp, c.created_at) ASC
   LIMIT 100`
)
  .bind(user.id, characterId)
  .all();

const conversations = historyResults.results || [];

// hasHistoryの判定
if (conversations.length === 0) {
  return new Response(
    JSON.stringify({
      hasHistory: false,  // 会話履歴がない = 初めて会話する人
      nickname: user.nickname,
      birthYear: user.birth_year,
      birthMonth: user.birth_month,
      birthDay: user.birth_day,
      assignedDeity: user.guardian,
      clearChat: isAfterRitual,
    } as ResponseBody),
    { status: 200, headers: corsHeaders }
  );
}

// 会話履歴がある場合
return new Response(
  JSON.stringify({
    hasHistory: true,  // 会話履歴がある = 過去に会話をしたことがある人
    nickname: user.nickname,
    birthYear: user.birth_year,
    birthMonth: user.birth_month,
    birthDay: user.birth_day,
    assignedDeity: user.guardian,
    lastConversationDate,
    recentMessages,
    conversationSummary: conversationText,
    clearChat: isAfterRitual,
    firstQuestion: firstQuestion,
  } as ResponseBody),
  { status: 200, headers: corsHeaders }
);
```

### APIの動作

1. **ユーザーの識別**: `nickname` + `birth_year` + `birth_month` + `birth_day`でユーザーを特定
2. **会話履歴の取得**: `user_id` + `character_id`で会話履歴を検索
3. **`hasHistory`の判定**:
   - `conversations.length === 0` → `hasHistory: false`（初めて会話する人）
   - `conversations.length > 0` → `hasHistory: true`（過去に会話をしたことがある人）

### APIのパラメータ

```typescript
GET /api/conversation-history?nickname=XXX&birthYear=YYYY&birthMonth=MM&birthDay=DD&character=kaede
```

- `nickname`: ユーザーのニックネーム
- `birthYear`: 生年
- `birthMonth`: 生月
- `birthDay`: 生日
- `character`: 鑑定士ID（'kaede' | 'yukino' | 'sora' | 'kaon'）

**結論**: APIは、特定のユーザーが特定の鑑定士と会話した履歴を取得し、`hasHistory`フラグで初回/再訪問を判定しています。

## 3. 現在の設定での判断の可能性

### ✅ 可能

**現在の設定で、データベースの会話履歴からユーザーがどの鑑定士と会話したかを判断して、チャットに入ったときにその鑑定士が初めて会話する人なのか、過去に会話をしたことがある人なのかを判断することは可能です。**

### 理由

1. **データベース構造**:
   - `conversations`テーブルに`user_id`と`character_id`のカラムが存在
   - `user_id`と`character_id`の組み合わせで、特定のユーザーが特定の鑑定士と会話した履歴を検索可能

2. **APIの実装**:
   - `conversation-history.ts` APIは、`user_id` + `character_id`で会話履歴を検索
   - `hasHistory`フラグで初回/再訪問を判定

3. **インデックス**:
   - `idx_conversations_user_character_timestamp`と`idx_conversations_user_character`のインデックスが存在
   - 効率的に会話履歴を検索可能

### 判断方法

1. **ユーザーの識別**: `nickname` + `birth_year` + `birth_month` + `birth_day`でユーザーを特定
2. **会話履歴の取得**: `conversation-history.ts` APIを呼び出し、`character`パラメータで鑑定士IDを指定
3. **`hasHistory`の判定**:
   - `hasHistory: false` → 初めて会話する人
   - `hasHistory: true` → 過去に会話をしたことがある人

## 4. 実際の使用例

### フロントエンドでの使用

```javascript
// チャット画面に入ったとき
const characterId = 'kaede'; // 現在の鑑定士ID
const nickname = ChatData.userNickname;
const birthYear = ChatData.userBirthYear;
const birthMonth = ChatData.userBirthMonth;
const birthDay = ChatData.userBirthDay;

// conversation-history.ts APIを呼び出し
const historyData = await ChatAPI.loadConversationHistory(characterId);

// hasHistoryで判定
if (historyData.hasHistory) {
  // 過去に会話をしたことがある人
  // 再訪問メッセージを表示
} else {
  // 初めて会話する人
  // 初回メッセージを表示
}
```

### APIの呼び出し例

```
GET /api/conversation-history?nickname=光雄&birthYear=1962&birthMonth=2&birthDay=26&character=kaede
```

**レスポンス**:
```json
{
  "hasHistory": false,  // 初めて会話する人
  "nickname": "光雄",
  "birthYear": 1962,
  "birthMonth": 2,
  "birthDay": 26,
  "assignedDeity": null,
  "clearChat": false
}
```

または

```json
{
  "hasHistory": true,  // 過去に会話をしたことがある人
  "nickname": "光雄",
  "birthYear": 1962,
  "birthMonth": 2,
  "birthDay": 26,
  "assignedDeity": "天照大神",
  "lastConversationDate": "2025-01-15T10:30:00Z",
  "recentMessages": [...],
  "conversationSummary": "...",
  "clearChat": false,
  "firstQuestion": "..."
}
```

## 5. 結論

### ✅ 現在の設定で可能

**データベースの会話履歴からユーザーがどの鑑定士と会話したかを判断して、チャットに入ったときにその鑑定士が初めて会話する人なのか、過去に会話をしたことがある人なのかを判断することは、現在の設定で可能です。**

### 判断方法

1. **データベース構造**: `conversations`テーブルに`user_id`と`character_id`のカラムが存在
2. **API**: `conversation-history.ts` APIが`hasHistory`フラグを返す
3. **判断**: `hasHistory: false` = 初めて会話する人、`hasHistory: true` = 過去に会話をしたことがある人

### 追加の変更は不要

- データベーススキーマの変更は不要
- APIの変更は不要
- フロントエンドで`hasHistory`フラグを使用するのみ
