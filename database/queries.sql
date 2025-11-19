-- ============================================
-- 基本CRUD操作クエリ集
-- ============================================

-- ============================================
-- 1. メッセージ追加（INSERT）
-- ============================================

-- 通常メッセージの追加
-- INSERT INTO conversations (user_id, character_id, role, content, message_type, is_guest_message)
-- VALUES (?, ?, ?, ?, 'normal', 0);

-- ゲストメッセージの追加
-- INSERT INTO conversations (user_id, character_id, role, content, message_type, is_guest_message)
-- VALUES (?, ?, ?, ?, 'normal', 1);

-- システムメッセージの追加
-- INSERT INTO conversations (user_id, character_id, role, content, message_type, is_guest_message)
-- VALUES (?, ?, ?, ?, 'system', 0);

-- ============================================
-- 2. 履歴取得（SELECT）
-- ============================================

-- 特定ユーザー・鑑定士の会話履歴取得（最新順・最大100件）
-- SELECT 
--   id,
--   role,
--   content,
--   timestamp,
--   message_type,
--   is_guest_message
-- FROM conversations
-- WHERE user_id = ? AND character_id = ?
-- ORDER BY timestamp ASC
-- LIMIT 100;

-- 特定ユーザー・鑑定士の最新N件の会話履歴取得
-- SELECT 
--   id,
--   role,
--   content,
--   timestamp,
--   message_type
-- FROM conversations
-- WHERE user_id = ? AND character_id = ?
-- ORDER BY timestamp DESC
-- LIMIT ?;

-- 特定ユーザー・鑑定士の会話履歴取得（時系列順・最新20件）
-- SELECT 
--   role,
--   content,
--   timestamp
-- FROM conversations
-- WHERE user_id = ? AND character_id = ?
-- ORDER BY timestamp DESC
-- LIMIT 20;

-- ============================================
-- 3. メッセージ数カウント（COUNT）
-- ============================================

-- 特定ユーザー・鑑定士のメッセージ数
-- SELECT COUNT(*) as message_count
-- FROM conversations
-- WHERE user_id = ? AND character_id = ?;

-- 特定ユーザー・鑑定士のメッセージ数（100件制限チェック用）
-- SELECT COUNT(*) as message_count
-- FROM conversations
-- WHERE user_id = ? AND character_id = ?
-- HAVING COUNT(*) >= 100;

-- 全ユーザーのメッセージ数統計
-- SELECT 
--   user_id,
--   character_id,
--   COUNT(*) as message_count
-- FROM conversations
-- GROUP BY user_id, character_id
-- ORDER BY message_count DESC;

-- ============================================
-- 4. 古いメッセージ削除（DELETE）
-- ============================================

-- 特定ユーザー・鑑定士の100件を超える古いメッセージを削除
-- DELETE FROM conversations
-- WHERE id IN (
--   SELECT id FROM conversations
--   WHERE user_id = ? AND character_id = ?
--   ORDER BY timestamp ASC
--   LIMIT (SELECT COUNT(*) - 100 FROM conversations WHERE user_id = ? AND character_id = ?)
-- );

-- より効率的な削除方法（ROWIDを使用）
-- DELETE FROM conversations
-- WHERE user_id = ? AND character_id = ?
-- AND id NOT IN (
--   SELECT id FROM conversations
--   WHERE user_id = ? AND character_id = ?
--   ORDER BY timestamp DESC
--   LIMIT 100
-- );

-- 特定日時より古いメッセージを削除（クリーンアップ用）
-- DELETE FROM conversations
-- WHERE timestamp < datetime('now', '-30 days');

-- ============================================
-- 5. 更新操作（UPDATE）
-- ============================================

-- ゲストメッセージを通常メッセージに変換（登録後）
-- UPDATE conversations
-- SET is_guest_message = 0
-- WHERE user_id = ? AND character_id = ? AND is_guest_message = 1;

-- メッセージタイプの更新
-- UPDATE conversations
-- SET message_type = ?
-- WHERE id = ?;

-- ============================================
-- 6. 統計・分析クエリ
-- ============================================

-- 各鑑定士の会話数統計
-- SELECT 
--   character_id,
--   COUNT(*) as total_messages,
--   COUNT(DISTINCT user_id) as unique_users,
--   AVG(LENGTH(content)) as avg_message_length
-- FROM conversations
-- GROUP BY character_id;

-- ユーザーごとの会話数統計
-- SELECT 
--   user_id,
--   COUNT(DISTINCT character_id) as characters_used,
--   COUNT(*) as total_messages,
--   MIN(timestamp) as first_conversation,
--   MAX(timestamp) as last_conversation
-- FROM conversations
-- GROUP BY user_id
-- ORDER BY total_messages DESC;

-- 日別のメッセージ数統計
-- SELECT 
--   DATE(timestamp) as date,
--   COUNT(*) as message_count
-- FROM conversations
-- GROUP BY DATE(timestamp)
-- ORDER BY date DESC
-- LIMIT 30;

-- ============================================
-- 7. パフォーマンス最適化クエリ
-- ============================================

-- インデックスの使用状況確認（EXPLAIN QUERY PLAN）
-- EXPLAIN QUERY PLAN
-- SELECT * FROM conversations
-- WHERE user_id = ? AND character_id = ?
-- ORDER BY timestamp DESC
-- LIMIT 20;

-- テーブルサイズ確認
-- SELECT 
--   COUNT(*) as row_count,
--   SUM(LENGTH(content)) as total_content_size,
--   AVG(LENGTH(content)) as avg_content_size
-- FROM conversations;

