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

#### 正しい実装例
```javascript
// 現在のURLからuserIdを取得
const currentUrlObj = new URL(window.location.href);
const currentUserId = currentUrlObj.searchParams.get('userId');
let returnUrl = window.location.pathname + window.location.search;

// userIdがURLに含まれていない場合、AuthStateから取得
if (!currentUserId && window.AuthState && typeof window.AuthState.getUserId === 'function') {
    const authUserId = window.AuthState.getUserId();
    if (authUserId) {
        const separator = returnUrl.includes('?') ? '&' : '?';
        returnUrl = `${returnUrl}${separator}userId=${encodeURIComponent(String(authUserId))}`;
    }
}

const waitingUrl = `tarot-waiting.html?character=${character}&return=${encodeURIComponent(returnUrl)}&message=${encodeURIComponent(message)}`;
```

#### 間違った実装例（禁止）
```javascript
// ❌ 個人情報をURLに含める
const waitingUrl = `tarot-waiting.html?character=${character}&nickname=${nickname}&birthYear=${birthYear}&birthMonth=${birthMonth}&birthDay=${birthDay}&message=${message}`;

// ❌ 現在のURLをそのまま使用（userIdが含まれていない可能性がある）
const waitingUrl = `tarot-waiting.html?character=${character}&return=${encodeURIComponent(window.location.href)}&message=${message}`;
```

### 4. 待機画面からの復帰

#### 正しい実装例
```javascript
// returnUrlからuserIdを抽出
let userIdFromReturn = null;
try {
    const returnUrlObj = new URL(returnUrl, window.location.origin);
    userIdFromReturn = returnUrlObj.searchParams.get('userId');
} catch (e) {
    // 相対URLの場合は、現在のURLからuserIdを取得
    const currentUrlParams = new URLSearchParams(window.location.search);
    userIdFromReturn = currentUrlParams.get('userId');
}

// returnUrlにuserIdが含まれていない場合、sessionStorageやAuthStateから取得
if (!userIdFromReturn) {
    if (window.AuthState && typeof window.AuthState.getUserId === 'function') {
        const authUserId = window.AuthState.getUserId();
        if (authUserId) {
            userIdFromReturn = String(authUserId);
        }
    }
}

// returnUrlにuserIdを確実に含める
if (userIdFromReturn) {
    try {
        const returnUrlObj = new URL(returnUrl, window.location.origin);
        returnUrlObj.searchParams.set('userId', userIdFromReturn);
        returnUrl = returnUrlObj.pathname + returnUrlObj.search;
    } catch (e) {
        // 相対URLの場合は、手動で追加
        const separator = returnUrl.includes('?') ? '&' : '?';
        returnUrl = `${returnUrl}${separator}userId=${encodeURIComponent(userIdFromReturn)}`;
    }
}
```

## チェックリスト

新しいページや機能を追加する際は、以下を確認してください：

- [ ] URLパラメータに個人情報（ニックネーム、生年月日など）が含まれていないか
- [ ] `userId`はデータベースの数値IDのみを使用しているか
- [ ] 待機画面への遷移時に`userId`が適切に引き継がれているか
- [ ] 待機画面から戻る際に`userId`が確実に含まれているか
- [ ] `AuthState.getUserId()`を使用して`userId`を取得しているか

## 関連ファイル

- `public/pages/chat/tarot-waiting.html`: 待機画面の実装例
- `public/js/features/yukino-tarot.js`: タロット機能の実装例
- `public/js/chat-engine.js`: チャットエンジンの実装例

## 参考実装

他のページでの正しい実装例：
- `public/pages/auth/login.html`: ログイン後のリダイレクト
- `public/pages/auth/register.html`: 登録後のリダイレクト
- `public/pages/chat/chat.html`: チャット画面のURL管理
