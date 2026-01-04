-- ============================================
-- Cloudflare D1 データベーススキーマ
-- 会話履歴管理システム
-- ============================================

-- ============================================
-- 1. ユーザーテーブル（統一設計）
-- ============================================
-- 注意: 既存のusersテーブルがある場合は、migrate-to-unified-users.sqlを実行して
-- 新しいカラムを追加してください

-- CREATE TABLE IF NOT EXISTS users (
--   id INTEGER PRIMARY KEY AUTOINCREMENT,
--   user_type TEXT NOT NULL DEFAULT 'registered', -- 'guest' | 'registered'
--   ip_address TEXT,  -- ゲストユーザー識別用
--   session_id TEXT,  -- ゲストユーザー識別用（ブラウザセッション）
--   nickname TEXT,    -- 登録ユーザーのみ（ゲストはNULL）
--   birth_year INTEGER,
--   birth_month INTEGER,
--   birth_day INTEGER,
--   assigned_deity TEXT,  -- 登録ユーザーのみ（ゲストはNULL）
--   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--   updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--   last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP
-- );
--
-- CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
-- CREATE INDEX IF NOT EXISTS idx_users_session_id ON users(session_id) WHERE session_id IS NOT NULL;
-- CREATE INDEX IF NOT EXISTS idx_users_ip_address ON users(ip_address) WHERE ip_address IS NOT NULL;

-- ============================================
-- 2. 会話履歴テーブル（新規設計）
-- ============================================

-- 既存テーブルの削除（開発環境のみ・本番では慎重に）
-- DROP TABLE IF EXISTS conversations_old;

-- 既存テーブルのバックアップ（マイグレーション時）
-- CREATE TABLE conversations_backup AS SELECT * FROM conversations;

-- 新しい会話履歴テーブルの作成
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  character_id TEXT NOT NULL CHECK(character_id IN ('kaede', 'yukino', 'sora', 'kaon')),
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  message_type TEXT DEFAULT 'normal' CHECK(message_type IN ('normal', 'system', 'warning')),
  is_guest_message BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- 外部キー制約（Cloudflare D1では外部キー制約はサポートされていないため、アプリケーション側で管理）
  -- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  
  -- 複合インデックス用のカラム（暗黙的にインデックスが作成される）
);

-- ============================================
-- 3. インデックス設計
-- ============================================

-- メインインデックス: ユーザー・鑑定士・タイムスタンプでの高速検索
CREATE INDEX IF NOT EXISTS idx_conversations_user_character_timestamp 
ON conversations(user_id, character_id, timestamp DESC);

-- パフォーマンスインデックス: ユーザー・鑑定士での高速検索
CREATE INDEX IF NOT EXISTS idx_conversations_user_character 
ON conversations(user_id, character_id);

-- クリーンアップ用インデックス: タイムスタンプ基準での古いメッセージ削除
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp 
ON conversations(timestamp);

-- ゲストメッセージ検索用インデックス
CREATE INDEX IF NOT EXISTS idx_conversations_guest 
ON conversations(user_id, character_id, is_guest_message) 
WHERE is_guest_message = 1;

-- ============================================
-- 4. ビュー（オプション・パフォーマンス向上用）
-- ============================================

-- 各ユーザー・鑑定士の最新会話日時ビュー
CREATE VIEW IF NOT EXISTS v_last_conversations AS
SELECT 
  user_id,
  character_id,
  MAX(timestamp) as last_conversation_date,
  COUNT(*) as message_count
FROM conversations
GROUP BY user_id, character_id;

-- 各ユーザー・鑑定士のメッセージ数ビュー
CREATE VIEW IF NOT EXISTS v_conversation_counts AS
SELECT 
  user_id,
  character_id,
  COUNT(*) as total_messages,
  SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as user_messages,
  SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as assistant_messages
FROM conversations
GROUP BY user_id, character_id;

-- ============================================
-- 5. トリガー（100件制限の自動管理）
-- ============================================
-- 注意: Cloudflare D1ではトリガーがサポートされていないため、
-- アプリケーション側（API）で実装する必要があります

-- ============================================
-- 6. 初期データ（テスト用・オプション）
-- ============================================
-- INSERT INTO conversations (user_id, character_id, role, content, message_type)
-- VALUES 
--   (1, 'kaede', 'user', 'テストメッセージ1', 'normal'),
--   (1, 'kaede', 'assistant', 'テスト応答1', 'normal');

