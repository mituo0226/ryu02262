# 統一ユーザーテーブル設計への移行計画

## 現状の問題点

現在の設計では、以下の2つのテーブルでユーザーを管理しています：

1. **`users`テーブル**: 登録ユーザー用
2. **`guest_sessions`テーブル**: ゲストユーザー用

この設計により、以下の問題が発生しています：

- `conversations`テーブルの`user_id`が異なるテーブルを参照するため、JOINが複雑
- ゲストユーザーと登録ユーザーの履歴取得ロジックが分離されている
- ゲスト→登録ユーザーへの移行処理が複雑（2つのテーブル間でデータ移行が必要）

## 提案された設計

### 新しい`users`テーブル構造

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_type TEXT NOT NULL CHECK(user_type IN ('guest', 'registered')),
  ip_address TEXT,  -- ゲストユーザー識別用
  session_id TEXT,  -- ゲストユーザー識別用（ブラウザセッション）
  nickname TEXT,    -- 登録ユーザーのみ（ゲストはNULL）
  birth_year INTEGER,
  birth_month INTEGER,
  birth_day INTEGER,
  assigned_deity TEXT,  -- 登録ユーザーのみ（ゲストはNULL）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_session_id ON users(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_ip_address ON users(ip_address) WHERE ip_address IS NOT NULL;
```

### 設計のメリット

1. **単一テーブル管理**: すべてのユーザー（ゲスト・登録）を`users`テーブルで管理
2. **シンプルなJOIN**: `conversations.user_id`が常に`users.id`を参照
3. **簡単な移行**: ゲスト→登録は同一レコードの`UPDATE`のみ
4. **統一された履歴取得**: `user_type`でフィルタリングするだけ

### ユーザー種別の判定

- **ゲストユーザー**: `user_type = 'guest'` かつ `nickname IS NULL`
- **登録ユーザー**: `user_type = 'registered'` かつ `nickname IS NOT NULL`

### ゲストユーザーの作成

```sql
-- ゲストユーザーの作成
INSERT INTO users (user_type, ip_address, session_id, last_activity_at)
VALUES ('guest', ?, ?, CURRENT_TIMESTAMP);
```

### ゲスト→登録ユーザーへの移行

```sql
-- ユーザー登録時：同じレコードを更新
UPDATE users
SET user_type = 'registered',
    nickname = ?,
    birth_year = ?,
    birth_month = ?,
    birth_day = ?,
    assigned_deity = ?,
    updated_at = CURRENT_TIMESTAMP
WHERE id = ? AND user_type = 'guest';
```

### 履歴取得の簡素化

```sql
-- 登録ユーザーの履歴取得（シンプル）
SELECT c.role, c.message, c.timestamp
FROM conversations c
INNER JOIN users u ON c.user_id = u.id
WHERE c.user_id = ? 
  AND c.character_id = ?
  AND u.user_type = 'registered'
  AND u.nickname IS NOT NULL
ORDER BY c.timestamp DESC
LIMIT 20;

-- ゲストユーザーの履歴取得（シンプル）
SELECT c.role, c.message, c.timestamp
FROM conversations c
INNER JOIN users u ON c.user_id = u.id
WHERE c.user_id = ?
  AND c.character_id = ?
  AND u.user_type = 'guest'
  AND u.session_id = ?
ORDER BY c.timestamp DESC
LIMIT 20;
```

## 移行手順

### ステップ1: データベーススキーマの更新

1. `users`テーブルに新しいカラムを追加
2. 既存の登録ユーザーデータを`user_type = 'registered'`に設定
3. `guest_sessions`テーブルのデータを`users`テーブルに移行

### ステップ2: コードの修正

以下のファイルを修正する必要があります：

1. **`functions/api/consult.ts`**
   - `getOrCreateGuestSession` → `getOrCreateGuestUser`に変更
   - `guest_sessions`テーブルへの参照を削除
   - `users`テーブルを使用するように変更

2. **`functions/api/conversation-history.ts`**
   - `guest_sessions`テーブルへのJOINを削除
   - `users.user_type`でフィルタリング

3. **`functions/api/admin/clear-guest-sessions.ts`**
   - `guest_sessions`テーブルへの参照を削除
   - `users`テーブルで`user_type = 'guest'`を削除

4. **`database/schema.sql`**
   - `guest_sessions`テーブルの定義を削除
   - `users`テーブルの定義を更新

### ステップ3: データ移行

既存の`guest_sessions`テーブルのデータを`users`テーブルに移行：

```sql
-- guest_sessionsのデータをusersテーブルに移行
INSERT INTO users (user_type, ip_address, session_id, created_at, last_activity_at)
SELECT 'guest', ip_address, session_id, created_at, last_activity_at
FROM guest_sessions;

-- conversationsテーブルのuser_idを更新
-- （guest_sessions.id → users.idへのマッピングが必要）
```

### ステップ4: テスト

1. ゲストユーザーでのチャット動作確認
2. ゲスト→登録ユーザーへの移行確認
3. 履歴取得の動作確認
4. 管理画面での動作確認

## 注意事項

- **既存データの保護**: 移行前に必ずバックアップを取得
- **段階的な移行**: 本番環境では段階的に移行を実施
- **ロールバック計画**: 問題が発生した場合のロールバック手順を準備

## 実装の優先順位

1. **高**: データベーススキーマの更新
2. **高**: `consult.ts`の修正
3. **中**: `conversation-history.ts`の修正
4. **中**: 管理画面の修正
5. **低**: ドキュメントの更新
