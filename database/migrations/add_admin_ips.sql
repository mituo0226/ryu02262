-- ============================================
-- admin_ips テーブル
-- 管理者用アクセスIPアドレスを管理
-- ============================================

CREATE TABLE IF NOT EXISTS admin_ips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT NOT NULL UNIQUE,
  description TEXT,           -- 用途や説明（例：「オフィスPC」「自宅」）
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- インデックス
-- ============================================

CREATE INDEX IF NOT EXISTS idx_admin_ips_ip_address 
ON admin_ips(ip_address);

CREATE INDEX IF NOT EXISTS idx_admin_ips_is_active 
ON admin_ips(is_active);

-- ============================================
-- 初期データ（開発環境用）
-- ============================================

-- 既に存在する場合はスキップ
INSERT OR IGNORE INTO admin_ips (ip_address, description, is_active)
VALUES 
  ('127.0.0.1', 'ローカルホスト', 1),
  ('::1', 'IPv6 ローカルホスト', 1);
