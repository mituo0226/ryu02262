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
        
        if (userInfo) {
            userId = userInfo.userId || null;
        } else {
            // URLパラメータから取得（ログイン成功時にリダイレクトURLに含まれる）
            const urlParams = new URLSearchParams(window.location.search);
            const userIdParam = urlParams.get('userId');
            if (userIdParam) {
                userId = Number(userIdParam);
                if (!Number.isFinite(userId) || userId <= 0) {
                    userId = null;
                }
            }
        }
        
        // 【重要】基本的にuserIdのみを使用（データベースベースの判断）
        // nickname+生年月日によるユーザー確認は行わない
        if (!userId) {
            console.log('[loadConversationHistory] userIdが指定されていません（ゲストユーザーの可能性があります）');
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
        const urlParams = new URLSearchParams(window.location.search);
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
    }
};

