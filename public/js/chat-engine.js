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
// デバッグ設定
// ============================================
const DEBUG_MODE = true; // デバッグ用: 問題追跡中のため有効化

// ============================================
// 待機画面タイプの定義
// ============================================
const LOADING_SCREEN_TYPE = {
    INITIAL_ENTRY: 'initial_entry',      // ページ入室時（初期ローディングアニメー��ョン）
    MESSAGE_RESPONSE: 'message_response'  // メッセージ送信時（チャット内待機メッセージ）
};

// ============================================
// タイムライン記録機能
// ============================================
if (!window._debugTimeline) {
    window._debugTimeline = [];
    window._timelineStartTime = Date.now();
    window._testMode = false; // テストモードフラグ
}

/**
 * タイムラインにエントリを追加
 * @param {string} source - ログソース（chat-engine.js など）
 * @param {string} message - ログメッセージ
 */
function addToTimeline(source, message) {
    if (!window._testMode) return; // テストモード時のみ記録
    
    const elapsed = Date.now() - window._timelineStartTime;
    window._debugTimeline.push({
        timestamp: new Date().toLocaleTimeString('ja-JP', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }),
        elapsed: `${elapsed}ms`,
        source: source,
        message: typeof message === 'string' ? message : JSON.stringify(message)
    });
}

/**
 * デバッグログ出力（本番では無効化）
 * @param {...any} args - console.logに渡す引数
 */
function debugLog(...args) {
    if (DEBUG_MODE) {
        const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
        addToTimeline('debugLog', message);
        console.log(...args);
    }
}

// ============================================
// ユーティリティ関数
// ============================================

/**
 * URLパラメータを取得（キャッシュ付き）
 * @returns {URLSearchParams} URLパラメータ
 */
function getUrlParams() {
    if (!window._chatUrlParams) {
        window._chatUrlParams = new URLSearchParams(window.location.search);
    }
    return window._chatUrlParams;
}

/**
 * userIdを数値型にパース（バリデーション付き）
 * @param {any} value - パース対象の値
 * @returns {number|null} 有効なuserIdまたはnull
 */
function parseUserId(value) {
    // 数値型の場合
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value;
    }

    // 文字列型の場合
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }
    }

    return null;
}

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

        
        if (userInfo && userInfo.userId) {
            userId = parseUserId(userInfo.userId);
            if (userId) {

            } else {
            }
        }
        
        // userInfoから取得できない場合、URLパラメータから取得（フォールバック）
        if (!userId) {
            const urlParams = getUrlParams();
            const userIdParam = urlParams.get('userId');
            if (userIdParam) {
                userId = parseUserId(userIdParam);
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

                    // 404の場合は、ユーザーが登録されていない可能性がある
                    throw new Error('USER_NOT_FOUND');
                }
                
                // ネットワークエラーやサーバーエラーの可能性
                throw new Error('NETWORK_ERROR');
            }
            
            // 【変更】データベースから取得した情報をlocalStorageに保存しない
            // すべてのユーザー情報はデータベースから取得する
            if (data) {

            }
            
            return data;
        } catch (error) {
            console.error('[loadConversationHistory] エラー:', error);

            // 既に定義されたエラーの場合はそのまま投げる
            if (error instanceof Error &&
                (error.message === 'USER_NOT_FOUND' || error.message === 'NETWORK_ERROR')) {
                throw error;
            }

            // その他のエラーはネットワークエラーとして扱う
            throw new Error('NETWORK_ERROR');
        }
    },

    /**
     * メッセージを送信してAI応答を取得
     * @param {string} message - 送信するメッセージ
     * @param {string} characterId - キャラクターID
     * @param {Array} conversationHistory - 会話履歴
     * @param {Object} options - オプション設定
     * @param {string} [options.forceProvider] - プロバイダーを強制指定（'deepseek' | 'openai'）
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
        const urlParams = getUrlParams();
        let userId = null;
        const userIdParam = urlParams.get('userId');
        if (userIdParam) {
            userId = parseUserId(userIdParam);
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
        const urlParams = getUrlParams();
        let userId = null;
        const userIdParam = urlParams.get('userId');
        if (userIdParam) {
            userId = parseUserId(userIdParam);
        }

        if (!userId) {
            throw new Error('ユーザーIDが見つかりません');
        }

        if (!character) {
            throw new Error('キャラクターIDが指定されていません');
        }

        
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

            
            // sessionStorageの値と一致するか確認（デバッグ用）
            const GUEST_COUNT_KEY_PREFIX = 'guestMessageCount_'; // 後方互換性のためキー名は変更しない
            const key = GUEST_COUNT_KEY_PREFIX + character;
            const storedCount = sessionStorage.getItem(key);
            if (storedCount !== null) {
                const storedCountNum = Number.parseInt(storedCount, 10);
                if (storedCountNum !== userMessageCount) {
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

        return 0;
    },

    /**
     * 【後方互換性】getGuestMessageCount → getUserMessageCount のエイリアス
     * @deprecated getUserMessageCountを使用してください
     */
    getGuestMessageCount(character) {
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

    },

    /**
     * 【後方互換性】setGuestMessageCount → setUserMessageCount のエイリアス
     * @deprecated setUserMessageCountを使用してください
     */
    setGuestMessageCount(character, count) {
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

        
        const character = this.characterInfo[characterId];
        if (!character || !character.messages) {

            return `${nickname}さん、初めまして。`;
        }
        
        // 初めて笹岡と会話するユーザーは、他のキャラクターとの会話履歴に関係なく、常にfirstTimeGuestを使用
        let messageTemplate = null;
        if (character.messages.firstTimeGuest) {
            messageTemplate = character.messages.firstTimeGuest;

        } else {

        }
        
        if (!messageTemplate) {
            // firstTimeGuestが設定されていない場合は、デフォルトメッセージを返す

            return `${nickname}さん、初めまして。`;
        }
        
        // テンプレート変数を含まない可能性があるため、その場合はそのまま返す
        if (!messageTemplate.includes('{nickname}')) {

            return messageTemplate;
        }

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

        };
        // #endregion
        
        // #region agent log
        // #endregion
        // 重複実行を防ぐフラグをチェック
        if (this._initPageRunning) {
            // #region agent log
            // #endregion
            // #region agent log (開発環境のみ - コメントアウト)
            // ローカルロギングサーバーへの接続は開発環境でのみ有効
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // }
            // #endregion
            return;
        }
        if (this._initPageCompleted) {
            // #region agent log
            // #endregion
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // }
            // #endregion
            return;
        }
        this._initPageRunning = true;
        
        // 【追加】userIdがURLパラメータにある場合、エントリーフォームを非表示にしてチャットコンテナを表示
        const urlParams = getUrlParams();
        const userId = urlParams.get('userId');

        if (userId) {
            const entryFormContainer = document.getElementById('entryFormContainer');
            const chatContainer = document.getElementById('chatContainer');

            if (entryFormContainer && chatContainer) {
                entryFormContainer.classList.add('entry-form-hidden');
                chatContainer.classList.remove('entry-form-hidden');


            } else {
                console.error('[初期化] 要素が見つかりません:', {
                    entryFormContainer: !!entryFormContainer,
                    chatContainer: !!chatContainer
                });
            }
        } else {

        }
        
        // #region agent log (開発環境のみ - コメントアウト)
        // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // }
        // #endregion
        // テストモードチェックは、chat-engine.jsの最初（DOMContentLoadedの外）で実行されるため、
        // ここでは実行しない（重複を避ける）
        
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
        // }
        // #endregion
        // characterIdを指定して単一キャラクターデータのみ読み込む（効率化）
        await ChatData.loadCharacterData(character);
        // #region agent log (開発環境のみ - コメントアウト)
        // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // }
        // #endregion
        if (Object.keys(ChatData.characterInfo).length === 0) {
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
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

            // #region agent log
            // #endregion
        }
        
        // #region agent log

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


        // 登録完了時の処理を先にチェック（会話履歴を読み込む前に実行）
        // 【変更】hasValidSessionのチェックを削除（historyDataの取得後に判定）
        if (justRegistered || shouldTriggerRegistrationFlow) {

            
            try {
                // 【重要】データベースから最新のユーザー情報を取得
                // これにより、APIが確実にデータベースからユーザー情報を読み込んでいることを確認

                let historyData = null;
                let dbUserNickname = null;
                try {
                    // #region agent log
                    // #endregion
                    // #region agent log
                // #endregion
                historyData = await ChatAPI.loadConversationHistory(character);
                // #region agent log
                // #endregion
                    // #region agent log
                    // #endregion
                    if (historyData && historyData.nickname) {
                        dbUserNickname = historyData.nickname;
                        // 【変更】データベースから取得した情報をlocalStorageに保存しない
                        ChatData.userNickname = dbUserNickname;

                    } else {
                        // データベースにユーザー情報がない場合（初回登録直後）

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
                    dbUserNickname = 'あなた';
                    ChatData.userNickname = dbUserNickname;
                    historyData = null;
                }
                
                
                // キャラクター専用ハンドラーの初期化処理を呼び出す
                const handler = CharacterRegistry.get(character);
                if (handler && typeof handler.initPage === 'function') {
                    const result = await handler.initPage(urlParams, historyData, justRegistered, shouldTriggerRegistrationFlow);
                    if (result && result.completed) {

                        return; // 処理終了
                    }
                    if (result && result.skip) {

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

                    
                    // 【重要】先に会話履歴を画面に表示
                    conversationHistory.forEach((entry) => {
                        // システムメッセージ（isSystemMessage: true）は画面に表示しない
                        if (entry.isSystemMessage) {
                            const content = entry.content || entry.message || '';
                            if (content) {

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

                } else {
                    // 会話履歴がない場合：新規ユーザーとして初回メッセージを表示
                    // 【重要】データベースから取得したニックネームを使用

                    const nicknameForMessage = dbUserNickname || ChatData.userNickname || 'あなた';

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

                }
            }
            
            // 守護神の儀式完了直後のフラグを事前にチェック
            const guardianMessageShown = sessionStorage.getItem('guardianMessageShown') === 'true';
            
            // 会話履歴を読み込む
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // }
            // #endregion
            let historyData = null;
            try {
                // #region agent log
                // #endregion
                historyData = await ChatAPI.loadConversationHistory(character);
                // #region agent log
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
                    return false;
                }
                
                // 会話履歴がある場合：非同期メッセージ生成方式
                // 【改善】履歴を即座に表示し、「考え中...」を表示してからバックグラウンドで動的メッセージを生成
                if (historyData && historyData.hasHistory) {

                    
                    // バックグラウンドで動的メッセージを生成（非同期）
                    const generateMessageAsync = async () => {
                        try {
                            const visitPattern = historyData.visitPattern || 'returning';

                            // ローディング画面を表示
                            if (window.ChatLoadingAnimation) {
                                const nicknameForLoading = historyData?.nickname || ChatData.userNickname || 'ユーザー';
                                ChatLoadingAnimation.show(character, nicknameForLoading);
                            }

                            // パフォーマンス測定
                            const apiCallStart = performance.now();

                            
                            // 【変更】conversationHistoryは渡さない（generate-welcome.tsでデータベースから取得）
                            // 履歴は表示しないが、システムプロンプト生成のためにvisitPatternを渡す
                            // バックエンドでデータベースから履歴を取得し、システムプロンプトに含める
                            const welcomeMessage = await ChatAPI.generateWelcomeMessage({
                                character,
                                conversationHistory: [], // 空配列を渡す（バックエンドでデータベースから取得）
                                visitPattern
                            });
                            
                            const apiCallEnd = performance.now();

                            // ローディング画面を非表示
                            if (window.ChatLoadingAnimation) {
                                ChatLoadingAnimation.hide();
                            }

                            
                            // bodyのfade-inクラスを追加（チャット画面を表示）
                            if (document.body) {
                                document.body.classList.add('fade-in');

                            }
                            
                            // メッセージを直接表示（「考え中...」メッセージは表示していないため、直接追加）
                            if (window.ChatUI) {
                                window.ChatUI.addMessage('welcome', welcomeMessage, info.name);

                            } else {
                                console.error('[初期化] ChatUIが利用できません');
                            }
                            
                            // 【削除】フラグは不要（awaitにより同期処理になるため）
                        } catch (error) {
                            console.error(`[初期化] ${info.name}の再訪問時：動的メッセージ生成エラー:`, error);
                            
                            // ローディング画面を非表示
                            if (window.ChatLoadingAnimation) {
                                ChatLoadingAnimation.hide();
                            }
                            
                            // bodyのfade-inクラスを追加（チャット画面を表示）
                            if (document.body) {
                                document.body.classList.add('fade-in');

                            }
                            
                            // エラー時はフォールバック（定型文）
                            // 「考え中...」メッセージは表示していないため、直接追加
                            const fallbackMessage = ChatData.generateInitialMessage(character, historyData);
                            if (window.ChatUI) {
                                window.ChatUI.addMessage('welcome', fallbackMessage || 'お帰りなさい。', info.name);

                            }
                            
                            // 【削除】フラグは不要（awaitにより同期処理になるため）
                        }
                    };
                    
                    // 【重要】再訪問時のメッセージ生成が完了するまで待つ
                    // これにより、initPage()の最終チェックが実行される前にメッセージが表示される
                    try {
                        await generateMessageAsync();

                    } catch (error) {
                        console.error(`[初期化] ${info.name}の再訪問時：generateMessageAsyncエラー:`, error);
                        
                        // bodyのfade-inクラスを追加（チャット画面を表示）
                        if (document.body) {
                            document.body.classList.add('fade-in');

                        }
                        
                        // エラー時はフォールバックメッセージを表示
                        // 「考え中...」メッセージは表示していないため、直接追加
                        if (window.ChatUI) {
                            const fallbackMessage = ChatData.generateInitialMessage(character, historyData) || 'お帰りなさい。';
                            window.ChatUI.addMessage('welcome', fallbackMessage, info.name);

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

                            
                            try {

                                
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

                                    return true;
                                } else {
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

                                    // ローディング画面を表示（初期入室時）
                                    if (window.ChatLoadingAnimation) {
                                        console.log('[chat-engine] 初期入室時の待機画面を表示:', LOADING_SCREEN_TYPE.INITIAL_ENTRY);
                                        window._currentLoadingScreenType = LOADING_SCREEN_TYPE.INITIAL_ENTRY;
                                        ChatLoadingAnimation.show(character, ChatData.userNickname || 'ユーザー');
                                    }
                                    
                                    const welcomeMessage = await ChatAPI.generateWelcomeMessage({
                                        character,
                                        conversationHistory,
                                        visitPattern
                                    });

                                    // ローディング画面を非表示
                                    if (window.ChatLoadingAnimation) {
                                        ChatLoadingAnimation.hide();
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
                                    
                                    // ローディング画面を非表示
                                    if (window.ChatLoadingAnimation) {
                                        ChatLoadingAnimation.hide();
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

                            } catch (error) {
                                console.error(`[初期化] ${info.name}の初回訪問時：generateFirstMessageAsyncエラー:`, error);
                                
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

                            break;
                    }
                } else if (handlerForFirstMessage && typeof handlerForFirstMessage.getGuardianConfirmationMessage === 'function' && !guardianMessageShown && !handlerSkippedFirstMessage) {
                    // 【スケーラビリティ改善】守護神確認メッセージの取得をハンドラーに委譲
                    const userNickname = historyData.nickname || ChatData.userNickname || 'あなた';
                    
                    // 【楓専用処理】楓の場合は、APIが守護神情報を確認して返答を生成する
                    if (character === 'kaede' && historyData && historyData.assignedDeity) {
                        try {

                            
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

                                return true;
                            } else {
                                // APIから返答を取得できなかった場合は、ハンドラーのメッセージを使用
                                const guardianConfirmationMessage = handlerForFirstMessage.getGuardianConfirmationMessage(historyData, userNickname);
                                if (guardianConfirmationMessage) {

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
            // }
            // #endregion

            
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

            
            // 雪乃の個別相談モード開始直後の定型文を表示（現在は使用されていない）
            if (false && character === 'yukino') {
                const consultationStarted = sessionStorage.getItem('yukinoConsultationStarted') === 'true';
                const messageCount = parseInt(sessionStorage.getItem('yukinoConsultationMessageCount') || '0', 10);
                
                if (consultationStarted && messageCount === 0) {

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

                    // 初回メッセージ表示をスキップするため、ここで処理を終了
                    return;
                }
            }
            
            // 初回メッセージを表示
            // ただし、守護神の儀式完了直後（guardianMessageShown）の場合は、既に守護神確認メッセージを表示済みなのでスキップ
            // ※guardianMessageShownは上で既に定義済み
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // }
            // #endregion
            
            if (historyData && historyData.hasHistory) {
                // #region agent log (開発環境のみ - コメントアウト)
                // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
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

                        
                        // 【修正】メッセージを追加した後に、guardianMessageShownフラグを設定して、次回以降の表示を抑制
                        sessionStorage.setItem('guardianMessageShown', 'true');

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
                    // #endregion
                    if (handlerResult && handlerResult.completed) {

                        // 【修正】ハンドラーで処理完了する前に待機画面を非表示にする
                        if (typeof window.hideLoadingScreen === 'function') {
                            window.hideLoadingScreen();

                        }
                        return; // 処理終了
                    }
                    if (handlerResult && handlerResult.skip) {

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

                let handlerSkippedFirstMessage = false;
                if (handler && typeof handler.initPage === 'function') {

                    const handlerResult = await handler.initPage(urlParams, historyData, justRegistered, shouldTriggerRegistrationFlow, {
                        guardianMessageShown
                    });

                    if (handlerResult && handlerResult.completed) {

                        return; // 処理終了
                    }
                    if (handlerResult && handlerResult.skip) {

                        handlerSkippedFirstMessage = true; // 初回メッセージの表示はスキップ（ハンドラーで処理済み）
                    }
                } else if (!handler) {
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

                    // historyDataが取得できなかった場合でも、ハンドラーにnullを渡して処理を委譲
                    const handlerResult = await handler.initPage(urlParams, historyData, justRegistered, shouldTriggerRegistrationFlow, {
                        guardianMessageShown
                    });

                    if (handlerResult && handlerResult.completed) {

                        return; // 処理終了
                    }
                    if (handlerResult && handlerResult.skip) {

                        handlerSkippedFirstMessage = true; // 初回メッセージの表示はスキップ（ハンドラーで処理済み）
                    }
                } else if (!handler) {
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
            // }
            // #endregion
            
            // 【追加】すべての初期化が完了したら待機画面を非表示
            // #region agent log
            // #endregion
            if (typeof window.hideLoadingScreen === 'function') {
                window.hideLoadingScreen();

                // #region agent log
                // #endregion
            } else {
                // #region agent log
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

            }
            
            this._initPageRunning = false;
            this._initPageCompleted = true;
        } catch (error) {
            // エラーが発生した場合、character変数がまだ定義されていない可能性があるため、
            // URLパラメータまたはChatData.currentCharacterから取得
            const urlParams = getUrlParams();
            let character = ChatData?.currentCharacter || urlParams.get('character') || 'kaede';
            
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // }
            // #endregion
            
            // 【追加】エラー時も待機画面を非表示
            // #region agent log
            // #endregion
            if (typeof window.hideLoadingScreen === 'function') {
                window.hideLoadingScreen();

                // #region agent log
                // #endregion
            } else {
                // #region agent log
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

                    return; // 処理終了
                }
                if (handlerResult && handlerResult.skip) {

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
            return;
        }
        
        // メッセージ入力欄が無効化されている場合は送信をブロック
        if (window.ChatUI.messageInput && window.ChatUI.messageInput.disabled) {

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

        
        // エラー時にもフラグをリセットするためにtry-finallyを使用
        // waitingMessageIdを関数スコープで宣言（catchブロックからもアクセスできるように）
        let waitingMessageId = null;
        let handler = null;
        
        try {
            // ハンドラーを取得（全フローで使用）
            handler = CharacterRegistry.get(character);
            
            // タロットカード解説トリガーマーカーを検出
            const isTarotExplanationTrigger = message.includes('[TAROT_EXPLANATION_TRIGGER:');
            
            // メッセージ送信ボタンを押した時点で、即座にカウントを開始
            if (!isTarotExplanationTrigger) {
                // 個別相談モードのチェック（ハンドラーに委譲）
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

                    
                    // 【スケーラビリティ改善】セッション最初のメッセージ記録をハンドラーに委譲
                    const handlerForFirstMessage2 = CharacterRegistry.get(character);
                    if (handlerForFirstMessage2 && typeof handlerForFirstMessage2.onFirstMessageInSession === 'function') {
                        handlerForFirstMessage2.onFirstMessageInSession(message, isTarotExplanationTrigger);
                    }
                } else {

                }
                
                // reading-animation.htmlでAPIリクエスト時にメッセージカウントを送信できるように、sessionStorageに保存
                // この時点で、会話履歴にメッセージが追加されていることを確認済み
                sessionStorage.setItem('lastGuestMessageCount', String(messageCount));

                
                // メッセージ送信直後に親ウィンドウに通知（分析パネル更新用）
                if (window.parent && window.parent !== window) {
                    try {
                        window.parent.postMessage({
                            type: 'CHAT_MESSAGE_SENT',
                            character: character,
                            messageCount: messageCount,
                            timestamp: Date.now()
                        }, '*');

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
                } else {

                    console.log('[chat-engine] ユーザーメッセージを追加します:', messageToSend);
                    window.ChatUI.addMessage('user', messageToSend, 'あなた');
                    // ユーザーメッセージのアニメーション（フェードイン）が完了するまで待機
                    // CSS アニメーション時間は通常 300ms～500ms なので、安全マージンを含めて 600ms 待機
                    await this.delay(600);
                    console.log('[chat-engine] ユーザーメッセージのアニメーション完了');
                    console.log('[chat-engine] スクロール完了');
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
            
            // 新しいローディングシステムを使用して待機メッセージを表示（メッセージ送信時）
            const characterInfo = ChatData.characterInfo[character];
            const loadingCharacterName = characterInfo ? characterInfo.name : 'アシスタント';
            
            console.log('[chat-engine] メッセージ送信時の待機画面を表示:', LOADING_SCREEN_TYPE.MESSAGE_RESPONSE);
            console.log('[chat-engine] キャラクター:', loadingCharacterName);
            
            if (window.LoadingManager) {
                window._currentLoadingScreenType = LOADING_SCREEN_TYPE.MESSAGE_RESPONSE;
                // ユーザーメッセージの表示完了時刻を記録
                // これにより、待機メッセージの最小表示時間が正しく計算される
                const userMessageDisplayTime = Date.now();
                console.log('[chat-engine] ユーザーメッセージ表示完了時刻:', userMessageDisplayTime);
                window.LoadingManager.showLoading(loadingCharacterName, userMessageDisplayTime);
            } else {
                console.warn('[chat-engine] ⚠️ LoadingManager が定義されていません');
            }
            
            // メッセージ入力欄と送信ボタンを無効化
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

                        }
                    }
                }
                
                // メッセージカウントを取得：会話履歴からユーザーメッセージ数を計算（今回送信するメッセージは含まれていない）
                let messageCountForAPI = conversationHistory.filter(msg => msg && msg.role === 'user').length;
                
                // 個別相談モードのチェック（既に上で handler を取得済み）
                const isConsultationMode = handler && typeof handler.isConsultationMode === 'function' 
                    ? handler.isConsultationMode() 
                    : false;
                
                if (isConsultationMode && handler && typeof handler.getConsultationMessageCount === 'function') {
                    // 個別相談モードの場合は、ハンドラーからカウントを取得
                    const currentCount = handler.getConsultationMessageCount();
                    messageCountForAPI = currentCount;

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

                    window.location.href = response.redirectUrl;
                    return;
                }
                
                // 応答メッセージを表示
                const characterName = ChatData.characterInfo[character]?.name || character;
                let responseText = response.message || response.response || '応答を取得できませんでした';
                
                // #region agent log - APIレスポンスに[SUGGEST_TAROT]タグが含まれているか確認
                if (responseText && typeof responseText === 'string' && responseText.includes('[SUGGEST_TAROT]')) {
                    console.group('🔍 [DEBUG] APIレスポンスに[SUGGEST_TAROT]タグを検出');




                    console.groupEnd();
                } else if (character === 'yukino') {

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

                        }
                    }
                }
                
                // 新しいローディングシステムで待機メッセージを非表示にする
                if (window.LoadingManager) {
                    window.LoadingManager.hideLoading();
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
            
            // 新しいローディングシステムで待機メッセージを非表示にする
            if (window.LoadingManager) {
                window.LoadingManager.hideLoading();
            }
            
            // ハンドラーのonErrorを呼び出す
            const handler = CharacterRegistry.get(character);
            
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

        
        // 【重要】守護神の儀式完了後（guardianMessageShownフラグが設定されている場合）は、lastUserMessageを表示しない
        const guardianMessageShown = sessionStorage.getItem('guardianMessageShown') === 'true';
        const ritualCompleted = sessionStorage.getItem('ritualCompleted') === 'true';

        
        // 【修正】守護神の儀式完了直後（ritualCompletedまたはguardianMessageShown）の場合は、lastUserMessageを完全に無視
        if ((guardianMessageShown || ritualCompleted) && lastUserMessage) {

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

                    window.ChatUI.addMessage('user', userMsgData.message, 'あなた');
                    if (window.ChatUI.messageInput) window.ChatUI.messageInput.blur();
                    setTimeout(() => window.ChatUI.scrollToLatest(), 200);
                } else {

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

                            
                            window.parent.postMessage({
                                type: 'CHAT_MESSAGE_SENT',
                                character: character,
                                messageCount: messageCount,
                                timestamp: Date.now()
                            }, '*');

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

                        
                        // 会話履歴から計算した値の方が大きい、または現在のカウントが0の場合は更新
                        if (historyUserMessages > currentCount || currentCount === 0) {

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

        
            // 【登録ユーザーの場合のみ、以下の処理を実行】

        
        // 送信ボタンを無効化
        if (window.ChatUI.sendButton) window.ChatUI.sendButton.disabled = true;
        
        try {
            // 会話履歴を取得（データベースのguardianカラムを確認するため）
            let historyData = null;
            try {
                // #region agent log
                // #endregion
                historyData = await ChatAPI.loadConversationHistory(character);
                // #region agent log
                // #endregion

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

                
                // ChatData.conversationHistoryを更新
                ChatData.conversationHistory = historyData;
            } 
            // 2. 会話履歴がない場合は空配列
            else {
                conversationHistory = [];

            }

            
            // 【重要】ゲスト履歴の移行が必要な場合は、ダミーメッセージを送信してデータベースに保存
            if (needsMigration && conversationHistory.length > 0) {

                
                // 最初のユーザーメッセージを取得してsessionStorageに保存
                const firstUserMessage = conversationHistory.find(msg => msg.role === 'user');
                if (firstUserMessage && firstUserMessage.content) {
                    sessionStorage.setItem('firstQuestionBeforeRitual', firstUserMessage.content);

                }
                
                // 会話履歴はデータベースで管理されるため、移行処理は不要
            }
            
            // 【重要】ユーザー登録後は、守護神の儀式開始前にカエデのメッセージを表示
            // これにより、儀式完了後にユーザーの履歴が残らない（カエデが最後のメッセージになる）
            const characterName = ChatData.characterInfo[character]?.name || '楓';
            const ritualStartMessage = 'それではこれより守護神のイベントを開始いたします。\n画面が切り替わりますので、儀式を体験してください。';

            
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

            } else {
                // historyDataにuserIdがない場合、現在のURLから取得を試みる
                const currentUrlParams = new URLSearchParams(window.location.search);
                const userId = currentUrlParams.get('userId');
                if (userId) {
                    // 【修正】window.location.hrefを基準にして相対パスを解決
                    const url = new URL(ritualUrl, window.location.href);
                    url.searchParams.set('userId', userId);
                    ritualUrl = url.pathname + url.search;

                }
            }

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
        
        // 楓の場合のみ KaedeHandler でボタン追加
        if (character !== 'kaede' || !window.KaedeHandler || typeof window.KaedeHandler.addRitualStartButton !== 'function') {
            return;
        }
        
        window.KaedeHandler.addRitualStartButton(messageElement, async () => {

            
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

            }
            if (sessionStorage.getItem(countKey)) {
                sessionStorage.removeItem(countKey);

            }
        });
        
        // AuthStateの履歴もクリア
        if (window.AuthState && typeof window.AuthState.resetGuestProgress === 'function') {
            targets.forEach(c => {
                window.AuthState.clearGuestHistory(c);
            });

        }

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

// ===== テストモードチェック（最優先で実行） =====
// URLパラメータに?test=trueがある場合、すべてのキャラクターのゲストフラグをクリア
// これはハンドラーが読み込まれる前に実行される必要があるため、ここで処理する
(function() {
    const urlParams = getUrlParams();
    if (urlParams.get('test') === 'true') {

        // 【変更】localStorageの使用を削除（データベースベースの判断）
        // ゲストフラグはデータベースで管理されるため、localStorageのクリアは不要
        const characters = ['kaede', 'yukino', 'sora', 'kaon'];


    }
})();

// postMessage関連の初期化（DOMContentLoadedの外で即座に実行）
(async function initPostMessageCommunication() {
    'use strict';

    
    // 親ウィンドウに準備完了を通知する関数
    function notifyParentReady() {
        if (window.parent && window.parent !== window) {
            try {
                const urlParams = getUrlParams();
                const character = urlParams.get('character') || 'unknown';

                window.parent.postMessage({
                    type: 'CHAT_IFRAME_READY',
                    character: character,
                    messageCount: 0,
                    timestamp: Date.now(),
                    ready: true
                }, '*');

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

            
            // 簡単な応答を即座に返す
            try {
                const urlParams = getUrlParams();
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

                } else if (window.parent && window.parent !== window) {
                    window.parent.postMessage(responseData, '*');

                }
            } catch (error) {
                console.error('[iframe] ❌ 初期ハンドラーでエラー:', error);
            }
        }
    });

})();

// DOMContentLoaded時に初期化
window.addEventListener('DOMContentLoaded', async () => {
    // #region agent log
    // #endregion
    // 【統合後】依存関係の読み込み待機は不要（統合によりchat-engine.js内で定義済み）
    // deferにより確実に読み込まれるため、直接初期化を実行
    
    // アニメーションページからの復帰を検知
    const urlParams = getUrlParams();
    const isTransitionComplete = urlParams.get('transition') === 'complete';
    
    if (isTransitionComplete) {

        
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

    } else {
    }
    
    // ページを初期化
    // 入口フォームが表示されている場合は初期化をスキップ（ただし、userIdがURLパラメータにある場合は除く）
    const entryFormContainer = document.getElementById('entryFormContainer');
    const chatContainer = document.getElementById('chatContainer');
    const isEntryFormVisible = entryFormContainer && !entryFormContainer.classList.contains('entry-form-hidden');
    
    // userIdがURLパラメータにある場合、エントリーフォームを非表示にしてチャットコンテナを表示
    const domUrlParams = getUrlParams();
    const domUserId = domUrlParams.get('userId');

    
    // 注：この処理は chat.html の初期スクリプトで既に実行済みのため、二重実行を防ぐ
    // ただし、念のため確認して必要に応じて調整
    if (domUserId && !isEntryFormVisible) {
        // 既に正しく非表示になっている（初期スクリプトで処理済み）

    } else if (domUserId && isEntryFormVisible) {
        // 何らかの理由で初期スクリプトの処理が機能していない場合の回復処理
        if (entryFormContainer) {
            entryFormContainer.classList.add('entry-form-hidden');

        }
        if (chatContainer) {
            chatContainer.classList.remove('entry-form-hidden');

        }
    }
    
    // エントリーフォームが表示されている場合（userIdがない場合のみ）は初期化をスキップ
    const isEntryFormStillVisible = entryFormContainer && !entryFormContainer.classList.contains('entry-form-hidden');
    if (isEntryFormStillVisible) {

        // 入口フォームが非表示になったら初期化を実行するイベントリスナーを設定
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const isNowHidden = entryFormContainer.classList.contains('entry-form-hidden');
                    if (isNowHidden) {

                        observer.disconnect();
                        if (!ChatInit._initPageRunning && !ChatInit._initPageCompleted) {
                            ChatInit.initPage().catch(error => {
                                console.error('[chat-engine] 初期化エラー:', error);
                            });
                        } else {

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
        // ========== 追加開始 ==========
        // sessionStorageからAPIレスポンスをチェック
        const apiResponse = sessionStorage.getItem('apiResponse');
        const userMessage = sessionStorage.getItem('userMessage');
        
        if (apiResponse && userMessage) {
            try {
                const data = JSON.parse(apiResponse);
                
                // ユーザーメッセージを表示
                if (window.ChatUI && typeof window.ChatUI.addMessage === 'function') {
                    window.ChatUI.addMessage('user', userMessage, 'あなた');
                }
                
                // キャラクターの返答を表示
                if (data.response) {
                    const character = getUrlParams().get('character');
                    const characterName = getCharacterDisplayName(character);
                    if (window.ChatUI && typeof window.ChatUI.addMessage === 'function') {
                        window.ChatUI.addMessage('character', data.response, characterName);
                    }
                }
                
                // sessionStorageをクリア
                sessionStorage.removeItem('apiResponse');
                sessionStorage.removeItem('userMessage');
                
            } catch (error) {
                console.error('[Chat] APIレスポンスの処理エラー:', error);
                sessionStorage.removeItem('apiResponse');
                sessionStorage.removeItem('userMessage');
            }
        }
        // ========== 追加終了 ==========
        
        await ChatInit.initPage();
    } else {

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

            return true; // 既に通知済みの場合は成功として扱う
        }
        
        // ChatDataとAuthStateが利用可能かチェック
        const hasChatData = typeof ChatData !== 'undefined' && ChatData !== null;
        const hasAuthState = typeof window.AuthState !== 'undefined' && window.AuthState !== null;

        
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

                setTimeout(() => {
                    tryNotifyParent();
                }, 1000);
            });
        } else {
            // 既にDOMContentLoaded済みの場合は即座に実行

            setTimeout(() => {
                tryNotifyParent();
            }, 1000);
        }
        
        // 2. window.load時に1回通知（リソース読み込み完了後）
        if (document.readyState !== 'complete') {
            window.addEventListener('load', () => {

                setTimeout(() => {
                    tryNotifyParent();
                }, 1000);
            });
        } else {
            // 既にload済みの場合も試行

            setTimeout(() => {
                tryNotifyParent();
            }, 1000);
        }
    } else {

    }
    
    // 3. 念のため定期通知（最大10回、2秒ごと）
    // ただし、親ウィンドウが存在する場合のみ実行
    if (window.parent && window.parent !== window) {
        notifyInterval = setInterval(() => {
            notifyAttempts++;

            if (tryNotifyParent()) {
                // 通知成功したら停止

                return;
            }
            
            if (notifyAttempts >= maxNotifyAttempts) {
                clearInterval(notifyInterval);
            }
        }, 2000); // 2秒ごとに試行
    } else {

    }
    
    // デバッグ用: notifyParentReadyをグローバルに公開
    window.notifyParentReady = notifyParentReady;

    
    // 即座に1回通知を試行（ChatData/AuthStateの初期化を待たない）

    setTimeout(() => {
        tryNotifyParent();
    }, 500);
    
    // 管理者用コマンドハンドラー（postMessage）
    window.addEventListener('message', async (event) => {
        // デバッグ: すべてのメッセージをログに記録

        
        // セキュリティのため、同じオリジンのみ受け入れる
        if (event.origin !== window.location.origin) {
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

                        } else {
                        }
                        
                        if (typeof ChatData?.getConversationHistory === 'function') {
                            conversationHistory = ChatData.getConversationHistory(character) || [];

                        } else {
                        }
                        
                        // 会話履歴からもメッセージ数を計算（フォールバック）
                        // messageCountが0でも、会話履歴があれば正しい値を計算
                        if (conversationHistory && conversationHistory.length > 0) {
                            const historyUserMessages = conversationHistory.filter(msg => msg && msg.role === 'user').length;

                            
                            // messageCountが0または、履歴から計算した値の方が大きい場合は更新
                            if (messageCount === 0 || historyUserMessages > messageCount) {

                                messageCount = historyUserMessages;
                                
                                // 修正した値をsessionStorageに保存（次回から正しい値が取得できるように）
                                if (typeof ChatData?.setGuestMessageCount === 'function') {
                                    ChatData.setUserMessageCount(character, historyUserMessages);

                                }
                            }
                        } else if (messageCount === 0) {
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

                    
                    // 親ウィンドウにデータを送信
                    if (event.source && event.source.postMessage) {
                        event.source.postMessage(responseData, event.origin);

                    } else {
                        console.error('[iframe] ❌ event.sourceが無効です:', event.source);
                        // フォールバック: window.parentに送信
                        if (window.parent && window.parent !== window) {
                            window.parent.postMessage(responseData, '*');

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

    
    // 既存のコンテナがあれば削除
    const existingContainer = document.getElementById('yukinoRegistrationContainer');
    if (existingContainer) {

        existingContainer.remove();
    }
    
    const character = 'yukino';
    const info = ChatData.characterInfo[character];
    
    // 会話履歴はデータベースで管理されるため、sessionStorageへの保存は不要
    
    // コンテナを作成（メッセージコンテナ内に表示）
    const container = document.createElement('div');
    container.id = 'yukinoRegistrationContainer';
    container.className = 'registration-prompt-container';

    // タイトル
    const title = document.createElement('h3');
    title.className = 'registration-prompt-title';
    title.textContent = 'ユーザー登録のご案内';
    container.appendChild(title);

    // 詳細説明
    const detailInfo = document.createElement('div');
    detailInfo.className = 'registration-prompt-detail';

    const detailText1 = document.createElement('p');
    detailText1.textContent = 'ニックネームと生年月日を登録するだけの作業、それ以外の個人情報の入力はありませんので安心してください。';
    detailInfo.appendChild(detailText1);

    const detailText2 = document.createElement('p');
    detailText2.textContent = 'ユーザー登録で料金の請求の発生はありません。';
    detailInfo.appendChild(detailText2);

    container.appendChild(detailInfo);

    // 質問テキスト
    const question = document.createElement('p');
    question.className = 'registration-prompt-question';
    question.textContent = 'ユーザー登録をしますか？';
    container.appendChild(question);

    // ボタンコンテナ
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'registration-prompt-buttons';
    
    // 元のイベントを保存する配列
    const originalEvents = [];
    
    // 元の状態を復元する関数
    const restoreOriginalState = () => {
        // メッセージ入力欄を元に戻す
        if (window.ChatUI.messageInput) {
            window.ChatUI.messageInput.disabled = false;
            window.ChatUI.messageInput.placeholder = 'メッセージを入力...';

        }
        
        // タロットボタンを元に戻す
        originalEvents.forEach(({ button, originalOnClick }) => {
            button.onclick = originalOnClick;

        });
    };
    
    // 「はい」ボタン
    const yesButton = document.createElement('button');
    yesButton.className = 'registration-prompt-btn registration-prompt-btn-yes';
    yesButton.textContent = 'はい';
    yesButton.onclick = () => {


        // タロットボタンと入力欄を元に戻す
        restoreOriginalState();

        container.remove();
        // 登録画面へ遷移
        setTimeout(() => {
            window.location.href = '../auth/register.html?redirect=' + encodeURIComponent(window.location.href);
        }, 300);
    };

    // 「いいえ」ボタン
    const noButton = document.createElement('button');
    noButton.className = 'registration-prompt-btn registration-prompt-btn-no';
    noButton.textContent = 'いいえ';
    noButton.onclick = () => {

        
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

    buttonContainer.appendChild(yesButton);
    buttonContainer.appendChild(noButton);
    container.appendChild(buttonContainer);
    
    // メッセージコンテナに追加
    if (window.ChatUI && window.ChatUI.messagesDiv) {
        window.ChatUI.messagesDiv.appendChild(container);

        
        // フェードインアニメーション
        setTimeout(() => {
            container.classList.add('show');

        }, 100);
        
        // スクロールして表示
        setTimeout(() => {
            if (window.ChatUI.scrollToLatest) {
                window.ChatUI.scrollToLatest();

            }
        }, 200);
        
        // メッセージ入力欄を無効化し、ガイダンスを表示
        if (window.ChatUI.messageInput) {
            window.ChatUI.messageInput.disabled = true;
            window.ChatUI.messageInput.placeholder = 'ユーザー登録後にメッセージの送信ができますのでお待ちください';

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

                    
                    // スクロールして表示
                    setTimeout(() => {
                        if (window.ChatUI.scrollToLatest) {
                            window.ChatUI.scrollToLatest();
                        }
                    }, 100);
                };

            }
        });
        
    } else {
        console.error('[雪乃登録ボタン] ⚠️ window.ChatUI.messagesDiv が見つかりません');
    }
}

/**
 * キャラクター表示名を取得
 */
function getCharacterDisplayName(characterId) {
    const characterNames = {
        'kaede': '楓',
        'sora': '水野ソラ',
        'yukino': '雪乃',
        'kaon': '三崎花音'
    };
    return characterNames[characterId] || 'キャラクター';
}