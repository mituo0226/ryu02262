# ユーザータイプ判定の分析と改善案

## 現状の問題点

### 現在の判定ロジック

```typescript
// consult.ts:485-530
if (body.userToken) {
  // userTokenが存在する場合
  const tokenPayload = await verifyUserToken(body.userToken, env.AUTH_SECRET);
  if (!tokenPayload) {
    // トークンが無効 → エラーを返す
    return new Response(JSON.stringify({ needsRegistration: true, error: 'invalid user token' }));
  }
  
  const record = await env.DB.prepare('SELECT id, nickname, guardian FROM users WHERE id = ?')
    .bind(tokenPayload.userId)
    .first();
  
  if (!record) {
    // ユーザーがデータベースに存在しない → エラーを返す
    return new Response(JSON.stringify({ needsRegistration: true, error: 'user not found' }));
  }
  
  user = record; // 登録ユーザーとして扱う
}

// consult.ts:547-563
if (!user) {
  // userが存在しない場合 → ゲストユーザーとして扱う
  const guestMetadata = body.guestMetadata || {};
  guestSessionIdStr = guestMetadata.sessionId || null;
  guestSessionId = await getOrCreateGuestSession(env.DB, guestSessionIdStr, ipAddress, userAgent);
}
```

### 問題点

1. **判定が複雑で、複数の条件をチェックしている**
   - `body.userToken`の存在チェック
   - トークンの有効性チェック
   - ユーザーの存在チェック
   - 各段階でエラーを返す可能性がある

2. **明確な2択（登録ユーザー or ゲストユーザー）になっていない**
   - トークンが無効な場合、エラーを返すが、ゲストユーザーとして扱うべきかどうかが不明確
   - ユーザーがデータベースに存在しない場合も同様

3. **APIが反応を間違える可能性**
   - トークンが無効でも、ゲストユーザーとして処理を続行すべきかどうかが不明確
   - 複数の条件分岐により、意図しない動作が発生する可能性がある

---

## 改善案：明確な2択判定

### 改善案1: データベース側で明確に判定

#### 判定ロジック

```typescript
// 1. userTokenが存在し、有効で、ユーザーがデータベースに存在する → 登録ユーザー
// 2. それ以外 → ゲストユーザー

let userType: 'registered' | 'guest' = 'guest';
let user: UserRecord | null = null;
let guestSessionId: number | null = null;

// 登録ユーザーの判定
if (body.userToken) {
  const tokenPayload = await verifyUserToken(body.userToken, env.AUTH_SECRET);
  if (tokenPayload) {
    const record = await env.DB.prepare('SELECT id, nickname, guardian FROM users WHERE id = ?')
      .bind(tokenPayload.userId)
      .first();
    
    if (record) {
      user = record;
      userType = 'registered'; // 明確に登録ユーザーとして設定
    }
  }
}

// ゲストユーザーの処理（登録ユーザーでない場合のみ）
if (userType === 'guest') {
  const guestMetadata = body.guestMetadata || {};
  guestSessionIdStr = guestMetadata.sessionId || null;
  guestSessionId = await getOrCreateGuestSession(env.DB, guestSessionIdStr, ipAddress, userAgent);
}
```

#### メリット

- ✅ **明確な2択**: `userType`が`'registered'`または`'guest'`のどちらかになる
- ✅ **シンプルな判定**: 条件が明確で、理解しやすい
- ✅ **エラー処理の明確化**: トークンが無効でも、ゲストユーザーとして処理を続行

---

### 改善案2: データベース側で判定結果を返す

#### 判定ロジック

```typescript
// データベース側で判定する関数
async function determineUserType(
  db: D1Database,
  userToken: string | undefined,
  authSecret: string
): Promise<{ type: 'registered' | 'guest'; user: UserRecord | null }> {
  if (!userToken) {
    return { type: 'guest', user: null };
  }
  
  const tokenPayload = await verifyUserToken(userToken, authSecret);
  if (!tokenPayload) {
    return { type: 'guest', user: null }; // トークンが無効でもゲストユーザーとして扱う
  }
  
  const user = await db.prepare('SELECT id, nickname, guardian FROM users WHERE id = ?')
    .bind(tokenPayload.userId)
    .first<UserRecord>();
  
  if (!user) {
    return { type: 'guest', user: null }; // ユーザーが存在しなくてもゲストユーザーとして扱う
  }
  
  return { type: 'registered', user };
}

// 使用例
const { type: userType, user } = await determineUserType(env.DB, body.userToken, env.AUTH_SECRET);

if (userType === 'registered') {
  // 登録ユーザーの処理
} else {
  // ゲストユーザーの処理
  const guestMetadata = body.guestMetadata || {};
  guestSessionIdStr = guestMetadata.sessionId || null;
  guestSessionId = await getOrCreateGuestSession(env.DB, guestSessionIdStr, ipAddress, userAgent);
}
```

#### メリット

- ✅ **判定ロジックの分離**: 判定ロジックを関数として分離し、再利用可能
- ✅ **明確な戻り値**: `type`が`'registered'`または`'guest'`のどちらかになる
- ✅ **エラー処理の統一**: トークンが無効でも、ユーザーが存在しなくても、ゲストユーザーとして扱う

---

### 改善案3: フラグベースの判定

#### 判定ロジック

```typescript
// 明確なフラグを設定
let isRegisteredUser = false;
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
      isRegisteredUser = true; // 明確に登録ユーザーとして設定
    }
  }
}

// ゲストユーザーの処理（登録ユーザーでない場合のみ）
if (!isRegisteredUser) {
  const guestMetadata = body.guestMetadata || {};
  guestSessionIdStr = guestMetadata.sessionId || null;
  guestSessionId = await getOrCreateGuestSession(env.DB, guestSessionIdStr, ipAddress, userAgent);
}

// 以降の処理で、isRegisteredUserフラグを使用
if (isRegisteredUser) {
  // 登録ユーザーの処理
} else {
  // ゲストユーザーの処理
}
```

#### メリット

- ✅ **明確なフラグ**: `isRegisteredUser`が`true`または`false`のどちらかになる
- ✅ **シンプルな判定**: 条件が明確で、理解しやすい
- ✅ **エラー処理の明確化**: トークンが無効でも、ゲストユーザーとして処理を続行

---

## 推奨改善案

### 推奨: 改善案1（`userType`変数を使用）

**理由**:
1. **明確な2択**: `userType`が`'registered'`または`'guest'`のどちらかになる
2. **シンプルな判定**: 条件が明確で、理解しやすい
3. **エラー処理の明確化**: トークンが無効でも、ゲストユーザーとして処理を続行
4. **コードの可読性**: `if (userType === 'registered')`のように、意図が明確

---

## 実装例

### 現在のコード（問題あり）

```typescript
// 現在のコード
if (body.userToken) {
  const tokenPayload = await verifyUserToken(body.userToken, env.AUTH_SECRET);
  if (!tokenPayload) {
    return new Response(JSON.stringify({ needsRegistration: true, error: 'invalid user token' }));
  }
  
  const record = await env.DB.prepare('SELECT id, nickname, guardian FROM users WHERE id = ?')
    .bind(tokenPayload.userId)
    .first();
  
  if (!record) {
    return new Response(JSON.stringify({ needsRegistration: true, error: 'user not found' }));
  }
  
  user = record;
}

if (!user) {
  // ゲストユーザーの処理
}
```

### 改善後のコード（推奨）

```typescript
// 改善後のコード
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
  console.log('[consult] 登録ユーザー:', user.id);
} else {
  // ゲストユーザーの処理
  console.log('[consult] ゲストユーザー:', guestSessionId);
}
```

---

## まとめ

### 現在の問題点

1. **判定が複雑**: 複数の条件をチェックし、各段階でエラーを返す可能性がある
2. **明確な2択になっていない**: トークンが無効な場合、ゲストユーザーとして扱うべきかどうかが不明確
3. **APIが反応を間違える可能性**: 複数の条件分岐により、意図しない動作が発生する可能性がある

### 改善案

1. **`userType`変数を使用**: `'registered'`または`'guest'`のどちらかになる
2. **シンプルな判定**: 条件が明確で、理解しやすい
3. **エラー処理の明確化**: トークンが無効でも、ゲストユーザーとして処理を続行

### 実装のポイント

- ✅ **明確な2択**: `userType`が`'registered'`または`'guest'`のどちらかになる
- ✅ **シンプルな判定**: 条件が明確で、理解しやすい
- ✅ **エラー処理の統一**: トークンが無効でも、ユーザーが存在しなくても、ゲストユーザーとして扱う
