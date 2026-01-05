-- ============================================
-- 入口フォーム対応とsession_id UNIQUE制約の追加
-- ============================================
-- 実行日時: 2026-01-04
-- 目的:
--   1. usersテーブルにgenderカラムを追加（入口フォームで必須入力）
--   2. session_idにUNIQUEインデックスを追加（ログイン鍵として使用）
--   3. is_guest_messageを0に統一（任意・今後使用しないため）
-- ============================================

-- ============================================
-- 1. usersテーブルにgenderカラムを追加
-- ============================================
ALTER TABLE users ADD COLUMN gender TEXT;

-- ============================================
-- 2. session_idにUNIQUEインデックスを追加
-- ============================================
-- 既存のインデックスを削除（UNIQUEインデックスと競合する可能性があるため）
DROP INDEX IF EXISTS idx_users_session_id;

-- UNIQUEインデックスを作成（NULL値は除外）
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_session_id_unique 
ON users(session_id) 
WHERE session_id IS NOT NULL;

-- ============================================
-- 3. is_guest_messageを0に統一（任意）
-- ============================================
UPDATE conversations 
SET is_guest_message = 0 
WHERE is_guest_message IS NOT NULL;

-- ============================================
-- 確認用クエリ（実行後、手動で確認してください）
-- ============================================
-- usersテーブルの構造確認
-- PRAGMA table_info(users);

-- session_idの重複チェック（UNIQUEインデックス作成前に確認推奨）
-- SELECT session_id, COUNT(*) as count 
-- FROM users 
-- WHERE session_id IS NOT NULL 
-- GROUP BY session_id 
-- HAVING COUNT(*) > 1;

-- genderカラムの追加確認
-- SELECT id, nickname, gender, session_id 
-- FROM users 
-- LIMIT 10;
