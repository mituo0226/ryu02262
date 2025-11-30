# メッセージカウントが増えない原因調査レポート

## 📊 メッセージカウントの流れ

### 1. メッセージ送信時（chat-init.js: 293-384行目）

**処理の流れ:**
1. `sendMessage()`関数が呼ばれる
2. ゲストユーザーの場合、現在のカウントを取得: `const guestCount = ChatData.getGuestMessageCount(character);` (295行目)
3. **カウントを増やす**: `ChatData.setGuestMessageCount(character, guestCount + 1);` (305行目)
4. 会話履歴に追加: `ChatData.addToGuestHistory(character, 'user', messageToSend);` (348行目)
5. 親ウィンドウに通知: `window.parent.postMessage({type: 'CHAT_MESSAGE_SENT', messageCount: ...})` (359行目)
6. **アニメーション画面に遷移**: `window.location.href = animationUrl;` (384行目)

**重要なポイント:**
- ✅ 305行目でカウントは正しく増やされている
- ✅ sessionStorageに保存される（chat-data.js: 106行目）
- ⚠️ その後、ページ遷移が発生する（384行目）

---

### 2. アニメーション画面から戻ってきた時（chat-init.js: 390-520行目）

**処理の流れ:**
1. `handleReturnFromAnimation()`関数が呼ばれる（390行目）
2. `lastUserMessage`と`consultResponse`をsessionStorageから取得
3. ユーザーメッセージを表示（422行目）
4. AI応答を表示（481行目）
5. **ゲスト履歴に追加**: `ChatData.addToGuestHistory(ChatData.currentCharacter, 'assistant', data.message);` (492行目)
6. 親ウィンドウに通知: `window.parent.postMessage({type: 'CHAT_MESSAGE_SENT', messageCount: ...})` (488行目)

**重要なポイント:**
- ⚠️ **メッセージカウントを増やす処理がない**
- ⚠️ 488行目で`getGuestMessageCount`を取得しているが、これは送信時に増やした値（305行目）を取得している
- ⚠️ しかし、アニメーション画面から戻ってきた時点で、カウントがリセットされている可能性がある

---

### 3. REQUEST_CHAT_DATAハンドラー（chat-init.js: 1147-1220行目）

**処理の流れ:**
1. `REQUEST_CHAT_DATA`メッセージを受信
2. `ChatData.getGuestMessageCount(character)`でカウントを取得（1148行目）
3. `ChatData.getGuestHistory(character)`で履歴を取得（1159行目）
4. 会話履歴からメッセージ数を再計算（フォールバック）（1169-1179行目）
5. 親ウィンドウに送信（1212行目）

**重要なポイント:**
- ✅ 会話履歴からメッセージ数を再計算するフォールバックがある
- ⚠️ しかし、`getGuestMessageCount`が0を返している場合、フォールバックが機能していない可能性がある

---

## 🔍 問題の原因（推測）

### 原因1: アニメーション画面遷移時にsessionStorageが失われている可能性

**症状:**
- メッセージ送信時にカウントを増やしている（305行目）
- しかし、アニメーション画面から戻ってきた時、カウントが0に戻っている

**確認方法:**
```javascript
// メッセージ送信直後（アニメーション画面遷移前）に実行
console.log('送信前のカウント:', sessionStorage.getItem('guestMessageCount_kaede'));

// アニメーション画面から戻ってきた後（handleReturnFromAnimation実行後）に実行
console.log('戻ってきた後のカウント:', sessionStorage.getItem('guestMessageCount_kaede'));
```

---

### 原因2: アニメーション画面から戻ってきた時にカウントがリセットされている

**確認すべき箇所:**
- `initPage()`関数（chat-init.js: 10-150行目）
- `handleReturnFromAnimation()`関数（chat-init.js: 390-520行目）

**調査:**
- `initPage()`でカウントをリセットする処理がないか確認
- `handleReturnFromAnimation()`でカウントをリセットする処理がないか確認

---

### 原因3: REQUEST_CHAT_DATAハンドラーで正しい値が取得できていない

**確認すべき箇所:**
- `getGuestMessageCount()`関数（chat-data.js: 65-95行目）
- `REQUEST_CHAT_DATA`ハンドラー（chat-init.js: 1147-1220行目）

**調査:**
- `getGuestMessageCount()`が正しくsessionStorageから値を取得できているか
- 会話履歴からのフォールバックが正しく動作しているか

---

## 🧪 診断コマンド

### iframe内のコンソールで実行

```javascript
// 1. 現在のメッセージカウントを確認
console.log('=== メッセージカウント診断 ===');
console.log('sessionStorage guestMessageCount_kaede:', sessionStorage.getItem('guestMessageCount_kaede'));
console.log('ChatData.getGuestMessageCount(kaede):', ChatData.getGuestMessageCount('kaede'));

// 2. 会話履歴を確認
const history = ChatData.getGuestHistory('kaede');
console.log('会話履歴の長さ:', history.length);
console.log('ユーザーメッセージ数:', history.filter(msg => msg.role === 'user').length);

// 3. メッセージ送信前の状態を確認
console.log('送信前のカウント:', ChatData.getGuestMessageCount('kaede'));

// 4. メッセージ送信（手動で実行）
// ChatInit.sendMessage();

// 5. 送信後のカウントを確認（アニメーション画面遷移前）
console.log('送信後のカウント:', ChatData.getGuestMessageCount('kaede'));
console.log('sessionStorage:', sessionStorage.getItem('guestMessageCount_kaede'));
```

---

## 🔧 推奨される修正

### 修正1: アニメーション画面から戻ってきた時にカウントを再確認

`handleReturnFromAnimation()`関数内で、会話履歴からメッセージ数を再計算して、sessionStorageに保存する処理を追加。

### 修正2: REQUEST_CHAT_DATAハンドラーで会話履歴を優先

`getGuestMessageCount()`が0を返しても、会話履歴があれば、そこから計算した値を優先する。

### 修正3: デバッグログの追加

各ポイントでメッセージカウントの値をログ出力して、どこで0になっているかを特定。

---

## 📝 次のステップ

1. 診断コマンドを実行して、メッセージ送信前後のカウントを確認
2. アニメーション画面から戻ってきた後のカウントを確認
3. REQUEST_CHAT_DATAハンドラーで取得するカウントを確認
4. 結果を共有して、原因を特定

