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
     * @returns {boolean} 処理が完了したか
     */
    async handlePostRegistration(historyData) {
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
