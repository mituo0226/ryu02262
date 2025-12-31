/**
 * kaon-handler.js
 * 薫音（kaon）専用のチャットロジック
 * 薫音固有の処理を管理（将来の拡張用）
 */

const KaonHandler = {
    characterId: 'kaon',
    characterName: '薫音',

    /**
     * 初期化
     */
    init() {
        console.log('[薫音ハンドラー] 初期化');
        // 将来の拡張用
    },

    /**
     * ゲスト上限到達時の処理（10通目）
     * @param {number} guestCount - 現在のゲストメッセージ数
     * @param {Object} apiData - API応答データ
     * @returns {boolean} 処理を実行したか
     */
    handleGuestLimit(guestCount, apiData) {
        console.log('[薫音ハンドラー] ゲスト上限チェック:', { guestCount, limit: ChatData.GUEST_MESSAGE_LIMIT });
        
        // 10通目に到達したら登録ボタンを表示
        if (guestCount >= ChatData.GUEST_MESSAGE_LIMIT) {
            console.log('[薫音ハンドラー] 10通目到達 → 登録ボタンを表示');
            
            // 既に表示済みの場合はスキップ
            if (ChatData.ritualConsentShown) {
                console.log('[薫音ハンドラー] 既に登録ボタン表示済み - スキップ');
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
     * メッセージ送信前の処理
     * @param {string} message - 送信するメッセージ
     * @returns {Object} { proceed: boolean, modifiedMessage?: string }
     */
    beforeMessageSent(message) {
        console.log('[薫音ハンドラー] メッセージ送信前処理:', message);
        
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
            return false; // 薫音以外は処理しない
        }

        console.log('[薫音ハンドラー] レスポンス処理:', response);

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
        console.log('[薫音ハンドラー] 登録完了後の処理');

        // 現在は特殊な処理なし、共通処理を続行
        return false;
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

        console.log('[薫音ハンドラー] ゲスト履歴をクリアしました');
    }
};

// グローバルスコープに公開
window.KaonHandler = KaonHandler;
