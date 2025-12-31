/**
 * yukino-handler.js
 * 笹岡雪乃（yukino）専用のチャットロジック
 * タロット占い、ゲストモード登録フローなど、雪乃固有の処理を管理
 */

const YukinoHandler = {
    characterId: 'yukino',
    characterName: '笹岡雪乃',

    /**
     * 初期化
     */
    init() {
        console.log('[雪乃ハンドラー] 初期化');
        
        // タロット機能の初期化
        if (window.YukinoTarot && typeof window.YukinoTarot.init === 'function') {
            window.YukinoTarot.init();
        }
        
        // ゲストモード再訪問のチェック
        this.checkGuestRevisit();
    },

    /**
     * ゲスト上限到達時の処理（10通目）
     * @param {number} guestCount - 現在のゲストメッセージ数
     * @param {Object} apiData - API応答データ
     * @returns {boolean} 処理を実行したか
     */
    handleGuestLimit(guestCount, apiData) {
        console.log('[雪乃ハンドラー] ゲスト上限チェック:', { guestCount, limit: ChatData.GUEST_MESSAGE_LIMIT });
        
        // 10通目に到達したら登録ボタンを表示
        if (guestCount >= ChatData.GUEST_MESSAGE_LIMIT) {
            console.log('[雪乃ハンドラー] 10通目到達 → 登録ボタンを表示');
            
            // 既に表示済みの場合はスキップ
            if (ChatData.ritualConsentShown) {
                console.log('[雪乃ハンドラー] 既に登録ボタン表示済み - スキップ');
                return false;
            }
            
            // システムメッセージを表示
            ChatUI.addMessage('error', 'ユーザー登録への同意が検出されました。ボタンが表示されます。', 'システム');
            
            // フラグを保存
            sessionStorage.setItem('acceptedGuardianRitual', 'true');
            ChatData.ritualConsentShown = true;
            
            // 登録ボタンを表示
            setTimeout(() => {
                ChatUI.showRitualConsentButtons();
            }, 2000);
            
            return true;
        }
        
        return false;
    },

    /**
     * ゲストモード再訪問のチェック
     * 一度ゲストで会話した後、再度ゲストで訪問した場合は強制的にユーザー登録画面へ
     */
    checkGuestRevisit() {
        // 登録済みユーザーはチェック不要
        if (window.AuthState && window.AuthState.isRegistered()) {
            console.log('[雪乃ハンドラー] 登録済みユーザー - 再訪問チェックをスキップ');
            return;
        }

        // ゲストモードで会話したことがあるかをチェック
        const hasConversedAsGuest = localStorage.getItem('yukinoGuestConversed');
        
        if (hasConversedAsGuest === 'true') {
            console.log('[雪乃ハンドラー] ゲストモード再訪問を検知 - ユーザー登録画面へリダイレクト');
            
            // システムメッセージを表示
            ChatUI.addMessage('character', 
                '前回はゲストモードでお話しいただきましたが、続きをお話しするにはユーザー登録が必要です。生年月日とニックネームを登録してください。お金がかかったりはしませんから、安心してくださいね。', 
                this.characterName
            );
            
            // 入力欄を無効化
            if (ChatUI.messageInput) {
                ChatUI.messageInput.disabled = true;
                ChatUI.messageInput.placeholder = 'ユーザー登録が必要です';
            }
            if (ChatUI.sendButton) {
                ChatUI.sendButton.disabled = true;
            }
            
            // 3秒後にユーザー登録画面へリダイレクト
            setTimeout(() => {
                window.location.href = '../auth/register.html?redirect=' + encodeURIComponent(window.location.href);
            }, 3000);
        }
    },

    /**
     * ゲストモードで会話したことを記録
     */
    markGuestConversed() {
        console.log('[雪乃ハンドラー] ゲストモードで会話したことを記録');
        localStorage.setItem('yukinoGuestConversed', 'true');
    },

    /**
     * メッセージ送信前の処理
     * @param {string} message - 送信するメッセージ
     * @returns {Object} { proceed: boolean, modifiedMessage?: string }
     */
    beforeMessageSent(message) {
        console.log('[雪乃ハンドラー] メッセージ送信前処理:', message);
        
        // 特に変更なし、そのまま送信
        return { proceed: true };
    },

    /**
     * API レスポンス受信後の処理（現在は使用していません）
     * @param {Object} response - API レスポンス
     * @param {string} character - キャラクターID
     * @returns {boolean} 処理が完了したか（true: ハンドラーで処理済み、false: 共通処理を続行）
     */
    async handleResponse(response, character) {
        if (character !== this.characterId) {
            return false; // 雪乃以外は処理しない
        }
        
        // 登録ボタンの表示は chat-init.js でメッセージカウントベースで行うため、
        // ここでは何もしない
        return false; // 共通処理を続行
    },

    /**
     * 登録完了後の処理
     * @param {Object} historyData - 会話履歴データ
     * @param {Array} guestHistory - ゲスト履歴
     * @returns {boolean} 処理が完了したか
     */
    async handlePostRegistration(historyData, guestHistory = []) {
        console.log('[雪乃ハンドラー] 登録完了後の処理');

        // ゲストモードで会話したフラグをクリア（登録完了したため）
        localStorage.removeItem('yukinoGuestConversed');
        console.log('[雪乃ハンドラー] ゲストモード会話フラグをクリアしました');

        // 【重要】送信ボタンの表示状態を更新
        // 登録後にページがリロードされた際、イベントリスナーは設定されているが
        // updateSendButtonVisibility()が呼ばれていない場合があるため、明示的に呼び出す
        setTimeout(() => {
            if (window.ChatUI && typeof window.ChatUI.updateSendButtonVisibility === 'function') {
                window.ChatUI.updateSendButtonVisibility();
                console.log('[雪乃ハンドラー] 送信ボタンの表示状態を更新しました');
            }
        }, 100);

        // 雪乃の場合は共通フローに任せる（履歴表示→定型文表示）
        return false; // 共通処理を続行
    }
};

// グローバルスコープに公開
window.YukinoHandler = YukinoHandler;

// グローバル関数として公開（後方互換性のため）
window.handleYukinoRegistrationConsent = (consent) => YukinoHandler.handleRegistrationConsent(consent);
