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
    async init() {
        console.log('[雪乃ハンドラー] 初期化');
        
        try {
            // タロット機能スクリプトを動的に読み込む（必要な時のみ読み込む）
            console.log('[雪乃ハンドラー] loadTarotScript()を呼び出します');
            await this.loadTarotScript();
            console.log('[雪乃ハンドラー] loadTarotScript()完了');
            
            // タロット機能の初期化
            if (window.YukinoTarot && typeof window.YukinoTarot.init === 'function') {
                window.YukinoTarot.init();
            } else {
                console.warn('[雪乃ハンドラー] YukinoTarotが読み込まれていません');
            }
        } catch (error) {
            console.error('[雪乃ハンドラー] init()でエラーが発生しました:', error);
        }
        
        // ゲストモード再訪問のチェック
        this.checkGuestRevisit();
    },

    /**
     * タロット機能スクリプトを動的に読み込む
     * @returns {Promise<void>}
     */
    async loadTarotScript() {
        // 既に読み込まれているか確認
        if (window.YukinoTarot) {
            console.log('[雪乃ハンドラー] タロット機能は既に読み込まれています');
            return;
        }

        // 既にスクリプトタグが存在するか確認
        const existingScript = document.querySelector('script[src*="yukino-tarot.js"]');
        if (existingScript) {
            console.log('[雪乃ハンドラー] タロット機能スクリプトは既に読み込まれています（待機中）');
            // スクリプトが読み込まれるまで待機
            let attempts = 0;
            const maxAttempts = 50; // 5秒間待機
            while (!window.YukinoTarot && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            return;
        }

        try {
            console.log('[雪乃ハンドラー] タロット機能スクリプトを動的に読み込みます');
            // CharacterLoaderのloadScriptメソッドを使用
            if (window.CharacterLoader && typeof window.CharacterLoader.loadScript === 'function') {
                await window.CharacterLoader.loadScript('/js/features/yukino-tarot.js');
            } else {
                // CharacterLoaderが利用できない場合は直接読み込む
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = '/js/features/yukino-tarot.js';
                    script.async = true;
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error('Failed to load yukino-tarot.js'));
                    document.head.appendChild(script);
                });
            }
            console.log('[雪乃ハンドラー] タロット機能スクリプトの読み込みが完了しました');
        } catch (error) {
            console.error('[雪乃ハンドラー] タロット機能スクリプトの読み込みに失敗しました:', error);
        }
    },

    // 【削除】handleGuestLimit関数は削除されました（10通制限が廃止されたため）

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
            // 【削除】10通制限チェックは削除されました
            if (false && window.GuestLimitManager && typeof window.GuestLimitManager.checkAndHandleGuestLimit === 'function') {
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
    },

    /**
     * メッセージ追加後の処理（chat-ui.jsから呼び出される）
     * これにより、chat-ui.jsに鑑定士固有の処理を記述する必要がなくなる
     * @param {string} type - メッセージタイプ ('user', 'character', 'welcome', 'error', 'loading')
     * @param {string} text - メッセージテキスト
     * @param {string} sender - 送信者名
     * @param {HTMLElement} messageDiv - メッセージ要素
     * @param {string} messageId - メッセージID
     * @param {Object} options - オプション
     */
    onMessageAdded(type, text, sender, messageDiv, messageId, options = {}) {
        // 雪乃のメッセージに[SUGGEST_TAROT]マーカーが含まれている場合、「タロットカードを引く」ボタンを表示
        if ((type === 'character' || type === 'assistant') && 
            text.includes('[SUGGEST_TAROT]')) {
            
            console.log('[雪乃ハンドラー] タロット鑑定提案を検出しました');
            
            // 安全策：入力欄が無効化されている場合（3枚鑑定中）はスキップ
            const messageInput = document.getElementById('messageInput');
            if (messageInput && messageInput.disabled) {
                console.log('[雪乃ハンドラー] タロット鑑定中のため、ボタン表示をスキップします');
                return;
            }
            
            // [SUGGEST_TAROT]マーカーをメッセージから削除
            const cleanedText = text.replace('[SUGGEST_TAROT]', '');
            const textDiv = messageDiv.querySelector('.message-text');
            if (textDiv) {
                textDiv.textContent = cleanedText;
            }
            
            // 「タロットカードを引く」ボタンを作成
            const buttonWrapper = document.createElement('div');
            buttonWrapper.style.marginTop = '15px';
            buttonWrapper.style.textAlign = 'center';
            
            const tarotButton = document.createElement('button');
            tarotButton.textContent = 'タロットカードを引く';
            tarotButton.className = 'tarot-button';
            tarotButton.style.padding = '12px 30px';
            tarotButton.style.backgroundColor = '#9370DB';
            tarotButton.style.color = 'white';
            tarotButton.style.border = 'none';
            tarotButton.style.borderRadius = '25px';
            tarotButton.style.fontSize = '16px';
            tarotButton.style.cursor = 'pointer';
            tarotButton.style.boxShadow = '0 2px 8px rgba(147, 112, 219, 0.3)';
            tarotButton.style.transition = 'all 0.3s ease';
            
            tarotButton.addEventListener('mouseover', () => {
                tarotButton.style.backgroundColor = '#7B68EE';
                tarotButton.style.transform = 'translateY(-2px)';
                tarotButton.style.boxShadow = '0 4px 12px rgba(147, 112, 219, 0.4)';
            });
            
            tarotButton.addEventListener('mouseout', () => {
                tarotButton.style.backgroundColor = '#9370DB';
                tarotButton.style.transform = 'translateY(0)';
                tarotButton.style.boxShadow = '0 2px 8px rgba(147, 112, 219, 0.3)';
            });
            
            tarotButton.addEventListener('click', () => {
                console.log('[雪乃ハンドラー] タロットカードを引くボタンがクリックされました');
                
                // ボタンを無効化（2重クリック防止）
                tarotButton.disabled = true;
                tarotButton.textContent = 'カードを準備中...';
                tarotButton.style.opacity = '0.6';
                tarotButton.style.cursor = 'not-allowed';
                
                // 1枚のカード鑑定を開始
                if (window.YukinoTarot && typeof window.YukinoTarot.startSingleCard === 'function') {
                    window.YukinoTarot.startSingleCard();
                } else {
                    console.error('[タロット占い] YukinoTarot.startSingleCardが見つかりません');
                }
            });
            
            buttonWrapper.appendChild(tarotButton);
            messageDiv.appendChild(buttonWrapper);
        }
        
        // 雪乃の初回メッセージの後に「タロット占い開始」ボタンを追加
        if ((type === 'welcome' || type === 'character') && 
            text.includes('それではまず、過去のカードをめくってみましょう')) {
            
            const buttonWrapper = document.createElement('div');
            buttonWrapper.style.width = '100%';
            buttonWrapper.style.display = 'flex';
            buttonWrapper.style.justifyContent = 'center';
            buttonWrapper.style.marginTop = '16px';
            buttonWrapper.style.marginBottom = '16px';
            
            const startButton = document.createElement('button');
            startButton.textContent = 'タロット占い開始';
            startButton.style.padding = '12px 32px';
            startButton.style.fontSize = '16px';
            startButton.style.fontWeight = '600';
            startButton.style.color = '#ffffff';
            startButton.style.backgroundColor = 'rgba(138, 43, 226, 0.8)';
            startButton.style.border = '2px solid rgba(138, 43, 226, 1)';
            startButton.style.borderRadius = '8px';
            startButton.style.cursor = 'pointer';
            startButton.style.transition = 'all 0.2s ease';
            startButton.style.boxShadow = '0 4px 16px rgba(138, 43, 226, 0.4)';
            
            startButton.addEventListener('mouseenter', () => {
                startButton.style.backgroundColor = 'rgba(138, 43, 226, 1)';
                startButton.style.transform = 'scale(1.05)';
            });
            startButton.addEventListener('mouseleave', () => {
                startButton.style.backgroundColor = 'rgba(138, 43, 226, 0.8)';
                startButton.style.transform = 'scale(1)';
            });
            
            startButton.addEventListener('click', () => {
                startButton.disabled = true;
                startButton.style.opacity = '0.5';
                startButton.style.cursor = 'not-allowed';
                
                // タロット占いを開始
                if (window.YukinoTarot && typeof window.YukinoTarot.start === 'function') {
                    window.YukinoTarot.start();
                } else {
                    console.error('[タロット占い] YukinoTarot.startが見つかりません');
                }
            });
            
            buttonWrapper.appendChild(startButton);
            messageDiv.appendChild(buttonWrapper);
            
            // 初回の3枚タロット鑑定が完了するまで、メッセージ入力欄を無効化
            const messageInput = document.getElementById('messageInput');
            const sendButton = document.getElementById('sendButton');
            if (messageInput) {
                messageInput.disabled = true;
                messageInput.placeholder = '3枚のタロット鑑定を完了してから相談できます';
                messageInput.style.backgroundColor = 'rgba(200, 200, 200, 0.3)';
                messageInput.style.cursor = 'not-allowed';
            }
            if (sendButton) {
                sendButton.disabled = true;
                sendButton.style.opacity = '0.5';
                sendButton.style.cursor = 'not-allowed';
            }
            
            console.log('[雪乃ハンドラー] 初回タロット鑑定ボタン表示 - 入力欄を無効化しました');
        }
    }
};

// グローバルスコープに公開
window.YukinoHandler = YukinoHandler;

// グローバル関数として公開（後方互換性のため）
window.handleYukinoRegistrationConsent = (consent) => YukinoHandler.handleRegistrationConsent(consent);
