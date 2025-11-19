-- ============================================
-- Cloudflare D1 クイックマイグレーションSQL
-- 最小限の変更で新しいスキーマに対応
-- ============================================
-- 
-- 【このSQLの特徴】
-- - 既存の`message`カラムはそのまま使用
-- - 新しいカラムのみ追加
-- - アプリケーション側で`message`を`content`として扱う
-- - 最小限の変更で対応可能
-- ============================================

-- ============================================
-- ステップ1: バックアップ（推奨）
-- ============================================
CREATE TABLE IF NOT EXISTS conversations_backup AS 
SELECT * FROM conversations;

-- ============================================
-- ステップ2: 新しいカラムの追加
-- ============================================

-- timestampカラムの追加
ALTER TABLE conversations ADD COLUMN timestamp DATETIME;

-- message_typeカラムの追加
ALTER TABLE conversations ADD COLUMN message_type TEXT DEFAULT 'normal';

-- is_guest_messageカラムの追加
ALTER TABLE conversations ADD COLUMN is_guest_message INTEGER DEFAULT 0;

-- ============================================
-- ステップ3: 既存データの移行
-- ============================================

-- timestampにcreated_atの値をコピー
UPDATE conversations 
SET timestamp = created_at 
WHERE timestamp IS NULL;

-- message_typeにデフォルト値を設定
UPDATE conversations 
SET message_type = 'normal' 
WHERE message_type IS NULL;

-- is_guest_messageにデフォルト値を設定
UPDATE conversations 
SET is_guest_message = 0 
WHERE is_guest_message IS NULL;

-- ============================================
-- ステップ4: インデックスの作成
-- ============================================

-- メインインデックス
CREATE INDEX IF NOT EXISTS idx_conversations_user_character_timestamp 
ON conversations(user_id, character_id, timestamp DESC);

-- パフォーマンスインデックス
CREATE INDEX IF NOT EXISTS idx_conversations_user_character 
ON conversations(user_id, character_id);

-- クリーンアップ用インデックス
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp 
ON conversations(timestamp);

-- ゲストメッセージ検索用インデックス
CREATE INDEX IF NOT EXISTS idx_conversations_guest 
ON conversations(user_id, character_id, is_guest_message);

-- ============================================
-- 完了確認
-- ============================================
-- 以下のクエリで確認してください

-- テーブル構造の確認
-- PRAGMA table_info(conversations);

-- データ数の確認
-- SELECT COUNT(*) as total_messages FROM conversations;

-- NULL値の確認（すべて0であることを確認）
-- SELECT 
--   SUM(CASE WHEN timestamp IS NULL THEN 1 ELSE 0 END) as null_timestamp,
--   SUM(CASE WHEN message_type IS NULL THEN 1 ELSE 0 END) as null_message_type,
--   SUM(CASE WHEN is_guest_message IS NULL THEN 1 ELSE 0 END) as null_is_guest_message
-- FROM conversations;

