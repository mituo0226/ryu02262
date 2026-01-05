/**
 * handler.js
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

    // 【削除】handleGuestLimit関数は削除されました（10通制限が廃止されたため）

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

        // ゲストモードの場合、10通到達時のチェックを実行
        if (window.AuthState && !window.AuthState.isRegistered()) {
            // 【削除】10通制限チェックは削除されました
            if (false && window.GuestLimitManager && typeof window.GuestLimitManager.checkAndHandleGuestLimit === 'function') {
                const limitHandled = window.GuestLimitManager.checkAndHandleGuestLimit(character, response);
                if (limitHandled) {
                    console.log('[水野ソラハンドラー] 10通到達時の処理が完了しました');
                }
            }
        }

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
     * ページ初期化処理（initPage関数から呼び出される）
     * @param {URLSearchParams} urlParams - URLパラメータ
     * @param {Object} historyData - 会話履歴データ
     * @param {boolean} justRegistered - 登録直後かどうか
     * @param {boolean} shouldTriggerRegistrationFlow - 登録フローをトリガーするか
     * @returns {Object|null} 処理結果
     */
    async initPage(urlParams, historyData, justRegistered, shouldTriggerRegistrationFlow) {
        // ソラの場合は特別な初期化処理なし
        return null;
    },

    /**
     * 登録後の定型文を取得
     * @param {string} userNickname - ユーザーのニックネーム
     * @param {string} lastGuestUserMessage - 最後のゲストユーザーメッセージ
     * @returns {string} 定型文
     */
    getWelcomeBackMessage(userNickname, lastGuestUserMessage) {
        if (lastGuestUserMessage) {
            return `（ふっと笑って）おかえり、${userNickname}。名前覚えたよ。登録してくれてありがとな。これでもっと深く君のこと分かるようになったから。\n\nさっき君が言ってた「${lastGuestUserMessage}」、まだ気になってるんじゃない？続きを話したいなら、いつでも言ってよ。`;
        } else {
            return `（ふっと笑って）おかえり、${userNickname}。名前覚えたよ。登録してくれてありがとな。これでもっと深く君のこと分かるようになったから。\n\n何話したい？俺、君の話、聞くの好きだからさ。`;
        }
    },

    /**
     * 同意メッセージを取得
     * @returns {string} 同意メッセージ
     */
    getConsentMessage() {
        return 'ユーザー登録への同意が検出されました。ボタンが表示されます。';
    },

    /**
     * 拒否メッセージを取得
     * @returns {string} 拒否メッセージ
     */
    getDeclineMessage() {
        return 'ユーザー登録をスキップしました。引き続きゲストモードでお話しできます。';
    },

    /**
     * メッセージカウントを計算（API送信用）
     * @param {number} currentCount - 現在のメッセージカウント
     * @returns {number} APIに送信するメッセージカウント
     */
    calculateMessageCount(currentCount) {
        // ソラの場合はそのまま使用
        return currentCount;
    },

    /**
     * ユーザーメッセージを表示するかどうかを判定
     * @param {string} responseText - API応答テキスト
     * @param {boolean} isGuest - ゲストモードかどうか
     * @returns {boolean} 表示するかどうか
     */
    shouldShowUserMessage(responseText, isGuest) {
        // ソラの場合は常に表示
        return true;
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
    },

    // 【削除】showRegistrationButtons関数は削除されました（10通制限が廃止されたため）
};

// グローバルスコープに公開
window.SoraHandler = SoraHandler;

