# キャラクター専用ハンドラー

各鑑定士のチャットロジックを独立したファイルで管理します。

## ファイル構成

```
character-handlers/
├── registry.json              # 利用可能なハンドラーの一覧
├── README.md                  # このファイル
├── kaede/
│   ├── handler.js             # 楓専用（守護神の儀式含む）
│   └── config.json            # 楓の設定
├── yukino/
│   ├── handler.js             # 雪乃専用（タロット占い + 9通目登録確認）
│   └── config.json            # 雪乃の設定
├── sora/
│   ├── handler.js             # 空良専用（基本テンプレート）
│   └── config.json            # 空良の設定
└── kaon/
    ├── handler.js             # 薫音専用（基本テンプレート）
    └── config.json            # 薫音の設定
```

## 共通インターフェース

各ハンドラーは以下のメソッドを実装します：

### 1. `init()`
- **目的**: ハンドラーの初期化
- **呼び出しタイミング**: `character-loader.js` でハンドラー読み込み時
- **処理例**: タロット機能の初期化、イベントリスナーの設定など

### 2. `initPage(urlParams, historyData, justRegistered, shouldTriggerRegistrationFlow)`
- **目的**: ページ初期化処理
- **呼び出しタイミング**: `chat-engine.js` の `initPage()` 内
- **戻り値**: `{ completed: boolean, skip: boolean }` または `null`
  - `completed: true` → ハンドラーで処理完了（共通処理をスキップ）
  - `skip: true` → 共通処理をスキップ
  - `null` → 共通処理を続行

### 3. `handleResponse(response, character)`
- **目的**: API レスポンス受信後の処理
- **引数**:
  - `response` (Object) - API レスポンス
  - `character` (string) - キャラクターID
- **戻り値**: `boolean`
  - `true` → ハンドラーで処理済み（共通処理をスキップ）
  - `false` → 共通処理を続行
- **処理例**: 登録確認ボタンの表示、特殊な応答処理など

### 4. `handlePostRegistration(historyData, guestHistory)`
- **目的**: 登録完了後の処理
- **引数**:
  - `historyData` (Object) - 会話履歴データ
  - `guestHistory` (Array) - ゲスト履歴（オプション）
- **戻り値**: `boolean`
  - `true` → ハンドラーで処理済み
  - `false` → 共通処理を続行

### 5. `clearCharacterFlags()`
- **目的**: キャラクター固有のフラグをクリア
- **処理例**: sessionStorageのクリア、カウントのリセットなど

## キャラクター別の特殊機能

### 楓（kaede/handler.js）
- ✅ 守護神の儀式（`handleGuardianRitualCompletion`）
- ✅ 10通目で自動的に儀式を開始
- ✅ 儀式完了後にチャットをクリアして定型文を表示

### 雪乃（yukino/handler.js）
- ✅ タロット占い（`yukino-tarot.js` と連携）
- ✅ 9通目で登録確認（「はい」「いいえ」ボタン）
- ✅ 「いいえ」選択時にmain.htmlへリダイレクト
- ✅ 登録後にユーザーの最後のメッセージを引用

### 空良（sora/handler.js）
- 現在は基本テンプレートのみ
- 将来の拡張用

### 薫音（kaon/handler.js）
- 現在は基本テンプレートのみ
- 将来の拡張用

## 使用方法

### 1. HTMLファイルでの読み込み

```html
<!-- プラグインアーキテクチャ -->
<script src="../../js/character-registry.js"></script>
<script src="../../js/character-loader.js"></script>
<!-- チャットエンジン -->
<script src="../../js/chat-engine.js"></script>
<!-- ハンドラーの動的読み込み -->
<script>
(async function() {
    // URLパラメータからキャラクターIDを取得
    const urlParams = new URLSearchParams(window.location.search);
    const characterId = urlParams.get('character');
    
    if (characterId) {
        // 必要なハンドラーのみを読み込む
        const success = await CharacterLoader.loadHandler(characterId);
        if (success) {
            console.log('[初期化] ハンドラーを読み込みました:', characterId);
        } else {
            console.error('[初期化] ハンドラーの読み込みに失敗しました:', characterId);
        }
    }
})();
</script>
```

### 2. 新しいキャラクターを追加する方法

1. `character-handlers/[new-character-id]/`ディレクトリを作成
2. `handler.js`と`config.json`を作成
3. `registry.json`にキャラクターIDを追加
4. 完了（`chat-engine.js`の変更は不要）

詳細は `docs/architecture/新しいファイル構造.md` を参照してください。

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
- チャットエンジンを変更する必要がない

### 4. テストしやすさ
- 各キャラクターのロジックを独立してテスト可能
- デバッグが簡単

## 注意事項

- 各ハンドラーは `window.[Character]Handler` としてグローバルに公開される
- ハンドラーは `character-loader.js` によって動的に読み込まれる
- ハンドラー内で `ChatUI`, `ChatData`, `ChatAPI` などの共通モジュールを使用可能
- `CharacterRegistry` を通じてハンドラーにアクセスする
