# キャラクター専用ハンドラー

各鑑定士のチャットロジックを独立したファイルで管理します。

## ファイル構成

```
character-handlers/
├── kaede-handler.js    - 楓専用（守護神の儀式含む）
├── yukino-handler.js   - 雪乃専用（タロット占い + 9通目登録確認）
├── sora-handler.js     - 空良専用（基本テンプレート）
└── kaon-handler.js     - 薫音専用（基本テンプレート）
```

## 共通インターフェース

各ハンドラーは以下のメソッドを実装します：

### 1. `init()`
- **目的**: ハンドラーの初期化
- **呼び出しタイミング**: `chat-init.js` の `initPage()` 内
- **処理例**: タロット機能の初期化、イベントリスナーの設定など

### 2. `beforeMessageSent(message)`
- **目的**: メッセージ送信前の処理
- **引数**: `message` (string) - 送信するメッセージ
- **戻り値**: `{ proceed: boolean, modifiedMessage?: string }`
  - `proceed: true` → 送信を続行
  - `proceed: false` → 送信を中止
  - `modifiedMessage` → 変更後のメッセージ（オプション）

### 3. `handleResponse(response, character)`
- **目的**: API レスポンス受信後の処理
- **引数**:
  - `response` (Object) - API レスポンス
  - `character` (string) - キャラクターID
- **戻り値**: `boolean`
  - `true` → ハンドラーで処理済み（共通処理をスキップ）
  - `false` → 共通処理を続行
- **処理例**: 登録確認ボタンの表示、特殊な応答処理など

### 4. `handlePostRegistration(historyData)`
- **目的**: 登録完了後の処理
- **引数**: `historyData` (Object) - 会話履歴データ
- **戻り値**: `boolean`
  - `true` → ハンドラーで処理済み
  - `false` → 共通処理を続行

### 5. `clearGuestHistory()`
- **目的**: ゲスト履歴とキャラクター固有のフラグをクリア
- **処理例**: sessionStorageのクリア、カウントのリセットなど

## キャラクター別の特殊機能

### 楓（kaede-handler.js）
- ✅ 守護神の儀式（`handleGuardianRitualCompletion`）
- ✅ 10通目で自動的に儀式を開始
- ✅ 儀式完了後にチャットをクリアして定型文を表示

### 雪乃（yukino-handler.js）
- ✅ タロット占い（`yukino-tarot.js` と連携）
- ✅ 9通目で登録確認（「はい」「いいえ」ボタン）
- ✅ 「いいえ」選択時にmain.htmlへリダイレクト
- ✅ 登録後にユーザーの最後のメッセージを引用

### 空良（sora-handler.js）
- 現在は基本テンプレートのみ
- 将来の拡張用

### 薫音（kaon-handler.js）
- 現在は基本テンプレートのみ
- 将来の拡張用

## 使用方法

### 1. HTMLファイルでの読み込み

```html
<!-- キャラクター専用ハンドラー -->
<script src="../../js/character-handlers/kaede-handler.js"></script>
<script src="../../js/character-handlers/yukino-handler.js"></script>
<script src="../../js/character-handlers/sora-handler.js"></script>
<script src="../../js/character-handlers/kaon-handler.js"></script>
<!-- 共通チャットロジック -->
<script src="../../js/chat-init.js"></script>
```

### 2. chat-init.jsでの初期化

```javascript
// キャラクター専用ハンドラーの初期化
if (window.KaedeHandler && typeof window.KaedeHandler.init === 'function') {
    window.KaedeHandler.init();
}
if (window.YukinoHandler && typeof window.YukinoHandler.init === 'function') {
    window.YukinoHandler.init();
}
// ...他のキャラクター
```

### 3. レスポンス処理での呼び出し

```javascript
// キャラクター専用ハンドラーでレスポンスを処理
let handlerProcessed = false;

if (character === 'yukino' && window.YukinoHandler) {
    handlerProcessed = await window.YukinoHandler.handleResponse(response, character);
}
// ...他のキャラクター

// ハンドラーで処理された場合は、以降の処理をスキップ
if (handlerProcessed) {
    return;
}
```

## メリット

### 1. 保守性の向上
- 各キャラクターのロジックが独立
- 他のキャラクターに影響を与えずに修正可能

### 2. 可読性の向上
- ファイルサイズが小さくなり、コードが見やすい
- キャラクター固有のロジックが明確

### 3. 拡張性の向上
- 新しいキャラクターの追加が容易
- 新機能の実装がシンプル

### 4. テストしやすさ
- 各キャラクターのロジックを独立してテスト可能
- デバッグが簡単

## 注意事項

- 各ハンドラーは `window.[Character]Handler` としてグローバルに公開される
- `chat-init.js` の読み込みは、**必ず全てのハンドラーの後**に行うこと
- ハンドラー内で `ChatUI`, `ChatData`, `ChatAPI` などの共通モジュールを使用可能
