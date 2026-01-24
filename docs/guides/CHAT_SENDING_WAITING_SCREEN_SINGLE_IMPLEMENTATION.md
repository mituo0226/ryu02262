# チャット送信時の待機画面 - 複数実装の詳細確認

**確認日**: 2026年1月25日  
**質問**: チャット入室前の待機画面とキャラクター固有の待機画面を除外して、チャット送信時の待機画面と同じ待機画面が他に存在するか

---

## 📋 確認結果

### ✅ チャット送信時の待機画面の実装は**1つのみ**

チャット入室前の待機画面とキャラクター固有の待機画面を除外すると、**チャット送信時の待機画面は1つ**です。

---

## 🔍 詳細確認

### チャット送信時の待機画面

#### 1. **実装箇所**
- **作成**: `chat-ui.js:addMessage('loading', ...)`（135-261行目）
- **表示**: `chat-engine.js:3003行目`
- **削除**: `chat-engine.js:3094-3104行目`（APIレスポンス受信時）

#### 2. **使用されるクラス**

| ファイル | クラス名 | 行番号 | 状態 |
|---------|--------|--------|------|
| chat-ui.js | `message loading-message` | 189行 | ✅ 使用中 |
| chat-engine.js | `message loading-message` | 1020行 | ✅ 使用中 |
| chat.css | `.message.loading-message` | 325行 | ✅ CSSあり |

#### 3. **CSS実装** (chat.css:325-328行)

```css
.message.loading-message {
    animation: messageBubbleMysticGlow 4s ease-in-out infinite !important;
    transform-origin: center center !important;
}
```

**特徴**:
- アニメーション: `messageBubbleMysticGlow` (4秒周期)
- グロー効果: 紫色と輝き

#### 4. **実装フロー**

```
メッセージ送信
    ↓
chat-ui.addMessage('loading', '返信が来るまでお待ちください。', null)
    ↓
messageDiv.className = 'message loading-message' ← クラス設定
    ↓
_setupLoadingMessageAnimation() ← 動的メッセージ変更タイマーセット
    ↓
messageDiv.dataset.loadingMessageTimers に タイマーIDs保存
    ↓
【タイマー実行】
0秒: '返信が来るまでお待ちください。'
3秒: 'キャラクター名がこれからメッセージ入力します'
6秒: 'メッセージ入力を始めています'
9秒: '書き込んでいます'
12秒: 'もう少しお待ちください'
17秒: '返信がもうすぐ届きますのでお待ちください'
    ↓
APIレスポンス受信
    ↓
clearLoadingMessageTimers() ← タイマーすべてクリア
    ↓
messageDiv.remove() ← メッセージ削除
    ↓
キャラクターの返信メッセージ表示
```

---

## 🔴 存在しない/デッド実装

### `.message.loading` クラス

**CSS定義** (chat.css:276-283行):
```css
.message.loading {
    background: rgba(75, 0, 130, 0.95) !important;
    border: none;
    text-align: center;
    color: var(--text-light);
    font-weight: 600;
    /* アニメーションはJavaScriptで動的に設定される */
}
```

**状態**: ❌ **使用されていない**（デッド コード）
- JavaScriptで `.message.loading` クラスを指定するコードが見つからない
- 代わりに `.message.loading-message` が使用されている

---

## 📌 その他の待機画面実装（参考）

### 1. **ページ初期化用待機画面**

```html
<div class="loading-screen" id="loadingScreen">
    <img id="loadingCharacterIcon" class="loading-character-icon" src="" alt="読み込み中" style="display: none;">
    <div class="loading-spinner"></div>
    <div class="loading-text" id="loadingText">鑑定の準備をしています...</div>
    <div class="loading-subtext" id="loadingSubtext">少々お待ちください</div>
</div>
```

**該当**: チャット入室前の画面
**除外対象**: ✅ スコープ外

### 2. `waitingOverlay` 

**参照**: chat-engine.js の複数箇所
**状態**: HTMLに定義されていない
**該当**: ページ初期化用の古い実装
**除外対象**: ✅ スコープ外

---

## ✨ 結論

### **チャット送信時の待機画面は1つのみ**

他に同じ待機画面の実装はありません。

| 項目 | 状態 |
|-----|------|
| **チャット送信時の待機画面** | ✅ **1つ（`message loading-message`）** |
| **同じ実装の別の場所** | ❌ **なし** |
| **デッド コード** | ⚠️ `.message.loading` クラス（未使用） |

---

## 🛠️ 現在の問題の関連性

「返信をお待ちください」とだけ表示される問題は、この1つの待機画面実装内での問題と考えられます：

**推定原因の再確認**:
1. ✅ 待機メッセージは正しく作成される（`message loading-message` クラス）
2. ❓ タイマーは設定されるが、削除される前に実行されないか
3. ❓ または APIレスポンスが非常に早く、タイマーが実行される前にクリアされる

**確認すべき箇所**:
- `_setupLoadingMessageAnimation()` がタイマーを正しく設定しているか
- `clearLoadingMessageTimers()` がいつ呼ばれているか
- APIレスポンスの応答時間

---

**確認完了**: チャット送信時の待機画面は **1つの実装のみ** 存在することを確認しました。

