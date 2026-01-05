-- ============================================
-- データベースのすべてのテーブルとカラムを確認するSQL（修正版）
-- Cloudflare D1コンソールで実行してください
-- ============================================

-- ============================================
-- ステップ1: すべてのテーブル一覧を取得
-- ============================================
SELECT 
    name AS table_name,
    type,
    sql
FROM sqlite_master
WHERE type = 'table'
ORDER BY name;

-- ============================================
-- ステップ2: 各テーブルの構造を個別に確認
-- ============================================

-- usersテーブルの構造
PRAGMA table_info(users);

-- conversationsテーブルの構造
PRAGMA table_info(conversations);

-- ============================================
-- ステップ3: インデックス情報を確認
-- ============================================
SELECT 
    name AS index_name,
    tbl_name AS table_name,
    sql
FROM sqlite_master
WHERE type = 'index'
ORDER BY tbl_name, name;
