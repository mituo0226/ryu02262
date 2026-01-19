/**
 * base-handler.js
 * キャラクターハンドラーの基底クラス
 * 全キャラクター共通の処理を提供
 */

class BaseCharacterHandler {
    constructor(characterId, characterName) {
        this.characterId = characterId;
        this.characterName = characterName;
    }

    /**
     * 初期化
     */
    init() {
        console.log(`[${this.characterName}ハンドラー] 初期化`);
    }

    /**
     * メッセージ送信前の処理
     * @param {string} message - 送信するメッセージ
     * @returns {Object} { proceed: boolean, modifiedMessage?: string }
     */
    beforeMessageSent(message) {
        console.log(`[${this.characterName}ハンドラー] メッセージ送信前処理:`, message);
        return { proceed: true };
    }

    /**
     * API レスポンス受信後の処理
     * @param {Object} response - API レスポンス
     * @param {string} character - キャラクターID
     * @returns {boolean} 処理が完了したか（true: ハンドラーで処理済み、false: 共通処理を続行）
     */
    async handleResponse(response, character) {
        if (character !== this.characterId) {
            return false; // このキャラクター以外は処理しない
        }
        return false; // 共通処理を続行
    }

    /**
     * 登録完了後の処理
     * @param {Object} historyData - 会話履歴データ
     * @returns {boolean} 処理が完了したか
     */
    async handlePostRegistration(historyData) {
        console.log(`[${this.characterName}ハンドラー] 登録完了後の処理`);
        return false; // 共通処理を続行
    }

    /**
     * ページ初期化処理（initPage関数から呼び出される）
     * @param {URLSearchParams} urlParams - URLパラメータ
     * @param {Object} historyData - 会話履歴データ
     * @param {boolean} justRegistered - 登録直後かどうか
     * @param {boolean} shouldTriggerRegistrationFlow - 登録フローをトリガーするか
     * @param {Object} options - 追加オプション
     * @returns {Object|null} 処理結果
     */
    async initPage(urlParams, historyData, justRegistered, shouldTriggerRegistrationFlow, options = {}) {
        // バックエンドの判定結果（visitPattern）を使用
        const visitPattern = historyData?.visitPattern || (historyData?.hasHistory ? 'returning' : 'first_visit');
        
        switch (visitPattern) {
            case 'first_visit':
                await this.handleFirstVisit(historyData);
                break;
            case 'returning':
                await this.handleReturningVisit(historyData);
                break;
            case 'continuing':
                await this.handleContinuingVisit(historyData);
                break;
        }
        
        return null;
    }

    /**
     * 初回訪問時の処理（サブクラスでオーバーライド可能）
     * @param {Object} historyData - 会話履歴データ
     */
    async handleFirstVisit(historyData) {
        const info = ChatData.characterInfo[this.characterId];
        if (historyData && historyData.welcomeMessage) {
            ChatUI.addMessage('welcome', historyData.welcomeMessage, info.name);
        }
    }

    /**
     * 再訪問時の処理（サブクラスでオーバーライド可能）
     * @param {Object} historyData - 会話履歴データ
     */
    async handleReturningVisit(historyData) {
        // 履歴表示（最新5件を即座に表示、残りを遅延表示）
        this.displayHistory(historyData.recentMessages || []);
        
        // 再訪問メッセージ表示
        const info = ChatData.characterInfo[this.characterId];
        if (historyData && historyData.returningMessage) {
            ChatUI.addMessage('welcome', historyData.returningMessage, info.name);
        }
    }

    /**
     * 継続セッション時の処理（サブクラスでオーバーライド可能）
     * @param {Object} historyData - 会話履歴データ
     */
    async handleContinuingVisit(historyData) {
        const info = ChatData.characterInfo[this.characterId];
        if (historyData && historyData.welcomeMessage) {
            ChatUI.addMessage('welcome', historyData.welcomeMessage, info.name);
        }
    }

    /**
     * 会話履歴を表示（最新5件を即座に表示、残りを遅延表示）
     * @param {Array} messages - メッセージ配列
     */
    displayHistory(messages) {
        if (!messages || messages.length === 0) return;
        
        const info = ChatData.characterInfo[this.characterId];
        const totalMessages = messages.length;
        const recentFive = messages.slice(-5); // 最新5件
        const olderMessages = messages.slice(0, -5); // 残りの履歴
        
        // 最新5件を即座に表示
        recentFive.forEach((entry) => {
            // システムメッセージはスキップ
            if (entry.isSystemMessage) {
                return;
            }
            const type = entry.role === 'user' ? 'user' : 'character';
            const sender = entry.role === 'user' ? 'あなた' : info.name;
            const content = entry.content || entry.message || '';
            ChatUI.addMessage(type, content, sender);
        });
        
        // 残りの履歴を遅延表示（バックグラウンド）
        if (olderMessages.length > 0) {
            setTimeout(() => {
                olderMessages.forEach((entry) => {
                    // システムメッセージはスキップ
                    if (entry.isSystemMessage) {
                        return;
                    }
                    const type = entry.role === 'user' ? 'user' : 'character';
                    const sender = entry.role === 'user' ? 'あなた' : info.name;
                    const content = entry.content || entry.message || '';
                    ChatUI.prependMessage(type, content, sender);
                });
            }, 100); // 100ms後に表示
        }
    }

    /**
     * 登録後の定型文を取得
     * @param {string} userNickname - ユーザーのニックネーム
     * @param {string} lastGuestUserMessage - 最後のゲストユーザーメッセージ
     * @returns {string|null} 定型文（nullの場合は共通処理を使用）
     */
    getWelcomeBackMessage(userNickname, lastGuestUserMessage) {
        return null; // 共通処理を使用
    }

    /**
     * 同意メッセージを取得
     * @returns {string} 同意メッセージ
     */
    getConsentMessage() {
        return 'ユーザー登録への同意が検出されました。';
    }

    /**
     * 拒否メッセージを取得
     * @returns {string} 拒否メッセージ
     */
    getDeclineMessage() {
        return 'ユーザー登録をスキップしました。';
    }

    /**
     * メッセージカウントを計算（API送信用）
     * @param {number} currentCount - 現在のメッセージカウント
     * @returns {number} APIに送信するメッセージカウント
     */
    calculateMessageCount(currentCount) {
        return currentCount;
    }

    /**
     * ユーザーメッセージを表示するかどうかを判定
     * @param {string} responseText - API応答テキスト
     * @param {boolean} isGuest - ゲストモードかどうか
     * @returns {boolean} 表示するかどうか
     */
    shouldShowUserMessage(responseText, isGuest) {
        return true; // デフォルトは常に表示
    }

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
        
        // メッセージカウントをリセット
        ChatData.setUserMessageCount(character, 0);
        
        console.log(`[${this.characterName}ハンドラー] ゲスト履歴をクリアしました`);
    }
}

// グローバルスコープに公開
window.BaseCharacterHandler = BaseCharacterHandler;
