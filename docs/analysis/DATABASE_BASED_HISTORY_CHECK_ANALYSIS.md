# データベースベースの会話履歴チェック分析レポート

## 概要

現在のコードはローカルストレージ（sessionStorage/localStorage）ベースの判断とデータベースベースの判断が混在しており、これが原因で初回メッセージの表示が正常に動作しない問題が発生しています。

本レポートでは、データベースベースの判断のみを使用するように変更する際の問題点を詳しく分析します。

## 1. 現在の問題点

### 1.1 ローカルストレージベースの判断が使用されている箇所

#### A. `guardianMessageShown` (sessionStorage)
- **使用箇所**: 
  - 363行目: フラグを事前チェック
  - 413行目: ゲスト履歴表示チェック
  - 525行目: 守護神確認メッセージ追加チェック
  - 579行目: 初回メッセージ表示条件
  - 703行目: 初回メッセージ表示条件
  - 776行目: 初回メッセージ表示条件
  - 793行目: フラグクリア

- **問題点**: 
  - キャラクター切り替え時にフラグがクリアされるが、データベースの状態と同期していない
  - 楓の守護神の儀式完了後のみ設定されるが、他のキャラクターでも影響を受ける

#### B. `guestHistory` (sessionStorage)
- **使用箇所**:
  - 381行目: ゲスト履歴を取得
  - 422行目: ゲスト履歴を表示
  - 579行目: 初回メッセージ表示条件
  - 703行目: 初回メッセージ表示条件
  - 776行目: 初回メッセージ表示条件

- **問題点**:
  - ローカルストレージに保存されているため、ブラウザやデバイスを変えると履歴が失われる
  - データベースの会話履歴と同期していない
  - ゲストユーザーと登録済みユーザーの判断が混在している

#### C. `ritualCompleted` (sessionStorage)
- **使用箇所**: 523行目
- **問題点**: 守護神の儀式完了状態がデータベースと同期していない

#### D. `assignedDeity` (localStorage)
- **使用箇所**: 524行目、533行目
- **問題点**: データベースから取得できるが、localStorageからも読み取っている

#### E. `pendingGuardianMessage` (sessionStorage)
- **使用箇所**: 502行目
- **問題点**: 一時的な状態管理にsessionStorageを使用している

### 1.2 条件分岐の複雑さ

現在のコードには以下のような複雑な条件分岐が存在します：

```javascript
// パターン1: historyData && historyData.hasHistory (494行目)
if (historyData && historyData.hasHistory) {
    // 再訪問メッセージ
} else {
    // 初回メッセージ
}

// パターン2: historyData && historyData.nickname (626行目)
else if (historyData && historyData.nickname) {
    // ニックネームが存在する場合
}

// パターン3: 複数の条件の組み合わせ (579行目、703行目、776行目)
if (guestHistory.length === 0 && !guardianMessageShown && !handlerSkippedFirstMessage) {
    // 初回メッセージ表示
}
```

**問題点**:
- 同じロジックが複数箇所に重複している（579行目、703行目、776行目）
- `guestHistory`と`guardianMessageShown`のローカルストレージベースの判断が混在している
- データベースの`hasHistory`とローカルストレージの判断が混在している

### 1.3 データベースAPIの現状

`conversation-history.ts` APIは既に以下の情報を返しています：

- `hasHistory`: データベースに会話履歴が存在するかどうか（boolean）
- `nickname`: ユーザーのニックネーム
- `birthYear`, `birthMonth`, `birthDay`: 生年月日
- `assignedDeity`: 守護神（guardianカラム）
- `recentMessages`: 最近のメッセージ（最大20件）
- `lastConversationDate`: 最後の会話日時

**問題点**:
- APIは既にデータベースから`hasHistory`を返しているが、フロントエンドでローカルストレージベースの判断を優先している
- `hasHistory`が`false`の場合でも、`guestHistory`が存在する場合は初回メッセージが表示されない

## 2. データベースベースの判断への移行方針

### 2.1 基本的な方針

1. **データベースの`hasHistory`のみで判断する**
   - `hasHistory === true` → 再訪問メッセージ（returning）を表示
   - `hasHistory === false` → 初回メッセージ（firstTimeGuest）を表示

2. **ローカルストレージベースの判断を削除する**
   - `guardianMessageShown`の削除
   - `guestHistory`の削除（データベースの会話履歴を使用）
   - `ritualCompleted`の削除
   - `pendingGuardianMessage`の削除（データベースの会話履歴を使用）

3. **データベースから取得できる情報はAPIレスポンスを使用する**
   - `assignedDeity`は`historyData.assignedDeity`から取得
   - 会話履歴は`historyData.recentMessages`から取得

### 2.2 簡素化後のコード構造（案）

```javascript
// 会話履歴を読み込む
const historyData = await ChatAPI.loadConversationHistory(character);

// データベースのhasHistoryのみで判断
if (historyData) {
    // ユーザーデータを更新
    if (historyData.birthYear && historyData.birthMonth && historyData.birthDay) {
        ChatUI.updateUserStatus(true, {
            nickname: historyData.nickname,
            birthYear: historyData.birthYear,
            birthMonth: historyData.birthMonth,
            birthDay: historyData.birthDay,
            assignedDeity: historyData.assignedDeity
        });
    }
    
    // ハンドラーのinitPageを呼び出す
    const handler = CharacterRegistry.get(character);
    let handlerSkippedFirstMessage = false;
    if (handler && typeof handler.initPage === 'function') {
        const handlerResult = await handler.initPage(urlParams, historyData, justRegistered, shouldTriggerRegistrationFlow, {
            isGuestMode: false // すべて登録済みユーザーとして扱う
        });
        if (handlerResult && handlerResult.completed) {
            return; // 処理終了
        }
        if (handlerResult && handlerResult.skip) {
            handlerSkippedFirstMessage = true;
        }
    }
    
    // データベースのhasHistoryのみで判断
    if (!handlerSkippedFirstMessage) {
        if (historyData.hasHistory) {
            // 再訪問メッセージを表示
            const initialMessage = ChatData.generateInitialMessage(character, historyData);
            ChatUI.addMessage('welcome', initialMessage, ChatData.characterInfo[character].name);
        } else {
            // 初回メッセージを表示
            const firstTimeMessage = ChatData.generateFirstTimeMessage(character, historyData.nickname || 'あなた');
            ChatUI.addMessage('welcome', firstTimeMessage, ChatData.characterInfo[character].name);
        }
    }
}
```

### 2.3 ハンドラーへの影響

ハンドラーの`initPage`メソッドは現在以下のオプションを受け取っています：

```javascript
{
    isGuestMode,
    guestHistory,
    guardianMessageShown
}
```

**変更が必要な箇所**:
- `isGuestMode`: データベースベースの判断では不要（すべて登録済みユーザーとして扱う）
- `guestHistory`: データベースの`historyData.recentMessages`を使用
- `guardianMessageShown`: データベースの`historyData.assignedDeity`を使用

**ハンドラーの対応**:
- 楓のハンドラー: `assignedDeity`は`historyData.assignedDeity`から取得
- 雪乃のハンドラー: タロット関連のフラグはデータベースの状態から判断

## 3. 移行時の課題

### 3.1 既存ユーザーのデータ移行

現在、ローカルストレージに保存されている会話履歴をデータベースに移行する必要がある場合：
- 登録時に既に移行処理が実装されている（`migrateHistory`オプション）
- 移行後はデータベースのみを使用

### 3.2 ゲストユーザーの扱い

現在のコードではゲストユーザー（未登録ユーザー）もサポートしているが、データベースベースの判断に移行する場合：
- **オプション1**: ゲストユーザーもデータベースに保存する（現在の実装）
- **オプション2**: ゲストユーザーを廃止し、すべて登録済みユーザーとして扱う

**推奨**: オプション1（現在の実装を維持）

### 3.3 守護神の儀式完了状態の管理

楓の守護神の儀式完了状態をデータベースで管理する場合：
- `assignedDeity`（guardianカラム）が設定されていれば完了
- データベースから取得した`historyData.assignedDeity`を使用

### 3.4 雪乃のタロット関連フラグ

雪乃のタロット関連のフラグ（`yukinoThreeCardsPrepared`など）は現在sessionStorageに保存されているが：
- タロットカードの状態はデータベースに保存されていない
- 一時的な状態管理としてsessionStorageを継続使用するか、データベースに保存するか検討が必要

**推奨**: タロットカードの状態は一時的なものなので、sessionStorageを継続使用（ただし、会話履歴の判断には影響しない）

## 4. 修正が必要なファイル

### 4.1 `public/js/chat-engine.js`

**修正内容**:
1. `initPage`関数の簡素化（350-797行目）
   - ローカルストレージベースの判断を削除
   - データベースの`hasHistory`のみで判断
   - 重複した条件分岐を統合

2. 削除する変数/処理:
   - `guardianMessageShown` (363行目)
   - `guestHistory` (381行目、422-459行目)
   - `guardianMessageShownFromStorage` (413行目)
   - `pendingGuardianMessage` (502行目)
   - `ritualCompleted` (523行目)
   - `assignedDeity` (524行目、533行目)
   - 雪乃の個別相談モード開始直後の定型文表示 (462-485行目)

3. 簡素化する条件分岐:
   - 494行目以降の`if (historyData && historyData.hasHistory)`ブロック
   - 626行目以降の`else if (historyData && historyData.nickname)`ブロック
   - 717行目以降の`else`ブロック
   - 579行目、703行目、776行目の重複した初回メッセージ表示条件

### 4.2 `public/js/character-handlers/kaede/handler.js`

**修正内容**:
1. `initPage`メソッドのパラメータ変更
   - `options`から`guestHistory`と`guardianMessageShown`を削除
   - `historyData.assignedDeity`から守護神を取得

2. 守護神の確認処理の変更
   - `localStorage.getItem('assignedDeity')`を削除
   - `historyData.assignedDeity`のみを使用

### 4.3 `public/js/character-handlers/yukino/handler.js`

**修正内容**:
1. `initPage`メソッドのパラメータ変更
   - `options`から`guestHistory`と`guardianMessageShown`を削除

2. タロット関連フラグの扱い
   - タロット関連フラグはsessionStorageを継続使用（会話履歴の判断には影響しない）

### 4.4 その他のハンドラー

- `public/js/character-handlers/kaon/handler.js`
- `public/js/character-handlers/sora/handler.js`

**修正内容**:
- `initPage`メソッドのパラメータ変更（`guestHistory`と`guardianMessageShown`を削除）

## 5. テスト項目

### 5.1 基本機能

1. **初回ユーザー（会話履歴なし）**
   - 各鑑定士のチャットに入ったときに、初回メッセージが表示されること

2. **再訪問ユーザー（会話履歴あり）**
   - 各鑑定士のチャットに入ったときに、再訪問メッセージが表示されること

3. **キャラクター切り替え**
   - 楓のチャットから笹岡雪乃のチャットに移動したとき、以前のチャットメッセージが表示されないこと
   - 初回メッセージまたは再訪問メッセージが正しく表示されること

### 5.2 楓の特殊機能

1. **守護神の儀式完了後**
   - 守護神の儀式完了後、守護神確認メッセージが表示されること
   - 再訪問時に、再訪問メッセージが表示されること

2. **守護神未登録**
   - 守護神未登録の場合、守護神の儀式が開始されること

### 5.3 雪乃の特殊機能

1. **タロットカード機能**
   - タロットカード機能が正常に動作すること（タロット関連フラグはsessionStorageを継続使用）

## 6. 実装の優先順位

### フェーズ1: 基本機能の簡素化（最優先）

1. `chat-engine.js`の`initPage`関数を簡素化
   - ローカルストレージベースの判断を削除
   - データベースの`hasHistory`のみで判断
   - 重複した条件分岐を統合

### フェーズ2: ハンドラーの対応

1. 各ハンドラーの`initPage`メソッドを修正
   - `guestHistory`と`guardianMessageShown`を削除
   - `historyData`から情報を取得

### フェーズ3: テストとデバッグ

1. 基本機能のテスト
2. 特殊機能のテスト
3. キャラクター切り替えのテスト

## 7. まとめ

現在のコードはローカルストレージベースの判断とデータベースベースの判断が混在しており、これが原因で初回メッセージの表示が正常に動作しない問題が発生しています。

データベースベースの判断に移行することで：
- コードが簡素化される（約450行のコードを約150行に削減可能）
- データの整合性が保証される（データベースが唯一の情報源）
- デバイス間での一貫性が保証される（ローカルストレージに依存しない）

ただし、移行時には以下の点に注意が必要です：
- 既存ユーザーのデータ移行（既に実装済み）
- ハンドラーの対応（`guestHistory`と`guardianMessageShown`の削除）
- タロット関連フラグの扱い（一時的な状態管理としてsessionStorageを継続使用）
