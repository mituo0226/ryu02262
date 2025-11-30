# ゲストユーザーのメッセージカウント仕様

## 🎯 基本仕様

ゲストユーザーのメッセージカウントは、以下の原則で動作します：

### 1. 初回ログイン時

**動作**:
- 最初に楓（または他の鑑定士）がメッセージを送ってきた返事を送った時点で、**メッセージ数1**とカウント
- その後は会話履歴から自動的にカウントが増えていく

**実装**:
- `chat-init.js` 391行目: `ChatData.addToGuestHistory(character, 'user', messageToSend);`
- これが最初のメッセージを会話履歴に追加する処理
- 会話履歴に追加されると、`getGuestMessageCount()`が自動的に1を返す

### 2. 会話履歴の保存

**保存場所**: `sessionStorage`
- キー: `guestConversationHistory_{character}`
- 有効期間: ブラウザを閉じるまで（同一セッション内）

**実装**:
- `chat-data.js` 116-136行目: `getGuestHistory()` - sessionStorageから取得
- `chat-data.js` 143-147行目: `setGuestHistory()` - sessionStorageに保存

### 3. ログアウト（ブラウザを閉じる）

**動作**:
- sessionStorageがクリアされる
- 会話履歴もすべて削除される

### 4. 再ログイン時

**動作**:
- 新しいセッションなので、会話履歴は空
- 最初のメッセージを送った時点で、**また1からスタート**

## 📊 メッセージカウントの流れ

### シナリオ1: 初回ログイン → メッセージ送信

```
1. ページ読み込み
   → 会話履歴: [] (空)
   → getGuestMessageCount() = 0

2. 最初のメッセージを送信
   → addToGuestHistory('kaede', 'user', 'こんにちは')
   → 会話履歴: [{ role: 'user', content: 'こんにちは' }]
   → getGuestMessageCount() = 1 ✅ (初回送信)

3. 2回目のメッセージを送信
   → addToGuestHistory('kaede', 'user', 'ありがとう')
   → 会話履歴: [
        { role: 'user', content: 'こんにちは' },
        { role: 'assistant', content: 'AIの返信' },
        { role: 'user', content: 'ありがとう' }
      ]
   → getGuestMessageCount() = 2 ✅
```

### シナリオ2: 同じセッション内でページを再読み込み

```
1. ページ読み込み
   → sessionStorageから会話履歴を取得
   → 会話履歴: [
        { role: 'user', content: 'こんにちは' },
        { role: 'assistant', content: 'AIの返信' },
        { role: 'user', content: 'ありがとう' }
      ]
   → getGuestMessageCount() = 2 ✅ (会話履歴から自動計算)

2. 3回目のメッセージを送信
   → addToGuestHistory('kaede', 'user', 'わかりました')
   → getGuestMessageCount() = 3 ✅
```

### シナリオ3: ブラウザを閉じて再ログイン

```
1. ブラウザを閉じる
   → sessionStorageがクリアされる
   → 会話履歴もすべて削除

2. 再ログイン（新しいセッション）
   → 会話履歴: [] (空)
   → getGuestMessageCount() = 0

3. 最初のメッセージを送信
   → addToGuestHistory('kaede', 'user', '初めまして')
   → 会話履歴: [{ role: 'user', content: '初めまして' }]
   → getGuestMessageCount() = 1 ✅ (新しいセッション、1からスタート)
```

## 🔑 重要なポイント

### 1. 会話履歴が唯一の真実の源

- メッセージカウントは会話履歴から直接計算される
- sessionStorageは会話履歴の保存場所として機能
- 会話履歴をリセットしない限り、カウントは0にならない

### 2. 最初のメッセージ = カウント1

- 最初のメッセージを送った時点で、メッセージ数1とカウント
- これが明確な起点
- その後は自動的に2, 3, 4...と増えていく

### 3. セッション単位で管理

- 同一セッション内: 会話履歴が保持される → カウントも継続
- セッション終了: sessionStorageがクリア → 会話履歴も削除
- 新しいセッション: また1からスタート

## 🎯 実装の詳細

### メッセージ送信時の処理

**ファイル**: `public/js/chat-init.js` 388-420行目

```javascript
if (isGuest) {
    // メッセージ送信前のカウントを確認（初回送信かどうかを判定）
    const historyBeforeAdd = ChatData.getGuestHistory(character);
    const countBeforeAdd = historyBeforeAdd.filter(msg => msg && msg.role === 'user').length;
    const isFirstMessage = countBeforeAdd === 0;
    
    // 会話履歴にメッセージを追加（最初のメッセージなら1からスタート）
    ChatData.addToGuestHistory(character, 'user', messageToSend);
    
    // 最新のカウントを取得（自動的に計算される）
    const messageCount = ChatData.getGuestMessageCount(character);
    // 最初のメッセージなら1、それ以降は自動的に増える
}
```

### カウントの計算

**ファイル**: `public/js/chat-data.js` 65-96行目

```javascript
getGuestMessageCount(character) {
    // 会話履歴が唯一の真実の源
    const history = this.getGuestHistory(character);
    
    if (history && Array.isArray(history)) {
        // 会話履歴からユーザーメッセージ数を直接数える
        const userMessageCount = history.filter(msg => msg && msg.role === 'user').length;
        return userMessageCount; // 最初のメッセージなら1、それ以降は自動的に増える
    }
    
    return 0; // 会話履歴が空の場合のみ0
}
```

## ✅ 動作確認

### チェックポイント

1. **初回送信時**
   - [ ] 会話履歴が空の状態から最初のメッセージを送信
   - [ ] メッセージカウントが1になることを確認
   - [ ] コンソールに「🎯 最初のメッセージを送信しました（カウント=1からスタート）」と表示される

2. **2回目以降の送信**
   - [ ] メッセージカウントが自動的に増えることを確認
   - [ ] 会話履歴から正しく計算されることを確認

3. **ページ再読み込み**
   - [ ] sessionStorageから会話履歴が復元されることを確認
   - [ ] メッセージカウントが正しく表示されることを確認

4. **ブラウザを閉じて再ログイン**
   - [ ] 会話履歴が空になることを確認
   - [ ] メッセージカウントが0になることを確認
   - [ ] 最初のメッセージを送信すると、また1からスタートすることを確認

## 📝 まとめ

- **起点**: 最初のメッセージを送った時点でメッセージ数1とカウント
- **保存**: sessionStorageに会話履歴を保存（同一セッション内）
- **計算**: 会話履歴から直接計算（自動的）
- **リセット**: ブラウザを閉じると会話履歴がクリアされ、新しいセッションでは1からスタート

