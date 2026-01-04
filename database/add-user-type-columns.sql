-- ============================================
-- usersテーブルにカラムを追加するSQL
-- ============================================
-- このスクリプトは、usersテーブルに以下のカラムを追加します：
-- 1. user_type: ゲストユーザーか登録ユーザーかを区別するカラム
-- 2. ip_address: ゲストユーザーのIPアドレス
-- 3. session_id: ゲストユーザーのセッションID
-- 4. last_activity_at: 最後のアクティビティ日時
-- ============================================

-- ============================================
-- ステップ1: user_typeカラムを追加
-- ============================================
-- 'guest' または 'registered' の値を格納
-- 既存の登録ユーザーは 'registered' に設定
ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT 'registered';
UPDATE users SET user_type = 'registered' WHERE user_type IS NULL;

-- ============================================
-- ステップ2: ip_addressカラムを追加
-- ============================================
-- ゲストユーザーのIPアドレスを格納（登録ユーザーはNULL）
ALTER TABLE users ADD COLUMN ip_address TEXT;

-- ============================================
-- ステップ3: session_idカラムを追加
-- ============================================
-- ゲストユーザーのセッションIDを格納（登録ユーザーはNULL）
ALTER TABLE users ADD COLUMN session_id TEXT;

-- ============================================
-- ステップ4: last_activity_atカラムを追加
-- ============================================
-- 最後のアクティビティ日時を格納
-- 注意: SQLiteでは非定数デフォルト値（CURRENT_TIMESTAMP）を直接追加できないため、
-- まずNULLで追加し、既存レコードにはcreated_atまたは現在時刻を設定
ALTER TABLE users ADD COLUMN last_activity_at DATETIME;

-- 既存のレコードにはcreated_atの値（または現在時刻）を設定
UPDATE users SET last_activity_at = COALESCE(created_at, CURRENT_TIMESTAMP) WHERE last_activity_at IS NULL;

-- ============================================
-- ステップ5: インデックスの作成
-- ============================================
-- パフォーマンス向上のため、よく検索されるカラムにインデックスを作成

-- user_typeでの検索用インデックス
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);

-- session_idでの検索用インデックス（NULL値は除外）
CREATE INDEX IF NOT EXISTS idx_users_session_id ON users(session_id) WHERE session_id IS NOT NULL;

-- ip_addressでの検索用インデックス（NULL値は除外）
CREATE INDEX IF NOT EXISTS idx_users_ip_address ON users(ip_address) WHERE ip_address IS NOT NULL;

-- ============================================
-- 確認用クエリ（実行後の確認に使用）
-- ============================================
-- 以下のクエリで、カラムが正しく追加されたか確認できます：

-- テーブル構造の確認
-- PRAGMA table_info(users);

-- 登録ユーザーの数
-- SELECT COUNT(*) as registered_users FROM users WHERE user_type = 'registered';

-- ゲストユーザーの数（移行後）
-- SELECT COUNT(*) as guest_users FROM users WHERE user_type = 'guest';
