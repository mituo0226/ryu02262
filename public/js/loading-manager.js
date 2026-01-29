/**
 * loading-manager.js
 * 新しいローディング画面システム
 * シンプルで効果的なメッセージ送信時の待機画面を管理
 * 
 * 待機画面の種類：
 * - MESSAGE_RESPONSE: ユーザーメッセージ送信時のチャット内待機メッセージ
 *   表示位置：チャットウィンドウ内
 *   最小表示時間：1000ms
 */

const LoadingManager = {
    /**
     * 待機メッセージのID
     */
    currentLoadingMessageId: null,
    
    /**
     * 待機メッセージが表示された時刻
     */
    loadingShowTime: null,
    
    /**
     * 現在の待機画面タイプ
     */
    currentLoadingScreenType: null,

    /**
     * ローディングメッセージを表示
     * @param {string} characterName - キャラクター名
     * @returns {string} メッセージID
     */
    showLoading(characterName = 'アシスタント') {
        // グローバルから待機画面タイプを取得
        this.currentLoadingScreenType = window._currentLoadingScreenType || 'unknown';
        
        console.log('[LoadingManager] showLoading() 呼び出し:', characterName);
        console.log('[LoadingManager] 待機画面タイプ:', this.currentLoadingScreenType);
        
        // 既に表示されているローディングメッセージがあれば削除
        this.hideLoading();

        // シンプルな待機メッセージを表示
        const loadingText = `${characterName}が応答を準備中...`;
        console.log('[LoadingManager] 待機メッセージを追加:', loadingText);

        // ChatUIを使用してメッセージを追加
        if (window.ChatUI && typeof window.ChatUI.addMessage === 'function') {
            console.log('[LoadingManager] ChatUI.addMessage() を呼び出します');
            this.currentLoadingMessageId = window.ChatUI.addMessage(
                'loading',
                loadingText,
                characterName
            );
            
            // 表示時刻を今この瞬間に記録（待機メッセージが DOM に追加された直後）
            this.loadingShowTime = Date.now();
            console.log('[LoadingManager] メッセージID:', this.currentLoadingMessageId);
            console.log('[LoadingManager] 表示時刻記録:', this.loadingShowTime);

            // チャットコンテナに待機状態クラスを追加
            const messagesDiv = window.ChatUI.messagesDiv;
            if (messagesDiv) {
                const chatContainer = messagesDiv.closest('.chat-container');
                if (chatContainer) {
                    chatContainer.classList.add('waiting-for-response');
                }
            }

            return this.currentLoadingMessageId;
        }

        return null;
    },

    /**
     * ローディングメッセージを非表示にして削除
     */
    hideLoading() {
        console.log('[LoadingManager] hideLoading() 呼び出し:', this.currentLoadingMessageId);
        
        if (!this.currentLoadingMessageId) {
            console.log('[LoadingManager] 削除対象のメッセージがありません');
            return;
        }

        // メッセージを削除
        const element = document.getElementById(this.currentLoadingMessageId);
        console.log('[LoadingManager] メッセージ要素を検索:', !!element);
        
        if (element) {
            console.log('[LoadingManager] メッセージ要素を削除します');
            element.remove();
        }

        // チャットコンテナから待機状態クラスを削除
        const messagesDiv = window.ChatUI?.messagesDiv;
        if (messagesDiv) {
            const chatContainer = messagesDiv.closest('.chat-container');
            if (chatContainer) {
                chatContainer.classList.remove('waiting-for-response');
            }
        }

        this.currentLoadingMessageId = null;
        this.loadingShowTime = null;
    },

    /**
     * ローディングメッセージを別のメッセージに置き換え
     * @param {string} messageId - 置き換えるメッセージのID
     * @param {string} newMessage - 新しいメッセージ
     */
    replaceLoading(messageId, newMessage) {
        if (!messageId) return;

        const element = document.getElementById(messageId);
        if (element) {
            element.remove();
        }

        // チャットコンテナから待機状態クラスを削除
        const messagesDiv = window.ChatUI?.messagesDiv;
        if (messagesDiv) {
            const chatContainer = messagesDiv.closest('.chat-container');
            if (chatContainer) {
                chatContainer.classList.remove('waiting-for-response');
            }
        }

        this.currentLoadingMessageId = null;
    }
};

// グローバル変数として公開
window.LoadingManager = LoadingManager;
