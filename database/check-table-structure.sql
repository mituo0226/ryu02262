-- ============================================
-- テーブル構造の確認SQL
-- ============================================
-- このスクリプトで、すべてのテーブルのカラム構造を確認できます
-- ============================================

-- ============================================
-- 1. usersテーブルの構造確認
-- ============================================
PRAGMA table_info(users);

-- ============================================
-- 2. conversationsテーブルの構造確認
-- ============================================
PRAGMA table_info(conversations);

-- ============================================
-- 3. 各テーブルのレコード数確認
-- ============================================
SELECT 
  'users' as table_name,
  COUNT(*) as record_count
FROM users
UNION ALL
SELECT 
  'conversations' as table_name,
  COUNT(*) as record_count
FROM conversations;

-- ============================================
-- 4. usersテーブルのカラム一覧（詳細）
-- ============================================
-- 期待されるカラム：
-- - id (INTEGER, PRIMARY KEY)
-- - nickname (TEXT)
-- - birth_year (INTEGER)
-- - birth_month (INTEGER)
-- - birth_day (INTEGER)
-- - passphrase (TEXT)
-- - guardian (TEXT)
-- - created_at (TEXT/DATETIME)
-- - user_type (TEXT) ← 新規追加
-- - ip_address (TEXT) ← 新規追加
-- - session_id (TEXT) ← 新規追加
-- - last_activity_at (DATETIME) ← 新規追加

-- ============================================
-- 5. conversationsテーブルのカラム一覧（詳細）
-- ============================================
-- 期待されるカラム：
-- - id (INTEGER, PRIMARY KEY)
-- - user_id (INTEGER)
-- - character_id (TEXT)
-- - role (TEXT)
-- - message (TEXT) ← コードで使用中
-- - content (TEXT) ← スキーマには定義されているが、実際はmessageを使用
-- - timestamp (DATETIME)
-- - message_type (TEXT)
-- - is_guest_message (BOOLEAN/INTEGER)
-- - created_at (DATETIME)

-- ============================================
-- 6. インデックスの確認
-- ============================================
-- usersテーブルのインデックス
SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='users';

-- conversationsテーブルのインデックス
SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='conversations';
