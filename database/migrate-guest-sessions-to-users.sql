-- ============================================
-- guest_sessionsテーブルのデータをusersテーブルに移行
-- ============================================
-- このスクリプトは、guest_sessionsテーブルのデータをusersテーブルに移行します
-- ============================================

-- ============================================
-- ステップ1: guest_sessionsのデータをusersテーブルに移行
-- ============================================
-- 注意: 既に同じsession_idがusersテーブルに存在する場合はスキップします

INSERT INTO users (user_type, ip_address, session_id, created_at, last_activity_at)
SELECT 
  'guest' as user_type,
  ip_address,
  session_id,
  created_at,
  last_activity_at
FROM guest_sessions
WHERE NOT EXISTS (
  -- 既に同じsession_idがusersテーブルに存在する場合はスキップ
  SELECT 1 FROM users u WHERE u.session_id = guest_sessions.session_id
);

-- ============================================
-- ステップ2: 移行結果の確認
-- ============================================
-- 以下のクエリで、移行が正しく完了したか確認できます：

-- ゲストユーザーの数
-- SELECT COUNT(*) as guest_users FROM users WHERE user_type = 'guest';

-- ゲストセッションの数（移行前）
-- SELECT COUNT(*) as guest_sessions_count FROM guest_sessions;

-- 移行されたゲストユーザーの詳細
-- SELECT id, session_id, ip_address, created_at, last_activity_at 
-- FROM users 
-- WHERE user_type = 'guest' 
-- ORDER BY created_at DESC;
