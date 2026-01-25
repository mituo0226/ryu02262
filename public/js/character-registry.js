/**
 * character-registry.js
 * キャラクターハンドラーの登録・管理を行うレジストリ
 * 
 * すべてのハンドラーはこのレジストリを通じて管理され、
 * チャットエンジンはこのレジストリを通じてハンドラーにアクセスします。
 */

const CharacterRegistry = {
    /**
     * 登録済みハンドラーのマップ
     * @type {Map<string, Object>}
     */
    handlers: new Map(),

    /**
     * ハンドラーを登録
     * @param {string} characterId - キャラクターID（例: 'kaede'）
     * @param {Object} handler - ハンドラーオブジェクト
     * @param {Object} config - ハンドラーの設定（オプション）
     */
    register(characterId, handler, config = null) {
        if (!characterId || !handler) {
            console.warn('[CharacterRegistry] 無効なハンドラー登録:', { characterId, handler });
            return false;
        }

        // ハンドラーに設定を追加
        if (config) {
            handler.config = config;
        }

        // ハンドラーにcharacterIdを設定（念のため）
        if (!handler.characterId) {
            handler.characterId = characterId;
        }

        this.handlers.set(characterId, handler);
        console.log('[CharacterRegistry] ハンドラーを登録しました:', characterId);
        return true;
    },

    /**
     * ハンドラーを取得
     * @param {string} characterId - キャラクターID
     * @returns {Object|null} ハンドラーオブジェクト
     */
    get(characterId) {
        if (!characterId) {
            return null;
        }
        return this.handlers.get(characterId) || null;
    },

    /**
     * すべてのハンドラーを取得
     * @returns {Array<Object>} ハンドラーの配列
     */
    getAll() {
        return Array.from(this.handlers.values());
    },

    /**
     * 登録済みのキャラクターIDのリストを取得
     * @returns {Array<string>} キャラクターIDの配列
     */
    getRegisteredIds() {
        return Array.from(this.handlers.keys());
    },

    /**
     * ハンドラーが登録されているか確認
     * @param {string} characterId - キャラクターID
     * @returns {boolean} 登録されているかどうか
     */
    has(characterId) {
        return this.handlers.has(characterId);
    },

    /**
     * ハンドラーを削除（通常は使用しない）
     * @param {string} characterId - キャラクターID
     */
    unregister(characterId) {
        this.handlers.delete(characterId);
        console.log('[CharacterRegistry] ハンドラーを削除しました:', characterId);
    },

    /**
     * すべてのハンドラーをクリア（通常は使用しない）
     */
    clear() {
        this.handlers.clear();
        console.log('[CharacterRegistry] すべてのハンドラーをクリアしました');
    }
};

// グローバルスコープに公開
window.CharacterRegistry = CharacterRegistry;
