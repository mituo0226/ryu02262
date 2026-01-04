-- ============================================
-- 統一ユーザーテーブル設計への移行スクリプト
-- ============================================
-- このスクリプトは、guest_sessionsテーブルを廃止し、
-- usersテーブルに統合するためのマイグレーションです。
--
-- 【重要】実行前に必ずデータベースのバックアップを取得してください
-- ============================================

-- ============================================
-- ステップ1: usersテーブルに新しいカラムを追加
-- ============================================

-- user_typeカラムを追加（'guest' | 'registered'）
-- 既存の登録ユーザーは'registered'に設定
ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT 'registered';
UPDATE users SET user_type = 'registered' WHERE user_type IS NULL;

-- ip_addressカラムを追加（ゲストユーザー識別用）
ALTER TABLE users ADD COLUMN ip_address TEXT;

-- session_idカラムを追加（ゲストユーザー識別用）
ALTER TABLE users ADD COLUMN session_id TEXT;

-- last_activity_atカラムを追加（アクティビティ追跡用）
ALTER TABLE users ADD COLUMN last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- user_typeにCHECK制約を追加（SQLiteではALTER TABLEでCHECK制約を追加できないため、後で確認）
-- 注意: SQLiteではALTER TABLEでCHECK制約を追加できないため、
-- アプリケーション側で制約を管理する必要があります

-- ============================================
-- ステップ2: インデックスの作成
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_session_id ON users(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_ip_address ON users(ip_address) WHERE ip_address IS NOT NULL;

-- ============================================
-- ステップ3: guest_sessionsテーブルのデータをusersテーブルに移行
-- ============================================

-- guest_sessionsのデータをusersテーブルに移行
-- 注意: 既存のusersテーブルとIDが重複しないように注意が必要です
-- この移行では、guest_sessions.idをそのままusers.idとして使用します
-- （AUTOINCREMENTのため、新しいIDが発行されます）

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
-- ステップ4: conversationsテーブルのuser_idを更新
-- ============================================
-- 注意: このステップは慎重に実行する必要があります
-- guest_sessions.idとusers.idのマッピングが必要です

-- guest_sessions.idとusers.idのマッピングテーブルを作成（一時的）
-- 注意: SQLiteでは一時テーブルを使用します

-- マッピングテーブルを作成
CREATE TEMP TABLE guest_to_user_mapping AS
SELECT 
  gs.id as old_guest_id,
  u.id as new_user_id
FROM guest_sessions gs
INNER JOIN users u ON gs.session_id = u.session_id
WHERE u.user_type = 'guest';

-- conversationsテーブルのuser_idを更新
-- ゲストユーザーのメッセージ（is_guest_message = 1）のみを更新
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

-- ============================================
-- ステップ5: データ整合性の確認（オプション）
-- ============================================

-- ゲストユーザーの数が一致するか確認
-- SELECT 
--   (SELECT COUNT(*) FROM guest_sessions) as guest_sessions_count,
--   (SELECT COUNT(*) FROM users WHERE user_type = 'guest') as users_guest_count;

-- ゲストメッセージの数が一致するか確認
-- SELECT 
--   COUNT(*) as guest_messages_count
-- FROM conversations c
-- INNER JOIN users u ON c.user_id = u.id
-- WHERE u.user_type = 'guest' AND c.is_guest_message = 1;

-- ============================================
-- ステップ6: guest_sessionsテーブルの削除（慎重に）
-- ============================================
-- 注意: データ移行が完了し、動作確認が取れるまで実行しないでください
-- 
-- DROP TABLE IF EXISTS guest_sessions;
-- DROP INDEX IF EXISTS idx_guest_sessions_session_id;
-- DROP INDEX IF EXISTS idx_guest_sessions_ip_user_agent;

-- ============================================
-- 移行完了後の確認事項
-- ============================================
-- 1. ゲストユーザーでのチャット動作確認
-- 2. 登録ユーザーでのチャット動作確認
-- 3. ゲスト→登録ユーザーへの移行確認
-- 4. 履歴取得の動作確認
-- 5. 管理画面での動作確認
-- 
-- すべて確認できたら、ステップ6を実行してguest_sessionsテーブルを削除してください
