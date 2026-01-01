# 楓（カエデ）のゲストユーザーから登録ユーザーの守護神決定までの流れ

## 概要

このドキュメントは、鑑定士「楓（カエデ）」のチャットにおける、ゲストユーザーから登録ユーザーへの移行、および守護神決定までの完全なフローを説明します。他のAIがこのプロジェクトを引き継ぐ際の参照資料として作成されています。

## 重要概念

### 守護神（Guardian）の判定方法

- **データベース優先**: Cloudflareのデータベースの`users`テーブルの`guardian`カラムを唯一の信頼できる情報源として使用
- **API経由で取得**: `ChatAPI.loadConversationHistory(character)`のレスポンスの`assignedDeity`フィールドが、データベースの`guardian`カラムの値を反映
- **localStorageは補助的**: `localStorage.getItem('assignedDeity')`は表示用の同期のみで、判定には使用しない

### メッセージ数のカウント

- **ゲストモード**: `sessionStorage`の`guestMessageCount_${character}`で管理
- **上限**: `ChatData.GUEST_MESSAGE_LIMIT = 10`（10通まで無料で会話可能）

---

## フロー1: ゲストモードでの会話（1-10通）

### フェーズ1-5: 会話の進行（1-5通目）

#### フェーズ1（1通目）
- **内容**: 導入＆未来イメージの選択肢提示
- **システムプロンプト**: `functions/_lib/characters/kaede.js`の129-150行目
- **AIの行動**:
  1. 相談者の最初のメッセージを受け止め、未来の流れを視る描写
  2. 相談者の未来の姿を伝える
  3. 「どのような生活を望むか」について三択の選択肢を提示
  4. 相談者に「直感で、どれに一番惹かれるか」を選んでもらう

#### フェーズ2（2通目）
- **内容**: 長所を聞く質問
- **システムプロンプト**: `functions/_lib/characters/kaede.js`の151-165行目
- **AIの行動**:
  1. 相談者の返答を受け止め、「あなたの良いところ」を読み取る
  2. 「あなたの最も長所だと思われる部分は何ですか」と聞く
  3. 相談者が曖昧な返答をした場合は、AIが長所を1つ推測して提案し、次のフェーズに進む

#### フェーズ3（3通目）
- **内容**: 性格診断＋続行確認
- **システムプロンプト**: `functions/_lib/characters/kaede.js`の166-181行目
- **AIの行動**:
  1. 1〜2通目の情報（未来イメージ＋長所）をもとに、性格診断を行う（3〜4項目程度）
  2. 性格診断を伝えた後、「鑑定を続けていいか」を確認する

#### フェーズ4（4通目以降）
- **内容**: 未来鑑定＋守護神と儀式の説明
- **システムプロンプト**: `functions/_lib/characters/kaede.js`の182-209行目
- **AIの行動**:
  1. 相談者の未来の流れ・変化のタイミングを伝える
  2. 運勢を上向きにしていくための心の持ち方を伝える
  3. 守護神とは何か、なぜ「守護神との波長を整える」ことが必要かを説明
  4. 楓が龍神を通じて、どの守護神に見守られているかを読み解くという立場を説明

### 5通目終了時: 守護神の儀式参加ボタンの表示

- **タイミング**: 5通目のメッセージ送信後、AIの応答が表示された時点
- **実装場所**: `public/js/kaede-ritual-handler.js`の`addRitualStartButtonToMessageIfNeeded`関数（532-624行目）
- **条件**:
  - `character === 'kaede'`
  - `isGuest === true`
  - `messageCount >= 5 && messageCount < ChatData.GUEST_MESSAGE_LIMIT`（5-9通目）
  - `ritualAlreadyDone === false`
  - `acceptedGuardianRitual === false`
  - 既にボタンが表示されていない（`document.querySelector('.ritual-start-button') === null`）
- **表示内容**: 「守護神の儀式を始める」ボタン
- **UI実装**: `public/js/chat-ui.js`の`addRitualStartButton`関数（254-280行目）

### 分岐A: 儀式参加（OK）を選択した場合

1. **ユーザー登録画面への遷移**
   - `public/js/chat-init.js`の`handleRitualConsent(true)`関数が呼ばれる（1095-1105行目）
   - `sessionStorage.setItem('acceptedGuardianRitual', 'true')`が設定される
   - `this.openRegistrationModal()`で登録モーダルが開く

2. **ユーザー登録完了後**
   - `public/js/chat-init.js`の`handleReturnFromAnimation`関数内で処理（894-985行目）
   - `justRegistered === true`のフラグが設定される
   - 自動的に`guardian-ritual.html`にリダイレクト

3. **守護神の儀式ページ（guardian-ritual.html）**
   - 生年月日とニックネームを使用して守護神を決定
   - 守護神が決定されると、データベースの`users`テーブルの`guardian`カラムに保存される
   - API: `functions/api/auth/update-deity.ts`で`guardian`カラムを更新

4. **儀式完了後**
   - `chat.html`に戻る
   - 定型文が表示される（`functions/_lib/characters/kaede.js`の88-117行目のシステムプロンプトに基づく）
   - 定型文の内容: 守護神の名前と特徴、守護神からのメッセージ、今後の見守りについて

### 分岐B: 儀式不参加（NG）を選択した場合、またはボタンを無視した場合

- **6-10通目**: 通常会話が継続
- **実装**: 特に特別な処理はなく、通常の会話フローが続く
- **注意**: 8-9通目では、楓の場合のみ「まもなく無料でお話できる回数の上限です...」というメッセージが表示される（`public/js/chat-init.js`の765-785行目、879-905行目、992-1007行目）

### 10通目以降: 強制的なユーザー登録

- **タイミング**: 10通目のメッセージ送信時
- **実装場所**: `public/js/chat-init.js`の`sendMessage`関数（472-482行目、500-509行目）および`handleReturnFromAnimation`関数（894-985行目）
- **処理内容**:
  1. `currentCount >= ChatData.GUEST_MESSAGE_LIMIT`（10通以上）の場合
  2. システムメッセージを表示: 「会話が10通を超えたため、これより先はユーザー登録が必要です。登録画面へ移動します。」
  3. 3秒後に自動的に登録モーダルを開く（`this.openRegistrationModal()`）
  4. ユーザー登録完了後、自動的に`guardian-ritual.html`にリダイレクト
  5. 守護神決定後、定型文が表示される

---

## フロー2: 登録済みユーザーが初めて楓のチャットにアクセスした場合

### 前提条件

- ユーザーは既に他の鑑定士との会話でユーザー登録済み
- 生年月日とニックネームはデータベースに登録済み
- しかし、`guardian`カラムは未登録（`null`または空文字）

### 自動的な守護神の儀式開始

- **実装場所**: `public/js/chat-init.js`の`initPage`関数内（303-328行目、337-359行目、367-394行目）
- **条件**:
  - `!isGuestMode`（ゲストモードではない）
  - `character === 'kaede'`（楓のチャット）
  - `!justRegistered`（今登録したばかりではない）
  - `!shouldTriggerRegistrationFlow`（登録フローをトリガーしない）
  - `!hasAssignedDeity`（データベースの`guardian`カラムが未設定）

### 処理の流れ

1. **データベースの確認**
   - `ChatAPI.loadConversationHistory(character)`を呼び出し
   - レスポンスの`assignedDeity`フィールド（データベースの`guardian`カラムの値）を確認
   - `assignedDeity`が`null`、`undefined`、または空文字の場合、`hasAssignedDeity = false`

2. **儀式の自動開始**
   - `sessionStorage.setItem('acceptedGuardianRitual', 'true')`を設定
   - `window.ChatInit.startGuardianRitual(character, null)`を呼び出し
   - 会話履歴の有無に関わらず、`guardian`が未登録であれば儀式を開始

3. **儀式の実行**
   - `public/js/chat-init.js`の`startGuardianRitual`関数（1279-1306行目）
   - 再度データベースの`guardian`カラムを確認（既に決定されている場合は儀式を開始しない）
   - 儀式を実行し、守護神を決定
   - データベースの`guardian`カラムに保存

4. **儀式完了後**
   - 定型文が表示される
   - 以降は通常の会話フロー

### 重要な注意点

- **会話履歴の有無は関係ない**: 以前に楓と会話したことがあっても、`guardian`が未登録であれば儀式を開始する
- **データベースが唯一の情報源**: `localStorage`ではなく、必ずデータベースの`guardian`カラムを確認する
- **楓専用**: この処理は`character === 'kaede'`の場合のみ実行される。他の鑑定士では守護神の概念は存在しない

---

## 関連ファイル一覧

### フロントエンド

1. **`public/js/chat-init.js`**
   - メインの会話フロー制御
   - ゲストモードのメッセージ数管理
   - 登録済みユーザーの自動儀式開始ロジック
   - 強制的なユーザー登録の処理

2. **`public/js/kaede-ritual-handler.js`**
   - 楓専用の儀式処理
   - 「守護神の儀式を始める」ボタンの表示制御
   - メッセージ数に基づくボタン表示ロジック

3. **`public/js/chat-ui.js`**
   - UI要素の表示/非表示
   - 「守護神の儀式を始める」ボタンの追加
   - メッセージの表示

4. **`public/js/chat-data.js`**
   - グローバルな状態管理
   - `GUEST_MESSAGE_LIMIT = 10`の定義
   - `ritualConsentShown`フラグの管理

### バックエンド

1. **`functions/_lib/characters/kaede.js`**
   - 楓のシステムプロンプト生成
   - フェーズ1-5の指示
   - 守護神の儀式開始時の指示
   - 守護神との交信演出の指示（登録済みユーザー向け）

2. **`functions/api/conversation-history.ts`**
   - 会話履歴の取得
   - データベースの`guardian`カラムを`assignedDeity`フィールドとして返す

3. **`functions/api/auth/update-deity.ts`**
   - 守護神決定後のデータベース更新
   - `users`テーブルの`guardian`カラムを更新

4. **`functions/api/consult.ts`**
   - 会話の送信処理
   - 登録済みユーザーの場合、守護神の確認メッセージを追加（603-621行目）

### データベース

- **テーブル**: `users`
- **カラム**: `guardian`（文字列型、NULL許可）
- **意味**: ユーザーに割り当てられた守護神の名前

---

## セッションストレージとローカルストレージの使用

### セッションストレージ（sessionStorage）

- `guestMessageCount_${character}`: ゲストモードでのメッセージ数
- `acceptedGuardianRitual`: 守護神の儀式への同意フラグ
- `ritualConsentShown`: 儀式への同意ボタンが表示されたかどうか
- `ritualCompleted`: 儀式が完了したかどうか
- `guardianMessageShown`: 守護神の確認メッセージが表示されたかどうか
- `kaedeGuestPreLimitNoticeShown`: 8-9通目での通知が表示されたかどうか

### ローカルストレージ（localStorage）

- `assignedDeity`: 守護神の名前（表示用、データベースと同期）
- `userToken`: ユーザー認証トークン
- `userNickname`: ユーザーのニックネーム
- `birthYear`, `birthMonth`, `birthDay`: 生年月日

**重要**: `assignedDeity`は表示用の同期のみで、判定には使用しない。必ずデータベースの`guardian`カラムを確認すること。

---

## トラブルシューティング

### 守護神の儀式が開始されない場合

1. **データベースの確認**
   - Cloudflareのデータベースで`users`テーブルの`guardian`カラムを確認
   - `null`または空文字の場合、儀式が開始されるはず

2. **ブラウザのキャッシュ**
   - 古いJavaScriptファイルがキャッシュされている可能性
   - シークレットモードで確認、またはキャッシュをクリア

3. **コンソールログの確認**
   - `[楓専用処理]`で始まるログを確認
   - `assignedDeityFromDB`の値を確認

### ボタンが表示されない場合

1. **メッセージ数の確認**
   - 5-9通目の範囲であることを確認
   - `sessionStorage.getItem('guestMessageCount_kaede')`で確認

2. **フラグの確認**
   - `sessionStorage.getItem('acceptedGuardianRitual')`が`null`であることを確認
   - `sessionStorage.getItem('ritualConsentShown')`の状態を確認

---

## 更新履歴

- **2025-12-18**: 初版作成
  - ゲストモードのフロー（1-10通）を詳細化
  - 登録済みユーザーの自動儀式開始ロジックを追加
  - データベースの`guardian`カラムを優先する判定方法を明記

---

## 補足情報

### 他の鑑定士との違い

- **楓のみ**: 守護神の概念が存在し、儀式が必要
- **他の鑑定士**: 守護神の概念は存在せず、このフローは適用されない
- **判定**: `character === 'kaede'`の条件で分岐

### 守護神との交信演出（登録済みユーザー向け）

- **実装場所**: `functions/_lib/characters/kaede.js`の40-82行目
- **頻度**: `GUARDIAN_CHANNELING_INTERVAL = 4`（4通に1回程度）
- **タイミング**: 相談が深くなった時、または強い感情（不安/悲しみ/迷い/恐れ/怒り/喪失）や"核心"に触れる相談のとき
- **内容**: 守護神の名前を使って、短く問いかけ、言葉を受け取る演出

---

このドキュメントは、楓のチャット機能の完全な理解を目的として作成されています。不明な点がある場合は、上記の関連ファイルを参照してください。




