# Cloudflare D1 マイグレーション手順書

## 概要

会話履歴テーブル（`conversations`）に新しいカラムを追加し、インデックスを作成するマイグレーション手順です。

## 前提条件

- Cloudflare D1データベースが既に作成されていること
- `conversations`テーブルが既に存在すること
- 既存のテーブル構造：
  - `id` (INTEGER PRIMARY KEY)
  - `user_id` (INTEGER)
  - `character_id` (TEXT)
  - `role` (TEXT)
  - `message` (TEXT) - または `content` (TEXT)
  - `created_at` (DATETIME)

## マイグレーション方法

### 方法1: クイックマイグレーション（推奨）

既存の`message`カラムをそのまま使用し、新しいカラムのみ追加する方法です。
アプリケーション側で`message`を`content`として扱うようにコードを修正済みです。

**使用ファイル:** `database/cloudflare-d1-quick-migration.sql`

**実行手順:**
1. Cloudflare Dashboardにログイン
2. Workers & Pages > D1 を選択
3. 対象のデータベースを選択
4. "Query" タブを開く
5. `cloudflare-d1-quick-migration.sql`の内容をコピー＆ペースト
6. 実行ボタンをクリック

### 方法2: 完全マイグレーション

`message`カラムを`content`に変更する完全なマイグレーションです。
データ量が多い場合は時間がかかる可能性があります。

**使用ファイル:** `database/cloudflare-d1-migration.sql`

**実行手順:**
1. バックアップを取得（必須）
2. ステップ1〜4を順番に実行
3. ステップ5（カラム名変更）はオプション
4. ステップ6（インデックス作成）を実行
5. ステップ7（データ整合性確認）で検証

## 追加されるカラム

1. **timestamp** (DATETIME)
   - メッセージ送信日時
   - 初期値: `created_at`の値がコピーされます

2. **message_type** (TEXT)
   - メッセージタイプ（'normal', 'system', 'warning'）
   - デフォルト値: 'normal'

3. **is_guest_message** (INTEGER)
   - ゲストメッセージフラグ（0または1）
   - デフォルト値: 0

## 作成されるインデックス

1. **idx_conversations_user_character_timestamp**
   - `(user_id, character_id, timestamp DESC)`
   - メイン検索用

2. **idx_conversations_user_character**
   - `(user_id, character_id)`
   - パフォーマンス最適化用

3. **idx_conversations_timestamp**
   - `(timestamp)`
   - クリーンアップ用

4. **idx_conversations_guest**
   - `(user_id, character_id, is_guest_message)`
   - ゲストメッセージ検索用

## 実行前の確認事項

- [ ] バックアップを取得済み
- [ ] テスト環境で動作確認済み
- [ ] ダウンタイムの計画が完了
- [ ] ロールバック手順を確認済み

## 実行後の確認

以下のクエリでマイグレーションが正常に完了したことを確認してください：

```sql
-- テーブル構造の確認
PRAGMA table_info(conversations);

-- データ数の確認
SELECT COUNT(*) as total_messages FROM conversations;

-- NULL値の確認（すべて0であることを確認）
SELECT 
  SUM(CASE WHEN timestamp IS NULL THEN 1 ELSE 0 END) as null_timestamp,
  SUM(CASE WHEN message_type IS NULL THEN 1 ELSE 0 END) as null_message_type,
  SUM(CASE WHEN is_guest_message IS NULL THEN 1 ELSE 0 END) as null_is_guest_message
FROM conversations;

-- インデックスの確認
SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='conversations';
```

## トラブルシューティング

### エラー: "duplicate column name"

既にカラムが存在する場合に発生します。
該当する`ALTER TABLE`文をスキップして続行してください。

### エラー: "no such table: conversations"

テーブルが存在しない場合に発生します。
まずテーブルを作成する必要があります（`database/schema.sql`を参照）。

### パフォーマンスの問題

データ量が多い場合、インデックスの作成に時間がかかることがあります。
時間帯を選んで実行するか、バッチ処理を検討してください。

## ロールバック手順

問題が発生した場合は、以下の手順でロールバックできます：

```sql
-- 1. 既存テーブルを削除
DROP TABLE IF EXISTS conversations;

-- 2. バックアップから復元
CREATE TABLE conversations AS SELECT * FROM conversations_backup;

-- 3. インデックスを再作成（必要に応じて）
```

## サポート

問題が発生した場合は、以下を確認してください：
- Cloudflare D1のログ
- エラーメッセージの詳細
- バックアップテーブルの内容

