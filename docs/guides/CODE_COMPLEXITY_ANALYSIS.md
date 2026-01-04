# コード複雑度分析と改善案

## 分析目的

- データベースの構造、ゲストユーザーと登録ユーザーの違いをしっかり整理できた状態
- API側には、できる限りシンプルな情報を送り、各鑑定士の性格設定だけを守らせるようにしていく
- ややこしくなってしまっている箇所、重複してしまっている箇所の特定
- さらなる問題点の分析

---

## 1. ユーザータイプ判定の重複と複雑さ

### 問題点

#### 1.1 判定ロジックの分散

`if (user)` と `if (!user)` が**10箇所以上**で使用されている：

```typescript
// consult.ts:485 - ユーザー認証
if (body.userToken) { ... }

// consult.ts:547 - ゲストセッション管理
if (!user) { ... }

// consult.ts:571 - ゲストメッセージ数取得
if (!user && guestSessionId) { ... }

// consult.ts:586 - ゲストメッセージ制限チェック
if (!user && sanitizedGuestCount >= GUEST_MESSAGE_LIMIT) { ... }

// consult.ts:627 - 登録ユーザーの履歴取得
if (user) { ... }

// consult.ts:692 - ゲストユーザーの履歴取得
else { ... }

// consult.ts:731 - 守護神確認メッセージ
if (user?.guardian && user.guardian.trim() !== '' && characterId === 'kaede') { ... }

// consult.ts:760 - ユーザーメッセージ数の計算
if (!user) { ... }

// consult.ts:792 - ゲストモード時の最後のメッセージ
if (user && characterId === 'yukino') { ... }

// consult.ts:896 - 会話履歴の保存（登録ユーザー）
if (user) { ... }

// consult.ts:963 - 会話履歴の保存（ゲストユーザー）
else if (guestSessionId) { ... }
```

**問題**:
- 判定ロジックが分散しているため、一貫性が保たれにくい
- 新しい条件を追加する際、複数箇所を修正する必要がある
- バグが発生しやすい

---

#### 1.2 トークンが無効な場合の処理が不明確

```typescript
// consult.ts:485-530
if (body.userToken) {
  const tokenPayload = await verifyUserToken(body.userToken, env.AUTH_SECRET);
  if (!tokenPayload) {
    // ❌ エラーを返すが、ゲストユーザーとして処理を続行すべきかどうかが不明確
    return new Response(JSON.stringify({ needsRegistration: true, error: 'invalid user token' }));
  }
  
  const record = await env.DB.prepare('SELECT id, nickname, guardian FROM users WHERE id = ?')
    .bind(tokenPayload.userId)
    .first();
  
  if (!record) {
    // ❌ エラーを返すが、ゲストユーザーとして処理を続行すべきかどうかが不明確
    return new Response(JSON.stringify({ needsRegistration: true, error: 'user not found' }));
  }
  
  user = record;
}
```

**問題**:
- トークンが無効でも、ゲストユーザーとして処理を続行すべきかどうかが不明確
- エラーを返すと、APIが反応を間違える可能性がある

---

### 改善案

#### 改善案1: 明確な2択判定

```typescript
// 明確な2択判定
let userType: 'registered' | 'guest' = 'guest';
let user: UserRecord | null = null;
let guestSessionId: number | null = null;

// 登録ユーザーの判定（すべての条件を満たした場合のみ）
if (body.userToken) {
  const tokenPayload = await verifyUserToken(body.userToken, env.AUTH_SECRET);
  if (tokenPayload) {
    const record = await env.DB.prepare('SELECT id, nickname, guardian FROM users WHERE id = ?')
      .bind(tokenPayload.userId)
      .first<UserRecord>();
    
    if (record) {
      user = record;
      userType = 'registered'; // 明確に登録ユーザーとして設定
    }
  }
  // トークンが無効、またはユーザーが存在しない場合は、userType = 'guest'のまま
}

// ゲストユーザーの処理（登録ユーザーでない場合のみ）
if (userType === 'guest') {
  const guestMetadata = body.guestMetadata || {};
  guestSessionIdStr = guestMetadata.sessionId || null;
  guestSessionId = await getOrCreateGuestSession(env.DB, guestSessionIdStr, ipAddress, userAgent);
}

// 以降の処理で、userTypeを使用
if (userType === 'registered') {
  // 登録ユーザーの処理
} else {
  // ゲストユーザーの処理
}
```

**メリット**:
- ✅ 明確な2択: `userType`が`'registered'`または`'guest'`のどちらかになる
- ✅ 判定ロジックが1箇所に集約される
- ✅ トークンが無効でも、ゲストユーザーとして処理を続行できる

---

## 2. 重複した処理

### 問題点

#### 2.1 ゲストユーザーのメッセージ数チェックが重複

```typescript
// consult.ts:565-583 - ゲストメッセージ数の取得
if (!user && guestSessionId) {
  try {
    const totalCount = await getTotalGuestMessageCount(env.DB, guestSessionId);
    sanitizedGuestCount = totalCount;
  } catch (error) {
    // エラーが発生した場合はクライアントから送られてきた値を使用
  }
}

// consult.ts:586-616 - ゲストメッセージ制限チェック
if (!user && sanitizedGuestCount >= GUEST_MESSAGE_LIMIT) {
  // 登録促進メッセージを返す
  return new Response(JSON.stringify({ needsRegistration: true, ... }));
}
```

**問題**:
- ゲストユーザーのメッセージ数チェックが複数箇所で行われている
- ロジックが分散しているため、一貫性が保たれにくい

---

#### 2.2 会話履歴の取得処理が重複

```typescript
// consult.ts:627-691 - 登録ユーザーの履歴取得
if (user) {
  const historyResults = await env.DB.prepare(...)
    .bind(user.id, characterId)
    .all();
  
  const dbHistory = historyResults.results?.slice().reverse().map((row) => ({
    role: row.role,
    content: row.content || row.message || '',
    isGuestMessage: row.is_guest_message === 1,
  })) ?? [];
  
  // 履歴のマージ処理
  conversationHistory = [...sanitizedHistory, ...dbHistory];
}

// consult.ts:692-725 - ゲストユーザーの履歴取得
else {
  if (guestSessionId) {
    const guestHistoryResults = await env.DB.prepare(...)
      .bind(guestSessionId, characterId)
      .all();
    
    conversationHistory = guestHistoryResults.results?.slice().reverse().map((row) => ({
      role: row.role,
      content: row.content || row.message || '',
      isGuestMessage: true,
    })) ?? [];
  } else {
    conversationHistory = sanitizedHistory;
  }
}
```

**問題**:
- 登録ユーザーとゲストユーザーで、会話履歴の取得処理が重複している
- マッピング処理が重複している

---

#### 2.3 データベースへの保存処理が重複

```typescript
// consult.ts:896-960 - 登録ユーザーの会話履歴保存
if (user) {
  // 100件制限チェック
  const messageCountResult = await env.DB.prepare(...)
    .bind(user.id, characterId)
    .first();
  
  if (messageCount >= 100) {
    // 古いメッセージを削除
    await env.DB.prepare(...).run();
  }
  
  // ユーザーメッセージを保存
  try {
    await env.DB.prepare('INSERT INTO conversations (..., content, ...) VALUES (...)')
      .bind(user.id, characterId, trimmedMessage)
      .run();
  } catch {
    await env.DB.prepare('INSERT INTO conversations (..., content, ...) VALUES (...)')
      .bind(user.id, characterId, trimmedMessage)
      .run();
  }
  
  // アシスタントメッセージを保存
  try {
    await env.DB.prepare('INSERT INTO conversations (..., content, ...) VALUES (...)')
      .bind(user.id, characterId, responseMessage)
      .run();
  } catch {
    await env.DB.prepare('INSERT INTO conversations (..., content, ...) VALUES (...)')
      .bind(user.id, characterId, responseMessage)
      .run();
  }
}

// consult.ts:963-1041 - ゲストユーザーの会話履歴保存
else if (guestSessionId) {
  // 100件制限チェック
  const messageCountResult = await env.DB.prepare(...)
    .bind(guestSessionId, characterId)
    .first();
  
  if (messageCount >= 100) {
    // 古いメッセージを削除
    await env.DB.prepare(...).run();
  }
  
  // ユーザーメッセージを保存
  try {
    await env.DB.prepare('INSERT INTO conversations (..., content, ...) VALUES (...)')
      .bind(guestSessionId, characterId, trimmedMessage)
      .run();
  } catch {
    await env.DB.prepare('INSERT INTO conversations (..., content, ...) VALUES (...)')
      .bind(guestSessionId, characterId, trimmedMessage)
      .run();
  }
  
  // アシスタントメッセージを保存
  try {
    await env.DB.prepare('INSERT INTO conversations (..., content, ...) VALUES (...)')
      .bind(guestSessionId, characterId, responseMessage)
      .run();
  } catch {
    await env.DB.prepare('INSERT INTO conversations (..., content, ...) VALUES (...)')
      .bind(guestSessionId, characterId, responseMessage)
      .run();
  }
}
```

**問題**:
- 登録ユーザーとゲストユーザーで、データベースへの保存処理が重複している
- 100件制限チェック、メッセージ保存処理が重複している
- `try-catch`ブロックが重複している

---

### 改善案

#### 改善案1: 共通関数の作成

```typescript
// 会話履歴の取得（共通関数）
async function getConversationHistory(
  db: D1Database,
  userType: 'registered' | 'guest',
  userId: number,
  characterId: string
): Promise<ClientHistoryEntry[]> {
  if (userType === 'registered') {
    const historyResults = await db.prepare(
      `SELECT c.role, COALESCE(c.content, c.message) as content, c.is_guest_message
       FROM conversations c
       INNER JOIN users u ON c.user_id = u.id
       WHERE c.user_id = ? AND c.character_id = ? AND u.nickname IS NOT NULL
       ORDER BY COALESCE(c.timestamp, c.created_at) DESC
       LIMIT 20`
    )
      .bind(userId, characterId)
      .all();
    
    return historyResults.results?.slice().reverse().map((row) => ({
      role: row.role,
      content: row.content || row.message || '',
      isGuestMessage: row.is_guest_message === 1,
    })) ?? [];
  } else {
    const historyResults = await db.prepare(
      `SELECT c.role, COALESCE(c.content, c.message) as content, c.is_guest_message
       FROM conversations c
       INNER JOIN guest_sessions gs ON c.user_id = gs.id
       WHERE c.user_id = ? AND c.character_id = ? AND gs.session_id IS NOT NULL
       ORDER BY COALESCE(c.timestamp, c.created_at) DESC
       LIMIT 20`
    )
      .bind(userId, characterId)
      .all();
    
    return historyResults.results?.slice().reverse().map((row) => ({
      role: row.role,
      content: row.content || row.message || '',
      isGuestMessage: true,
    })) ?? [];
  }
}

// 会話履歴の保存（共通関数）
async function saveConversationHistory(
  db: D1Database,
  userType: 'registered' | 'guest',
  userId: number,
  characterId: string,
  userMessage: string,
  assistantMessage: string
): Promise<void> {
  // 100件制限チェック
  const messageCountResult = await db.prepare(
    userType === 'registered'
      ? `SELECT COUNT(*) as count FROM conversations WHERE user_id = ? AND character_id = ?`
      : `SELECT COUNT(*) as count 
         FROM conversations c
         INNER JOIN guest_sessions gs ON c.user_id = gs.id
         WHERE c.user_id = ? AND c.character_id = ? AND gs.session_id IS NOT NULL`
  )
    .bind(userId, characterId)
    .first<{ count: number }>();
  
  const messageCount = messageCountResult?.count || 0;
  
  if (messageCount >= 100) {
    const deleteCount = messageCount - 100 + 2;
    // 古いメッセージを削除
    await db.prepare(...).run();
  }
  
  // メッセージを保存
  const isGuestMessage = userType === 'guest' ? 1 : 0;
  
  try {
    await db.prepare(
      `INSERT INTO conversations (user_id, character_id, role, content, message_type, is_guest_message, timestamp)
       VALUES (?, ?, 'user', ?, 'normal', ?, CURRENT_TIMESTAMP)`
    )
      .bind(userId, characterId, userMessage, isGuestMessage)
      .run();
  } catch {
    await db.prepare(
      `INSERT INTO conversations (user_id, character_id, role, content, message_type, is_guest_message, created_at)
       VALUES (?, ?, 'user', ?, 'normal', ?, CURRENT_TIMESTAMP)`
    )
      .bind(userId, characterId, userMessage, isGuestMessage)
      .run();
  }
  
  try {
    await db.prepare(
      `INSERT INTO conversations (user_id, character_id, role, content, message_type, is_guest_message, timestamp)
       VALUES (?, ?, 'assistant', ?, 'normal', ?, CURRENT_TIMESTAMP)`
    )
      .bind(userId, characterId, assistantMessage, isGuestMessage)
      .run();
  } catch {
    await db.prepare(
      `INSERT INTO conversations (user_id, character_id, role, content, message_type, is_guest_message, created_at)
       VALUES (?, ?, 'assistant', ?, 'normal', ?, CURRENT_TIMESTAMP)`
    )
      .bind(userId, characterId, assistantMessage, isGuestMessage)
      .run();
  }
}
```

**メリット**:
- ✅ 重複コードを削減
- ✅ 一貫性が保たれる
- ✅ メンテナンスが容易になる

---

## 3. システムプロンプトへの情報過多

### 問題点

#### 3.1 システムプロンプトに多くの情報が含まれている

```typescript
// consult.ts:820-830
const systemPrompt = generateSystemPrompt(characterId, {
  needsRegistration: needsRegistration,
  userNickname: user?.nickname,
  hasPreviousConversation: conversationHistory.length > 0,
  conversationHistoryLength: conversationHistory.length,
  userMessageCount: userMessageCount,
  isRitualStart: isRitualStart,
  guardian: user?.guardian || null,
  isJustRegistered: isJustRegistered,
  lastGuestMessage: lastGuestMessage,
});
```

**問題**:
- システムプロンプトに多くの情報が含まれている
- 各鑑定士の性格設定以外の情報（needsRegistration、isRitualStart、guardian、isJustRegistered、lastGuestMessageなど）が混在している
- APIが反応を間違える可能性がある

---

#### 3.2 各鑑定士の性格設定以外の情報が混在

```typescript
// character-system.js:67-129
export function generateSystemPrompt(characterId, options = {}) {
  // ニックネームの指示
  const nicknameContext = options.userNickname ? ... : '';
  
  // 会話履歴の有無
  const conversationContext = options.hasPreviousConversation ? ... : '';
  
  // ゲストユーザー向けの指示
  const guestUserContext = !options.userNickname ? ... : '';
  
  // 守護神完了チェック
  const guardianRitualCompleted = ...;
  
  // 各鑑定士のプロンプト生成
  const promptGenerators = {
    kaede: generateKaedePrompt,
    yukino: generateYukinoPrompt,
    sora: generateSoraPrompt,
    kaon: generateKaonPrompt,
  };
  
  // 各鑑定士のプロンプトを生成
  const characterPrompt = promptGenerators[characterId]({
    userNickname: options.userNickname,
    hasPreviousConversation: options.hasPreviousConversation,
    nicknameContext,
    conversationContext,
    guestUserContext,
    // ... 多くのオプション
  });
  
  // 共通の安全ガイドラインを追加
  return `${characterPrompt}\n\n${COMMON_SAFETY_GUIDELINES}`;
}
```

**問題**:
- 各鑑定士の性格設定以外の情報が混在している
- システムプロンプトが複雑になっている
- APIが反応を間違える可能性がある

---

### 改善案

#### 改善案1: システムプロンプトをシンプルに

```typescript
// システムプロンプトをシンプルに
const systemPrompt = generateSystemPrompt(characterId, {
  // 最小限の情報のみ
  userNickname: user?.nickname,
  hasPreviousConversation: conversationHistory.length > 0,
  // 各鑑定士の性格設定だけを守らせる
});
```

**メリット**:
- ✅ システムプロンプトがシンプルになる
- ✅ 各鑑定士の性格設定だけを守らせることができる
- ✅ APIが反応を間違える可能性が低くなる

---

## 4. エラー処理の不統一

### 問題点

#### 4.1 トークンが無効な場合の処理が不明確

```typescript
// consult.ts:485-530
if (body.userToken) {
  const tokenPayload = await verifyUserToken(body.userToken, env.AUTH_SECRET);
  if (!tokenPayload) {
    // ❌ エラーを返すが、ゲストユーザーとして処理を続行すべきかどうかが不明確
    return new Response(JSON.stringify({ needsRegistration: true, error: 'invalid user token' }));
  }
  
  const record = await env.DB.prepare('SELECT id, nickname, guardian FROM users WHERE id = ?')
    .bind(tokenPayload.userId)
    .first();
  
  if (!record) {
    // ❌ エラーを返すが、ゲストユーザーとして処理を続行すべきかどうかが不明確
    return new Response(JSON.stringify({ needsRegistration: true, error: 'user not found' }));
  }
  
  user = record;
}
```

**問題**:
- トークンが無効でも、ゲストユーザーとして処理を続行すべきかどうかが不明確
- エラーを返すと、APIが反応を間違える可能性がある

---

### 改善案

#### 改善案1: エラー処理の統一

```typescript
// エラー処理を統一
let userType: 'registered' | 'guest' = 'guest';
let user: UserRecord | null = null;

// 登録ユーザーの判定（すべての条件を満たした場合のみ）
if (body.userToken) {
  const tokenPayload = await verifyUserToken(body.userToken, env.AUTH_SECRET);
  if (tokenPayload) {
    const record = await env.DB.prepare('SELECT id, nickname, guardian FROM users WHERE id = ?')
      .bind(tokenPayload.userId)
      .first<UserRecord>();
    
    if (record) {
      user = record;
      userType = 'registered';
    }
  }
  // トークンが無効、またはユーザーが存在しない場合は、userType = 'guest'のまま
  // エラーを返さず、ゲストユーザーとして処理を続行
}
```

**メリット**:
- ✅ エラー処理が統一される
- ✅ トークンが無効でも、ゲストユーザーとして処理を続行できる
- ✅ APIが反応を間違える可能性が低くなる

---

## 5. まとめ

### 主な問題点

1. **ユーザータイプ判定の重複と複雑さ**
   - `if (user)` と `if (!user)` が10箇所以上で使用されている
   - 判定ロジックが分散している
   - トークンが無効な場合の処理が不明確

2. **重複した処理**
   - ゲストユーザーのメッセージ数チェックが重複
   - 会話履歴の取得処理が重複
   - データベースへの保存処理が重複

3. **システムプロンプトへの情報過多**
   - システムプロンプトに多くの情報が含まれている
   - 各鑑定士の性格設定以外の情報が混在している

4. **エラー処理の不統一**
   - トークンが無効な場合の処理が不明確

### 改善案

1. **明確な2択判定**: `userType`変数を使用して、明確に`'registered'`または`'guest'`のどちらかになるようにする
2. **共通関数の作成**: 重複した処理を共通関数として抽出する
3. **システムプロンプトをシンプルに**: 各鑑定士の性格設定だけを守らせるようにする
4. **エラー処理の統一**: トークンが無効でも、ゲストユーザーとして処理を続行できるようにする
