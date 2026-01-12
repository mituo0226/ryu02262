# ローカルストレージとデータベースの使用状況詳細分析レポート

## 概要

本レポートでは、ゲストユーザー/登録ユーザーの判断方法、すべてのハンドラーでのローカルストレージ使用状況、およびデータベースベースの判断への移行に関する詳細な分析を行います。

## 1. ゲストユーザー/登録ユーザーの判断方法

### 1.1 現在の実装

#### A. フロントエンドでの判断（`auth-state.js`）

```javascript
function isRegistered() {
    return !!(localStorage.getItem('userNickname') && 
              localStorage.getItem('birthYear') && 
              localStorage.getItem('birthMonth') && 
              localStorage.getItem('birthDay'));
}
```

**問題点**:
- ローカルストレージ（localStorage）に依存している
- ブラウザを変えたり、ローカルストレージをクリアすると判断できない
- データベースの状態と同期していない

#### B. データベースでの判断

**現在のデータベーススキーマ（`schema.sql`）**:

```sql
-- CREATE TABLE IF NOT EXISTS users (
--   id INTEGER PRIMARY KEY AUTOINCREMENT,
--   user_type TEXT NOT NULL DEFAULT 'registered', -- 'guest' | 'registered'
--   ...
-- );
```

**問題点**:
- `user_type`カラムは定義されているが、実際には使用されていない
- すべてのユーザーが登録時に`users`テーブルに保存される
- 実際にはすべてのユーザーがデータベースに保存されているため、`user_type`の区別は不要

#### C. API（`conversation-history.ts`）での判断

```typescript
// nickname + 生年月日からuser_idを解決
const user = await env.DB.prepare<UserRecord>(
  'SELECT id, nickname, birth_year, birth_month, birth_day, guardian FROM users WHERE nickname = ? AND birth_year = ? AND birth_month = ? AND birth_day = ?'
)
  .bind(nickname.trim(), Number(birthYear), Number(birthMonth), Number(birthDay))
  .first();

if (!user) {
  return new Response(
    JSON.stringify({
      hasHistory: false,
      error: 'user not found',
    } as ResponseBody),
    { status: 404, headers: corsHeaders }
  );
}
```

**現状**:
- APIは`nickname + 生年月日`でユーザーを特定している
- ユーザーが見つからない場合（404）は、会話履歴がない（`hasHistory: false`）と判断される
- 実際には、すべてのユーザーが登録時にデータベースに保存されるため、404が返ることはない（登録済みユーザーのみ）

**問題点**:
- ゲストユーザーの概念がAPIには存在しない
- すべてのユーザーがデータベースに保存される前提
- フロントエンドでは`AuthState.isRegistered()`でゲスト/登録を判断しているが、データベースでは区別されていない

### 1.2 重要な発見

**データベースに`user_type`カラムが存在し、実際に使用されている**

`register.ts`を確認したところ、以下のように`user_type`が設定されています：

```typescript
// user_type: 'guest' - ニックネーム・生年月日・性別のみを登録したユーザー（デフォルト）
const userType = 'guest';

const result = await env.DB.prepare(
  `INSERT INTO users (
    nickname,
    birth_year,
    birth_month,
    birth_day,
    passphrase,
    last_activity_at,
    gender,
    user_type
  ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`
)
  .bind(trimmedNickname, birthYear, birthMonth, birthDay, passphrase, gender || null, userType)
  .run();
```

**しかし、`conversation-history.ts` APIでは`user_type`を使用していない**

`conversation-history.ts` APIを確認したところ、以下のように`user_type`カラムを取得していません：

```typescript
const user = await env.DB.prepare<UserRecord>(
  'SELECT id, nickname, birth_year, birth_month, birth_day, guardian FROM users WHERE nickname = ? AND birth_year = ? AND birth_month = ? AND birth_day = ?'
)
  .bind(nickname.trim(), Number(birthYear), Number(birthMonth), Number(birthDay))
  .first();
```

**問題点**:
- データベースには`user_type`カラムが存在し、実際に`'guest'`として保存されている
- しかし、`conversation-history.ts` APIでは`user_type`を取得・使用していない
- そのため、データベースでゲスト/登録ユーザーを判断することができない

### 1.3 結論

**ゲストユーザー/登録ユーザーの判断は、現在データベース上で行うことができていない**

- データベースには`user_type`カラムが存在し、実際に使用されている（`register.ts`で`'guest'`として保存）
- しかし、`conversation-history.ts` APIでは`user_type`を取得・使用していない
- フロントエンドでは`AuthState.isRegistered()`（localStorageベース）で判断している
- APIでは、すべてのユーザーがデータベースに保存される前提で動作しているが、`user_type`を区別していない

**推奨される対応**:
- `conversation-history.ts` APIで`user_type`を取得し、レスポンスに含める
- または、`user_type`の区別を廃止し、すべてのユーザーを同じように扱う（現在の実装を維持）
- フロントエンドでの`isGuestMode`判断を削除し、データベースの存在確認に統一する

## 2. すべてのハンドラーでのローカルストレージ使用状況

### 2.1 楓（kaede）ハンドラー

#### A. `initPage`メソッド

**現在のパラメータ**:
```javascript
async initPage(urlParams, historyData, justRegistered, shouldTriggerRegistrationFlow, options = {}) {
    const { isGuestMode = false, guestHistory = [], guardianMessageShown = false } = options;
    // ...
}
```

**ローカルストレージ使用箇所**:
1. **守護神の確認** (199-207行目):
   ```javascript
   const localStorageDeity = localStorage.getItem('assignedDeity');
   hasAssignedDeity = !!(localStorageDeity && localStorageDeity.trim() !== '');
   ```
   - **問題点**: `historyData.assignedDeity`から取得できるが、localStorageからも確認している

2. **ニックネームの取得** (223行目):
   ```javascript
   const nickname = ChatData.userNickname || localStorage.getItem('userNickname') || 'あなた';
   ```
   - **問題点**: `historyData.nickname`から取得できるが、localStorageからも取得している

3. **守護神確認メッセージの生成** (515-524行目):
   ```javascript
   const ritualCompleted = sessionStorage.getItem('ritualCompleted');
   const assignedDeity = localStorage.getItem('assignedDeity');
   // ...
   const userNickname = localStorage.getItem('userNickname') || 'あなた';
   ```
   - **問題点**: `historyData.assignedDeity`と`historyData.nickname`から取得できる

4. **ユーザーデータの更新** (625-631行目, 654-661行目):
   ```javascript
   const nickname = localStorage.getItem('userNickname') || '鑑定者';
   const deity = localStorage.getItem('assignedDeity') || '未割当';
   const birthYear = localStorage.getItem('birthYear');
   // ...
   ```
   - **問題点**: `historyData`から取得できるが、localStorageからも取得している

5. **sessionStorage使用箇所**:
   - `ritualCompleted` (515行目, 611行目, 672行目)
   - `guardianMessageShown` (520行目, 614行目, 673行目)
   - `acceptedGuardianRitual` (493行目, 527行目, 678行目)
   - `firstQuestionBeforeRitual` (387行目)
   - `pendingRitualGuestHistory` (533行目, 730行目)
   - `justRegistered` (586行目, 699行目, 746行目)
   - `guestConversationHistory_*` (316行目, 372行目)
   - `pendingGuestHistoryMigration` (318行目, 373行目)

#### B. `checkGuardianRitualCompletion`メソッド

**ローカルストレージ使用箇所**:
- `ritualCompleted` (515行目)
- `assignedDeity` (516行目)
- `guardianMessageShown` (520行目)
- `userNickname` (522行目)
- `acceptedGuardianRitual` (527行目)
- `pendingRitualGuestHistory` (533行目)

### 2.2 雪乃（yukino）ハンドラー

#### A. `initPage`メソッド

**現在のパラメータ**:
```javascript
async initPage(urlParams, historyData, justRegistered, shouldTriggerRegistrationFlow) {
    // 雪乃の場合は特別な初期化処理なし
    return null;
}
```

**ローカルストレージ使用箇所**:
1. **`checkGuestRevisit`メソッド** (90-123行目):
   ```javascript
   const hasConversedAsGuest = localStorage.getItem('yukinoGuestConversed');
   ```
   - **問題点**: ゲストモードで会話したことを記録するためにlocalStorageを使用

2. **`markGuestConversed`メソッド** (128-131行目):
   ```javascript
   localStorage.setItem('yukinoGuestConversed', 'true');
   ```

3. **`handlePostRegistration`メソッド** (180行目):
   ```javascript
   localStorage.removeItem('yukinoGuestConversed');
   ```

4. **sessionStorage使用箇所（タロット関連）**:
   - `yukinoTarotCardForExplanation` (267行目)
   - `yukinoConsultationStarted` (289行目)
   - `yukinoConsultationMessageCount` (297行目, 307行目)
   - `yukinoShouldShowRegistrationButton` (312行目)

### 2.3 花音（kaon）ハンドラー

#### A. `initPage`メソッド

**現在のパラメータ**:
```javascript
async initPage(urlParams, historyData, justRegistered, shouldTriggerRegistrationFlow) {
    // 三崎花音の場合は特別な初期化処理なし
    return null;
}
```

**ローカルストレージ使用箇所**:
- **なし**（`initPage`メソッドでは使用していない）

**sessionStorage使用箇所**:
- `clearGuestHistory`メソッド (156-159行目):
   ```javascript
   sessionStorage.removeItem(historyKey);
   sessionStorage.removeItem('pendingGuestHistoryMigration');
   ```

### 2.4 ソラ（sora）ハンドラー

#### A. `initPage`メソッド

**現在のパラメータ**:
```javascript
async initPage(urlParams, historyData, justRegistered, shouldTriggerRegistrationFlow) {
    // ソラの場合は特別な初期化処理なし
    return null;
}
```

**ローカルストレージ使用箇所**:
1. **`checkGuestRevisit`メソッド** (27-60行目):
   ```javascript
   const hasConversedAsGuest = localStorage.getItem('soraGuestConversed');
   ```
   - **問題点**: ゲストモードで会話したことを記録するためにlocalStorageを使用

2. **`markGuestConversed`メソッド** (65-68行目):
   ```javascript
   localStorage.setItem('soraGuestConversed', 'true');
   ```

3. **`handlePostRegistration`メソッド** (120行目):
   ```javascript
   localStorage.removeItem('soraGuestConversed');
   ```

**sessionStorage使用箇所**:
- `clearGuestHistory`メソッド (213-216行目):
   ```javascript
   sessionStorage.removeItem(historyKey);
   sessionStorage.removeItem('pendingGuestHistoryMigration');
   ```

### 2.5 まとめ

| ハンドラー | `initPage`でoptions使用 | localStorage使用 | sessionStorage使用 |
|-----------|----------------------|-----------------|-------------------|
| 楓（kaede） | ✅ 使用（`guestHistory`, `guardianMessageShown`） | ✅ 多数（守護神、ニックネーム、生年月日など） | ✅ 多数（儀式関連フラグなど） |
| 雪乃（yukino） | ❌ 使用していない | ✅ あり（`yukinoGuestConversed`） | ✅ あり（タロット関連フラグ） |
| 花音（kaon） | ❌ 使用していない | ❌ なし | ✅ あり（`clearGuestHistory`のみ） |
| ソラ（sora） | ❌ 使用していない | ✅ あり（`soraGuestConversed`） | ✅ あり（`clearGuestHistory`のみ） |

**問題点**:
- 楓のハンドラーは`options`パラメータを使用しているが、他のハンドラーは使用していない
- 楓のハンドラーは多くのlocalStorage/sessionStorageを使用している
- 雪乃とソラのハンドラーは、ゲストモードで会話したことを記録するためにlocalStorageを使用している

## 3. データベースベースの判断への移行に関する詳細分析

### 3.1 現在の問題点

#### A. 会話履歴の判断

**現在の実装**:
- データベースの`hasHistory`とローカルストレージの`guestHistory`が混在
- `guardianMessageShown`フラグがローカルストレージに保存されている

**問題点**:
- データベースの`hasHistory`が`true`でも、ローカルストレージの`guestHistory`が存在すると、初回メッセージが表示されない
- `guardianMessageShown`フラグがキャラクター切り替え時にクリアされるが、データベースの状態と同期していない

#### B. ユーザー情報の取得

**現在の実装**:
- `historyData`から取得できる情報を、localStorageからも取得している
- `historyData`が取得できない場合のフォールバックとしてlocalStorageを使用

**問題点**:
- データベースから取得できる情報をlocalStorageからも取得することで、データの整合性が保証されない
- データベースとlocalStorageの同期が取れていない場合、不整合が発生する

#### C. ゲストユーザーの概念

**現在の実装**:
- フロントエンドでは`AuthState.isRegistered()`でゲスト/登録を判断
- データベースでは、すべてのユーザーが`users`テーブルに保存される
- APIでは、すべてのユーザーが登録済みユーザーとして扱われる

**問題点**:
- フロントエンドとデータベースでゲストユーザーの概念が異なる
- 実際には、すべてのユーザーがデータベースに保存されるため、ゲストユーザーの概念は不要

### 3.2 推奨される対応

#### A. 会話履歴の判断

**推奨**:
- データベースの`hasHistory`のみで判断する
- ローカルストレージの`guestHistory`を削除する
- `guardianMessageShown`フラグを削除する（データベースの`assignedDeity`で判断する）

#### B. ユーザー情報の取得

**推奨**:
- `historyData`から取得できる情報は、必ず`historyData`から取得する
- localStorageは、`historyData`が取得できない場合のフォールバックとしてのみ使用する
- または、localStorageを完全に削除し、常にデータベースから取得する

#### C. ゲストユーザーの概念

**推奨**:
- すべてのユーザーをデータベースに保存する（現在の実装を維持）
- フロントエンドでの`isGuestMode`判断を削除する
- または、データベースの`user_type`カラムを実際に使用して、データベースで判断する

### 3.3 実装の優先順位

1. **最優先**: 会話履歴の判断をデータベースの`hasHistory`のみに統一
2. **優先**: ユーザー情報の取得を`historyData`のみに統一
3. **中優先**: ゲストユーザーの概念の整理（すべてデータベースに保存する前提に統一）

## 4. その他の問題点

### 4.1 ハンドラーの`initPage`メソッドのパラメータ

**現在の実装**:
```javascript
async initPage(urlParams, historyData, justRegistered, shouldTriggerRegistrationFlow, options = {}) {
    const { isGuestMode = false, guestHistory = [], guardianMessageShown = false } = options;
}
```

**問題点**:
- 楓のハンドラーは`options`を使用しているが、他のハンドラーは使用していない
- `guestHistory`と`guardianMessageShown`は、データベースベースの判断に移行する際に削除される

**推奨**:
- `options`パラメータを削除し、`historyData`から必要な情報を取得する
- または、`options`パラメータを最小限に減らす（`isGuestMode`のみ、または削除）

### 4.2 タロット関連フラグ（雪乃）

**現在の実装**:
- `yukinoTarotCardForExplanation`, `yukinoConsultationStarted`, `yukinoConsultationMessageCount`などがsessionStorageに保存されている

**問題点**:
- タロットカードの状態はデータベースに保存されていない
- ブラウザやデバイスを変えると状態が失われる

**推奨**:
- タロットカードの状態は一時的なものなので、sessionStorageを継続使用（会話履歴の判断には影響しない）
- または、データベースに保存する（会話履歴の判断に影響する場合は必須）

### 4.3 ゲストモード再訪問チェック（雪乃・ソラ）

**現在の実装**:
- 雪乃とソラのハンドラーは、`yukinoGuestConversed`/`soraGuestConversed`をlocalStorageに保存している

**問題点**:
- ゲストモードで会話したことを記録するためにlocalStorageを使用している
- データベースで判断できない

**推奨**:
- データベースに会話履歴が存在する場合は、再訪問と判断する
- localStorageの`yukinoGuestConversed`/`soraGuestConversed`を削除する

## 5. まとめ

### 5.1 主な問題点

1. **ゲストユーザー/登録ユーザーの判断がデータベースで行えていない**
   - フロントエンドでは`AuthState.isRegistered()`（localStorageベース）で判断
   - データベースでは`user_type`カラムが使用されていない
   - 実際にはすべてのユーザーがデータベースに保存される

2. **すべてのハンドラーでローカルストレージを使用している**
   - 楓: 多数のlocalStorage/sessionStorageを使用
   - 雪乃: `yukinoGuestConversed`とタロット関連フラグ
   - 花音: `clearGuestHistory`のみ（sessionStorage）
   - ソラ: `soraGuestConversed`と`clearGuestHistory`

3. **会話履歴の判断がローカルストレージとデータベースで混在している**
   - データベースの`hasHistory`とローカルストレージの`guestHistory`が混在
   - `guardianMessageShown`フラグがローカルストレージに保存されている

### 5.2 推奨される対応

1. **会話履歴の判断をデータベースの`hasHistory`のみに統一**
   - ローカルストレージの`guestHistory`を削除
   - `guardianMessageShown`フラグを削除

2. **ユーザー情報の取得を`historyData`のみに統一**
   - localStorageは、`historyData`が取得できない場合のフォールバックとしてのみ使用
   - または、localStorageを完全に削除

3. **ゲストユーザーの概念を整理**
   - すべてのユーザーをデータベースに保存する前提に統一
   - フロントエンドでの`isGuestMode`判断を削除

4. **ハンドラーの`initPage`メソッドのパラメータを整理**
   - `options`パラメータを削除
   - `historyData`から必要な情報を取得
