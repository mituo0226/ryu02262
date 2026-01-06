-- ============================================
-- usersテーブルの現在の状態を確認するSQL
-- user_typeとsession_idカラムを削除する前に実行してください
-- ============================================

-- ============================================
-- 1. テーブル構造の確認
-- ============================================
-- すべてのカラム名、型、デフォルト値を表示
SELECT 
  cid AS column_id,
  name AS column_name,
  type AS column_type,
  notnull AS is_not_null,
  dflt_value AS default_value,
  pk AS is_primary_key
FROM pragma_table_info('users')
ORDER BY cid;

-- ============================================
-- 2. user_typeカラムの確認
-- ============================================
-- user_typeカラムが存在するか、デフォルト値は何かを確認
SELECT 
  name AS column_name,
  type AS column_type,
  notnull AS is_not_null,
  dflt_value AS default_value,
  CASE 
    WHEN dflt_value IS NULL THEN 'デフォルト値なし'
    WHEN dflt_value = "'registered'" THEN 'デフォルト値: registered'
    WHEN dflt_value = "'guest'" THEN 'デフォルト値: guest'
    ELSE 'デフォルト値: ' || dflt_value
  END AS default_value_description
FROM pragma_table_info('users')
WHERE name = 'user_type';

-- ============================================
-- 3. session_idカラムの確認
-- ============================================
-- session_idカラムが存在するか、デフォルト値は何かを確認
SELECT 
  name AS column_name,
  type AS column_type,
  notnull AS is_not_null,
  dflt_value AS default_value,
  CASE 
    WHEN dflt_value IS NULL THEN 'デフォルト値なし'
    ELSE 'デフォルト値: ' || dflt_value
  END AS default_value_description
FROM pragma_table_info('users')
WHERE name = 'session_id';

-- ============================================
-- 4. 現在のデータの状態確認（サンプル）
-- ============================================
-- 最新5件のユーザーデータを表示
SELECT 
  id,
  nickname,
  birth_year,
  birth_month,
  birth_day,
  user_type,
  session_id,
  gender,
  guardian,
  created_at,
  last_activity_at
FROM users
ORDER BY id DESC
LIMIT 5;

-- ============================================
-- 5. user_typeの値の分布
-- ============================================
-- user_typeの値ごとのユーザー数を集計
SELECT 
  COALESCE(user_type, 'NULL') AS user_type_value,
  COUNT(*) AS user_count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM users), 2) AS percentage
FROM users
GROUP BY user_type
ORDER BY user_count DESC;

-- ============================================
-- 6. session_idの値の分布
-- ============================================
-- session_idがNULLかどうかの分布
SELECT 
  CASE 
    WHEN session_id IS NULL THEN 'NULL（空）'
    WHEN session_id = '' THEN '空文字列'
    ELSE '値あり'
  END AS session_id_status,
  COUNT(*) AS user_count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM users), 2) AS percentage
FROM users
GROUP BY 
  CASE 
    WHEN session_id IS NULL THEN 'NULL（空）'
    WHEN session_id = '' THEN '空文字列'
    ELSE '値あり'
  END
ORDER BY user_count DESC;

-- ============================================
-- 7. 総ユーザー数とカラムの存在確認
-- ============================================
SELECT 
  (SELECT COUNT(*) FROM users) AS total_users,
  (SELECT COUNT(*) FROM pragma_table_info('users') WHERE name = 'user_type') AS has_user_type_column,
  (SELECT COUNT(*) FROM pragma_table_info('users') WHERE name = 'session_id') AS has_session_id_column,
  (SELECT COUNT(*) FROM pragma_table_info('users') WHERE name = 'ip_address') AS has_ip_address_column;

-- ============================================
-- 8. 最近登録されたユーザーのuser_type確認
-- ============================================
-- 最近10件のユーザーでuser_typeが自動設定されているか確認
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
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- 9. インデックスの確認
-- ============================================
-- user_typeやsession_idに関連するインデックスが存在するか確認
SELECT 
  name AS index_name,
  sql AS index_definition
FROM sqlite_master
WHERE type = 'index' 
  AND (
    sql LIKE '%user_type%' 
    OR sql LIKE '%session_id%'
    OR sql LIKE '%ip_address%'
  )
ORDER BY name;
