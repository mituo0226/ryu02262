# 各鑑定士の機能プラグインシステム

## 概要

各鑑定士ごとの機能（タロットカード、画像リンク、動画リンクなど）を外部JavaScriptファイルとして分離し、プラグイン方式で管理するシステムです。

## ファイル構成

```
public/js/
├── character-features.js    # 各鑑定士の機能を管理するメインファイル
└── features/
    ├── yukino-tarot.js     # 笹岡雪乃のタロットカード機能
    ├── kaede-feature.js    # 楓の機能（将来実装）
    ├── kaon-feature.js     # 三崎花音の機能（将来実装）
    └── sora-feature.js     # 水野ソラの機能（将来実装）
```

## 使い方

### 1. 新しい機能を追加する場合

#### ステップ1: 機能ファイルを作成

`public/js/features/` ディレクトリに新しいファイルを作成します。

例: `public/js/features/kaede-buddhist.js`

```javascript
(function() {
    'use strict';

    /**
     * 楓の仏教関連機能
     */
    
    function detectBuddhistFeature(text) {
        // 機能を検出するロジック
        return text.includes('仏教') || text.includes('お経');
    }

    function displayBuddhistFeature(text, container, sendMessageCallback) {
        // 機能を表示するロジック
        // 例: 画像を表示、動画を表示、リンクを表示など
    }

    // グローバルに公開
    window.KaedeBuddhist = {
        detect: detectBuddhistFeature,
        display: displayBuddhistFeature
    };
})();
```

#### ステップ2: HTMLファイルにスクリプトを追加

`chat.html` と `chat-example.html` の `<head>` または `<body>` の最後に追加：

```html
<script src="../../js/features/kaede-buddhist.js"></script>
```

#### ステップ3: character-features.jsに登録

`public/js/character-features.js` の `CharacterFeatures` オブジェクトに追加：

```javascript
kaede: {
    detect: function(text) {
        // 複数の機能がある場合は、すべてチェック
        if (window.KaedeBuddhist && typeof window.KaedeBuddhist.detect === 'function') {
            return window.KaedeBuddhist.detect(text);
        }
        return false;
    },
    display: function(text, container, sendMessageCallback) {
        if (window.KaedeBuddhist && typeof window.KaedeBuddhist.display === 'function') {
            window.KaedeBuddhist.display(text, container, sendMessageCallback);
        }
    }
}
```

### 2. 既存の機能を修正する場合

該当する機能ファイル（例: `yukino-tarot.js`）を直接編集します。

`chat.html` や `chat-example.html` を変更する必要はありません。

## 機能の実装パターン

### パターン1: 単一機能

1つのファイルに1つの機能を実装（現在の `yukino-tarot.js` のように）

### パターン2: 複数機能を統合

1つのファイルに複数の機能を実装：

```javascript
window.KaedeFeatures = {
    buddhist: {
        detect: detectBuddhistFeature,
        display: displayBuddhistFeature
    },
    meditation: {
        detect: detectMeditationFeature,
        display: displayMeditationFeature
    }
};
```

`character-features.js` では：

```javascript
kaede: {
    detect: function(text) {
        return (window.KaedeFeatures?.buddhist?.detect(text) || 
                window.KaedeFeatures?.meditation?.detect(text));
    },
    display: function(text, container, sendMessageCallback) {
        if (window.KaedeFeatures?.buddhist?.detect(text)) {
            window.KaedeFeatures.buddhist.display(text, container, sendMessageCallback);
        } else if (window.KaedeFeatures?.meditation?.detect(text)) {
            window.KaedeFeatures.meditation.display(text, container, sendMessageCallback);
        }
    }
}
```

## 注意事項

1. **グローバルスコープへの公開**: 機能は `window` オブジェクトに公開する必要があります
2. **関数のシグネチャ**: `detect` と `display` 関数は以下のシグネチャを守る必要があります
   - `detect(text: string): boolean`
   - `display(text: string, container: HTMLElement, sendMessageCallback: Function): void`
3. **sendMessageCallback**: メッセージ送信が必要な場合は、このコールバックを使用します
   - `sendMessageCallback(skipUserMessage: boolean, skipAnimation: boolean)`

## メリット

1. **コードの分離**: 各鑑定士の機能が独立したファイルに分離される
2. **保守性**: 機能の追加・修正が容易
3. **拡張性**: 新しい機能を追加しても `chat.html` は複雑にならない
4. **再利用性**: 機能ファイルを他のプロジェクトでも使用可能

## 会話履歴について

会話履歴は既に `character` パラメータで分離されているため、追加の対応は不要です。

API側で以下のように管理されています：
- `/api/conversation-history?character=yukino`
- `/api/conversation-history?character=kaede`
- など

