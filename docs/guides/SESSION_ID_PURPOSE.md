# `guest_sessions.session_id`の存在意義

## 概要

`guest_sessions.session_id`は、**クライアント（ブラウザ）とサーバー間で共有される識別子**として存在しています。

---

## なぜ`session_id`が必要なのか？

### 問題: `guest_sessions.id`だけでは不十分な理由

`guest_sessions.id`は**データベース内部でのみ使用される数値の主キー**です。

**問題点**:
1. クライアント（ブラウザ）は、データベースの主キー（数値）を知らない
2. クライアントがサーバーに「このセッションの履歴を取得して」とリクエストする際、数値のIDを送信できない
3. データベースの主キーは、セキュリティ上の理由から外部に公開すべきではない

### 解決策: `session_id`（文字列の一意識別子）

`session_id`は、**クライアントとサーバー間で共有される文字列の識別子**です。

**利点**:
1. クライアント（ブラウザ）が`sessionStorage`に保存できる
2. クライアントがサーバーに送信できる
3. サーバー側で`session_id`を使って既存のセッションを検索できる

---

## `session_id`の役割

### 1. クライアント側での保存

```javascript
// public/js/chat-engine.js
// サーバーから返されたsession_idをsessionStorageに保存
if (isGuest && response.guestSessionId) {
    sessionStorage.setItem('guestSessionId', response.guestSessionId);
    console.log('[ChatEngine] ゲストセッションIDを保存しました:', response.guestSessionId);
}
```

**役割**: ブラウザの`sessionStorage`に保存され、次回のリクエストで使用される

---

### 2. クライアント側での送信

```javascript
// public/js/chat-engine.js
// サーバーに送信する際にsession_idを含める
let guestSessionId = null;
if (isGuest) {
    guestSessionId = sessionStorage.getItem('guestSessionId');
}
const options = {
    guestMetadata: isGuest ? { 
        messageCount: messageCountForAPI,
        sessionId: guestSessionId || undefined  // session_idを送信
    } : undefined
};
```

**役割**: サーバーに「このセッションの履歴を取得して」とリクエストする際に使用

---

### 3. サーバー側での検索

```typescript
// functions/api/consult.ts
async function getOrCreateGuestSession(
  db: D1Database,
  sessionId: string | null,  // クライアントから送信されたsession_id
  ipAddress: string | null,
  userAgent: string | null
): Promise<number> {
  if (sessionId) {
    // session_idを使って既存のセッションを検索
    const existingSession = await db
      .prepare('SELECT id FROM guest_sessions WHERE session_id = ?')
      .bind(sessionId)
      .first<{ id: number }>();
    
    if (existingSession) {
      // 既存のセッションが見つかった場合、そのid（数値の主キー）を返す
      return existingSession.id;
    }
  }
  
  // 新しいセッションを作成
  const newSessionId = sessionId || await generateGuestSessionId(ipAddress, userAgent);
  const result = await db
    .prepare('INSERT INTO guest_sessions (session_id, ip_address, user_agent) VALUES (?, ?, ?)')
    .bind(newSessionId, ipAddress || null, userAgent || null)
    .run();
  
  return result.meta?.last_row_id;  // 新しく作成されたid（数値の主キー）を返す
}
```

**役割**: 
1. クライアントから送信された`session_id`を使って既存のセッションを検索
2. 既存のセッションが見つかった場合、その`id`（数値の主キー）を返す
3. 見つからなかった場合、新しいセッションを作成して`id`（数値の主キー）を返す

---

## `session_id`と`id`の違い

### `guest_sessions.id`（数値の主キー）

| 特徴 | 説明 |
|------|------|
| **型** | 数値（INTEGER） |
| **用途** | データベース内部でのみ使用 |
| **公開** | クライアントには公開しない |
| **使用箇所** | `conversations.user_id`として保存 |

**例**: `id = 456`

---

### `guest_sessions.session_id`（文字列の一意識別子）

| 特徴 | 説明 |
|------|------|
| **型** | 文字列（TEXT） |
| **用途** | クライアントとサーバー間で共有 |
| **公開** | クライアントに公開される |
| **使用箇所** | ブラウザの`sessionStorage`に保存、サーバーへのリクエストで送信 |

**例**: `session_id = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"`（32文字のハッシュ）

---

## データフロー図

### 初回アクセス時

```
┌──────────────┐
│ ブラウザ      │
│ (ゲスト)      │
└──────┬───────┘
       │
       │ 1. メッセージ送信（session_idなし）
       ▼
┌─────────────────┐
│ サーバー         │
│ consult.ts      │
└──────┬──────────┘
       │
       │ 2. session_idを生成
       │    generateGuestSessionId()
       │    → "a1b2c3d4..."（32文字のハッシュ）
       ▼
┌─────────────────────────┐
│ guest_sessions テーブル   │
│ id: 456                  │ ← 数値の主キー（DB内部）
│ session_id: "a1b2c3d4..."│ ← 文字列の識別子（クライアント共有）
└──────┬──────────────────┘
       │
       │ 3. session_idをクライアントに返す
       ▼
┌──────────────┐
│ ブラウザ      │
│ sessionStorage│
│ guestSessionId│
│ = "a1b2c3d4..."│ ← 保存される
└──────────────┘
```

---

### 2回目以降のアクセス時

```
┌──────────────┐
│ ブラウザ      │
│ sessionStorage│
│ guestSessionId│
│ = "a1b2c3d4..."│
└──────┬───────┘
       │
       │ 1. メッセージ送信（session_id = "a1b2c3d4..."を含む）
       ▼
┌─────────────────┐
│ サーバー         │
│ consult.ts      │
│ getOrCreateGuestSession()│
└──────┬──────────┘
       │
       │ 2. session_idで既存セッションを検索
       │    SELECT id FROM guest_sessions WHERE session_id = "a1b2c3d4..."
       │    → id = 456 が見つかる
       ▼
┌─────────────────────────┐
│ guest_sessions テーブル   │
│ id: 456                  │ ← 既存のセッション
│ session_id: "a1b2c3d4..."│
└──────┬──────────────────┘
       │
       │ 3. id = 456 を使って会話履歴を保存
       ▼
┌─────────────────────────┐
│ conversations テーブル   │
│ user_id: 456            │ ← guest_sessions.id を参照
└─────────────────────────┘
```

---

## なぜ`session_id`が文字列なのか？

### 1. ブラウザの`sessionStorage`に保存できる

```javascript
// 数値は文字列に変換されるが、意図的に文字列として扱う
sessionStorage.setItem('guestSessionId', 'a1b2c3d4...');  // ✅ 文字列
sessionStorage.setItem('guestSessionId', 456);  // ❌ 数値（文字列に変換されるが、意図的ではない）
```

### 2. セキュリティ上の理由

- 数値のIDは推測されやすい（1, 2, 3, ...）
- 文字列のハッシュは推測されにくい（32文字のランダムな文字列）

### 3. 一意性の保証

- ハッシュ関数（SHA-256）を使用して、IPアドレス、User-Agent、タイムスタンプから生成
- 同じIPアドレスとUser-Agentでも、タイムスタンプが異なれば異なる`session_id`が生成される

---

## まとめ

### `guest_sessions.session_id`の存在意義

1. **クライアントとサーバー間で共有される識別子**
   - ブラウザの`sessionStorage`に保存される
   - サーバーへのリクエストで送信される

2. **既存セッションの検索に使用**
   - サーバー側で`session_id`を使って既存のセッションを検索
   - 見つかった場合、その`id`（数値の主キー）を返す

3. **セキュリティと一意性の確保**
   - 文字列のハッシュとして生成されるため、推測されにくい
   - IPアドレス、User-Agent、タイムスタンプから生成されるため、一意性が保証される

### `session_id`と`id`の使い分け

| 項目 | `guest_sessions.id` | `guest_sessions.session_id` |
|------|---------------------|----------------------------|
| **型** | 数値（INTEGER） | 文字列（TEXT） |
| **用途** | データベース内部 | クライアントとサーバー間 |
| **公開** | 非公開 | 公開 |
| **使用箇所** | `conversations.user_id` | ブラウザの`sessionStorage`、サーバーへのリクエスト |

---

## 結論

`guest_sessions.session_id`は、**クライアント（ブラウザ）とサーバー間で共有される識別子**として存在しています。

`guest_sessions.id`（数値の主キー）だけでは、クライアントがサーバーに「このセッションの履歴を取得して」とリクエストする際に使用できないため、`session_id`（文字列の一意識別子）が必要です。
