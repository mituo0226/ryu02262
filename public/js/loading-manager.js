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
     * 待機中のタイマーリスト
     */
    waitingTimers: [],

    /**
     * ローディングメッセージを表示
     * @param {string} characterName - キャラクター名
     * @returns {string} メッセージID
     */
    showLoading(characterName = 'アシスタント') {
        // 既に表示されているローディングメッセージがあれば削除
        this.hideLoading();

        // シンプルな待機メッセージを表示
        const loadingText = `${characterName}が返信対応中`;

        // ChatUIを使用してメッセージを追加
        if (window.ChatUI && typeof window.ChatUI.addMessage === 'function') {
            // ローディングメッセージはヘッダー（sender）を表示しない
            this.currentLoadingMessageId = window.ChatUI.addMessage(
                'loading',
                loadingText,
                null  // sender を null にしてヘッダーを表示しない
            );

            // メッセージ要素を取得して、「……」を追加
            const messageElement = document.getElementById(this.currentLoadingMessageId);
            if (messageElement) {
                const textDiv = messageElement.querySelector('.message-text');
                if (textDiv) {
                    // 既存のテキストを保持して、「……」アニメーションを追加
                    const originalText = textDiv.textContent;
                    textDiv.innerHTML = `${originalText}<span class="loading-dots">･･･</span>`;
                    textDiv.classList.add('loading-with-dots');
                }
            }

            // チャットコンテナに待機状態クラスを追加
            const messagesDiv = window.ChatUI.messagesDiv;
            if (messagesDiv) {
                const chatContainer = messagesDiv.closest('.chat-container');
                if (chatContainer) {
                    chatContainer.classList.add('waiting-for-response');
                    console.log('[LoadingManager] waiting-for-response クラスを追加しました');
                    
                    // 5秒後にアニメーションを段階的に強化
                    const timer1 = setTimeout(() => {
                        if (chatContainer && this.currentLoadingMessageId) {
                            chatContainer.classList.add('waiting-extended');
                            console.log('[LoadingManager] 5秒経過：waiting-extended クラスを追加しました');
                        }
                    }, 5000);
                    
                    // 10秒後にさらにアニメーションを強化
                    const timer2 = setTimeout(() => {
                        if (chatContainer && this.currentLoadingMessageId) {
                            chatContainer.classList.add('waiting-extended-max');
                            console.log('[LoadingManager] 10秒経過：waiting-extended-max クラスを追加しました');
                        }
                    }, 10000);
                    
                    this.waitingTimers.push(timer1, timer2);
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
        if (!this.currentLoadingMessageId) return;

        // すべてのタイマーをクリア
        this.waitingTimers.forEach(timerId => clearTimeout(timerId));
        this.waitingTimers = [];

        // メッセージを削除
        const element = document.getElementById(this.currentLoadingMessageId);
        if (element) {
            element.remove();
        }

        // チャットコンテナから待機状態クラスを削除
        const messagesDiv = window.ChatUI?.messagesDiv;
        if (messagesDiv) {
            const chatContainer = messagesDiv.closest('.chat-container');
            if (chatContainer) {
                chatContainer.classList.remove('waiting-for-response');
                chatContainer.classList.remove('waiting-extended');
                chatContainer.classList.remove('waiting-extended-max');
            }
        }

        this.currentLoadingMessageId = null;
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
