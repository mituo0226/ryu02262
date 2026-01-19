-- ============================================
-- 重要度フラグ追加マイグレーション
-- ============================================
-- アシスタントメッセージの重要度を管理するためのフラグを追加
-- 重要なメッセージ（守護神決定、タロット結果など）を永続的に保存
--
-- 【重要】実行前に必ずバックアップを取得してください
-- バックアップ方法: database/BACKUP_GUIDE.md を参照
--
-- バックアップコマンド:
-- CREATE TABLE conversations_backup AS SELECT * FROM conversations;
-- CREATE TABLE users_backup AS SELECT * FROM users;

-- ============================================
-- ステップ1: バックアップの確認（手動で実行）
-- ============================================
-- 以下のコマンドでバックアップが作成されていることを確認してください:
-- SELECT COUNT(*) FROM conversations_backup;

-- ============================================
-- ステップ2: マイグレーション実行
-- ============================================

-- conversationsテーブルに重要度フラグを追加
ALTER TABLE conversations ADD COLUMN is_important INTEGER DEFAULT 0;

-- インデックスを追加（削除クエリの高速化）
CREATE INDEX IF NOT EXISTS idx_conversations_importance 
ON conversations(user_id, character_id, is_important, created_at);

-- 既存のメッセージはすべて重要でない（0）として扱う
-- （デフォルト値が0のため、明示的なUPDATEは不要）

-- ============================================
-- ステップ3: マイグレーション後の確認
-- ============================================
-- 以下のコマンドでマイグレーションが成功したことを確認してください:
-- PRAGMA table_info(conversations);  -- is_importantカラムが追加されていることを確認
-- SELECT COUNT(*) FROM conversations;  -- データが保持されていることを確認

-- ============================================
-- ロールバック手順（問題が発生した場合）
-- ============================================
-- DROP TABLE IF EXISTS conversations;
-- CREATE TABLE conversations AS SELECT * FROM conversations_backup;
-- -- その後、schema.sqlからインデックス定義を再実行
