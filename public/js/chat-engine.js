/**
 * chat-engine.js
 * チャットエンジン - 完全にキャラクター非依存のチャット機能を提供
 * 
 * 【重要】キャラクター固有の処理は一切含まれません。
 * すべてのキャラクター固有の処理は各ハンドラーファイルに委譲されます。
 * 
 * ハンドラーの取得は CharacterRegistry を使用します。
 * CharacterRegistry は character-registry.js で定義されています。
 * 
 * 【統合】chat-api.js, chat-data.js, chat-ui.js を統合
 * 読み込み順序の問題を根本的に解決するため、3つのファイルを1つに統合しました。
 */

// ============================================
// chat-api.js の統合
// ============================================
/**
 * chat-api.js
 * API通信処理を担当
 */

const ChatAPI = {
    /**
     * 会話履歴を取得
     * @param {string} characterId - キャラクターID
     * @returns {Promise<Object|null>} 会話履歴データ
     */
    async loadConversationHistory(characterId, userInfo = null) {
        // 【変更】データベースから最新のユーザー情報と会話履歴を取得
        // localStorage/sessionStorageからの取得を削除（データベースベースの判断に完全移行）
        // user_idを優先的に使用（より安全で効率的）
        let userId = null;
        // 【重要】基本的にuserIdのみを使用（データベースベースの判断）
        // nickname+生年月日によるユーザー確認は行わない
        
        console.log('[loadConversationHistory] 呼び出し:', {
            characterId,
            hasUserInfo: !!userInfo,
            userInfoUserId: userInfo?.userId,
            userInfoUserIdType: typeof userInfo?.userId
        });
        
        if (userInfo && userInfo.userId) {
            // userInfoからuserIdを取得（優先）
            const userIdFromUserInfo = userInfo.userId;
            if (typeof userIdFromUserInfo === 'number' && Number.isFinite(userIdFromUserInfo) && userIdFromUserInfo > 0) {
                userId = userIdFromUserInfo;
                console.log('[loadConversationHistory] userInfoからuserIdを取得（数値）:', userId);
            } else if (typeof userIdFromUserInfo === 'string' && userIdFromUserInfo.trim() !== '') {
                const parsedUserId = Number(userIdFromUserInfo);
                if (Number.isFinite(parsedUserId) && parsedUserId > 0) {
                    userId = parsedUserId;
                    console.log('[loadConversationHistory] userInfoからuserIdを取得（文字列から数値に変換）:', userId);
                } else {
                    console.warn('[loadConversationHistory] userInfo.userIdが無効な値です:', userIdFromUserInfo);
                }
            } else {
                console.warn('[loadConversationHistory] userInfo.userIdが無効な型または値です:', userIdFromUserInfo, typeof userIdFromUserInfo);
            }
        }
        
        // userInfoから取得できない場合、URLパラメータから取得（フォールバック）
        if (!userId) {
            // グローバルスコープのurlParamsを使用
            if (!window._chatUrlParams) {
                window._chatUrlParams = new URLSearchParams(window.location.search);
            }
            const urlParams = window._chatUrlParams;
            const userIdParam = urlParams.get('userId');
            console.log('[loadConversationHistory] URLパラメータからuserIdを取得（フォールバック）:', userIdParam);
            if (userIdParam && userIdParam.trim() !== '') {
                const parsedUserId = Number(userIdParam);
                if (Number.isFinite(parsedUserId) && parsedUserId > 0) {
                    userId = parsedUserId;
                    console.log('[loadConversationHistory] URLパラメータからuserIdを取得（数値に変換）:', userId);
                } else {
                    console.warn('[loadConversationHistory] URLパラメータのuserIdが無効な値です:', userIdParam);
                }
            }
        }
        
        // 【重要】基本的にuserIdのみを使用（データベースベースの判断）
        // nickname+生年月日によるユーザー確認は行わない
        if (!userId) {
            console.error('[loadConversationHistory] userIdが指定されていません（nullを返します）:', {
                userInfoProvided: !!userInfo,
                userInfoUserId: userInfo?.userId,
                userInfoUserIdType: typeof userInfo?.userId,
                urlParams: new URLSearchParams(window.location.search).get('userId'),
                locationHref: window.location.href
            });
            return null;
        }
        
        console.log('[loadConversationHistory] userIdを確認しました（データベース検索を開始）:', userId);
        
        try {
            // userIdのみを使用してAPIを呼び出し
            const apiUrl = `/api/conversation-history?userId=${encodeURIComponent(userId)}&character=${encodeURIComponent(characterId)}`;
            
            const response = await fetch(apiUrl);
            
            const responseText = await response.text();
            let data = null;
            
            try {
                if (responseText) {
                    data = JSON.parse(responseText);
                }
            } catch (e) {
                // JSON解析に失敗した場合は無視
                console.error('[loadConversationHistory] JSON解析エラー:', e);
            }
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log('[loadConversationHistory] ユーザー情報が見つかりません（404）');
                    // 404の場合は、ユーザーが登録されていない可能性がある
                    throw new Error('USER_NOT_FOUND');
                }
                
                console.warn('[loadConversationHistory] 会話履歴の取得に失敗:', response.status);
                // ネットワークエラーやサーバーエラーの可能性
                throw new Error('NETWORK_ERROR');
            }
            
            // 【変更】データベースから取得した情報をlocalStorageに保存しない
            // すべてのユーザー情報はデータベースから取得する
            if (data) {
                console.log('[loadConversationHistory] データベースから最新のユーザー情報を取得しました:', {
                    nickname: data.nickname,
                    birthYear: data.birthYear,
                    birthMonth: data.birthMonth,
                    birthDay: data.birthDay,
                    assignedDeity: data.assignedDeity
                });
            }
            
            return data;
        } catch (error) {
            console.error('[loadConversationHistory] エラー:', error);
            // エラーの種類を判定
            if (error instanceof Error) {
                // 既にエラーメッセージが設定されている場合はそのまま投げる
                if (error.message === 'USER_NOT_FOUND' || error.message === 'NETWORK_ERROR') {
                    throw error;
                }
            }
            // fetch自体が失敗した場合（ネットワークエラー）
            if (error instanceof TypeError || (error instanceof Error && (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')))) {
                throw new Error('NETWORK_ERROR');
            }
            // その他のエラーもネットワークエラーとして扱う
            throw new Error('NETWORK_ERROR');
        }
    },

    /**
     * メッセージを送信してAI応答を取得
     * @param {string} message - 送信するメッセージ
     * @param {string} characterId - キャラクターID
     * @param {Array} conversationHistory - 会話履歴
     * @param {Object} options - オプション
     * @param {string} options.forceProvider - プロバイダーを強制指定（オプション: 'deepseek' | 'openai'）
     * @param {Object} options - オプション
     * @returns {Promise<Object>} APIレスポンス
     */
    async sendMessage(message, characterId, conversationHistory = [], options = {}) {
        // 会話履歴の形式を変換（{role, content}形式に統一）
        const clientHistory = conversationHistory.map(entry => {
            if (typeof entry === 'string') {
                return { role: 'user', content: entry };
            }
            return {
                role: entry.role || 'user',
                content: entry.content || entry.message || ''
            };
        });
        
        // 【変更】ユーザー情報をChatData.conversationHistoryから取得（データベースベースの判断）
        // user_idを優先的に使用（より安全で効率的）
        // URLパラメータからuserIdを取得（ログイン成功時にリダイレクトURLに含まれる）
        // グローバルスコープのurlParamsを使用
        if (!window._chatUrlParams) {
            window._chatUrlParams = new URLSearchParams(window.location.search);
        }
        const urlParams = window._chatUrlParams;
        let userId = null;
        const userIdParam = urlParams.get('userId');
        if (userIdParam) {
            userId = Number(userIdParam);
            if (!Number.isFinite(userId) || userId <= 0) {
                userId = null;
            }
        }
        
        // userIdがない場合、ChatData.conversationHistoryから取得を試みる
        // （会話履歴APIのレスポンスにuserIdが含まれる可能性がある）
        if (!userId && ChatData && ChatData.conversationHistory && ChatData.conversationHistory.userId) {
            userId = ChatData.conversationHistory.userId;
        }
        
        // 【重要】基本的にuserIdのみを使用（データベースベースの判断）
        // API側でuserIdを優先的に使用するため、userIdがある場合はnickname+生年月日は送信しない
        // ただし、API側の後方互換性のために、userIdがない場合のみnickname+生年月日を送信
        let nickname, birthYear, birthMonth, birthDay;
        
        if (userId) {
            // userIdがある場合は、nickname+生年月日は送信しない（API側でuserIdを優先的に使用）
            nickname = undefined;
            birthYear = undefined;
            birthMonth = undefined;
            birthDay = undefined;
        } else {
            // userIdがない場合のみ、後方互換性のためにnickname+生年月日を取得
            if (ChatData && ChatData.conversationHistory && ChatData.conversationHistory.nickname) {
                // 会話履歴から取得
                nickname = ChatData.conversationHistory.nickname;
                birthYear = ChatData.conversationHistory.birthYear;
                birthMonth = ChatData.conversationHistory.birthMonth;
                birthDay = ChatData.conversationHistory.birthDay;
            } else if (ChatData && ChatData.userNickname) {
                // ChatData.userNicknameから取得（会話履歴がない場合のフォールバック）
                nickname = ChatData.userNickname;
                // 生年月日は会話履歴に含まれていない場合はundefined
                birthYear = undefined;
                birthMonth = undefined;
                birthDay = undefined;
            } else {
                // どちらも存在しない場合はundefined（ゲストユーザー）
                nickname = undefined;
                birthYear = undefined;
                birthMonth = undefined;
                birthDay = undefined;
            }
        }
        
        const payload = {
            message: message,
            character: characterId,
            clientHistory: clientHistory,
            userId: userId || undefined, // user_idを優先的に使用
            nickname: nickname || undefined, // userIdがない場合のみ使用（後方互換性のため）
            birthYear: birthYear ? Number(birthYear) : undefined, // userIdがない場合のみ使用
            birthMonth: birthMonth ? Number(birthMonth) : undefined, // userIdがない場合のみ使用
            birthDay: birthDay ? Number(birthDay) : undefined // userIdがない場合のみ使用
        };
        
        // オプション設定
        if (options.forceProvider) {
            payload.forceProvider = options.forceProvider;
        }
        
        if (options.migrateHistory) {
            payload.migrateHistory = true;
        }

        // 儀式開始フラグ（守護神の儀式の開催を通知）
        if (options.ritualStart) {
            payload.ritualStart = true;
        }

        // 守護神からの最初のメッセージ生成フラグ
        if (options.guardianFirstMessage) {
            payload.guardianFirstMessage = true;
            if (options.guardianName) {
                payload.guardianName = options.guardianName;
            }
            if (options.firstQuestion !== undefined) {
                payload.firstQuestion = options.firstQuestion;
            }
        }

        // 楓からの追加メッセージ生成フラグ
        if (options.kaedeFollowUp) {
            payload.kaedeFollowUp = true;
            if (options.guardianName) {
                payload.guardianName = options.guardianName;
            }
            if (options.guardianMessage) {
                payload.guardianMessage = options.guardianMessage;
            }
            if (options.firstQuestion !== undefined) {
                payload.firstQuestion = options.firstQuestion;
            }
        }

        try {
            const response = await fetch('/api/consult', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                let errorData = {};
                try {
                    const responseText = await response.text();
                    if (responseText) {
                        errorData = JSON.parse(responseText);
                    }
                } catch (e) {
                    console.error('[ChatAPI] エラーレスポンスの解析に失敗:', e);
                    errorData = { error: `HTTP ${response.status} エラー` };
                }
                
                const errorMessage = errorData.message || errorData.error || `メッセージの送信に失敗しました (HTTP ${response.status})`;
                console.error('[ChatAPI] APIエラー詳細:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorData.error,
                    message: errorData.message,
                    fullErrorData: errorData
                });
                
                return { 
                    error: errorData.error || 'メッセージの送信に失敗しました',
                    message: errorMessage
                };
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to send message:', error);
            return { error: 'メッセージの送信に失敗しました' };
        }
    },

    /**
     * ウェルカムメッセージ生成（非同期）
     * ページ読み込み後にバックグラウンドで呼ばれる
     * @param {Object} options - オプション
     * @param {string} options.character - キャラクターID
     * @param {Array} options.conversationHistory - 会話履歴
     * @param {string} options.visitPattern - 訪問パターン
     * @returns {Promise<string>} 生成されたウェルカムメッセージ
     */
    async generateWelcomeMessage(options = {}) {
        const { character, conversationHistory = [], visitPattern = 'first_visit' } = options;
        
        // userIdを取得
        // グローバルスコープのurlParamsを使用
        if (!window._chatUrlParams) {
            window._chatUrlParams = new URLSearchParams(window.location.search);
        }
        const urlParams = window._chatUrlParams;
        let userId = null;
        const userIdParam = urlParams.get('userId');
        if (userIdParam) {
            userId = Number(userIdParam);
            if (!Number.isFinite(userId) || userId <= 0) {
                userId = null;
            }
        }
        
        if (!userId) {
            throw new Error('ユーザーIDが見つかりません');
        }
        
        if (!character) {
            throw new Error('キャラクターIDが指定されていません');
        }
        
        console.log('[ChatAPI] ウェルカムメッセージ生成開始（非同期）:', {
            character,
            userId,
            visitPattern,
            historyLength: conversationHistory.length
        });
        
        try {
            const response = await fetch('/api/generate-welcome', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    character,
                    userId,
                    conversationHistory,
                    visitPattern
                })
            });
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success || !data.message) {
                throw new Error('Invalid API response');
            }
            
            console.log('[ChatAPI] ウェルカムメッセージ生成完了:', {
                usedAPI: data.metadata?.usedAPI,
                messageLength: data.message.length
            });
            
            return data.message;
            
        } catch (error) {
            console.error('[ChatAPI] ウェルカムメッセージ生成エラー:', error);
            throw error;
        }
    }
};

// グローバルスコープに公開
window.ChatAPI = ChatAPI;

// ============================================
// chat-data.js の統合
// ============================================
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
            console.log('[ChatData.loadCharacterData] 読み込み完了:', {
                characters: Object.keys(this.characterInfo),
                yukinoHasFirstTimeGuest: !!this.characterInfo.yukino?.messages?.firstTimeGuest,
                yukinoHasFirstTime: !!this.characterInfo.yukino?.messages?.firstTime,
                yukinoFirstTimeGuest: this.characterInfo.yukino?.messages?.firstTimeGuest?.substring(0, 50) + '...' || 'なし'
            });
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
        // グローバルスコープのurlParamsを使用
        if (!window._chatUrlParams) {
            window._chatUrlParams = new URLSearchParams(window.location.search);
        }
        const urlParams = window._chatUrlParams;
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
     * @param {boolean} isGuestFirstVisit - ゲストユーザーとして初めて入室した場合true（未使用、後方互換性のため残す）
     * @param {boolean} hasOtherCharacterHistory - 他のキャラクターとの会話履歴があるかどうか（未使用、後方互換性のため残す）
     * @returns {string} メッセージ
     */
    generateFirstTimeMessage(characterId, nickname, isGuestFirstVisit = false, hasOtherCharacterHistory = false) {
        console.log('[ChatData.generateFirstTimeMessage] 呼び出し:', {
            characterId,
            nickname,
            hasCharacterInfo: !!this.characterInfo[characterId],
            hasMessages: !!this.characterInfo[characterId]?.messages,
            hasFirstTimeGuest: !!this.characterInfo[characterId]?.messages?.firstTimeGuest
        });
        
        const character = this.characterInfo[characterId];
        if (!character || !character.messages) {
            console.log('[ChatData.generateFirstTimeMessage] キャラクター情報が見つかりません。デフォルトメッセージを返します');
            return `${nickname}さん、初めまして。`;
        }
        
        // 初めて笹岡と会話するユーザーは、他のキャラクターとの会話履歴に関係なく、常にfirstTimeGuestを使用
        let messageTemplate = null;
        if (character.messages.firstTimeGuest) {
            messageTemplate = character.messages.firstTimeGuest;
            console.log('[ChatData.generateFirstTimeMessage] firstTimeGuestを使用:', messageTemplate.substring(0, 50) + '...');
        } else {
            console.log('[ChatData.generateFirstTimeMessage] firstTimeGuestが設定されていません');
        }
        
        if (!messageTemplate) {
            // firstTimeGuestが設定されていない場合は、デフォルトメッセージを返す
            console.log('[ChatData.generateFirstTimeMessage] デフォルトメッセージを返します');
            return `${nickname}さん、初めまして。`;
        }
        
        // テンプレート変数を含まない可能性があるため、その場合はそのまま返す
        if (!messageTemplate.includes('{nickname}')) {
            console.log('[ChatData.generateFirstTimeMessage] テンプレート変数なし。そのまま返します');
            return messageTemplate;
        }
        
        console.log('[ChatData.generateFirstTimeMessage] テンプレート変数を置換します');
        const finalMessage = this.replaceMessageTemplate(messageTemplate, nickname, null, null, characterId);
        return finalMessage;
    }
};

// グローバルスコープに公開（iframeからアクセスできるようにする）
window.ChatData = ChatData;

// ============================================
// chat-ui.js の統合（簡略版 - 主要機能のみ）
// ============================================
/**
 * chat-ui.js
 * UI更新とレンダリングを担当
 */

const ChatUI = {
    // DOM要素の参照
    messagesDiv: null,
    messageInput: null,
    sendButton: null,
    userStatus: null,
    characterHeader: null,
    characterHeaderImage: null,
    characterHeaderName: null,
    mobileHeaderTitle: null,

    /**
     * DOM要素を初期化
     */
    init() {
        this.messagesDiv = document.getElementById('messages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.userStatus = document.getElementById('userStatus');
        this.characterHeader = document.getElementById('characterHeader');
        this.characterHeaderImage = document.getElementById('characterHeaderImage');
        this.characterHeaderName = document.getElementById('characterHeaderName');
        this.mobileHeaderTitle = document.getElementById('mobileHeaderTitle');
    },

    /**
     * 鑑定士を設定（ヘッダー表示を更新）
     * @param {string} characterId - キャラクターID
     * @param {Object} characterInfo - キャラクター情報
     */
    setCurrentCharacter(characterId, characterInfo) {
        if (!characterInfo[characterId]) {
            console.warn('[ChatUI.setCurrentCharacter] ⚠️ characterInfo[' + characterId + '] が存在しないため、kaedeにフォールバックします');
            characterId = 'kaede';
        }
        
        const info = characterInfo[characterId];
        
        // PC版ヘッダー
        if (this.characterHeaderImage && this.characterHeaderName) {
            this.characterHeaderImage.src = info.image;
            this.characterHeaderImage.alt = info.name;
            this.characterHeaderName.textContent = info.name;
        }
        
        // モバイル版ヘッダー
        if (this.mobileHeaderTitle) {
            this.mobileHeaderTitle.innerHTML = '';
            
            const profileLink = document.createElement('a');
            profileLink.href = info.profileUrl;
            profileLink.style.textDecoration = 'none';
            profileLink.style.color = '#ffffff';
            profileLink.style.display = 'flex';
            profileLink.style.alignItems = 'center';
            profileLink.style.justifyContent = 'center';
            profileLink.style.gap = '8px';
            
            const iconImg = document.createElement('img');
            iconImg.src = info.image;
            iconImg.alt = info.name;
            iconImg.className = 'mobile-character-icon';
            
            const nameText = document.createElement('span');
            nameText.textContent = info.name;
            
            profileLink.appendChild(iconImg);
            profileLink.appendChild(nameText);
            this.mobileHeaderTitle.appendChild(profileLink);
        }
    },

    /**
     * ユーザーステータスを更新
     * @param {boolean} isRegistered - 登録済みかどうか
     * @param {Object} userData - ユーザーデータ（オプション）
     */
    updateUserStatus(isRegistered, userData = null) {
        if (!this.userStatus) return;
        
        if (!userData) {
            console.warn('[ChatUI] updateUserStatus: userDataが提供されていません');
            this.userStatus.textContent = '鑑定名義: 鑑定者';
            this.userStatus.className = 'user-status registered';
            return;
        }
        
        const nickname = userData.nickname || '鑑定者';
        const deityId = userData.assignedDeity || '未割当';
        const birthYear = userData.birthYear || null;
        const birthMonth = userData.birthMonth || null;
        const birthDay = userData.birthDay || null;
        
        const deity = deityId;
        
        let statusText = `鑑定名義: ${nickname}`;
        
        if (birthYear && birthMonth && birthDay) {
            statusText += ` ｜ 生年月日: ${birthYear}年${birthMonth}月${birthDay}日`;
        }
        
        if (deity && deity !== '未割当') {
            statusText += ` ｜ 守護: ${deity}`;
        }
        
        this.userStatus.textContent = statusText;
        this.userStatus.className = 'user-status registered';
    },

    /**
     * メッセージを追加
     * @param {string} type - メッセージタイプ ('user', 'character', 'welcome', 'error', 'loading')
     * @param {string} text - メッセージテキスト
     * @param {string} sender - 送信者名
     * @param {Object} options - オプション
     * @returns {string} メッセージ要素のID
     */
    addMessage(type, text, sender, options = {}) {
        // デバッグ: オブジェクトが渡されている場合、詳細ログを出力
        if (typeof text !== 'string') {
            console.error('[ChatUI.addMessage] ⚠️ オブジェクトが渡されています！', {
                type,
                sender,
                textType: typeof text,
                textValue: text,
                textStringified: JSON.stringify(text),
                stackTrace: new Error().stack
            });
            // エラーとして処理：オブジェクトを文字列に変換
            if (Array.isArray(text)) {
                text = text.map(item => typeof item === 'object' ? JSON.stringify(item) : String(item)).join(', ');
            } else if (text && typeof text === 'object') {
                text = text.message || text.content || JSON.stringify(text);
            } else {
                text = String(text);
            }
        }
        
        if (type === 'welcome') {
            const existingMessages = this.messagesDiv?.querySelectorAll('.message.welcome') || [];
            const isDuplicate = Array.from(existingMessages).some(msg => {
                const textDiv = msg.querySelector('.message-text');
                return textDiv && textDiv.textContent === text;
            });
            
            if (isDuplicate) {
                console.warn('[ChatUI] 重複したwelcomeメッセージを検出しました。スキップします。', text.substring(0, 100));
                return null;
            }
        }
        
        if (!this.messagesDiv) return null;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const messageId = options.id || `message-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        messageDiv.id = messageId;
        
        if (type === 'character') {
            messageDiv.style.background = 'rgba(75, 0, 130, 0.9)';
            messageDiv.style.color = '#ffffff';
            messageDiv.style.border = 'none';
            messageDiv.style.boxShadow = 'none';
        }

        // loadingタイプのメッセージの特別な処理（簡略版）
        if (type === 'loading') {
            messageDiv.className = 'message loading-message';
            messageDiv.style.background = 'rgba(75, 0, 130, 0.95)';
            messageDiv.style.color = '#ffd700';
            messageDiv.style.border = 'none';
            messageDiv.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.3), 0 0 40px rgba(138, 43, 226, 0.2)';
        }

        if (sender) {
            const headerDiv = document.createElement('div');
            headerDiv.className = 'message-header';
            headerDiv.textContent = sender;
            
            if (type === 'character') {
                headerDiv.style.color = 'rgba(255, 255, 255, 0.9)';
            }
            else if (type === 'loading') {
                headerDiv.style.color = '#ffd700';
                headerDiv.style.textShadow = '0 0 10px rgba(255, 215, 0, 0.8), 0 0 20px rgba(138, 43, 226, 0.6)';
            }
            else if (type === 'user') {
                headerDiv.style.color = '#b794ff';
            }
            
            messageDiv.appendChild(headerDiv);
        }

        let displayText = text;
        const cardPattern = /【(過去|現在|未来)】([^\n]+)/g;
        const hasCardInfo = cardPattern.test(text);
        
        if (hasCardInfo) {
            displayText = text.replace(/【(過去|現在|未来)】[^\n]+\n?/g, '').trim();
            displayText = displayText.replace(/\n{3,}/g, '\n\n');
        }
        
        const displayTextWithoutTag = displayText.replace(/\[SUGGEST_TAROT\]/g, '');
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        if (type === 'loading') {
            textDiv.style.cssText = `
                color: #ffd700;
                text-shadow: 
                    0 0 10px rgba(255, 215, 0, 0.8),
                    0 0 20px rgba(138, 43, 226, 0.6),
                    0 0 30px rgba(255, 107, 157, 0.4);
                animation: guardian-mystic-glow-text 3s ease-in-out infinite;
                text-align: center;
                line-height: 1.8;
            `;
        }
        textDiv.textContent = displayTextWithoutTag;
        messageDiv.appendChild(textDiv);

        if ((type === 'character' || type === 'welcome') && window.CharacterFeatures) {
            const sendMessageCallback = typeof window.sendMessage === 'function' ? window.sendMessage : null;
            if (window.CharacterFeatures.detect(ChatData.currentCharacter, text)) {
                window.CharacterFeatures.display(ChatData.currentCharacter, text, messageDiv, sendMessageCallback);
            }
        }

        this.messagesDiv.appendChild(messageDiv);
        
        // メッセージ追加後、ハンドラーのコールバックを呼び出す
        if (window.CharacterRegistry && ChatData && ChatData.currentCharacter) {
            const handler = CharacterRegistry.get(ChatData.currentCharacter);
            if (handler && typeof handler.onMessageAdded === 'function') {
                try {
                    handler.onMessageAdded(type, text, sender, messageDiv, messageId, options);
                } catch (error) {
                    console.error(`[chat-ui] ハンドラーのonMessageAddedでエラーが発生しました (${ChatData.currentCharacter}):`, error);
                }
            }
        }
        
        // メッセージ追加時に自動スクロール（シンプル版）
        // DOM追加後に確実にスクロールするため、少し遅延させる
        setTimeout(() => {
            if (this.messagesDiv) {
                try {
                    this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;
                } catch (e) {
                    // エラー時は何もしない
                }
            }
        }, 50);
        
        return messageId;
    },

    /**
     * スクロールを最新に（シンプル版）
     */
    scrollToLatest() {
        if (!this.messagesDiv) {
            // messagesDivが初期化されていない場合は再取得を試みる
            this.messagesDiv = document.getElementById('messages');
            if (!this.messagesDiv) return;
        }
        
        try {
            this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;
        } catch (e) {
            // エラー時は何もしない
        }
    },

    /**
     * メッセージをすべてクリア
     */
    clearMessages() {
        if (!this.messagesDiv) return;
        this.messagesDiv.innerHTML = '';
    },

    /**
     * 「考え中...」を実際のメッセージに置き換え
     * @param {HTMLElement} thinkingElement - 「考え中...」要素
     * @param {string} message - 置き換えるメッセージ
     */
    replaceThinkingMessage(thinkingElement, message) {
        if (!thinkingElement || !this.messagesDiv) {
            console.warn('[ChatUI.replaceThinkingMessage] 無効な引数');
            return;
        }
        
        const contentDiv = thinkingElement.querySelector('.message-content');
        if (!contentDiv) {
            console.error('[ChatUI.replaceThinkingMessage] .message-contentが見つかりません');
            return;
        }
        
        const cleanedMessage = message;
        
        contentDiv.style.transition = 'opacity 0.2s ease';
        contentDiv.style.opacity = '0';
        
        setTimeout(() => {
            const thinkingIndicator = contentDiv.querySelector('.thinking-indicator');
            if (thinkingIndicator) {
                thinkingIndicator.remove();
            }
            
            contentDiv.innerHTML = '';
            const textDiv = document.createElement('div');
            textDiv.className = 'message-text';
            const displayMessageWithoutTag = cleanedMessage.replace(/\[SUGGEST_TAROT\]/g, '');
            textDiv.textContent = displayMessageWithoutTag;
            contentDiv.appendChild(textDiv);
            contentDiv.style.opacity = '1';
            
            if (window.CharacterRegistry && ChatData && ChatData.currentCharacter) {
                const handler = CharacterRegistry.get(ChatData.currentCharacter);
                if (handler && typeof handler.onMessageAdded === 'function') {
                    const messageDiv = thinkingElement;
                    const messageId = messageDiv.id || `message-${Date.now()}`;
                    try {
                        const messageType = thinkingElement.classList.contains('welcome') ? 'welcome' : 
                                           thinkingElement.classList.contains('character') ? 'character' : 'assistant';
                        const sender = ChatData.characterInfo?.[ChatData.currentCharacter]?.name || 'キャラクター';
                        handler.onMessageAdded(messageType, cleanedMessage, sender, messageDiv, messageId, {});
                    } catch (error) {
                        console.error(`[ChatUI.replaceThinkingMessage] onMessageAddedでエラーが発生しました (${ChatData.currentCharacter}):`, error);
                    }
                }
            }
            
            thinkingElement.classList.remove('thinking');
            this.scrollToLatest();
        }, 200);
    },

    /**
     * 送信ボタンの表示/非表示を更新
     */
    updateSendButtonVisibility() {
        if (!this.sendButton || !this.messageInput) return;
        
        if (this.messageInput.value.trim().length > 0) {
            this.sendButton.classList.add('visible');
            this.sendButton.disabled = false;
        } else {
            this.sendButton.classList.remove('visible');
        }
    },

    /**
     * 守護神の儀式への同意ボタンを表示
     */
    showRitualConsentButtons(questionText = '守護神の儀式を始めますか？') {
        if (ChatData.ritualConsentShown) {
            return;
        }
        
        const ritualConsentContainer = document.getElementById('ritualConsentContainer');
        const ritualConsentQuestion = document.getElementById('ritualConsentQuestion');
        
        if (ritualConsentContainer) {
            if (ritualConsentContainer.classList.contains('visible')) {
                return;
            }
            
            if (ritualConsentQuestion) {
                ritualConsentQuestion.textContent = questionText;
            }
            
            ChatData.ritualConsentShown = true;
            ritualConsentContainer.style.display = 'block';
            requestAnimationFrame(() => {
                ritualConsentContainer.classList.add('visible');
            });
        }
    },

    /**
     * 守護神の儀式への同意ボタンを非表示
     */
    hideRitualConsentButtons() {
        const ritualConsentContainer = document.getElementById('ritualConsentContainer');
        if (ritualConsentContainer) {
            ritualConsentContainer.classList.remove('visible');
            setTimeout(() => {
                ritualConsentContainer.style.display = 'none';
            }, 500);
        }
    },

    /**
     * 守護神の儀式開始ボタンをメッセージの下に追加
     */
    addRitualStartButton(messageElement, onClickHandler) {
        if (!messageElement) {
            console.error('[addRitualStartButton] messageElementがnullです');
            return null;
        }
        
        const existingButton = messageElement.querySelector('.ritual-start-button');
        if (existingButton) {
            existingButton.remove();
        }
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.marginTop = '15px';
        buttonContainer.style.paddingTop = '15px';
        buttonContainer.style.borderTop = '1px solid rgba(255, 255, 255, 0.2)';
        
        const button = document.createElement('button');
        button.className = 'ritual-start-button';
        button.textContent = '守護神の儀式を始める';
        button.style.cssText = `
            width: 100%;
            padding: 12px 24px;
            background: linear-gradient(135deg, #8B3DFF 0%, #6A0DAD 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(139, 61, 255, 0.3);
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.background = 'linear-gradient(135deg, #9B4DFF 0%, #7A1DBD 100%)';
            button.style.boxShadow = '0 6px 16px rgba(139, 61, 255, 0.4)';
            button.style.transform = 'translateY(-2px)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.background = 'linear-gradient(135deg, #8B3DFF 0%, #6A0DAD 100%)';
            button.style.boxShadow = '0 4px 12px rgba(139, 61, 255, 0.3)';
            button.style.transform = 'translateY(0)';
        });
        
        button.addEventListener('click', async () => {
            button.disabled = true;
            button.textContent = '儀式を開始しています...';
            button.style.opacity = '0.7';
            button.style.cursor = 'wait';
            
            try {
                await onClickHandler();
            } catch (error) {
                console.error('[守護神の儀式] 開始エラー:', error);
                button.disabled = false;
                button.textContent = '守護神の儀式を始める';
                button.style.opacity = '1';
                button.style.cursor = 'pointer';
                ChatUI.addMessage('error', '守護神の儀式の開始中にエラーが発生しました。もう一度お試しください。', 'システム');
            }
        });
        
        buttonContainer.appendChild(button);
        messageElement.appendChild(buttonContainer);
        
        requestAnimationFrame(() => {
            this.scrollToLatest();
        });
        
        return button;
    },

    /**
     * 守護神の儀式開始ボタンが表示されているかチェック
     */
    isRitualStartButtonVisible() {
        const button = document.querySelector('.ritual-start-button');
        if (!button) return false;
        
        const visibleButton = Array.from(document.querySelectorAll('.ritual-start-button')).find(btn => {
            const style = window.getComputedStyle(btn);
            return style.display !== 'none' && !btn.disabled;
        });
        
        return visibleButton !== undefined;
    }
};

// グローバルスコープに公開（iframeからアクセスできるようにする）
window.ChatUI = ChatUI;

// グローバルなscrollToBottom関数（シンプル版）
// 【重要】initPage()より前に定義することで、MutationObserver設定時に確実に存在するようにする
window.scrollToBottom = function() {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return;
    
    try {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } catch (e) {
        // エラー時は何もしない
    }
};

const ChatInit = {
    /**
     * ページを初期化
     */
    async initPage() {
        // #region パフォーマンス測定
        const initPageStartTime = performance.now();
        const markInitPageTiming = (label) => {
            const now = performance.now();
            console.log(`[初期化パフォーマンス] ${label}: ${(now - initPageStartTime).toFixed(2)}ms`);
        };
        // #endregion
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:1358',message:'initPage開始',data:{isRunning:this._initPageRunning,isCompleted:this._initPageCompleted,url:window.location.href},timestamp:Date.now(),sessionId:'debug-session',runId:'perf1',hypothesisId:'perfA'})}).catch(()=>{});
        // #endregion
        // 重複実行を防ぐフラグをチェック
        if (this._initPageRunning) {
            console.warn('[初期化] initPageが既に実行中です。重複実行をスキップします。');
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:1362',message:'initPage重複実行検出→スキップ',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'perf1',hypothesisId:'perfA'})}).catch(()=>{});
            // #endregion
            // #region agent log (開発環境のみ - コメントアウト)
            // ローカルロギングサーバーへの接続は開発環境でのみ有効
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:19',message:'initPage重複実行検出→スキップ',data:{url:window.location.href,character:new URLSearchParams(window.location.search).get('character')},timestamp:Date.now(),runId:'debug-run',hypothesisId:'B'})}).catch(()=>{});
            // }
            // #endregion
            return;
        }
        if (this._initPageCompleted) {
            console.warn('[初期化] initPageは既に完了しています。重複実行をスキップします。');
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:1355',message:'initPage完了済み検出→スキップ',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:26',message:'initPage完了済み検出→スキップ',data:{url:window.location.href,character:new URLSearchParams(window.location.search).get('character')},timestamp:Date.now(),runId:'debug-run',hypothesisId:'B'})}).catch(()=>{});
            // }
            // #endregion
            return;
        }
        this._initPageRunning = true;
        
        // 【追加】userIdがURLパラメータにある場合、エントリーフォームを非表示にしてチャットコンテナを表示
        // グローバルスコープのurlParamsを使用
        if (!window._chatUrlParams) {
            window._chatUrlParams = new URLSearchParams(window.location.search);
        }
        const urlParams = window._chatUrlParams;
        const userId = urlParams.get('userId');
        console.log('[初期化] userIdチェック:', { userId, hasUrlParams: !!urlParams });
        if (userId) {
            const entryFormContainer = document.getElementById('entryFormContainer');
            const chatContainer = document.getElementById('chatContainer');
            console.log('[初期化] 要素確認:', {
                hasEntryForm: !!entryFormContainer,
                hasChatContainer: !!chatContainer,
                entryFormClasses: entryFormContainer?.className,
                chatContainerClasses: chatContainer?.className
            });
            if (entryFormContainer && chatContainer) {
                entryFormContainer.classList.add('entry-form-hidden');
                chatContainer.classList.remove('entry-form-hidden');
                console.log('[初期化] userIdがURLパラメータにあるため、エントリーフォームを非表示にしてチャットコンテナを表示しました');
                console.log('[初期化] クラス変更後:', {
                    entryFormHasHidden: entryFormContainer.classList.contains('entry-form-hidden'),
                    chatContainerHasHidden: chatContainer.classList.contains('entry-form-hidden')
                });
            } else {
                console.error('[初期化] 要素が見つかりません:', {
                    entryFormContainer: !!entryFormContainer,
                    chatContainer: !!chatContainer
                });
            }
        } else {
            console.log('[初期化] userIdがURLパラメータにありません');
        }
        
        // #region agent log (開発環境のみ - コメントアウト)
        // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:27',message:'initPage関数開始',data:{url:window.location.href,character:new URLSearchParams(window.location.search).get('character')},timestamp:Date.now(),runId:'debug-run',hypothesisId:'B'})}).catch(()=>{});
        // }
        // #endregion
        // テストモードチェックは、chat-engine.jsの最初（DOMContentLoadedの外）で実行されるため、
        // ここでは実行しない（重複を避ける）
        
        // 待機画面の管理
        // チャット画面が表示されている場合、待機画面を表示（全鑑定士共通）
        const waitingOverlay = document.getElementById('waitingOverlay');
        if (waitingOverlay) {
            // チャットコンテナが表示されているか確認
            const chatContainer = document.getElementById('chatContainer');
            if (chatContainer && !chatContainer.classList.contains('entry-form-hidden')) {
                // チャット画面が表示されている場合、待機画面を表示
                waitingOverlay.classList.remove('hidden');
                console.log('[初期化] 待機画面を表示しました（チャット画面表示中）');
            }
            console.log('[初期化] 待機画面の状態を確認します（初期化開始時）');
            // 待機画面は、historyData取得後に判定して非表示にする
        }
        
        // キャラクター固有の初期化処理はハンドラーに委譲
        // ハンドラーが読み込まれる前に必要な処理がある場合は、ハンドラーのinit()で処理されます
        
        // ChatUIを初期化
        if (window.ChatUI && typeof window.ChatUI.init === 'function') {
            window.ChatUI.init();
        }
        
        // AuthStateを初期化
        if (window.AuthState && typeof AuthState.init === 'function') {
            AuthState.init();
        }
        
        // 守護神の儀式への同意ボタンの表示フラグをリセット（ページ読み込み時）
        ChatData.ritualConsentShown = false;
        
        // 会話履歴はデータベースから取得（すべて登録ユーザー）

        // 【修正】キャラクターを先に取得してから使用
        const character = ChatData.getCharacterFromURL();

        // キャラクター情報を読み込む（単一キャラクターのみ）
        // #region agent log (開発環境のみ - コメントアウト)
        // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:27',message:'loadCharacterData呼び出し前',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // }
        // #endregion
        // characterIdを指定して単一キャラクターデータのみ読み込む（効率化）
        await ChatData.loadCharacterData(character);
        // #region agent log (開発環境のみ - コメントアウト)
        // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:29',message:'loadCharacterData呼び出し後',data:{characterInfoKeys:Object.keys(ChatData.characterInfo),characterInfoLength:Object.keys(ChatData.characterInfo).length},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // }
        // #endregion
        if (Object.keys(ChatData.characterInfo).length === 0) {
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:30',message:'characterInfoが空→早期リターン',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // }
            // #endregion
            console.error('Failed to load character data');
            return;
        }
        
        // 【削除】characterは既に上で定義済み

        // 以前のキャラクターを保存（キャラクター切り替え判定用）
        const previousCharacter = ChatData.currentCharacter;
        
        // キャラクターが切り替わった場合、lastUserMessageとguardianMessageShownフラグをクリア
        if (previousCharacter && previousCharacter !== character) {
            sessionStorage.removeItem('lastUserMessage');
            sessionStorage.removeItem('guardianMessageShown');
            // 【修正】キャラクター切り替え時に会話履歴をクリア
            ChatData.conversationHistory = null;
            console.log('[初期化] キャラクターが切り替わりました。lastUserMessage、guardianMessageShown、conversationHistoryをクリアしました:', {
                previousCharacter,
                newCharacter: character
            });
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:1498',message:'キャラクター切り替え検出',data:{previousCharacter:previousCharacter,newCharacter:character,conversationHistoryCleared:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
        }
        
        // #region agent log
        console.log('🔍🔍🔍 [キャラクター初期化]', {
            URLから取得: character,
            現在のURL: window.location.href,
            URLSearchParams: Object.fromEntries(new URLSearchParams(window.location.search)),
            以前のcurrentCharacter: previousCharacter,
        });
        // #endregion
        
        ChatData.currentCharacter = character;
        if (window.ChatUI) {
            window.ChatUI.setCurrentCharacter(character, ChatData.characterInfo);
        }
        
        // 【変更】ユーザー情報の設定はhistoryDataの取得後に実行
        // （データベースベースの判断に移行するため、初期化時はnull）
        ChatData.userNickname = null;
        
        // 登録完了フラグをチェック
        // urlParamsは既に1395行目で宣言済みなので、再利用
        const justRegisteredParam = urlParams.get('justRegistered') === 'true';
        
        // sessionStorageにも登録完了フラグをチェック（URLパラメータが失われた場合の代替手段）
        const justRegisteredSession = sessionStorage.getItem('justRegistered') === 'true';
        const justRegistered = justRegisteredParam || justRegisteredSession;
        
        // 【変更】登録完了時の判定はhistoryDataの取得後に実行
        // （データベースベースの判断に移行するため、ここではURLパラメータのみをチェック）
        const shouldTriggerRegistrationFlow = justRegistered;
        
        console.log('[初期化] justRegistered:', justRegistered, 'justRegisteredParam:', justRegisteredParam, 'justRegisteredSession:', justRegisteredSession, 'shouldTriggerRegistrationFlow:', shouldTriggerRegistrationFlow, 'character:', character);

        // 登録完了時の処理を先にチェック（会話履歴を読み込む前に実行）
        // 【変更】hasValidSessionのチェックを削除（historyDataの取得後に判定）
        if (justRegistered || shouldTriggerRegistrationFlow) {
            console.log('[登録完了処理] 開始 - character:', character);
            
            // 待機画面を表示
            const waitingOverlay = document.getElementById('waitingOverlay');
            if (waitingOverlay) {
                waitingOverlay.classList.remove('hidden');
                console.log('[登録完了処理] 待機画面を表示しました');
            }
            
            try {
                // 【重要】データベースから最新のユーザー情報を取得
                // これにより、APIが確実にデータベースからユーザー情報を読み込んでいることを確認
                console.log('[登録完了処理] データベースからユーザー情報を取得中...');
                let historyData = null;
                let dbUserNickname = null;
                try {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:1558',message:'loadConversationHistory呼び出し前（登録完了処理）',data:{character:character,urlCharacter:new URLSearchParams(window.location.search).get('character'),currentCharacter:ChatData.currentCharacter},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                    // #endregion
                    // #region agent log
                fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:1812',message:'loadConversationHistory呼び出し前（通常フロー）',data:{character:character,urlCharacter:new URLSearchParams(window.location.search).get('character'),currentCharacter:ChatData.currentCharacter},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                historyData = await ChatAPI.loadConversationHistory(character);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:1815',message:'loadConversationHistory呼び出し後（通常フロー）',data:{character:character,hasHistoryData:!!historyData,recentMessagesLength:historyData?.recentMessages?.length||0,urlCharacter:new URLSearchParams(window.location.search).get('character')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:1561',message:'loadConversationHistory呼び出し後（登録完了処理）',data:{character:character,hasHistoryData:!!historyData,recentMessagesLength:historyData?.recentMessages?.length||0,urlCharacter:new URLSearchParams(window.location.search).get('character')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                    // #endregion
                    if (historyData && historyData.nickname) {
                        dbUserNickname = historyData.nickname;
                        // 【変更】データベースから取得した情報をlocalStorageに保存しない
                        ChatData.userNickname = dbUserNickname;
                        console.log('[登録完了処理] データベースからユーザー情報を取得しました:', {
                            nickname: dbUserNickname,
                            hasHistory: historyData.hasHistory
                        });
                    } else {
                        // データベースにユーザー情報がない場合（初回登録直後）
                        console.log('[登録完了処理] データベースにユーザー情報が見つかりません（初回登録のため正常）');
                        // 【変更】localStorageから取得しない（データベースベースの判断）
                        dbUserNickname = 'あなた';
                        ChatData.userNickname = dbUserNickname;
                    }
                } catch (error) {
                    console.error('[登録完了処理] データベースからの情報取得エラー:', error);
                    // エラーハンドリング
                    if (error instanceof Error) {
                        if (error.message === 'USER_NOT_FOUND') {
                            // ユーザー情報が登録されていない場合：エントリーフォームを表示
                            console.error('[登録完了処理] ユーザー情報が登録されていません。エントリーフォームを表示します。');
                            
                            // チャットコンテナを非表示にしてエントリーフォームを表示
                            const entryFormContainer = document.getElementById('entryFormContainer');
                            const chatContainer = document.getElementById('chatContainer');
                            const entryFormError = document.getElementById('entryFormError');
                            
                            if (entryFormContainer && chatContainer) {
                                // エントリーフォームを表示
                                entryFormContainer.classList.remove('entry-form-hidden');
                                // チャットコンテナを非表示
                                chatContainer.classList.add('entry-form-hidden');
                                
                                // エラーメッセージを表示
                                if (entryFormError) {
                                    entryFormError.textContent = '会員情報が存在しないため、再度会員登録をお願いします。';
                                    entryFormError.classList.add('show');
                                }
                                
                                console.log('[登録完了処理] エントリーフォームを表示しました（ユーザー情報が見つかりません）');
                            }
                            return;
                        } else if (error.message === 'NETWORK_ERROR') {
                            // ネットワーク接続エラーの場合
                            console.error('[登録完了処理] ネットワーク接続エラーが発生しました');
                            if (window.ChatUI) {
                                window.ChatUI.addMessage('error', 'インターネット接続エラーが発生しました。しばらく経ってから再度お試しください。', 'システム');
                            }
                            // エラー時はデフォルト値を使用
                            dbUserNickname = 'あなた';
                            ChatData.userNickname = dbUserNickname;
                            return;
                        }
                    }
                    // その他のエラー：デフォルト値を使用
                    console.warn('[登録完了処理] エラーが発生しましたが、処理を続行します');
                    dbUserNickname = 'あなた';
                    ChatData.userNickname = dbUserNickname;
                    historyData = null;
                }
                
                // 待機画面を非表示
                if (waitingOverlay) {
                    waitingOverlay.classList.add('hidden');
                    console.log('[登録完了処理] 待機画面を非表示にしました');
                }
                
                // キャラクター専用ハンドラーの初期化処理を呼び出す
                const handler = CharacterRegistry.get(character);
                if (handler && typeof handler.initPage === 'function') {
                    const result = await handler.initPage(urlParams, historyData, justRegistered, shouldTriggerRegistrationFlow);
                    if (result && result.completed) {
                        console.log('[登録完了処理] ハンドラーで処理完了。処理を終了します。');
                        return; // 処理終了
                    }
                    if (result && result.skip) {
                        console.log('[登録完了処理] ハンドラーで処理スキップ。処理を終了します。');
                        return; // 処理終了
                    }
                }
                
                // 会話履歴はhistoryDataから取得（登録完了後はデータベースから取得）
                let conversationHistory = [];
                if (historyData && historyData.recentMessages) {
                    conversationHistory = historyData.recentMessages;
                }
                
                // キャラクター専用ハンドラーの登録完了後処理を呼び出す
                if (handler && typeof handler.handlePostRegistration === 'function') {
                    await handler.handlePostRegistration(historyData);
                }
                
                const info = ChatData.characterInfo[character];
                
                // 会話履歴を表示（historyDataから取得）
                if (conversationHistory.length > 0) {
                    console.log('[登録完了処理] 会話履歴を画面に表示します:', conversationHistory.length, '件');
                    
                    // 【重要】先に会話履歴を画面に表示
                    conversationHistory.forEach((entry) => {
                        // システムメッセージ（isSystemMessage: true）は画面に表示しない
                        if (entry.isSystemMessage) {
                            const content = entry.content || entry.message || '';
                            if (content) {
                                console.log('[登録完了処理] システムメッセージをスキップ:', typeof content === 'string' ? content.substring(0, 30) + '...' : '[非文字列コンテンツ]');
                            }
                            return;
                        }
                        const type = entry.role === 'user' ? 'user' : 'character';
                        const sender = entry.role === 'user' ? 'あなた' : info.name;
                        // contentを安全に取得（messageプロパティも確認）
                        const content = entry.content || entry.message || '';
                        if (window.ChatUI) {
                            window.ChatUI.addMessage(type, content, sender);
                        }
                    });
                    console.log('[登録完了処理] 会話履歴の表示完了');
                    
                    // 最後のユーザーメッセージを抽出
                    let lastUserMessage = '';
                    for (let i = conversationHistory.length - 1; i >= 0; i--) {
                        if (conversationHistory[i].role === 'user') {
                            lastUserMessage = conversationHistory[i].content;
                            break;
                        }
                    }
                    
                    // 【変更】ニックネームをhistoryDataから取得
                    const userNickname = (historyData && historyData.nickname) || dbUserNickname || 'あなた';
                    
                    // 定型文を生成（ハンドラーから取得、なければ汎用メッセージ）
                    let welcomeBackMessage = null;
                    if (handler && typeof handler.getWelcomeBackMessage === 'function') {
                        welcomeBackMessage = handler.getWelcomeBackMessage(userNickname, lastUserMessage);
                    }
                    
                    if (!welcomeBackMessage) {
                        // ハンドラーがnullを返した場合、またはメソッドがない場合は汎用メッセージ
                        welcomeBackMessage = `${userNickname}さん、おかえりなさい。ユーザー登録ありがとうございます。それでは、続きを始めましょうか。`;
                    }
                    
                    // 定型文を画面に表示
                    if (window.ChatUI) {
                        window.ChatUI.addMessage('character', welcomeBackMessage, info.name);
                    }
                    console.log('[登録完了処理] おかえりなさいメッセージを表示しました');
                } else {
                    // 会話履歴がない場合：新規ユーザーとして初回メッセージを表示
                    // 【重要】データベースから取得したニックネームを使用
                    console.log('[登録完了処理] 会話履歴なし。新規ユーザーとして初回メッセージを表示します');
                    const nicknameForMessage = dbUserNickname || ChatData.userNickname || 'あなた';
                    console.log('[登録完了処理] 初回メッセージに使用するニックネーム:', nicknameForMessage);
                    // 登録直後のため、他のキャラクターとの会話履歴はないと仮定
                    const firstTimeMessage = ChatData.generateFirstTimeMessage(character, nicknameForMessage, false, false);
                    if (window.ChatUI) {
                        window.ChatUI.addMessage('welcome', firstTimeMessage, info.name);
                    }
                }
                
                // ゲスト履歴とカウントをクリア（データベースに移行済みのため）
                // 会話履歴はデータベースで管理されるため、sessionStorageのクリアは不要
                ChatData.setUserMessageCount(character, 0);
                
                // 【重要】登録後のイベントリスナーを設定
                console.log('[登録完了処理] イベントリスナーを設定します');
                if (window.ChatUI.messageInput) {
                    // 既存のリスナーを削除（重複登録を防ぐ）
                    const newInput = window.ChatUI.messageInput.cloneNode(true);
                    window.ChatUI.messageInput.parentNode.replaceChild(newInput, window.ChatUI.messageInput);
                    window.ChatUI.messageInput = newInput;
                    
                    window.ChatUI.messageInput.addEventListener('keydown', (e) => {
                        // PC環境（画面幅768px以上）でのみEnterキー送信を有効化
                        // Shift + Enterは改行、日本語入力確定時のEnterは送信しない
                        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && window.innerWidth >= 768) {
                            e.preventDefault();
                            window.sendMessage();
                        }
                    });
                    
                    window.ChatUI.messageInput.addEventListener('input', () => {
                        window.ChatUI.updateSendButtonVisibility();
                    });
                    
                    // フォーカス時に最下部へスクロール（スマホのキーボード表示時に対応）
                    window.ChatUI.messageInput.addEventListener('focus', () => {
                        if (window.ChatUI.scrollToLatest) {
                            window.ChatUI.scrollToLatest();
                        }
                    });
                    
                    console.log('[登録完了処理] イベントリスナーの設定完了');
                }
                
                // キャラクター固有のフラグをクリア（ハンドラーに委譲）
                // 注意: handlerは121行目で既に宣言されているため、再宣言しない
                if (handler && typeof handler.clearCharacterFlags === 'function') {
                    handler.clearCharacterFlags();
                }
                
                // URLパラメータからjustRegisteredを削除
                urlParams.delete('justRegistered');
                const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
                window.history.replaceState({}, '', newUrl);
                
                // sessionStorageからも登録完了フラグを削除
                sessionStorage.removeItem('justRegistered');
                
                return;
            } catch (error) {
                console.error('[登録完了処理] エラー:', error);
                if (window.ChatUI) {
                    window.ChatUI.addMessage('error', '登録完了処理中にエラーが発生しました。ページを再読み込みしてください。', 'システム');
                }
                return;
            }
        }
        
        try {
            // キャラクターが切り替わった場合のみ、会話履歴を読み込む前にメッセージをクリア
            if (previousCharacter && previousCharacter !== character) {
                if (window.ChatUI && typeof window.ChatUI.clearMessages === 'function') {
                    window.ChatUI.clearMessages();
                    console.log('[初期化] キャラクターが切り替わりました。メッセージをクリアしました:', {
                        previousCharacter,
                        newCharacter: character
                    });
                }
            }
            
            // 守護神の儀式完了直後のフラグを事前にチェック
            const guardianMessageShown = sessionStorage.getItem('guardianMessageShown') === 'true';
            
            // 会話履歴を読み込む
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:217',message:'loadConversationHistory呼び出し前',data:{character},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // }
            // #endregion
            let historyData = null;
            try {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:1812',message:'loadConversationHistory呼び出し前（通常フロー）',data:{character:character,urlCharacter:new URLSearchParams(window.location.search).get('character'),currentCharacter:ChatData.currentCharacter},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                historyData = await ChatAPI.loadConversationHistory(character);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:1815',message:'loadConversationHistory呼び出し後（通常フロー）',data:{character:character,hasHistoryData:!!historyData,recentMessagesLength:historyData?.recentMessages?.length||0,urlCharacter:new URLSearchParams(window.location.search).get('character')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
            } catch (error) {
                // エラーハンドリング
                if (error instanceof Error) {
                    if (error.message === 'USER_NOT_FOUND') {
                        // ユーザー情報が登録されていない場合：エントリーフォームを表示
                        console.error('[初期化] ユーザー情報が登録されていません。エントリーフォームを表示します。');
                        
                        // チャットコンテナを非表示にしてエントリーフォームを表示
                        const entryFormContainer = document.getElementById('entryFormContainer');
                        const chatContainer = document.getElementById('chatContainer');
                        const entryFormError = document.getElementById('entryFormError');
                        
                        if (entryFormContainer && chatContainer) {
                            // エントリーフォームを表示
                            entryFormContainer.classList.remove('entry-form-hidden');
                            // チャットコンテナを非表示
                            chatContainer.classList.add('entry-form-hidden');
                            
                            // エラーメッセージを表示
                            if (entryFormError) {
                                entryFormError.textContent = '会員情報が存在しないため、再度会員登録をお願いします。';
                                entryFormError.classList.add('show');
                            }
                            
                            console.log('[初期化] エントリーフォームを表示しました（ユーザー情報が見つかりません）');
                        }
                        return;
                    } else if (error.message === 'NETWORK_ERROR') {
                        // ネットワーク接続エラーの場合
                        console.error('[初期化] ネットワーク接続エラーが発生しました');
                        if (window.ChatUI) {
                            window.ChatUI.addMessage('error', 'インターネット接続エラーが発生しました。しばらく経ってから再度お試しください。', 'システム');
                        }
                        return;
                    }
                }
                // その他のエラー
                console.error('[初期化] 会話履歴の取得エラー:', error);
                if (window.ChatUI) {
                    window.ChatUI.addMessage('error', '会話履歴の取得に失敗しました。時間を置いて再度お試しください。', 'システム');
                }
                return;
            }
            
            /**
             * 【統一化】すべての鑑定士で共通の初回メッセージ表示ロジック
             * 初回ユーザー（hasHistory === false）→ firstTimeGuestメッセージ
             * 再訪問ユーザー（hasHistory === true）→ returningメッセージ
             * @param {Object} options - オプション
             * @param {boolean} options.shouldShow - メッセージを表示するかどうか
             * @param {boolean} options.handlerSkippedFirstMessage - ハンドラーでスキップされたかどうか
             * @returns {Promise<boolean>} メッセージが表示されたかどうか
             */
            const showInitialMessage = async (options = {}) => {
                const { shouldShow = true, handlerSkippedFirstMessage = false } = options;
                
                // 表示条件をチェック
                if (!shouldShow || guardianMessageShown || handlerSkippedFirstMessage) {
                    return false;
                }
                
                const info = ChatData.characterInfo[character];
                if (!info) {
                    console.warn('[初期化] キャラクター情報が見つかりません:', character);
                    return false;
                }
                
                // 会話履歴がある場合：非同期メッセージ生成方式
                // 【改善】履歴を即座に表示し、「考え中...」を表示してからバックグラウンドで動的メッセージを生成
                if (historyData && historyData.hasHistory) {
                    console.log('[初期化] 再訪問ユーザー。非同期メッセージ生成方式を使用します');
                    
                    // 【削除】フラグは不要（awaitにより同期処理になるため）
                    
                    // 待機画面を表示（API呼び出し中）
                    const waitingOverlay = document.getElementById('waitingOverlay');
                    if (waitingOverlay) {
                        waitingOverlay.classList.remove('hidden');
                        console.log('[初期化] 待機画面を表示しました（再訪問時のメッセージ生成中）');
                    }
                    
                    // 【重要】待機画面が表示されている間は「考え中...」メッセージを表示しない
                    // 待機画面が表示されているため、追加の「考え中...」メッセージは不要
                    // メッセージ生成完了後に直接メッセージを表示する
                    let thinkingElement = null;
                    
                    // バックグラウンドで動的メッセージを生成（非同期）
                    // 【変更】履歴は表示しないが、システムプロンプト生成のためにvisitPatternのみを渡す
                    const generateMessageAsync = async () => {
                        try {
                            const visitPattern = historyData.visitPattern || 'returning';
                            
                            console.log(`[初期化] ${info.name}の再訪問時：バックグラウンドで動的メッセージを生成します`, {
                                character,
                                visitPattern
                            });
                            
                            // パフォーマンス測定
                            const apiCallStart = performance.now();
                            console.log(`[パフォーマンス] ChatAPI.generateWelcomeMessage呼び出し直前: ${(apiCallStart - initPageStartTime).toFixed(2)}ms`);
                            
                            // 【変更】conversationHistoryは渡さない（generate-welcome.tsでデータベースから取得）
                            // 履歴は表示しないが、システムプロンプト生成のためにvisitPatternを渡す
                            // バックエンドでデータベースから履歴を取得し、システムプロンプトに含める
                            const welcomeMessage = await ChatAPI.generateWelcomeMessage({
                                character,
                                conversationHistory: [], // 空配列を渡す（バックエンドでデータベースから取得）
                                visitPattern
                            });
                            
                            const apiCallEnd = performance.now();
                            console.log(`[パフォーマンス] ChatAPI.generateWelcomeMessage完了: ${(apiCallEnd - initPageStartTime).toFixed(2)}ms (所要時間: ${(apiCallEnd - apiCallStart).toFixed(2)}ms)`);
                            
                            console.log(`[初期化] ${info.name}の再訪問時：動的メッセージ生成完了`);
                            
                            // 待機画面を非表示（メッセージ表示前に実行）
                            if (waitingOverlay) {
                                waitingOverlay.classList.add('hidden');
                                console.log('[初期化] 待機画面を非表示にしました（メッセージ生成完了）');
                            }
                            
                            // bodyのfade-inクラスを追加（チャット画面を表示）
                            if (document.body) {
                                document.body.classList.add('fade-in');
                                console.log('[初期化] bodyにfade-inクラスを追加しました（チャット画面を表示）');
                            }
                            
                            // メッセージを直接表示（「考え中...」メッセージは表示していないため、直接追加）
                            if (window.ChatUI) {
                                window.ChatUI.addMessage('welcome', welcomeMessage, info.name);
                                console.log('[初期化] ウェルカムメッセージを表示しました');
                            } else {
                                console.error('[初期化] ChatUIが利用できません');
                            }
                            
                            // 【削除】フラグは不要（awaitにより同期処理になるため）
                        } catch (error) {
                            console.error(`[初期化] ${info.name}の再訪問時：動的メッセージ生成エラー:`, error);
                            
                            // 待機画面を非表示（エラー時も）
                            if (waitingOverlay) {
                                waitingOverlay.classList.add('hidden');
                                console.log('[初期化] 待機画面を非表示にしました（エラー時）');
                            }
                            
                            // bodyのfade-inクラスを追加（チャット画面を表示）
                            if (document.body) {
                                document.body.classList.add('fade-in');
                                console.log('[初期化] bodyにfade-inクラスを追加しました（エラー時、チャット画面を表示）');
                            }
                            
                            // エラー時はフォールバック（定型文）
                            // 「考え中...」メッセージは表示していないため、直接追加
                            const fallbackMessage = ChatData.generateInitialMessage(character, historyData);
                            if (window.ChatUI) {
                                window.ChatUI.addMessage('welcome', fallbackMessage || 'お帰りなさい。', info.name);
                                console.log('[初期化] フォールバックメッセージを表示しました（エラー時）');
                            }
                            
                            // 【削除】フラグは不要（awaitにより同期処理になるため）
                        }
                    };
                    
                    // 【重要】再訪問時のメッセージ生成が完了するまで待つ
                    // これにより、initPage()の最終チェックが実行される前にメッセージが表示される
                    try {
                        await generateMessageAsync();
                        console.log('[初期化] 再訪問時のメッセージ生成が完了しました');
                    } catch (error) {
                        console.error(`[初期化] ${info.name}の再訪問時：generateMessageAsyncエラー:`, error);
                        
                        // 待機画面を非表示（エラー時も）
                        const waitingOverlayError = document.getElementById('waitingOverlay');
                        if (waitingOverlayError) {
                            waitingOverlayError.classList.add('hidden');
                            console.log('[初期化] 待機画面を非表示にしました（generateMessageAsyncエラー時）');
                        }
                        
                        // bodyのfade-inクラスを追加（チャット画面を表示）
                        if (document.body) {
                            document.body.classList.add('fade-in');
                            console.log('[初期化] bodyにfade-inクラスを追加しました（generateMessageAsyncエラー時、チャット画面を表示）');
                        }
                        
                        // エラー時はフォールバックメッセージを表示
                        // 「考え中...」メッセージは表示していないため、直接追加
                        if (window.ChatUI) {
                            const fallbackMessage = ChatData.generateInitialMessage(character, historyData) || 'お帰りなさい。';
                            window.ChatUI.addMessage('welcome', fallbackMessage, info.name);
                            console.log('[初期化] フォールバックメッセージを表示しました（generateMessageAsyncエラー時）');
                        }
                        
                        // 【削除】フラグは不要（awaitにより同期処理になるため）
                    }
                    
                    // 再訪問時の処理が完了したので、以降の処理（最終チェックなど）をスキップ
                    return true;
                }
                
                // 会話履歴がない場合の処理
                // 【重要】守護神が既に決定されている場合は、firstTimeGuestメッセージを表示しない
                // 楓の場合は、守護神が決定されている場合、ハンドラーで守護神確認メッセージが表示される
                // 【スケーラビリティ改善】守護神が既に決定されている場合の判定をハンドラーに委譲
                const handlerForFirstMessage = CharacterRegistry.get(character);
                let shouldSkipFirstMessageForDeity = false;
                
                if (handlerForFirstMessage && typeof handlerForFirstMessage.shouldSkipFirstMessageForDeity === 'function') {
                    shouldSkipFirstMessageForDeity = handlerForFirstMessage.shouldSkipFirstMessageForDeity(historyData);
                }
                
                // 【改善】バックエンドの判定結果（visitPattern）を使用（判定ロジックの一元化）
                const visitPattern = historyData?.visitPattern || (historyData?.hasHistory ? 'returning' : 'first_visit');
                
                if (!shouldSkipFirstMessageForDeity) {
                    // バックエンドの判定結果に基づいて処理を分岐
                    switch (visitPattern) {
                        case 'continuing':
                            // 【再訪問時（履歴なし）】継続セッションとして処理
                            console.log('[初期化] 再訪問ユーザー（履歴なし）。継続セッションとしてAPIから動的メッセージを生成します');
                            
                            try {
                                console.log(`[初期化] ${info.name}の再訪問時（履歴なし）：APIから返答を生成します`, {
                                    character,
                                    userNickname: historyData.nickname || ChatData.userNickname || 'あなた',
                                    visitPattern: 'continuing'
                                });
                                
                                // 継続セッションとして「前回の会話の継続」という返答をAPIから取得
                                const response = await ChatAPI.sendMessage(
                                    '前回の会話の続きです',
                                    character,
                                    [], // 会話履歴は空（データベースに履歴がないため）
                                    {}
                                );
                                
                                if (response && response.message) {
                                    if (window.ChatUI) {
                                        window.ChatUI.addMessage('welcome', response.message, info.name);
                                    }
                                    console.log(`[初期化] ${info.name}の再訪問時（履歴なし）：APIから返答を取得しました`);
                                    return true;
                                } else {
                                    console.warn(`[初期化] ${info.name}の再訪問時（履歴なし）：APIから返答を取得できませんでした`);
                                    // APIから返答を取得できなかった場合は、フォールバックとして定型文を試行
                                    const initialMessage = ChatData.generateInitialMessage(character, historyData);
                                    if (initialMessage && initialMessage.trim()) {
                                        if (window.ChatUI) {
                                window.ChatUI.addMessage('welcome', initialMessage, info.name);
                            }
                                    }
                                    return true;
                                }
                            } catch (error) {
                                console.error(`[初期化] ${info.name}の再訪問時（履歴なし）：API呼び出しエラー:`, error);
                                // エラーの場合は、フォールバックとして定型文を試行
                                const initialMessage = ChatData.generateInitialMessage(character, historyData);
                                if (initialMessage && initialMessage.trim()) {
                                    if (window.ChatUI) {
                                window.ChatUI.addMessage('welcome', initialMessage, info.name);
                            }
                                }
                                return true;
                            }
                        
                        case 'first_visit':
                            // 【初回訪問時】非同期メッセージ生成方式
                            console.log('[初期化] 初回ユーザー。非同期メッセージ生成方式を使用します');
                            
                            // 【重要】待機画面が表示されている場合は「考え中...」メッセージを表示しない
                            // 待機画面が表示されているため、追加の「考え中...」メッセージは不要
                            const waitingOverlayFirst = document.getElementById('waitingOverlay');
                            const isWaitingOverlayVisible = waitingOverlayFirst && !waitingOverlayFirst.classList.contains('hidden');
                            
                            // 「考え中...」を表示（待機画面が表示されていない場合のみ）
                            let thinkingElementFirst = null;
                            if (!isWaitingOverlayVisible && window.ChatUI && typeof window.ChatUI.addThinkingMessage === 'function') {
                                thinkingElementFirst = window.ChatUI.addThinkingMessage(info.name);
                            }
                            
                            // バックグラウンドで動的メッセージを生成（非同期）
                            const generateFirstMessageAsync = async () => {
                                try {
                                    const visitPattern = 'first_visit';
                                    const conversationHistory = [];
                                    
                                    console.log(`[初期化] ${info.name}の初回訪問時：バックグラウンドで動的メッセージを生成します`, {
                                        character,
                                        visitPattern
                                    });
                                    
                                    const welcomeMessage = await ChatAPI.generateWelcomeMessage({
                                        character,
                                        conversationHistory,
                                        visitPattern
                                    });
                                    
                                    console.log(`[初期化] ${info.name}の初回訪問時：動的メッセージ生成完了`);
                                    
                                    // 待機画面を非表示（メッセージ表示前に実行）
                                    if (waitingOverlayFirst) {
                                        waitingOverlayFirst.classList.add('hidden');
                                        console.log('[初期化] 待機画面を非表示にしました（初回訪問時のメッセージ生成完了）');
                                    }
                                    
                                    // 「考え中...」を動的メッセージに置き換え
                                    if (thinkingElementFirst && window.ChatUI && typeof window.ChatUI.replaceThinkingMessage === 'function') {
                                        window.ChatUI.replaceThinkingMessage(thinkingElementFirst, welcomeMessage);
                                    } else if (window.ChatUI) {
                                        // replaceThinkingMessageが使えない場合は、考え中要素を削除して新しく追加
                                        if (thinkingElementFirst && thinkingElementFirst.parentNode) {
                                            thinkingElementFirst.parentNode.removeChild(thinkingElementFirst);
                                        }
                                        window.ChatUI.addMessage('welcome', welcomeMessage, info.name);
                                    }
                                } catch (error) {
                                    console.error(`[初期化] ${info.name}の初回訪問時：動的メッセージ生成エラー:`, error);
                                    
                                    // 待機画面を非表示（エラー時も）
                                    if (waitingOverlayFirst) {
                                        waitingOverlayFirst.classList.add('hidden');
                                        console.log('[初期化] 待機画面を非表示にしました（初回訪問時のエラー時）');
                                    }
                                    
                                    // エラー時はフォールバック（定型文）
                                    const hasOtherCharacterHistory = historyData?.hasOtherCharacterHistory || false;
                                    const fallbackMessage = ChatData.generateFirstTimeMessage(
                                        character, 
                                        ChatData.userNickname || 'あなた',
                                        false,
                                        hasOtherCharacterHistory
                                    );
                                    if (thinkingElementFirst && window.ChatUI && typeof window.ChatUI.replaceThinkingMessage === 'function') {
                                        window.ChatUI.replaceThinkingMessage(thinkingElementFirst, fallbackMessage || 'ようこそ、いらっしゃいませ。');
                                    } else if (window.ChatUI) {
                                        if (thinkingElementFirst && thinkingElementFirst.parentNode) {
                                            thinkingElementFirst.parentNode.removeChild(thinkingElementFirst);
                                        }
                                        window.ChatUI.addMessage('welcome', fallbackMessage || 'ようこそ、いらっしゃいませ。', info.name);
                                    }
                                }
                            };
                            
                            // 【重要】初回訪問時のメッセージ生成が完了するまで待つ
                            // これにより、initPage()の最終チェックが実行される前にメッセージが表示される
                            try {
                                await generateFirstMessageAsync();
                                console.log('[初期化] 初回訪問時のメッセージ生成が完了しました');
                            } catch (error) {
                                console.error(`[初期化] ${info.name}の初回訪問時：generateFirstMessageAsyncエラー:`, error);
                                
                                // 待機画面を非表示（エラー時も）
                                const waitingOverlayErrorFirst = document.getElementById('waitingOverlay');
                                if (waitingOverlayErrorFirst) {
                                    waitingOverlayErrorFirst.classList.add('hidden');
                                    console.log('[初期化] 待機画面を非表示にしました（generateFirstMessageAsyncエラー時）');
                                }
                                
                                // エラー時はフォールバックメッセージを表示
                                if (window.ChatUI) {
                                    const fallbackMessage = ChatData.generateFirstTimeMessage(character, ChatData.userNickname || 'あなた', false, false) || 'ようこそ、いらっしゃいませ。';
                                    if (thinkingElementFirst && thinkingElementFirst.parentNode) {
                                        thinkingElementFirst.parentNode.removeChild(thinkingElementFirst);
                                    }
                                    window.ChatUI.addMessage('welcome', fallbackMessage, info.name);
                                }
                            }
                            
                            return true;
                        
                        default:
                            // その他のパターン（returningなど）は既に処理済み
                            console.log(`[初期化] visitPattern: ${visitPattern} は既に処理済みです`);
                            break;
                    }
                } else if (handlerForFirstMessage && typeof handlerForFirstMessage.getGuardianConfirmationMessage === 'function' && !guardianMessageShown && !handlerSkippedFirstMessage) {
                    // 【スケーラビリティ改善】守護神確認メッセージの取得をハンドラーに委譲
                    const userNickname = historyData.nickname || ChatData.userNickname || 'あなた';
                    
                    // 【楓専用処理】楓の場合は、APIが守護神情報を確認して返答を生成する
                    if (character === 'kaede' && historyData && historyData.assignedDeity) {
                        try {
                            console.log('[初期化] 楓の再訪問時（履歴なし）：APIから返答を生成します', {
                                hasHistory: false,
                                assignedDeity: historyData.assignedDeity,
                                userNickname
                            });
                            
                            // 守護神情報を使用してAPIから返答を生成
                            const response = await ChatAPI.sendMessage(
                                '再訪問しました',
                                character,
                                [], // 会話履歴は空
                                {}
                            );
                            
                            if (response && response.message) {
                                if (window.ChatUI) {
                                    window.ChatUI.addMessage('welcome', response.message, info.name);
                                }
                                console.log('[初期化] 楓の再訪問時（履歴なし）：APIから返答を取得しました');
                                return true;
                            } else {
                                console.warn('[初期化] 楓の再訪問時（履歴なし）：APIから返答を取得できませんでした。ハンドラーのメッセージを使用します');
                                // APIから返答を取得できなかった場合は、ハンドラーのメッセージを使用
                                const guardianConfirmationMessage = handlerForFirstMessage.getGuardianConfirmationMessage(historyData, userNickname);
                                if (guardianConfirmationMessage) {
                                    console.log('[初期化] 守護神が既に決定されているため、守護神確認メッセージを表示します');
                                    if (window.ChatUI) {
                                        window.ChatUI.addMessage('welcome', guardianConfirmationMessage, info.name);
                                    }
                                    return true;
                                }
                            }
                        } catch (error) {
                            console.error('[初期化] 楓の再訪問時（履歴なし）：API呼び出しエラー:', error);
                            // エラーの場合は、ハンドラーのメッセージを使用
                            const guardianConfirmationMessage = handlerForFirstMessage.getGuardianConfirmationMessage(historyData, userNickname);
                            if (guardianConfirmationMessage) {
                                console.log('[初期化] 守護神が既に決定されているため、守護神確認メッセージを表示します');
                                if (window.ChatUI) {
                                window.ChatUI.addMessage('welcome', guardianConfirmationMessage, info.name);
                            }
                                return true;
                            }
                        }
                    } else {
                        // 楓以外のキャラクターまたは守護神が決定されていない場合は、ハンドラーのメッセージを使用
                        // 【重要】守護神確認メッセージは楓（kaede）専用の機能であるため、他のキャラクターでは表示しない
                        if (character === 'kaede') {
                            const guardianConfirmationMessage = handlerForFirstMessage.getGuardianConfirmationMessage(historyData, userNickname);
                            if (guardianConfirmationMessage) {
                                console.log('[初期化] 守護神が既に決定されているため、守護神確認メッセージを表示します（楓専用）');
                                if (window.ChatUI) {
                                    window.ChatUI.addMessage('welcome', guardianConfirmationMessage, info.name);
                                }
                                return true;
                            }
                        }
                        // 楓以外のキャラクターの場合は、守護神確認メッセージを表示しない
                    }
                }
                
                return false;
            };
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:220',message:'loadConversationHistory呼び出し後',data:{character,hasHistoryData:!!historyData,hasHistory:historyData?.hasHistory,hasNickname:!!historyData?.nickname,nickname:historyData?.nickname,recentMessagesLength:historyData?.recentMessages?.length||0},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // }
            // #endregion
            console.log('[初期化] historyData取得結果:', {
                hasHistoryData: !!historyData,
                hasHistory: historyData?.hasHistory,
                hasNickname: !!historyData?.nickname,
                nickname: historyData?.nickname
            });
            
            // ユーザー情報を設定（historyDataから）
            if (historyData && historyData.nickname) {
                ChatData.userNickname = historyData.nickname;
            }
            
            // 会話履歴を取得（historyDataから）
            let conversationHistory = [];
            if (historyData && historyData.recentMessages) {
                conversationHistory = historyData.recentMessages;
            }
            
            // 【スケーラビリティ改善】新規会話時のフラグクリアをハンドラーに委譲
            // 注意: tempCardInfoはこのコードブロック内で定義されていない可能性があるため、
            // ハンドラー内でsessionStorageから直接取得して処理する
            const handlerForClearFlags = CharacterRegistry.get(character);
            if (handlerForClearFlags && typeof handlerForClearFlags.clearFlagsOnNewConversation === 'function') {
                handlerForClearFlags.clearFlagsOnNewConversation(conversationHistory, null);
            }
            
            // 【変更】会話履歴は表示しない
            // 鑑定士の挨拶メッセージで過去の会話を記憶していることを示すため、履歴表示は不要
            // 常に最初のチャットから始まり、鑑定士が挨拶で過去の会話を参照する
            console.log('[初期化] 会話履歴は表示しません（鑑定士の挨拶で過去の会話を記憶していることを示します）');
            
            // 雪乃の個別相談モード開始直後の定型文を表示（現在は使用されていない）
            if (false && character === 'yukino') {
                const consultationStarted = sessionStorage.getItem('yukinoConsultationStarted') === 'true';
                const messageCount = parseInt(sessionStorage.getItem('yukinoConsultationMessageCount') || '0', 10);
                
                if (consultationStarted && messageCount === 0) {
                    console.log('[初期化] 雪乃の個別相談モード開始：定型文を表示');
                    const info = ChatData.characterInfo[character];
                    const welcomeMessage = 'あなたの運勢はタロットカードによって導かれました。これから先はあなたが私に相談したいことがあれば語りかけてください。どんな相談でもお答えいたします。';
                    if (window.ChatUI) {
                        window.ChatUI.addMessage('character', welcomeMessage, info.name);
                    }
                    
                    // メッセージ入力欄を有効化
                    if (window.ChatUI.messageInput) {
                        window.ChatUI.messageInput.disabled = false;
                        window.ChatUI.messageInput.placeholder = 'メッセージを入力...';
                    }
                    if (window.ChatUI.sendButton) {
                        window.ChatUI.sendButton.disabled = false;
                    }
                    
                    console.log('[初期化] 個別相談モード：メッセージ入力を有効化しました');
                    // 初回メッセージ表示をスキップするため、ここで処理を終了
                    return;
                }
            }
            
            // 初回メッセージを表示
            // ただし、守護神の儀式完了直後（guardianMessageShown）の場合は、既に守護神確認メッセージを表示済みなのでスキップ
            // ※guardianMessageShownは上で既に定義済み
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:277',message:'初回メッセージ表示判定開始',data:{hasHistoryData:!!historyData,hasHistory:historyData?.hasHistory,hasNickname:!!historyData?.nickname,guardianMessageShown,character},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // }
            // #endregion
            
            if (historyData && historyData.hasHistory) {
                // #region agent log (開発環境のみ - コメントアウト)
                // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:477',message:'historyData.hasHistory=trueブロック開始',data:{character,hasHistory:historyData.hasHistory,recentMessagesLength:historyData.recentMessages?.length||0,guardianMessageShown,handlerSkippedFirstMessage:false},timestamp:Date.now(),runId:'debug-run',hypothesisId:'A'})}).catch(()=>{});
                // }
                // #endregion
                ChatData.conversationHistory = historyData;
                ChatData.userNickname = historyData.nickname || ChatData.userNickname;
                
                // 守護神確認メッセージがpendingGuardianMessageに保存されている場合、会話履歴に追加
                const pendingGuardianMessage = sessionStorage.getItem('pendingGuardianMessage');
                if (pendingGuardianMessage && ChatData.conversationHistory && ChatData.conversationHistory.recentMessages) {
                    // 既に会話履歴に守護神確認メッセージが含まれているかチェック
                    const hasGuardianMessage = ChatData.conversationHistory.recentMessages.some(msg => 
                        msg.role === 'assistant' && msg.content && msg.content.includes('の守護神は')
                    );
                    
                    if (!hasGuardianMessage) {
                        ChatData.conversationHistory.recentMessages.push({
                            role: 'assistant',
                            content: pendingGuardianMessage
                        });
                        console.log('[会話履歴読み込み] 守護神確認メッセージを会話履歴に追加しました');
                    }
                    sessionStorage.removeItem('pendingGuardianMessage');
                }
                
                // 守護神の儀式が完了している場合、会話履歴に守護神確認メッセージが含まれているか確認
                // 含まれていない場合は追加（APIが儀式完了を認識できるように）
                // 【重要】ritualCompletedフラグまたはassignedDeityが存在する場合、守護神の儀式は既に完了している
                // 【重要】guardianMessageShownがtrueの場合は、楓専用の定型文が既に表示されているためスキップ
                // 【重要】守護神の儀式は楓（kaede）専用の機能であるため、楓以外のキャラクターでは処理しない
                const ritualCompleted = sessionStorage.getItem('ritualCompleted');
                // 【変更】assignedDeityをhistoryDataから取得（データベースベースの判断）
                const assignedDeity = (historyData && historyData.assignedDeity) || null;
                const guardianMessageShownCheck = sessionStorage.getItem('guardianMessageShown') === 'true';
                
                // 楓（kaede）専用の処理：守護神確認メッセージを会話履歴に追加
                if (character === 'kaede' && (ritualCompleted === 'true' || assignedDeity) && !guardianMessageShownCheck && ChatData.conversationHistory && ChatData.conversationHistory.recentMessages) {
                    const hasGuardianMessage = ChatData.conversationHistory.recentMessages.some(msg => 
                        msg.role === 'assistant' && msg.content && msg.content.includes('の守護神は')
                    );
                    
                    if (!hasGuardianMessage && assignedDeity) {
                        // 【変更】userNicknameをhistoryDataから取得（データベースベースの判断）
                        const userNickname = (historyData && historyData.nickname) || ChatData.userNickname || 'あなた';
                        // 守護神名（データベースに日本語で保存されているのでそのまま使用）
                        const guardianName = assignedDeity;
                        const guardianConfirmationMessage = `${userNickname}の守護神は${guardianName}です\nこれからは、私と守護神である${guardianName}が鑑定を進めていきます。\n${userNickname}が鑑定してほしいこと、再度、伝えていただけませんでしょうか。`;
                        
                        ChatData.conversationHistory.recentMessages.push({
                            role: 'assistant',
                            content: guardianConfirmationMessage
                        });
                        console.log('[会話履歴読み込み] 守護神確認メッセージを会話履歴に追加しました（ritualCompleted/assignedDeityチェック、楓専用）');
                    }
                }
                
                // ユーザーデータを更新（historyDataから生年月日を取得して表示）
                window.ChatUI.updateUserStatus(true, {
                    nickname: historyData.nickname || '鑑定者',
                    birthYear: historyData.birthYear || null,
                    birthMonth: historyData.birthMonth || null,
                    birthDay: historyData.birthDay || null,
                    assignedDeity: historyData.assignedDeity || '未割当'
                });
                
                // 登録済みユーザーの特殊処理（ハンドラーに委譲）
                // 例: 楓の守護神判定などはハンドラーのinitPageで処理される
                
                // ハンドラーのinitPageを呼び出す（通常の初期化フロー）
                const handler = CharacterRegistry.get(character);
                let handlerSkippedFirstMessage = false;
                if (handler && typeof handler.initPage === 'function') {
                    markInitPageTiming('handler.initPage呼び出し直前');
                    const handlerResult = await handler.initPage(urlParams, historyData, justRegistered, shouldTriggerRegistrationFlow, {
                        guardianMessageShown
                    });
                    markInitPageTiming('handler.initPage完了');
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:2409',message:'handler.initPage完了',data:{completed:handlerResult?.completed,skip:handlerResult?.skip},timestamp:Date.now(),sessionId:'debug-session',runId:'perf1',hypothesisId:'perfA'})}).catch(()=>{});
                    // #endregion
                    if (handlerResult && handlerResult.completed) {
                        console.log('[初期化] ハンドラーで処理完了。処理を終了します。');
                        // 【修正】ハンドラーで処理完了する前に待機画面を非表示にする
                        if (typeof window.hideLoadingScreen === 'function') {
                            window.hideLoadingScreen();
                            console.log('[初期化] 待機画面を非表示にしました（ハンドラー処理完了時）');
                        }
                        return; // 処理終了
                    }
                    if (handlerResult && handlerResult.skip) {
                        console.log('[初期化] ハンドラーで処理スキップ。共通処理をスキップします。');
                        handlerSkippedFirstMessage = true; // 初回メッセージの表示はスキップ（ハンドラーで処理済み）
                    }
                }
                
                // 【統一化】共通の初回メッセージ表示ロジックを使用
                try {
                    await showInitialMessage({ handlerSkippedFirstMessage });
                } catch (error) {
                    console.error('[初期化] showInitialMessageエラー（hasHistory=true）:', error);
                    // エラー時はフォールバックメッセージを表示
                    const info = ChatData.characterInfo[character];
                    if (info && window.ChatUI && !handlerSkippedFirstMessage) {
                        const fallbackMessage = ChatData.generateInitialMessage(character, historyData) || 
                                                 ChatData.generateFirstTimeMessage(character, ChatData.userNickname || 'あなた', false, false);
                        window.ChatUI.addMessage('welcome', fallbackMessage, info.name);
                    }
                }
            } else if (historyData && historyData.nickname) {
                // #region agent log (開発環境のみ - コメントアウト)
                // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:398',message:'分岐2: historyData.nickname存在',data:{character,hasHistoryData:!!historyData,hasHistory:historyData?.hasHistory,hasNickname:!!historyData?.nickname},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // }
                // #endregion
                // 【重要】hasHistoryがfalseでも、nicknameが存在する場合は登録済みユーザーとして扱う
                // ChatData.conversationHistoryを設定（データベースから読み込んだ情報を保存）
                ChatData.conversationHistory = historyData;
                ChatData.userNickname = historyData.nickname;
                
                // ユーザーデータを更新（historyDataから生年月日を取得して表示）
                window.ChatUI.updateUserStatus(true, {
                    nickname: historyData.nickname || '鑑定者',
                    birthYear: historyData.birthYear || null,
                    birthMonth: historyData.birthMonth || null,
                    birthDay: historyData.birthDay || null,
                    assignedDeity: historyData.assignedDeity || '未割当'
                });
                
                // ハンドラーのinitPageを呼び出す（通常の初期化フロー）
                // ハンドラーが読み込まれるのを待つ（最大5秒）
                let handler = CharacterRegistry.get(character);
                let attempts = 0;
                const maxAttempts = 50; // 5秒間待機（100ms × 50）
                while (!handler && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    handler = CharacterRegistry.get(character);
                    attempts++;
                }
                
                console.log('[初期化] ハンドラー取得結果:', {
                    character,
                    hasHandler: !!handler,
                    hasInitPage: handler && typeof handler.initPage === 'function',
                    handlerType: handler ? typeof handler : 'null',
                    attempts: attempts
                });
                let handlerSkippedFirstMessage = false;
                if (handler && typeof handler.initPage === 'function') {
                    console.log('[初期化] ハンドラーのinitPageを呼び出します:', character);
                    const handlerResult = await handler.initPage(urlParams, historyData, justRegistered, shouldTriggerRegistrationFlow, {
                        guardianMessageShown
                    });
                    console.log('[初期化] ハンドラーのinitPage呼び出し完了:', {
                        character,
                        result: handlerResult
                    });
                    if (handlerResult && handlerResult.completed) {
                        console.log('[初期化] ハンドラーで処理完了。処理を終了します。');
                        return; // 処理終了
                    }
                    if (handlerResult && handlerResult.skip) {
                        console.log('[初期化] ハンドラーで処理スキップ。共通処理をスキップします。');
                        handlerSkippedFirstMessage = true; // 初回メッセージの表示はスキップ（ハンドラーで処理済み）
                    }
                } else if (!handler) {
                    console.warn('[初期化] ハンドラーが読み込まれていません。後で再試行します。');
                    // ハンドラーが読み込まれた後に、もう一度initPageを呼び出すために、カスタムイベントを発火
                    // ただし、これは暫定的な解決策です。本来は、ハンドラーが読み込まれるのを待つべきです。
                }
                
                // 【統一化】共通の初回メッセージ表示ロジックを使用
                try {
                    await showInitialMessage({ handlerSkippedFirstMessage });
                } catch (error) {
                    console.error('[初期化] showInitialMessageエラー（nickname存在、hasHistory=false）:', error);
                    // エラー時はフォールバックメッセージを表示
                    const info = ChatData.characterInfo[character];
                    if (info && window.ChatUI && !handlerSkippedFirstMessage) {
                        const fallbackMessage = ChatData.generateInitialMessage(character, historyData) || 
                                                 ChatData.generateFirstTimeMessage(character, ChatData.userNickname || 'あなた', false, false);
                        window.ChatUI.addMessage('welcome', fallbackMessage, info.name);
                    }
                }
            } else {
                // #region agent log (開発環境のみ - コメントアウト)
                // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:415',message:'分岐3: historyDataなしまたはnicknameなし',data:{character,hasHistoryData:!!historyData,hasHistory:historyData?.hasHistory,hasNickname:!!historyData?.nickname},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // }
                // #endregion
                
                // 【変更】登録済みユーザーの場合でも、historyDataがない場合は表示しない
                // （データベースベースの判断のため、localStorageは使用しない）
                // historyDataが存在する場合は、上記の分岐で既に処理されている
                if (historyData && historyData.nickname) {
                    // 【重要】hasHistoryがfalseでも、nicknameが存在する場合は登録済みユーザーとして扱う
                    // ChatData.conversationHistoryを設定（データベースから読み込んだ情報を保存）
                    ChatData.conversationHistory = historyData;
                    ChatData.userNickname = historyData.nickname;
                    
                    window.ChatUI.updateUserStatus(true, {
                        nickname: historyData.nickname || '鑑定者',
                        birthYear: historyData.birthYear || null,
                        birthMonth: historyData.birthMonth || null,
                        birthDay: historyData.birthDay || null,
                        assignedDeity: historyData.assignedDeity || '未割当'
                    });
                }
                
                // ハンドラーのinitPageを呼び出す（通常の初期化フロー）
                // ハンドラーが読み込まれるのを待つ（最大5秒）
                let handler = CharacterRegistry.get(character);
                let attempts = 0;
                const maxAttempts = 50; // 5秒間待機（100ms × 50）
                while (!handler && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    handler = CharacterRegistry.get(character);
                    attempts++;
                }
                
                let handlerSkippedFirstMessage = false;
                if (handler && typeof handler.initPage === 'function') {
                    console.log('[初期化] ハンドラーのinitPageを呼び出します（historyDataなし）:', character);
                    // historyDataが取得できなかった場合でも、ハンドラーにnullを渡して処理を委譲
                    const handlerResult = await handler.initPage(urlParams, historyData, justRegistered, shouldTriggerRegistrationFlow, {
                        guardianMessageShown
                    });
                    console.log('[初期化] ハンドラーのinitPage呼び出し完了（historyDataなし）:', {
                        character,
                        result: handlerResult
                    });
                    if (handlerResult && handlerResult.completed) {
                        console.log('[初期化] ハンドラーで処理完了。処理を終了します。');
                        return; // 処理終了
                    }
                    if (handlerResult && handlerResult.skip) {
                        console.log('[初期化] ハンドラーで処理スキップ。共通処理をスキップします。');
                        handlerSkippedFirstMessage = true; // 初回メッセージの表示はスキップ（ハンドラーで処理済み）
                    }
                } else if (!handler) {
                    console.warn('[初期化] ハンドラーが読み込まれていません（historyDataなし）。後で再試行します。');
                }
                
                // 【統一化】共通の初回メッセージ表示ロジックを使用
                try {
                    await showInitialMessage({ handlerSkippedFirstMessage });
                } catch (error) {
                    console.error('[初期化] showInitialMessageエラー（historyDataなし）:', error);
                    // エラー時はフォールバックメッセージを表示
                    const info = ChatData.characterInfo[character];
                    if (info && window.ChatUI && !handlerSkippedFirstMessage) {
                        const fallbackMessage = ChatData.generateFirstTimeMessage(character, ChatData.userNickname || 'あなた', false, false);
                        window.ChatUI.addMessage('welcome', fallbackMessage, info.name);
                    }
                }
            }
            
            // メッセージが表示されていない場合の最終チェック
            // すべての分岐でメッセージが表示されなかった場合、最低限のメッセージを表示
            // 【重要】再訪問時の処理はawaitにより完了しているため、ここでチェックしても問題ない
            if (window.ChatUI && window.ChatUI.messagesDiv) {
                const hasMessages = window.ChatUI.messagesDiv.children.length > 0;
                if (!hasMessages) {
                    console.warn('[初期化] メッセージが表示されていません。フォールバックメッセージを表示します。');
                    const info = ChatData.characterInfo[character];
                    if (info) {
                        const fallbackMessage = ChatData.generateFirstTimeMessage(character, ChatData.userNickname || 'あなた', false, false);
                        window.ChatUI.addMessage('welcome', fallbackMessage, info.name);
                    }
                }
            }
            
            // 守護神確認メッセージを表示した場合は、フラグをクリア
            if (guardianMessageShown) {
                sessionStorage.removeItem('guardianMessageShown');
                sessionStorage.removeItem('ritualCompleted');
            }
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:820',message:'initPage関数終了（正常終了）',data:{character},timestamp:Date.now(),runId:'debug-run',hypothesisId:'B'})}).catch(()=>{});
            // }
            // #endregion
            
            // 【追加】すべての初期化が完了したら待機画面を非表示
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:2504',message:'initPage完了: hideLoadingScreen呼び出し前',data:{hasHideLoadingScreen:typeof window.hideLoadingScreen === 'function',character},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            if (typeof window.hideLoadingScreen === 'function') {
                window.hideLoadingScreen();
                console.log('[初期化] 初期化完了、待機画面を非表示にしました');
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:2507',message:'initPage完了: hideLoadingScreen呼び出し後',data:{character},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
            } else {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:2510',message:'initPage完了: hideLoadingScreen関数が存在しない',data:{character},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                console.error('[初期化] hideLoadingScreen関数が存在しません');
            }
            
            // MutationObserverを設定して、#messagesコンテナに新しい要素が追加されたら自動スクロール
            const messagesDiv = document.getElementById('messages');
            if (messagesDiv && typeof MutationObserver !== 'undefined') {
                const scrollObserver = new MutationObserver((mutations) => {
                    let shouldScroll = false;
                    for (const mutation of mutations) {
                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            shouldScroll = true;
                            break;
                        }
                    }
                    if (shouldScroll) {
                        // 少し遅延させてからスクロール（DOM更新を待つ）
                        setTimeout(() => {
                            if (window.scrollToBottom) {
                                window.scrollToBottom();
                            }
                        }, 100);
                    }
                });
                
                scrollObserver.observe(messagesDiv, {
                    childList: true,
                    subtree: true
                });
                
                console.log('[初期化] MutationObserverを設定しました（自動スクロール監視）');
            }
            
            this._initPageRunning = false;
            this._initPageCompleted = true;
        } catch (error) {
            // エラーが発生した場合、character変数がまだ定義されていない可能性があるため、
            // URLパラメータまたはChatData.currentCharacterから取得
            // グローバルスコープのurlParamsを使用
            if (!window._chatUrlParams) {
                window._chatUrlParams = new URLSearchParams(window.location.search);
            }
            const urlParams = window._chatUrlParams;
            let character = ChatData?.currentCharacter || urlParams.get('character') || 'kaede';
            
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:825',message:'initPage関数エラー',data:{character,errorMessage:error?.message,errorStack:error?.stack?.split('\n').slice(0,5).join(' | ')},timestamp:Date.now(),runId:'debug-run',hypothesisId:'B'})}).catch(()=>{});
            // }
            // #endregion
            
            // 【追加】エラー時も待機画面を非表示
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:2553',message:'initPageエラー: hideLoadingScreen呼び出し前',data:{hasHideLoadingScreen:typeof window.hideLoadingScreen === 'function',errorMessage:error?.message,character},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            if (typeof window.hideLoadingScreen === 'function') {
                window.hideLoadingScreen();
                console.log('[初期化] エラー発生、待機画面を非表示にしました');
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:2556',message:'initPageエラー: hideLoadingScreen呼び出し後',data:{errorMessage:error?.message,character},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
            } else {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:2559',message:'initPageエラー: hideLoadingScreen関数が存在しない',data:{errorMessage:error?.message,character},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                console.error('[初期化] エラー発生、hideLoadingScreen関数が存在しません');
            }
            
            this._initPageRunning = false;
            this._initPageCompleted = true;
            console.error('Error loading conversation history:', error);
            const info = ChatData.characterInfo[character];
            
            // 守護神の儀式完了直後のフラグを事前にチェック
            const guardianMessageShown = sessionStorage.getItem('guardianMessageShown') === 'true';
            
            // エラー時はハンドラーのinitPageを呼び出す
            const handler = CharacterRegistry.get(character);
            let handlerSkippedFirstMessage = false;
            if (handler && typeof handler.initPage === 'function') {
                // エラー分岐でもハンドラーに処理を委譲
                const handlerResult = await handler.initPage(urlParams, null, justRegistered, shouldTriggerRegistrationFlow, {
                    guardianMessageShown
                });
                if (handlerResult && handlerResult.completed) {
                    console.log('[初期化] ハンドラーで処理完了（エラー分岐）。処理を終了します。');
                    return; // 処理終了
                }
                if (handlerResult && handlerResult.skip) {
                    console.log('[初期化] ハンドラーで処理スキップ（エラー分岐）。共通処理をスキップします。');
                    handlerSkippedFirstMessage = true; // 初回メッセージの表示はスキップ（ハンドラーで処理済み）
                }
            }
            
            // 【統一化】共通の初回メッセージ表示ロジックを使用
            // エラー時はhistoryDataがnullの可能性があるため、エラー時の初期メッセージ表示は簡素化
            if (!handlerSkippedFirstMessage && window.ChatUI) {
                const info = ChatData.characterInfo[character];
                if (info) {
                    // エラー時は簡単なメッセージを表示
                    const errorMessage = `ようこそ、${info.name}です。何かお困りのことがあれば、お気軽にお話しください。`;
                    window.ChatUI.addMessage('welcome', errorMessage, info.name);
                }
            }
        }

        // イベントリスナーは window.addEventListener('load', ...) で設定されるため、ここでは設定しない
        // （重複登録を防ぐため。loadイベントでcloneNodeを使って確実に1回だけ登録される）
        
        // 待機画面を非表示にする（通常の初期化フロー）
        // 再訪問時は、showInitialMessage内で待機画面を管理するため、ここでは非表示にしない
        // 初回訪問時のみ非表示にする
        // 【重要】historyDataはtryブロック内で定義されているため、ここではChatData.conversationHistoryを使用
        const waitingOverlayFinal = document.getElementById('waitingOverlay');
        const finalHistoryData = ChatData.conversationHistory || null;
        if (waitingOverlayFinal && (!finalHistoryData || !finalHistoryData.hasHistory)) {
            // 初回訪問時：メッセージが表示された後に待機画面を非表示にする
            // メッセージが表示されているか確認
            if (window.ChatUI && window.ChatUI.messagesDiv) {
                const hasMessages = window.ChatUI.messagesDiv.children.length > 0;
                if (hasMessages) {
                    // メッセージが表示されている場合、待機画面を非表示にする
                    waitingOverlayFinal.classList.add('hidden');
                    console.log('[初期化] 待機画面を非表示にしました（初回訪問時、メッセージ表示後）');
                } else {
                    // メッセージが表示されていない場合、少し待ってから再確認
                    setTimeout(() => {
                        const hasMessagesAfterWait = window.ChatUI && window.ChatUI.messagesDiv && window.ChatUI.messagesDiv.children.length > 0;
                        if (hasMessagesAfterWait && waitingOverlayFinal) {
                            waitingOverlayFinal.classList.add('hidden');
                            console.log('[初期化] 待機画面を非表示にしました（初回訪問時、メッセージ表示後・遅延確認）');
                        }
                    }, 500);
                }
            } else {
                // ChatUIが利用できない場合、待機画面を非表示にする
                waitingOverlayFinal.classList.add('hidden');
                console.log('[初期化] 待機画面を非表示にしました（初回訪問時、ChatUI未利用）');
            }
        } else if (waitingOverlayFinal && finalHistoryData && finalHistoryData.hasHistory) {
            // 再訪問時は、showInitialMessage内で待機画面を管理するため、ここでは何もしない
            console.log('[初期化] 待機画面は再訪問時のメッセージ生成中に管理されます');
        }
        
        window.ChatUI.updateSendButtonVisibility();
    },


    /**
     * メッセージを送信
     * @param {boolean} skipUserMessage - ユーザーメッセージをスキップするか
     * @param {boolean} skipAnimation - アニメーションをスキップするか
     */
    async sendMessage(skipUserMessage = false, skipAnimation = false, messageOverride = null) {
        // メッセージ送信中フラグをチェック（重複送信防止）
        if (this._sendingMessage) {
            console.warn('[メッセージ送信] ⚠️ メッセージ送信が既に進行中です。重複送信をブロックします');
            return;
        }
        
        // メッセージ入力欄が無効化されている場合は送信をブロック
        if (window.ChatUI.messageInput && window.ChatUI.messageInput.disabled) {
            console.log('[メッセージ送信] メッセージ入力欄が無効化されているため、送信をブロックします');
            return;
        }
        
        // メッセージの取得：オーバーライドが指定されている場合はそれを使用、そうでなければ入力欄から取得
        const message = messageOverride || window.ChatUI.messageInput.value.trim();
        const character = ChatData.currentCharacter;

        if (!message) {
            return;
        }
        
        // 送信中フラグを設定
        this._sendingMessage = true;
        
        // 【デバッグ】sendMessageの呼び出しを追跡
        const callStack = new Error().stack;
        console.log('[メッセージ送信] sendMessage呼び出し:', {
            message: message.substring(0, 50),
            character,
            skipUserMessage,
            skipAnimation,
            callStack: callStack?.split('\n').slice(0, 5).join(' | ')
        });
        
        // エラー時にもフラグをリセットするためにtry-finallyを使用
        // waitingMessageIdを関数スコープで宣言（catchブロックからもアクセスできるように）
        let waitingMessageId = null;
        
        try {
            // タロットカード解説トリガーマーカーを検出
            const isTarotExplanationTrigger = message.includes('[TAROT_EXPLANATION_TRIGGER:');
            
            // メッセージ送信ボタンを押した時点で、即座にカウントを開始
            if (!isTarotExplanationTrigger) {
                // 個別相談モードのチェック（ハンドラーに委譲）
                const handler = CharacterRegistry.get(character);
                const isConsultationMode = handler && typeof handler.isConsultationMode === 'function' 
                    ? handler.isConsultationMode() 
                    : false;
                
                // メッセージ送信前：現在のカウントを取得（ハンドラーに委譲）
                let currentCount;
                if (isConsultationMode && handler && typeof handler.getConsultationMessageCount === 'function') {
                    currentCount = handler.getConsultationMessageCount();
                } else {
                    // 通常のメッセージカウントを使用
                    currentCount = ChatData.getUserMessageCount(character);
                }

                // 送信ボタンを押した時点で、会話履歴にメッセージを追加してカウントを更新
                // これにより、メッセージ数が確実に1からスタートし、以降は自動的に増える
                ChatData.addToConversationHistory(character, 'user', message);
                
                // 会話履歴が正しく保存されたことを確認
                const savedHistory = ChatData.getConversationHistory(character);
                console.log('[メッセージ送信] 会話履歴に追加後の確認:', {
                    character,
                    historyLength: savedHistory.length,
                    userMessages: savedHistory.filter(msg => msg && msg.role === 'user').length,
                    lastMessage: savedHistory.length > 0 ? savedHistory[savedHistory.length - 1] : null
                });
                
                // メッセージカウントを取得（ハンドラーに委譲）
                let messageCount;
                if (isConsultationMode && handler && typeof handler.incrementConsultationMessageCount === 'function') {
                    messageCount = handler.incrementConsultationMessageCount();
                } else {
                    // 通常のカウントを取得
                    messageCount = ChatData.getUserMessageCount(character);
                }
                
                const isFirstMessage = currentCount === 0;
                if (isFirstMessage) {
                    console.log('[メッセージ送信] 🎯 最初のメッセージを送信しました（カウント=1からスタート）:', {
                        character,
                        message: message.substring(0, 50) + '...',
                        messageCount: messageCount,
                        historyLength: savedHistory.length
                    });
                    
                    // 【スケーラビリティ改善】セッション最初のメッセージ記録をハンドラーに委譲
                    const handlerForFirstMessage2 = CharacterRegistry.get(character);
                    if (handlerForFirstMessage2 && typeof handlerForFirstMessage2.onFirstMessageInSession === 'function') {
                        handlerForFirstMessage2.onFirstMessageInSession(message, isTarotExplanationTrigger);
                    }
                } else {
                    console.log('[メッセージ送信] メッセージを送信しました:', {
                        character,
                        message: message.substring(0, 50) + '...',
                        beforeCount: currentCount,
                        afterCount: messageCount,
                        historyLength: savedHistory.length
                    });
                }
                
                // reading-animation.htmlでAPIリクエスト時にメッセージカウントを送信できるように、sessionStorageに保存
                // この時点で、会話履歴にメッセージが追加されていることを確認済み
                sessionStorage.setItem('lastGuestMessageCount', String(messageCount));
                console.log('[メッセージ送信] sessionStorageにメッセージカウントを保存:', {
                    key: 'lastGuestMessageCount',
                    value: messageCount,
                });
                
                // メッセージ送信直後に親ウィンドウに通知（分析パネル更新用）
                if (window.parent && window.parent !== window) {
                    try {
                        window.parent.postMessage({
                            type: 'CHAT_MESSAGE_SENT',
                            character: character,
                            messageCount: messageCount,
                            timestamp: Date.now()
                        }, '*');
                        console.log('[iframe] メッセージ送信を親ウィンドウに通知しました（送信時）', {
                            character,
                            messageCount
                        });
                    } catch (error) {
                        console.error('[iframe] メッセージ送信通知エラー:', error);
                    }
                }
                
                // 管理者モードの分析パネルを更新（自分自身のウィンドウ）
                if (typeof window.updateAdminAnalysisPanel === 'function') {
                    setTimeout(() => {
                        window.updateAdminAnalysisPanel();
                    }, 300);
                } else {
                    // カスタムイベントを発火
                    document.dispatchEvent(new CustomEvent('adminPanelUpdate'));
                }
                
                // 【削除】ゲストモードは廃止されたため、updateUserStatus(false)の呼び出しを削除
                // 登録済みユーザーのみなので、userDataがない場合は何も表示しない
            }

            // ユーザーメッセージの追加は、API応答を確認してから行う（楓の場合の条件分岐のため）
            // ただし、会話履歴には先に追加する必要がある（APIが認識できるように）
            const messageToSend = message;
            
            // 【重要】ユーザーメッセージを送信時点で即座に表示（ユーザーが送信を確認できるように）
            // タロットカード解説トリガーマーカーの場合は表示しない
            if (!skipUserMessage && !isTarotExplanationTrigger) {
                // 【デバッグ】既に同じメッセージが表示されているかチェック
                const existingUserMessages = window.ChatUI.messagesDiv.querySelectorAll('.message.user');
                const messageTexts = Array.from(existingUserMessages).map(msg => {
                    const textDiv = msg.querySelector('div:last-child');
                    return textDiv ? textDiv.textContent.trim() : '';
                });
                const messageExists = messageTexts.some(text => text.trim() === messageToSend.trim());
                
                if (messageExists) {
                    console.warn('[メッセージ送信] ⚠️ 既に同じユーザーメッセージが表示されています。重複追加をスキップします:', messageToSend.substring(0, 50));
                } else {
                    console.log('[メッセージ送信] ユーザーメッセージを画面に追加:', messageToSend.substring(0, 50));
                    window.ChatUI.addMessage('user', messageToSend, 'あなた');
                    await this.delay(100);
                    window.ChatUI.scrollToLatest();
                }
            }
            
            window.ChatUI.messageInput.value = '';
            window.ChatUI.updateSendButtonVisibility();
            // 注意：updateSendButtonVisibility()内でdisabledが設定されるため、ここでの設定は不要
            
            // タロットカード解説トリガーマーカーの場合は、sessionStorageに保存しない
            if (!skipUserMessage && !isTarotExplanationTrigger) {
                // メッセージカウントを取得：会話履歴からユーザーメッセージ数を計算
                const conversationHistory = ChatData.conversationHistory?.recentMessages || [];
                const messageCount = conversationHistory.filter(msg => msg && msg.role === 'user').length + 1; // 現在送信中のメッセージを含める
                
                const userMessageData = {
                    message: messageToSend,
                    character: character,
                    timestamp: new Date().toISOString(),
                    messageCount: messageCount // メッセージカウントも含める
                };
                sessionStorage.setItem('lastUserMessage', JSON.stringify(userMessageData));
            }
            
            // reading-animation.htmlへの遷移をスキップし、チャット画面で直接APIリクエストを送信
            // ハンドラーから待機画面のIDを取得（ハンドラーが独自の待機画面を表示する場合）
            // 注意: waitingMessageIdは関数の先頭（1305行目付近）で既に宣言済み
            let handler = CharacterRegistry.get(character);
            if (handler && typeof handler.beforeMessageSent === 'function') {
                const beforeResult = handler.beforeMessageSent(messageToSend);
                if (beforeResult && beforeResult.waitingMessageId) {
                    waitingMessageId = beforeResult.waitingMessageId;
                    console.log('[ChatEngine] ハンドラーから待機画面IDを取得:', waitingMessageId);
                }
            }
            
            // ハンドラーが待機画面を表示しない場合は、デフォルトのローディングメッセージを表示
            if (!waitingMessageId) {
                waitingMessageId = window.ChatUI.addMessage('loading', '考えています...', null);
            }
            
            // ハンドラーのonMessageSentを呼び出す
            if (handler && typeof handler.onMessageSent === 'function') {
                handler.onMessageSent(waitingMessageId);
            }
            
            // 会話履歴を取得（メッセージ送信前に追加されたメッセージを含む）
                let conversationHistory = ChatData.conversationHistory?.recentMessages || [];
                
                // 守護神の儀式完了後、会話履歴に守護神確認メッセージが含まれているか確認
                // 含まれていない場合は追加（APIが儀式完了を認識できるように）
                const ritualCompleted = sessionStorage.getItem('ritualCompleted');
                if (ritualCompleted === 'true') {
                    const hasGuardianMessage = conversationHistory.some(msg => 
                        msg.role === 'assistant' && msg.content && msg.content.includes('の守護神は')
                    );
                    
                    if (!hasGuardianMessage) {
                        // 守護神情報はhistoryDataから取得
                        const assignedDeity = (ChatData.conversationHistory && ChatData.conversationHistory.assignedDeity) || null;
                        const userNickname = ChatData.userNickname || 'あなた';
                        
                        if (assignedDeity) {
                            // 守護神名（データベースに日本語で保存されているのでそのまま使用）
                            const guardianName = assignedDeity;
                            const guardianConfirmationMessage = `${userNickname}の守護神は${guardianName}です\nこれからは、私と守護神である${guardianName}が鑑定を進めていきます。\n${userNickname}が鑑定してほしいこと、再度、伝えていただけませんでしょうか。`;
                            
                            conversationHistory.push({
                                role: 'assistant',
                                content: guardianConfirmationMessage
                            });
                            
                            // ChatData.conversationHistoryも更新
                            if (ChatData.conversationHistory) {
                                if (!ChatData.conversationHistory.recentMessages) {
                                    ChatData.conversationHistory.recentMessages = [];
                                }
                                ChatData.conversationHistory.recentMessages.push({
                                    role: 'assistant',
                                    content: guardianConfirmationMessage
                                });
                            }
                            
                            console.log('[メッセージ送信] 守護神確認メッセージを会話履歴に追加しました（API送信前）');
                        }
                    }
                }
                
                // メッセージカウントを取得：会話履歴からユーザーメッセージ数を計算（今回送信するメッセージは含まれていない）
                let messageCountForAPI = conversationHistory.filter(msg => msg && msg.role === 'user').length;
                
                // 個別相談モードのチェック（ハンドラーに委譲）
                // 注意: handlerは1458行目で既に取得済み
                const isConsultationMode = handler && typeof handler.isConsultationMode === 'function' 
                    ? handler.isConsultationMode() 
                    : false;
                
                if (isConsultationMode && handler && typeof handler.getConsultationMessageCount === 'function') {
                    // 個別相談モードの場合は、ハンドラーからカウントを取得
                    const currentCount = handler.getConsultationMessageCount();
                    messageCountForAPI = currentCount;
                    console.log('[個別相談] APIに送信するメッセージカウント:', {
                        鑑定士: character,
                        現在の個別相談カウント: currentCount,
                        APIに送信する値: messageCountForAPI,
                        API側で計算される最終値: messageCountForAPI + 1
                    });
                }
                
                // 雪乃の場合、そのセッションで最初のメッセージを記録（まとめ鑑定で使用）
                // セッション最初のメッセージを記録（ハンドラーに委譲）
                if (!isTarotExplanationTrigger) {
                    if (handler && typeof handler.recordFirstMessageInSession === 'function') {
                        handler.recordFirstMessageInSession(messageToSend);
                    }
                }
                
                // APIリクエストのオプション
                const options = {};
                
                // APIリクエストを送信
                const response = await ChatAPI.sendMessage(messageToSend, character, conversationHistory, options);
                
                // ハンドラーのonResponseReceivedを呼び出す（待機画面を非表示にする）
                const handlerForResponse = CharacterRegistry.get(character);
                if (handlerForResponse && typeof handlerForResponse.onResponseReceived === 'function') {
                    handlerForResponse.onResponseReceived(waitingMessageId);
                } else {
                    // ハンドラーが処理しない場合は、デフォルトのローディングメッセージを削除
                    if (waitingMessageId) {
                        const waitingElement = document.getElementById(waitingMessageId);
                        if (waitingElement) {
                            waitingElement.remove();
                        }
                    }
                }
                
                // 【強化】待機画面を確実に削除（複数の方法で試行）
                if (waitingMessageId) {
                    // 方法1: IDで取得して削除
                    const waitingElementById = document.getElementById(waitingMessageId);
                    if (waitingElementById) {
                        waitingElementById.remove();
                    }
                    
                    // 方法2: loading-messageクラスを持つ要素を検索して削除
                    const loadingMessages = window.ChatUI.messagesDiv?.querySelectorAll('.message.loading-message');
                    if (loadingMessages && loadingMessages.length > 0) {
                        loadingMessages.forEach(msg => {
                            if (msg.id === waitingMessageId || !waitingElementById) {
                                msg.remove();
                            }
                        });
                    }
                    
                    // 方法3: チャットウィンドウのアニメーションを解除
                    const messagesDiv = window.ChatUI.messagesDiv;
                    if (messagesDiv && messagesDiv.parentElement) {
                        const chatContainer = messagesDiv.closest('.chat-container');
                        if (chatContainer) {
                            chatContainer.classList.remove('waiting-for-response');
                        }
                    }
                }
                
                // 応答を処理
                if (response.error) {
                    const errorMessage = response.message || response.error || 'エラーが発生しました';
                    console.error('[ChatEngine] APIエラー:', { error: response.error, message: response.message, fullResponse: response });
                    window.ChatUI.addMessage('error', `エラーが発生しました: ${errorMessage}`, 'システム');
                    if (window.ChatUI.sendButton) window.ChatUI.sendButton.disabled = false;
                    return;
                }

                // 汎用的なリダイレクト指示をチェック（特定のページへの依存を避ける）
                if (response.redirect && response.redirectUrl) {
                    console.log('[ChatEngine] リダイレクト指示を受信:', response.redirectUrl);
                    window.location.href = response.redirectUrl;
                    return;
                }
                
                // 応答メッセージを表示
                const characterName = ChatData.characterInfo[character]?.name || character;
                let responseText = response.message || response.response || '応答を取得できませんでした';
                
                // #region agent log - APIレスポンスに[SUGGEST_TAROT]タグが含まれているか確認
                if (responseText && typeof responseText === 'string' && responseText.includes('[SUGGEST_TAROT]')) {
                    console.group('🔍 [DEBUG] APIレスポンスに[SUGGEST_TAROT]タグを検出');
                    console.log('responseText:', responseText);
                    console.log('response.message:', response.message);
                    console.log('response.response:', response.response);
                    console.log('character:', character);
                    console.groupEnd();
                } else if (character === 'yukino') {
                    console.log('[DEBUG] APIレスポンス確認（yukino）:', {
                        hasResponseText: !!responseText,
                        responseTextType: typeof responseText,
                        responseTextPreview: responseText && typeof responseText === 'string' ? responseText.substring(0, 200) : String(responseText),
                        hasSuggestTarot: responseText && typeof responseText === 'string' ? responseText.includes('[SUGGEST_TAROT]') : false
                    });
                }
                // #endregion
                
                // [SUGGEST_TAROT]タグは削除しない
                // onMessageAddedで検出してボタンを表示するためのマーカーとして使用する
                
                // ユーザーメッセージを表示するかどうかを判定（ハンドラーに委譲）
                let shouldShowUserMessage = !skipUserMessage;
                if (!skipUserMessage) {
                    // handlerは既に宣言済みなので、再取得のみ
                    handler = handler || CharacterRegistry.get(character);
                    if (handler && typeof handler.shouldShowUserMessage === 'function') {
                        shouldShowUserMessage = handler.shouldShowUserMessage(responseText, false);
                    }
                }
                
                // ユーザーメッセージは既に送信時に表示済み（588行目付近）
                // 「ニックネームと生年月日を入力」が含まれる場合は、表示されたユーザーメッセージを削除
                if (!shouldShowUserMessage && !skipUserMessage) {
                    // 最後のユーザーメッセージを削除
                    const userMessages = window.ChatUI.messagesDiv.querySelectorAll('.message.user');
                    if (userMessages.length > 0) {
                        const lastUserMessage = userMessages[userMessages.length - 1];
                        const messageText = lastUserMessage.querySelector('div:last-child')?.textContent?.trim();
                        if (messageText === messageToSend) {
                            lastUserMessage.remove();
                            console.log('[楓専用処理] ユーザーメッセージを削除しました:', messageToSend);
                        }
                    }
                }
                
                // 【強化】応答メッセージを表示する前に、待機画面を再度確認して削除
                if (waitingMessageId) {
                    const finalCheck = document.getElementById(waitingMessageId);
                    if (finalCheck) {
                        finalCheck.remove();
                    }
                    // チャットウィンドウのアニメーションを確実に解除
                    const messagesDiv = window.ChatUI.messagesDiv;
                    if (messagesDiv && messagesDiv.parentElement) {
                        const chatContainer = messagesDiv.closest('.chat-container');
                        if (chatContainer) {
                            chatContainer.classList.remove('waiting-for-response');
                        }
                    }
                }
                
                const messageId = window.ChatUI.addMessage('character', responseText, characterName);
                window.ChatUI.scrollToLatest();
                
                // 【スケーラビリティ改善】レスポンス表示後の処理をハンドラーに委譲
                const handlerForResponseDisplay = CharacterRegistry.get(character);
                if (handlerForResponseDisplay && typeof handlerForResponseDisplay.handleAfterResponseDisplay === 'function') {
                    handlerForResponseDisplay.handleAfterResponseDisplay(messageId);
                }
                
                // キャラクター専用ハンドラーでレスポンスを処理（統一的に処理）
                // handlerは既に宣言済みなので、再取得のみ
                handler = handler || CharacterRegistry.get(character);
                
                // 【フェーズ2】守護神呼び出しが必要な場合、その処理を実行
                if (character === 'kaede' && handler && typeof handler.handleGuardianInvocationNeeded === 'function') {
                    const guardianInvocationHandled = await handler.handleGuardianInvocationNeeded(response);
                    if (guardianInvocationHandled) {
                        console.log('[フェーズ2] 守護神呼び出し処理が実行されました');
                        // 今後の処理は、フェーズ2のフロー（守護神メッセージ生成）に委ねる
                        // 送信ボタンを再有効化
                        if (window.ChatUI.sendButton) window.ChatUI.sendButton.disabled = false;
                        return; // 通常のレスポンス処理をスキップ
                    }
                }
                
                if (handler && typeof handler.handleResponse === 'function') {
                    handlerProcessed = await handler.handleResponse(response, character);
                    
                    // ハンドラーで処理された場合は、以降の処理をスキップ
                    if (handlerProcessed) {
                        console.log('[キャラクターハンドラー] レスポンス処理が完了しました:', character);
                        // 送信ボタンを再有効化はハンドラー側で行う
                        return;
                    }
                }
                
                // 登録ユーザーの場合、会話履歴はAPIから取得されるため、ここでは更新しない
                // 必要に応じて、会話履歴を再読み込み
                
                // 送信ボタンを再有効化
                if (window.ChatUI.sendButton) window.ChatUI.sendButton.disabled = false;
                
                // 管理者モードの分析パネルを更新
                if (typeof window.updateAdminAnalysisPanel === 'function') {
                    setTimeout(() => {
                        window.updateAdminAnalysisPanel();
                    }, 300);
                } else {
                    document.dispatchEvent(new CustomEvent('adminPanelUpdate'));
                }
                
        } catch (error) {
            console.error('メッセージ送信エラー:', error);
                
            // ハンドラーのonErrorを呼び出す（待機画面を非表示にする）
            const handler = CharacterRegistry.get(character);
            if (handler && typeof handler.onError === 'function') {
                handler.onError(waitingMessageId);
            } else {
                // ハンドラーが処理しない場合は、デフォルトのローディングメッセージを削除
                if (waitingMessageId) {
                    const waitingElement = document.getElementById(waitingMessageId);
                    if (waitingElement) {
                        waitingElement.remove();
                    }
                }
            }
            
            // 【強化】エラー時も待機画面を確実に削除
            if (waitingMessageId) {
                // 方法1: IDで取得して削除
                const waitingElementById = document.getElementById(waitingMessageId);
                if (waitingElementById) {
                    waitingElementById.remove();
                }
                
                // 方法2: loading-messageクラスを持つ要素を検索して削除
                const loadingMessages = window.ChatUI.messagesDiv?.querySelectorAll('.message.loading-message');
                if (loadingMessages && loadingMessages.length > 0) {
                    loadingMessages.forEach(msg => {
                        if (msg.id === waitingMessageId || !waitingElementById) {
                            msg.remove();
                        }
                    });
                }
                
                // 方法3: チャットウィンドウのアニメーションを解除
                const messagesDiv = window.ChatUI.messagesDiv;
                if (messagesDiv && messagesDiv.parentElement) {
                    const chatContainer = messagesDiv.closest('.chat-container');
                    if (chatContainer) {
                        chatContainer.classList.remove('waiting-for-response');
                    }
                }
            }
            
            window.ChatUI.addMessage('error', `エラーが発生しました: ${error.message || 'メッセージの送信に失敗しました'}`, 'システム');
            if (window.ChatUI.sendButton) window.ChatUI.sendButton.disabled = false;
        } finally {
            // 送信中フラグをリセット
            this._sendingMessage = false;
        }
    },

    /**
     * アニメーション画面から戻ってきた時の処理
     */
    handleReturnFromAnimation() {
        const lastUserMessage = sessionStorage.getItem('lastUserMessage');
        const consultResponse = sessionStorage.getItem('lastConsultResponse');
        const consultError = sessionStorage.getItem('lastConsultError');
        
        // 【デバッグ】handleReturnFromAnimationの呼び出しを追跡
        const callStack = new Error().stack;
        console.log('[handleReturnFromAnimation] 関数呼び出し:', {
            hasLastUserMessage: !!lastUserMessage,
            hasConsultResponse: !!consultResponse,
            hasConsultError: !!consultError,
            callStack: callStack?.split('\n').slice(0, 5).join(' | ')
        });
        
        // 【重要】守護神の儀式完了後（guardianMessageShownフラグが設定されている場合）は、lastUserMessageを表示しない
        const guardianMessageShown = sessionStorage.getItem('guardianMessageShown') === 'true';
        const ritualCompleted = sessionStorage.getItem('ritualCompleted') === 'true';
        
        console.log('[handleReturnFromAnimation] フラグ確認:', {
            guardianMessageShown,
            ritualCompleted,
            hasLastUserMessage: !!lastUserMessage
        });
        
        // 【修正】守護神の儀式完了直後（ritualCompletedまたはguardianMessageShown）の場合は、lastUserMessageを完全に無視
        if ((guardianMessageShown || ritualCompleted) && lastUserMessage) {
            console.log('[handleReturnFromAnimation] 守護神の儀式完了後です。lastUserMessageを表示しません。', {
                guardianMessageShown,
                ritualCompleted,
                lastUserMessage: lastUserMessage.substring(0, 50)
            });
            sessionStorage.removeItem('lastUserMessage');
            // ここでreturnしない（consultResponseの処理を続行するため）
        }

        if (consultError) {
            window.ChatUI.addMessage('error', `エラーが発生しました: ${consultError}`, 'システム');
            sessionStorage.removeItem('lastConsultError');
            if (window.ChatUI.sendButton) window.ChatUI.sendButton.disabled = false;
            return;
        }

        // 【重要】guardianMessageShownまたはritualCompletedが設定されている場合、lastUserMessageは完全に無視
        // （上で既に削除済みだが、念のため再度チェック）
        if (lastUserMessage && (guardianMessageShown || ritualCompleted)) {
            console.log('[handleReturnFromAnimation] 守護神の儀式完了後です。lastUserMessageを完全に無視します（2回目のチェック）');
            sessionStorage.removeItem('lastUserMessage');
            lastUserMessage = null; // 後続の処理で使用されないようにする
        }
        
        if (lastUserMessage && !guardianMessageShown && !ritualCompleted) {
            try {
                const userMsgData = JSON.parse(lastUserMessage);
                const messageToCheck = userMsgData.message.trim();
                
                // タロットカードの解説リクエストメッセージ・トリガーマーカーは表示しない
                if (messageToCheck.includes('以下のタロットカードについて') || 
                    messageToCheck.includes('このカードの意味、私の') ||
                    messageToCheck.includes('のカード「') ||
                    messageToCheck.includes('について、詳しく解説してください') ||
                    messageToCheck.includes('[TAROT_EXPLANATION_TRIGGER:')) {
                    sessionStorage.removeItem('lastUserMessage');
                    return;
                }
                
                // 既に同じメッセージが表示されているかチェック（重複防止）
                const existingUserMessages = window.ChatUI.messagesDiv.querySelectorAll('.message.user');
                const messageTexts = Array.from(existingUserMessages).map(msg => {
                    const textDiv = msg.querySelector('div:last-child');
                    return textDiv ? textDiv.textContent.trim() : '';
                });
                
                const messageExists = messageTexts.some(text => text.trim() === messageToCheck);
                
                if (!messageExists) {
                    console.log('[handleReturnFromAnimation] lastUserMessageからユーザーメッセージを表示:', messageToCheck.substring(0, 50));
                    window.ChatUI.addMessage('user', userMsgData.message, 'あなた');
                    if (window.ChatUI.messageInput) window.ChatUI.messageInput.blur();
                    setTimeout(() => window.ChatUI.scrollToLatest(), 200);
                } else {
                    console.log('[handleReturnFromAnimation] 既に同じメッセージが表示されているため、スキップします:', messageToCheck.substring(0, 50));
                }
                
                sessionStorage.removeItem('lastUserMessage');
            } catch (error) {
                console.error('Error parsing user message:', error);
                sessionStorage.removeItem('lastUserMessage');
            }
        }

        if (consultResponse) {
            try {
                const data = JSON.parse(consultResponse);
                
                // デバッグ: data.messageの型を確認
                if (data.message && typeof data.message !== 'string') {
                    console.error('[handleReturnFromAnimation] ⚠️ data.messageが文字列ではありません！', {
                        messageType: typeof data.message,
                        messageValue: data.message,
                        fullData: data,
                        consultResponse: consultResponse
                    });
                    debugger; // 開発者ツールで停止
                }
                
                // 【新仕様】userTokenは不要。エラーハンドリングを簡素化
                if (data.error && (data.error.includes('user not found') || data.error.includes('session'))) {
                    // 【変更】localStorageからの削除を削除（データベースベースの判断）
                    if (window.AuthState && typeof window.AuthState.clearAuth === 'function') {
                        AuthState.clearAuth();
                    }
                    window.location.href = '../auth/login.html?redirect=' + encodeURIComponent(window.location.href);
                    if (window.ChatUI.sendButton) window.ChatUI.sendButton.disabled = false;
                    return;
                }
                
                if (data.error) {
                    window.ChatUI.addMessage('error', data.error, 'システム');
                } else if (data.isInappropriate) {
                    window.ChatUI.addMessage('warning', data.message, data.characterName);
                } else if (data.message) {
                    // data.messageが文字列であることを確認
                    const messageText = typeof data.message === 'string' ? data.message : String(data.message);
                    window.ChatUI.addMessage('character', messageText, data.characterName);
                    
                    // 【スケーラビリティ改善】レスポンス表示後の処理をハンドラーに委譲
                    const characterForResponseDisplay = ChatData?.currentCharacter || 'unknown';
                    const handlerForResponseDisplay2 = CharacterRegistry.get(characterForResponseDisplay);
                    if (handlerForResponseDisplay2 && typeof handlerForResponseDisplay2.handleAfterResponseDisplay === 'function') {
                        // メッセージIDを生成（既存のロジックに合わせる）
                        const messageIdForHandler = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        handlerForResponseDisplay2.handleAfterResponseDisplay(messageIdForHandler);
                    }
                    
                    // 親ウィンドウにメッセージ送信完了を通知（分析パネル更新用）
                    if (window.parent && window.parent !== window) {
                        try {
                            const character = ChatData?.currentCharacter || 'unknown';
                            const isRegistered = window.AuthState?.isRegistered() || false;
                            const messageCount = ChatData?.getUserMessageCount(character) || 0;
                            
                            console.log('[応答受信] 親ウィンドウに通知:', {
                                character,
                                messageCount
                            });
                            
                            window.parent.postMessage({
                                type: 'CHAT_MESSAGE_SENT',
                                character: character,
                                messageCount: messageCount,
                                timestamp: Date.now()
                            }, '*');
                            console.log('[iframe] メッセージ送信完了を親ウィンドウに通知しました（応答受信後）', {
                                character,
                                messageCount
                            });
                        } catch (error) {
                            console.error('[iframe] メッセージ送信通知エラー:', error);
                        }
                    }
                    
                    // 会話履歴に追加（すべて登録ユーザーのため、常に実行）
                    ChatData.addToConversationHistory(ChatData.currentCharacter, 'assistant', data.message);
                    
                    // アニメーション画面から戻ってきた時、会話履歴からメッセージ数を再計算して保存
                    const history = ChatData.getConversationHistory(ChatData.currentCharacter);
                    if (history && Array.isArray(history)) {
                        const historyUserMessages = history.filter(msg => msg && msg.role === 'user').length;
                        const currentCount = ChatData.getUserMessageCount(ChatData.currentCharacter);
                        
                        console.log('[応答受信] メッセージカウントを再確認:', {
                            character: ChatData.currentCharacter,
                            currentCount: currentCount,
                            historyUserMessages: historyUserMessages,
                            historyLength: history.length
                        });
                        
                        // 会話履歴から計算した値の方が大きい、または現在のカウントが0の場合は更新
                        if (historyUserMessages > currentCount || currentCount === 0) {
                            console.log('[応答受信] ⚠️ メッセージカウントを修正:', {
                                oldCount: currentCount,
                                newCount: historyUserMessages
                            });
                            ChatData.setUserMessageCount(ChatData.currentCharacter, historyUserMessages);
                        }
                    }
                    
                    // 【削除】ゲストモードは廃止されたため、updateUserStatus(false)の呼び出しを削除
                // 登録済みユーザーのみなので、userDataがない場合は何も表示しない
                    
                    if (window.ChatUI.messageInput) window.ChatUI.messageInput.blur();
                    setTimeout(() => window.ChatUI.scrollToLatest(), 100);
                    
                } else {
                    window.ChatUI.addMessage('error', '返信が取得できませんでした', 'システム');
                }
                
                // 会話履歴はデータベースで管理されるため、sessionStorageのクリアは不要
                
                sessionStorage.removeItem('lastConsultResponse');
            } catch (error) {
                console.error('Error parsing consult response:', error);
            }
        }
        
        if (window.ChatUI.sendButton) window.ChatUI.sendButton.disabled = false;
        if (window.ChatUI.messageInput) window.ChatUI.messageInput.blur();
        
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    },

    /**
     * 守護神の儀式への同意処理
     * @param {boolean} consent - 同意するかどうか
     */
    async handleRitualConsent(consent) {
        const character = ChatData.currentCharacter;
        
        // キャラクター専用ハンドラーの同意処理を呼び出す
        const handler = CharacterRegistry.get(character);
        if (handler && typeof handler.handleRitualConsent === 'function') {
            const handled = await handler.handleRitualConsent(consent);
            if (handled) {
                return; // ハンドラーで処理完了
            }
        }
        
        // ハンドラーがない場合のフォールバック処理
        window.ChatUI.hideRitualConsentButtons();
        
        // フラグをリセット（一度処理したので、再度表示されないようにする）
        ChatData.ritualConsentShown = true;
        
        if (consent) {
            // 「はい」を押した場合
            const characterName = ChatData.characterInfo[character]?.name || '鑑定士';
            
            // キャラクターに応じてメッセージを取得（ハンドラーから）
            let consentMessage = 'ユーザー登録への同意が検出されました。ボタンが表示されます。'; // デフォルト
            if (handler && typeof handler.getConsentMessage === 'function') {
                const customMessage = handler.getConsentMessage();
                if (customMessage) {
                    consentMessage = customMessage;
                }
            }
            
            window.ChatUI.addMessage('character', consentMessage, characterName);
            
            // メッセージを表示した後、少し待ってから登録画面に遷移
            setTimeout(() => {
                this.openRegistrationModal();
            }, 2000);
        } else {
            // 「いいえ」を押した場合
            // キャラクターに応じてメッセージを取得（ハンドラーから）
            let declineMessage = 'ユーザー登録をスキップしました。引き続きゲストモードでお話しできます。'; // デフォルト
            if (handler && typeof handler.getDeclineMessage === 'function') {
                const customMessage = handler.getDeclineMessage();
                if (customMessage) {
                    declineMessage = customMessage;
                }
            }
            
            window.ChatUI.addMessage('error', declineMessage, 'システム');
        }
    },

    /**
     * 登録モーダルを開く
     */
    openRegistrationModal() {
        // 登録画面に遷移（会話履歴はデータベースで管理されるため、保存は不要）
        window.location.href = '../auth/register.html?redirect=' + encodeURIComponent(window.location.href);
    },

    /**
     * 守護神の儀式を開始
     * @param {string} character - キャラクターID
     */
    async startGuardianRitual(character) {
        console.log('[守護神の儀式] 開始:', character);
        
            // 【登録ユーザーの場合のみ、以下の処理を実行】
        console.log('[守護神の儀式] 登録ユーザーとして儀式を開始します');
        
        // 送信ボタンを無効化
        if (window.ChatUI.sendButton) window.ChatUI.sendButton.disabled = true;
        
        try {
            // 会話履歴を取得（データベースのguardianカラムを確認するため）
            let historyData = null;
            try {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:1812',message:'loadConversationHistory呼び出し前（通常フロー）',data:{character:character,urlCharacter:new URLSearchParams(window.location.search).get('character'),currentCharacter:ChatData.currentCharacter},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                historyData = await ChatAPI.loadConversationHistory(character);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:1815',message:'loadConversationHistory呼び出し後（通常フロー）',data:{character:character,hasHistoryData:!!historyData,recentMessagesLength:historyData?.recentMessages?.length||0,urlCharacter:new URLSearchParams(window.location.search).get('character')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                console.log('[守護神の儀式] 会話履歴データ:', historyData);
            } catch (error) {
                // エラーハンドリング
                if (error instanceof Error) {
                    if (error.message === 'USER_NOT_FOUND') {
                        // ユーザー情報が登録されていない場合：エントリーフォームを表示
                        console.error('[守護神の儀式] ユーザー情報が登録されていません。エントリーフォームを表示します。');
                        
                        // チャットコンテナを非表示にしてエントリーフォームを表示
                        const entryFormContainer = document.getElementById('entryFormContainer');
                        const chatContainer = document.getElementById('chatContainer');
                        const entryFormError = document.getElementById('entryFormError');
                        
                        if (entryFormContainer && chatContainer) {
                            // エントリーフォームを表示
                            entryFormContainer.classList.remove('entry-form-hidden');
                            // チャットコンテナを非表示
                            chatContainer.classList.add('entry-form-hidden');
                            
                            // エラーメッセージを表示
                            if (entryFormError) {
                                entryFormError.textContent = '会員情報が存在しないため、再度会員登録をお願いします。';
                                entryFormError.classList.add('show');
                            }
                            
                            console.log('[守護神の儀式] エントリーフォームを表示しました（ユーザー情報が見つかりません）');
                        }
                        return;
                    } else if (error.message === 'NETWORK_ERROR') {
                        // ネットワーク接続エラーの場合
                        console.error('[守護神の儀式] ネットワーク接続エラーが発生しました');
                        if (window.ChatUI) {
                            window.ChatUI.addMessage('error', 'インターネット接続エラーが発生しました。しばらく経ってから再度お試しください。', 'システム');
                        }
                        if (window.ChatUI.sendButton) window.ChatUI.sendButton.disabled = false;
                        return;
                    }
                }
                // その他のエラー
                console.error('[守護神の儀式] 会話履歴の取得エラー:', error);
                window.ChatUI.addMessage('error', '会話履歴の取得に失敗しました。時間を置いて再度お試しください。', 'システム');
                if (window.ChatUI.sendButton) window.ChatUI.sendButton.disabled = false;
                return;
            }
            
            // 【重要】データベースのguardianカラムから守護神が既に決定されているかチェック（優先）
            if (historyData && historyData.assignedDeity && historyData.assignedDeity.trim() !== '') {
                console.log('[守護神の儀式] データベースで守護神が既に決定されていることを確認（' + historyData.assignedDeity + '）。儀式を開始しません。');
                // 【変更】localStorageに保存しない（データベースベースの判断）
                if (window.ChatUI.sendButton) window.ChatUI.sendButton.disabled = false;
                return; // 儀式を開始しない
            }
            
            // 会話履歴の決定（優先順位順）
            let conversationHistory = [];
            let needsMigration = false; // ゲスト履歴の移行が必要かどうか
            
            // 1. 登録ユーザーの会話履歴がある場合はそれを使用
            if (historyData && historyData.hasHistory && historyData.recentMessages && historyData.recentMessages.length > 0) {
                conversationHistory = [...historyData.recentMessages];
                console.log('[守護神の儀式] 登録ユーザーの会話履歴を使用:', conversationHistory.length);
                
                // ChatData.conversationHistoryを更新
                ChatData.conversationHistory = historyData;
            } 
            // 2. 会話履歴がない場合は空配列
            else {
                conversationHistory = [];
                console.log('[守護神の儀式] 会話履歴が空です（新規会話）');
            }
            
            console.log('[守護神の儀式] 使用する会話履歴:', conversationHistory);
            
            // 【重要】ゲスト履歴の移行が必要な場合は、ダミーメッセージを送信してデータベースに保存
            if (needsMigration && conversationHistory.length > 0) {
                console.log('[守護神の儀式] ゲスト履歴をデータベースに移行します:', conversationHistory.length, '件');
                
                // 最初のユーザーメッセージを取得してsessionStorageに保存
                const firstUserMessage = conversationHistory.find(msg => msg.role === 'user');
                if (firstUserMessage && firstUserMessage.content) {
                    sessionStorage.setItem('firstQuestionBeforeRitual', firstUserMessage.content);
                    console.log('[守護神の儀式] 最初の質問をsessionStorageに保存:', firstUserMessage.content.substring(0, 50) + '...');
                }
                
                // 会話履歴はデータベースで管理されるため、移行処理は不要
            }
            
            // 【重要】ユーザー登録後は、守護神の儀式開始前にカエデのメッセージを表示
            // これにより、儀式完了後にユーザーの履歴が残らない（カエデが最後のメッセージになる）
            const characterName = ChatData.characterInfo[character]?.name || '楓';
            const ritualStartMessage = 'それではこれより守護神のイベントを開始いたします。\n画面が切り替わりますので、儀式を体験してください。';
            
            console.log('[守護神の儀式] 儀式開始前のメッセージを表示:', ritualStartMessage);
            
            // メッセージを確実に表示するため、DOM更新を待つ
            window.ChatUI.addMessage('character', ritualStartMessage, characterName);
            
            // DOM更新を待つ
            await new Promise(resolve => requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
            }));
            
            // スクロールしてメッセージを表示
            window.ChatUI.scrollToLatest();
            
            // 会話履歴に追加（ただし、データベースには保存しない）
            conversationHistory.push({ role: 'assistant', content: ritualStartMessage });
            
            // 会話履歴を保存（登録ユーザーの場合）
            // 注：このメッセージはデータベースに保存しない（儀式開始前のメッセージのため）
            // ただし、ChatDataには追加しておく（次の処理で使用する可能性があるため）
            if (AuthState.isRegistered() && ChatData.conversationHistory) {
                // このメッセージはデータベースには保存しない（一時的なメッセージ）
                // ChatData.conversationHistory.recentMessages = conversationHistory;
                console.log('[守護神の儀式] 儀式開始メッセージはデータベースに保存しません（一時メッセージ）');
            }
            
            // メッセージ表示後、少し待ってからguardian-ritual.htmlに遷移
            await this.delay(2000); // 2秒待つ（ユーザーがメッセージを読む時間を確保）

            // guardian-ritual.htmlに遷移
            // 現在のチャット画面のURLを保存（儀式完了後に戻るため）
            const currentChatUrl = window.location.href;
            sessionStorage.setItem('postRitualChatUrl', currentChatUrl);

            // 【修正】userIdをURLパラメータに含める（データベースからユーザー情報を取得するため）
            let ritualUrl = '../guardian-ritual.html';
            if (historyData && historyData.userId) {
                // 【修正】window.location.hrefを基準にして相対パスを解決
                const url = new URL(ritualUrl, window.location.href);
                url.searchParams.set('userId', String(historyData.userId));
                ritualUrl = url.pathname + url.search;
                console.log('[守護神の儀式] userIdをURLパラメータに追加:', historyData.userId);
            } else {
                // historyDataにuserIdがない場合、現在のURLから取得を試みる
                const currentUrlParams = new URLSearchParams(window.location.search);
                const userId = currentUrlParams.get('userId');
                if (userId) {
                    // 【修正】window.location.hrefを基準にして相対パスを解決
                    const url = new URL(ritualUrl, window.location.href);
                    url.searchParams.set('userId', userId);
                    ritualUrl = url.pathname + url.search;
                    console.log('[守護神の儀式] 現在のURLからuserIdを取得して追加:', userId);
                }
            }

            console.log('[守護神の儀式] guardian-ritual.htmlに遷移:', ritualUrl);
            window.location.href = ritualUrl;
            return; // 遷移するため、以降の処理は実行されない
            
        } catch (error) {
            console.error('[守護神の儀式] 例外エラー:', error);
            window.ChatUI.addMessage('error', '守護神の儀式の開始に失敗しました: ' + error.message, 'システム');
        } finally {
            // 送信ボタンを再有効化（遷移する場合は実行されないが、エラー時は必要）
            if (window.ChatUI.sendButton) window.ChatUI.sendButton.disabled = false;
            if (window.ChatUI.messageInput) window.ChatUI.messageInput.focus();
        }
    },

    /**
     * 遅延処理
     * @param {number} ms - ミリ秒
     * @returns {Promise} Promise
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * メッセージ要素に守護神の儀式開始ボタンを追加（再表示用）
     * @param {HTMLElement} messageElement - メッセージ要素
     */
    addRitualStartButtonToMessage(messageElement) {
        if (!messageElement) return;
        
        const character = ChatData.currentCharacter;
        
        // ボタンを追加
        window.ChatUI.addRitualStartButton(messageElement, async () => {
            console.log('[守護神の儀式] ボタンがクリックされました（再表示）');
            
            // ボタンを非表示
            const button = messageElement.querySelector('.ritual-start-button');
            if (button) {
                button.style.display = 'none';
            }
            
            // 守護神の儀式を開始（会話履歴はデータベースから取得）
            await this.startGuardianRitual(character);
        });
    }
};

// グローバルスコープに公開（iframeからアクセスできるようにする）
window.ChatInit = ChatInit;

// ===== 開発者向けテストユーティリティ =====
/**
 * テスト用ユーティリティ関数
 * コンソールから呼び出して、ゲストモードのフラグをクリアできます
 * 
 * 使用例:
 * - ChatTestUtils.clearGuestFlags() // すべてのキャラクターのゲストフラグをクリア
 * - ChatTestUtils.clearGuestFlags('sora') // ソラのゲストフラグのみクリア
 * - ChatTestUtils.clearAllGuestData() // ゲストフラグとsessionStorageの履歴もクリア
 * - ChatTestUtils.checkGuestFlags() // 現在のゲストフラグの状態を確認
 */
window.ChatTestUtils = {
    /**
     * ゲストモードで会話したフラグをクリア
     * @param {string|null} characterId - キャラクターID（指定しない場合はすべてクリア）
     */
    clearGuestFlags(characterId = null) {
        // 【変更】localStorageの使用を削除（データベースベースの判断）
        // ゲストフラグはデータベースで管理されるため、localStorageのクリアは不要
        console.log('[ChatTestUtils] ゲストフラグのクリアはデータベースベースの判断に移行したため、localStorageのクリアは不要です。');
    },
    
    /**
     * すべてのゲスト関連データをクリア（フラグ + sessionStorageの履歴）
     * @param {string|null} characterId - キャラクターID（指定しない場合はすべてクリア）
     */
    clearAllGuestData(characterId = null) {
        const characters = ['kaede', 'yukino', 'sora', 'kaon'];
        const targets = characterId ? [characterId] : characters;
        
        // 【変更】localStorageの使用を削除（データベースベースの判断）
        // ゲストフラグはデータベースで管理されるため、localStorageのクリアは不要
        
        // sessionStorageの履歴をクリア
        targets.forEach(c => {
            const historyKey = `guestConversationHistory_${c}`;
            const countKey = `guestMessageCount_${c}`;
            if (sessionStorage.getItem(historyKey)) {
                sessionStorage.removeItem(historyKey);
                console.log(`[ChatTestUtils] ✅ ${historyKey} をクリアしました`);
            }
            if (sessionStorage.getItem(countKey)) {
                sessionStorage.removeItem(countKey);
                console.log(`[ChatTestUtils] ✅ ${countKey} をクリアしました`);
            }
        });
        
        // AuthStateの履歴もクリア
        if (window.AuthState && typeof window.AuthState.resetGuestProgress === 'function') {
            targets.forEach(c => {
                window.AuthState.clearGuestHistory(c);
            });
            console.log('[ChatTestUtils] ✅ AuthStateのゲスト履歴をクリアしました');
        }
        
        console.log('[ChatTestUtils] すべてのゲストデータのクリアが完了しました。ページをリロードしてください。');
    },
    
    /**
     * 現在のゲストフラグの状態を確認
     */
    checkGuestFlags() {
        const characters = ['kaede', 'yukino', 'sora', 'kaon'];
        const status = {};
        
        // 【変更】localStorageの使用を削除（データベースベースの判断）
        characters.forEach(c => {
            status[c] = {
                flag: 'データベースで管理',
                history: sessionStorage.getItem(`guestConversationHistory_${c}`) ? 'あり' : 'なし',
                count: sessionStorage.getItem(`guestMessageCount_${c}`) || '0'
            };
        });
        
        console.table(status);
        return status;
    }
};

// グローバル関数として公開
window.sendMessage = (skipUserMessage, skipAnimation, messageOverride) => ChatInit.sendMessage(skipUserMessage, skipAnimation, messageOverride);
window.handleRitualConsent = (consent) => ChatInit.handleRitualConsent(consent);

// ===== テストモードチェック（最優先で実行） =====
// URLパラメータに?test=trueがある場合、すべてのキャラクターのゲストフラグをクリア
// これはハンドラーが読み込まれる前に実行される必要があるため、ここで処理する
(function() {
    // グローバルスコープのurlParamsを使用
    if (!window._chatUrlParams) {
        window._chatUrlParams = new URLSearchParams(window.location.search);
    }
    const urlParams = window._chatUrlParams;
    if (urlParams.get('test') === 'true') {
        console.log('[ChatEngine] テストモードが有効です。すべてのゲストフラグをクリアします...');
        // 【変更】localStorageの使用を削除（データベースベースの判断）
        // ゲストフラグはデータベースで管理されるため、localStorageのクリアは不要
        const characters = ['kaede', 'yukino', 'sora', 'kaon'];
        console.log('[ChatEngine] テストモード: ゲストフラグはデータベースで管理されるため、localStorageのクリアは不要です。');
        console.log('[ChatEngine] テストモード: すべてのゲストフラグのクリアが完了しました');
    }
})();

// postMessage関連の初期化（DOMContentLoadedの外で即座に実行）
(async function initPostMessageCommunication() {
    'use strict';
    
    console.log('[iframe] postMessage通信を初期化しています...', {
        documentReadyState: document.readyState,
        hasParent: window.parent && window.parent !== window,
        origin: window.location.origin
    });
    
    // 親ウィンドウに準備完了を通知する関数
    function notifyParentReady() {
        if (window.parent && window.parent !== window) {
            try {
                // URLパラメータからcharacterを取得
                // グローバルスコープのurlParamsを使用
                if (!window._chatUrlParams) {
                    window._chatUrlParams = new URLSearchParams(window.location.search);
                }
                const urlParams = window._chatUrlParams;
                const character = urlParams.get('character') || 'unknown';
                
                window.parent.postMessage({
                    type: 'CHAT_IFRAME_READY',
                    character: character,
                    messageCount: 0,
                    timestamp: Date.now(),
                    ready: true
                }, '*');
                
                console.log('[iframe] ✅ 親ウィンドウに準備完了を通知しました（初期通知）', {
                    character,
                    origin: window.location.origin
                });
                return true;
            } catch (error) {
                console.error('[iframe] ❌ 親ウィンドウへの通知エラー:', error);
                return false;
            }
        } else {
            // 通常のブラウジングの場合はログを出力しない
            return false;
        }
    }
    
    // 親ウィンドウが存在する場合のみ、通知を試行
    let hasNotified = false; // スコープを外に移動
    if (window.parent && window.parent !== window) {
        if (document.readyState === 'loading') {
            // まだ読み込み中の場合は、DOMContentLoaded時に通知
            document.addEventListener('DOMContentLoaded', () => {
                if (!hasNotified) {
                    hasNotified = notifyParentReady();
                }
            });
        } else {
            // 既に読み込み済みの場合は即座に通知
            hasNotified = notifyParentReady();
        }
        
        // window.load時にも通知
        if (document.readyState !== 'complete') {
            window.addEventListener('load', () => {
                if (!hasNotified) {
                    hasNotified = notifyParentReady();
                }
            });
        } else {
            if (!hasNotified) {
                hasNotified = notifyParentReady();
            }
        }
    }
    
    // REQUEST_CHAT_DATAハンドラーを即座に設定（DOMContentLoadedを待たない）
    window.addEventListener('message', (event) => {
        // セキュリティチェック
        if (event.origin !== window.location.origin) {
            return;
        }
        
        if (event.data && event.data.type === 'REQUEST_CHAT_DATA') {
            console.log('[iframe] 📨 REQUEST_CHAT_DATAを受信しました（初期ハンドラー）');
            
            // 簡単な応答を即座に返す
            try {
                // グローバルスコープのurlParamsを使用
                if (!window._chatUrlParams) {
                    window._chatUrlParams = new URLSearchParams(window.location.search);
                }
                const urlParams = window._chatUrlParams;
                const character = urlParams.get('character') || 'unknown';
                
                const responseData = {
                    type: 'CHAT_DATA_RESPONSE',
                    data: {
                        character: character,
                        messageCount: 0,
                        conversationHistory: [],
                        currentState: {
                            character: character,
                            messageCount: 0,
                            conversationHistoryLength: 0,
                            isRegistered: false
                        },
                        timestamp: Date.now()
                    }
                };
                
                if (event.source && event.source.postMessage) {
                    event.source.postMessage(responseData, event.origin);
                    console.log('[iframe] ✅ 初期ハンドラーでチャットデータを送信しました');
                } else if (window.parent && window.parent !== window) {
                    window.parent.postMessage(responseData, '*');
                    console.log('[iframe] ✅ 初期ハンドラーでwindow.parentに送信しました');
                }
            } catch (error) {
                console.error('[iframe] ❌ 初期ハンドラーでエラー:', error);
            }
        }
    });
    
    console.log('[iframe] postMessage通信の初期化完了', {
        hasParent: window.parent && window.parent !== window,
        documentReadyState: document.readyState
    });
})();

// DOMContentLoaded時に初期化
window.addEventListener('DOMContentLoaded', async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:3809',message:'DOMContentLoaded: initPage呼び出し前',data:{hasChatInit:typeof ChatInit !== 'undefined',hasInitPage:typeof ChatInit?.initPage === 'function'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // 【統合後】依存関係の読み込み待機は不要（統合によりchat-engine.js内で定義済み）
    // deferにより確実に読み込まれるため、直接初期化を実行
    
    // アニメーションページからの復帰を検知
    // グローバルスコープのurlParamsを使用
    if (!window._chatUrlParams) {
        window._chatUrlParams = new URLSearchParams(window.location.search);
    }
    const urlParams = window._chatUrlParams;
    const isTransitionComplete = urlParams.get('transition') === 'complete';
    
    if (isTransitionComplete) {
        console.log('[初期化] アニメーションページから復帰しました - フェードイン開始');
        
        // フェードインオーバーレイを作成
        const fadeOverlay = document.createElement('div');
        fadeOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000;
            z-index: 9999;
            opacity: 1;
            transition: opacity 1.2s ease;
            pointer-events: none;
        `;
        document.body.appendChild(fadeOverlay);
        
        // 即座にフェードアウト開始
        setTimeout(() => {
            fadeOverlay.style.opacity = '0';
        }, 50);
        
        // フェードアウト完了後にオーバーレイを削除
        setTimeout(() => {
            if (fadeOverlay.parentNode) {
                fadeOverlay.parentNode.removeChild(fadeOverlay);
            }
        }, 1600);
        
        // URLパラメータをクリーン
        window.history.replaceState({}, '', window.location.pathname + '?character=yukino');
    }

    
    // URLから.htmlを除去
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const pathParts = currentPath.split('/').filter(part => part !== '');
    
    // 【重要】ページ読み込み完了後、イベントリスナーを確実に設定
    window.addEventListener('load', () => {
        console.log('[DOMContentLoaded] load イベント: イベントリスナーを設定します');
        if (window.ChatUI.messageInput && window.ChatUI.sendButton) {
            // 既存のリスナーを削除（重複登録を防ぐ）
            const newInput = window.ChatUI.messageInput.cloneNode(true);
            window.ChatUI.messageInput.parentNode.replaceChild(newInput, window.ChatUI.messageInput);
            window.ChatUI.messageInput = newInput;
            
            window.ChatUI.messageInput.addEventListener('keydown', (e) => {
                // PC環境（画面幅768px以上）でのみEnterキー送信を有効化
                // Shift + Enterは改行、日本語入力確定時のEnterは送信しない
                if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && window.innerWidth >= 768) {
                    e.preventDefault();
                    window.sendMessage();
                }
            });
            
            window.ChatUI.messageInput.addEventListener('input', () => {
                window.ChatUI.updateSendButtonVisibility();
            });
            
            // フォーカス時に最下部へスクロール（スマホのキーボード表示時に対応）
            window.ChatUI.messageInput.addEventListener('focus', () => {
                if (window.ChatUI.scrollToLatest) {
                    window.ChatUI.scrollToLatest();
                }
            });
            
            console.log('[DOMContentLoaded] load イベント: イベントリスナーの設定完了');
        }
    });
    
    if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart.includes('.html')) {
            const correctPath = '/' + pathParts.slice(0, -1).join('/') + currentSearch;
            history.replaceState(null, '', correctPath);
        }
    }
    
    document.body.classList.add('fade-in');
    
    // UIを初期化
    if (window.ChatUI && typeof window.ChatUI.init === 'function') {
        window.ChatUI.init();
    }
    
    // 送信ボタンの表示/非表示制御
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    
    if (messageInput && sendButton) {
        // 初期状態を設定
        const hasText = messageInput.value.trim().length > 0;
        if (hasText) {
            sendButton.classList.add('visible');
        } else {
            sendButton.classList.remove('visible');
        }
        
        // inputイベントリスナーを登録
        messageInput.addEventListener('input', function() {
            const hasText = messageInput.value.trim().length > 0;
            if (hasText) {
                sendButton.classList.add('visible');
            } else {
                sendButton.classList.remove('visible');
            }
        });
        console.log('[初期化] 送信ボタンのイベントリスナーを登録しました');
    } else {
        console.warn('[初期化] 送信ボタンの要素が見つかりません:', {
            messageInput: !!messageInput,
            sendButton: !!sendButton
        });
    }
    
    // ページを初期化
    // 入口フォームが表示されている場合は初期化をスキップ（ただし、userIdがURLパラメータにある場合は除く）
    const entryFormContainer = document.getElementById('entryFormContainer');
    const chatContainer = document.getElementById('chatContainer');
    const isEntryFormVisible = entryFormContainer && !entryFormContainer.classList.contains('entry-form-hidden');
    
    // userIdがURLパラメータにある場合、エントリーフォームを非表示にしてチャットコンテナを表示
    // グローバルスコープのurlParamsを使用
    if (!window._chatUrlParams) {
        window._chatUrlParams = new URLSearchParams(window.location.search);
    }
    const domUrlParams = window._chatUrlParams;
    const domUserId = domUrlParams.get('userId');
    console.log('[DOMContentLoaded] userIdチェック:', { domUserId, isEntryFormVisible });
    if (domUserId) {
        // userIdがある場合、エントリーフォームを非表示にしてチャットコンテナを表示
        if (entryFormContainer) {
            entryFormContainer.classList.add('entry-form-hidden');
            console.log('[DOMContentLoaded] エントリーフォームにhiddenクラスを追加しました');
        }
        if (chatContainer) {
            chatContainer.classList.remove('entry-form-hidden');
            console.log('[DOMContentLoaded] チャットコンテナからhiddenクラスを削除しました');
        }
        console.log('[DOMContentLoaded] userIdがURLパラメータにあるため、エントリーフォームを非表示にしてチャットコンテナを表示しました');
        console.log('[DOMContentLoaded] クラス変更後:', {
            entryFormHasHidden: entryFormContainer?.classList.contains('entry-form-hidden'),
            chatContainerHasHidden: chatContainer?.classList.contains('entry-form-hidden')
        });
    }
    
    // エントリーフォームが表示されている場合（userIdがない場合のみ）は初期化をスキップ
    const isEntryFormStillVisible = entryFormContainer && !entryFormContainer.classList.contains('entry-form-hidden');
    if (isEntryFormStillVisible) {
        console.log('[chat-engine] 入口フォームが表示されているため、初期化をスキップします');
        // 入口フォームが非表示になったら初期化を実行するイベントリスナーを設定
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const isNowHidden = entryFormContainer.classList.contains('entry-form-hidden');
                    if (isNowHidden) {
                        console.log('[chat-engine] 入口フォームが非表示になったため、初期化を実行します');
                        observer.disconnect();
                        if (!ChatInit._initPageRunning && !ChatInit._initPageCompleted) {
                            ChatInit.initPage().catch(error => {
                                console.error('[chat-engine] 初期化エラー:', error);
                            });
                        } else {
                            console.log('[chat-engine] initPageは既に実行中または完了しているため、スキップします');
                        }
                    }
                }
            });
        });
        observer.observe(entryFormContainer, { attributes: true });
        return;
    }
    
    // 重複実行を防ぐ: 既に実行中または完了している場合はスキップ
    if (!ChatInit._initPageRunning && !ChatInit._initPageCompleted) {
        await ChatInit.initPage();
    } else {
        console.log('[chat-engine] initPageは既に実行中または完了しているため、スキップします');
    }
    
    // アニメーション画面から戻ってきた時の処理
    setTimeout(() => {
        ChatInit.handleReturnFromAnimation();
    }, 100);
    
    // 親ウィンドウに準備完了を通知（分析パネル用）
    function notifyParentReady() {
        if (window.parent && window.parent !== window) {
            try {
                const character = ChatData?.currentCharacter || 'unknown';
                const isRegistered = window.AuthState?.isRegistered() || false;
                const messageCount = ChatData?.getUserMessageCount(character) || 0;
                
                window.parent.postMessage({
                    type: 'CHAT_IFRAME_READY',
                    character: character,
                    messageCount: messageCount,
                    timestamp: Date.now()
                }, '*');
                console.log('[iframe] ✅ 親ウィンドウに準備完了を通知しました', {
                    character,
                    messageCount,
                    origin: window.location.origin
                });
            } catch (error) {
                console.error('[iframe] ❌ 親ウィンドウへの通知エラー:', error);
            }
        }
        // 通常のブラウジングの場合はログを出力しない（不要な情報のため）
    }
    
    // 初期化完了後に準備完了を通知（複数のタイミングで確実に通知）
    let notifyAttempts = 0;
    const maxNotifyAttempts = 10;
    let notifyInterval = null;
    let hasNotified = false; // 既に通知済みかどうか
    let noParentLogged = false; // 親ウィンドウ不在のログを既に出力したか
    
    // 通知を送信する関数（重複を防ぐ）
    function tryNotifyParent() {
        if (hasNotified) {
            console.log('[iframe] 通知は既に送信済みです');
            return true; // 既に通知済みの場合は成功として扱う
        }
        
        // ChatDataとAuthStateが利用可能かチェック
        const hasChatData = typeof ChatData !== 'undefined' && ChatData !== null;
        const hasAuthState = typeof window.AuthState !== 'undefined' && window.AuthState !== null;
        
        console.log('[iframe] 通知を送信しようとしています...', {
            hasChatData: hasChatData,
            hasAuthState: hasAuthState,
            currentCharacter: ChatData?.currentCharacter || 'unknown',
            documentReadyState: document.readyState
        });
        
        // ChatDataとAuthStateがなくても、最小限の準備完了通知を送信
        // （親ウィンドウは準備完了を検知できれば、後でデータをリクエストできる）
        if (window.parent && window.parent !== window) {
            try {
                const character = ChatData?.currentCharacter || new URLSearchParams(window.location.search).get('character') || 'unknown';
                const isRegistered = (hasAuthState && window.AuthState?.isRegistered()) || false;
                const messageCount = (hasChatData && typeof ChatData?.getUserMessageCount === 'function') 
                    ? (ChatData.getUserMessageCount(character) || 0) 
                    : 0;
                
                window.parent.postMessage({
                    type: 'CHAT_IFRAME_READY',
                    character: character,
                    messageCount: messageCount,
                    timestamp: Date.now(),
                    ready: true
                }, '*');
                
                console.log('[iframe] ✅ 親ウィンドウに準備完了を通知しました（最小限の情報）', {
                    character,
                    messageCount,
                    hasChatData,
                    hasAuthState
                });
                
                hasNotified = true; // 成功したらマーク
                if (notifyInterval) {
                    clearInterval(notifyInterval);
                    notifyInterval = null;
                }
                return true;
            } catch (error) {
                console.error('[iframe] ❌ 準備完了通知の送信エラー:', error);
                return false;
            }
        } else {
            // 親ウィンドウが存在しない場合（通常のブラウジング）
            // ログは最初の1回だけ出力
            if (!noParentLogged) {
                console.log('[iframe] 親ウィンドウが存在しないため、準備完了通知をスキップしました（通常のブラウジング）');
                noParentLogged = true;
            }
            return false;
        }
    }
    
    // 親ウィンドウが存在する場合のみ、イベントリスナーを登録
    const hasParentWindow = window.parent && window.parent !== window;
    
    if (hasParentWindow) {
        // 1. DOMContentLoaded時に即座に1回通知
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                console.log('[iframe] DOMContentLoaded - 準備完了通知を送信（1秒後）');
                setTimeout(() => {
                    tryNotifyParent();
                }, 1000);
            });
        } else {
            // 既にDOMContentLoaded済みの場合は即座に実行
            console.log('[iframe] DOMContentLoaded済み - 準備完了通知を送信（1秒後）');
            setTimeout(() => {
                tryNotifyParent();
            }, 1000);
        }
        
        // 2. window.load時に1回通知（リソース読み込み完了後）
        if (document.readyState !== 'complete') {
            window.addEventListener('load', () => {
                console.log('[iframe] window.load - 準備完了通知を送信（1秒後）');
                setTimeout(() => {
                    tryNotifyParent();
                }, 1000);
            });
        } else {
            // 既にload済みの場合も試行
            console.log('[iframe] window.load済み - 準備完了通知を送信（1秒後）');
            setTimeout(() => {
                tryNotifyParent();
            }, 1000);
        }
    } else {
        console.log('[iframe] 親ウィンドウが存在しないため、イベントリスナーの登録をスキップします（通常のブラウジング）');
    }
    
    // 3. 念のため定期通知（最大10回、2秒ごと）
    // ただし、親ウィンドウが存在する場合のみ実行
    if (window.parent && window.parent !== window) {
        notifyInterval = setInterval(() => {
            notifyAttempts++;
            console.log(`[iframe] 定期通知 - 試行${notifyAttempts}/${maxNotifyAttempts}`);
            if (tryNotifyParent()) {
                // 通知成功したら停止
                console.log('[iframe] 定期通知を終了（通知成功）');
                return;
            }
            
            if (notifyAttempts >= maxNotifyAttempts) {
                clearInterval(notifyInterval);
                console.warn('[iframe] 準備完了通知の最大試行回数に達しました', {
                    attempts: notifyAttempts,
                    hasChatData: !!ChatData,
                    hasAuthState: !!window.AuthState
                });
            }
        }, 2000); // 2秒ごとに試行
    } else {
        console.log('[iframe] 親ウィンドウが存在しないため、定期通知をスキップします');
    }
    
    // デバッグ用: notifyParentReadyをグローバルに公開
    window.notifyParentReady = notifyParentReady;
    
    console.log('[iframe] postMessage通信が初期化されました', {
        hasChatData: typeof ChatData !== 'undefined',
        hasAuthState: typeof window.AuthState !== 'undefined',
        hasParent: window.parent && window.parent !== window,
        documentReadyState: document.readyState
    });
    
    // 即座に1回通知を試行（ChatData/AuthStateの初期化を待たない）
    console.log('[iframe] 即座に準備完了通知を試行（0.5秒後）...');
    setTimeout(() => {
        tryNotifyParent();
    }, 500);
    
    // 管理者用コマンドハンドラー（postMessage）
    window.addEventListener('message', async (event) => {
        // デバッグ: すべてのメッセージをログに記録
        console.log('[iframe] メッセージ受信:', {
            type: event.data?.type,
            origin: event.origin,
            expectedOrigin: window.location.origin,
            isParent: window.parent && window.parent !== window
        });
        
        // セキュリティのため、同じオリジンのみ受け入れる
        if (event.origin !== window.location.origin) {
            console.warn('[iframe] オリジン不一致:', {
                received: event.origin,
                expected: window.location.origin
            });
            return;
        }
        
        const { type, character, token, nickname, assignedDeity } = event.data || {};
        
        switch (type) {
            case 'ADMIN_RESET_CONVERSATION':
                // 会話をリセット
                if (character && ChatData) {
                    ChatData.setGuestHistory(character, []);
                    ChatData.setUserMessageCount(character, 0);
                }
                if (window.AuthState) {
                    window.AuthState.resetGuestProgress({ keepHistory: false });
                }
                // sessionStorageもクリア
                const keys = Object.keys(sessionStorage);
                keys.forEach(key => {
                    if (key.startsWith('guest') || key.includes('guest') || key.startsWith('auth.guest')) {
                        sessionStorage.removeItem(key);
                    }
                });
                location.reload();
                break;
                
            case 'ADMIN_RESET_PHASE':
                // フェーズをリセット（メッセージカウントを0に）
                if (character && ChatData) {
                    ChatData.setUserMessageCount(character, 0);
                }
                if (window.AuthState) {
                    window.AuthState.setGuestMessageCount(0);
                }
                sessionStorage.setItem(`guestMessageCount_${character}`, '0');
                sessionStorage.setItem('auth.guestMessageCount', '0');
                break;
                
            case 'ADMIN_TRIGGER_RITUAL':
                // 守護神の儀式を発動
                if (character && ChatInit && window.AuthState && window.AuthState.isRegistered()) {
                    await ChatInit.startGuardianRitual(character);
                }
                break;
                
            case 'ADMIN_SIMULATE_REGISTRATION':
                // 【変更】テスト用ユーザー登録をシミュレート（localStorageの使用を削除）
                // データベースベースの判断に移行したため、localStorageへの保存は不要
                if (window.AuthState) {
                    window.AuthState.setAuth(null, nickname, assignedDeity);
                    // localStorageへの保存を削除
                    location.reload();
                }
                break;
                
            case 'ADMIN_LOGOUT':
                // ログアウト
                if (window.AuthState) {
                    window.AuthState.clearAuth();
                    window.AuthState.resetGuestProgress({ keepHistory: false });
                }
                // 【変更】localStorageからの削除を削除（データベースベースの判断）
                sessionStorage.clear();
                location.reload();
                break;
                
            case 'REQUEST_CHAT_DATA':
                // 分析パネルからのデータリクエスト
                console.log('[iframe] 📨 メッセージ受信: REQUEST_CHAT_DATA');
                console.log('[iframe] 📨 REQUEST_CHAT_DATAを受信しました');
                try {
                    // ChatData, AuthState の存在確認
                    if (typeof ChatData === 'undefined') {
                        console.error('[iframe] ChatDataが未定義です');
                        throw new Error('ChatDataが初期化されていません');
                    }
                    
                    if (typeof window.AuthState === 'undefined') {
                        console.error('[iframe] AuthStateが未定義です');
                        throw new Error('AuthStateが初期化されていません');
                    }
                    
                    const character = ChatData?.currentCharacter || 'unknown';
                    const isRegistered = window.AuthState?.isRegistered() || false;
                    
                    console.log('[iframe] データ取得開始:', {
                        character,
                        isRegistered,
                        hasChatData: !!ChatData,
                        hasAuthState: !!window.AuthState
                    });
                    
                    // メッセージカウントを取得
                    let messageCount = 0;
                    let conversationHistory = [];
                    
                    if (isRegistered) {
                        // 登録ユーザーの場合
                        const historyData = ChatData?.conversationHistory;
                        if (historyData && historyData.recentMessages) {
                            conversationHistory = Array.isArray(historyData.recentMessages) ? historyData.recentMessages : [];
                            messageCount = conversationHistory.filter(msg => msg && msg.role === 'user').length;
                        }
                    } else {
                        // ゲストユーザーの場合
                        if (typeof ChatData?.getUserMessageCount === 'function') {
                            messageCount = ChatData.getUserMessageCount(character) || 0;
                            console.log('[iframe] ゲストメッセージ数を取得:', {
                                character,
                                messageCount,
                                method: 'getGuestMessageCount'
                            });
                        } else {
                            console.warn('[iframe] ChatData.getUserMessageCountが関数ではありません');
                        }
                        
                        if (typeof ChatData?.getConversationHistory === 'function') {
                            conversationHistory = ChatData.getConversationHistory(character) || [];
                            console.log('[iframe] ゲスト会話履歴を取得:', {
                                character,
                                historyLength: conversationHistory.length,
                                userMessages: conversationHistory.filter(msg => msg && msg.role === 'user').length
                            });
                        } else {
                            console.warn('[iframe] ChatData.getConversationHistoryが関数ではありません');
                        }
                        
                        // 会話履歴からもメッセージ数を計算（フォールバック）
                        // messageCountが0でも、会話履歴があれば正しい値を計算
                        if (conversationHistory && conversationHistory.length > 0) {
                            const historyUserMessages = conversationHistory.filter(msg => msg && msg.role === 'user').length;
                            console.log('[iframe] 会話履歴からメッセージ数を計算:', {
                                historyLength: conversationHistory.length,
                                userMessages: historyUserMessages,
                                currentMessageCount: messageCount
                            });
                            
                            // messageCountが0または、履歴から計算した値の方が大きい場合は更新
                            if (messageCount === 0 || historyUserMessages > messageCount) {
                                console.log('[iframe] ⚠️ メッセージ数を修正:', {
                                    oldCount: messageCount,
                                    newCount: historyUserMessages,
                                    reason: messageCount === 0 ? 'messageCountが0のため' : '履歴の方が大きいため'
                                });
                                messageCount = historyUserMessages;
                                
                                // 修正した値をsessionStorageに保存（次回から正しい値が取得できるように）
                                if (typeof ChatData?.setGuestMessageCount === 'function') {
                                    ChatData.setUserMessageCount(character, historyUserMessages);
                                    console.log('[iframe] ✅ 修正したメッセージ数をsessionStorageに保存しました');
                                }
                            }
                        } else if (messageCount === 0) {
                            console.warn('[iframe] ⚠️ メッセージ数が0で、会話履歴も空です');
                        }
                    }
                    
                    // 現在の状態を取得
                    const currentState = {
                        character: character,
                        messageCount: messageCount,
                        conversationHistoryLength: conversationHistory.length,
                        isRegistered: isRegistered
                    };
                    
                    const responseData = {
                        type: 'CHAT_DATA_RESPONSE',
                        data: {
                            character: character,
                            messageCount: messageCount,
                            conversationHistory: conversationHistory,
                            currentState: currentState,
                            timestamp: Date.now()
                        }
                    };
                    
                    console.log('[iframe] 📤 チャットデータを送信します:', {
                        character,
                        messageCount,
                        historyLength: conversationHistory.length,
                        targetOrigin: event.origin,
                        hasEventSource: !!event.source
                    });
                    
                    // 親ウィンドウにデータを送信
                    if (event.source && event.source.postMessage) {
                        event.source.postMessage(responseData, event.origin);
                        console.log('[iframe] ✅ チャットデータを親ウィンドウに送信しました', currentState);
                    } else {
                        console.error('[iframe] ❌ event.sourceが無効です:', event.source);
                        // フォールバック: window.parentに送信
                        if (window.parent && window.parent !== window) {
                            window.parent.postMessage(responseData, '*');
                            console.log('[iframe] ✅ フォールバック: window.parentに送信しました');
                        }
                    }
                } catch (error) {
                    console.error('[iframe] ❌ チャットデータ取得エラー:', error);
                    const errorResponse = {
                        type: 'CHAT_DATA_ERROR',
                        error: error.message
                    };
                    
                    if (event.source && event.source.postMessage) {
                        event.source.postMessage(errorResponse, event.origin);
                    } else if (window.parent && window.parent !== window) {
                        window.parent.postMessage(errorResponse, '*');
                    }
                }
                break;
        }
    });
});

// ========================================
// 雪乃の登録ボタン表示関数
// ========================================
function showYukinoRegistrationButtons() {
    console.log('[雪乃登録ボタン] ボタン表示関数が呼ばれました');
    
    // 既存のコンテナがあれば削除
    const existingContainer = document.getElementById('yukinoRegistrationContainer');
    if (existingContainer) {
        console.log('[雪乃登録ボタン] 既存のボタンを削除します');
        existingContainer.remove();
    }
    
    const character = 'yukino';
    const info = ChatData.characterInfo[character];
    
    // 会話履歴はデータベースで管理されるため、sessionStorageへの保存は不要
    
    // コンテナを作成（メッセージコンテナ内に表示）
    const container = document.createElement('div');
    container.id = 'yukinoRegistrationContainer';
    container.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
        padding: 25px 30px;
        margin: 20px 10px 30px 10px;
        background: rgba(255, 255, 255, 0.98);
        border-radius: 16px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        border: 2px solid rgba(102, 126, 234, 0.2);
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.5s ease, transform 0.5s ease;
        visibility: visible !important;
    `;
    
    // 説明テキスト
    const explanation = document.createElement('p');
    explanation.textContent = 'ここから先はユーザー登録が必要となります。';
    explanation.style.cssText = 'margin: 0 0 10px 0; font-size: 16px; color: #333; text-align: center; line-height: 1.6; font-weight: 500;';
    container.appendChild(explanation);
    
    // 詳細説明（安心情報）
    const detailInfo = document.createElement('div');
    detailInfo.style.cssText = `
        margin: 0 0 15px 0;
        padding: 12px 16px;
        background: rgba(102, 126, 234, 0.05);
        border-radius: 8px;
        border-left: 3px solid rgba(102, 126, 234, 0.4);
    `;
    
    const detailText1 = document.createElement('p');
    detailText1.textContent = 'ニックネームと生年月日を登録するだけの作業、それ以外の個人情報の入力はありませんので安心してください。';
    detailText1.style.cssText = 'margin: 0 0 8px 0; font-size: 13px; color: #555; text-align: left; line-height: 1.7;';
    detailInfo.appendChild(detailText1);
    
    const detailText2 = document.createElement('p');
    detailText2.textContent = 'ユーザー登録で料金の請求の発生はありません。';
    detailText2.style.cssText = 'margin: 0; font-size: 13px; color: #555; text-align: left; line-height: 1.7; font-weight: 600;';
    detailInfo.appendChild(detailText2);
    
    container.appendChild(detailInfo);
    
    // 質問テキスト
    const question = document.createElement('p');
    question.textContent = 'ユーザー登録をしますか？';
    question.style.cssText = 'margin: 0 0 15px 0; font-size: 17px; font-weight: 600; color: #222; text-align: center;';
    container.appendChild(question);
    
    // ボタンコンテナ
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;';
    
    // 元のイベントを保存する配列
    const originalEvents = [];
    
    // 元の状態を復元する関数
    const restoreOriginalState = () => {
        // メッセージ入力欄を元に戻す
        if (window.ChatUI.messageInput) {
            window.ChatUI.messageInput.disabled = false;
            window.ChatUI.messageInput.placeholder = 'メッセージを入力...';
            console.log('[雪乃登録ボタン] メッセージ入力欄を有効化しました');
        }
        
        // タロットボタンを元に戻す
        originalEvents.forEach(({ button, originalOnClick }) => {
            button.onclick = originalOnClick;
            console.log('[雪乃登録ボタン] タロットカードボタンのイベントを復元しました:', button.textContent);
        });
    };
    
    // 「はい」ボタン
    const yesButton = document.createElement('button');
    yesButton.textContent = 'はい';
    yesButton.style.cssText = 'padding: 14px 40px; font-size: 16px; font-weight: 600; color: white; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 10px; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);';
    yesButton.onclick = () => {
        console.log('[雪乃登録ボタン] 「はい」がクリックされました');
        
        // タロットボタンと入力欄を元に戻す
        restoreOriginalState();
        
        container.remove();
        // 登録画面へ遷移
        setTimeout(() => {
            window.location.href = '../auth/register.html?redirect=' + encodeURIComponent(window.location.href);
        }, 300);
    };
    
    // ホバーエフェクト
    yesButton.onmouseenter = () => {
        yesButton.style.transform = 'translateY(-2px)';
        yesButton.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
    };
    yesButton.onmouseleave = () => {
        yesButton.style.transform = 'translateY(0)';
        yesButton.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
    };
    
    // 「いいえ」ボタン
    const noButton = document.createElement('button');
    noButton.textContent = 'いいえ';
    noButton.style.cssText = 'padding: 14px 40px; font-size: 16px; font-weight: 600; color: #666; background: #f5f5f5; border: 2px solid #ddd; border-radius: 10px; cursor: pointer; transition: all 0.3s ease;';
    noButton.onclick = () => {
        console.log('[雪乃登録ボタン] 「いいえ」がクリックされました');
        
        // タロットボタンと入力欄を元に戻す
        restoreOriginalState();
        
        // 笹岡のお別れメッセージを表示
        const farewellMessage = 'わかりました。それではまた何かあったら連絡ください。これまでの会話の中身は私は忘れてしまうと思うので、今度来た時にはゼロから話をしてくださいね。お待ちしています。';
        window.ChatUI.addMessage('character', farewellMessage, info.name);
        
        // 【変更】ゲストモードで会話したことを記録しない（データベースベースの判断）
        // localStorageへの保存を削除
        
        // ボタンを削除
        container.remove();
        
        // カウントをクリア
        ChatData.setUserMessageCount(character, 0);
        
        // 雪乃のタロット関連フラグをクリア
        sessionStorage.removeItem('yukinoThreeCardsPrepared');
        sessionStorage.removeItem('yukinoAllThreeCards');
        sessionStorage.removeItem('yukinoRemainingCards');
        sessionStorage.removeItem('yukinoTarotCardForExplanation');
        sessionStorage.removeItem('yukinoSummaryShown');
        sessionStorage.removeItem('yukinoFirstMessageInSession');
        sessionStorage.removeItem('yukinoConsultationStarted');
        sessionStorage.removeItem('yukinoConsultationMessageCount');
        sessionStorage.removeItem('yukinoRegistrationButtonShown');
        
        // 3秒後にmain.htmlへリダイレクト
        setTimeout(() => {
            window.location.href = '../main.html';
        }, 3000);
    };
    
    // ホバーエフェクト
    noButton.onmouseenter = () => {
        noButton.style.background = '#e8e8e8';
        noButton.style.borderColor = '#ccc';
    };
    noButton.onmouseleave = () => {
        noButton.style.background = '#f5f5f5';
        noButton.style.borderColor = '#ddd';
    };
    
    buttonContainer.appendChild(yesButton);
    buttonContainer.appendChild(noButton);
    container.appendChild(buttonContainer);
    
    // メッセージコンテナに追加
    if (window.ChatUI && window.ChatUI.messagesDiv) {
        window.ChatUI.messagesDiv.appendChild(container);
        console.log('[雪乃登録ボタン] メッセージコンテナに追加しました');
        
        // フェードインアニメーション
        setTimeout(() => {
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
            console.log('[雪乃登録ボタン] フェードイン完了');
        }, 100);
        
        // スクロールして表示
        setTimeout(() => {
            if (window.ChatUI.scrollToLatest) {
                window.ChatUI.scrollToLatest();
                console.log('[雪乃登録ボタン] スクロール完了');
            }
        }, 200);
        
        // メッセージ入力欄を無効化し、ガイダンスを表示
        if (window.ChatUI.messageInput) {
            window.ChatUI.messageInput.disabled = true;
            window.ChatUI.messageInput.placeholder = 'ユーザー登録後にメッセージの送信ができますのでお待ちください';
            console.log('[雪乃登録ボタン] メッセージ入力欄を無効化しました');
        }
        
        // タロットカードボタンが存在する場合、クリックイベントをオーバーライド
        const tarotButtons = document.querySelectorAll('button');
        tarotButtons.forEach(button => {
            if (button.textContent.includes('タロットカードを引く') || 
                button.textContent.includes('カードをめくる') ||
                button.textContent.includes('拡大する') ||
                button.textContent.includes('雪乃の解説')) {
                // 元のクリックイベントを保存
                const originalOnClick = button.onclick;
                originalEvents.push({ button, originalOnClick });
                
                // 新しいクリックイベントを設定
                button.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // ガイダンスメッセージを表示
                    window.ChatUI.addMessage(
                        'error',
                        'ユーザー登録案内中のため、タロットカードの表示はできません。ユーザー登録後に再度雪乃さんにタロットカードの鑑定を頼んでください。',
                        'システム'
                    );
                    
                    console.log('[雪乃登録ボタン] タロットカードボタンがクリックされましたが、登録案内中のため無効化しました');
                    
                    // スクロールして表示
                    setTimeout(() => {
                        if (window.ChatUI.scrollToLatest) {
                            window.ChatUI.scrollToLatest();
                        }
                    }, 100);
                };
                
                console.log('[雪乃登録ボタン] タロットカードボタンのクリックイベントをオーバーライドしました:', button.textContent);
            }
        });
        
    } else {
        console.error('[雪乃登録ボタン] ⚠️ window.ChatUI.messagesDiv が見つかりません');
    }
}