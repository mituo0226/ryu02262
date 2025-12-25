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

        console.log('[雪乃ハンドラー] レスポンス処理開始:', {
            needsRegistration: response.needsRegistration,
            yukinoConsultationStarted: sessionStorage.getItem('yukinoConsultationStarted')
        });

        // 個別相談モードのチェック
        const isYukinoConsultation = sessionStorage.getItem('yukinoConsultationStarted') === 'true';

        // 10通目に達した場合（登録確認ボタンを表示）
        if (isYukinoConsultation && response.needsRegistration) {
            await this.handleTenthMessageRegistration(character);
            return true; // 処理完了
        }

        return false; // 共通処理を続行
    },

    /**
     * 10通目の登録確認処理
     * @param {string} character - キャラクターID
     */
    async handleTenthMessageRegistration(character) {
        const yukinoCount = parseInt(sessionStorage.getItem('yukinoConsultationMessageCount') || '0', 10);
        console.log('[雪乃ハンドラー] 10通目に達しました。登録確認ボタンを表示します:', yukinoCount);

        // ゲスト履歴を即座に保存（「はい」をクリックした場合に使用）
        const guestHistory = ChatData.getGuestHistory(character) || [];
        if (guestHistory.length > 0) {
            sessionStorage.setItem('pendingGuestHistoryMigration', JSON.stringify({
                character: character,
                history: guestHistory
            }));
            console.log('[雪乃ハンドラー] ゲスト履歴を保存:', {
                character: character,
                historyLength: guestHistory.length,
                userMessages: guestHistory.filter(msg => msg && msg.role === 'user').length
            });
        } else {
            console.warn('[雪乃ハンドラー] ⚠️ ゲスト履歴が空です！');
        }

        // 入力欄を無効化
        if (ChatUI.messageInput) {
            ChatUI.messageInput.disabled = true;
            ChatUI.messageInput.placeholder = 'ユーザー登録が必要です';
        }
        if (ChatUI.sendButton) {
            ChatUI.sendButton.disabled = true;
        }

        // AIメッセージのアニメーションが完了するまで待ってから「はい」「いいえ」ボタンを表示
        // タイプライター効果の完了を待つ（1.5秒程度）
        setTimeout(() => {
            this.showRegistrationButtons();
        }, 1500);
    },

    /**
     * 登録確認ボタンを表示
     */
    showRegistrationButtons() {
        console.log('[雪乃ハンドラー] 登録確認ボタンを表示');

        // 既存のコンテナがあれば削除
        const existingContainer = document.getElementById('yukinoRegistrationContainer');
        if (existingContainer) {
            existingContainer.remove();
        }

        // コンテナを作成（チャットメッセージの下に表示）
        const container = document.createElement('div');
        container.id = 'yukinoRegistrationContainer';
        container.className = 'ritual-consent-container';
        container.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 15px; padding: 20px; margin: 20px 10px; background: rgba(255, 255, 255, 0.95); border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); opacity: 0; transform: translateY(10px); transition: opacity 0.5s ease, transform 0.5s ease;';

        // 説明テキスト
        const explanation = document.createElement('p');
        explanation.textContent = 'ここから先はユーザー登録が必要となります。';
        explanation.style.cssText = 'margin: 0 0 10px 0; font-size: 15px; color: #555; text-align: center; line-height: 1.6;';
        container.appendChild(explanation);

        // 質問テキスト
        const question = document.createElement('p');
        question.textContent = 'ユーザー登録をしますか？';
        question.style.cssText = 'margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #333; text-align: center;';
        container.appendChild(question);

        // ボタンコンテナ
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;';

        // 「はい」ボタン
        const yesButton = document.createElement('button');
        yesButton.textContent = 'はい';
        yesButton.className = 'ritual-consent-button yes';
        yesButton.style.cssText = 'padding: 12px 30px; font-size: 16px; font-weight: 600; color: white; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 8px; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);';
        yesButton.onclick = () => this.handleRegistrationConsent(true);

        // ホバーエフェクト
        yesButton.onmouseenter = () => {
            yesButton.style.transform = 'translateY(-2px)';
            yesButton.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
        };
        yesButton.onmouseleave = () => {
            yesButton.style.transform = 'translateY(0)';
            yesButton.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
        };

        // 「いいえ」ボタン
        const noButton = document.createElement('button');
        noButton.textContent = 'いいえ';
        noButton.className = 'ritual-consent-button no';
        noButton.style.cssText = 'padding: 12px 30px; font-size: 16px; font-weight: 600; color: #666; background: #f0f0f0; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; transition: all 0.3s ease;';
        noButton.onclick = () => this.handleRegistrationConsent(false);

        // ホバーエフェクト
        noButton.onmouseenter = () => {
            noButton.style.background = '#e0e0e0';
            noButton.style.borderColor = '#ccc';
        };
        noButton.onmouseleave = () => {
            noButton.style.background = '#f0f0f0';
            noButton.style.borderColor = '#ddd';
        };

        buttonContainer.appendChild(yesButton);
        buttonContainer.appendChild(noButton);
        container.appendChild(buttonContainer);

        // メッセージコンテナに追加（最後のメッセージの直後）
        if (ChatUI.messagesDiv) {
            ChatUI.messagesDiv.appendChild(container);
            
            // フェードインアニメーション
            setTimeout(() => {
                container.style.opacity = '1';
                container.style.transform = 'translateY(0)';
            }, 100);
            
            // スクロールして表示
            setTimeout(() => {
                ChatUI.scrollToLatest();
            }, 200);
        }
    },

    /**
     * 登録確認ボタンを非表示
     */
    hideRegistrationButtons() {
        const container = document.getElementById('yukinoRegistrationContainer');
        if (container) {
            container.style.opacity = '0';
            container.style.transform = 'translateY(-10px)';
            container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            setTimeout(() => {
                container.remove();
            }, 300);
        }
    },

    /**
     * 登録確認処理（「はい」「いいえ」ボタンのハンドラー）
     * @param {boolean} consent - 登録するかどうか
     */
    handleRegistrationConsent(consent) {
        console.log('[雪乃ハンドラー] 登録確認:', consent ? '「はい」' : '「いいえ」');

        // ボタンを非表示
        this.hideRegistrationButtons();

        if (consent) {
            // 「はい」を押した場合：登録画面へ遷移
            console.log('[雪乃ハンドラー] 登録画面へ遷移します');

            // ゲスト履歴は既に保存済み（needsRegistrationフラグが立った時点で保存済み）

            // 登録画面へ遷移
            setTimeout(() => {
                window.location.href = '../auth/register.html?redirect=' + encodeURIComponent(window.location.href);
            }, 1000);
        } else {
            // 「いいえ」を押した場合：お別れメッセージを表示してmain.htmlへリダイレクト
            console.log('[雪乃ハンドラー] main.htmlへリダイレクトします');

            // 笹岡のお別れメッセージを表示
            const farewellMessage = 'わかりました。それではまた何かあったら連絡ください。これまでの会話の中身は私は忘れてしまうと思うので、今度来た時にはゼロから話をしてくださいね。お待ちしています。';
            ChatUI.addMessage('character', farewellMessage, this.characterName);

            // ゲストモードで会話したことを記録（次回再訪問時にリダイレクト用）
            this.markGuestConversed();

            // ゲスト履歴とカウントをクリア
            this.clearGuestHistory();

            // 3秒後にmain.htmlへリダイレクト
            setTimeout(() => {
                window.location.href = '../main.html';
            }, 3000);
        }
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

        // 雪乃のタロット関連フラグをクリア
        sessionStorage.removeItem('yukinoThreeCardsPrepared');
        sessionStorage.removeItem('yukinoAllThreeCards');
        sessionStorage.removeItem('yukinoRemainingCards');
        sessionStorage.removeItem('yukinoTarotCardForExplanation');
        sessionStorage.removeItem('yukinoSummaryShown');
        sessionStorage.removeItem('yukinoFirstMessageInSession');
        sessionStorage.removeItem('yukinoConsultationStarted');
        sessionStorage.removeItem('yukinoConsultationMessageCount');

        console.log('[雪乃ハンドラー] ゲスト履歴とタロット関連フラグをクリアしました');
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
