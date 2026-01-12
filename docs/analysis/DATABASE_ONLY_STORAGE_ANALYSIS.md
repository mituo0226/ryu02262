# データベースのみでユーザー情報を記憶する変更の分析

## 概要

すべての鑑定士のユーザー情報をデータベース上でしか記憶しないように変更するための分析レポートです。

## 1. 現在のデータベーススキーマ確認

### usersテーブルのカラム（current-schema.mdより）

| カラム名 | 型 | NOT NULL | デフォルト値 | 説明 |
|---------|-----|---------|------------|------|
| id | INTEGER | 0 | - | PRIMARY KEY |
| nickname | TEXT | 1 | - | ニックネーム |
| birth_year | INTEGER | 1 | - | 生年 |
| birth_month | INTEGER | 1 | - | 生月 |
| birth_day | INTEGER | 1 | - | 生日 |
| passphrase | TEXT | 1 | - | パスフレーズ（使用しない） |
| guardian | TEXT | 0 | - | 守護神（日本語名） |
| created_at | TEXT | 1 | CURRENT_TIMESTAMP | 作成日時 |
| user_type | TEXT | 0 | 'registered' | ユーザータイプ |
| ip_address | TEXT | 0 | - | IPアドレス |
| session_id | TEXT | 0 | - | セッションID |
| last_activity_at | DATETIME | 0 | - | 最終活動日時 |
| gender | TEXT | 0 | - | 性別 |

### 必要なユーザー情報の確認

**フロントエンドで使用している情報**:
- `nickname`（ニックネーム）✅
- `birthYear`, `birthMonth`, `birthDay`（生年月日）✅ → `birth_year`, `birth_month`, `birth_day`
- `assignedDeity`（守護神）✅ → `guardian`
- `gender`（性別）✅

**結論**: データベースには必要な情報がすべて存在しています。

## 2. 現在localStorageに保存されている情報

### localStorageに保存されているキー

1. **`userNickname`** → `users.nickname`
2. **`birthYear`** → `users.birth_year`
3. **`birthMonth`** → `users.birth_month`
4. **`birthDay`** → `users.birth_day`
5. **`assignedDeity`** → `users.guardian`
6. **`hasAccount`** → 不要（データベースの存在確認で代替）

### sessionStorageに保存されているキー（一時的な情報）

- `guardianMessageShown` → 削除（データベースの`guardian`で判断）
- `guestHistory` → 削除（データベースの`hasHistory`で判断）
- `yukinoGuestConversed` → 削除（データベースの会話履歴で判断）
- `soraGuestConversed` → 削除（データベースの会話履歴で判断）
- `ritualCompleted` → 削除（データベースの`guardian`で判断）
- `acceptedGuardianRitual` → 削除（データベースの`guardian`で判断）
- `firstQuestionBeforeRitual` → 削除（データベースの`firstQuestion`で判断）
- `pendingRitualGuestHistory` → 削除（データベースに直接保存）
- `guestConversationHistory_*` → 削除（データベースに直接保存）
- `pendingGuestHistoryMigration` → 削除（データベースに直接保存）
- `yukinoTarotCardForExplanation` → 一時的な情報のため、sessionStorage継続使用可
- `yukinoConsultationStarted` → 一時的な情報のため、sessionStorage継続使用可
- `yukinoConsultationMessageCount` → 一時的な情報のため、sessionStorage継続使用可
- `yukinoShouldShowRegistrationButton` → 一時的な情報のため、sessionStorage継続使用可
- `lastUserMessage` → 削除（データベースの`recentMessages`で代替）

## 3. localStorageを使用している箇所の特定

### 3.1 auth-state.js

**使用箇所**:
- `isRegistered()`: localStorageから`userNickname`, `birthYear`, `birthMonth`, `birthDay`を取得
- `setAuth()`: localStorageに`userNickname`, `assignedDeity`, `hasAccount`を保存
- `clearAuth()`: localStorageから`userNickname`, `assignedDeity`, `hasAccount`を削除

**変更方針**:
- `isRegistered()`: データベースAPI（`conversation-history.ts`）を呼び出してユーザーの存在を確認
- `setAuth()`: 削除（登録時はすでにデータベースに保存されている）
- `clearAuth()`: 削除（不要）

### 3.2 chat-ui.js

**使用箇所**:
- `updateUserStatus()`: localStorageから`userNickname`, `assignedDeity`, `birthYear`, `birthMonth`, `birthDay`を取得

**変更方針**:
- `updateUserStatus()`: `userData`パラメータのみを使用（localStorageからの取得を削除）
- 呼び出し元で`historyData`からユーザー情報を取得して渡す

### 3.3 chat-engine.js

**使用箇所**:
- `initPage()`: `AuthState.isRegistered()`を使用（間接的にlocalStorageを使用）
- ユーザー情報の取得: localStorageから取得している箇所

**変更方針**:
- `initPage()`: `historyData`からユーザー情報を取得
- `historyData`が取得できない場合は、`conversation-history.ts` APIを呼び出してユーザー情報を取得

### 3.4 ハンドラーファイル

#### 楓（kaede）ハンドラー

**使用箇所**:
- `initPage()`: localStorageから`assignedDeity`, `userNickname`, `birthYear`, `birthMonth`, `birthDay`を取得
- `checkGuardianRitualCompletion()`: localStorageから`assignedDeity`, `userNickname`を取得
- `handlePostRegistrationRitualStart()`: localStorageから`assignedDeity`, `userNickname`, `birthYear`, `birthMonth`, `birthDay`を取得

**変更方針**:
- すべて`historyData`から取得（localStorageからの取得を削除）

#### 雪乃（yukino）ハンドラー

**使用箇所**:
- `checkGuestRevisit()`: localStorageから`yukinoGuestConversed`を取得
- `markGuestConversed()`: localStorageに`yukinoGuestConversed`を保存
- `handlePostRegistration()`: localStorageから`yukinoGuestConversed`を削除

**変更方針**:
- `checkGuestRevisit()`: データベースの会話履歴を確認（`hasHistory`で判断）
- `markGuestConversed()`: 削除（データベースに会話履歴が保存されるため）
- `handlePostRegistration()`: 削除

#### ソラ（sora）ハンドラー

**使用箇所**:
- `checkGuestRevisit()`: localStorageから`soraGuestConversed`を取得
- `markGuestConversed()`: localStorageに`soraGuestConversed`を保存
- `handlePostRegistration()`: localStorageから`soraGuestConversed`を削除

**変更方針**:
- `checkGuestRevisit()`: データベースの会話履歴を確認（`hasHistory`で判断）
- `markGuestConversed()`: 削除（データベースに会話履歴が保存されるため）
- `handlePostRegistration()`: 削除

#### 花音（kaon）ハンドラー

**使用箇所**:
- なし（localStorageを使用していない）

**変更方針**:
- 変更不要

## 4. データベースAPIの確認

### conversation-history.ts API

**取得できる情報**:
- `nickname` ✅
- `birthYear` ✅
- `birthMonth` ✅
- `birthDay` ✅
- `assignedDeity`（guardian）✅
- `hasHistory` ✅

**結論**: `conversation-history.ts` APIから必要な情報がすべて取得できます。

## 5. 変更が必要なファイルと変更内容

### 5.1 優先度：高（必須）

1. **`public/js/auth-state.js`**
   - `isRegistered()`: データベースAPIを使用するように変更
   - `setAuth()`, `clearAuth()`: 削除または空実装に変更

2. **`public/js/chat-ui.js`**
   - `updateUserStatus()`: localStorageからの取得を削除

3. **`public/js/chat-engine.js`**
   - ユーザー情報の取得を`historyData`のみに統一
   - localStorageを使用している箇所を削除

4. **`public/js/character-handlers/kaede/handler.js`**
   - localStorageからの取得をすべて削除
   - `historyData`から取得するように変更

5. **`public/js/character-handlers/yukino/handler.js`**
   - `checkGuestRevisit()`: データベースの会話履歴で判断
   - `markGuestConversed()`, `handlePostRegistration()`: localStorage関連の処理を削除

6. **`public/js/character-handlers/sora/handler.js`**
   - `checkGuestRevisit()`: データベースの会話履歴で判断
   - `markGuestConversed()`, `handlePostRegistration()`: localStorage関連の処理を削除

### 5.2 優先度：中（検討が必要）

- sessionStorageに保存されている一時的な情報（タロット関連など）は、データベースに保存する必要があるか検討

## 6. 実装の推奨順序

1. **`conversation-history.ts` APIの確認**（すでに完了）
   - 必要な情報がすべて取得できることを確認 ✅

2. **`chat-ui.js`の変更**
   - `updateUserStatus()`からlocalStorageの使用を削除
   - `userData`パラメータのみを使用

3. **`chat-engine.js`の変更**
   - ユーザー情報の取得を`historyData`のみに統一

4. **ハンドラーファイルの変更**
   - 楓、雪乃、ソラのハンドラーからlocalStorageの使用を削除

5. **`auth-state.js`の変更**
   - `isRegistered()`をデータベースAPIベースに変更
   - `setAuth()`, `clearAuth()`を削除または空実装に変更

6. **テスト**
   - すべての鑑定士でユーザー情報が正しく表示されることを確認
   - 登録、ログイン、チャット機能が正常に動作することを確認

## 7. データベースカラムの確認結果

**結論**: データベースには必要な情報がすべて存在しています。追加のカラムは不要です。

**必要なカラム**:
- ✅ `nickname`（ニックネーム）
- ✅ `birth_year`, `birth_month`, `birth_day`（生年月日）
- ✅ `guardian`（守護神）
- ✅ `gender`（性別）

**変更不要**: データベーススキーマに変更は不要です。
