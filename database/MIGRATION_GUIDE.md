# 統一ユーザーテーブル設計への移行ガイド

## 概要

このガイドは、`guest_sessions`テーブルを廃止し、`users`テーブルに統合するための移行手順を説明します。

## 移行前の準備

### 1. データベースのバックアップ

**重要**: 移行前に必ずデータベースのバックアップを取得してください。

Cloudflare D1のバックアップ方法：
```bash
# ローカル環境でD1データベースをエクスポート
npx wrangler d1 execute DB --local --file=backup.sql
```

### 2. 現在のデータベース状態の確認

以下のクエリで現在の状態を確認してください：

```sql
-- 登録ユーザーの数
SELECT COUNT(*) as registered_users FROM users;

-- ゲストセッションの数
SELECT COUNT(*) as guest_sessions FROM guest_sessions;

-- ゲストメッセージの数
SELECT COUNT(*) as guest_messages FROM conversations WHERE is_guest_message = 1;
```

## 移行手順

### ステップ1: usersテーブルに新しいカラムを追加

`database/migrate-to-unified-users.sql`の**ステップ1**を実行してください。

```sql
-- user_typeカラムを追加
ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT 'registered';
UPDATE users SET user_type = 'registered' WHERE user_type IS NULL;

-- ip_addressカラムを追加
ALTER TABLE users ADD COLUMN ip_address TEXT;

-- session_idカラムを追加
ALTER TABLE users ADD COLUMN session_id TEXT;

-- last_activity_atカラムを追加
ALTER TABLE users ADD COLUMN last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP;
```

### ステップ2: インデックスの作成

`database/migrate-to-unified-users.sql`の**ステップ2**を実行してください。

```sql
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_session_id ON users(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_ip_address ON users(ip_address) WHERE ip_address IS NOT NULL;
```

### ステップ3: guest_sessionsテーブルのデータをusersテーブルに移行

`database/migrate-to-unified-users.sql`の**ステップ3**を実行してください。

```sql
INSERT INTO users (user_type, ip_address, session_id, created_at, last_activity_at)
SELECT 
  'guest' as user_type,
  ip_address,
  session_id,
  created_at,
  last_activity_at
FROM guest_sessions
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.session_id = guest_sessions.session_id
);
```

### ステップ4: conversationsテーブルのuser_idを更新

`database/migrate-to-unified-users.sql`の**ステップ4**を実行してください。

**注意**: このステップは慎重に実行してください。`guest_sessions.id`と`users.id`のマッピングが必要です。

```sql
-- マッピングテーブルを作成
CREATE TEMP TABLE guest_to_user_mapping AS
SELECT 
  gs.id as old_guest_id,
  u.id as new_user_id
FROM guest_sessions gs
INNER JOIN users u ON gs.session_id = u.session_id
WHERE u.user_type = 'guest';

-- conversationsテーブルのuser_idを更新
UPDATE conversations
SET user_id = (
  SELECT new_user_id 
  FROM guest_to_user_mapping 
  WHERE old_guest_id = conversations.user_id
)
WHERE EXISTS (
  SELECT 1 
  FROM guest_to_user_mapping 
  WHERE old_guest_id = conversations.user_id
)
AND is_guest_message = 1;

-- 一時テーブルを削除
DROP TABLE IF EXISTS guest_to_user_mapping;
```

### ステップ5: データ整合性の確認

移行が正しく完了したか確認してください：

```sql
-- ゲストユーザーの数が一致するか確認
SELECT 
  (SELECT COUNT(*) FROM guest_sessions) as guest_sessions_count,
  (SELECT COUNT(*) FROM users WHERE user_type = 'guest') as users_guest_count;

-- ゲストメッセージの数が一致するか確認
SELECT 
  COUNT(*) as guest_messages_count
FROM conversations c
INNER JOIN users u ON c.user_id = u.id
WHERE u.user_type = 'guest' AND c.is_guest_message = 1;
```

### ステップ6: 動作確認

以下の機能をテストしてください：

1. **ゲストユーザーでのチャット動作確認**
   - ゲストユーザーとしてチャットを開始
   - メッセージが正しく保存されることを確認
   - 履歴が正しく取得されることを確認

2. **登録ユーザーでのチャット動作確認**
   - 登録ユーザーとしてログイン
   - メッセージが正しく保存されることを確認
   - 履歴が正しく取得されることを確認

3. **ゲスト→登録ユーザーへの移行確認**
   - ゲストユーザーとして10通のメッセージを送信
   - ユーザー登録を実行
   - 既存の履歴が保持されることを確認

4. **管理画面での動作確認**
   - ゲストユーザーの一覧が正しく表示されることを確認
   - ゲストユーザーの削除が正しく動作することを確認

### ステップ7: guest_sessionsテーブルの削除（最終確認後）

**重要**: すべての動作確認が完了し、問題がないことを確認してから実行してください。

```sql
DROP TABLE IF EXISTS guest_sessions;
DROP INDEX IF EXISTS idx_guest_sessions_session_id;
DROP INDEX IF EXISTS idx_guest_sessions_ip_user_agent;
```

## ロールバック手順

問題が発生した場合のロールバック手順：

1. **データベースのバックアップから復元**
   ```bash
   npx wrangler d1 execute DB --local --file=backup.sql
   ```

2. **コードを以前のバージョンに戻す**
   ```bash
   git checkout <previous-commit-hash>
   ```

## トラブルシューティング

### 問題1: 移行後にゲストユーザーが作成されない

**原因**: `getOrCreateGuestUser`関数が正しく動作していない可能性があります。

**解決策**: 
- Cloudflareのログを確認
- `users`テーブルに`user_type = 'guest'`のレコードが作成されているか確認

### 問題2: 履歴が取得できない

**原因**: `conversations`テーブルの`user_id`が正しく更新されていない可能性があります。

**解決策**:
- ステップ4の移行スクリプトを再実行
- `conversations`テーブルの`user_id`と`users`テーブルの`id`の対応を確認

### 問題3: ゲスト→登録ユーザーへの移行が失敗する

**原因**: `register.ts`の`sessionId`が正しく渡されていない可能性があります。

**解決策**:
- フロントエンドから`sessionId`が送信されているか確認
- `register.ts`のログを確認

## 移行完了後の確認事項

- [ ] ゲストユーザーでのチャットが正常に動作する
- [ ] 登録ユーザーでのチャットが正常に動作する
- [ ] ゲスト→登録ユーザーへの移行が正常に動作する
- [ ] 管理画面でのゲストユーザー管理が正常に動作する
- [ ] データベースの整合性が保たれている
- [ ] パフォーマンスに問題がない

## サポート

問題が発生した場合は、以下の情報を含めて報告してください：

1. 実行したSQLクエリ
2. エラーメッセージ
3. Cloudflareのログ
4. データベースの状態（テーブル構造、レコード数など）
