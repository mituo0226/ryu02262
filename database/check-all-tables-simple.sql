-- ============================================
-- データベースのすべてのテーブルとカラムを確認するSQL（簡易版）
-- Cloudflare D1コンソールで実行する場合は、このクエリを1つずつ実行してください
-- ============================================

-- 【推奨】すべてのテーブルとカラムを一覧表示（1つのクエリで確認可能）
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
