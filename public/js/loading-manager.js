/**
 * loading-manager.js
 * 新しいローディング画面システム
 * シンプルで効果的なメッセージ送信時の待機画面を管理
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
     * ローディングメッセージを表示
     * @param {string} characterName - キャラクター名
     * @returns {string} メッセージID
     */
    showLoading(characterName = 'アシスタント') {
        console.log('[LoadingManager] showLoading() 呼び出し:', characterName);
        
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
            // 表示時刻を記録
            this.loadingShowTime = Date.now();
            console.log('[LoadingManager] メッセージID:', this.currentLoadingMessageId);

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
     * 最小500msはメッセージを表示するようにする
     */
    hideLoading() {
        console.log('[LoadingManager] hideLoading() 呼び出し:', this.currentLoadingMessageId);
        
        if (!this.currentLoadingMessageId) {
            console.log('[LoadingManager] 削除対象のメッセージがありません');
            return;
        }

        // メッセージが表示されてから最小500ms経過するまで待つ
        const elapsedTime = Date.now() - (this.loadingShowTime || Date.now());
        const minDisplayTime = 500;
        const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
        
        console.log('[LoadingManager] 表示継続時間:', elapsedTime, 'ms, 残り:', remainingTime, 'ms');

        const performHide = () => {
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
        };

        if (remainingTime > 0) {
            console.log('[LoadingManager] ' + remainingTime + 'ms 待機してからメッセージを削除します');
            setTimeout(performHide, remainingTime);
        } else {
            performHide();
        }
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
