# ユーザー情報のデータベース保存フロー

## 概要

このシステムでは、**統一ユーザーテーブル設計**により、ゲストユーザーと登録ユーザーが同じ`users`テーブルで管理されています。すべてのユーザーは、最初にゲストユーザーとして作成され、後から登録ユーザーに移行することができます。

## データベース構造

### usersテーブル

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,           -- 主キー（データベース内の一意識別子）
  nickname TEXT,                                  -- ニックネーム（登録ユーザーのみ）
  birth_year INTEGER,                             -- 生年（登録ユーザーのみ）
  birth_month INTEGER,                            -- 生月（登録ユーザーのみ）
  birth_day INTEGER,                              -- 生日（登録ユーザーのみ）
  passphrase TEXT,                                -- 合言葉（登録ユーザーのみ）
  guardian TEXT,                                  -- 守護神（登録ユーザーのみ）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- 作成日時
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- 更新日時
  user_type TEXT DEFAULT 'guest' NOT NULL,       -- ユーザータイプ: 'guest' | 'registered'
  ip_address TEXT,                                -- IPアドレス（ゲストユーザー用）
  session_id TEXT UNIQUE,                         -- セッションID（ゲストユーザー用、UUID形式）
  last_activity_at DATETIME                        -- 最終活動日時
);
```

### conversationsテーブル

```sql
CREATE TABLE conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,                       -- usersテーブルのidを参照
  character_id TEXT NOT NULL,                     -- 鑑定師ID: 'kaede' | 'yukino' | 'sora' | 'kaon'
  role TEXT NOT NULL,                             -- 役割: 'user' | 'assistant'
  message TEXT NOT NULL,                          -- メッセージ内容
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,   -- タイムスタンプ
  message_type TEXT DEFAULT 'normal',              -- メッセージタイプ
  is_guest_message BOOLEAN DEFAULT 0,            -- ゲストメッセージフラグ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 保存フロー

### 1. ゲストユーザーの作成（初回チャット時）

ユーザーが初めてチャットを開始すると、以下の流れでゲストユーザーが作成されます：

#### 1.1. フロントエンド（ブラウザ）

1. ユーザーがチャットページにアクセス
2. `sessionStorage`に`guestSessionId`（UUID形式）が生成・保存される
3. 最初のメッセージ送信時に、`guestMetadata.sessionId`としてAPIに送信

#### 1.2. バックエンド（`/api/consult`）

```typescript
// functions/api/consult.ts の onRequestPost 関数内

// 1. ユーザータイプの判定
let userType: 'registered' | 'guest' = 'guest';
let guestSessionId: number | null = null;

// 2. 登録ユーザーのチェック
if (body.userToken) {
  const tokenPayload = await verifyUserToken(body.userToken, env.AUTH_SECRET);
  if (tokenPayload) {
    const record = await env.DB.prepare('SELECT id, nickname, guardian FROM users WHERE id = ?')
      .bind(tokenPayload.userId)
      .first();
    if (record) {
      user = record;
      userType = 'registered';
    }
  }
}

// 3. ゲストユーザーの作成/取得
if (userType === 'guest') {
  const ipAddress = request.headers.get('CF-Connecting-IP');
  const userAgent = request.headers.get('User-Agent');
  const guestSessionIdStr = body.guestMetadata?.sessionId || null;
  
  guestSessionId = await getOrCreateGuestUser(env.DB, guestSessionIdStr, ipAddress, userAgent);
}
```

#### 1.3. `getOrCreateGuestUser`関数の処理

```typescript
async function getOrCreateGuestUser(
  db: D1Database,
  sessionId: string | null,
  ipAddress: string | null,
  userAgent: string | null
): Promise<number> {
  // 1. 既存のゲストユーザーを検索（session_idで検索）
  if (sessionId) {
    const existingUser = await db
      .prepare('SELECT id FROM users WHERE session_id = ? AND user_type = ?')
      .bind(sessionId, 'guest')
      .first<{ id: number }>();
    
    if (existingUser) {
      // 既存ユーザーの場合、最終活動日時を更新
      await db
        .prepare('UPDATE users SET last_activity_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(existingUser.id)
        .run();
      return existingUser.id;
    }
  }

  // 2. 新規ゲストユーザーを作成
  const newSessionId = sessionId || await generateGuestSessionId(ipAddress, userAgent);
  const result = await db
    .prepare('INSERT INTO users (user_type, ip_address, session_id, last_activity_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
    .bind('guest', ipAddress || null, newSessionId)
    .run();

  const guestUserId = result.meta?.last_row_id;
  if (!guestUserId || typeof guestUserId !== 'number') {
    throw new Error(`Failed to create guest user: last_row_id is ${guestUserId}`);
  }
  return guestUserId;
}
```

**保存されるデータ：**
- `user_type`: `'guest'`
- `ip_address`: Cloudflareから取得したIPアドレス
- `session_id`: フロントエンドから送信されたUUID、または自動生成されたUUID
- `last_activity_at`: 現在のタイムスタンプ
- `nickname`, `birth_year`, `birth_month`, `birth_day`, `passphrase`, `guardian`: `NULL`（未設定）

### 2. メッセージの保存（2段階保存）

メッセージは**2段階**で保存されます：

#### 2.1. 第1段階：ユーザーメッセージの保存（LLM応答前）

```typescript
// functions/api/consult.ts の onRequestPost 関数内

// ユーザーがメッセージを送信した直後に保存
if (!shouldClearChat && !isJustRegistered) {
  if (userType === 'registered' && user) {
    await saveUserMessage(env.DB, 'registered', user.id, characterId, trimmedMessage);
  } else if (userType === 'guest' && guestSessionId) {
    await saveUserMessage(env.DB, 'guest', guestSessionId, characterId, trimmedMessage);
  }
}
```

**`saveUserMessage`関数の処理：**

```typescript
async function saveUserMessage(
  db: D1Database,
  userType: 'registered' | 'guest',
  userId: number,
  characterId: string,
  userMessage: string
): Promise<void> {
  // 1. 100件制限チェックと古いメッセージの削除
  await checkAndCleanupOldMessages(db, userType, userId, characterId);

  // 2. ユーザーメッセージを保存
  const isGuestMessage = userType === 'guest' ? 1 : 0;
  await db.prepare(
    `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, timestamp)
     VALUES (?, ?, 'user', ?, 'normal', ?, CURRENT_TIMESTAMP)`
  )
    .bind(userId, characterId, userMessage, isGuestMessage)
    .run();
}
```

**保存されるデータ：**
- `user_id`: `users`テーブルの`id`（ゲストユーザーの場合は`guestSessionId`）
- `character_id`: 鑑定師ID（'kaede', 'yukino', 'sora', 'kaon'）
- `role`: `'user'`
- `message`: ユーザーが送信したメッセージ内容
- `is_guest_message`: ゲストユーザーの場合は`1`、登録ユーザーの場合は`0`
- `timestamp`: 現在のタイムスタンプ

#### 2.2. 第2段階：アシスタントメッセージの保存（LLM応答後）

```typescript
// functions/api/consult.ts の onRequestPost 関数内

// LLM APIを呼び出して応答を取得
const llmResult = await getLLMResponse({...});
const responseMessage = llmResult.message;

// LLM応答後にアシスタントメッセージを保存
if (!shouldClearChat && !isJustRegistered) {
  if (userType === 'registered' && user) {
    await saveAssistantMessage(env.DB, 'registered', user.id, characterId, responseMessage);
  } else if (userType === 'guest' && guestSessionId) {
    await saveAssistantMessage(env.DB, 'guest', guestSessionId, characterId, responseMessage);
  }
}
```

**`saveAssistantMessage`関数の処理：**

```typescript
async function saveAssistantMessage(
  db: D1Database,
  userType: 'registered' | 'guest',
  userId: number,
  characterId: string,
  assistantMessage: string
): Promise<void> {
  // 1. アシスタントメッセージの10件制限チェックと古いメッセージの削除
  const assistantMessageCount = await db.prepare(
    `SELECT COUNT(*) as count FROM conversations 
     WHERE user_id = ? AND character_id = ? AND role = 'assistant'`
  )
    .bind(userId, characterId)
    .first<{ count: number }>();

  if (assistantMessageCount.count >= 10) {
    // 古いアシスタントメッセージを削除（最新10件のみ保持）
    // ...
  }

  // 2. アシスタントメッセージを保存
  const isGuestMessage = userType === 'guest' ? 1 : 0;
  await db.prepare(
    `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, timestamp)
     VALUES (?, ?, 'assistant', ?, 'normal', ?, CURRENT_TIMESTAMP)`
  )
    .bind(userId, characterId, assistantMessage, isGuestMessage)
    .run();
}
```

**保存されるデータ：**
- `user_id`: `users`テーブルの`id`
- `character_id`: 鑑定師ID
- `role`: `'assistant'`
- `message`: LLMが生成した応答メッセージ
- `is_guest_message`: ゲストユーザーの場合は`1`、登録ユーザーの場合は`0`
- `timestamp`: 現在のタイムスタンプ

### 3. 登録ユーザーへの移行

ゲストユーザーがユーザー登録を行うと、既存のゲストユーザーレコードが更新されます：

#### 3.1. フロントエンド（ブラウザ）

1. ユーザーが登録フォームにニックネームと生年月日を入力
2. `sessionStorage`から`guestSessionId`を取得
3. `/api/auth/register`に`sessionId`を含めて送信

#### 3.2. バックエンド（`/api/auth/register`）

```typescript
// functions/api/auth/register.ts の onRequestPost 関数内

// 1. sessionIdが必須
if (!sessionId) {
  return new Response(
    JSON.stringify({ error: 'sessionId is required. ゲストユーザーとしてチャットに参加した後、登録してください。' }),
    { status: 400, headers }
  );
}

// 2. 既存のゲストユーザーを検索
const guestUser = await env.DB.prepare<{ id: number }>(
  'SELECT id FROM users WHERE session_id = ? AND user_type = ?'
)
  .bind(sessionId, 'guest')
  .first();

if (!guestUser) {
  return new Response(
    JSON.stringify({ error: 'ゲストユーザー情報が見つかりませんでした。チャットに参加してから再度登録してください。' }),
    { status: 404, headers }
  );
}

// 3. 既存のゲストユーザーを登録ユーザーに更新
await env.DB.prepare(
  `UPDATE users 
   SET user_type = 'registered',
       nickname = ?,
       birth_year = ?,
       birth_month = ?,
       birth_day = ?,
       passphrase = ?,
       updated_at = CURRENT_TIMESTAMP
   WHERE id = ? AND user_type = 'guest'`
)
  .bind(trimmedNickname, birthYear, birthMonth, birthDay, passphrase, guestUser.id)
  .run();
```

**更新されるデータ：**
- `user_type`: `'guest'` → `'registered'`
- `nickname`: 入力されたニックネーム
- `birth_year`, `birth_month`, `birth_day`: 入力された生年月日
- `passphrase`: 自動生成された合言葉
- `updated_at`: 現在のタイムスタンプ
- `ip_address`, `session_id`: そのまま保持（削除されない）
- `id`: **変更されない**（同じレコードが更新される）

## 重要なポイント

### 1. 統一ユーザーテーブル設計

- **すべてのユーザーは最初にゲストユーザーとして作成される**
- 登録時は新規レコードを作成せず、既存のゲストユーザーレコードを更新する
- `id`（主キー）は変更されないため、会話履歴との関連性が保たれる

### 2. 2段階保存の利点

- **ユーザーメッセージは即座に保存**されるため、LLM APIが失敗してもユーザーのメッセージは失われない
- **アシスタントメッセージはLLM応答後に保存**されるため、応答が生成された時点で保存される

### 3. メッセージ制限

- **ユーザーメッセージ**: 100件まで保存（古いメッセージは自動削除）
- **アシスタントメッセージ**: 最新10件のみ保持（古いメッセージは自動削除）

### 4. 識別子の役割

- **`id`**: データベース内の一意識別子（主キー、変更されない）
- **`session_id`**: ブラウザセッション識別子（UUID形式、ゲストユーザー用）
- **`userToken`**: 登録ユーザー認証用トークン（JWT形式）

## フロー図

```
[ユーザーがチャットを開始]
         ↓
[ゲストユーザーとしてusersテーブルに作成]
  - user_type = 'guest'
  - session_id = UUID
  - ip_address = IPアドレス
         ↓
[メッセージ送信]
         ↓
[ユーザーメッセージをconversationsテーブルに保存]
  - user_id = users.id
  - role = 'user'
  - is_guest_message = 1
         ↓
[LLM API呼び出し]
         ↓
[アシスタントメッセージをconversationsテーブルに保存]
  - user_id = users.id
  - role = 'assistant'
  - is_guest_message = 1
         ↓
[ユーザー登録]
         ↓
[既存のゲストユーザーレコードを更新]
  - user_type = 'guest' → 'registered'
  - nickname, birth_year, etc. を設定
  - idは変更されない（会話履歴との関連性が保たれる）
```

## エラーハンドリング

### ゲストユーザー作成エラー

- エラーが発生した場合、再試行（セッションIDなしで作成を試みる）
- 再試行も失敗した場合、`guestSessionId = null`となり、メッセージ保存はスキップされる
- ただし、LLM応答は返されるため、ユーザー体験は維持される

### メッセージ保存エラー

- `timestamp`カラムでの保存に失敗した場合、`created_at`カラムで再試行
- 再試行も失敗した場合、エラーをログに出力して再スロー
- 呼び出し元でエラーをキャッチし、LLM応答は返される（メッセージ保存は重要だが致命的ではない）
