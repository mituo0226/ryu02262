# 2回目以降のゲストユーザーの扱い

## 概要

ユーザー登録をしていない状態で、2回目以降に訪れたゲストユーザーは、**既存のゲストユーザーレコードを再利用**されます。新しいレコードは作成されません。

## 識別方法

### 1. セッションID（session_id）による識別

ゲストユーザーは、**`session_id`（UUID形式）**で識別されます。

- **初回訪問時**: フロントエンドで`sessionStorage`に`guestSessionId`（UUID）が生成・保存される
- **2回目以降**: 同じブラウザセッション内では、`sessionStorage`に保存された`guestSessionId`が再利用される

### 2. データベースでの検索

```typescript
// functions/api/consult.ts の getOrCreateGuestUser 関数

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
      // 既存ユーザーが見つかった場合
      // - 新しいレコードは作成しない
      // - 既存のidを返す
      // - last_activity_atを更新
      await db
        .prepare('UPDATE users SET last_activity_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(existingUser.id)
        .run();
      return existingUser.id;
    }
  }

  // 2. 新規ゲストユーザーを作成（既存ユーザーが見つからなかった場合のみ）
  const newSessionId = sessionId || await generateGuestSessionId(ipAddress, userAgent);
  const result = await db
    .prepare('INSERT INTO users (user_type, ip_address, session_id, last_activity_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
    .bind('guest', ipAddress || null, newSessionId)
    .run();

  return result.meta?.last_row_id;
}
```

## フロー

### 2回目以降の訪問（同じブラウザセッション内）

```
[ユーザーがチャットページにアクセス]
         ↓
[sessionStorageからguestSessionIdを取得]
  - 1回目の訪問時に保存されたUUIDが残っている
         ↓
[ユーザーがメッセージを送信]
         ↓
[/api/consult に guestSessionId を送信]
         ↓
[getOrCreateGuestUser() が呼び出される]
         ↓
[データベースで既存ユーザーを検索]
  - SELECT id FROM users WHERE session_id = ? AND user_type = 'guest'
         ↓
[既存ユーザーが見つかった]
         ↓
[既存のidを使用]
  - 新しいレコードは作成されない
  - last_activity_at を更新
         ↓
[会話履歴を取得]
  - データベースから過去の会話履歴を取得
  - hasPreviousConversation = true として判定
         ↓
[「お帰りなさい」メッセージが表示される]
```

### 会話履歴の取得

```typescript
// functions/api/consult.ts の onRequestPost 関数内

if (userType === 'guest' && guestSessionId) {
  // ゲストユーザーの履歴取得
  const dbHistory = await getConversationHistory(env.DB, 'guest', guestSessionId, characterId);
  conversationHistory = dbHistory;
  dbHistoryOnly = dbHistory; // データベース履歴を保存
  
  // hasPreviousConversationの判定
  const hasPreviousConversation = dbHistoryOnly.length > 0;
  // → 過去の会話履歴があれば true
}
```

## 重要なポイント

### 1. 同じブラウザセッション内では同じユーザーとして扱われる

- `sessionStorage`はブラウザタブを閉じるまで保持される
- 同じタブで2回目以降にアクセスした場合、同じ`session_id`が使用される
- 既存のゲストユーザーレコードが再利用される

### 2. ブラウザを閉じた場合

- `sessionStorage`がクリアされる
- 次回アクセス時には新しい`guestSessionId`が生成される
- **新しいゲストユーザーとして扱われる**（既存のレコードは再利用されない）

### 3. 別のブラウザ/デバイスからアクセスした場合

- 異なる`session_id`が生成される
- **新しいゲストユーザーとして扱われる**
- 既存のゲストユーザーレコードは再利用されない

### 4. 会話履歴の継続

- 同じ`session_id`でアクセスした場合、過去の会話履歴が取得される
- `hasPreviousConversation = true`となり、「お帰りなさい」メッセージが表示される
- 異なる`session_id`でアクセスした場合、会話履歴は取得されない（初回訪問として扱われる）

## データベースの状態

### 初回訪問時

```sql
-- usersテーブル
id: 100
user_type: 'guest'
session_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
ip_address: '192.168.1.1'
created_at: '2026-01-04 10:00:00'
last_activity_at: '2026-01-04 10:00:00'
```

### 2回目以降の訪問（同じsession_id）

```sql
-- usersテーブル（既存レコードを更新）
id: 100  -- 同じid（変更されない）
user_type: 'guest'  -- 変更されない
session_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'  -- 同じsession_id
ip_address: '192.168.1.1'  -- 変更されない（IPアドレスが変わっても更新されない）
created_at: '2026-01-04 10:00:00'  -- 変更されない
last_activity_at: '2026-01-04 15:30:00'  -- 更新される（現在時刻）
```

**新しいレコードは作成されません。**

## 会話履歴の取得

2回目以降の訪問では、データベースから過去の会話履歴が取得されます：

```typescript
// functions/api/consult.ts の getConversationHistory 関数

async function getConversationHistory(
  db: D1Database,
  userType: 'registered' | 'guest',
  userId: number,
  characterId: string
): Promise<ClientHistoryEntry[]> {
  if (userType === 'guest') {
    // ゲストユーザーの履歴取得
    // 【ポジティブな指定】usersテーブルに存在し、user_type = 'guest'のユーザーのみを対象とする
    const result = await db
      .prepare<ConversationRow>(
        `SELECT c.role, c.message as content, c.is_guest_message
         FROM conversations c
         INNER JOIN users u ON c.user_id = u.id
         WHERE c.user_id = ? AND c.character_id = ? AND u.user_type = 'guest'
         ORDER BY COALESCE(c.timestamp, c.created_at) ASC`
      )
      .bind(userId, characterId)
      .all();
    
    return (result.results || []).map((row) => ({
      role: row.role,
      content: row.content || row.message || '',
      isGuestMessage: row.is_guest_message === 1,
    }));
  }
  // ...
}
```

## 制限事項

### sessionStorageの制約

- **ブラウザタブを閉じると`sessionStorage`がクリアされる**
- 次回アクセス時には新しい`session_id`が生成される
- 既存のゲストユーザーレコードは再利用されない

### 解決策（将来的な改善案）

もし、ブラウザを閉じても同じゲストユーザーとして識別したい場合は：

1. **`localStorage`を使用する**
   - `sessionStorage`の代わりに`localStorage`を使用
   - ブラウザを閉じても`guestSessionId`が保持される
   - ただし、プライベートブラウジングモードでは制限がある

2. **IPアドレス + User-Agent による識別**
   - `session_id`が取得できない場合、IPアドレスとUser-Agentで既存ユーザーを検索
   - ただし、同じネットワーク内の複数ユーザーを区別できない

3. **Cookieを使用する**
   - サーバー側でCookieを設定
   - ブラウザを閉じても保持される（有効期限を設定）

## 現在の実装の動作まとめ

| 状況 | 動作 |
|------|------|
| 同じブラウザタブで2回目以降にアクセス | 既存のゲストユーザーレコードを再利用<br>会話履歴を取得<br>「お帰りなさい」メッセージが表示される |
| ブラウザタブを閉じて再度アクセス | 新しい`session_id`が生成される<br>新しいゲストユーザーとして扱われる<br>会話履歴は取得されない |
| 別のブラウザ/デバイスからアクセス | 新しい`session_id`が生成される<br>新しいゲストユーザーとして扱われる<br>会話履歴は取得されない |
| ユーザー登録後 | 既存のゲストユーザーレコードが更新される<br>`user_type = 'guest'` → `'registered'`<br>会話履歴は引き継がれる |
