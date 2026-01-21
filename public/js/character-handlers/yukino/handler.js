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
     * メッセージ送信前の処理
     * @param {string} message - 送信するメッセージ
     * @returns {Object} { proceed: boolean, modifiedMessage?: string, waitingMessageId?: string }
     */
    beforeMessageSent(message) {
        console.log('[雪乃ハンドラー] メッセージ送信前処理:', message);
        
        // 待機画面を表示
        const waitingMessageId = this.showWaitingScreen();
        
        // 特に変更なし、そのまま送信
        return { proceed: true, waitingMessageId };
    },

    /**
     * メッセージ送信後の処理（API応答受信前）
     * @param {string} waitingMessageId - 待機メッセージのID
     */
    onMessageSent(waitingMessageId) {
        // 待機画面は既に表示されているため、ここでは何もしない
        console.log('[雪乃ハンドラー] メッセージ送信完了、待機画面表示中');
    },

    /**
     * API応答受信後の処理（メッセージ表示前）
     * @param {string} waitingMessageId - 待機メッセージのID
     */
    onResponseReceived(waitingMessageId) {
        // 待機画面を非表示にする
        this.hideWaitingScreen(waitingMessageId);
        console.log('[雪乃ハンドラー] API応答受信、待機画面を非表示にしました');
    },

    /**
     * エラー発生時の処理
     * @param {string} waitingMessageId - 待機メッセージのID
     */
    onError(waitingMessageId) {
        // エラー時も待機画面を非表示にする
        this.hideWaitingScreen(waitingMessageId);
        console.log('[雪乃ハンドラー] エラー発生、待機画面を非表示にしました');
    },

    /**
     * 待機画面を表示
     * @returns {string|null} 待機メッセージのID
     */
    showWaitingScreen() {
        const messagesDiv = document.getElementById('messages');
        if (!messagesDiv) {
            console.warn('[雪乃ハンドラー] messages要素が見つかりません');
            return null;
        }

        // 待機画面コンテナを作成
        const waitingContainer = document.createElement('div');
        const waitingId = `yukino-waiting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        waitingContainer.id = waitingId;
        waitingContainer.className = 'yukino-waiting-screen';
        
        // 神秘的なスタイルを適用
        waitingContainer.style.cssText = `
            position: relative;
            width: 100%;
            min-height: 200px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            margin: 20px 0;
            background: linear-gradient(135deg, rgba(10, 10, 20, 0.95) 0%, rgba(30, 10, 40, 0.95) 100%);
            border-radius: 20px;
            border: 2px solid rgba(147, 112, 219, 0.3);
            box-shadow: 
                0 0 30px rgba(147, 112, 219, 0.4),
                inset 0 0 30px rgba(138, 43, 226, 0.2);
            overflow: hidden;
            animation: yukinoWaitingFadeIn 0.8s ease-out;
        `;

        // 背景の神秘的なエフェクト
        const backgroundEffect = document.createElement('div');
        backgroundEffect.className = 'yukino-waiting-background';
        backgroundEffect.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: 
                radial-gradient(circle at 20% 30%, rgba(147, 112, 219, 0.2) 0%, transparent 50%),
                radial-gradient(circle at 80% 70%, rgba(138, 43, 226, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 50% 50%, rgba(75, 0, 130, 0.1) 0%, transparent 70%);
            animation: yukinoWaitingPulse 4s ease-in-out infinite;
            z-index: 1;
        `;
        waitingContainer.appendChild(backgroundEffect);

        // 浮遊する光の粒子
        const particlesContainer = document.createElement('div');
        particlesContainer.className = 'yukino-waiting-particles';
        particlesContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                radial-gradient(2px 2px at 20% 30%, rgba(255, 255, 255, 0.6), transparent),
                radial-gradient(2px 2px at 60% 70%, rgba(147, 112, 219, 0.5), transparent),
                radial-gradient(1px 1px at 50% 50%, rgba(255, 215, 0, 0.6), transparent),
                radial-gradient(1px 1px at 80% 10%, rgba(138, 43, 226, 0.5), transparent),
                radial-gradient(2px 2px at 90% 60%, rgba(255, 255, 255, 0.4), transparent),
                radial-gradient(1px 1px at 30% 90%, rgba(147, 112, 219, 0.6), transparent);
            background-size: 200% 200%;
            background-position: 0% 0%, 100% 100%, 50% 50%, 100% 0%, 0% 100%, 50% 100%;
            animation: yukinoWaitingParticles 20s linear infinite;
            z-index: 1;
        `;
        waitingContainer.appendChild(particlesContainer);

        // メッセージコンテンツ
        const content = document.createElement('div');
        content.className = 'yukino-waiting-content';
        content.style.cssText = `
            position: relative;
            z-index: 2;
            text-align: center;
        `;

        // メインメッセージ
        const mainMessage = document.createElement('h2');
        mainMessage.className = 'yukino-waiting-message';
        mainMessage.textContent = 'タロットの力を読み解いています...';
        mainMessage.style.cssText = `
            font-size: clamp(18px, 3vw, 24px);
            margin: 0 0 20px 0;
            color: #ffd700;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-shadow: 
                0 0 10px rgba(255, 215, 0, 0.8),
                0 0 20px rgba(147, 112, 219, 0.6),
                0 0 30px rgba(255, 107, 157, 0.4);
            animation: yukinoWaitingTextGlow 3s ease-in-out infinite;
        `;
        content.appendChild(mainMessage);

        // サブメッセージ
        const subMessage = document.createElement('p');
        subMessage.className = 'yukino-waiting-submessage';
        subMessage.textContent = '星々の導きを待っています';
        subMessage.style.cssText = `
            font-size: clamp(14px, 2.5vw, 18px);
            margin: 0 0 30px 0;
            color: #e8d5ff;
            opacity: 0.9;
            animation: yukinoWaitingTextFade 2s ease-in-out infinite;
            letter-spacing: 0.05em;
        `;
        content.appendChild(subMessage);

        // 神秘的なスピナー
        const spinner = document.createElement('div');
        spinner.className = 'yukino-waiting-spinner';
        spinner.style.cssText = `
            width: 60px;
            height: 60px;
            margin: 0 auto;
            position: relative;
        `;

        // 外側のリング
        const outerRing = document.createElement('div');
        outerRing.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 60px;
            height: 60px;
            border: 3px solid rgba(147, 112, 219, 0.2);
            border-top-color: #9370DB;
            border-radius: 50%;
            animation: yukinoWaitingSpin 1.2s linear infinite;
            box-shadow: 
                0 0 15px rgba(147, 112, 219, 0.6),
                0 0 30px rgba(147, 112, 219, 0.3),
                inset 0 0 20px rgba(147, 112, 219, 0.2);
        `;
        spinner.appendChild(outerRing);

        // 内側のリング
        const innerRing = document.createElement('div');
        innerRing.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 215, 0, 0.2);
            border-top-color: #ffd700;
            border-radius: 50%;
            animation: yukinoWaitingSpin 0.8s linear infinite reverse;
            box-shadow: 
                0 0 10px rgba(255, 215, 0, 0.5),
                0 0 20px rgba(255, 215, 0, 0.3);
        `;
        spinner.appendChild(innerRing);

        // 中心の光る点
        const centerGlow = document.createElement('div');
        centerGlow.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 8px;
            height: 8px;
            background: radial-gradient(circle, #ffd700 0%, rgba(255, 215, 0, 0.3) 70%, transparent 100%);
            border-radius: 50%;
            animation: yukinoWaitingCenterPulse 2s ease-in-out infinite;
            box-shadow: 
                0 0 15px rgba(255, 215, 0, 0.8),
                0 0 30px rgba(147, 112, 219, 0.6);
        `;
        spinner.appendChild(centerGlow);

        content.appendChild(spinner);
        waitingContainer.appendChild(content);

        // 波紋エフェクト
        const ripple = document.createElement('div');
        ripple.className = 'yukino-waiting-ripple';
        ripple.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100px;
            height: 100px;
            border: 2px solid rgba(147, 112, 219, 0.3);
            border-radius: 50%;
            animation: yukinoWaitingRipple 3s ease-out infinite;
            z-index: 1;
        `;
        waitingContainer.appendChild(ripple);

        // スタイルシートを追加（まだ存在しない場合）
        if (!document.getElementById('yukino-waiting-styles')) {
            const style = document.createElement('style');
            style.id = 'yukino-waiting-styles';
            style.textContent = `
                @keyframes yukinoWaitingFadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes yukinoWaitingPulse {
                    0%, 100% {
                        opacity: 0.6;
                        transform: scale(1);
                    }
                    50% {
                        opacity: 1;
                        transform: scale(1.1);
                    }
                }

                @keyframes yukinoWaitingParticles {
                    0% {
                        background-position: 0% 0%, 100% 100%, 50% 50%, 100% 0%, 0% 100%, 50% 100%;
                    }
                    100% {
                        background-position: 100% 100%, 0% 0%, 50% 50%, 0% 100%, 100% 0%, 50% 0%;
                    }
                }

                @keyframes yukinoWaitingTextGlow {
                    0%, 100% {
                        text-shadow: 
                            0 0 10px rgba(255, 215, 0, 0.8),
                            0 0 20px rgba(147, 112, 219, 0.6),
                            0 0 30px rgba(255, 107, 157, 0.4);
                        transform: translateY(0);
                    }
                    50% {
                        text-shadow: 
                            0 0 20px rgba(255, 215, 0, 1),
                            0 0 40px rgba(147, 112, 219, 0.9),
                            0 0 60px rgba(255, 107, 157, 0.7),
                            0 0 80px rgba(196, 69, 105, 0.5);
                        transform: translateY(-3px);
                    }
                }

                @keyframes yukinoWaitingTextFade {
                    0%, 100% {
                        opacity: 0.7;
                    }
                    50% {
                        opacity: 1;
                    }
                }

                @keyframes yukinoWaitingSpin {
                    to {
                        transform: translate(-50%, -50%) rotate(360deg);
                    }
                }

                @keyframes yukinoWaitingCenterPulse {
                    0%, 100% {
                        opacity: 0.6;
                        transform: translate(-50%, -50%) scale(0.8);
                    }
                    50% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1.2);
                    }
                }

                @keyframes yukinoWaitingRipple {
                    0% {
                        width: 100px;
                        height: 100px;
                        opacity: 1;
                    }
                    100% {
                        width: 300px;
                        height: 300px;
                        opacity: 0;
                    }
                }

                .yukino-waiting-screen {
                    animation: yukinoWaitingFadeIn 0.8s ease-out;
                }

                .yukino-waiting-screen.fade-out {
                    animation: yukinoWaitingFadeOut 0.5s ease-out forwards;
                }

                @keyframes yukinoWaitingFadeOut {
                    from {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // メッセージエリアに追加
        messagesDiv.appendChild(waitingContainer);

        console.log('[雪乃ハンドラー] 待機画面を表示しました:', waitingId);
        return waitingId;
    },

    /**
     * 待機画面を非表示にする
     * @param {string} waitingMessageId - 待機メッセージのID
     */
    hideWaitingScreen(waitingMessageId) {
        if (!waitingMessageId) {
            console.warn('[雪乃ハンドラー] 待機画面IDが指定されていません');
            return;
        }

        const waitingElement = document.getElementById(waitingMessageId);
        if (waitingElement) {
            // フェードアウトアニメーションを適用
            waitingElement.classList.add('fade-out');
            
            // アニメーション完了後に削除
            setTimeout(() => {
                if (waitingElement.parentNode) {
                    waitingElement.remove();
                    console.log('[雪乃ハンドラー] 待機画面を削除しました:', waitingMessageId);
                }
            }, 500);
        } else {
            console.warn('[雪乃ハンドラー] 待機画面要素が見つかりません:', waitingMessageId);
        }
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
        
        // [SUGGEST_TAROT]タグは削除しない
        // onMessageAddedで検出してボタンを表示するためのマーカーとして使用する
        
        return false; // 共通処理を続行
    },

    /**
     * 登録完了後の処理
     * @param {Object} historyData - 会話履歴データ
     * @param {Array} guestHistory - ゲスト履歴
     * @returns {boolean} 処理が完了したか
     */
    async handlePostRegistration(historyData) {
        console.log('[雪乃ハンドラー] 登録完了後の処理');

        // 【変更】localStorageからのフラグ削除を削除（データベースベースの判断）
        // ゲストユーザーの会話状態はデータベースで管理されるため、フラグの削除は不要

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
        // 親クラスの処理を呼び出す（BaseCharacterHandlerを継承していないため、手動で処理）
        // バックエンドの判定結果（visitPattern）を使用
        const visitPattern = historyData?.visitPattern || (historyData?.hasHistory ? 'returning' : 'first_visit');
        
        // 共通処理を実行（メッセージ表示など）
        // ただし、chat-engine.jsで既に処理されているため、ここでは何もしない
        return null;
    },

    /**
     * 新規会話開始時にフラグをクリアする処理
     * @param {Array} conversationHistory - 会話履歴
     * @param {*} tempCardInfo - 一時保存されたカード情報（存在する場合、現在は使用しない）
     */
    clearFlagsOnNewConversation(conversationHistory, tempCardInfo) {
        // 会話履歴が空の場合、タロット関連フラグをクリア（新規会話として扱う）
        // ⚠️ ただし、yukinoTarotCardForExplanationは解説後のボタン表示で使うため、クリアしない
        if (conversationHistory.length === 0) {
            // sessionStorageから直接カード情報を確認（解説待ち状態かどうか）
            const cardInfoStr = sessionStorage.getItem('yukinoTarotCardForExplanation');
            const cardInfoExists = cardInfoStr !== null;
            
            if (!cardInfoExists) {
                // 新規会話なので、タロット関連フラグをクリア
                sessionStorage.removeItem('yukinoThreeCardsPrepared');
                sessionStorage.removeItem('yukinoAllThreeCards');
                sessionStorage.removeItem('yukinoRemainingCards');
                sessionStorage.removeItem('yukinoSummaryShown');
                sessionStorage.removeItem('yukinoFirstMessageInSession');
                console.log('[雪乃ハンドラー] 新規会話：タロット関連フラグをクリアしました');
            } else {
                console.log('[雪乃ハンドラー] カード解説待ち状態を検出。フラグクリアをスキップします。');
            }
        }
    },

    /**
     * セッション最初のメッセージを記録する処理
     * @param {string} message - メッセージテキスト
     * @param {boolean} isTarotExplanationTrigger - タロット解説トリガーかどうか
     */
    onFirstMessageInSession(message, isTarotExplanationTrigger) {
        // タロット解説トリガーでない場合のみ記録
        if (!isTarotExplanationTrigger) {
            sessionStorage.setItem('yukinoFirstMessageInSession', message);
            console.log('[雪乃ハンドラー] セッション最初のメッセージを記録:', message.substring(0, 50));
        }
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
                const card = JSON.parse(cardInfoStr);
                console.log('[タロットボタン表示] カード解説後、次のステップボタンを表示:', {
                    position: card.position,
                    name: card.name
                });
                
                // sessionStorageをクリア
                sessionStorage.removeItem('yukinoTarotCardForExplanation');
                
                // メッセージコンテナを取得
                const messagesDiv = document.getElementById('messages');
                if (messagesDiv && window.YukinoTarot && window.YukinoTarot.displayNextCardButton) {
                    // 少し待ってからボタンを表示（AI応答が完全に表示された後）
                    setTimeout(() => {
                        window.YukinoTarot.displayNextCardButton(card.position, messagesDiv);
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
        // デバッグ: onMessageAddedが呼ばれたことをログに記録
        console.log('[雪乃ハンドラー] onMessageAdded呼び出し:', {
            type,
            sender,
            hasText: !!text,
            textType: typeof text,
            textPreview: text && typeof text === 'string' ? text.substring(0, 100) : String(text),
            hasSuggestTarot: text && typeof text === 'string' ? text.includes('[SUGGEST_TAROT]') : false,
            typeCheck: type === 'character' || type === 'assistant' || type === 'welcome',
            messageDiv: !!messageDiv,
            messageId
        });
        
        // 雪乃のメッセージに[SUGGEST_TAROT]マーカーが含まれている場合、「タロットカードを引く」ボタンを表示
        // 再訪問時のwelcomeメッセージにも対応するため、typeに'welcome'も追加
        const typeMatches = (type === 'character' || type === 'assistant' || type === 'welcome');
        const hasSuggestTarot = text && typeof text === 'string' && text.includes('[SUGGEST_TAROT]');
        
        if (text && typeof text === 'string' && text.includes('[SUGGEST_TAROT]')) {
            console.log('[雪乃ハンドラー] [SUGGEST_TAROT]検出 - 条件チェック:', {
                typeMatches,
                hasSuggestTarot,
                type,
                willShowButton: typeMatches && hasSuggestTarot
            });
        }
        
        if (typeMatches && hasSuggestTarot) {
            
            console.log('[雪乃ハンドラー] タロット鑑定提案を検出しました - ボタンを表示します');
            
            // 安全策：入力欄が無効化されている場合（3枚鑑定中）はスキップ
            const messageInput = document.getElementById('messageInput');
            if (messageInput && messageInput.disabled) {
                console.log('[雪乃ハンドラー] タロット鑑定中のため、ボタン表示をスキップします');
                return;
            }
            
            // [SUGGEST_TAROT]マーカーをメッセージから削除（すべての出現を削除）
            // 既にchat-ui.jsで削除されている可能性があるが、念のため再度削除
            const cleanedText = text.replace(/\[SUGGEST_TAROT\]/g, '');
            const textDiv = messageDiv.querySelector('.message-text');
            if (textDiv) {
                // 既に削除されている可能性があるが、念のため再度削除
                const currentText = textDiv.textContent;
                if (currentText.includes('[SUGGEST_TAROT]')) {
                    textDiv.textContent = currentText.replace(/\[SUGGEST_TAROT\]/g, '');
                } else {
                    // 既に削除されている場合は、cleanedTextを設定（念のため）
                    textDiv.textContent = cleanedText;
                }
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
        
        // 雪乃の初回メッセージ（firstTimeGuest）の後にタロット鑑定を自動開始
        if ((type === 'welcome' || type === 'character') && 
            (text.includes('まずは何がともあれ、あなたの現在の運勢をタロットで占いますので') ||
             text.includes('はじめまして、笹岡雪乃です'))) {
            
            console.log('[雪乃ハンドラー] 初回メッセージを検出 - タロット鑑定を自動開始します');
            
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
            
            // 少し待ってからタロット鑑定を自動開始（メッセージが完全に表示された後）
            setTimeout(() => {
                if (window.YukinoTarot && typeof window.YukinoTarot.start === 'function') {
                    console.log('[雪乃ハンドラー] タロット鑑定を自動開始します');
                    window.YukinoTarot.start();
                } else {
                    console.error('[雪乃ハンドラー] YukinoTarot.startが見つかりません');
                    // YukinoTarotが読み込まれていない場合、少し待ってから再試行
                    setTimeout(() => {
                        if (window.YukinoTarot && typeof window.YukinoTarot.start === 'function') {
                            console.log('[雪乃ハンドラー] タロット鑑定を自動開始します（リトライ）');
                            window.YukinoTarot.start();
                        } else {
                            console.error('[雪乃ハンドラー] YukinoTarot.startが見つかりません（リトライ失敗）');
                        }
                    }, 500);
                }
            }, 500);
            
            console.log('[雪乃ハンドラー] 初回タロット鑑定自動開始設定 - 入力欄を無効化しました');
        }
    }
};

// グローバルスコープに公開
window.YukinoHandler = YukinoHandler;

// グローバル関数として公開（後方互換性のため）
window.handleYukinoRegistrationConsent = (consent) => YukinoHandler.handleRegistrationConsent(consent);
