# URL構造ガイドライン

## 基本原則

### 1. ユーザー情報の管理
- **データベースIDのみを使用**: ユーザー情報はURLパラメータに含めず、データベースの`userId`（数値ID）のみを使用する
- **ニックネーム、生年月日などの個人情報はURLに含めない**
- `userId`はデータベースから取得した数値IDのみ

### 2. URLパラメータの構造

#### 許可されるパラメータ
- `character`: 鑑定士ID（例: `yukino`, `kaede`）
- `userId`: データベースのユーザーID（数値のみ）
- `return`: 戻り先URL（相対パスまたは絶対URL）
- `message`: APIに送信するメッセージ（タロット待機画面など）

#### 禁止されるパラメータ
- `nickname`: ニックネーム（個人情報）
- `birthYear`, `birthMonth`, `birthDay`: 生年月日（個人情報）
- `gender`: 性別（個人情報）
- その他の個人を特定できる情報

### 3. 待機画面への遷移

#### 重要な原則
- **待機画面（`tarot-waiting.html`）は単なる表示用ページ**
- **全ての処理はハンドラー側で行う**
- **ハンドラー側でペイロードを準備し、`sessionStorage`に保存**

#### 正しい実装例（ハンドラー側）
```javascript
// ハンドラー側（chat-engine.js、yukino-tarot.jsなど）でペイロードを準備
let conversationHistory = ChatData.conversationHistory?.recentMessages || [];

const clientHistory = conversationHistory.map(entry => ({
    role: entry.role || 'user',
    content: entry.content || entry.message || ''
}));

// ユーザー情報を取得
const urlParams = new URLSearchParams(window.location.search);
let userId = null;
const userIdParam = urlParams.get('userId');
if (userIdParam) {
    userId = Number(userIdParam);
    if (!Number.isFinite(userId) || userId <= 0) {
        userId = null;
    }
}

if (!userId && ChatData?.conversationHistory?.userId) {
    userId = ChatData.conversationHistory.userId;
}

// ペイロードを作成
const payload = {
    message: messageToSend,
    character: character,
    clientHistory: clientHistory,
    userId: userId || undefined
};

// ペイロードをsessionStorageに保存（待機画面で使用）
sessionStorage.setItem('tarotWaitingPayload', JSON.stringify(payload));

// returnUrlにuserIdを確実に含める
let returnUrl = window.location.pathname + window.location.search;
if (userId && !userIdParam) {
    const separator = returnUrl.includes('?') ? '&' : '?';
    returnUrl = `${returnUrl}${separator}userId=${encodeURIComponent(String(userId))}`;
}

const waitingUrl = `tarot-waiting.html?character=${character}&return=${encodeURIComponent(returnUrl)}&message=${encodeURIComponent(messageToSend)}`;
```

#### 間違った実装例（禁止）
```javascript
// ❌ 待機画面でユーザー情報を取得しようとする
// tarot-waiting.htmlでnickname、birthYearなどを取得

// ❌ 待機画面でメッセージカウントを計算する
// tarot-waiting.htmlでguestMessageCountを取得

// ❌ 個人情報をURLに含める
const waitingUrl = `tarot-waiting.html?character=${character}&nickname=${nickname}&birthYear=${birthYear}...`;

// ❌ 現在のURLをそのまま使用（userIdが含まれていない可能性がある）
const waitingUrl = `tarot-waiting.html?character=${character}&return=${encodeURIComponent(window.location.href)}...`;
```

### 4. 待機画面の実装

#### 正しい実装（待機画面側）
```javascript
// tarot-waiting.html - 最小限の実装

// URLパラメータから取得（最小限の情報のみ）
const urlParams = new URLSearchParams(window.location.search);
const character = urlParams.get('character') || 'yukino';
const returnUrl = urlParams.get('return') || '../chat/chat.html';
const message = urlParams.get('message') ? decodeURIComponent(urlParams.get('message')) : '';

// API呼び出し
function startApiCall() {
    // ハンドラー側で準備されたペイロードを取得
    let payloadStr = sessionStorage.getItem('tarotWaitingPayload');
    let payload;
    
    if (payloadStr) {
        try {
            payload = JSON.parse(payloadStr);
            sessionStorage.removeItem('tarotWaitingPayload');
        } catch (e) {
            // フォールバック：最小限のペイロード
            payload = { message, character };
        }
    } else {
        // ハンドラーがペイロードを準備していない場合
        payload = { message, character };
    }
    
    // APIに送信
    fetch('/api/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(/* ... */);
}
```

## チェックリスト

新しいページや機能を追加する際は、以下を確認してください：

- [ ] URLパラメータに個人情報（ニックネーム、生年月日など）が含まれていないか
- [ ] `userId`はデータベースの数値IDのみを使用しているか
- [ ] 待機画面への遷移時に`userId`が適切に引き継がれているか
- [ ] 待機画面から戻る際に`userId`が確実に含まれているか
- [ ] `AuthState.getUserId()`を使用して`userId`を取得しているか
- [ ] 待機画面（`tarot-waiting.html`）でユーザー情報を取得しようとしていないか
- [ ] 待機画面への遷移前に、ハンドラー側でペイロードを準備しているか
- [ ] 待機画面は`sessionStorage`からペイロードを取得するだけになっているか

## 関連ファイル

- `public/pages/chat/tarot-waiting.html`: 待機画面の実装例
- `public/js/features/yukino-tarot.js`: タロット機能の実装例
- `public/js/chat-engine.js`: チャットエンジンの実装例

## 参考実装

他のページでの正しい実装例：
- `public/pages/auth/login.html`: ログイン後のリダイレクト
- `public/pages/auth/register.html`: 登録後のリダイレクト
- `public/pages/chat/chat.html`: チャット画面のURL管理
