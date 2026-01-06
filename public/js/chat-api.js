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
    async loadConversationHistory(characterId) {
        // 【新仕様】userTokenは不要。session_idで識別する
        // データベースから最新のユーザー情報と会話履歴を取得
        const sessionId = localStorage.getItem('guestSessionId');
        
        if (!sessionId) {
            console.log('[loadConversationHistory] sessionIdが見つかりません');
            return null;
        }
        
        try {
            const response = await fetch(
                `/api/conversation-history?sessionId=${encodeURIComponent(sessionId)}&character=${encodeURIComponent(characterId)}`
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
            
            // データベースから取得した最新のユーザー情報をlocalStorageに保存
            if (data) {
                if (data.nickname) {
                    localStorage.setItem('userNickname', data.nickname);
                }
                if (data.birthYear) {
                    localStorage.setItem('birthYear', String(data.birthYear));
                }
                if (data.birthMonth) {
                    localStorage.setItem('birthMonth', String(data.birthMonth));
                }
                if (data.birthDay) {
                    localStorage.setItem('birthDay', String(data.birthDay));
                }
                if (data.assignedDeity) {
                    localStorage.setItem('assignedDeity', data.assignedDeity);
                    console.log('[loadConversationHistory] 守護神情報をlocalStorageに保存:', data.assignedDeity);
                }
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
     * @param {Object} options.guestMetadata - ゲストメタデータ（session_idなど）
     * @returns {Promise<Object>} APIレスポンス
     */
    async sendMessage(message, characterId, conversationHistory = [], options = {}) {
        // 【新仕様】userTokenは不要。session_idで識別する
        
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
        
        const payload = {
            message: message,
            character: characterId,
            clientHistory: clientHistory
        };
        
        // オプション設定
        if (options.forceProvider) {
            payload.forceProvider = options.forceProvider;
        }
        
        if (options.guestMetadata) {
            payload.guestMetadata = options.guestMetadata;
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
                const errorData = await response.json().catch(() => ({}));
                return { 
                    error: errorData.error || 'メッセージの送信に失敗しました',
                    message: errorData.message || errorData.error || 'メッセージの送信に失敗しました'
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

