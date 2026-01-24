# 待機画面が「返信をお待ちください」とだけ表示される原因分析

**分析日**: 2026年1月25日  
**現象**: 動的メッセージ変更が機能せず、「返信が来るまでお待ちください。」のみが表示される

---

## 🔍 確認結果

### 1. **複数の待機画面実装が存在することを確認**

#### A. `waitingOverlay` - 初期化画面用（HTML未定義）
- **参照場所**: `chat-engine.js` の複数箇所（1443行、1558行、1908行など）
- **status**: ❌ **HTMLで定義されていない**
- **実装内容**: ページ初期化時のローディング画面管理
- **問題**: `document.getElementById('waitingOverlay')` で `null` を返す

#### B. `loading-message` - メッセージ送信時の待機画面（実装済み）
- **参照場所**: `chat-ui.js:237-246`
- **status**: ✅ **実装済み**
- **実装内容**: メッセージ送信時の待機メッセージ表示
- **アニメーション**: `_setupLoadingMessageAnimation()` で管理

---

## 🎯 実装フローの詳細

### 現在のフロー（動的メッセージ変更が設計されているもの）

```javascript
// chat-ui.js:135-261 addMessage('loading', ...) の処理

1. メッセージタイプが 'loading' かを確認
   ↓
2. loading-messageクラスを適用
   ↓
3. type === 'loading' の特殊処理を実行
   ↓
4. _setupLoadingMessageAnimation(messageDiv, textDiv) を呼び出し
   ↓
5. 動的メッセージ変更タイマーをセット（以下の時間で変更）
   - 0秒: '返信が来るまでお待ちください。'
   - 3秒: 'キャラクター名がこれからメッセージ入力します'
   - 6秒: 'メッセージ入力を始めています'
   - 9秒: '書き込んでいます'
   - 12秒: 'もう少しお待ちください'
   - 17秒: '返信がもうすぐ届きますのでお待ちください'
```

### 動的メッセージ変更の実装（chat-ui.js:316-342）

```javascript
waitingMessages.forEach((msgObj, index) => {
    const timer = setTimeout(() => {
        // メッセージが削除されたら停止
        if (!messageDiv.parentNode) {
            return;
        }
        
        // テキストをフェードアウト（0.6秒）
        textDiv.style.transition = 'opacity 0.6s ease-in-out';
        textDiv.style.opacity = '0.4';
        
        // 600ms後にテキストを変更してフェードイン
        setTimeout(() => {
            if (messageDiv.parentNode) {
                textDiv.textContent = msgObj.text;  // ← メッセージを変更
                textDiv.style.transition = 'opacity 0.8s ease-in-out';
                textDiv.style.opacity = '1';
            }
        }, 600);
    }, msgObj.delay);  // ← この遅延で時間経過を管理
    
    timers.push(timer);
});
```

---

## 🚨 考えられる原因

### 原因1: **待機メッセージが削除されるのが早い**
- **影響**: メッセージ変更タイマーが実行される前にメッセージが削除される
- **削除場所**: `chat-engine.js:3094-3104`（APIレスポンス受信時）
- **症状**: 「返信が来るまでお待ちください。」のみが表示される

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
            waitingElement.remove();  // ← ここでメッセージが削除される
        }
    }
}
```

### 原因2: **APIレスポンスが非常に早い（短時間でタイマーが終了）**
- **影響**: 複数のタイマーが設定される前にメッセージが削除される
- **症状**: 第1番目のメッセージのみが表示される

### 原因3: **clearLoadingMessageTimers()が実行される**
- **影響**: アニメーション用のタイマーがすべてクリアされる
- **場所**: `chat-ui.js:348-368`

```javascript
clearLoadingMessageTimers(messageElement) {
    if (!messageElement) return;
    
    // 保存されたタイマーIDを取得
    const timerIdsJson = messageElement.dataset.loadingMessageTimers;
    if (timerIdsJson) {
        try {
            const timerIds = JSON.parse(timerIdsJson);
            timerIds.forEach(timerId => {
                clearTimeout(timerId);  // ← すべてのタイマーがクリアされる
            });
        } catch (error) {
            console.warn('[ChatUI.clearLoadingMessageTimers] タイマーのクリアに失敗:', error);
        }
    }
}
```

### 原因4: **CSS `display: none` が設定されている可能性**
- **影響**: 要素が非表示になり、テキスト変更が見えない
- **確認方法**: ブラウザの開発者ツールで検査

---

## 📋 デバッグ用チェックリスト

待機画面の問題を特定するため、以下を確認してください：

### ステップ1: ブラウザコンソールで以下を確認
```javascript
// 待機メッセージが作成されているか
window.ChatUI.messagesDiv.querySelectorAll('.message.loading-message');

// タイマーが保存されているか
document.querySelectorAll('[data-loading-message-timers]');

// データセットを確認
document.querySelector('[data-loading-message-timers]')?.dataset.loadingMessageTimers;
```

### ステップ2: 待機メッセージのタイマーが実行されているか
```javascript
// _setupLoadingMessageAnimation内のログを確認
// コンソールで以下のような出力を見ればタイマーが設定されている
// "타이머를 보존하는 배열: [4291, 4292, 4293, ...]"
```

### ステップ3: clearLoadingMessageTimers()が呼ばれているか
```javascript
// clearLoadingMessageTimers()が APIレスポンス前に呼ばれているか確認
// コンソールで確認 - こういうメッセージが出ていないか
// "[ChatUI.clearLoadingMessageTimers] タイマーのクリアに失敗"
```

### ステップ4: メッセージが削除されるタイミング
```javascript
// メッセージが削除される前に十分な時間があるか
// APIレスポンスが17秒以上かかっているか確認

// ネットワーク遅延を確認
// ブラウザの開発者ツール → ネットワークタブ
// /api/consult または同様のAPI の応答時間を確認
```

---

## 🔧 推定される解決策

### 対策1: **タイマーをクリアしない設定**
`onResponseReceived()` でタイマーをクリアしないようにする

### 対策2: **メッセージ削除の遅延**
APIレスポンス受信後、一定時間待ってからメッセージを削除

### 対策3: **メッセージ変更タイマーの早期実行**
最初のタイマー遅延を短くする（例：3秒ではなく1秒に変更）

---

## 📌 その他の待機画面実装

### `waitingOverlay` について
- **場所**: chat-engine.js 内で複数参照
- **問題**: HTMLに定義されていない（`null`を返す）
- **影響**: ページ初期化時の待機画面が機能していない可能性
- **状態**: ⚠️ **デッド コード** - 実装と使用がミスマッチ

**対策**:
1. HTML に `<div id="waitingOverlay"></div>` を追加するか
2. chat-engine.js で `waitingOverlay` の参照をすべて削除する

---

## 💡 実装の改善提案

### 現在の問題点
1. `waitingOverlay` が定義されていない（デッド コード）
2. メッセージ送信時の待機画面の削除タイミングが不明確
3. タイマー管理が複雑で、削除と同時にクリアされる

### 推奨される改善
1. ページ初期化用と メッセージ送信用の待機画面を明確に分離
2. APIレスポンス受信後の処理をより明確にする
3. タイマーのクリア時期をドキュメント化する

---

**確認完了**: ⚠️ **問題特定完了** - 詳細な原因はネットワークタイミングとタイマー管理の相互作用の可能性

