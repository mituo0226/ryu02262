# ユーザーがメール送信後の待機画面の状態確認レポート

**確認日**: 2026年1月25日  
**対象**: 全キャラクター共通（楓、雪乃、ソラ、花音）

## 📋 概要

ユーザーがメッセージを送信した後、キャラクターが返信するときの待機画面の現在の実装状況を確認しました。

---

## 🎯 待機画面の実装状況

### 1. **現在の実装方式**

待機画面はフロントエンドで**ローディングメッセージ**として実装されています。

#### 実装場所
- **メイン実装**: `public/js/chat-engine.js` の `sendMessage()` 関数
- **UI管理**: `public/js/chat-ui.js` の `addMessage('loading', ...)` メソッド
- **ハンドラー連携**: 各キャラクターハンドラー（`beforeMessageSent()`, `onMessageSent()`, `onResponseReceived()` など）

---

## 📍 待機画面の流れ

### ステップ1: メッセージ送信前処理
```javascript
// chat-engine.js:2989-2998
let handler = CharacterRegistry.get(character);
if (handler && typeof handler.beforeMessageSent === 'function') {
    const beforeResult = handler.beforeMessageSent(messageToSend);
    if (beforeResult && beforeResult.waitingMessageId) {
        waitingMessageId = beforeResult.waitingMessageId;
    }
}
```

- ハンドラーが独自の待機画面を返すことが可能
- カスタムの `waitingMessageId` があれば使用

### ステップ2: デフォルト待機画面の表示
```javascript
// chat-engine.js:3002-3004
if (!waitingMessageId) {
    waitingMessageId = window.ChatUI.addMessage('loading', '返信が来るまでお待ちください。', null);
}
```

**表示内容（デフォルト）**:
- テキスト: `'返信が来るまでお待ちください。'`
- その後、時間経過で順次変更されるメッセージ：
  1. `'返信が来るまでお待ちください。'` (0秒)
  2. `'(キャラクター名)がこれからメッセージ入力します'` (3秒)
  3. `'メッセージ入力を始めています'` (6秒)
  4. `'書き込んでいます'` (9秒)
  5. `'もう少しお待ちください'` (12秒)
  6. `'返信がもうすぐ届きますのでお待ちください'` (17秒)

### ステップ3: メッセージ送信後の処理
```javascript
// chat-engine.js:3006-3009
if (handler && typeof handler.onMessageSent === 'function') {
    handler.onMessageSent(waitingMessageId);
}
```

- ハンドラーは `waitingMessageId` を受け取り、カスタム処理が可能
- ただし、現在すべてのキャラクターで特別な処理は実装されていない

### ステップ4: APIレスポンス受信後
```javascript
// chat-engine.js:3088-3104
const handlerForResponse = CharacterRegistry.get(character);
if (handlerForResponse && typeof handlerForResponse.onResponseReceived === 'function') {
    handlerForResponse.onResponseReceived(waitingMessageId);
} else {
    // ハンドラーが処理しない場合は、デフォルトのローディングメッセージを削除
    if (waitingMessageId) {
        const waitingElement = document.getElementById(waitingMessageId);
        if (waitingElement) {
            if (window.ChatUI && typeof window.ChatUI.clearLoadingMessageTimers === 'function') {
                window.ChatUI.clearLoadingMessageTimers(waitingElement);
            }
            waitingElement.remove();
        }
    }
}
```

- 待機メッセージのタイマーをクリア
- DOM から待機メッセージを削除

### ステップ5: レスポンスの表示
```javascript
// chat-engine.js:3224-3225
const messageId = window.ChatUI.addMessage('character', responseText, characterName);
window.ChatUI.scrollToLatest();
```

- キャラクターからの返信メッセージを表示

---

## 🎨 待機画面のスタイル

### HTML構造
```html
<div class="message loading-message" id="message-[timestamp]-[random]">
    <div class="message-header">[送信者名 - 存在しない場合は表示なし]</div>
    <div class="message-text">返信が来るまでお待ちください。</div>
</div>
```

### CSS スタイル（chat-ui.js:196-202）
```javascript
if (type === 'loading') {
    messageDiv.style.background = 'rgba(75, 0, 130, 0.95)';
    messageDiv.style.color = '#ffd700';
    messageDiv.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.3), 0 0 40px rgba(138, 43, 226, 0.2)';
}
```

**特徴**:
- 背景: 暗い紫色
- テキスト色: ゴールド（#ffd700）
- 光沢効果: グロー effect

### アニメーション
```css
@keyframes subtle-shimmer {
    0%, 100% {
        transform: translateY(0px);
        text-shadow: 0 0 20px rgba(255, 215, 0, 0.5), 0 0 40px rgba(138, 43, 226, 0.2);
    }
    50% {
        transform: translateY(2px);
        text-shadow: 0 0 25px rgba(255, 215, 0, 0.7), 0 0 50px rgba(138, 43, 226, 0.3);
    }
}
```

- テキストが微妙に上下に動く（波打ち効果）
- テキストシャドウが呼吸するように変動

---

## 📊 キャラクター別の実装状況

### 1. **楓（kaede）**

**ファイル**: `public/js/character-handlers/kaede/handler.js`

**実装内容**:
- `beforeMessageSent()`: デフォルト実装（特別な処理なし）
- `onMessageSent()`: 実装されていない
- `onResponseReceived()`: 実装されていない

**現在の状態**: 
✅ **デフォルトの待機画面を使用**

---

### 2. **雪乃（yukino）**

**ファイル**: `public/js/character-handlers/yukino/handler.js`

**実装内容**:
- `beforeMessageSent()`: デフォルト実装（特別な処理なし）
- `onMessageSent()`: 実装あり（コメントのみ、処理なし）
- `onResponseReceived()`: 実装あり（コメントのみ、処理なし）
- `onError()`: 実装あり（コメントのみ、処理なし）

```javascript
/**
 * メッセージ送信後の処理（API応答受信前）
 * @param {string} waitingMessageId - 待機メッセージのID
 */
onMessageSent(waitingMessageId) {
    // 待機画面はchat-engine.jsで管理されるため、ここでは何もしない
    console.log('[雪乃ハンドラー] メッセージ送信完了');
}
```

**現在の状態**: 
✅ **デフォルトの待機画面を使用**

---

### 3. **ソラ（sora）**

**ファイル**: `public/js/character-handlers/sora/handler.js`

**実装内容**:
- `beforeMessageSent()`: デフォルト実装（特別な処理なし）
- `onMessageSent()`: 実装されていない
- `onResponseReceived()`: 実装されていない

**現在の状態**: 
✅ **デフォルトの待機画面を使用**

---

### 4. **花音（kaon）**

**ファイル**: `public/js/character-handlers/kaon/handler.js`

**実装内容**:
- `beforeMessageSent()`: 親クラス（BaseCharacterHandler）の実装を使用
- `onMessageSent()`: 実装されていない
- `onResponseReceived()`: 実装されていない

**親クラス実装**:
```javascript
beforeMessageSent(message) {
    console.log(`[${this.characterName}ハンドラー] メッセージ送信前処理:`, message);
    return { proceed: true };
}
```

**現在の状態**: 
✅ **デフォルトの待機画面を使用**

---

## 🔧 待機画面のカスタマイズ可能箇所

### ハンドラー側でのカスタマイズ

各キャラクターのハンドラーで以下のメソッドを実装することでカスタマイズ可能：

1. **`beforeMessageSent(message)`**
   - メッセージ送信前に待機画面の `waitingMessageId` を指定可能
   - 返り値: `{ waitingMessageId?: string, ... }`

2. **`onMessageSent(waitingMessageId)`**
   - メッセージ送信直後の処理
   - 待機画面に対する追加処理が可能

3. **`onResponseReceived(waitingMessageId)`**
   - APIレスポンス受信後の処理
   - 待機画面を削除する前に処理が可能

4. **`onError(waitingMessageId)`**
   - エラー発生時の処理
   - 待機画面をエラー表示に変更することが可能

---

## ⚙️ 待機画面の動的メッセージ変更機能

### 実装場所
`public/js/chat-ui.js:267-342` - `_setupLoadingMessageAnimation()` メソッド

### メッセージの変更タイミング

| タイミング | メッセージ |
|----------|----------|
| 0秒 | `返信が来るまでお待ちください。` |
| 3秒 | `(キャラクター名)がこれからメッセージ入力します` |
| 6秒 | `メッセージ入力を始めています` |
| 9秒 | `書き込んでいます` |
| 12秒 | `もう少しお待ちください` |
| 17秒 | `返信がもうすぐ届きますのでお待ちください` |

### キャラクター名の自動置換
プレースホルダー `(キャラクター名)` が自動的に置換されます：
- `楓`（kaede）
- `笹岡雪乃`（yukino）
- `水野ソラ`（sora）
- `三崎花音`（kaon）

---

## 🛡️ 待機画面の確実な削除メカニズム

### 削除方法（複数の方法で確実に削除）

```javascript
// 方法1: IDで取得して削除
const waitingElement = document.getElementById(waitingMessageId);
if (waitingElement) {
    window.ChatUI.clearLoadingMessageTimers(waitingElement);
    waitingElement.remove();
}

// 方法2: loading-messageクラスで検索
const loadingMessages = window.ChatUI.messagesDiv?.querySelectorAll('.message.loading-message');
if (loadingMessages && loadingMessages.length > 0) {
    loadingMessages.forEach(msg => {
        window.ChatUI.clearLoadingMessageTimers(msg);
        msg.remove();
    });
}

// 方法3: チャットウィンドウのアニメーション状態を解除
const chatContainer = messagesDiv.closest('.chat-container');
if (chatContainer) {
    chatContainer.classList.remove('waiting-for-response');
}
```

---

## 📋 サマリー

### 現在の状況

| 項目 | 状態 |
|-----|------|
| **デフォルト待機画面** | ✅ 実装済み |
| **動的メッセージ変更** | ✅ 実装済み |
| **アニメーション効果** | ✅ 実装済み |
| **キャラクター別カスタマイズ** | ⚠️ 可能だが、全キャラで未実装 |
| **エラーハンドリング** | ✅ 実装済み |
| **タイマークリア機能** | ✅ 実装済み |

### 全キャラクター共通

✅ すべてのキャラクター（楓、雪乃、ソラ、花音）で**デフォルトの待機画面が表示**されます。

- ゴールド色のテキスト
- 紫色の背景
- 波打ち効果のアニメーション
- 時間経過でメッセージが自動更新

### カスタマイズの余地

⚠️ 各キャラクターハンドラーで `beforeMessageSent()`、`onMessageSent()`、`onResponseReceived()` メソッドを実装することで、待機画面をキャラクター固有の演出にカスタマイズすることが可能です。

---

## 🔍 確認に使用したファイル

1. `public/js/chat-engine.js` - メイン実装
2. `public/js/chat-ui.js` - UI管理
3. `public/js/character-handlers/base-handler.js` - 基底クラス
4. `public/js/character-handlers/kaede/handler.js` - 楓のハンドラー
5. `public/js/character-handlers/yukino/handler.js` - 雪乃のハンドラー
6. `public/js/character-handlers/sora/handler.js` - ソラのハンドラー
7. `public/js/character-handlers/kaon/handler.js` - 花音のハンドラー

---

**作成日時**: 2026年1月25日  
**確認完了**: ✅
