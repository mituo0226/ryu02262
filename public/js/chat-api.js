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
        if (!AuthState.isRegistered()) {
            return null;
        }

        const token = AuthState.getUserToken();
        if (!token) {
            return null;
        }

        try {
            const response = await fetch(
                `/api/conversation-history?userToken=${encodeURIComponent(token)}&character=${encodeURIComponent(characterId)}`
            );
            
            const responseText = await response.text();
            let data = null;
            
            try {
                if (responseText) {
                    data = JSON.parse(responseText);
                }
            } catch (e) {
                // JSON解析に失敗した場合は無視
            }
            
            if (!response.ok) {
                if (response.status === 401 || 
                    (response.status === 404 && data && data.error && 
                     (data.error.includes('user not found') || data.error.includes('invalid user token')))) {
                    if (window.AuthState && typeof window.AuthState.clearAuth === 'function') {
                        AuthState.clearAuth();
                    } else {
                        localStorage.removeItem('userToken');
                        localStorage.removeItem('userNickname');
                        localStorage.removeItem('assignedDeity');
                    }
                    return null;
                }
                
                if (response.status === 404) {
                    console.log('No conversation history found (404)');
                    return null;
                }
                
                console.warn('Failed to load conversation history:', response.status);
                return null;
            }
            
            if (data && data.error && (data.error.includes('user not found') || data.error.includes('invalid user token'))) {
                if (window.AuthState && typeof window.AuthState.clearAuth === 'function') {
                    AuthState.clearAuth();
                } else {
                    localStorage.removeItem('userToken');
                    localStorage.removeItem('userNickname');
                    localStorage.removeItem('assignedDeity');
                }
                return null;
            }
            
            // 守護神情報をlocalStorageに同期（データベースから取得した値を保存）
            if (data && data.assignedDeity) {
                localStorage.setItem('assignedDeity', data.assignedDeity);
                console.log('[会話履歴] 守護神情報をlocalStorageに保存:', data.assignedDeity);
            }
            
            return data;
        } catch (error) {
            console.error('Failed to load conversation history:', error);
            return null;
        }
    },

    /**
     * メッセージを送信してAI応答を取得
     * @param {string} message - 送信するメッセージ
     * @param {string} characterId - キャラクターID
     * @param {Array} conversationHistory - 会話履歴
     * @param {Object} options - オプション
     * @param {string} options.userToken - ユーザートークン（オプション）
     * @param {string} options.forceProvider - プロバイダーを強制指定（オプション: 'deepseek' | 'openai'）
     * @param {Object} options.guestMetadata - ゲストメタデータ（メッセージカウントなど）
     * @returns {Promise<Object>} APIレスポンス
     */
    async sendMessage(message, characterId, conversationHistory = [], options = {}) {
        // トークンの取得（オプションで指定されていればそれを使用、なければAuthStateから取得）
        const token = options.userToken || (AuthState.isRegistered() ? AuthState.getUserToken() : null);
        
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

        if (token) {
            payload.userToken = token;
        }
        
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
                return { error: errorData.error || 'メッセージの送信に失敗しました' };
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to send message:', error);
            return { error: 'メッセージの送信に失敗しました' };
        }
    }
};

