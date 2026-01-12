# 現在のデータベース構造（Cloudflare D1）

> **重要**: このドキュメントは、実際のCloudflare D1データベースの構造を記録します。
> データベース構造が変更された場合は、このドキュメントを更新してください。

## 最終更新日時
2026-01-12

## usersテーブル

### テーブル構造

```sql
PRAGMA table_info(users);
```

| cid | name | type | notnull | dflt_value | pk |
|-----|------|------|---------|------------|-----|
| 0 | id | INTEGER | 0 | <null> | 1 |
| 1 | nickname | TEXT | 1 | <null> | 0 |
| 2 | birth_year | INTEGER | 1 | <null> | 0 |
| 3 | birth_month | INTEGER | 1 | <null> | 0 |
| 4 | birth_day | INTEGER | 1 | <null> | 0 |
| 5 | passphrase | TEXT | 1 | <null> | 0 |
| 6 | guardian | TEXT | 0 | <null> | 0 |
| 7 | created_at | TEXT | 1 | CURRENT_TIMESTAMP | 0 |
| 8 | user_type | TEXT | 0 | 'registered' | 0 |
| 9 | ip_address | TEXT | 0 | <null> | 0 |
| 10 | session_id | TEXT | 0 | <null> | 0 |
| 11 | last_activity_at | DATETIME | 0 | <null> | 0 |
| 12 | gender | TEXT | 0 | <null> | 0 |

### カラム詳細

#### 必須カラム（NOT NULL制約あり）
- `id`: INTEGER PRIMARY KEY（自動インクリメント）
- `nickname`: TEXT NOT NULL
- `birth_year`: INTEGER NOT NULL
- `birth_month`: INTEGER NOT NULL
- `birth_day`: INTEGER NOT NULL
- `passphrase`: TEXT NOT NULL
- `created_at`: TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

#### オプションカラム（NULL可）
- `guardian`: TEXT（守護神）
- `user_type`: TEXT DEFAULT 'registered'（'guest' | 'registered'）
- `ip_address`: TEXT（ゲストユーザー識別用）
- `session_id`: TEXT（ゲストユーザー識別用、UNIQUE INDEXあり）
- `last_activity_at`: DATETIME（最終活動日時）
- `gender`: TEXT（性別）

### インデックス

```sql
-- user_typeインデックス
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);

-- session_id UNIQUEインデックス（NULL値は除外）
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_session_id_unique 
ON users(session_id) 
WHERE session_id IS NOT NULL;

-- ip_addressインデックス
CREATE INDEX IF NOT EXISTS idx_users_ip_address 
ON users(ip_address) 
WHERE ip_address IS NOT NULL;
```

## conversationsテーブル

### テーブル構造

```sql
PRAGMA table_info(conversations);
```

> **確認済み**: 2026-01-12に実際のデータベース構造を確認しました。

| cid | name | type | notnull | dflt_value | pk |
|-----|------|------|---------|------------|-----|
| 0 | id | INTEGER | 0 | <null> | 1 |
| 1 | user_id | INTEGER | 1 | <null> | 0 |
| 2 | character_id | TEXT | 1 | <null> | 0 |
| 3 | role | TEXT | 1 | <null> | 0 |
| 4 | message | TEXT | 1 | <null> | 0 |
| 5 | created_at | TEXT | 1 | CURRENT_TIMESTAMP | 0 |
| 6 | timestamp | DATETIME | 0 | <null> | 0 |
| 7 | message_type | TEXT | 0 | 'normal' | 0 |
| 8 | is_guest_message | INTEGER | 0 | 0 | 0 |

> **重要**: `content`カラムは存在しません。メッセージ内容は`message`カラムに保存されます。

### カラム詳細

#### 必須カラム（NOT NULL制約あり）
- `id`: INTEGER PRIMARY KEY（自動インクリメント）
- `user_id`: INTEGER NOT NULL（usersテーブルの外部キー）
- `character_id`: TEXT NOT NULL（'kaede' | 'yukino' | 'sora' | 'kaon'）
- `role`: TEXT NOT NULL（'user' | 'assistant'）
- `message`: TEXT NOT NULL（メッセージ内容）
- `created_at`: TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

#### オプションカラム（NULL可）
- `timestamp`: DATETIME（タイムスタンプ）
- `message_type`: TEXT DEFAULT 'normal'（'normal' | 'system' | 'warning'）
- `is_guest_message`: INTEGER DEFAULT 0（使用しない、常に0）

## コードとの整合性チェック

### ✅ 確認済み

1. **`create-guest.ts`** - ゲストユーザー作成
   - 使用カラム: `user_type`, `nickname`, `birth_year`, `birth_month`, `birth_day`, `passphrase`, `session_id`, `ip_address`, `last_activity_at`, `gender`
   - すべてのカラムがデータベースに存在 ✅
   - NOT NULL制約のあるカラムに値を設定 ✅

2. **`register.ts`** - 登録ユーザーへの更新
   - 使用カラム: `user_type`, `nickname`, `birth_year`, `birth_month`, `birth_day`, `passphrase`
   - すべてのカラムがデータベースに存在 ✅
   - NOT NULL制約のあるカラムに値を設定 ✅

### ✅ 確認済み（2026-01-12）

- `conversations`テーブルの実際の構造を確認 ✅
  - 9列すべて確認済み
  - `content`カラムは存在せず、`message`カラムのみが存在することを確認

## 更新履歴

### 2026-01-12
- `conversations`テーブルの実際の構造を確認（Cloudflare D1ダッシュボードから確認）
- `content`カラムが存在しないことを確認（`message`カラムのみが存在）
- コードとの整合性を確認（すべてのカラムが正しく使用されていることを確認）

### 2026-01-04
- `users`テーブルの構造を記録
- `gender`カラムの存在を確認
- `create-guest.ts`に`gender`カラムを追加（修正済み）
- `consult.ts`のフォールバック処理を修正（NOT NULL制約違反を防止）

## 更新方法

データベース構造が変更された場合：

1. Cloudflare D1で`PRAGMA table_info(テーブル名);`を実行
2. このドキュメントの該当テーブル構造を更新
3. コードとの整合性を再確認
4. 必要に応じてコードを修正
