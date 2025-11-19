-- ============================================
-- Cloudflare D1 データベース マイグレーションSQL
-- 会話履歴テーブルの再設計
-- ============================================
-- 
-- 【実行前の確認事項】
-- 1. 本番環境では必ずバックアップを取得してください
-- 2. テスト環境で先に実行して動作確認してください
-- 3. ダウンタイムを考慮して実行時間を計画してください
--
-- 【実行手順】
-- 1. Cloudflare Dashboard > Workers & Pages > D1 > データベースを選択
-- 2. "Query" タブを開く
-- 3. 以下のSQLを順番に実行してください
-- ============================================

-- ============================================
-- ステップ1: 既存テーブルの確認
-- ============================================
-- まず、既存のテーブル構造を確認してください
-- （このクエリは実行のみで、変更は行いません）

-- SELECT sql FROM sqlite_master WHERE type='table' AND name='conversations';

-- ============================================
-- ステップ2: バックアップテーブルの作成（推奨）
-- ============================================
-- 本番環境では必ず実行してください

CREATE TABLE IF NOT EXISTS conversations_backup AS 
SELECT * FROM conversations;

-- バックアップの確認
-- SELECT COUNT(*) as backup_count FROM conversations_backup;

-- ============================================
-- ステップ3: 新しいカラムの追加
-- ============================================
-- 既存のテーブルに新しいカラムを追加します

-- 3-1. timestampカラムの追加（既存のcreated_atをコピー）
ALTER TABLE conversations ADD COLUMN timestamp DATETIME;

-- 3-2. message_typeカラムの追加
ALTER TABLE conversations ADD COLUMN message_type TEXT DEFAULT 'normal';

-- 3-3. is_guest_messageカラムの追加
ALTER TABLE conversations ADD COLUMN is_guest_message INTEGER DEFAULT 0;

-- 注意: Cloudflare D1ではBOOLEAN型はINTEGERとして扱われます（0または1）

-- ============================================
-- ステップ4: 既存データの移行
-- ============================================
-- 既存のデータを新しいカラムに移行します

-- 4-1. timestampにcreated_atの値をコピー
UPDATE conversations 
SET timestamp = created_at 
WHERE timestamp IS NULL;

-- 4-2. message_typeにデフォルト値を設定
UPDATE conversations 
SET message_type = 'normal' 
WHERE message_type IS NULL;

-- 4-3. is_guest_messageにデフォルト値を設定
UPDATE conversations 
SET is_guest_message = 0 
WHERE is_guest_message IS NULL;

-- ============================================
-- ステップ5: カラム名の変更（オプション）
-- ============================================
-- 注意: SQLiteではALTER TABLEでカラム名の変更ができないため、
-- 新しいテーブルを作成してデータを移行する必要があります
-- 
-- 既存のコードが`message`カラムを使用している場合は、
-- このステップはスキップして、アプリケーション側で`content`として扱うようにしてください
--
-- または、以下の手順でテーブルを再作成します（データ量が多い場合は時間がかかります）

-- 5-1. 新しいテーブル構造で一時テーブルを作成
-- CREATE TABLE conversations_new (
--   id INTEGER PRIMARY KEY AUTOINCREMENT,
--   user_id INTEGER NOT NULL,
--   character_id TEXT NOT NULL,
--   role TEXT NOT NULL,
--   content TEXT NOT NULL,
--   timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
--   message_type TEXT DEFAULT 'normal',
--   is_guest_message INTEGER DEFAULT 0,
--   created_at DATETIME DEFAULT CURRENT_TIMESTAMP
-- );

-- 5-2. 既存データを新しいテーブルにコピー
-- INSERT INTO conversations_new (
--   id, user_id, character_id, role, content, 
--   timestamp, message_type, is_guest_message, created_at
-- )
-- SELECT 
--   id, user_id, character_id, role, 
--   message as content,  -- messageカラムをcontentとしてコピー
--   COALESCE(timestamp, created_at) as timestamp,
--   COALESCE(message_type, 'normal') as message_type,
--   COALESCE(is_guest_message, 0) as is_guest_message,
--   created_at
-- FROM conversations;

-- 5-3. 既存テーブルを削除
-- DROP TABLE conversations;

-- 5-4. 新しいテーブルをリネーム
-- ALTER TABLE conversations_new RENAME TO conversations;

-- ============================================
-- ステップ6: インデックスの作成
-- ============================================
-- パフォーマンス向上のためのインデックスを作成します

-- 6-1. メインインデックス: ユーザー・鑑定士・タイムスタンプでの高速検索
CREATE INDEX IF NOT EXISTS idx_conversations_user_character_timestamp 
ON conversations(user_id, character_id, timestamp DESC);

-- 6-2. パフォーマンスインデックス: ユーザー・鑑定士での高速検索
CREATE INDEX IF NOT EXISTS idx_conversations_user_character 
ON conversations(user_id, character_id);

-- 6-3. クリーンアップ用インデックス: タイムスタンプ基準での古いメッセージ削除
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp 
ON conversations(timestamp);

-- 6-4. ゲストメッセージ検索用インデックス（部分インデックスはSQLiteではサポートされていないため、通常のインデックス）
CREATE INDEX IF NOT EXISTS idx_conversations_guest 
ON conversations(user_id, character_id, is_guest_message);

-- ============================================
-- ステップ7: データ整合性の確認
-- ============================================
-- マイグレーション後のデータ整合性を確認します

-- 7-1. 総メッセージ数の確認
-- SELECT COUNT(*) as total_messages FROM conversations;

-- 7-2. NULL値のチェック
-- SELECT 
--   COUNT(*) as total,
--   SUM(CASE WHEN timestamp IS NULL THEN 1 ELSE 0 END) as null_timestamp,
--   SUM(CASE WHEN message_type IS NULL THEN 1 ELSE 0 END) as null_message_type,
--   SUM(CASE WHEN is_guest_message IS NULL THEN 1 ELSE 0 END) as null_is_guest_message
-- FROM conversations;

-- 7-3. 各ユーザー・鑑定士のメッセージ数確認
-- SELECT 
--   user_id,
--   character_id,
--   COUNT(*) as message_count
-- FROM conversations
-- GROUP BY user_id, character_id
-- ORDER BY message_count DESC
-- LIMIT 10;

-- 7-4. 100件を超えている組み合わせの確認
-- SELECT 
--   user_id,
--   character_id,
--   COUNT(*) as message_count
-- FROM conversations
-- GROUP BY user_id, character_id
-- HAVING COUNT(*) > 100
-- ORDER BY message_count DESC;

-- ============================================
-- ステップ8: 既存のインデックス確認（オプション）
-- ============================================
-- 既存のインデックスを確認して、不要なものがあれば削除できます

-- SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='conversations';

-- ============================================
-- 完了後の確認
-- ============================================
-- マイグレーションが正常に完了したことを確認してください

-- テーブル構造の確認
-- PRAGMA table_info(conversations);

-- インデックスの確認
-- SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='conversations';

-- ============================================
-- ロールバック手順（問題が発生した場合）
-- ============================================
-- 問題が発生した場合は、バックアップから復元できます

-- 1. 既存テーブルを削除
-- DROP TABLE IF EXISTS conversations;

-- 2. バックアップから復元
-- CREATE TABLE conversations AS SELECT * FROM conversations_backup;

-- 3. インデックスを再作成（必要に応じて）

