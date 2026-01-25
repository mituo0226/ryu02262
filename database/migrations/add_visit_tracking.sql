-- ============================================
-- 再訪問判定機能追加マイグレーション
-- ============================================
-- 前回の訪問時刻と会話要約を管理するためのカラムを追加
-- 時間ベースの訪問パターン判定（3時間、12時間）を実装するための準備
--
-- 【重要】実行前に必ずバックアップを取得してください
-- バックアップ方法: database/BACKUP_GUIDE.md を参照
--
-- バックアップコマンド:
-- CREATE TABLE conversations_backup AS SELECT * FROM conversations;

-- ============================================
-- ステップ1: バックアップの確認（手動で実行）
-- ============================================
-- 以下のコマンドでバックアップが作成されていることを確認してください:
-- SELECT COUNT(*) FROM conversations_backup;

-- ============================================
-- ステップ2: マイグレーション実行
-- ============================================

-- conversationsテーブルにlast_updated_atカラムを追加
-- 前回のユーザーメッセージ送信時刻を記録（UTCで保存）
ALTER TABLE conversations ADD COLUMN last_updated_at DATETIME;

-- conversationsテーブルにconversation_summaryカラムを追加
-- 前回の会話要約を保存（100〜200文字程度）
ALTER TABLE conversations ADD COLUMN conversation_summary TEXT;

-- 既存データへの初期値設定
-- last_updated_atには、各ユーザー・キャラクター組み合わせの最新のユーザーメッセージのtimestampを設定
-- または、created_atが存在する場合はそれを使用
UPDATE conversations
SET last_updated_at = COALESCE(timestamp, created_at)
WHERE role = 'user' AND last_updated_at IS NULL;

-- インデックスを追加（訪問パターン判定の高速化）
CREATE INDEX IF NOT EXISTS idx_conversations_last_updated 
ON conversations(user_id, character_id, last_updated_at DESC);

-- ============================================
-- ステップ3: マイグレーション後の確認
-- ============================================
-- 以下のコマンドでマイグレーションが成功したことを確認してください:
-- PRAGMA table_info(conversations);  -- last_updated_atとconversation_summaryカラムが追加されていることを確認
-- SELECT COUNT(*) FROM conversations WHERE last_updated_at IS NOT NULL;  -- 既存データに初期値が設定されていることを確認
-- SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='conversations';  -- インデックスが作成されていることを確認

-- ============================================
-- ロールバック手順（問題が発生した場合）
-- ============================================
-- 注意: SQLiteではALTER TABLEで追加したカラムを削除することはできません
-- ロールバックが必要な場合は、バックアップからテーブル全体を復元してください:
-- DROP TABLE IF EXISTS conversations;
-- CREATE TABLE conversations AS SELECT * FROM conversations_backup;
-- -- その後、schema.sqlからインデックス定義を再実行
