# 会話履歴保存条件の詳細

## 概要

`functions/api/consult.ts`の`saveConversationHistory`関数が呼び出される条件を整理します。

## 保存がスキップされる条件

### 1. `shouldClearChat === true`の場合
- **条件**: `body.ritualStart === true`（守護神の儀式開始時）
- **理由**: 儀式開始時はチャットをクリアするため、履歴を保存しない
- **影響**: 登録ユーザー・ゲストユーザー両方に適用

### 2. `isJustRegistered === true`の場合
- **条件**: `userType === 'registered' && body.migrateHistory === true`（登録直後）
- **理由**: 登録直後は、ゲスト履歴を移行する処理が別途行われるため、重複保存を避ける
- **影響**: 登録ユーザーのみに適用（ゲストユーザーには影響なし）

## 保存が実行される条件

### 登録ユーザーの場合

**必須条件**:
1. `!shouldClearChat` - 儀式開始時ではない
2. `!isJustRegistered` - 登録直後ではない
3. `userType === 'registered'` - 登録ユーザーとして判定されている
4. `user !== null` - ユーザーオブジェクトが存在する

**コード**:
```typescript
if (userType === 'registered' && user) {
  await saveConversationHistory(env.DB, 'registered', user.id, characterId, trimmedMessage, responseMessage);
}
```

### ゲストユーザーの場合

**必須条件**:
1. `!shouldClearChat` - 儀式開始時ではない（ゲストユーザーには通常適用されない）
2. `!isJustRegistered` - 登録直後ではない（ゲストユーザーには通常適用されない）
3. `userType === 'guest'` - ゲストユーザーとして判定されている

**保存パターン1: `guestSessionId`が存在する場合**
```typescript
if (guestSessionId) {
  await saveConversationHistory(env.DB, 'guest', guestSessionId, characterId, trimmedMessage, responseMessage);
}
```

**保存パターン2: `guestSessionId`が`null`の場合（再作成を試みる）**
```typescript
else {
  // 再作成を試みる
  const retryGuestSessionId = await getOrCreateGuestUser(env.DB, guestSessionIdStr, ipAddress, userAgent);
  await saveConversationHistory(env.DB, 'guest', retryGuestSessionId, characterId, trimmedMessage, responseMessage);
}
```

## 問題の可能性

### ゲストユーザーで履歴が保存されない原因

1. **`getOrCreateGuestUser`でエラーが発生**
   - `guestSessionId`が`null`のまま
   - 再作成も失敗する可能性

2. **`saveConversationHistory`でエラーが発生**
   - データベースエラー（カラム名の不一致など）
   - エラーがキャッチされてログに出力されるが、保存は失敗

3. **`shouldClearChat`または`isJustRegistered`が`true`**
   - ゲストユーザーには通常適用されないが、念のため確認

## 確認方法

### Cloudflareのログで確認すべきメッセージ

1. **ゲストユーザー作成成功**:
   ```
   [consult] ゲストユーザー: { guestUserId: <number>, sessionId: <string>, ipAddress: <string> }
   ```

2. **ゲストユーザー作成エラー**:
   ```
   [consult] ゲストユーザー作成エラー: <error>
   [consult] ゲストユーザー作成（再試行成功）: { guestUserId: <number>, ipAddress: <string> }
   ```

3. **履歴保存成功**:
   ```
   [consult] ゲストユーザーの会話履歴を保存しました: { guestSessionId: <number>, characterId: <string> }
   ```

4. **履歴保存エラー**:
   ```
   [consult] 会話履歴の保存エラー: { error: <string>, userType: 'guest', userId: <number>, characterId: <string> }
   ```

## 推奨される確認手順

1. Cloudflareのログで、`[consult] ゲストユーザー:`メッセージを確認
2. `guestUserId`が正しく取得されているか確認
3. `[consult] ゲストユーザーの会話履歴を保存しました`メッセージを確認
4. エラーメッセージがないか確認
