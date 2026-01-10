/**
 * handler.js
 * 楓（kaede）専用のチャットロジック
 * 守護神の儀式、ゲストモード登録フローなど、楓固有の処理を管理
 * 
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【重要】守護神の儀式完了後の処理順序について
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 儀式完了後のチャット画面表示では、以下の順序で処理を実行すること：
 * 
 * ステップ1: UI表示用の履歴をクリア
 *   - チャット画面（messagesDiv）をクリア
 *   - sessionStorageのゲスト履歴をクリア
 * 
 * ステップ2: firstQuestionを取得 ← 【必ずrecentMessagesクリア前に実行】
 *   - APIから取得（historyData.firstQuestion）
 *   - APIから取得できない場合は、ゲスト履歴から取得
 * 
 * ステップ3: recentMessagesをクリア ← 【必ずfirstQuestion取得後に実行】
 *   - historyData.recentMessagesを空配列にする
 *   - ChatData.conversationHistory.recentMessagesを空配列にする
 * 
 * ⚠️ 警告：ステップ2と3の順序を逆にすると、firstQuestionが取得できなくなり、
 *          ユーザー登録後の楓の定型文に「最初の質問」が含まれなくなります。
 * 
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const KaedeHandler = {
    characterId: 'kaede',
    characterName: '楓',

    /**
     * 初期化
     */
    init() {
        console.log('[楓ハンドラー] 初期化');
        // 特に初期化処理なし（守護神の儀式は動的に開始）
    },

    // 【削除】handleGuestLimit関数は削除されました（10通制限が廃止されたため）

    /**
     * メッセージ送信前の処理
     * @param {string} message - 送信するメッセージ
     * @returns {Object} { proceed: boolean, modifiedMessage?: string }
     */
    beforeMessageSent(message) {
        console.log('[楓ハンドラー] メッセージ送信前処理:', message);
        
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
            return false; // 楓以外は処理しない
        }

        console.log('[楓ハンドラー] レスポンス処理:', response);

        // ゲストモードの場合、10通到達時のチェックを実行
        if (window.AuthState && !window.AuthState.isRegistered()) {
            // 【削除】10通制限チェックは削除されました
            if (false && window.GuestLimitManager && typeof window.GuestLimitManager.checkAndHandleGuestLimit === 'function') {
                const limitHandled = window.GuestLimitManager.checkAndHandleGuestLimit(character, response);
                if (limitHandled) {
                    console.log('[楓ハンドラー] 10通到達時の処理が完了しました');
                }
            }
        }

        // 現在は特殊な処理なし、共通処理を続行
        // 守護神の儀式は別の箇所で処理される
        return false;
    },

    /**
     * 登録完了後の処理
     * @param {Object} historyData - 会話履歴データ
     * @param {Array} guestHistory - ゲスト履歴
     * @returns {boolean} 処理が完了したか
     */
    async handlePostRegistration(historyData, guestHistory = []) {
        console.log('[楓ハンドラー] 登録完了後の処理');

        // 守護神の儀式が必要な場合は handleGuardianRitualCompletion で処理
        return false; // 共通処理を続行
    },

    /**
     * ページ初期化処理（initPage関数から呼び出される）
     * @param {URLSearchParams} urlParams - URLパラメータ
     * @param {Object} historyData - 会話履歴データ
     * @param {boolean} justRegistered - 登録直後かどうか
     * @param {boolean} shouldTriggerRegistrationFlow - 登録フローをトリガーするか
     * @param {Object} options - 追加オプション（isGuestMode, guestHistory, guardianMessageShownなど）
     * @returns {Object|null} 処理結果（guardianConfirmationDataなど）
     */
    async initPage(urlParams, historyData, justRegistered, shouldTriggerRegistrationFlow, options = {}) {
        const { isGuestMode = false, guestHistory = [], guardianMessageShown = false } = options;
        
        console.log('[楓専用処理] initPage呼び出し:', {
            hasHistoryData: !!historyData,
            justRegistered,
            shouldTriggerRegistrationFlow,
            isGuestMode,
            guestHistoryLength: guestHistory.length,
            guardianMessageShown
        });
        
        // 守護神の儀式完了チェック
        const guardianConfirmationData = this.checkGuardianRitualCompletion(this.characterId, urlParams);
        if (guardianConfirmationData && historyData) {
            const completed = await this.handleGuardianRitualCompletion(
                this.characterId,
                guardianConfirmationData,
                historyData
            );
            if (completed) {
                return { completed: true };
            }
        }

        // 守護神の儀式開始処理（historyDataが存在する場合）
        if (historyData) {
            const ritualHandled = await this.handlePostRegistrationRitualStart(
                this.characterId,
                historyData,
                urlParams
            );
            // handlePostRegistrationRitualStartがtrueを返した場合でも、守護神の確認は続行する
            // （儀式を開始しない場合でも、守護神が未登録なら儀式を開始する必要があるため）
        } else if (!isGuestMode) {
            // historyDataが存在しない場合でも、登録済みユーザーの場合は守護神の儀式開始チェックを実行
            // （historyDataが取得できない場合でも、守護神が未登録なら儀式を開始する必要があるため）
            // handlePostRegistrationRitualStartにnullを渡すことで、localStorageから守護神を確認する処理を実行
            const ritualHandled = await this.handlePostRegistrationRitualStart(
                this.characterId,
                null,
                urlParams
            );
        }

        // 守護神が未登録かどうかを確認（ゲストユーザー・登録済みユーザー共通）
        console.log('[楓専用処理] 守護神の確認を開始:', {
            hasHistoryData: !!historyData,
            historyDataAssignedDeity: historyData?.assignedDeity,
            isGuestMode,
            guestHistoryLength: guestHistory.length,
            guardianMessageShown
        });
        
        let hasAssignedDeity = false;
        
        // 1. historyDataから守護神を確認
        if (historyData && historyData.assignedDeity) {
            hasAssignedDeity = historyData.assignedDeity.trim() !== '';
            console.log('[楓専用処理] historyDataから守護神を確認:', {
                assignedDeity: historyData.assignedDeity,
                hasAssignedDeity
            });
        }
        
        // 2. historyDataが取得できなかった場合、会話履歴を再取得して確認
        if (!hasAssignedDeity && !historyData && !isGuestMode) {
            try {
                console.log('[楓専用処理] 会話履歴を再取得して守護神を確認します');
                const recheckHistoryData = await ChatAPI.loadConversationHistory(this.characterId);
                hasAssignedDeity = recheckHistoryData && recheckHistoryData.assignedDeity && recheckHistoryData.assignedDeity.trim() !== '';
                console.log('[楓専用処理] 再取得結果:', {
                    hasRecheckData: !!recheckHistoryData,
                    assignedDeity: recheckHistoryData?.assignedDeity,
                    hasAssignedDeity
                });
            } catch (error) {
                console.error('[楓専用処理] 会話履歴の再取得に失敗:', error);
                // エラー時は処理を続行
            }
        }
        
        // 3. localStorageからも確認（ゲストユーザーでも確認）
        if (!hasAssignedDeity) {
            const localStorageDeity = localStorage.getItem('assignedDeity');
            hasAssignedDeity = !!(localStorageDeity && localStorageDeity.trim() !== '');
            console.log('[楓専用処理] localStorageから守護神を確認:', {
                localStorageDeity,
                hasAssignedDeity
            });
        }
        
        console.log('[楓専用処理] 守護神確認結果:', {
            hasAssignedDeity,
            guestHistoryLength: guestHistory.length,
            guardianMessageShown,
            hasHistoryData: !!historyData,
            shouldStartRitual: !hasAssignedDeity && !guardianMessageShown
        });
        
        // 守護神が未登録の場合、挨拶メッセージを表示し、自動的に儀式を開始
        // 【重要】会話履歴があっても、守護神が未登録なら儀式を開始する
        // （会話履歴がある場合は、儀式開始時に会話履歴をデータベースに移行する）
        if (!hasAssignedDeity && !guardianMessageShown) {
            const userType = isGuestMode ? 'ゲストユーザー' : '登録済みユーザー';
            console.log(`[楓専用処理] ${userType}が楓にアクセス。守護神が未登録のため、挨拶メッセージを表示し、自動的に儀式を開始します。`);
            const nickname = ChatData.userNickname || localStorage.getItem('userNickname') || 'あなた';
            const info = ChatData.characterInfo[this.characterId];
            
            // 会話履歴がある場合は、それを考慮したメッセージを表示
            const greetingMessage = guestHistory.length > 0
                ? `${nickname}さん、訪問していただいてありがとうございます。まずは、${nickname}さんの守護神を導き出す儀式を行い、守護神を降臨させてから、守護神と共に鑑定を進めてまいりますので、よろしくお願いします。`
                : `${nickname}さん、訪問していただいてありがとうございます。まずは、${nickname}さんの守護神を導き出す儀式を行い、守護神を降臨させてから、守護神と共に鑑定を進めてまいりますので、よろしくお願いします。`;
            ChatUI.addMessage('welcome', greetingMessage, info.name);
            
            // メッセージ表示後、少し待ってから自動的に守護神の儀式を開始
            // 会話履歴がある場合は、それを守護神の儀式に渡す
            setTimeout(async () => {
                if (window.ChatInit && typeof window.ChatInit.startGuardianRitual === 'function') {
                    // ゲスト履歴がある場合は、それを儀式に渡す
                    const ritualGuestHistory = guestHistory.length > 0 ? guestHistory : null;
                    await window.ChatInit.startGuardianRitual(this.characterId, ritualGuestHistory);
                }
            }, 2000); // 2秒後に儀式を開始
            
            return { skip: true }; // 初回メッセージは表示済みなので、共通処理をスキップ
        }

        return null;
    },

    /**
     * 登録後の定型文を取得
     * @param {string} userNickname - ユーザーのニックネーム
     * @param {string} lastGuestUserMessage - 最後のゲストユーザーメッセージ
     * @returns {string} 定型文
     */
    getWelcomeBackMessage(userNickname, lastGuestUserMessage) {
        // 楓の場合は共通処理を使用（特殊な定型文なし）
        return null; // 共通処理を使用
    },

    /**
     * 同意メッセージを取得
     * @returns {string} 同意メッセージ
     */
    getConsentMessage() {
        return 'ユーザー登録をすることにより、守護神の儀式を進めます';
    },

    /**
     * 拒否メッセージを取得
     * @returns {string} 拒否メッセージ
     */
    getDeclineMessage() {
        return '守護神の儀式をスキップしました。ゲストモードで会話を続けます。';
    },

    /**
     * メッセージカウントを計算（API送信用）
     * @param {number} currentCount - 現在のメッセージカウント
     * @returns {number} APIに送信するメッセージカウント
     */
    calculateMessageCount(currentCount) {
        // 楓の場合、会話履歴には既に今回送信するメッセージが含まれているため、-1する
        return Math.max(0, currentCount - 1);
    },

    /**
     * ユーザーメッセージを表示するかどうかを判定
     * @param {string} responseText - API応答テキスト
     * @param {boolean} isGuest - ゲストモードかどうか
     * @returns {boolean} 表示するかどうか
     */
    shouldShowUserMessage(responseText, isGuest) {
        if (!isGuest) {
            return true; // 登録ユーザーは常に表示
        }
        
        // 「ニックネームと生年月日を入力」が含まれる場合は、ユーザーメッセージを表示しない
        const hasRegistrationInput = responseText.includes('ニックネームと生年月日を入力') || 
                                     responseText.includes('**ニックネームと生年月日を入力**') ||
                                     responseText.includes('生年月日を入力');
        return !hasRegistrationInput;
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

        console.log('[楓ハンドラー] ゲスト履歴をクリアしました');
    },

    /**
     * 守護神の儀式完了後のメッセージ表示処理
     * @param {string} character - キャラクターID（'kaede'）
     * @param {Object} guardianConfirmationData - 守護神確認データ
     * @param {Object} historyData - 会話履歴データ
     * @returns {boolean} 処理が完了したかどうか（true: 処理完了、false: 処理しない）
     */
    async handleGuardianRitualCompletion(character, guardianConfirmationData, historyData) {
        if (character !== 'kaede') {
            return false; // 楓以外は処理しない
        }

        console.log('[楓専用処理] 守護神の儀式完了メッセージを表示します:', guardianConfirmationData);

        // APIの指示によりチャットをクリア
        // 【重要】clearChatがfalseの場合でも、守護神の儀式完了後はチャットをクリアする
        const shouldClearChat = (historyData && historyData.clearChat) || true; // 常にクリア（守護神の儀式完了後は会話をゼロからスタート）

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 【処理順序が重要】以下の3ステップは必ずこの順序で実行すること
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ステップ1: UI表示用の履歴をクリア（画面から過去の吹き出しを削除）
        // ステップ2: firstQuestionを取得（データベースまたはゲスト履歴から）
        // ステップ3: データベース履歴（recentMessages）をクリア（UI表示防止）
        // 
        // ⚠️ 警告：ステップ2と3の順序を逆にすると、firstQuestionが取得できなくなります
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ステップ1: UI表示用の履歴をクリア
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (shouldClearChat) {
            console.log('[楓専用処理] ステップ1: チャットをクリアします（儀式完了後）');

            // チャット画面をクリア（守護神の儀式完了後は会話をゼロからスタート）
            if (ChatUI.messagesDiv) {
                ChatUI.messagesDiv.innerHTML = '';
                console.log('[楓専用処理] ✓ チャット画面をクリアしました');
            }

            // ゲスト履歴もクリア（API指示により）
            if (window.AuthState && typeof window.AuthState.clearGuestHistory === 'function') {
                AuthState.clearGuestHistory(character);
            }
            const GUEST_HISTORY_KEY_PREFIX = 'guestConversationHistory_';
            const historyKey = GUEST_HISTORY_KEY_PREFIX + character;
            sessionStorage.removeItem(historyKey);
            sessionStorage.removeItem('pendingGuestHistoryMigration');
            ChatData.setGuestMessageCount(character, 0);
            console.log('[楓専用処理] ✓ ゲスト履歴をクリアしました');
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ステップ2: firstQuestionを取得（⚠️ recentMessagesクリアより前に実行必須）
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        console.log('[楓専用処理] ステップ2: firstQuestionを取得します（recentMessagesクリア前）');
        console.log('[楓専用処理] 【検証】historyData.recentMessages件数:', historyData?.recentMessages?.length || 0);
        
        let firstQuestion = '';
        
        // 優先順位1: sessionStorageから取得（儀式開始前に保存された最初の質問）
        const savedFirstQuestion = sessionStorage.getItem('firstQuestionBeforeRitual');
        if (savedFirstQuestion) {
            firstQuestion = savedFirstQuestion.trim();
            console.log('[楓専用処理] ✓ sessionStorageからfirstQuestionを取得:', firstQuestion.substring(0, 50) + '...');
            // 使用後は削除
            sessionStorage.removeItem('firstQuestionBeforeRitual');
        }
        // 優先順位2: APIから取得
        else if (historyData && historyData.firstQuestion) {
            firstQuestion = historyData.firstQuestion.trim();
            console.log('[楓専用処理] ✓ APIからfirstQuestionを取得:', firstQuestion.substring(0, 50) + '...');
        }
        // 優先順位3: ゲスト履歴から取得
        else {
            console.log('[楓専用処理] APIからfirstQuestionが取得できませんでした。ゲスト履歴を確認します。');
            const guestHistory = (window.ChatInit && typeof window.ChatInit.getGuestHistoryForMigration === 'function') 
                ? window.ChatInit.getGuestHistoryForMigration(character)
                : [];
            if (guestHistory && guestHistory.length > 0) {
                const firstUserMessage = guestHistory.find(msg => msg && msg.role === 'user');
                if (firstUserMessage && firstUserMessage.content) {
                    firstQuestion = firstUserMessage.content.trim();
                    console.log('[楓専用処理] ✓ ゲスト履歴からfirstQuestionを取得:', firstQuestion.substring(0, 50) + '...');
                }
            }
        }
        
        console.log('[楓専用処理] ✓ firstQuestion取得完了:', firstQuestion ? `"${firstQuestion.substring(0, 30)}..."` : '(空)');

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ステップ3: recentMessagesをクリア（⚠️ firstQuestion取得後に実行必須）
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (shouldClearChat) {
            console.log('[楓専用処理] ステップ3: recentMessagesをクリアします（firstQuestion取得後）');
            
            if (historyData && historyData.recentMessages) {
                historyData.recentMessages = [];
                console.log('[楓専用処理] ✓ historyData.recentMessagesをクリアしました');
            }
            
            // 会話履歴もクリア（ユーザーメッセージが表示されないようにするため）
            if (ChatData.conversationHistory && ChatData.conversationHistory.recentMessages) {
                ChatData.conversationHistory.recentMessages = [];
                console.log('[楓専用処理] ✓ ChatData.conversationHistory.recentMessagesをクリアしました');
            }
            
            console.log('[楓専用処理] 【検証】クリア後のhistoryData.recentMessages件数:', historyData?.recentMessages?.length || 0);
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 定型文を構築して表示
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const characterName = ChatData.characterInfo[character]?.name || '楓';
        const welcomeMessage = `儀式により${guardianConfirmationData.userNickname}様の守護神の${guardianConfirmationData.guardianName}を呼び出すことができました。

今後は私と${guardianConfirmationData.guardianName}であなたの運命を導いてまいります。

鑑定を続けてまいりましょう。${firstQuestion ? `\n\n「${firstQuestion}」` : ''}

${firstQuestion ? `この質問を再度深く、${guardianConfirmationData.guardianName}と共に掘り下げましょうか、それとも他のテーマで鑑定を進めますか？` : 'どのようなことについて鑑定を進めますか？'}`;

        // APIの指示によりチャットをクリアした後、定型文のみを表示（会話はゼロからスタート）
        console.log('[楓専用処理] 守護神の儀式完了メッセージを表示します（会話はゼロからスタート）');
        ChatUI.addMessage('character', welcomeMessage, characterName);

        // 会話履歴に追加
        if (ChatData.conversationHistory && ChatData.conversationHistory.recentMessages) {
            ChatData.conversationHistory.recentMessages.push({
                role: 'assistant',
                content: welcomeMessage
            });
        }

        // メッセージ入力欄をクリア
        if (ChatUI.messageInput) {
            ChatUI.messageInput.value = '';
            console.log('[楓専用処理] メッセージ入力欄をクリアしました');
        }

        // 送信ボタンの状態を更新
        ChatUI.updateSendButtonVisibility();
        console.log('[楓専用処理] 送信ボタンの状態を更新しました（文字入力時に表示されます）');

        // 【重要】入力イベントリスナーを常に再設定（守護神の儀式完了後は確実に動作させるため）
        // 注意: 複数のリスナーが追加される可能性があるが、同じ処理を実行するだけなので問題ない
        if (ChatUI.messageInput) {
            // Enterキーのイベントリスナーを追加（chat-engine.jsで既に設定されている可能性があるが、念のため再設定）
            ChatUI.messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    window.sendMessage();
                }
            });
            
            // inputイベントリスナーを追加
            ChatUI.messageInput.addEventListener('input', () => {
                if (window.ChatUI && typeof window.ChatUI.updateSendButtonVisibility === 'function') {
                    window.ChatUI.updateSendButtonVisibility();
                }
            });
            
            ChatUI.messageInput.setAttribute('data-input-listener-set', 'true');
            console.log('[楓専用処理] 入力イベントリスナー（keydown/input）を再設定しました（守護神の儀式完了後）');
        }

        // 守護神の儀式完了フラグをクリア
        sessionStorage.removeItem('acceptedGuardianRitual');
        sessionStorage.removeItem('ritualCompleted');
        // 【重要】lastUserMessageをクリア（handleReturnFromAnimationでユーザーメッセージが表示されないようにするため）
        sessionStorage.removeItem('lastUserMessage');
        // 【重要】guardianMessageShownフラグを設定（会話履歴が表示されないようにするため）
        sessionStorage.setItem('guardianMessageShown', 'true');
        console.log('[楓専用処理] ritualCompletedフラグとacceptedGuardianRitualフラグをクリアしました。lastUserMessageもクリアしました。guardianMessageShownフラグを設定しました。');

        return true; // 処理完了
    },

    /**
     * 登録完了時の守護神の儀式チェック（楓専用）
     * @param {string} character - キャラクターID
     * @param {URLSearchParams} urlParams - URLパラメータ
     * @returns {Object|null} guardianConfirmationData（処理が必要な場合）、null（処理不要な場合）
     */
    checkGuardianRitualCompletion(character, urlParams) {
        if (character !== 'kaede') {
            return null; // 楓以外は処理しない
        }

        const ritualCompleted = sessionStorage.getItem('ritualCompleted');
        const assignedDeity = localStorage.getItem('assignedDeity');
        console.log('[楓専用処理] ritualCompletedフラグをチェック:', ritualCompleted, 'assignedDeity:', assignedDeity);

        // 【重要】ritualCompletedフラグまたはassignedDeityが存在する場合、守護神の儀式は既に完了している
        if ((ritualCompleted === 'true' || assignedDeity) && sessionStorage.getItem('guardianMessageShown') !== 'true') {
            console.log('[楓専用処理] 守護神の儀式は既に完了しています。会話履歴読み込み後に定型文を表示します。');
            const userNickname = localStorage.getItem('userNickname') || 'あなた';
            const guardianName = assignedDeity;

            // 【重要】ゲスト履歴をデータベースに移行（登録直後の場合）
            // この処理は非同期なので、awaitせずにバックグラウンドで実行
            const acceptedRitual = sessionStorage.getItem('acceptedGuardianRitual') === 'true';
            if (acceptedRitual) {
                console.log('[楓専用処理] ゲスト履歴のデータベース移行を開始します');
                
                // ゲスト履歴を取得
                let guestHistory = [];
                const pendingHistory = sessionStorage.getItem('pendingRitualGuestHistory');
                if (pendingHistory) {
                    try {
                        const data = JSON.parse(pendingHistory);
                        guestHistory = data.history || [];
                    } catch (e) {
                        console.error('[楓専用処理] pendingRitualGuestHistory解析エラー:', e);
                    }
                }
                
                if (guestHistory.length === 0) {
                    // フォールバック: ChatDataから取得
                    guestHistory = (window.ChatData && typeof window.ChatData.getGuestHistory === 'function')
                        ? window.ChatData.getGuestHistory(character) || []
                        : [];
                }
                
                if (guestHistory.length > 0) {
                    const conversationHistory = guestHistory.map(entry => ({
                        role: entry.role || 'user',
                        content: entry.content || entry.message || ''
                    }));
                    
                    console.log('[楓専用処理] ゲスト履歴をデータベースに移行:', conversationHistory.length, '件');
                    
                    // 非同期でAPI呼び出し（処理を待たない）
                    (async () => {
                        try {
                            await window.ChatAPI.sendMessage(
                                '守護神の儀式を開始します',
                                character,
                                conversationHistory,
                                {
                                    migrateHistory: true,
                                    ritualStart: true
                                }
                            );
                            console.log('[楓専用処理] ゲスト履歴のデータベース移行が完了しました');
                        } catch (error) {
                            console.error('[楓専用処理] ゲスト履歴のデータベース移行に失敗:', error);
                        }
                    })();
                }
            }

            // 【重要】guardianMessageShownフラグは、handleGuardianRitualCompletionで定型文表示後に設定される
            // ここで先に設定すると、他の処理で「既に表示済み」と誤判定される可能性があるため削除

            // URLパラメータからjustRegisteredを削除
            urlParams.delete('justRegistered');
            const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
            window.history.replaceState({}, '', newUrl);
            // sessionStorageからも登録完了フラグを削除
            sessionStorage.removeItem('justRegistered');

            return {
                userNickname,
                guardianName,
                confirmationMessage: `守護神の儀式が完了しました。私の守護神は${guardianName}です。`
            };
        }

        return null; // 処理不要
    },

    /**
     * 登録完了後の守護神の儀式開始処理（楓専用）
     * @param {string} character - キャラクターID
     * @param {Object} historyData - 会話履歴データ
     * @param {URLSearchParams} urlParams - URLパラメータ
     * @returns {boolean} 処理が完了したかどうか（true: 処理完了、false: 処理しない）
     */
    async handlePostRegistrationRitualStart(character, historyData, urlParams) {
        if (character !== 'kaede') {
            return false; // 楓以外は処理しない
        }

        // 儀式が既に完了している場合はスキップ（guardian-ritual.htmlからリダイレクトされた場合）
        const ritualCompleted = sessionStorage.getItem('ritualCompleted');

        // 既に守護神確認メッセージを表示済みの場合は、儀式開始処理をスキップ
        if (ritualCompleted === 'true' && sessionStorage.getItem('guardianMessageShown') === 'true') {
            // ユーザーデータを更新（儀式完了済みの場合も必要）
            if (historyData && historyData.birthYear && historyData.birthMonth && historyData.birthDay) {
                ChatUI.updateUserStatus(true, {
                    nickname: historyData.nickname || ChatData.userNickname,
                    birthYear: historyData.birthYear,
                    birthMonth: historyData.birthMonth,
                    birthDay: historyData.birthDay,
                    assignedDeity: historyData.assignedDeity
                });
            } else {
                // 会話履歴がない場合はlocalStorageから取得
                const nickname = localStorage.getItem('userNickname') || '鑑定者';
                const deity = localStorage.getItem('assignedDeity') || '未割当';
                const birthYear = localStorage.getItem('birthYear');
                const birthMonth = localStorage.getItem('birthMonth');
                const birthDay = localStorage.getItem('birthDay');

                ChatUI.updateUserStatus(true, {
                    nickname: nickname,
                    birthYear: birthYear ? parseInt(birthYear) : null,
                    birthMonth: birthMonth ? parseInt(birthMonth) : null,
                    birthDay: birthDay ? parseInt(birthDay) : null,
                    assignedDeity: deity
                });
            }
            // 儀式開始処理はスキップ（会話履歴の読み込み後の処理は続行）
            return false; // 処理は続行
        }

        // ユーザーデータを更新
        if (historyData && historyData.birthYear && historyData.birthMonth && historyData.birthDay) {
            ChatUI.updateUserStatus(true, {
                nickname: historyData.nickname || ChatData.userNickname,
                birthYear: historyData.birthYear,
                birthMonth: historyData.birthMonth,
                birthDay: historyData.birthDay,
                assignedDeity: historyData.assignedDeity
            });
        } else {
            // 会話履歴がない場合はlocalStorageから取得
            const nickname = localStorage.getItem('userNickname') || '鑑定者';
            const deity = localStorage.getItem('assignedDeity') || '未割当';
            const birthYear = localStorage.getItem('birthYear');
            const birthMonth = localStorage.getItem('birthMonth');
            const birthDay = localStorage.getItem('birthDay');

            ChatUI.updateUserStatus(true, {
                nickname: nickname,
                birthYear: birthYear ? parseInt(birthYear) : null,
                birthMonth: birthMonth ? parseInt(birthMonth) : null,
                birthDay: birthDay ? parseInt(birthDay) : null,
                assignedDeity: deity
            });
        }

        // 儀式完了フラグのチェックは既に会話履歴読み込み前に行われている
        // ここでは、会話履歴読み込み後に再度チェック（二重チェック）
        const ritualCompletedCheck = sessionStorage.getItem('ritualCompleted');
        const shouldSkipRitual = ritualCompletedCheck === 'true' && sessionStorage.getItem('guardianMessageShown') === 'true';

        if (!shouldSkipRitual) {
            // 【重要】守護神の鑑定を受け入れた場合のみ、儀式を自動開始
            const acceptedGuardianRitual = sessionStorage.getItem('acceptedGuardianRitual');
            console.log('[楓専用処理] カエデの場合、守護神の儀式を開始するかチェック:', {
                acceptedGuardianRitual: acceptedGuardianRitual
            });

            if (acceptedGuardianRitual !== 'true') {
                console.log('[楓専用処理] 守護神の鑑定を受け入れていないため、儀式を自動開始しません');

                // URLパラメータからjustRegisteredを削除
                urlParams.delete('justRegistered');
                const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
                window.history.replaceState({}, '', newUrl);

                // sessionStorageからも登録完了フラグを削除
                sessionStorage.removeItem('justRegistered');

                // 登録ユーザーとして通常の会話を続ける
                return true; // 処理完了（儀式を開始しない）
            }

            console.log('[楓専用処理] 守護神の鑑定を受け入れているため、儀式を準備します');

            // 【重要】ゲスト会話履歴を取得して保存（守護神の儀式で使用するため）
            console.log('[楓専用処理] ゲスト履歴取得を開始:', character);

            let guestHistory = (window.ChatInit && typeof window.ChatInit.getGuestHistoryForMigration === 'function')
                ? window.ChatInit.getGuestHistoryForMigration(character)
                : [];

            if (guestHistory.length === 0) {
                // フォールバック: ChatDataから直接取得
                console.log('[楓専用処理] ChatDataから直接取得を試行');
                guestHistory = ChatData.getGuestHistory(character) || [];
            }

            // ゲスト会話履歴を一時的に保存（守護神の儀式で使用するため）
            const guestHistoryForRitual = JSON.parse(JSON.stringify(guestHistory));

            // 会話履歴をクリア（新規登録なので空から始める）
            ChatData.conversationHistory = null;

            // ゲスト会話履歴を一時的に保存（守護神の儀式で使用するため）
            const GUEST_HISTORY_KEY_PREFIX = 'guestConversationHistory_';
            const historyKey = GUEST_HISTORY_KEY_PREFIX + character;
            if (guestHistoryForRitual.length > 0) {
                sessionStorage.setItem('pendingRitualGuestHistory', JSON.stringify({
                    character: character,
                    history: guestHistoryForRitual
                }));
                console.log('[楓専用処理] ゲスト履歴をpendingRitualGuestHistoryに保存:', {
                    historyLength: guestHistoryForRitual.length,
                    userMessages: guestHistoryForRitual.filter(msg => msg && msg.role === 'user').length
                });
            }

            // URLパラメータからjustRegisteredを削除
            urlParams.delete('justRegistered');
            const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
            window.history.replaceState({}, '', newUrl);

            // sessionStorageからも登録完了フラグを削除
            sessionStorage.removeItem('justRegistered');

            return true; // 処理完了（儀式準備完了）
        } else {
            // 儀式完了済みの場合、URLパラメータからjustRegisteredを削除
            urlParams.delete('justRegistered');
            const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
            window.history.replaceState({}, '', newUrl);

            // sessionStorageからも登録完了フラグを削除
            sessionStorage.removeItem('justRegistered');

            // 会話履歴の読み込み後の処理は続行（初期メッセージの表示など）
            return false; // 処理は続行
        }
    },

    /**
     * 守護神の儀式への同意処理（楓専用）
     * @param {boolean} consent - 同意するかどうか
     * @returns {Promise<boolean>} 処理が完了したかどうか（true: 処理完了、false: 処理しない）
     */
    async forceStartGuardianRitual(character) {
        if (character !== 'kaede') {
            return false;
        }
        // 【削除】10通制限チェックは削除されました
        console.log('[楓専用処理] 守護神の儀式を強制開始します');
        return await this.handleRitualConsent(true);
    },

    async handleRitualConsent(consent) {
        const character = ChatData.currentCharacter;
        if (character !== 'kaede') {
            return false; // 楓以外は処理しない
        }

        ChatUI.hideRitualConsentButtons();

        // フラグをリセット（一度処理したので、再度表示されないようにする）
        ChatData.ritualConsentShown = true;

        if (consent) {
            // 「はい」を押した場合 - ユーザーの最後のメッセージを削除
            const userMessages = Array.from(document.querySelectorAll('.message.user'));
            if (userMessages.length > 0) {
                const lastUserMessage = userMessages[userMessages.length - 1];
                console.log('[楓専用処理] ユーザーの最後のメッセージを削除します（handleRitualConsent）:', lastUserMessage.textContent);
                lastUserMessage.remove();
            }

            // 「はい」を押した場合 - APIに守護神の儀式の開催を通知
            const characterName = ChatData.characterInfo[character]?.name || '楓';

            // ゲスト会話履歴を取得
            const guestHistory = ChatData.getGuestHistory(character) || [];
            const conversationHistory = guestHistory.map(entry => ({
                role: entry.role || 'user',
                content: entry.content || entry.message || ''
            }));

            // acceptedGuardianRitualフラグを保存（登録後に使用）
            sessionStorage.setItem('acceptedGuardianRitual', 'true');
            console.log('[楓専用処理] acceptedGuardianRitualフラグを保存しました');
            
            // 【重要】最初のユーザーメッセージをsessionStorageに保存（登録後に使用）
            const firstUserMessage = conversationHistory.find(msg => msg.role === 'user');
            if (firstUserMessage && firstUserMessage.content) {
                sessionStorage.setItem('firstQuestionBeforeRitual', firstUserMessage.content);
                console.log('[楓専用処理] 最初の質問をsessionStorageに保存:', firstUserMessage.content.substring(0, 50) + '...');
            }

            // ゲストユーザーの場合は登録画面に遷移（登録後に儀式が開始される）
            console.log('[楓専用処理] 登録画面に遷移します（登録後に儀式が開始されます）');
            // ChatInit.openRegistrationModal()を呼び出す（グローバルスコープから）
            if (window.ChatInit && typeof window.ChatInit.openRegistrationModal === 'function') {
                window.ChatInit.openRegistrationModal();
            } else {
                // フォールバック: 直接遷移
                window.location.href = '../auth/register.html?redirect=' + encodeURIComponent(window.location.href);
            }

            return true; // 処理完了
        } else {
            // 「いいえ」を押した場合
            ChatUI.addMessage('error', '守護神の儀式をスキップしました。ゲストモードで会話を続けます。', 'システム');
            return true; // 処理完了
        }
    },

    /**
     * API応答メッセージに守護神の儀式開始ボタンを追加（楓専用）
     * 5通目以降で表示する
     * @param {string} responseText - API応答メッセージ
     * @param {string} messageId - メッセージ要素のID
     * @param {string} character - キャラクターID（'kaede'）
     * @returns {boolean} ボタンが追加または強制開始されたか
     */
    addRitualStartButtonToMessageIfNeeded(responseText, messageId, character) {
        if (character !== 'kaede') {
            return false; // 楓以外は処理しない
        }

        const isGuest = !AuthState.isRegistered();
        if (!isGuest) {
            return false; // 登録ユーザーは対象外
        }

        // 儀式済み・表示済みの場合は何もしない
        const ritualAlreadyDone = sessionStorage.getItem('ritualCompleted') === 'true' || sessionStorage.getItem('guardianMessageShown') === 'true';
        if (ritualAlreadyDone) {
            return false;
        }

        const messageCount = ChatData.getGuestMessageCount(character);

        // 【削除】10通制限チェックは削除されました

        // 5通目未満はボタンを表示しない
        if (messageCount < 5) {
            return false;
        }

        // 既に参加を承諾済みの場合は再表示しない
        if (sessionStorage.getItem('acceptedGuardianRitual') === 'true') {
            return false;
        }

        // 既存のボタンがある場合は再追加しない
        if (document.querySelector('.ritual-start-button')) {
            return false;
        }

        console.log('[楓専用処理] 5通目以降のため、守護神の儀式参加ボタンを表示します', { messageCount });

        // メッセージ表示後に少し待ってからボタンを追加（メッセージが完全に表示された後）
        setTimeout(() => {
            const messageElement = messageId ? document.getElementById(messageId) : null;
            if (messageElement && typeof ChatUI.addRitualStartButton === 'function') {
                ChatUI.addRitualStartButton(messageElement, async () => {
                    console.log('[楓専用処理] 守護神の儀式開始ボタンがクリックされました');

                    // 【重要】ユーザーの最後のメッセージを削除（ボタンクリック時に実行）
                    const userMessages = Array.from(document.querySelectorAll('.message.user'));
                    if (userMessages.length > 0) {
                        const lastUserMessage = userMessages[userMessages.length - 1];
                        console.log('[楓専用処理] ユーザーの最後のメッセージを削除します:', lastUserMessage.textContent);
                        lastUserMessage.remove();
                    }

                    // 【重要】守護神の鑑定を受け入れたフラグを保存
                    sessionStorage.setItem('acceptedGuardianRitual', 'true');
                    console.log('[楓専用処理] acceptedGuardianRitualフラグを保存しました');

                    // 楓専用のhandleRitualConsentを呼び出す
                    if (window.KaedeRitualHandler && typeof window.KaedeRitualHandler.handleRitualConsent === 'function') {
                        await window.KaedeRitualHandler.handleRitualConsent(true);
                    } else {
                        // フォールバック: 直接startGuardianRitualを呼び出す
                        if (window.ChatInit && typeof window.ChatInit.startGuardianRitual === 'function') {
                            await window.ChatInit.startGuardianRitual(character);
                        }
                    }
                });
                console.log('[楓専用処理] 守護神の儀式開始ボタンを追加しました');
            } else {
                console.warn('[楓専用処理] メッセージ要素またはaddRitualStartButtonが見つかりません', {
                    messageId,
                    messageElement: !!messageElement,
                    hasAddRitualStartButton: typeof ChatUI.addRitualStartButton === 'function'
                });
            }
        }, 500); // メッセージが完全に表示されるまで少し待つ

        return true; // ボタンが追加された
    }
};

// グローバルスコープに公開
// グローバルスコープに公開
window.KaedeHandler = KaedeHandler;

// 後方互換性のため、旧名称でも公開
window.KaedeRitualHandler = KaedeHandler;


