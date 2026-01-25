# Cloudflare D1 データベースバックアップガイド

## 概要

Cloudflare D1データベースのバックアップ方法を説明します。マイグレーション実行前や重要な変更を行う前に、必ずバックアップを取得してください。

## バックアップ方法

### 方法1: SQLコマンドでバックアップテーブルを作成（推奨）

最も簡単で確実な方法です。既存のテーブルをコピーしてバックアップテーブルを作成します。

#### 手順

1. **Cloudflare Dashboardにアクセス**
   - [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン
   - **Workers & Pages** > **D1** を選択
   - 対象のデータベースを選択

2. **Queryタブを開く**
   - データベース詳細ページで **"Query"** タブをクリック

3. **バックアップテーブルを作成**
   
   **conversationsテーブルのバックアップ:**
   ```sql
   CREATE TABLE conversations_backup AS SELECT * FROM conversations;
   ```
   
   **usersテーブルのバックアップ:**
   ```sql
   CREATE TABLE users_backup AS SELECT * FROM users;
   ```
   
   **すべてのテーブルをバックアップ:**
   ```sql
   -- conversationsテーブル
   CREATE TABLE conversations_backup AS SELECT * FROM conversations;
   
   -- usersテーブル
   CREATE TABLE users_backup AS SELECT * FROM users;
   ```

4. **バックアップの確認**
   ```sql
   -- バックアップテーブルのレコード数を確認
   SELECT COUNT(*) as backup_count FROM conversations_backup;
   SELECT COUNT(*) as original_count FROM conversations;
   
   -- 両方の数が一致することを確認
   ```

#### メリット
- ✅ 簡単で確実
- ✅ データベース内に保存されるため、すぐに復元可能
- ✅ テーブル構造も含めて完全にコピー

#### デメリット
- ⚠️ データベースのストレージ容量を使用
- ⚠️ 手動で削除する必要がある

---

### 方法2: Wrangler CLIでエクスポート（本番環境推奨）

コマンドラインからデータベース全体をエクスポートする方法です。

#### 前提条件
- Wrangler CLIがインストールされていること
- データベースへのアクセス権限があること

#### 手順

1. **Wranglerでログイン**
   ```bash
   wrangler login
   ```

2. **データベースをエクスポート**
   ```bash
   # データベース名を確認（wrangler.tomlまたはCloudflare Dashboardで確認）
   wrangler d1 export <DATABASE_NAME> --output ./backup-$(date +%Y%m%d-%H%M%S).sql
   ```
   
   例:
   ```bash
   wrangler d1 export kaede-db --output ./backup-20241201-120000.sql
   ```

3. **エクスポートファイルの確認**
   ```bash
   # ファイルが作成されたことを確認
   ls -lh backup-*.sql
   ```

#### エクスポートファイルの内容
- テーブル定義（CREATE TABLE文）
- データ（INSERT文）
- インデックス定義

#### メリット
- ✅ ファイルとして保存できる
- ✅ バージョン管理システム（Git）に追加可能
- ✅ 別の環境にインポート可能

#### デメリット
- ⚠️ Wrangler CLIのセットアップが必要
- ⚠️ データ量が多い場合は時間がかかる

---

### 方法3: Cloudflare Dashboardから手動エクスポート

Cloudflare DashboardのUIから直接エクスポートする方法です。

#### 手順

1. **Cloudflare Dashboardにアクセス**
   - [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン
   - **Workers & Pages** > **D1** を選択
   - 対象のデータベースを選択

2. **エクスポート機能を使用**
   - データベース詳細ページで **"Export"** ボタンをクリック
   - SQLファイルがダウンロードされます

#### メリット
- ✅ GUI操作で簡単
- ✅ 追加ツール不要

#### デメリット
- ⚠️ データ量が多い場合は時間がかかる
- ⚠️ エクスポート機能が利用できない場合がある

---

## バックアップからの復元方法

### 方法1: バックアップテーブルから復元

SQLコマンドでバックアップテーブルから元のテーブルに復元します。

#### 手順

1. **既存テーブルを削除（注意: データが失われます）**
   ```sql
   DROP TABLE IF EXISTS conversations;
   ```

2. **バックアップテーブルから復元**
   ```sql
   CREATE TABLE conversations AS SELECT * FROM conversations_backup;
   ```

3. **インデックスを再作成**
   ```sql
   -- schema.sqlからインデックス定義を実行
   CREATE INDEX IF NOT EXISTS idx_conversations_user_character_timestamp 
   ON conversations(user_id, character_id, timestamp DESC);
   
   CREATE INDEX IF NOT EXISTS idx_conversations_user_character 
   ON conversations(user_id, character_id);
   
   -- その他のインデックスも同様に作成
   ```

### 方法2: SQLファイルからインポート

Wrangler CLIでエクスポートしたSQLファイルからインポートします。

#### 手順

1. **Wranglerでインポート**
   ```bash
   wrangler d1 execute <DATABASE_NAME> --file ./backup-20241201-120000.sql
   ```
   
   例:
   ```bash
   wrangler d1 execute kaede-db --file ./backup-20241201-120000.sql
   ```

2. **インポートの確認**
   ```sql
   SELECT COUNT(*) FROM conversations;
   SELECT COUNT(*) FROM users;
   ```

---

## バックアップのベストプラクティス

### 1. 定期的なバックアップ

- **マイグレーション前**: 必須
- **重要な変更前**: 推奨
- **定期的**: 週次または月次（データ量に応じて）

### 2. バックアップの命名規則

```
backup-YYYYMMDD-HHMMSS.sql
例: backup-20241201-120000.sql
```

### 3. バックアップの保存場所

- **ローカル**: 安全な場所に保存
- **クラウドストレージ**: Google Drive、Dropbox、S3など
- **バージョン管理**: Git（機密情報を含まない場合のみ）

### 4. バックアップの検証

バックアップ取得後、必ず以下を確認:

```sql
-- レコード数の確認
SELECT 
  (SELECT COUNT(*) FROM conversations) as original_count,
  (SELECT COUNT(*) FROM conversations_backup) as backup_count;

-- データの整合性確認（サンプル）
SELECT * FROM conversations LIMIT 5;
SELECT * FROM conversations_backup LIMIT 5;
```

### 5. バックアップテーブルのクリーンアップ

不要になったバックアップテーブルは削除:

```sql
DROP TABLE IF EXISTS conversations_backup;
DROP TABLE IF EXISTS users_backup;
```

---

## マイグレーション前のバックアップ手順（重要度フラグ追加の場合）

### 完全なバックアップ手順

1. **バックアップテーブルを作成**
   ```sql
   CREATE TABLE conversations_backup AS SELECT * FROM conversations;
   CREATE TABLE users_backup AS SELECT * FROM users;
   ```

2. **バックアップの確認**
   ```sql
   SELECT COUNT(*) FROM conversations_backup;
   SELECT COUNT(*) FROM conversations;
   ```

3. **マイグレーション実行**
   ```sql
   -- database/migrations/add_importance_flag.sql を実行
   ALTER TABLE conversations ADD COLUMN is_important INTEGER DEFAULT 0;
   CREATE INDEX IF NOT EXISTS idx_conversations_importance 
   ON conversations(user_id, character_id, is_important, created_at);
   ```

4. **マイグレーション後の確認**
   ```sql
   -- 新しいカラムが追加されたことを確認
   PRAGMA table_info(conversations);
   
   -- データが正しく保持されていることを確認
   SELECT COUNT(*) FROM conversations;
   ```

5. **問題が発生した場合のロールバック**
   ```sql
   -- 既存テーブルを削除
   DROP TABLE IF EXISTS conversations;
   
   -- バックアップから復元
   CREATE TABLE conversations AS SELECT * FROM conversations_backup;
   
   -- インデックスを再作成
   -- （schema.sqlからインデックス定義を実行）
   ```

---

## トラブルシューティング

### バックアップテーブルが作成できない

**エラー**: `table already exists`

**解決方法**:
```sql
-- 既存のバックアップテーブルを削除
DROP TABLE IF EXISTS conversations_backup;

-- 再度バックアップを作成
CREATE TABLE conversations_backup AS SELECT * FROM conversations;
```

### エクスポートが失敗する

**原因**: データベースへのアクセス権限がない、またはネットワークエラー

**解決方法**:
1. Wranglerで再ログイン: `wrangler login`
2. データベース名を確認
3. ネットワーク接続を確認

### インポートが失敗する

**原因**: SQLファイルの形式が正しくない、または制約違反

**解決方法**:
1. SQLファイルの内容を確認
2. エラーメッセージを確認
3. 段階的にインポート（テーブルごと）

---

## 参考リンク

- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

---

## まとめ

- **マイグレーション前**: 必ずバックアップを取得
- **推奨方法**: SQLコマンドでバックアップテーブルを作成（方法1）
- **本番環境**: Wrangler CLIでエクスポート（方法2）
- **バックアップ後**: 必ず検証を実施
- **不要になったら**: バックアップテーブルを削除してストレージを節約
