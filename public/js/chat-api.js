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
        // 会話履歴はconsult.tsでsession_idから取得されるため、このAPIは使用しない
        // 初回登録時は会話履歴がないため、nullを返す
        return null;
            
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

