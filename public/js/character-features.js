/**
 * 各鑑定士の機能を管理するプラグインシステム
 * 新しい機能を追加する際は、このファイルに登録する
 */

(function() {
    'use strict';

    // 各鑑定士の機能を管理するオブジェクト
    const CharacterFeatures = {
        yukino: {
            // 機能の検出関数（テキストに機能が含まれているか判定）
            detect: function(text) {
                // タロットカード機能が利用可能か確認
                if (window.YukinoTarot && typeof window.YukinoTarot.detect === 'function') {
                    return window.YukinoTarot.detect(text);
                }
                return false;
            },
            // 機能の表示関数（テキストとコンテナを受け取り、機能を表示）
            display: function(text, container, sendMessageCallback) {
                // タロットカード機能が利用可能か確認
                if (window.YukinoTarot && typeof window.YukinoTarot.display === 'function') {
                    window.YukinoTarot.display(text, container, sendMessageCallback);
                }
            }
        },
        kaede: {
            detect: function(text) {
                // 楓の機能を検出するロジック（将来実装）
                // 例: return text.includes('特定のキーワード');
                return false;
            },
            display: function(text, container, sendMessageCallback) {
                // 楓の機能を表示するロジック（将来実装）
                // 例: displayKaedeFeature(text, container);
            }
        },
        kaon: {
            detect: function(text) {
                // 三崎花音の機能を検出するロジック（将来実装）
                return false;
            },
            display: function(text, container, sendMessageCallback) {
                // 三崎花音の機能を表示するロジック（将来実装）
            }
        },
        sora: {
            detect: function(text) {
                // 水野ソラの機能を検出するロジック（将来実装）
                return false;
            },
            display: function(text, container, sendMessageCallback) {
                // 水野ソラの機能を表示するロジック（将来実装）
            }
        }
    };

    /**
     * 指定された鑑定士の機能を検出
     * @param {string} character - 鑑定士ID (yukino, kaede, kaon, sora)
     * @param {string} text - 検出するテキスト
     * @returns {boolean} 機能が含まれているか
     */
    function detectCharacterFeature(character, text) {
        if (CharacterFeatures[character] && typeof CharacterFeatures[character].detect === 'function') {
            return CharacterFeatures[character].detect(text);
        }
        return false;
    }

    /**
     * 指定された鑑定士の機能を表示
     * @param {string} character - 鑑定士ID (yukino, kaede, kaon, sora)
     * @param {string} text - 表示するテキスト
     * @param {HTMLElement} container - 機能を表示するコンテナ
     * @param {Function} sendMessageCallback - メッセージ送信コールバック関数
     */
    function displayCharacterFeature(character, text, container, sendMessageCallback) {
        if (CharacterFeatures[character] && typeof CharacterFeatures[character].display === 'function') {
            CharacterFeatures[character].display(text, container, sendMessageCallback);
        }
    }

    /**
     * 新しい機能を登録（将来の拡張用）
     * @param {string} character - 鑑定士ID
     * @param {Object} feature - 機能オブジェクト { detect: Function, display: Function }
     */
    function registerFeature(character, feature) {
        if (typeof feature === 'object' && typeof feature.detect === 'function' && typeof feature.display === 'function') {
            CharacterFeatures[character] = feature;
        } else {
            console.error('Invalid feature object. Must have detect and display functions.');
        }
    }

    // グローバルに公開
    window.CharacterFeatures = {
        detect: detectCharacterFeature,
        display: displayCharacterFeature,
        register: registerFeature
    };
})();

