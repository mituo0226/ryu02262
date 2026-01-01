# メッセージカウントの起点

## 📍 メッセージの起点はどこか

現在の実装では、**特別な「起点を設定する」処理はありません**。会話履歴への追加が自然に起点となります。

## 🔄 メッセージカウントの起点となる処理

### 1. メッセージ送信時（起点となる箇所）

**ファイル**: `public/js/chat-init.js`  
**行数**: 391行目

```javascript
ChatData.addToGuestHistory(character, 'user', messageToSend);
```

この処理が、**最初のメッセージを会話履歴に追加する起点**です。

### 2. 会話履歴への追加処理

**ファイル**: `public/js/chat-data.js`  
**行数**: 155-158行目

```javascript
addToGuestHistory(character, role, content) {
    const history = this.getGuestHistory(character);
    history.push({ role, content });
    this.setGuestHistory(character, history);
}
```

この関数が、会話履歴にメッセージを追加します。

### 3. カウントの計算

**ファイル**: `public/js/chat-data.js`  
**行数**: 65-96行目

```javascript
getGuestMessageCount(character) {
    const history = this.getGuestHistory(character);
    if (history && Array.isArray(history)) {
        const userMessageCount = history.filter(msg => msg && msg.role === 'user').length;
        return userMessageCount;
    }
    return 0;
}
```

この関数が、会話履歴からユーザーメッセージ数を直接数えます。

## 📊 カウントの起点の動作

### 初回メッセージ送信時

1. **会話履歴が空の状態**:
   ```
   会話履歴: []
   getGuestMessageCount() → 0
   ```

2. **最初のメッセージを送信**（391行目）:
   ```javascript
   ChatData.addToGuestHistory(character, 'user', '最初のメッセージ');
   ```
   
3. **会話履歴に追加される**:
   ```
   会話履歴: [
     { role: 'user', content: '最初のメッセージ' }
   ]
   ```

4. **カウントが自動的に1になる**:
   ```javascript
   getGuestMessageCount(character) → 1 (会話履歴から計算)
   ```

### 2回目のメッセージ送信時

1. **現在の会話履歴**:
   ```
   会話履歴: [
     { role: 'user', content: '最初のメッセージ' },
     { role: 'assistant', content: 'AIの返信' }
   ]
   getGuestMessageCount() → 1
   ```

2. **2回目のメッセージを送信**（391行目）:
   ```javascript
   ChatData.addToGuestHistory(character, 'user', '2番目のメッセージ');
   ```

3. **会話履歴に追加される**:
   ```
   会話履歴: [
     { role: 'user', content: '最初のメッセージ' },
     { role: 'assistant', content: 'AIの返信' },
     { role: 'user', content: '2番目のメッセージ' }
   ]
   ```

4. **カウントが自動的に2になる**:
   ```javascript
   getGuestMessageCount(character) → 2 (会話履歴から計算)
   ```

## 🎯 起点の明確化

### 現在の実装

- **起点**: `chat-init.js` 391行目の `ChatData.addToGuestHistory(character, 'user', messageToSend);`
- **処理**: 会話履歴にメッセージを追加する
- **カウント**: 自動的に会話履歴から計算される

### 起点となるコードの全体像

```javascript
// chat-init.js: 330-420行目
async sendMessage(skipUserMessage = false, skipAnimation = false) {
    // ... (前処理) ...
    
    if (isGuest) {
        // メッセージ送信前：制限チェック
        const guestCount = ChatData.getGuestMessageCount(character);
        
        // メッセージ送信後：会話履歴に追加（ここが起点）
        ChatData.addToGuestHistory(character, 'user', messageToSend);
        
        // 最新のカウントを取得（自動的に+1されている）
        const messageCount = ChatData.getGuestMessageCount(character);
    }
}
```

## 📝 まとめ

**メッセージの起点**:
- **場所**: `public/js/chat-init.js` 391行目
- **処理**: `ChatData.addToGuestHistory(character, 'user', messageToSend);`
- **動作**: 会話履歴にメッセージを追加する（これが起点）

**カウントの起点**:
- **場所**: `public/js/chat-data.js` 71行目
- **処理**: `history.filter(msg => msg.role === 'user').length;`
- **動作**: 会話履歴からユーザーメッセージ数を直接数える

**重要なポイント**:
- 特別な「起点を設定する」処理はない
- 会話履歴にメッセージを追加することが自然に起点となる
- 最初のメッセージが追加された時点で、カウントが自動的に1になる

