/**
 * chat-test-utils.js
 * チャットシステムの開発者向けテストユーティリティ
 * 
 * 責務:
 * - ゲストデータのクリア・管理
 * - デバッグフラグの操作
 * 
 * 依存関係: chat-data.js（ChatData）、chat-utils.js（debugLog）
 */

window.ChatTestUtils = {
    /**
     * ゲストモードで会話したフラグをクリア
     * @param {string|null} characterId - キャラクターID（指定しない場合はすべてクリア）
     */
    clearGuestFlags(characterId = null) {
        // ゲストフラグはデータベースで管理されるため、localStorageのクリアは不要
        debugLog('[ChatTestUtils] ゲストフラグはデータベースで管理されています。');
    },
    
    /**
     * すべてのゲスト関連データをクリア（フラグ + sessionStorageの履歴）
     * @param {string|null} characterId - キャラクターID（指定しない場合はすべてクリア）
     */
    clearAllGuestData(characterId = null) {
        const characters = ['kaede', 'yukino', 'sora', 'kaon'];
        const targets = characterId ? [characterId] : characters;
        
        // sessionStorageの履歴をクリア
        targets.forEach(c => {
            const historyKey = `guestConversationHistory_${c}`;
            const countKey = `guestMessageCount_${c}`;
            if (sessionStorage.getItem(historyKey)) {
                sessionStorage.removeItem(historyKey);
            }
            if (sessionStorage.getItem(countKey)) {
                sessionStorage.removeItem(countKey);
            }
        });
        
        // AuthStateの履歴もクリア
        if (window.AuthState && typeof window.AuthState.resetGuestProgress === 'function') {
            targets.forEach(c => {
                if (typeof window.AuthState.clearGuestHistory === 'function') {
                    window.AuthState.clearGuestHistory(c);
                }
            });
        }
    },
    
    /**
     * 現在のゲストフラグの状態を確認
     */
    checkGuestFlags() {
        const characters = ['kaede', 'yukino', 'sora', 'kaon'];
        const status = {};
        
        characters.forEach(c => {
            status[c] = {
                flag: 'データベースで管理',
                history: sessionStorage.getItem(`guestConversationHistory_${c}`) ? 'あり' : 'なし',
                count: sessionStorage.getItem(`guestMessageCount_${c}`) || '0'
            };
        });
        
        console.table(status);
        return status;
    }
};
