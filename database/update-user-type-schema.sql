-- ============================================
-- user_typeカラムを更新するマイグレーションSQL
-- 3種類のユーザータイプに対応: 'guest', 'ad-guest', 'user'
-- デフォルト値: 'guest'
-- ============================================
-- 
-- 【注意事項】
-- 1. 本番環境では必ずバックアップを取得してください
-- 2. テスト環境で先に実行して動作確認してください
-- ============================================

-- ============================================
-- ステップ1: バックアップテーブルの作成（必須）
-- ============================================
CREATE TABLE IF NOT EXISTS users_backup AS 
SELECT * FROM users;

-- バックアップの確認
-- SELECT COUNT(*) as backup_count FROM users_backup;

-- ============================================
-- ステップ2: user_typeカラムの確認
-- ============================================
-- 現在のuser_typeカラムの状態を確認
SELECT 
  name,
  type,
  dflt_value
FROM pragma_table_info('users')
WHERE name = 'user_type';

-- ============================================
-- ステップ3: user_typeカラムが存在しない場合は追加
-- ============================================
-- カラムが存在しない場合のみ追加（エラーを避けるため）
-- 注意: SQLiteではIF NOT EXISTSが使えないため、事前に確認が必要

-- user_typeカラムを追加（存在しない場合）
-- デフォルト値を'guest'に設定
ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT 'guest';

-- 既存のレコードでuser_typeがNULLの場合は'guest'に設定
UPDATE users SET user_type = 'guest' WHERE user_type IS NULL;

-- ============================================
-- ステップ4: 既存データの確認と更新
-- ============================================
-- 現在のuser_typeの分布を確認
SELECT 
  COALESCE(user_type, 'NULL') AS user_type_value,
  COUNT(*) AS user_count
FROM users
GROUP BY user_type
ORDER BY user_count DESC;

-- 既存の'registered'を'guest'に更新（必要に応じて）
-- UPDATE users SET user_type = 'guest' WHERE user_type = 'registered';

-- ============================================
-- ステップ5: インデックスの作成（存在しない場合）
-- ============================================
-- user_typeでの検索用インデックス
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);

-- ============================================
-- ステップ6: 確認クエリ
-- ============================================
-- テーブル構造の確認
-- PRAGMA table_info(users);

-- user_typeの分布確認
-- SELECT 
--   user_type,
--   COUNT(*) AS count
-- FROM users
-- GROUP BY user_type;

-- サンプルデータの確認
-- SELECT id, nickname, user_type, created_at FROM users LIMIT 5;
