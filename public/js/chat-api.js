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
        // userInfoが提供されない場合は、URLパラメータから取得
        let nickname, birthYear, birthMonth, birthDay;
        
        if (userInfo) {
            nickname = userInfo.nickname;
            birthYear = userInfo.birthYear;
            birthMonth = userInfo.birthMonth;
            birthDay = userInfo.birthDay;
        } else {
            // URLパラメータから取得（ログイン成功時にリダイレクトURLに含まれる）
            const urlParams = new URLSearchParams(window.location.search);
            nickname = urlParams.get('nickname');
            const birthYearParam = urlParams.get('birthYear');
            const birthMonthParam = urlParams.get('birthMonth');
            const birthDayParam = urlParams.get('birthDay');
            
            if (birthYearParam) birthYear = Number(birthYearParam);
            if (birthMonthParam) birthMonth = Number(birthMonthParam);
            if (birthDayParam) birthDay = Number(birthDayParam);
        }
        
        if (!nickname || !birthYear || !birthMonth || !birthDay) {
            console.log('[loadConversationHistory] ユーザー情報が見つかりません（ゲストユーザーの可能性があります）');
            return null;
        }
        
        try {
            const response = await fetch(
                `/api/conversation-history?nickname=${encodeURIComponent(nickname)}&birthYear=${encodeURIComponent(birthYear)}&birthMonth=${encodeURIComponent(birthMonth)}&birthDay=${encodeURIComponent(birthDay)}&character=${encodeURIComponent(characterId)}`
            );
            
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
                    console.log('[loadConversationHistory] 会話履歴が見つかりません（初回登録のため正常）');
                    return null;
                }
                
                console.warn('[loadConversationHistory] 会話履歴の取得に失敗:', response.status);
                return null;
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
            return null;
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
        // ChatData.conversationHistoryが存在する場合は、そこから取得
        // そうでない場合は、ChatData.userNicknameから取得（初期化時に設定済み）
        let nickname, birthYear, birthMonth, birthDay;
        
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
        
        const payload = {
            message: message,
            character: characterId,
            clientHistory: clientHistory,
            nickname: nickname || undefined,
            birthYear: birthYear ? Number(birthYear) : undefined,
            birthMonth: birthMonth ? Number(birthMonth) : undefined,
            birthDay: birthDay ? Number(birthDay) : undefined
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

