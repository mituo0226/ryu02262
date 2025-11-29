/**
 * chat-api.js
 * API通信処理を担当
 * 
 * 重要: このファイルは chat.html（本番版）のメイン実装です。
 * 優先順位: chat.html（本番版）が優先で会話の進行を行い、chat-test.html（テスト版）がそれを同期します。
 * 
 * chat-test.html は本番環境のチャットの動きを簡易的に試験するために設置されたテスト版です。
 * 変更を行う際は、まずchat.htmlを更新し、その後chat-test.htmlを同期してください。
 * 
 * 詳細は docs/CHAT_TEST_SYNC_REQUIREMENT.md を参照してください。
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
     * @param {Object} options - オプション（テスト環境用など）
     * @param {string} options.userToken - ユーザートークン（テスト環境用）
     * @param {string} options.forceProvider - プロバイダーを強制指定（テスト環境用: 'deepseek' | 'openai'）
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
        
        // テスト環境用オプション
        if (options.forceProvider) {
            payload.forceProvider = options.forceProvider;
        }
        
        if (options.guestMetadata) {
            payload.guestMetadata = options.guestMetadata;
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

