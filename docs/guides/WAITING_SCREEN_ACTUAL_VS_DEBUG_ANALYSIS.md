# 待機画面：実チャット画面 vs デバッグツール 比較分析

**分析日**: 2026年1月25日  
**結論**: デバッグツールは正常に動作するが、実チャット画面では待機画面が即座に削除されている

---

## 🎯 主な違い

### デバッグツール（正常に動作）
```javascript
// dashboard.html のデバッグツール
const messageDiv = document.createElement('div');
messageDiv.className = 'message loading-message';
// ...
waitingScreenPreview.appendChild(messageDiv);

// タイマーを設定
setTimeout(() => { ... }, 3000);
setTimeout(() => { ... }, 6000);
```

**特徴**:
- ✅ 待機画面が削除されることがない
- ✅ 6秒間、タイマーが実行され続ける
- ✅ メッセージが正常に変更される

### 実チャット画面（問題あり）
```javascript
// chat-engine.js:3012-3015
if (!waitingMessageId) {
    waitingMessageId = window.ChatUI.addMessage('loading', '返信が来るまでお待ちください。', null);
}

// API呼び出し
const response = await ChatAPI.sendMessage(messageToSend, character, conversationHistory, options);

// APIレスポンス受信後の処理
const handlerForResponse = CharacterRegistry.get(character);
if (handlerForResponse && typeof handlerForResponse.onResponseReceived === 'function') {
    handlerForResponse.onResponseReceived(waitingMessageId);  // ← ハンドラーで処理
} else {
    // デフォルト処理で削除
    const waitingElement = document.getElementById(waitingMessageId);
    if (waitingElement) {
        window.ChatUI.clearLoadingMessageTimers(waitingElement);  // ← タイマーを全削除
        waitingElement.remove();  // ← 要素を削除
    }
}

// さらに、複数の方法で削除を試行（3128-3162行目）
// 方法1, 2, 3で重複削除
```

**問題点**:
- ❌ ハンドラーの `onResponseReceived()` が呼ばれている
- ❌ ハンドラー内で待機画面がクリアされる可能性
- ❌ 複数の削除処理が重複して実行される（3128-3162行目）

---

## 🔴 **根本原因：3つの削除処理が重複実行されている**

### 削除箇所1: ハンドラー処理（3113行目）
```javascript
if (handlerForResponse && typeof handlerForResponse.onResponseReceived === 'function') {
    handlerForResponse.onResponseReceived(waitingMessageId);  // ← ハンドラーに委譲
}
```

**雪乃ハンドラーの実装** (`yukino/handler.js:110-113`):
```javascript
onResponseReceived(waitingMessageId) {
    // 待機画面はchat-engine.jsで管理されるため、ここでは何もしない
    console.log('[雪乃ハンドラー] API応答受信');
}
```

→ ハンドラーは削除を行わない

### 削除箇所2: デフォルト削除処理（3114-3126行目）
```javascript
} else {
    // ハンドラーが処理しない場合は、デフォルトのローディングメッセージを削除
    if (waitingMessageId) {
        const waitingElement = document.getElementById(waitingMessageId);
        if (waitingElement) {
            if (window.ChatUI && typeof window.ChatUI.clearLoadingMessageTimers === 'function') {
                window.ChatUI.clearLoadingMessageTimers(waitingElement);  // ← タイマー全削除
            }
            waitingElement.remove();  // ← 要素削除
        }
    }
}
```

→ **このブロックは else である、つまり、ハンドラーが存在しない場合のみ実行される**

**しかし**: 
- 実際のチャット画面では**ハンドラーが存在する**（雪乃、楓、蒼空、花音）
- つまり、**このデフォルト削除処理は実行されない**

### 削除箇所3: 強化版削除処理（3128-3162行目）
```javascript
// 【強化】待機画面を確実に削除（複数の方法で試行）
if (waitingMessageId) {
    // 方法1: IDで取得して削除
    const waitingElementById = document.getElementById(waitingMessageId);
    if (waitingElementById) {
        if (window.ChatUI && typeof window.ChatUI.clearLoadingMessageTimers === 'function') {
            window.ChatUI.clearLoadingMessageTimers(waitingElementById);  // ← タイマー全削除
        }
        waitingElementById.remove();  // ← 要素削除
    }
    
    // 方法2, 3でさらに削除試行...
}
```

→ **この処理は常に実行される**（if-else の外にある）

---

## 🚨 **問題の正体が明らかに！**

### 実行フロー（実チャット画面）

```
1. メッセージ送信
   ↓
2. 待機画面作成 (id="loading-xxx")
   ↓
3. APIリクエスト送信 (await)
   ↓
4. APIレスポンス受信 (数秒〜数十秒後)
   ↓
5. ハンドラー.onResponseReceived() 呼び出し
   ├→ 雪乃ハンドラー: 何もしない ✓
   └→ 処理完了
   ↓
6. 削除処理1（3128-3162行目）【常に実行される】
   ├→ clearLoadingMessageTimers(waitingElement) 【タイマー全削除】
   └→ waitingElement.remove() 【要素削除】
   
   ← 🚨 ここで待機画面が即座に削除される！
```

### なぜ動的メッセージが表示されないのか

```
待機画面のタイマー設定（_setupLoadingMessageAnimation）
  - タイマーID: [xxx, yyy, zzz, ...]
  - 遅延: [0秒, 3秒, 6秒, 9秒, 12秒, 17秒]

API応答受信（1秒後に応答があった場合）
  - clearLoadingMessageTimers() 実行
  - すべてのタイマーがクリアされる（まだ実行されていないタイマーも含む）
  - 待機画面要素が削除される
  
→ 3秒タイマー、6秒タイマーは実行されない
→ 「返信をお待ちください。」のみで止まる
```

---

## ✅ **修正が必要な箇所**

### 問題1: 常に実行される削除処理（3128-3162行目）

**現在のコード**:
```javascript
// 【強化】待機画面を確実に削除（複数の方法で試行）
if (waitingMessageId) {
    // 方法1, 2, 3...
}
```

**問題**: 
- ハンドラーが処理を完了してから、さらに強制的に削除される
- ハンドラーの `onResponseReceived()` が何もしない前提でも、この処理で削除される

**修正案**:
- ハンドラーが削除を完了したかどうかを判定
- ハンドラーの戻り値で「処理済み」を示す
- 処理済みの場合は、この強化版削除処理をスキップ

---

### 問題2: clearLoadingMessageTimers() が削除直後に呼ばれている

**現在**:
```javascript
if (window.ChatUI && typeof window.ChatUI.clearLoadingMessageTimers === 'function') {
    window.ChatUI.clearLoadingMessageTimers(waitingElementById);
}
waitingElementById.remove();
```

**問題**:
- 削除の直前にタイマーをクリアしている
- APIレスポンスが1〜2秒で返ってくる場合、タイマーがまだ実行されていない
- 3秒以上のタイマーは実行される前にクリアされる

**修正案**:
- タイマーをクリアするタイミングをもっと遅くする
- またはハンドラーで待機時間を管理する

---

### 問題3: ハンドラーの onResponseReceived() が戻り値を返していない

**現在の設計**:
```javascript
onResponseReceived(waitingMessageId) {
    // 待機画面はchat-engine.jsで管理されるため、ここでは何もしない
    console.log('[雪乃ハンドラー] API応答受信');
}
```

**問題**:
- 戻り値がないため、待機画面の削除を制御できない
- 常に共通処理の削除処理が実行される

**修正案**:
- ハンドラーが戻り値 `true` を返すと「待機画面は削除完了」と判定
- 戻り値 `false` または undefined の場合は、共通処理で削除

---

## 📋 修正チェックリスト

| 項目 | 修正箇所 | 現在 | 修正後 |
|-----|---------|------|-------|
| **削除処理の重複** | `chat-engine.js:3128-3162` | 常に実行される | ハンドラー戻り値で制御 |
| **clearLoadingMessageTimers()** | `chat-engine.js:3120-3121, 3134-3135` | 削除直前 | 短い遅延後（500ms）に実行 |
| **ハンドラーの戻り値** | `character-handlers/*/handler.js` | 戻り値なし | boolean を返す |
| **onResponseReceived()の仕様** | 各ハンドラー | 処理完了の判定不可 | 処理完了を明示的に通知 |

---

## 🎯 修正実装案

### ステップ1: ハンドラーインターフェースを更新

```javascript
/**
 * API応答受信後の処理
 * @param {string} waitingMessageId - 待機メッセージのID
 * @returns {boolean} true: 待機画面は削除完了, false: 共通処理で削除
 */
onResponseReceived(waitingMessageId) {
    // ハンドラーが処理を完了した場合は true を返す
    // そうしない場合は false を返す（または undefined）
    return false;  // デフォルトは共通処理に委譲
}
```

### ステップ2: chat-engine.js を更新

```javascript
// ハンドラーのonResponseReceivedを呼び出す（待機画面を非表示にする）
const handlerForResponse = CharacterRegistry.get(character);
let handlerProcessed = false;

if (handlerForResponse && typeof handlerForResponse.onResponseReceived === 'function') {
    try {
        handlerProcessed = handlerForResponse.onResponseReceived(waitingMessageId);
        console.log('[ChatEngine] ハンドラーが処理完了:', handlerProcessed);
    } catch (error) {
        console.error('[ChatEngine] onResponseReceived エラー:', error);
    }
}

// ハンドラーが処理していない場合のみ、共通処理で削除
if (!handlerProcessed) {
    // 待機画面削除処理（タイマークリア → 削除）
    if (waitingMessageId) {
        // 短い遅延を入れて、タイマーの完全なクリアを待つ
        setTimeout(() => {
            const waitingElement = document.getElementById(waitingMessageId);
            if (waitingElement && waitingElement.parentNode) {
                if (window.ChatUI && typeof window.ChatUI.clearLoadingMessageTimers === 'function') {
                    window.ChatUI.clearLoadingMessageTimers(waitingElement);
                }
                waitingElement.remove();
            }
        }, 500);  // 500ms 後に削除（タイマーがクリアされる時間を確保）
    }
}
```

### ステップ3: 削除処理の重複を防ぐ

現在の 3128-3162 行目の強化版削除処理を削除するか、条件を厳しくする：

```javascript
// 【修正】削除処理の重複を防ぐ
// ハンドラーが処理していない場合のみ実行
if (!handlerProcessed && waitingMessageId) {
    const waitingElement = document.getElementById(waitingMessageId);
    if (waitingElement && waitingElement.parentNode) {
        // さらに確実に削除するための処理
        const loadingMessages = window.ChatUI.messagesDiv?.querySelectorAll('.message.loading-message');
        if (loadingMessages && loadingMessages.length > 0) {
            loadingMessages.forEach(msg => {
                if (msg.id === waitingMessageId) {
                    msg.remove();
                }
            });
        }
    }
}
```

---

## 🔍 デバッグツールが正常な理由

```javascript
// dashboard.html のデバッグツール
const messageDiv = document.createElement('div');
messageDiv.className = 'message loading-message';
waitingScreenPreview.appendChild(messageDiv);  // ← プレビューエリアに追加

setTimeout(() => {
    // 3秒後：テキスト変更
    const text = document.getElementById('debug-loading-text');
    if (text) {
        text.textContent = `${characterName}がこれからメッセージ入力します`;
    }
}, 3000);

// 注目：メッセージが削除されない！
// 6秒以上、プレビューエリアに要素が存在し続ける
// タイマーが全部実行される
```

**理由**:
- ✅ デバッグツールは待機画面を削除しない
- ✅ 6秒間、要素が DOM に残る
- ✅ すべてのタイマーが完全に実行される

---

## 📌 まとめ

### デバッグツールが正常な理由
- 待機画面を削除しないから、全タイマーが実行される

### 実チャット画面が動作しない理由
- **APIレスポンス受信直後に待機画面が削除されているから**
- タイマーがクリアされ、動的メッセージ変更が実行されない

### 修正のキーポイント
1. ハンドラーの `onResponseReceived()` に戻り値を追加
2. `chat-engine.js:3128-3162` の強化版削除処理の実行条件を改善
3. `clearLoadingMessageTimers()` の実行タイミングを遅延させる

---

**確認完了**: 実チャット画面の問題の正体は、APIレスポンス直後の待機画面削除処理にあることが確定しました。
