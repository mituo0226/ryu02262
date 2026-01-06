-- ============================================
-- user_typeカラムを削除するマイグレーションSQL
-- ============================================
-- 
-- 【注意事項】
-- 1. 本番環境では必ずバックアップを取得してください
-- 2. テスト環境で先に実行して動作確認してください
-- 3. SQLiteではカラムの直接削除ができないため、テーブルの再作成が必要です
-- ============================================

-- ============================================
-- ステップ1: バックアップテーブルの作成（必須）
-- ============================================
CREATE TABLE IF NOT EXISTS users_backup AS 
SELECT * FROM users;

-- バックアップの確認
-- SELECT COUNT(*) as backup_count FROM users_backup;

-- ============================================
-- ステップ2: 新しいテーブル構造でテーブルを作成
-- ============================================
-- user_typeカラムを含まない新しいテーブルを作成

CREATE TABLE IF NOT EXISTS users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT,
  birth_year INTEGER,
  birth_month INTEGER,
  birth_day INTEGER,
  passphrase TEXT NOT NULL DEFAULT '',
  guardian TEXT,
  gender TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ステップ3: 既存データの移行
-- ============================================
-- user_typeカラムを除いてデータをコピー

INSERT INTO users_new (
  id,
  nickname,
  birth_year,
  birth_month,
  birth_day,
  passphrase,
  guardian,
  gender,
  created_at,
  updated_at,
  last_activity_at
)
SELECT 
  id,
  nickname,
  birth_year,
  birth_month,
  birth_day,
  COALESCE(passphrase, '') as passphrase,
  guardian,
  gender,
  created_at,
  updated_at,
  last_activity_at
FROM users;

-- データ移行の確認
-- SELECT COUNT(*) as new_count FROM users_new;
-- SELECT COUNT(*) as old_count FROM users;

-- ============================================
-- ステップ4: インデックスの再作成
-- ============================================
-- 必要に応じてインデックスを再作成

-- nicknameでの検索用インデックス
CREATE INDEX IF NOT EXISTS idx_users_nickname ON users_new(nickname);

-- 生年月日での検索用インデックス
CREATE INDEX IF NOT EXISTS idx_users_birth_date ON users_new(birth_year, birth_month, birth_day);

-- last_activity_atでの検索用インデックス
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users_new(last_activity_at);

-- ============================================
-- ステップ5: 既存テーブルの削除とリネーム
-- ============================================
-- 【重要】このステップは慎重に実行してください

-- 既存テーブルを削除
DROP TABLE IF EXISTS users;

-- 新しいテーブルをusersにリネーム
ALTER TABLE users_new RENAME TO users;

-- ============================================
-- ステップ6: 確認クエリ
-- ============================================
-- テーブル構造の確認
-- PRAGMA table_info(users);

-- データ数の確認
-- SELECT COUNT(*) as total_users FROM users;

-- サンプルデータの確認
-- SELECT id, nickname, birth_year, birth_month, birth_day, guardian, gender FROM users LIMIT 5;
