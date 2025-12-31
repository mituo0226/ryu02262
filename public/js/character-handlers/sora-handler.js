/**
 * sora-handler.js
 * 水野ソラ（みずの そら）専用のチャットロジック
 * 水野ソラ固有の処理を管理
 */

const SoraHandler = {
    characterId: 'sora',
    characterName: '水野ソラ',

    /**
     * 初期化
     */
    init() {
        console.log('[水野ソラハンドラー] 初期化');
        
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
        console.log('[水野ソラハンドラー] ゲスト上限チェック:', { guestCount, limit: ChatData.GUEST_MESSAGE_LIMIT });
        
        // 10通目に到達したら登録ボタンを表示
        if (guestCount >= ChatData.GUEST_MESSAGE_LIMIT) {
            console.log('[水野ソラハンドラー] 10通目到達 → 登録ボタンを表示');
            
            // 既に表示済みの場合はスキップ
            if (ChatData.ritualConsentShown) {
                console.log('[水野ソラハンドラー] 既に登録ボタン表示済み - スキップ');
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
            console.log('[水野ソラハンドラー] 登録済みユーザー - 再訪問チェックをスキップ');
            return;
        }

        // ゲストモードで会話したことがあるかをチェック
        const hasConversedAsGuest = localStorage.getItem('soraGuestConversed');
        
        if (hasConversedAsGuest === 'true') {
            console.log('[水野ソラハンドラー] ゲストモード再訪問を検知 - ユーザー登録画面へリダイレクト');
            
            // システムメッセージを表示
            ChatUI.addMessage('character', 
                '（少し真剣な顔で）あのさ、前回はゲストモードで話したよね？続きを話すには、ユーザー登録が必要なんだ。生年月日とニックネームを教えてくれれば、もっと深く君のこと分かるようになるから。お金とか一切かからないし、個人情報も守られるから安心して。登録ボタンから手続きしてくれると嬉しい。', 
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
        console.log('[水野ソラハンドラー] ゲストモードで会話したことを記録');
        localStorage.setItem('soraGuestConversed', 'true');
    },

    /**
     * メッセージ送信前の処理
     * @param {string} message - 送信するメッセージ
     * @returns {Object} { proceed: boolean, modifiedMessage?: string }
     */
    beforeMessageSent(message) {
        console.log('[水野ソラハンドラー] メッセージ送信前処理:', message);
        
        // 特に変更なし、そのまま送信
        return { proceed: true };
    },

    /**
     * API レスポンス受信後の処理
     * @param {Object} response - API レスポンス
     * @param {string} character - キャラクターID
     * @returns {boolean} 処理が完了したか（true: ハンドラーで処理済み、false: 共通処理を続行）
     */
    async handleResponse(response, character) {
        if (character !== this.characterId) {
            return false; // 水野ソラ以外は処理しない
        }

        console.log('[水野ソラハンドラー] レスポンス処理:', response);

        // 現在は特殊な処理なし、共通処理を続行
        return false;
    },

    /**
     * 登録完了後の処理
     * @param {Object} historyData - 会話履歴データ
     * @param {Array} guestHistory - ゲスト履歴
     * @returns {boolean} 処理が完了したか
     */
    async handlePostRegistration(historyData, guestHistory = []) {
        console.log('[水野ソラハンドラー] 登録完了後の処理');

        // ゲストモードで会話したフラグをクリア（登録完了したため）
        localStorage.removeItem('soraGuestConversed');
        console.log('[水野ソラハンドラー] ゲストモード会話フラグをクリアしました');

        // 【重要】送信ボタンの表示状態を更新
        // 登録後にページがリロードされた際、イベントリスナーは設定されているが
        // updateSendButtonVisibility()が呼ばれていない場合があるため、明示的に呼び出す
        setTimeout(() => {
            if (window.ChatUI && typeof window.ChatUI.updateSendButtonVisibility === 'function') {
                window.ChatUI.updateSendButtonVisibility();
                console.log('[水野ソラハンドラー] 送信ボタンの表示状態を更新しました');
            }
        }, 100);

        // ソラの場合は共通フローに任せる（履歴表示→定型文表示）
        return false; // 共通処理を続行
    },

    /**
     * ゲスト履歴をクリア
     */
    clearGuestHistory() {
        const character = this.characterId;

        // AuthStateを使用してクリア
        if (window.AuthState && typeof window.AuthState.clearGuestHistory === 'function') {
            AuthState.clearGuestHistory(character);
        }

        // sessionStorageから直接削除
        const GUEST_HISTORY_KEY_PREFIX = 'guestConversationHistory_';
        const historyKey = GUEST_HISTORY_KEY_PREFIX + character;
        sessionStorage.removeItem(historyKey);
        sessionStorage.removeItem('pendingGuestHistoryMigration');

        // メッセージカウントをリセット
        ChatData.setGuestMessageCount(character, 0);

        console.log('[水野ソラハンドラー] ゲスト履歴をクリアしました');
    }
};

// グローバルスコープに公開
window.SoraHandler = SoraHandler;

