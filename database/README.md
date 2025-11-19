# データベース設計ドキュメント

## 概要

Cloudflare D1データベースを使用した会話履歴管理システムの設計ドキュメントです。

## テーブル構造

### conversations テーブル

会話履歴を管理するメインテーブルです。

#### カラム定義

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | メッセージID |
| user_id | INTEGER | NOT NULL | ユーザーID（usersテーブル参照） |
| character_id | TEXT | NOT NULL, CHECK | 鑑定士ID（'kaede', 'yukino', 'sora', 'kaon'） |
| role | TEXT | NOT NULL, CHECK | メッセージの役割（'user', 'assistant'） |
| content | TEXT | NOT NULL | メッセージ内容 |
| timestamp | DATETIME | DEFAULT CURRENT_TIMESTAMP | メッセージ送信日時 |
| message_type | TEXT | DEFAULT 'normal', CHECK | メッセージタイプ（'normal', 'system', 'warning'） |
| is_guest_message | BOOLEAN | DEFAULT 0 | ゲストメッセージフラグ |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | レコード作成日時 |

#### インデックス

1. **idx_conversations_user_character_timestamp**
   - `(user_id, character_id, timestamp DESC)`
   - メイン検索用インデックス

2. **idx_conversations_user_character**
   - `(user_id, character_id)`
   - パフォーマンス最適化用

3. **idx_conversations_timestamp**
   - `(timestamp)`
   - クリーンアップ用

4. **idx_conversations_guest**
   - `(user_id, character_id, is_guest_message)`
   - ゲストメッセージ検索用

## ビジネスロジック

### 100件制限

- 1ユーザー・1鑑定士あたり最大100件のメッセージを保持
- 100件を超える場合は、古いメッセージから自動削除
- 削除処理はメッセージ追加時に自動実行

### ゲストメッセージ

- ゲストユーザーのメッセージは`is_guest_message = 1`で保存
- ユーザー登録後、ゲストメッセージを通常メッセージに変換可能
- 変換処理は`UPDATE`クエリで実行

## API仕様

### メッセージ保存

**エンドポイント:** `POST /api/conversation`

**リクエストボディ:**
```json
{
  "userToken": "string",
  "character": "kaede",
  "role": "user",
  "content": "メッセージ内容",
  "messageType": "normal",
  "isGuestMessage": false
}
```

**レスポンス:**
```json
{
  "success": true,
  "messageId": 123,
  "message": "Message saved successfully"
}
```

### 履歴取得

**エンドポイント:** `GET /api/conversation-history`

**クエリパラメータ:**
- `userToken`: ユーザートークン（必須）
- `character`: 鑑定士ID（オプション、デフォルト: 'kaede'）
- `limit`: 取得件数（オプション、デフォルト: 100）

**レスポンス:**
```json
{
  "success": true,
  "messages": [
    {
      "id": 1,
      "role": "user",
      "content": "メッセージ内容",
      "timestamp": "2024-01-01T00:00:00Z",
      "message_type": "normal",
      "is_guest_message": 0
    }
  ],
  "character": "kaede",
  "hasHistory": true
}
```

### クリーンアップ

**エンドポイント:** `POST /api/cleanup-conversations`

**リクエストボディ:**
```json
{
  "mode": "auto",
  "daysOld": 90
}
```

**モード:**
- `auto`: 100件制限 + 日付基準の両方を適用
- `limit`: 100件制限のみ適用
- `date`: 日付基準のみ適用

## マイグレーション手順

1. **バックアップ取得**
   ```sql
   CREATE TABLE conversations_backup AS SELECT * FROM conversations;
   ```

2. **新しいカラム追加**
   ```sql
   ALTER TABLE conversations ADD COLUMN timestamp DATETIME;
   ALTER TABLE conversations ADD COLUMN message_type TEXT DEFAULT 'normal';
   ALTER TABLE conversations ADD COLUMN is_guest_message BOOLEAN DEFAULT 0;
   ```

3. **データ移行**
   ```sql
   UPDATE conversations SET timestamp = created_at WHERE timestamp IS NULL;
   UPDATE conversations SET message_type = 'normal' WHERE message_type IS NULL;
   UPDATE conversations SET is_guest_message = 0 WHERE is_guest_message IS NULL;
   ```

4. **インデックス作成**
   - `schema.sql`のインデックス定義を実行

5. **検証**
   - データ整合性チェック
   - パフォーマンステスト

## パフォーマンス最適化

### クエリ最適化

- インデックスを活用した高速検索
- LIMIT句による取得件数制限
- バッチ処理による効率的な削除

### ストレージ効率

- メッセージ内容の圧縮（将来実装）
- 古いメッセージのアーカイブ（将来実装）

## 監視・ロギング

### 監視項目

- テーブルサイズ
- メッセージ数
- 100件制限を超えている組み合わせ数
- クリーンアップ実行時間

### ログ出力

- エラーログ
- パフォーマンスログ
- クリーンアップ統計

## テスト

### 単体テスト

- メッセージ追加・取得の正常系
- 100件制限の境界値テスト
- 同時実行時の整合性テスト

### 統合テスト

- API連携テスト
- フロントエンド連携テスト
- エラーハンドリングテスト

## セキュリティ

### 認証・認可

- ユーザートークンによる認証
- 管理者認証によるクリーンアップ実行

### データ保護

- SQLインジェクション対策（プリペアドステートメント）
- XSS対策（コンテンツのサニタイズ）

## 今後の拡張

- メッセージ圧縮機能
- アーカイブ機能
- 分析・レポート機能
- 管理画面連携

