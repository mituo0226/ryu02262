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
        // データベースから最新のユーザー情報と会話履歴を取得
        // userInfoが提供されない場合は、localStorageから取得（後方互換性のため）
        let nickname, birthYear, birthMonth, birthDay;
        
        if (userInfo) {
            nickname = userInfo.nickname;
            birthYear = userInfo.birthYear;
            birthMonth = userInfo.birthMonth;
            birthDay = userInfo.birthDay;
        } else {
            nickname = localStorage.getItem('userNickname');
            birthYear = localStorage.getItem('birthYear');
            birthMonth = localStorage.getItem('birthMonth');
            birthDay = localStorage.getItem('birthDay');
        }
        
        if (!nickname || !birthYear || !birthMonth || !birthDay) {
            console.log('[loadConversationHistory] ユーザー情報が見つかりません');
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
        
        // ユーザー情報を取得
        const nickname = localStorage.getItem('userNickname');
        const birthYear = localStorage.getItem('birthYear');
        const birthMonth = localStorage.getItem('birthMonth');
        const birthDay = localStorage.getItem('birthDay');
        
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

