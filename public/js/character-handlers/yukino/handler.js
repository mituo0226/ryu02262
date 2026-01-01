/**
 * handler.js
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

        // テストモードチェック（URLパラメータに?test=trueがある場合、フラグをクリアしてスキップ）
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('test') === 'true') {
            const flag = 'yukinoGuestConversed';
            if (localStorage.getItem(flag)) {
                localStorage.removeItem(flag);
                console.log(`[雪乃ハンドラー] テストモード: ${flag} をクリアしました`);
            }
            return; // テストモードの場合は再訪問チェックをスキップ
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
     * API レスポンス受信後の処理
     * @param {Object} response - API レスポンス
     * @param {string} character - キャラクターID
     * @returns {boolean} 処理が完了したか（true: ハンドラーで処理済み、false: 共通処理を続行）
     */
    async handleResponse(response, character) {
        if (character !== this.characterId) {
            return false; // 雪乃以外は処理しない
        }
        
        // ゲストモードの場合、10通到達時のチェックを実行
        if (window.AuthState && !window.AuthState.isRegistered()) {
            if (window.GuestLimitManager && typeof window.GuestLimitManager.checkAndHandleGuestLimit === 'function') {
                const limitHandled = window.GuestLimitManager.checkAndHandleGuestLimit(character, response);
                if (limitHandled) {
                    console.log('[雪乃ハンドラー] 10通到達時の処理が完了しました');
                }
            }
        }
        
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
        // 雪乃の場合は特別な初期化処理なし
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
            return `おかえりなさい、${userNickname}さん。${userNickname}さん、というお名前ですね。しっかり覚えました。ユーザー登録してくださり、本当にありがとうございます。\n\nあなたとの会話の最後のメッセージは「${lastGuestUserMessage}」でしたね。この会話の続きをお望みであれば、その意思を伝えてくださいね。`;
        } else {
            return `おかえりなさい、${userNickname}さん。${userNickname}さん、というお名前ですね。しっかり覚えました。ユーザー登録してくださり、本当にありがとうございます。\n\nどんな話をしましょうか？`;
        }
    },

    /**
     * 同意メッセージを取得
     * @returns {string} 同意メッセージ
     */
    getConsentMessage() {
        return 'ユーザー登録をすることで、より詳しいタロット鑑定ができるようになります';
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
        // 雪乃の場合はそのまま使用
        return currentCount;
    },

    /**
     * ユーザーメッセージを表示するかどうかを判定
     * @param {string} responseText - API応答テキスト
     * @param {boolean} isGuest - ゲストモードかどうか
     * @returns {boolean} 表示するかどうか
     */
    shouldShowUserMessage(responseText, isGuest) {
        // 雪乃の場合は常に表示
        return true;
    },

    /**
     * レスポンス表示後の処理（タロットカード解説後のボタン表示など）
     * @param {string} messageId - メッセージID
     */
    handleAfterResponseDisplay(messageId) {
        // 雪乃のタロット：カード解説後に「次のカードの鑑定」ボタンを表示
        const cardInfoStr = sessionStorage.getItem('yukinoTarotCardForExplanation');
        if (cardInfoStr) {
            try {
                const cardInfo = JSON.parse(cardInfoStr);
                const messagesDiv = document.getElementById('messages');
                if (messagesDiv && window.YukinoTarot && window.YukinoTarot.displayNextCardButton) {
                    // 少し待ってからボタンを表示（AI応答が完全に表示された後）
                    setTimeout(() => {
                        window.YukinoTarot.displayNextCardButton(cardInfo.position, messagesDiv);
                    }, 500);
                }
            } catch (error) {
                console.error('[タロットボタン表示] カード情報の解析エラー:', error);
            }
        }
    },

    /**
     * 個別相談モードかどうかを判定
     * @returns {boolean} 個別相談モードかどうか
     */
    isConsultationMode() {
        return sessionStorage.getItem('yukinoConsultationStarted') === 'true';
    },

    /**
     * 個別相談モードのメッセージカウントを取得
     * @returns {number} メッセージカウント
     */
    getConsultationMessageCount() {
        return parseInt(sessionStorage.getItem('yukinoConsultationMessageCount') || '0', 10);
    },

    /**
     * 個別相談モードのメッセージカウントをインクリメント
     * @returns {number} 新しいメッセージカウント
     */
    incrementConsultationMessageCount() {
        const currentCount = this.getConsultationMessageCount();
        const newCount = currentCount + 1;
        sessionStorage.setItem('yukinoConsultationMessageCount', String(newCount));
        
        // 9通目のメッセージを送信した直後にフラグを立てる
        if (newCount === 9) {
            console.log('[雪乃個別相談] 9通目送信。次のAPI応答後に登録ボタンを表示します');
            sessionStorage.setItem('yukinoShouldShowRegistrationButton', 'true');
        }
        
        return newCount;
    },

    /**
     * 11通目以降の処理（登録画面への遷移など）
     */
    handleOverLimit() {
        console.log('[雪乃個別相談] 11通目以降のため、登録画面へ遷移します');
        window.location.href = '/pages/auth/register.html';
    }
};

// グローバルスコープに公開
window.YukinoHandler = YukinoHandler;

// グローバル関数として公開（後方互換性のため）
window.handleYukinoRegistrationConsent = (consent) => YukinoHandler.handleRegistrationConsent(consent);
