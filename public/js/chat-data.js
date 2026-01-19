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
    ritualConsentShown: false, // 守護神の儀式への同意ボタンが表示されたかどうか

    /**
     * キャラクターデータを読み込む（単一キャラクターのみ）
     * @param {string} characterId - キャラクターID（オプション、指定がない場合は全キャラクターを読み込む）
     * @returns {Promise<Object>} キャラクター情報
     */
    async loadCharacterData(characterId = null) {
        // #region agent log (開発環境のみ - コメントアウト)
        // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-data.js:19',message:'loadCharacterData開始',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // }
        // #endregion
        
        // characterIdが指定されている場合、個別ファイルから読み込む
        if (characterId) {
            if (this.characterData && this.characterData.id === characterId) {
                // すでに読み込み済み
                return this.characterData;
            }
            
            // 【修正】個別ファイルは存在しないため、直接characters.jsonから読み込む
            // 個別ファイル読み込みを削除し、常にcharacters.jsonから読み込むように変更
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
                
                console.log(`[ChatData.loadCharacterData] 読み込み完了: ${characterId}`);
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
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-data.js:25',message:'characters.json読み込み完了',data:{characters:Object.keys(this.characterInfo),yukinoHasFirstTimeGuest:!!this.characterInfo.yukino?.messages?.firstTimeGuest,yukinoHasFirstTime:!!this.characterInfo.yukino?.messages?.firstTime,yukinoFirstTimeGuest:this.characterInfo.yukino?.messages?.firstTimeGuest?.substring(0,100)||'なし',yukinoMessagesKeys:this.characterInfo.yukino?.messages?Object.keys(this.characterInfo.yukino.messages):[]},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // }
            // #endregion
            console.log('[ChatData.loadCharacterData] 読み込み完了:', {
                characters: Object.keys(this.characterInfo),
                yukinoHasFirstTimeGuest: !!this.characterInfo.yukino?.messages?.firstTimeGuest,
                yukinoHasFirstTime: !!this.characterInfo.yukino?.messages?.firstTime,
                yukinoFirstTimeGuest: this.characterInfo.yukino?.messages?.firstTimeGuest?.substring(0, 50) + '...' || 'なし'
            });
            return this.characterInfo;
        } catch (error) {
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-data.js:33',message:'loadCharacterDataエラー',data:{error:error.message},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // }
            // #endregion
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
        
        // 【修正】characterInfoが空の場合でも、URLパラメータから直接取得
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
        // 会話履歴からユーザーメッセージ数を直接数える
        const history = this.getConversationHistory(character);
        
        if (history && Array.isArray(history)) {
            const userMessageCount = history.filter(msg => msg && msg.role === 'user').length;
            console.log(`[ChatData] getUserMessageCount(${character}): ${userMessageCount} (会話履歴から計算)`);
            
            // sessionStorageの値と一致するか確認（デバッグ用）
            const GUEST_COUNT_KEY_PREFIX = 'guestMessageCount_'; // 後方互換性のためキー名は変更しない
            const key = GUEST_COUNT_KEY_PREFIX + character;
            const storedCount = sessionStorage.getItem(key);
            if (storedCount !== null) {
                const storedCountNum = Number.parseInt(storedCount, 10);
                if (storedCountNum !== userMessageCount) {
                    console.warn(`[ChatData] ⚠️ カウントの不一致を検出: sessionStorage=${storedCountNum}, 履歴=${userMessageCount}。履歴を優先します。`);
                    // 履歴の値をsessionStorageに同期
                    this.setUserMessageCount(character, userMessageCount);
                }
            } else {
                // sessionStorageにない場合は、計算した値を保存（補助的な用途）
                this.setUserMessageCount(character, userMessageCount);
            }
            
            return userMessageCount;
        }
        
        // 会話履歴が存在しない場合のみ0を返す
        console.log(`[ChatData] getUserMessageCount(${character}): 0 (会話履歴が空)`);
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
        const GUEST_COUNT_KEY_PREFIX = 'guestMessageCount_'; // 後方互換性のためキー名は変更しない
        const key = GUEST_COUNT_KEY_PREFIX + character;
        sessionStorage.setItem(key, String(count));
        sessionStorage.setItem('lastGuestMessageCount', String(count - 1));
        console.log(`[ChatData] setUserMessageCount(${character}, ${count})`);
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
        const GUEST_HISTORY_KEY_PREFIX = 'guestConversationHistory_'; // 後方互換性のためキー名は変更しない
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
        const GUEST_HISTORY_KEY_PREFIX = 'guestConversationHistory_'; // 後方互換性のためキー名は変更しない
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

        // 最後のユーザーメッセージを取得（時系列順に並んでいる場合）
        const messages = historyData.recentMessages;
        let lastUserMessage = null;
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                lastUserMessage = messages[i];
                break;
            }
        }
        
        if (lastUserMessage) {
            const content = lastUserMessage.content;
            // 長さ制限は設けず、そのまま返す（returningメッセージで使用されるため）
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
        // #region agent log (開発環境のみ - コメントアウト)
        // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-data.js:258',message:'generateInitialMessage呼び出し',data:{characterId,hasHistoryData:!!historyData,hasReturning:!!this.characterInfo[characterId]?.messages?.returning},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // }
        // #endregion
        const character = this.characterInfo[characterId];
        if (!character || !character.messages || !character.messages.returning) {
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-data.js:261',message:'generateInitialMessage→デフォルト返却',data:{characterId,returnMessage:'こんにちは。'},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // }
            // #endregion
            return 'こんにちは。';
        }

        const nickname = historyData.nickname || this.userNickname || 'あなた';
        const lastDate = historyData.lastConversationDate || null;
        const conversationContent = this.extractConversationContent(historyData);
        
        // #region agent log (開発環境のみ - コメントアウト)
        const finalMessage = this.replaceMessageTemplate(character.messages.returning, nickname, lastDate, conversationContent, characterId);
        // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-data.js:268',message:'generateInitialMessage→returning返却',data:{characterId,returnMessage:finalMessage.substring(0,200),containsOldMessage:finalMessage.includes('あなたさん、初めまして')||finalMessage.includes('システムからお聞き')},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // }
        // #endregion
        return finalMessage;
    },

    /**
     * 各鑑定師の初めての会話メッセージを生成
     * @param {string} characterId - キャラクターID
     * @param {string} nickname - ニックネーム
     * @param {boolean} isGuestFirstVisit - ゲストユーザーとして初めて入室した場合true（未使用、後方互換性のため残す）
     * @param {boolean} hasOtherCharacterHistory - 他のキャラクターとの会話履歴があるかどうか（未使用、後方互換性のため残す）
     * @returns {string} メッセージ
     */
    generateFirstTimeMessage(characterId, nickname, isGuestFirstVisit = false, hasOtherCharacterHistory = false) {
        // #region agent log (開発環境のみ - コメントアウト)
        // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-data.js:284',message:'generateFirstTimeMessage呼び出し',data:{characterId,nickname,hasCharacterInfo:!!this.characterInfo[characterId],hasMessages:!!this.characterInfo[characterId]?.messages,hasFirstTimeGuest:!!this.characterInfo[characterId]?.messages?.firstTimeGuest},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // }
        // #endregion
        console.log('[ChatData.generateFirstTimeMessage] 呼び出し:', {
            characterId,
            nickname,
            hasCharacterInfo: !!this.characterInfo[characterId],
            hasMessages: !!this.characterInfo[characterId]?.messages,
            hasFirstTimeGuest: !!this.characterInfo[characterId]?.messages?.firstTimeGuest
        });
        
        const character = this.characterInfo[characterId];
        if (!character || !character.messages) {
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-data.js:294',message:'キャラクター情報なし→デフォルト返却',data:{characterId,returnMessage:`${nickname}さん、初めまして。`},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // }
            // #endregion
            console.log('[ChatData.generateFirstTimeMessage] キャラクター情報が見つかりません。デフォルトメッセージを返します');
            return `${nickname}さん、初めまして。`;
        }
        
        // 初めて笹岡と会話するユーザーは、他のキャラクターとの会話履歴に関係なく、常にfirstTimeGuestを使用
        let messageTemplate = null;
        if (character.messages.firstTimeGuest) {
            messageTemplate = character.messages.firstTimeGuest;
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-data.js:302',message:'firstTimeGuest使用',data:{characterId,messageTemplate:messageTemplate.substring(0,200)},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // }
            // #endregion
            console.log('[ChatData.generateFirstTimeMessage] firstTimeGuestを使用:', messageTemplate.substring(0, 50) + '...');
        } else {
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-data.js:305',message:'firstTimeGuestなし→デフォルト返却',data:{characterId,availableKeys:Object.keys(character.messages)},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // }
            // #endregion
            console.log('[ChatData.generateFirstTimeMessage] firstTimeGuestが設定されていません');
        }
        
        if (!messageTemplate) {
            // firstTimeGuestが設定されていない場合は、デフォルトメッセージを返す
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-data.js:309',message:'デフォルトメッセージ返却',data:{characterId,returnMessage:`${nickname}さん、初めまして。`},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // }
            // #endregion
            console.log('[ChatData.generateFirstTimeMessage] デフォルトメッセージを返します');
            return `${nickname}さん、初めまして。`;
        }
        
        // テンプレート変数を含まない可能性があるため、その場合はそのまま返す
        if (!messageTemplate.includes('{nickname}')) {
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-data.js:316',message:'テンプレート変数なし→そのまま返却',data:{characterId,returnMessage:messageTemplate.substring(0,200)},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // }
            // #endregion
            console.log('[ChatData.generateFirstTimeMessage] テンプレート変数なし。そのまま返します');
            return messageTemplate;
        }
        
        // #region agent log (開発環境のみ - コメントアウト)
        const finalMessage = this.replaceMessageTemplate(messageTemplate, nickname, null, null, characterId);
        // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-data.js:321',message:'テンプレート置換後返却',data:{characterId,returnMessage:finalMessage.substring(0,200)},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // }
        // #endregion
        console.log('[ChatData.generateFirstTimeMessage] テンプレート変数を置換します');
        return finalMessage;
    }
};

// グローバルスコープに公開（iframeからアクセスできるようにする）
window.ChatData = ChatData;

