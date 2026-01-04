-- ============================================
-- contentカラム追加マイグレーションSQL
-- ============================================
-- 
-- 【このマイグレーションの目的】
-- conversationsテーブルに`content`カラムを追加し、
-- 既存の`message`カラムのデータを`content`にコピーします
-- 
-- 【実行前の確認事項】
-- 1. 本番環境では必ずバックアップを取得してください
-- 2. テスト環境で先に実行して動作確認してください
-- ============================================

-- ============================================
-- ステップ1: バックアップ（推奨）
-- ============================================
CREATE TABLE IF NOT EXISTS conversations_backup_content_migration AS 
SELECT * FROM conversations;

-- バックアップの確認
-- SELECT COUNT(*) as backup_count FROM conversations_backup_content_migration;

-- ============================================
-- ステップ2: contentカラムの追加
-- ============================================
-- 既存のmessageカラムのデータをcontentカラムにコピーします
ALTER TABLE conversations ADD COLUMN content TEXT;

-- ============================================
-- ステップ3: 既存データの移行
-- ============================================
-- messageカラムのデータをcontentカラムにコピー
UPDATE conversations 
SET content = message 
WHERE content IS NULL AND message IS NOT NULL;

-- 移行結果の確認
-- SELECT 
--   COUNT(*) as total_rows,
--   SUM(CASE WHEN content IS NOT NULL THEN 1 ELSE 0 END) as rows_with_content,
--   SUM(CASE WHEN message IS NOT NULL THEN 1 ELSE 0 END) as rows_with_message
-- FROM conversations;

-- ============================================
-- ステップ4: データ整合性の確認
-- ============================================
-- contentカラムがNULLのレコードがないか確認
-- SELECT COUNT(*) as null_content_count 
-- FROM conversations 
-- WHERE content IS NULL AND message IS NOT NULL;

-- ============================================
-- 完了後の確認
-- ============================================
-- テーブル構造の確認
-- PRAGMA table_info(conversations);

-- contentカラムとmessageカラムのデータが一致しているか確認
-- SELECT 
--   COUNT(*) as total,
--   SUM(CASE WHEN content = message THEN 1 ELSE 0 END) as matching,
--   SUM(CASE WHEN content != message OR (content IS NULL AND message IS NOT NULL) THEN 1 ELSE 0 END) as mismatched
-- FROM conversations
-- WHERE message IS NOT NULL;

-- ============================================
-- 注意事項
-- ============================================
-- このマイグレーション後、アプリケーションコードは以下のように変更できます：
-- 
-- 【変更前】
-- SELECT COALESCE(c.content, c.message) as content
-- 
-- 【変更後】
-- SELECT c.content
-- 
-- ただし、messageカラムは削除せずに残しておくことを推奨します
-- （後方互換性のため）
