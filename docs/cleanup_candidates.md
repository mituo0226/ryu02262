# データベース・コード整理候補リスト（凍結ドキュメント）

## 目的

新設計（入口登録→全員users作成）への移行により、以下の要素が不要または使用頻度が低くなりました。本ドキュメントは、将来の保守作業で安全に削除・整理するための「凍結リスト」です。

**重要：この段階では削除SQLを実行しません。あくまで整理ドキュメントとして作成します。**

## 削除候補の一覧

### 1. `conversations.is_guest_message` カラム

| 項目 | 内容 |
|------|------|
| **候補名** | `conversations.is_guest_message` |
| **現在の役割** | ゲストユーザーのメッセージを識別するフラグ（0=通常、1=ゲスト） |
| **新設計では不要になる理由** | 新設計では全員が`users`テーブルに作成されるため、`user_type`で識別可能。`is_guest_message`で区別する必要がなくなる |
| **削除の難易度** | **Medium** - カラム削除は`ALTER TABLE`では不可。テーブル再作成が必要（SQLiteの制約） |
| **削除してよい判断基準** | <ul><li>新設計が2週間以上エラーなく稼働</li><li>コード内で`is_guest_message`への参照が0件（`grep -r "is_guest_message" functions/`で確認）</li><li>既存データがすべて0に統一されていることを確認</li><li>管理画面で`is_guest_message`を使用している機能がない</li></ul> |
| **現在の使用状況** | <ul><li>`consult.ts`で`saveUserMessage`と`saveAssistantMessage`内で常に`0`を設定（既に使用停止状態）</li><li>`clear-guest-sessions.ts`で`is_guest_message = 1`のメッセージを削除するクエリが存在（要修正）</li><li>`conversation.ts`で型定義に存在（要修正）</li></ul> |
| **注意事項** | SQLiteでは`ALTER TABLE DROP COLUMN`がサポートされていないため、テーブル再作成が必要。データ移行が必要 |

---

### 2. `idx_conversations_guest` インデックス

| 項目 | 内容 |
|------|------|
| **候補名** | `idx_conversations_guest` |
| **現在の役割** | `is_guest_message = 1`のメッセージを高速検索するためのインデックス |
| **新設計では不要になる理由** | `is_guest_message`カラム自体が不要になるため、このインデックスも不要 |
| **削除の難易度** | **Low** - `DROP INDEX`で簡単に削除可能 |
| **削除してよい判断基準** | <ul><li>`is_guest_message`カラムの削除が確定した時点</li><li>インデックスが使用されていないことを確認（クエリプランで確認）</li></ul> |
| **現在の使用状況** | スキーマ定義に存在するが、実際のクエリで使用されていない可能性が高い |
| **注意事項** | `is_guest_message`カラム削除前に削除しても問題なし（インデックスは独立している） |

---

### 3. `users.ip_address` カラム

| 項目 | 内容 |
|------|------|
| **候補名** | `users.ip_address` |
| **現在の役割** | ゲストユーザーの識別用（主キー用途は廃止済み） |
| **新設計では不要になる理由** | `session_id`が主キー用途になったため、`ip_address`は補助用途のみ。ただし、セキュリティ監査や不正アクセス検知などの用途で残す価値がある可能性 |
| **削除の難易度** | **Medium** - カラム削除はテーブル再作成が必要 |
| **削除してよい判断基準** | <ul><li>セキュリティ監査や不正アクセス検知の機能が不要と判断した場合</li><li>管理画面で`ip_address`を使用している機能がない</li><li>コード内で`ip_address`への参照が0件</li></ul> |
| **現在の使用状況** | `create-guest.ts`で保存されているが、主キー用途ではない（補助用途） |
| **推奨判断** | **残すことを推奨** - セキュリティ監査や不正アクセス検知の用途で残す価値がある。ただし、必須ではないため、将来的に削除しても問題なし |

---

### 4. `idx_users_ip_address` インデックス

| 項目 | 内容 |
|------|------|
| **候補名** | `idx_users_ip_address` |
| **現在の役割** | `ip_address`での高速検索用インデックス |
| **新設計では不要になる理由** | `ip_address`カラムが不要と判断された場合、このインデックスも不要 |
| **削除の難易度** | **Low** - `DROP INDEX`で簡単に削除可能 |
| **削除してよい判断基準** | <ul><li>`ip_address`カラムの削除が確定した時点</li><li>または、`ip_address`での検索が不要と判断した場合</li></ul> |
| **現在の使用状況** | スキーマ定義に存在するが、実際のクエリで使用されていない可能性が高い |
| **注意事項** | `ip_address`カラムを残す場合は、このインデックスも残すことを推奨（検索性能のため） |

---

### 5. `guest-limit-manager.js` ファイル（コード側）

| 項目 | 内容 |
|------|------|
| **候補名** | `public/js/guest-limit-manager.js` |
| **現在の役割** | 10通制限ロジックの共通管理（既に無効化済み） |
| **新設計では不要になる理由** | 10通制限が完全に廃止されたため、このファイルは不要 |
| **削除の難易度** | **Low** - ファイル削除のみ。ただし、`chat.html`からの読み込みを削除する必要あり |
| **削除してよい判断基準** | <ul><li>10通制限ロジックが完全に削除されていることを確認</li><li>コード内で`GuestLimitManager`への参照が0件</li><li>2週間以上エラーなく稼働</li></ul> |
| **現在の使用状況** | 既に無効化されている（すべての関数が`false`を返す実装） |
| **注意事項** | `chat.html`の`<script src="../../js/guest-limit-manager.js"></script>`を削除する必要あり |

---

### 6. 各ハンドラーの`handleGuestLimit`関数（コード側）

| 項目 | 内容 |
|------|------|
| **候補名** | `public/js/character-handlers/*/handler.js` 内の`handleGuestLimit`関数 |
| **現在の役割** | 各キャラクター固有の10通制限処理（既に削除済み） |
| **新設計では不要になる理由** | 10通制限が完全に廃止されたため |
| **削除の難易度** | **Low** - 関数定義の削除のみ |
| **削除してよい判断基準** | <ul><li>10通制限ロジックが完全に削除されていることを確認</li><li>コード内で`handleGuestLimit`への参照が0件</li></ul> |
| **現在の使用状況** | 既に削除済み（コメントのみ残っている） |
| **注意事項** | コメントも削除してコードをクリーンに保つ |

---

### 7. `conversations_backup` テーブル（存在する場合）

| 項目 | 内容 |
|------|------|
| **候補名** | `conversations_backup` |
| **現在の役割** | マイグレーション時のバックアップテーブル |
| **新設計では不要になる理由** | マイグレーションが完了し、バックアップが不要になった場合 |
| **削除の難易度** | **Low** - `DROP TABLE`で簡単に削除可能 |
| **削除してよい判断基準** | <ul><li>マイグレーションが完了し、バックアップが不要と判断した場合</li><li>バックアップデータの保持期間が過ぎた場合（例：3ヶ月以上経過）</li><li>データの整合性が確認できた場合</li></ul> |
| **現在の使用状況** | スキーマ定義にコメントとして存在（実際のテーブルは不明） |
| **推奨判断** | **慎重に判断** - バックアップは緊急時の復旧に必要。削除する場合は、別のバックアップ手段（Cloudflare D1のバックアップ機能など）を確保してから削除することを推奨 |

---

## 安定確認チェックリスト

### 1. 入口登録→チャット→履歴→再訪（session復帰）の通し確認

- [ ] 入口フォームで`nickname`/`birthdate`/`gender`を入力してゲストユーザー作成
- [ ] `session_id`が`localStorage`に保存されることを確認
- [ ] チャット画面でメッセージを送信
- [ ] 会話履歴が`conversations`テーブルに保存されることを確認（`is_guest_message = 0`）
- [ ] ブラウザを閉じて再度アクセス
- [ ] `session_id`からユーザー情報が復元されることを確認
- [ ] 会話履歴が正しく表示されることを確認
- [ ] 登録ユーザーへの移行が正常に動作することを確認

### 2. 参照箇所検索（ripgrep等）で該当名が0件

以下のコマンドで参照箇所を確認：

```bash
# is_guest_messageの参照確認
grep -r "is_guest_message" functions/ public/js/ --exclude-dir=node_modules

# ip_addressの参照確認（usersテーブル関連）
grep -r "ip_address" functions/ --exclude-dir=node_modules | grep -v "CF-Connecting-IP"

# GuestLimitManagerの参照確認
grep -r "GuestLimitManager" public/js/ --exclude-dir=node_modules

# handleGuestLimitの参照確認
grep -r "handleGuestLimit" public/js/ --exclude-dir=node_modules
```

**削除してよい判断基準：**
- 上記の検索結果が0件（または削除対象のコメントのみ）
- 管理画面で該当カラムを使用している機能がない

---

## 実行手順の案

### フェーズ1: 参照停止（新規insert固定値など）

1. **`is_guest_message`の参照停止**
   - `consult.ts`の`saveUserMessage`と`saveAssistantMessage`で`is_guest_message`パラメータを削除
   - SQLの`INSERT`文から`is_guest_message`を削除
   - `clear-guest-sessions.ts`で`is_guest_message = 1`を使用しているクエリを修正（`user_type = 'guest'`に変更）
   - `conversation.ts`の型定義から`is_guest_message`を削除
   - 既存データをすべて`0`に統一（既に実行済み）

2. **`ip_address`の参照停止（削除する場合）**
   - `create-guest.ts`で`ip_address`の保存を停止
   - 管理画面で`ip_address`を使用している機能を削除

3. **コード側の10通制限ロジックの完全削除**
   - `guest-limit-manager.js`の読み込みを`chat.html`から削除
   - 各ハンドラーの`handleGuestLimit`関数のコメントを削除

### フェーズ2: インデックス削除

1. **`idx_conversations_guest`の削除**
   ```sql
   DROP INDEX IF EXISTS idx_conversations_guest;
   ```

2. **`idx_users_ip_address`の削除（`ip_address`を削除する場合）**
   ```sql
   DROP INDEX IF EXISTS idx_users_ip_address;
   ```

### フェーズ3: カラム削除（テーブル再作成が必要）

**注意：このフェーズは慎重に実行してください。データ移行が必要です。**

1. **`conversations.is_guest_message`の削除**
   ```sql
   -- バックアップ
   CREATE TABLE conversations_backup_before_drop_is_guest AS SELECT * FROM conversations;
   
   -- 新しいテーブル作成（is_guest_messageなし）
   CREATE TABLE conversations_new (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id INTEGER NOT NULL,
     character_id TEXT NOT NULL CHECK(character_id IN ('kaede', 'yukino', 'sora', 'kaon')),
     role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
     content TEXT NOT NULL,
     timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
     message_type TEXT DEFAULT 'normal' CHECK(message_type IN ('normal', 'system', 'warning')),
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   
   -- データ移行
   INSERT INTO conversations_new (id, user_id, character_id, role, content, timestamp, message_type, created_at)
   SELECT id, user_id, character_id, role, content, timestamp, message_type, created_at
   FROM conversations;
   
   -- 既存テーブルを削除
   DROP TABLE conversations;
   
   -- 新しいテーブルをリネーム
   ALTER TABLE conversations_new RENAME TO conversations;
   
   -- インデックスを再作成
   CREATE INDEX IF NOT EXISTS idx_conversations_user_character_timestamp 
   ON conversations(user_id, character_id, timestamp DESC);
   
   CREATE INDEX IF NOT EXISTS idx_conversations_user_character 
   ON conversations(user_id, character_id);
   
   CREATE INDEX IF NOT EXISTS idx_conversations_timestamp 
   ON conversations(timestamp);
   ```

2. **`users.ip_address`の削除（削除する場合）**
   - 同様の手順でテーブル再作成が必要
   - ただし、`ip_address`は残すことを推奨（セキュリティ監査用途）

### フェーズ4: ファイル削除（コード側）

1. **`guest-limit-manager.js`の削除**
   ```bash
   rm public/js/guest-limit-manager.js
   ```
   - `chat.html`からの読み込みも削除

2. **各ハンドラーの`handleGuestLimit`関数のコメント削除**
   - コメントのみ残っている場合は削除してコードをクリーンに保つ

---

## 削除優先度

| 優先度 | 候補 | 理由 |
|--------|------|------|
| **高** | `idx_conversations_guest` | 使用されていないインデックス。削除しても影響なし |
| **高** | `guest-limit-manager.js` | 既に無効化済み。ファイル削除のみで影響なし |
| **中** | `conversations.is_guest_message` | テーブル再作成が必要。慎重に実行 |
| **低** | `users.ip_address` | セキュリティ監査用途で残すことを推奨 |
| **低** | `idx_users_ip_address` | `ip_address`を残す場合は残すことを推奨 |
| **要検討** | `conversations_backup` | バックアップは緊急時の復旧に必要。削除は慎重に |

---

## 注意事項

1. **データ移行時の注意**
   - テーブル再作成時は必ずバックアップを取得
   - 本番環境ではメンテナンス時間を設けて実行
   - データ移行後、整合性チェックを実施

2. **段階的な削除**
   - 一度にすべてを削除せず、フェーズごとに実行
   - 各フェーズ後に動作確認を実施

3. **ロールバック計画**
   - 各フェーズでロールバック手順を準備
   - バックアップから復元する手順を文書化

4. **監視**
   - 削除後、エラーログを監視
   - パフォーマンスへの影響を確認

---

## 更新履歴

- 2026-01-04: 初版作成（新設計移行後の整理ドキュメント）
