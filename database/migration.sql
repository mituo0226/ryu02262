-- ============================================
-- マイグレーションスクリプト
-- 既存のconversationsテーブルから新しい構造への移行
-- ============================================

-- ============================================
-- ステップ1: 既存テーブルのバックアップ
-- ============================================
-- 本番環境では必ず実行前にバックアップを取得してください

-- CREATE TABLE conversations_backup_YYYYMMDD AS 
-- SELECT * FROM conversations;

-- ============================================
-- ステップ2: 既存データの確認
-- ============================================
-- 移行前に既存データを確認

-- SELECT 
--   COUNT(*) as total_messages,
--   COUNT(DISTINCT user_id) as unique_users,
--   COUNT(DISTINCT character_id) as unique_characters,
--   MIN(created_at) as oldest_message,
--   MAX(created_at) as newest_message
-- FROM conversations;

-- ============================================
-- ステップ3: 新しいカラムの追加（既存テーブルがある場合）
-- ============================================

-- timestampカラムの追加（既存のcreated_atをコピー）
-- ALTER TABLE conversations ADD COLUMN timestamp DATETIME;
-- UPDATE conversations SET timestamp = created_at WHERE timestamp IS NULL;

-- message_typeカラムの追加
-- ALTER TABLE conversations ADD COLUMN message_type TEXT DEFAULT 'normal';
-- UPDATE conversations SET message_type = 'normal' WHERE message_type IS NULL;

-- is_guest_messageカラムの追加
-- ALTER TABLE conversations ADD COLUMN is_guest_message BOOLEAN DEFAULT 0;
-- UPDATE conversations SET is_guest_message = 0 WHERE is_guest_message IS NULL;

-- ============================================
-- ステップ4: データ整合性チェック
-- ============================================

-- 無効なcharacter_idのチェック
-- SELECT DISTINCT character_id 
-- FROM conversations 
-- WHERE character_id NOT IN ('kaede', 'yukino', 'sora', 'kaon');

-- 無効なroleのチェック
-- SELECT DISTINCT role 
-- FROM conversations 
-- WHERE role NOT IN ('user', 'assistant');

-- NULL値のチェック
-- SELECT COUNT(*) as null_user_id FROM conversations WHERE user_id IS NULL;
-- SELECT COUNT(*) as null_character_id FROM conversations WHERE character_id IS NULL;
-- SELECT COUNT(*) as null_role FROM conversations WHERE role IS NULL;
-- SELECT COUNT(*) as null_content FROM conversations WHERE content IS NULL;

-- ============================================
-- ステップ5: インデックスの作成
-- ============================================

-- 既存のインデックスを削除（必要に応じて）
-- DROP INDEX IF EXISTS idx_conversations_user_character_timestamp;
-- DROP INDEX IF EXISTS idx_conversations_user_character;
-- DROP INDEX IF EXISTS idx_conversations_timestamp;

-- 新しいインデックスの作成（schema.sqlを参照）

-- ============================================
-- ステップ6: データ移行（新規テーブル作成の場合）
-- ============================================

-- 既存データを新しいテーブルに移行
-- INSERT INTO conversations_new (
--   user_id, 
--   character_id, 
--   role, 
--   content, 
--   timestamp, 
--   message_type, 
--   is_guest_message,
--   created_at
-- )
-- SELECT 
--   user_id,
--   character_id,
--   role,
--   message as content,
--   COALESCE(created_at, CURRENT_TIMESTAMP) as timestamp,
--   'normal' as message_type,
--   0 as is_guest_message,
--   COALESCE(created_at, CURRENT_TIMESTAMP) as created_at
-- FROM conversations_old;

-- ============================================
-- ステップ7: 検証クエリ
-- ============================================

-- 移行後のデータ整合性チェック
-- SELECT 
--   COUNT(*) as total_messages,
--   COUNT(DISTINCT user_id) as unique_users,
--   COUNT(DISTINCT character_id) as unique_characters
-- FROM conversations;

-- 各ユーザー・鑑定士のメッセージ数確認
-- SELECT 
--   user_id,
--   character_id,
--   COUNT(*) as message_count
-- FROM conversations
-- GROUP BY user_id, character_id
-- ORDER BY message_count DESC
-- LIMIT 10;

-- ============================================
-- ステップ8: クリーンアップ（100件制限の適用）
-- ============================================
-- 各ユーザー・鑑定士の組み合わせで100件を超える場合は古いメッセージを削除
-- この処理はAPI側で実装（cleanup-conversations.tsを参照）

