/**
 * chat-data.js
 * データ管理と状態管理を担当
 */

const ChatData = {
    // 状態変数
    userNickname: null,
    conversationHistory: null,
    currentCharacter: 'kaede',
    characterInfo: {},
    GUEST_MESSAGE_LIMIT: 10,
    ritualConsentShown: false, // 守護神の儀式への同意ボタンが表示されたかどうか

    /**
     * 鑑定士情報を外部ファイルから読み込む
     * @returns {Promise<Object>} キャラクター情報
     */
    async loadCharacterData() {
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
        const urlParams = new URLSearchParams(window.location.search);
        const character = urlParams.get('character');
        const validCharacters = Object.keys(this.characterInfo);
        
        if (character && validCharacters.includes(character)) {
            return character;
        }
        return validCharacters[0] || 'kaede';
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
     * ゲストメッセージカウントを取得
     * @param {string} character - キャラクターID
     * @returns {number} メッセージカウント
     */
    getGuestMessageCount(character) {
        // 会話履歴が唯一の真実の源（single source of truth）
        // 会話履歴からユーザーメッセージ数を直接数える
        const history = this.getGuestHistory(character);
        
        if (history && Array.isArray(history)) {
            const userMessageCount = history.filter(msg => msg && msg.role === 'user').length;
            console.log(`[ChatData] getGuestMessageCount(${character}): ${userMessageCount} (会話履歴から計算)`);
            
            // sessionStorageの値と一致するか確認（デバッグ用）
            const GUEST_COUNT_KEY_PREFIX = 'guestMessageCount_';
            const key = GUEST_COUNT_KEY_PREFIX + character;
            const storedCount = sessionStorage.getItem(key);
            if (storedCount !== null) {
                const storedCountNum = Number.parseInt(storedCount, 10);
                if (storedCountNum !== userMessageCount) {
                    console.warn(`[ChatData] ⚠️ カウントの不一致を検出: sessionStorage=${storedCountNum}, 履歴=${userMessageCount}。履歴を優先します。`);
                    // 履歴の値をsessionStorageに同期
                    this.setGuestMessageCount(character, userMessageCount);
                }
            } else {
                // sessionStorageにない場合は、計算した値を保存（補助的な用途）
                this.setGuestMessageCount(character, userMessageCount);
            }
            
            return userMessageCount;
        }
        
        // 会話履歴が存在しない場合のみ0を返す
        console.log(`[ChatData] getGuestMessageCount(${character}): 0 (会話履歴が空)`);
        return 0;
    },

    /**
     * ゲストメッセージカウントを設定
     * @param {string} character - キャラクターID
     * @param {number} count - カウント
     */
    setGuestMessageCount(character, count) {
        const GUEST_COUNT_KEY_PREFIX = 'guestMessageCount_';
        const key = GUEST_COUNT_KEY_PREFIX + character;
        sessionStorage.setItem(key, String(count));
        sessionStorage.setItem('lastGuestMessageCount', String(count - 1));
        console.log(`[ChatData] setGuestMessageCount(${character}, ${count})`);
    },

    /**
     * ゲスト会話履歴を取得
     * @param {string} character - キャラクターID
     * @returns {Array} 会話履歴
     */
    getGuestHistory(character) {
        const GUEST_HISTORY_KEY_PREFIX = 'guestConversationHistory_';
        const historyKey = GUEST_HISTORY_KEY_PREFIX + character;
        const storedHistory = sessionStorage.getItem(historyKey);
        
        if (storedHistory) {
            try {
                return JSON.parse(storedHistory);
            } catch (error) {
                console.error('Error parsing guest history:', error);
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
     * ゲスト会話履歴を設定
     * @param {string} character - キャラクターID
     * @param {Array} history - 会話履歴
     */
    setGuestHistory(character, history) {
        const GUEST_HISTORY_KEY_PREFIX = 'guestConversationHistory_';
        const historyKey = GUEST_HISTORY_KEY_PREFIX + character;
        sessionStorage.setItem(historyKey, JSON.stringify(history));
    },

    /**
     * ゲスト会話履歴にメッセージを追加
     * @param {string} character - キャラクターID
     * @param {string} role - 'user' または 'assistant'
     * @param {string} content - メッセージ内容
     */
    addToGuestHistory(character, role, content) {
        const history = this.getGuestHistory(character);
        history.push({ role, content });
        this.setGuestHistory(character, history);
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

        const sortedMessages = historyData.recentMessages.slice().reverse();
        const firstUserMessage = sortedMessages.find(msg => msg.role === 'user');
        
        if (firstUserMessage) {
            const content = firstUserMessage.content;
            if (content.length > 60) {
                return content.substring(0, 60) + '...';
            }
            return content;
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
        
        return this.replaceMessageTemplate(
            character.messages.returning,
            nickname,
            lastDate,
            conversationContent,
            characterId
        );
    },

    /**
     * 各鑑定師の初めての会話メッセージを生成
     * @param {string} characterId - キャラクターID
     * @param {string} nickname - ニックネーム
     * @param {boolean} isGuestFirstVisit - ゲストユーザーとして初めて入室した場合true（未使用、後方互換性のため残す）
     * @returns {string} メッセージ
     */
    generateFirstTimeMessage(characterId, nickname, isGuestFirstVisit = false) {
        const character = this.characterInfo[characterId];
        if (!character || !character.messages) {
            return `${nickname}さん、初めまして。`;
        }
        
        // firstTimeGuestを優先的に使用（各鑑定士の初回メッセージ）
        // firstTimeGuestが存在しない場合は、デフォルトメッセージを返す
        let messageTemplate = null;
        if (character.messages.firstTimeGuest) {
            messageTemplate = character.messages.firstTimeGuest;
        }
        
        if (!messageTemplate) {
            // firstTimeGuestが設定されていない場合は、デフォルトメッセージを返す
            return `${nickname}さん、初めまして。`;
        }
        
        // firstTimeGuestはテンプレート変数を含まない可能性があるため、その場合はそのまま返す
        if (!messageTemplate.includes('{nickname}')) {
            return messageTemplate;
        }
        
        return this.replaceMessageTemplate(
            messageTemplate,
            nickname,
            null,
            null,
            characterId
        );
    }
};

// グローバルスコープに公開（iframeからアクセスできるようにする）
window.ChatData = ChatData;

