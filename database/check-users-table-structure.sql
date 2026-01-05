-- ============================================
-- usersテーブルの構造確認用SQL
-- ============================================
-- Cloudflare D1で実行して、実際のテーブル構造を確認してください
-- ============================================

-- 1. usersテーブルの全カラム情報を取得
PRAGMA table_info(users);

-- 2. 現在のusersテーブルの全レコード数（参考）
SELECT COUNT(*) as total_users FROM users;

-- 3. 各カラムのNULL値の有無を確認（参考）
SELECT 
  COUNT(*) as total,
  COUNT(id) as has_id,
  COUNT(nickname) as has_nickname,
  COUNT(birth_year) as has_birth_year,
  COUNT(birth_month) as has_birth_month,
  COUNT(birth_day) as has_birth_day,
  COUNT(passphrase) as has_passphrase,
  COUNT(guardian) as has_guardian,
  COUNT(created_at) as has_created_at,
  COUNT(user_type) as has_user_type,
  COUNT(ip_address) as has_ip_address,
  COUNT(session_id) as has_session_id,
  COUNT(last_activity_at) as has_last_activity_at,
  COUNT(gender) as has_gender
FROM users;

-- 4. サンプルレコードを確認（参考）
SELECT 
  id,
  user_type,
  nickname,
  birth_year,
  birth_month,
  birth_day,
  passphrase,
  guardian,
  created_at,
  ip_address,
  session_id,
  last_activity_at,
  gender
FROM users
LIMIT 5;
