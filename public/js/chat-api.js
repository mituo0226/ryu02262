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
            
            return data;
        } catch (error) {
            console.error('Failed to load conversation history:', error);
            return null;
        }
    }
};

