# ゲストユーザーの会話履歴の流れ

## 📊 現在の会話履歴保存・読み込みの流れ

### 1. メッセージ送信時（`chat-init.js`）

**処理順序：**
1. 制限チェック（`getGuestMessageCount(character)`）
2. 会話履歴に追加（`ChatData.addToGuestHistory(character, 'user', message)`）
   - `getGuestHistory(character)`で会話履歴を取得
   - 配列に`{role: 'user', content: message}`を追加
   - `setGuestHistory(character, history)`で`sessionStorage`に保存（キー: `guestConversationHistory_{character}`）
3. カウント取得（`ChatData.getGuestMessageCount(character)`）
   - 会話履歴からユーザーメッセージ数を計算
4. `sessionStorage`に`lastGuestMessageCount`として保存

**保存場所：**
- `sessionStorage.guestConversationHistory_{character}`: 会話履歴全体（配列）
- `sessionStorage.lastGuestMessageCount`: メッセージカウント（文字列）

### 2. アニメーション画面（`reading-animation.html`）

**APIリクエスト時の処理：**
1. `sessionStorage.lastGuestMessageCount`を取得
   - 取得後に削除
2. `sessionStorage.guestConversationHistory_{character}`から会話履歴を取得
3. APIリクエストに含める：
   - `guestMetadata.messageCount`: メッセージカウント
   - `clientHistory`: 会話履歴（配列）

**問題点：**
- `lastGuestMessageCount`を取得後に削除しているため、再取得できない
- 会話履歴とメッセージカウントが一致していない可能性がある

### 3. API側（`functions/api/consult.ts`）

**処理：**
1. `guestMetadata.messageCount`を受け取り、`userMessageCount`として使用
2. `clientHistory`を受け取る（ゲストユーザーの場合は保存しない）
3. システムプロンプト生成時に`userMessageCount`を使用

**問題点：**
- ゲストユーザーの会話履歴はAPI側で保存されない
- `clientHistory`から実際のメッセージ数を計算して`userMessageCount`と照合していない

### 4. アニメーション画面から戻った後（`chat-init.js`）

**処理：**
1. `sessionStorage.lastConsultResponse`からAPIレスポンスを取得
2. AI応答を会話履歴に追加（`ChatData.addToGuestHistory(character, 'assistant', data.message)`）
3. 会話履歴からメッセージ数を再計算

**問題点：**
- `lastGuestMessageCount`が既に削除されているため、会話履歴からしか計算できない
- 会話履歴が空の場合、カウントが0になる

## 🔍 確認すべきポイント

1. **メッセージ送信時に会話履歴が正しく保存されているか**
   - `sessionStorage.guestConversationHistory_{character}`に正しく保存されているか
   - メッセージが配列に正しく追加されているか

2. **アニメーション画面で会話履歴が正しく読み込まれているか**
   - `reading-animation.html`で`sessionStorage`から会話履歴を取得できているか
   - APIリクエストに正しく含まれているか

3. **メッセージカウントと会話履歴の一致**
   - `lastGuestMessageCount`と会話履歴から計算したカウントが一致しているか
   - 一致しない場合、どちらを優先すべきか

4. **アニメーション画面から戻った後の復元**
   - 会話履歴が正しく復元されているか
   - メッセージカウントが正しく計算されているか

## 🔧 推奨される修正

1. **会話履歴を唯一の真実の源として統一**
   - メッセージカウントは常に会話履歴から計算する
   - `lastGuestMessageCount`は補助的な用途のみ

2. **APIリクエスト時に会話履歴からメッセージ数を計算**
   - `clientHistory`から実際のユーザーメッセージ数を計算
   - `guestMetadata.messageCount`と照合して不一致があれば警告

3. **会話履歴の保存・読み込みを確実にする**
   - メッセージ送信時に確実に保存されているか確認
   - アニメーション画面で確実に読み込まれているか確認

