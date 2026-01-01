/**
 * character-loader.js
 * キャラクターハンドラーの動的読み込みを管理
 * 
 * URLパラメータからキャラクターIDを取得し、
 * 必要なハンドラーのみを動的に読み込みます。
 */

const CharacterLoader = {
    /**
     * 利用可能なハンドラーの一覧（registry.jsonから読み込む）
     * @type {Array<string>}
     */
    availableCharacters: [],

    /**
     * 読み込み済みのハンドラー
     * @type {Set<string>}
     */
    loadedHandlers: new Set(),

    /**
     * レジストリファイルから利用可能なハンドラーを取得
     * @returns {Promise<Array<string>>} キャラクターIDの配列
     */
    async loadRegistry() {
        try {
            const response = await fetch('../../js/character-handlers/registry.json');
            if (!response.ok) {
                console.warn('[CharacterLoader] registry.jsonの読み込みに失敗しました。フォールバックを使用します。');
                return this.getFallbackCharacters();
            }
            const registry = await response.json();
            this.availableCharacters = registry.characters || [];
            console.log('[CharacterLoader] レジストリを読み込みました:', this.availableCharacters);
            return this.availableCharacters;
        } catch (error) {
            console.error('[CharacterLoader] レジストリ読み込みエラー:', error);
            return this.getFallbackCharacters();
        }
    },

    /**
     * フォールバック: 既知のキャラクターリストを返す
     * @returns {Array<string>} キャラクターIDの配列
     */
    getFallbackCharacters() {
        return ['kaede', 'yukino', 'sora', 'kaon'];
    },

    /**
     * 特定のハンドラーを読み込む
     * @param {string} characterId - キャラクターID
     * @returns {Promise<boolean>} 読み込み成功かどうか
     */
    async loadHandler(characterId) {
        if (!characterId) {
            console.warn('[CharacterLoader] キャラクターIDが指定されていません');
            return false;
        }

        // 既に読み込み済みの場合はスキップ
        if (this.loadedHandlers.has(characterId)) {
            console.log('[CharacterLoader] ハンドラーは既に読み込み済み:', characterId);
            return true;
        }

        try {
            // 1. 設定ファイルを読み込む
            const configResponse = await fetch(`/js/character-handlers/${characterId}/config.json`);
            if (!configResponse.ok) {
                console.warn(`[CharacterLoader] ${characterId}の設定ファイルが見つかりません。フォールバックを使用します。`);
                return await this.loadHandlerFallback(characterId);
            }
            const config = await configResponse.json();

            // 2. ハンドラースクリプトを動的に読み込む（絶対パスを使用）
            await this.loadScript(`/js/character-handlers/${characterId}/handler.js`);

            // 3. ハンドラーを取得して登録
            const handlerClassName = config.handlerClassName || this.getDefaultHandlerName(characterId);
            const handler = window[handlerClassName];

            if (!handler) {
                console.error(`[CharacterLoader] ハンドラークラスが見つかりません: ${handlerClassName}`);
                return false;
            }

            // 4. ハンドラーを初期化して登録
            if (typeof handler.init === 'function') {
                handler.init(config);
            }

            CharacterRegistry.register(characterId, handler, config);
            this.loadedHandlers.add(characterId);

            console.log(`[CharacterLoader] ハンドラーを読み込みました: ${characterId}`);
            return true;
        } catch (error) {
            console.error(`[CharacterLoader] ハンドラーの読み込みエラー (${characterId}):`, error);
            return false;
        }
    },

    /**
     * フォールバック: 旧形式のハンドラーを読み込む（移行期間中）
     * @param {string} characterId - キャラクターID
     * @returns {Promise<boolean>} 読み込み成功かどうか
     */
    async loadHandlerFallback(characterId) {
        try {
            // 旧形式のハンドラーファイルを読み込む（絶対パスを使用）
            const handlerName = this.getDefaultHandlerName(characterId);
            await this.loadScript(`/js/character-handlers/${characterId}-handler.js`);

            const handler = window[handlerName];
            if (!handler) {
                console.error(`[CharacterLoader] フォールバック: ハンドラーが見つかりません: ${handlerName}`);
                return false;
            }

            // デフォルト設定で初期化
            const defaultConfig = {
                characterId: characterId,
                handlerClassName: handlerName
            };

            if (typeof handler.init === 'function') {
                handler.init(defaultConfig);
            }

            CharacterRegistry.register(characterId, handler, defaultConfig);
            this.loadedHandlers.add(characterId);

            console.log(`[CharacterLoader] フォールバック: ハンドラーを読み込みました: ${characterId}`);
            return true;
        } catch (error) {
            console.error(`[CharacterLoader] フォールバック読み込みエラー (${characterId}):`, error);
            return false;
        }
    },

    /**
     * デフォルトのハンドラー名を生成
     * @param {string} characterId - キャラクターID
     * @returns {string} ハンドラー名（例: 'KaedeHandler'）
     */
    getDefaultHandlerName(characterId) {
        if (!characterId) return null;
        return characterId.charAt(0).toUpperCase() + characterId.slice(1) + 'Handler';
    },

    /**
     * スクリプトを動的に読み込む
     * @param {string} src - スクリプトのパス
     * @returns {Promise<void>}
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            // 既に読み込まれているか確認
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.head.appendChild(script);
        });
    },

    /**
     * URLパラメータからキャラクターIDを取得してハンドラーを読み込む
     * @returns {Promise<Object|null>} 読み込んだハンドラー
     */
    async loadHandlerFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const characterId = urlParams.get('character');

        if (!characterId) {
            console.warn('[CharacterLoader] URLパラメータにcharacterが指定されていません');
            return null;
        }

        const success = await this.loadHandler(characterId);
        if (success) {
            return CharacterRegistry.get(characterId);
        }

        return null;
    },

    /**
     * すべての利用可能なハンドラーを読み込む（通常は使用しない）
     * @returns {Promise<Array<Object>>} 読み込んだハンドラーの配列
     */
    async loadAllHandlers() {
        await this.loadRegistry();
        const handlers = [];

        for (const characterId of this.availableCharacters) {
            const success = await this.loadHandler(characterId);
            if (success) {
                handlers.push(CharacterRegistry.get(characterId));
            }
        }

        return handlers;
    }
};

// グローバルスコープに公開
window.CharacterLoader = CharacterLoader;
