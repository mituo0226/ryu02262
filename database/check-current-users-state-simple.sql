-- ============================================
-- usersテーブルの現在の状態を確認するSQL（簡易版）
-- user_typeとsession_idカラムを削除する前に実行してください
-- ============================================

-- ============================================
-- 1. テーブル構造の確認（シンプル版）
-- ============================================
PRAGMA table_info(users);

-- ============================================
-- 2. user_typeカラムの確認
-- ============================================
SELECT 
  name,
  type,
  dflt_value
FROM pragma_table_info('users')
WHERE name = 'user_type';

-- ============================================
-- 3. session_idカラムの確認
-- ============================================
SELECT 
  name,
  type,
  dflt_value
FROM pragma_table_info('users')
WHERE name = 'session_id';

-- ============================================
-- 4. 現在のデータの状態確認（サンプル）
-- ============================================
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
  created_at
FROM users
ORDER BY id DESC
LIMIT 5;

-- ============================================
-- 5. user_typeの値の分布
-- ============================================
SELECT 
  COALESCE(user_type, 'NULL') AS user_type_value,
  COUNT(*) AS user_count
FROM users
GROUP BY user_type
ORDER BY user_count DESC;

-- ============================================
-- 6. session_idの値の分布
-- ============================================
SELECT 
  CASE 
    WHEN session_id IS NULL THEN 'NULL（空）'
    WHEN session_id = '' THEN '空文字列'
    ELSE '値あり'
  END AS session_id_status,
  COUNT(*) AS user_count
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
  (SELECT COUNT(*) FROM pragma_table_info('users') WHERE name = 'session_id') AS has_session_id_column;

-- ============================================
-- 8. 最近登録されたユーザーのuser_type確認
-- ============================================
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
