# データベースカラム整合性チェック

## 目的
Cloudflare D1データベースの`users`テーブルの実際の構造と、コードで使用しているカラムが一致しているかを確認する。

## 現在のコードで使用されているカラム

### 1. `create-guest.ts` - ゲストユーザー作成時のINSERT

```typescript
INSERT INTO users (
  user_type,        // ✅ 使用
  nickname,         // ✅ 使用
  birth_year,       // ✅ 使用
  birth_month,      // ✅ 使用
  birth_day,        // ✅ 使用
  passphrase,       // ✅ 使用
  session_id,       // ✅ 使用
  ip_address,       // ✅ 使用
  last_activity_at  // ✅ 使用
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
```

**⚠️ 問題点**: `gender`カラムがINSERT文に含まれていない
- `add-gender-and-session-id-unique.sql`で`gender`カラムは追加されている
- しかし、`create-guest.ts`のINSERT文では`gender`が使用されていない
- フロントエンド（`register.html`）では`gender: ''`を送信しているが、API側で保存されていない

### 2. `register.ts` - ゲストユーザーから登録ユーザーへの更新時のUPDATE

```typescript
UPDATE users 
SET user_type = 'registered',  // ✅ 使用
    nickname = ?,              // ✅ 使用
    birth_year = ?,            // ✅ 使用
    birth_month = ?,           // ✅ 使用
    birth_day = ?,             // ✅ 使用
    passphrase = ?             // ✅ 使用
WHERE id = ? AND user_type = 'guest'
```

**⚠️ 問題点**: `gender`カラムがUPDATE文に含まれていない
- 登録時に`gender`情報が失われる可能性がある

### 3. `consult.ts` - チャット開始時のゲストユーザー作成

```typescript
INSERT INTO users (
  user_type,        // ✅ 使用
  ip_address,       // ✅ 使用
  session_id,       // ✅ 使用
  last_activity_at  // ✅ 使用
) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
```

**⚠️ 問題点**: このINSERT文は最小限の情報のみ
- `nickname`, `birth_year`, `birth_month`, `birth_day`, `passphrase`, `gender`が含まれていない
- これは、チャット開始時にゲストユーザーを作成する際のフォールバック処理と思われる
- しかし、新しいフローでは`create-guest.ts`で先にゲストユーザーを作成するため、この処理は使用されない可能性が高い

## データベースに存在するべきカラム（スキーマ定義より）

以下のSQLファイルから推測される実際のデータベース構造：

1. **基本カラム**（元々存在）:
   - `id` (INTEGER PRIMARY KEY)
   - `nickname` (TEXT NOT NULL)
   - `birth_year` (INTEGER NOT NULL)
   - `birth_month` (INTEGER NOT NULL)
   - `birth_day` (INTEGER NOT NULL)
   - `passphrase` (TEXT NOT NULL)
   - `guardian` (TEXT)
   - `created_at` (TEXT DEFAULT CURRENT_TIMESTAMP)

2. **追加カラム**（`add-user-type-columns.sql`で追加）:
   - `user_type` (TEXT DEFAULT 'registered')
   - `ip_address` (TEXT)
   - `session_id` (TEXT)
   - `last_activity_at` (DATETIME)

3. **追加カラム**（`add-gender-and-session-id-unique.sql`で追加）:
   - `gender` (TEXT)

## 確認が必要な項目

### ✅ 確認済み（コードから推測）
- `id`, `nickname`, `birth_year`, `birth_month`, `birth_day`, `passphrase`, `guardian`, `created_at`
- `user_type`, `ip_address`, `session_id`, `last_activity_at`

### ⚠️ 要確認
- `gender`カラムが実際にデータベースに存在するか
- `gender`カラムが`create-guest.ts`と`register.ts`で使用されているか

## 推奨される修正

### 1. `create-guest.ts`の修正
`gender`カラムをINSERT文に追加：

```typescript
INSERT INTO users (
  user_type,
  nickname,
  birth_year,
  birth_month,
  birth_day,
  passphrase,
  session_id,
  ip_address,
  last_activity_at,
  gender  // ← 追加
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
```

### 2. `register.ts`の修正
`gender`カラムをUPDATE文に追加（既存のゲストユーザーの`gender`を保持するため）：

```typescript
UPDATE users 
SET user_type = 'registered',
    nickname = ?,
    birth_year = ?,
    birth_month = ?,
    birth_day = ?,
    passphrase = ?
    -- genderは既に保存されているため、UPDATE不要
WHERE id = ? AND user_type = 'guest'
```

**注意**: `gender`は`create-guest.ts`で既に保存されているため、`register.ts`での更新は不要。

## 次のステップ

1. Cloudflare D1で`PRAGMA table_info(users);`を実行して、実際のテーブル構造を確認
2. `check-users-table-structure.sql`を実行して、各カラムの存在とNULL値の有無を確認
3. 不整合があれば、上記の修正を実装
