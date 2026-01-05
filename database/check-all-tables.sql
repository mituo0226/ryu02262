-- ============================================
-- データベースのすべてのテーブルとカラムを確認するSQL
-- ============================================

-- ============================================
-- 1. すべてのテーブル一覧を取得
-- ============================================
SELECT 
    name AS table_name,
    type,
    sql
FROM sqlite_master
WHERE type = 'table'
ORDER BY name;

-- ============================================
-- 2. 各テーブルのカラム情報を取得（詳細）
-- ============================================

-- usersテーブルの構造
PRAGMA table_info(users);

-- conversationsテーブルの構造
PRAGMA table_info(conversations);

-- ============================================
-- 3. すべてのテーブルとカラムを一覧表示（統合版）
-- ============================================
SELECT 
    m.name AS table_name,
    p.cid AS column_id,
    p.name AS column_name,
    p.type AS column_type,
    p.notnull AS not_null,
    p.dflt_value AS default_value,
    p.pk AS is_primary_key
FROM sqlite_master m
LEFT JOIN pragma_table_info(m.name) p ON 1=1
WHERE m.type = 'table'
ORDER BY m.name, p.cid;

-- ============================================
-- 4. インデックス情報も確認したい場合
-- ============================================
SELECT 
    name AS index_name,
    tbl_name AS table_name,
    sql
FROM sqlite_master
WHERE type = 'index'
ORDER BY tbl_name, name;

-- ============================================
-- 5. 外部キー制約を確認したい場合
-- ============================================
-- 注意: SQLiteでは外部キー制約は有効化されていない場合があります
SELECT 
    m.name AS table_name,
    p.*
FROM sqlite_master m
LEFT JOIN pragma_foreign_key_list(m.name) p ON 1=1
WHERE m.type = 'table'
ORDER BY m.name;
