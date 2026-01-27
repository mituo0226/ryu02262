/**
 * chat-data.js
 * チャットシステムのデータ管理モジュール
 * 
 * 責務:
 * - ユーザーデータの管理
 * - 会話履歴の保存・取得
 * - キャラクター情報の管理
 * 
 * 依存関係: chat-utils.js（getUrlParams, debugLog）
 */

const ChatData = {
    // 状態変数
    userNickname: null,
    conversationHistory: null,
    currentCharacter: 'kaede',
    characterInfo: {},
    ritualConsentShown: false, // 守護神の儀式への同意ボタンが表示されたかどうか

    /**
     * キャラクターデータを読み込む（単一キャラクターのみ）
     * @param {string} characterId - キャラクターID（オプション、指定がない場合は全キャラクターを読み込む）
     * @returns {Promise<Object>} キャラクター情報
     */
    async loadCharacterData(characterId = null) {
        // characterIdが指定されている場合、個別ファイルから読み込む
        if (characterId) {
            if (this.characterData && this.characterData.id === characterId) {
                // すでに読み込み済み
                return this.characterData;
            }
            
            // 個別ファイルは存在しないため、直接characters.jsonから読み込む
            try {
                const response = await fetch('../../data/characters.json');
                if (!response.ok) {
                    throw new Error('Failed to load full characters.json');
                }
                const allCharacters = await response.json();
                
                if (!allCharacters[characterId]) {
                    console.warn(`[ChatData.loadCharacterData] キャラクター "${characterId}" が見つかりません`);
                    return {};
                }
                
                this.characterData = {
                    id: characterId,
                    ...allCharacters[characterId]
                };
                this.characterInfo = allCharacters;
                
                return this.characterData;
            } catch (error) {
                console.error('キャラクターデータ読み込みエラー:', error);
                return {};
            }
        }
        
        // characterIdが指定されていない場合、従来通り全キャラクターを読み込む
        try {
            const response = await fetch('../../data/characters.json');
            if (!response.ok) {
                throw new Error('Failed to load character data');
            }
            this.characterInfo = await response.json();
            return this.characterInfo;
        } catch (error) {
            console.error('Failed to load character data:', error);
            return {};
        }
    },

    /**
     * URLパラメータから鑑定士IDを取得
     * @returns {string} キャラクターID
     */
    getCharacterFromURL() {
        const urlParams = getUrlParams();
        const character = urlParams.get('character');
        
        // 有効なキャラクターIDのリスト
        const validCharacters = ['kaede', 'yukino', 'sora', 'kaon'];
        
        if (character && validCharacters.includes(character)) {
            return character;
        }
        
        // characterInfoが読み込まれている場合は、その中から取得
        const loadedCharacters = Object.keys(this.characterInfo);
        if (loadedCharacters.length > 0) {
            return loadedCharacters[0] || 'kaede';
        }
        
        // フォールバック
        return 'kaede';
    },

    /**
     * 現在のURLを構築（ファイル名を含めない）
     * @param {string} character - キャラクターID
     * @returns {string} URL
     */
    buildCurrentUrl(character = this.currentCharacter) {
        const baseUrl = window.location.origin;
        const pathParts = window.location.pathname.split('/').filter(part => part !== '');
        const path = pathParts.slice(0, -1).join('/');
        return `${baseUrl}/${path}?character=${character}`;
    },

    /**
     * ユーザーメッセージカウントを取得
     * @param {string} character - キャラクターID
     * @returns {number} メッセージカウント
     */
    getUserMessageCount(character) {
        // 会話履歴が唯一の真実の源（single source of truth）
        const history = this.getConversationHistory(character);
        
        if (history && Array.isArray(history)) {
            const userMessageCount = history.filter(msg => msg && msg.role === 'user').length;
            
            // sessionStorageの値と一致するか確認
            const GUEST_COUNT_KEY_PREFIX = 'guestMessageCount_';
            const key = GUEST_COUNT_KEY_PREFIX + character;
            const storedCount = sessionStorage.getItem(key);
            if (storedCount !== null) {
                const storedCountNum = Number.parseInt(storedCount, 10);
                if (storedCountNum !== userMessageCount) {
                    // 履歴の値をsessionStorageに同期
                    this.setUserMessageCount(character, userMessageCount);
                }
            } else {
                // sessionStorageにない場合は、計算した値を保存
                this.setUserMessageCount(character, userMessageCount);
            }
            
            return userMessageCount;
        }
        
        // 会話履歴が存在しない場合のみ0を返す
        return 0;
    },

    /**
     * 【後方互換性】getGuestMessageCount → getUserMessageCount のエイリアス
     * @deprecated getUserMessageCountを使用してください
     */
    getGuestMessageCount(character) {
        console.warn('[ChatData] getGuestMessageCountは非推奨です。getUserMessageCountを使用してください。');
        return this.getUserMessageCount(character);
    },

    /**
     * ユーザーメッセージカウントを設定
     * @param {string} character - キャラクターID
     * @param {number} count - カウント
     */
    setUserMessageCount(character, count) {
        const GUEST_COUNT_KEY_PREFIX = 'guestMessageCount_';
        const key = GUEST_COUNT_KEY_PREFIX + character;
        sessionStorage.setItem(key, String(count));
        sessionStorage.setItem('lastGuestMessageCount', String(count - 1));
    },

    /**
     * 【後方互換性】setGuestMessageCount → setUserMessageCount のエイリアス
     * @deprecated setUserMessageCountを使用してください
     */
    setGuestMessageCount(character, count) {
        console.warn('[ChatData] setGuestMessageCountは非推奨です。setUserMessageCountを使用してください。');
        return this.setUserMessageCount(character, count);
    },

    /**
     * ゲスト会話履歴を取得
     * @param {string} character - キャラクターID
     * @returns {Array} 会話履歴
     */
    getConversationHistory(character) {
        const GUEST_HISTORY_KEY_PREFIX = 'guestConversationHistory_';
        const historyKey = GUEST_HISTORY_KEY_PREFIX + character;
        const storedHistory = sessionStorage.getItem(historyKey);
        
        if (storedHistory) {
            try {
                return JSON.parse(storedHistory);
            } catch (error) {
                console.error('Error parsing conversation history:', error);
                return [];
            }
        }
        
        // AuthStateから取得を試みる
        if (window.AuthState && typeof window.AuthState.getGuestHistory === 'function') {
            return AuthState.getGuestHistory(character) || [];
        }
        
        return [];
    },

    /**
     * 【後方互換性】getGuestHistory → getConversationHistory のエイリアス
     * @deprecated getConversationHistoryを使用してください
     */
    getGuestHistory(character) {
        console.warn('[ChatData] getGuestHistoryは非推奨です。getConversationHistoryを使用してください。');
        return this.getConversationHistory(character);
    },

    /**
     * 会話履歴を設定
     * @param {string} character - キャラクターID
     * @param {Array} history - 会話履歴
     */
    setConversationHistory(character, history) {
        const GUEST_HISTORY_KEY_PREFIX = 'guestConversationHistory_';
        const historyKey = GUEST_HISTORY_KEY_PREFIX + character;
        sessionStorage.setItem(historyKey, JSON.stringify(history));
    },

    /**
     * 【後方互換性】setGuestHistory → setConversationHistory のエイリアス
     * @deprecated setConversationHistoryを使用してください
     */
    setGuestHistory(character, history) {
        console.warn('[ChatData] setGuestHistoryは非推奨です。setConversationHistoryを使用してください。');
        return this.setConversationHistory(character, history);
    },

    /**
     * 会話履歴にメッセージを追加
     * @param {string} character - キャラクターID
     * @param {string} role - 'user' または 'assistant'
     * @param {string} content - メッセージ内容
     */
    addToConversationHistory(character, role, content) {
        const history = this.getConversationHistory(character);
        history.push({ role, content });
        this.setConversationHistory(character, history);
    },

    /**
     * 【後方互換性】addToGuestHistory → addToConversationHistory のエイリアス
     * @deprecated addToConversationHistoryを使用してください
     */
    addToGuestHistory(character, role, content) {
        console.warn('[ChatData] addToGuestHistoryは非推奨です。addToConversationHistoryを使用してください。');
        return this.addToConversationHistory(character, role, content);
    },

    /**
     * 会話内容を抽出
     * @param {Object} historyData - 履歴データ
     * @returns {string|null} 会話内容
     */
    extractConversationContent(historyData) {
        if (!historyData || !historyData.recentMessages) {
            return null;
        }

        // 最後のユーザーメッセージを取得
        const messages = historyData.recentMessages;
        let lastUserMessage = null;
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                lastUserMessage = messages[i];
                break;
            }
        }
        
        if (lastUserMessage) {
            return lastUserMessage.content;
        }
        
        return null;
    },

    /**
     * 日付をフォーマット
     * @param {string} dateString - 日付文字列
     * @returns {string|null} フォーマット済み日付
     */
    formatDateForMessage(dateString) {
        if (!dateString) return null;
        
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const currentYear = new Date().getFullYear();
        
        if (year === currentYear) {
            return `${month}月${day}日`;
        } else {
            return `${year}年${month}月${day}日`;
        }
    },

    /**
     * メッセージテンプレートを置換
     * @param {string} template - テンプレート文字列
     * @param {string} nickname - ニックネーム
     * @param {string|null} lastDate - 最後の会話日時
     * @param {string|null} conversationContent - 会話内容
     * @param {string} characterId - キャラクターID
     * @returns {string} 置換済みメッセージ
     */
    replaceMessageTemplate(template, nickname, lastDate, conversationContent, characterId) {
        let message = template;
        const character = this.characterInfo[characterId];
        
        const safeNickname = nickname || 'あなた';
        message = message.replace(/{nickname}/g, safeNickname);
        
        if (lastDate) {
            const dateText = this.formatDateForMessage(lastDate);
            if (dateText) {
                const dateFormat = character?.messages?.returningLastDateFormat || `前回は{date}でしたね。`;
                const formattedDate = dateFormat.replace(/{date}/g, dateText);
                message = message.replace(/{lastDate}/g, formattedDate);
            } else {
                message = message.replace(/{lastDate}/g, '');
            }
        } else {
            message = message.replace(/{lastDate}/g, '');
        }
        
        if (conversationContent) {
            const contentFormat = character?.messages?.returningConversationFormat || `その時の相談内容は、{content}というものでした。`;
            const formattedContent = contentFormat.replace(/{content}/g, conversationContent);
            message = message.replace(/{conversationContent}/g, formattedContent);
        } else {
            message = message.replace(/{conversationContent}/g, '');
        }
        
        return message;
    },

    /**
     * 各鑑定師の初回メッセージを生成（会話履歴がある場合）
     * @param {string} characterId - キャラクターID
     * @param {Object} historyData - 履歴データ
     * @returns {string} メッセージ
     */
    generateInitialMessage(characterId, historyData) {
        const character = this.characterInfo[characterId];
        if (!character || !character.messages || !character.messages.returning) {
            return 'こんにちは。';
        }

        const nickname = historyData.nickname || this.userNickname || 'あなた';
        const lastDate = historyData.lastConversationDate || null;
        const conversationContent = this.extractConversationContent(historyData);
        
        const finalMessage = this.replaceMessageTemplate(character.messages.returning, nickname, lastDate, conversationContent, characterId);
        return finalMessage;
    },

    /**
     * 各鑑定師の初めての会話メッセージを生成
     * @param {string} characterId - キャラクターID
     * @param {string} nickname - ニックネーム
     * @param {boolean} isGuestFirstVisit - ゲストユーザーとして初めて入室した場合true
     * @param {boolean} hasOtherCharacterHistory - 他のキャラクターとの会話履歴があるかどうか
     * @returns {string} メッセージ
     */
    generateFirstTimeMessage(characterId, nickname, isGuestFirstVisit = false, hasOtherCharacterHistory = false) {
        const character = this.characterInfo[characterId];
        if (!character || !character.messages) {
            return `${nickname}さん、初めまして。`;
        }
        
        // 初めて会話するユーザーは、firstTimeGuestを使用
        let messageTemplate = character.messages.firstTimeGuest;
        
        if (!messageTemplate) {
            // firstTimeGuestが設定されていない場合はデフォルトメッセージ
            return `${nickname}さん、初めまして。`;
        }
        
        // テンプレート変数を含まない場合はそのまま返す
        if (!messageTemplate.includes('{nickname}')) {
            return messageTemplate;
        }
        
        const finalMessage = this.replaceMessageTemplate(messageTemplate, nickname, null, null, characterId);
        return finalMessage;
    }
};

// グローバルスコープに公開
window.ChatData = ChatData;
