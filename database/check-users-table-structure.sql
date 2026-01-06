-- ============================================
-- usersテーブルの構造を確認するSQL
-- ============================================
-- このSQLを実行して、現在のテーブル構造を確認してください

-- テーブル構造の確認
PRAGMA table_info(users);

-- カラム名とデフォルト値の確認
SELECT 
  cid,
  name,
  type,
  notnull,
  dflt_value AS default_value,
  pk
FROM pragma_table_info('users')
ORDER BY cid;

-- user_typeカラムが存在するか確認
SELECT 
  name,
  type,
  dflt_value AS default_value
FROM pragma_table_info('users')
WHERE name = 'user_type';

-- session_idカラムが存在するか確認
SELECT 
  name,
  type,
  dflt_value AS default_value
FROM pragma_table_info('users')
WHERE name = 'session_id';

-- 現在のデータの確認（サンプル）
SELECT 
  id,
  nickname,
  birth_year,
  birth_month,
  birth_day,
  user_type,
  session_id,
  created_at
FROM users
LIMIT 5;
