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
        
        // 守護神の儀式への同意ボタンを動的に生成
        // DOMContentLoadedイベントで実行（HTMLが完全に読み込まれた後に実行）
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initRitualConsentButtons();
                this.initAdminFeatures();
            });
        } else {
            // 既に読み込み完了している場合は即座に実行
            this.initRitualConsentButtons();
            this.initAdminFeatures();
        }
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

        // 現在は特殊な処理なし、共通処理を続行
        // 守護神の儀式は別の箇所で処理される
        return false;
    },

    /**
     * 登録完了後の処理
     * @param {Object} historyData - 会話履歴データ
     * @returns {boolean} 処理が完了したか
     */
    async handlePostRegistration(historyData) {
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
     * @param {Object} options - 追加オプション（guardianMessageShownなど）
     * @returns {Object|null} 処理結果（guardianConfirmationDataなど）
     */
    async initPage(urlParams, historyData, justRegistered, shouldTriggerRegistrationFlow, options = {}) {
        const { guardianMessageShown = false } = options;
        
        // #region パフォーマンス測定
        const startTime = performance.now();
        const timings = {};
        const markTiming = (label) => {
            const now = performance.now();
            timings[label] = now - startTime;
            console.log(`[楓パフォーマンス] ${label}: ${(now - startTime).toFixed(2)}ms`);
        };
        // #endregion
        
        console.log('[楓専用処理] initPage呼び出し:', {
            hasHistoryData: !!historyData,
            justRegistered,
            shouldTriggerRegistrationFlow,
            guardianMessageShown
        });
        
        // 守護神の儀式完了チェック
        const guardianConfirmationData = this.checkGuardianRitualCompletion(this.characterId, urlParams);
        markTiming('guardianConfirmationCheck');
        if (guardianConfirmationData && historyData) {
            const completed = await this.handleGuardianRitualCompletion(
                this.characterId,
                guardianConfirmationData,
                historyData
            );
            markTiming('handleGuardianRitualCompletion');
            if (completed) {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'handler.js:126',message:'楫: completed=true で返却',data:{timings},timestamp:Date.now(),sessionId:'debug-session',runId:'perf1',hypothesisId:'perfA'})}).catch(()=>{});
                // #endregion
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
            markTiming('handlePostRegistrationRitualStart');
            // handlePostRegistrationRitualStartがtrueを返した場合でも、守護神の確認は続行する
            // （儀式を開始しない場合でも、守護神が未登録なら儀式を開始する必要があるため）
        } else {
            // historyDataが存在しない場合でも、守護神の儀式開始チェックを実行
            // （historyDataが取得できない場合でも、守護神が未登録なら儀式を開始する必要があるため）
            const ritualHandled = await this.handlePostRegistrationRitualStart(
                this.characterId,
                null,
                urlParams
            );
        }

        // 【改善】バックエンドからのrequireGuardianConsentフラグを使用（ロジックの明確な分離）
        // バックエンド: ビジネスロジック（守護神状態の判定）
        // フロントエンド: UI（フラグに基づいて同意ボタン表示）
        console.log('[楓専用処理] 守護神の確認を開始:', {
            hasHistoryData: !!historyData,
            historyDataAssignedDeity: historyData?.assignedDeity,
            requireGuardianConsent: historyData?.requireGuardianConsent,
            guardianMessageShown
        });
        
        // バックエンドからのフラグを使用
        if (historyData && historyData.requireGuardianConsent && !guardianMessageShown) {
            console.log('[楓専用処理] バックエンドからrequireGuardianConsentフラグが設定されています。儀式同意ボタンを表示します。');
            
            // welcomeMessageはバックエンドで生成済み（守護神未決定を考慮したメッセージ）
            if (historyData.welcomeMessage) {
                const info = ChatData.characterInfo[this.characterId];
                ChatUI.addMessage('welcome', historyData.welcomeMessage, info.name);
            }
            
            // メッセージ表示後、少し待ってから自動的に守護神の儀式を開始
            setTimeout(async () => {
                console.log('[楓専用処理] 守護神の儀式開始チェック:', {
                    hasChatInit: !!window.ChatInit,
                    hasStartGuardianRitual: !!(window.ChatInit && typeof window.ChatInit.startGuardianRitual === 'function'),
                    character: this.characterId
                });
                
                if (window.ChatInit && typeof window.ChatInit.startGuardianRitual === 'function') {
                    console.log('[楓専用処理] 守護神の儀式を開始します');
                    try {
                        await window.ChatInit.startGuardianRitual(this.characterId);
                        console.log('[楓専用処理] 守護神の儀式開始処理が完了しました');
                    } catch (error) {
                        console.error('[楓専用処理] 守護神の儀式開始エラー:', error);
                    }
                } else {
                    console.error('[楓専用処理] ⚠️ window.ChatInit.startGuardianRitualが見つかりません', {
                        hasChatInit: !!window.ChatInit,
                        ChatInitKeys: window.ChatInit ? Object.keys(window.ChatInit) : []
                    });
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

        // 会話履歴はデータベースで管理されるため、sessionStorageのクリアは不要

        // メッセージカウントをリセット
        ChatData.setUserMessageCount(character, 0);

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
            ChatData.setUserMessageCount(character, 0);
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
            console.log('[楓専用処理] APIからfirstQuestionが取得できませんでした。会話履歴を確認します。');
            if (historyData && historyData.recentMessages) {
                const firstUserMessage = historyData.recentMessages.find(msg => msg && msg.role === 'user');
                if (firstUserMessage && firstUserMessage.content) {
                    firstQuestion = firstUserMessage.content.trim();
                    console.log('[楓専用処理] ✓ 会話履歴からfirstQuestionを取得:', firstQuestion.substring(0, 50) + '...');
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
        // 事前生成されたメッセージを取得、またはAPIで生成
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        console.log('[楓専用処理] 守護神の儀式完了後の楓からのメッセージを取得します');
        
        // 事前生成されたメッセージを確認（アニメーション中に生成されたもの）
        const preGeneratedMessageStr = sessionStorage.getItem('preGeneratedKaedeMessage');
        let kaedeMessage = null;
        let messageSource = 'api'; // 'preGenerated' or 'api'
        
        if (preGeneratedMessageStr) {
            try {
                const preGeneratedData = JSON.parse(preGeneratedMessageStr);
                // 5分以内のデータか確認
                const dataAge = Date.now() - (preGeneratedData.timestamp || 0);
                if (dataAge < 5 * 60 * 1000 && preGeneratedData.guardianName === guardianConfirmationData.guardianName) {
                    kaedeMessage = preGeneratedData.message;
                    messageSource = 'preGenerated';
                    console.log('[楓専用処理] 事前生成されたメッセージを使用します（アニメーション中に生成）');
                    // 使用後は削除
                    sessionStorage.removeItem('preGeneratedKaedeMessage');
                } else {
                    console.log('[楓専用処理] 事前生成されたメッセージが古いため、再生成します');
                    sessionStorage.removeItem('preGeneratedKaedeMessage');
                }
            } catch (error) {
                console.error('[楓専用処理] 事前生成メッセージの解析エラー:', error);
                sessionStorage.removeItem('preGeneratedKaedeMessage');
            }
        }
        
        // 事前生成されたメッセージがない場合、または古い場合はAPIで生成
        if (!kaedeMessage) {
            // 段階的な待機メッセージを表示（ユーザーを安心させ、待機時間を感じさせない）
            const characterName = ChatData.characterInfo[character]?.name || '楓';
            const guardianName = guardianConfirmationData.guardianName;
            const userNickname = guardianConfirmationData.userNickname;
            
            // 段階的な待機メッセージのリスト
            const waitingMessages = [
                {
                    text: `守護神${guardianName}の言葉を呼び出しています...\n${userNickname}さんの魂の波動を感じ取っています。`,
                    delay: 0
                },
                {
                    text: `守護神${guardianName}の気配が、この場に満ちてきました...\n${userNickname}さんの心の奥底を、深く読み取っています。`,
                    delay: 15000 // 15秒後
                },
                {
                    text: `守護神${guardianName}が、${userNickname}さんに語りかける言葉を紡いでいます...\n前世からの記憶を辿りながら、魂の声を聞いています。`,
                    delay: 30000 // 30秒後
                },
                {
                    text: `守護神${guardianName}の言葉が、次第に形を成してきました...\n${userNickname}さんの運命を導く、特別なメッセージを準備しています。`,
                    delay: 45000 // 45秒後
                }
            ];
            
            // 最初の待機メッセージを表示（送信者名は表示しない）
            let waitingMessageId = ChatUI.addMessage('loading', waitingMessages[0].text, null);
            let currentMessageIndex = 0;
            
            // 楓専用の神秘的なローディングアイコンを追加（chat.htmlに影響を与えないように、動的にスタイルを注入）
            if (waitingMessageId) {
                setTimeout(() => {
                    const waitingElement = document.getElementById(waitingMessageId);
                    if (waitingElement) {
                        const loadingIcon = waitingElement.querySelector('.guardian-loading-icon');
                        if (loadingIcon) {
                            // 動的にスタイルシートを追加（chat.htmlに影響を与えない）
                            if (!document.getElementById('kaede-loading-styles')) {
                                const style = document.createElement('style');
                                style.id = 'kaede-loading-styles';
                                style.textContent = `
                                    @keyframes kaede-guardian-pulse {
                                        0%, 100% {
                                            box-shadow: 
                                                0 0 12px rgba(138, 43, 226, 0.4),
                                                inset 0 0 12px rgba(138, 43, 226, 0.6),
                                                0 0 24px rgba(255, 215, 0, 0.3);
                                        }
                                        50% {
                                            box-shadow: 
                                                0 0 24px rgba(255, 215, 0, 0.8),
                                                0 0 40px rgba(138, 43, 226, 0.6),
                                                inset 0 0 20px rgba(255, 215, 0, 0.4),
                                                0 0 48px rgba(255, 215, 0, 0.5);
                                        }
                                    }
                                    @keyframes kaede-guardian-inner-glow {
                                        0%, 100% {
                                            opacity: 0.6;
                                            transform: translate(-50%, -50%) scale(0.8);
                                        }
                                        50% {
                                            opacity: 1;
                                            transform: translate(-50%, -50%) scale(1.2);
                                        }
                                    }
                                    @keyframes kaede-guardian-particle-rotate {
                                        0% {
                                            transform: translate(-50%, -50%) translate(25px, 0) rotate(0deg);
                                            opacity: 0.8;
                                        }
                                        50% {
                                            opacity: 1;
                                        }
                                        100% {
                                            transform: translate(-50%, -50%) translate(25px, 0) rotate(360deg);
                                            opacity: 0.8;
                                        }
                                    }
                                `;
                                document.head.appendChild(style);
                            }
                            
                            // 既存のローディングアイコンを楓専用のものに置き換え
                            const enhancedIcon = document.createElement('div');
                            enhancedIcon.className = 'kaede-guardian-loading-icon';
                            enhancedIcon.style.cssText = `
                                width: 40px;
                                height: 40px;
                                border-radius: 50%;
                                border: 2px solid rgba(255, 215, 0, 0.6);
                                box-shadow: 
                                    0 0 12px rgba(138, 43, 226, 0.4),
                                    inset 0 0 12px rgba(138, 43, 226, 0.6),
                                    0 0 24px rgba(255, 215, 0, 0.3);
                                animation: guardian-breathe 1.8s ease-in-out infinite, kaede-guardian-pulse 2.5s ease-in-out infinite;
                                margin: 0 auto 12px;
                                position: relative;
                            `;
                            
                            // 内側の光る円を追加（神秘的な演出）
                            const innerGlow = document.createElement('div');
                            innerGlow.style.cssText = `
                                position: absolute;
                                top: 50%;
                                left: 50%;
                                transform: translate(-50%, -50%);
                                width: 20px;
                                height: 20px;
                                border-radius: 50%;
                                background: radial-gradient(circle, rgba(255, 215, 0, 0.8), rgba(138, 43, 226, 0.4));
                                box-shadow: 0 0 16px rgba(255, 215, 0, 0.6);
                                animation: kaede-guardian-inner-glow 2s ease-in-out infinite;
                            `;
                            enhancedIcon.appendChild(innerGlow);
                            
                            // 外側の光る粒子を追加（神秘的な演出）
                            for (let i = 0; i < 6; i++) {
                                const particle = document.createElement('div');
                                const angle = (i * 60) * (Math.PI / 180);
                                const radius = 25;
                                particle.style.cssText = `
                                    position: absolute;
                                    top: 50%;
                                    left: 50%;
                                    width: 4px;
                                    height: 4px;
                                    border-radius: 50%;
                                    background: rgba(255, 215, 0, 0.8);
                                    box-shadow: 0 0 8px rgba(255, 215, 0, 0.9);
                                    transform: translate(-50%, -50%) translate(${Math.cos(angle) * radius}px, ${Math.sin(angle) * radius}px);
                                    animation: kaede-guardian-particle-rotate 3s linear infinite;
                                    animation-delay: ${i * 0.5}s;
                                `;
                                enhancedIcon.appendChild(particle);
                            }
                            
                            // 既存のアイコンを置き換え
                            loadingIcon.replaceWith(enhancedIcon);
                        }
                    }
                }, 100);
            }
            
            // 段階的なメッセージ更新のタイマーを設定（スコープを確保）
            const messageUpdateTimers = [];
            for (let i = 1; i < waitingMessages.length; i++) {
                const timer = setTimeout(() => {
                    if (waitingMessageId) {
                        const waitingElement = document.getElementById(waitingMessageId);
                        if (waitingElement) {
                            const textDiv = waitingElement.querySelector('.message-text');
                            if (textDiv) {
                                // フェードアウト → テキスト更新 → フェードイン
                                textDiv.style.transition = 'opacity 0.5s ease-in-out';
                                textDiv.style.opacity = '0';
                                
                                setTimeout(() => {
                                    textDiv.textContent = waitingMessages[i].text;
                                    textDiv.style.opacity = '1';
                                    currentMessageIndex = i;
                                }, 500);
                            }
                        }
                    }
                }, waitingMessages[i].delay);
                messageUpdateTimers.push(timer);
            }
            
            try {
                // まず守護神のメッセージを内部で生成（楓のメッセージ生成のコンテキストとして使用）
                const guardianResponse = await ChatAPI.sendMessage(
                    '守護神の儀式完了', // ダミーメッセージ（API側で特別処理される）
                    character,
                    [], // 会話履歴は空
                    {
                        guardianFirstMessage: true,
                        guardianName: guardianConfirmationData.guardianName,
                        firstQuestion: firstQuestion || null
                    }
                );

                let guardianMessage = '';
                if (guardianResponse.error || !guardianResponse.message) {
                    console.warn('[楓専用処理] 守護神メッセージ生成エラー、フォールバックを使用:', guardianResponse.error);
                    // エラーの場合はフォールバックメッセージを使用
                    guardianMessage = `${guardianConfirmationData.userNickname}さん、私は${guardianConfirmationData.guardianName}。あなたを、前世からずっと守り続けてきました。今、${guardianConfirmationData.userNickname}さんの心の奥底には、何か感じるものがありますね。${guardianConfirmationData.userNickname}さんは今、何を求めていますか？私と共に、あなたの魂が本当に望むものを、一緒に見つけていきましょう。`;
                } else {
                    guardianMessage = guardianResponse.message;
                }

                // 守護神のメッセージをコンテキストとして、楓からのメッセージを生成
                const kaedeResponse = await ChatAPI.sendMessage(
                    '守護神のメッセージを受けて', // ダミーメッセージ（API側で特別処理される）
                    character,
                    [], // 会話履歴は空
                    {
                        kaedeFollowUp: true,
                        guardianName: guardianConfirmationData.guardianName,
                        guardianMessage: guardianMessage,
                        firstQuestion: firstQuestion || null
                    }
                );

                // 段階的なメッセージ更新のタイマーをクリア
                if (typeof messageUpdateTimers !== 'undefined' && Array.isArray(messageUpdateTimers)) {
                    messageUpdateTimers.forEach(timer => clearTimeout(timer));
                }
                
                // 待機中のメッセージを削除（フェードアウト演出付き）
                if (waitingMessageId) {
                    const waitingElement = document.getElementById(waitingMessageId);
                    if (waitingElement) {
                        // フェードアウトしてから削除
                        waitingElement.style.transition = 'opacity 0.5s ease-in-out';
                        waitingElement.style.opacity = '0';
                        setTimeout(() => {
                            if (waitingElement.parentNode) {
                                waitingElement.remove();
                            }
                        }, 500);
                    }
                }

                if (kaedeResponse.error || !kaedeResponse.message) {
                    console.error('[楓専用処理] ❌ 楓メッセージ生成エラー:', {
                        error: kaedeResponse.error,
                        hasMessage: !!kaedeResponse.message,
                        guardianName: guardianConfirmationData.guardianName,
                        userNickname: guardianConfirmationData.userNickname
                    });
                    
                    // エラーの場合は、フォールバックメッセージを使用せず、再試行を促すメッセージを表示
                    // または、API呼び出しを再試行する
                    throw new Error(kaedeResponse.error || '楓メッセージの生成に失敗しました');
                } else {
                    kaedeMessage = kaedeResponse.message || '';
                    
                    // メッセージが空の場合はエラーとして扱う
                    if (!kaedeMessage || kaedeMessage.trim() === '') {
                        console.error('[楓専用処理] ❌ 楓メッセージが空です');
                        throw new Error('メッセージが空です');
                    }
                }
            } catch (error) {
                console.error('[楓専用処理] ❌ メッセージ生成時のエラー:', {
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                    guardianName: guardianConfirmationData.guardianName,
                    userNickname: guardianConfirmationData.userNickname
                });
                
                // 段階的なメッセージ更新のタイマーをクリア
                if (typeof messageUpdateTimers !== 'undefined' && Array.isArray(messageUpdateTimers)) {
                    messageUpdateTimers.forEach(timer => clearTimeout(timer));
                }
                
                // 待機中のメッセージを削除（フェードアウト演出付き）
                if (waitingMessageId) {
                    const waitingElement = document.getElementById(waitingMessageId);
                    if (waitingElement) {
                        // フェードアウトしてから削除
                        waitingElement.style.transition = 'opacity 0.5s ease-in-out';
                        waitingElement.style.opacity = '0';
                        setTimeout(() => {
                            if (waitingElement.parentNode) {
                                waitingElement.remove();
                            }
                        }, 500);
                    }
                }
                
                // エラーが発生した場合は、フォールバックメッセージを使用せず、エラーメッセージを表示
                // フォールバックメッセージは楓の設定を反映していないため使用しない
                const errorMessage = `申し訳ございません。メッセージの生成に失敗しました。もう一度お試しください。`;
                ChatUI.addMessage('error', errorMessage, 'システム');
                
                // kaedeMessageをnullのままにして、後続処理でエラーとして扱う
                kaedeMessage = null;
            }
        }
        
        // メッセージを表示（表示名は「楓」）
        if (kaedeMessage && kaedeMessage.trim() !== '') {
            const characterName = ChatData.characterInfo[character]?.name || '楓';
            console.log('[楓専用処理] 楓からのメッセージを表示します（表示名:', characterName, ', ソース:', messageSource, ', 長さ:', kaedeMessage.length, ')');
            ChatUI.addMessage('character', kaedeMessage, characterName);
            
            // 会話履歴に追加
            if (ChatData.conversationHistory && ChatData.conversationHistory.recentMessages) {
                ChatData.conversationHistory.recentMessages.push({
                    role: 'assistant',
                    content: kaedeMessage
                });
            }
        } else {
            console.error('[楓専用処理] ❌ 楓メッセージが取得できませんでした。メッセージを表示できません。');
            // メッセージが取得できなかった場合は、エラーメッセージを表示
            const errorMessage = `申し訳ございません。メッセージの生成に失敗しました。ページをリロードしてお試しください。`;
            ChatUI.addMessage('error', errorMessage, 'システム');
        }

        // この部分は削除（上記のtry-catchブロック内で既に会話履歴に追加済み）

        // メッセージ入力欄をクリア
        if (ChatUI.messageInput) {
            ChatUI.messageInput.value = '';
            console.log('[楓専用処理] メッセージ入力欄をクリアしました');
        }

        // 送信ボタンの状態を更新
        ChatUI.updateSendButtonVisibility();
        console.log('[楓専用処理] 送信ボタンの状態を更新しました（文字入力時に表示されます）');

        // 【重要】入力イベントリスナーを常に再設定（守護神の儀式完了後は確実に動作させるため）
        // 【修正】イベントリスナーの重複登録を防ぐため、既存のリスナーを削除せずに追加する方法に変更
        // （cloneNode/replaceChildは、他の処理に影響を与える可能性があるため避ける）
        if (ChatUI.messageInput) {
            // 既にリスナーが設定されている場合は、data属性で確認してスキップ
            const hasListenerSet = ChatUI.messageInput.getAttribute('data-kaede-listener-set') === 'true';
            
            if (!hasListenerSet) {
                // Enterキーのイベントリスナーを追加
                ChatUI.messageInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        // 【デバッグ】重複実行を防ぐためのチェック
                        if (ChatUI.messageInput && ChatUI.messageInput.disabled) {
                            console.log('[楓専用処理] メッセージ入力欄が無効化されているため、送信をスキップします');
                            return;
                        }
                        console.log('[楓専用処理] Enterキーが押されました。sendMessageを呼び出します');
                        window.sendMessage();
                    }
                });
                
                // inputイベントリスナーを追加
                ChatUI.messageInput.addEventListener('input', () => {
                    if (window.ChatUI && typeof window.ChatUI.updateSendButtonVisibility === 'function') {
                        window.ChatUI.updateSendButtonVisibility();
                    }
                });
                
                ChatUI.messageInput.setAttribute('data-kaede-listener-set', 'true');
                console.log('[楓専用処理] 入力イベントリスナー（keydown/input）を追加しました（守護神の儀式完了後）');
            } else {
                console.log('[楓専用処理] 入力イベントリスナーは既に設定されています（スキップ）');
            }
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
        // 【変更】assignedDeityをhistoryDataから取得（データベースベースの判断）
        // この関数は登録完了時に呼ばれるため、historyDataが利用可能な場合がある
        // ただし、この関数の呼び出し元でhistoryDataが渡されていない場合は、ChatData.conversationHistoryから取得
        const assignedDeity = (ChatData.conversationHistory && ChatData.conversationHistory.assignedDeity) || null;
        const guardianMessageShown = sessionStorage.getItem('guardianMessageShown') === 'true';
        console.log('[楓専用処理] ritualCompletedフラグをチェック:', ritualCompleted, 'assignedDeity:', assignedDeity, 'guardianMessageShown:', guardianMessageShown);

        // 【重要】ritualCompletedフラグまたはassignedDeityが存在する場合、守護神の儀式は既に完了している
        // 【修正】guardianMessageShownがtrueでも、assignedDeityが存在する場合はメッセージを表示する（再訪問時など）
        if ((ritualCompleted === 'true' || assignedDeity) && !guardianMessageShown) {
            console.log('[楓専用処理] 守護神の儀式は既に完了しています。会話履歴読み込み後に定型文を表示します。');
            // 【変更】userNicknameをhistoryDataまたはChatDataから取得（データベースベースの判断）
            const userNickname = (ChatData.conversationHistory && ChatData.conversationHistory.nickname) || ChatData.userNickname || 'あなた';
            const guardianName = assignedDeity;

            // 会話履歴はデータベースで管理されるため、移行処理は不要

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
        // 【重要】守護神が既に決定されている場合も、儀式開始処理をスキップ
        const hasAssignedDeity = historyData && historyData.assignedDeity && historyData.assignedDeity.trim() !== '';
        if ((ritualCompleted === 'true' && sessionStorage.getItem('guardianMessageShown') === 'true') || hasAssignedDeity) {
            // ユーザーデータを更新（儀式完了済みの場合も必要）
            if (historyData && historyData.birthYear && historyData.birthMonth && historyData.birthDay) {
                ChatUI.updateUserStatus(true, {
                    nickname: historyData.nickname || ChatData.userNickname,
                    birthYear: historyData.birthYear,
                    birthMonth: historyData.birthMonth,
                    birthDay: historyData.birthDay,
                    assignedDeity: historyData.assignedDeity
                });
            }
            
            // 【重要】守護神が既に決定されているが、メッセージが表示されていない場合は表示
            if (hasAssignedDeity && !sessionStorage.getItem('guardianMessageShown')) {
                const userNickname = historyData.nickname || ChatData.userNickname || 'あなた';
                const guardianName = historyData.assignedDeity;
                const guardianConfirmationMessage = `${userNickname}の守護神は${guardianName}です\nこれからは、私と守護神である${guardianName}が鑑定を進めていきます。\n${userNickname}が鑑定してほしいこと、再度、伝えていただけませんでしょうか。`;
                ChatUI.addMessage('welcome', guardianConfirmationMessage, ChatData.characterInfo[this.characterId].name);
                sessionStorage.setItem('guardianMessageShown', 'true');
                console.log('[楓専用処理] 守護神確認メッセージを表示しました:', guardianName);
            } else {
                // 【変更】会話履歴がない場合でもlocalStorageから取得しない（データベースベースの判断）
                // historyDataが存在しない場合は、ChatDataから取得
                const nickname = ChatData.userNickname || '鑑定者';
                const deity = (ChatData.conversationHistory && ChatData.conversationHistory.assignedDeity) || '未割当';
                const birthYear = null;
                const birthMonth = null;
                const birthDay = null;

                ChatUI.updateUserStatus(true, {
                    nickname: nickname,
                    birthYear: birthYear,
                    birthMonth: birthMonth,
                    birthDay: birthDay,
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
            // 【変更】会話履歴がない場合でもlocalStorageから取得しない（データベースベースの判断）
            // historyDataが存在しない場合は、ChatDataから取得
            const nickname = ChatData.userNickname || '鑑定者';
            const deity = (ChatData.conversationHistory && ChatData.conversationHistory.assignedDeity) || '未割当';
            const birthYear = null;
            const birthMonth = null;
            const birthDay = null;

            ChatUI.updateUserStatus(true, {
                nickname: nickname,
                birthYear: birthYear,
                birthMonth: birthMonth,
                birthDay: birthDay,
                assignedDeity: deity
            });
        }

        // 儀式完了フラグのチェックは既に会話履歴読み込み前に行われている
        // ここでは、会話履歴読み込み後に再度チェック（二重チェック）
        const ritualCompletedCheck = sessionStorage.getItem('ritualCompleted');
        const shouldSkipRitual = ritualCompletedCheck === 'true' && sessionStorage.getItem('guardianMessageShown') === 'true';

        if (!shouldSkipRitual) {
            // 【重要】守護神が未決定（assignedDeityがnull）の場合、自動的に儀式を開始
            const hasAssignedDeity = historyData && historyData.assignedDeity && historyData.assignedDeity.trim() !== '';
            const acceptedGuardianRitual = sessionStorage.getItem('acceptedGuardianRitual');
            
            console.log('[楓専用処理] カエデの場合、守護神の儀式を開始するかチェック:', {
                hasHistoryData: !!historyData,
                assignedDeity: historyData?.assignedDeity,
                hasAssignedDeity: hasAssignedDeity,
                acceptedGuardianRitual: acceptedGuardianRitual
            });

            // 守護神が未決定の場合、自動的に儀式を開始
            if (!hasAssignedDeity) {
                console.log('[楓専用処理] 守護神が未決定のため、自動的に儀式を開始します');
            } else if (acceptedGuardianRitual !== 'true') {
                console.log('[楓専用処理] 守護神の鑑定を受け入れていないため、儀式を自動開始しません');

                // URLパラメータからjustRegisteredを削除
                urlParams.delete('justRegistered');
                const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
                window.history.replaceState({}, '', newUrl);

                // sessionStorageからも登録完了フラグを削除
                sessionStorage.removeItem('justRegistered');

                // 登録ユーザーとして通常の会話を続ける
                return true; // 処理完了（儀式を開始しない）
            } else {
                console.log('[楓専用処理] 守護神の鑑定を受け入れているため、儀式を準備します');
            }

            // 会話履歴はデータベースで管理されるため、取得は不要（守護神の儀式で直接使用）

            // URLパラメータからjustRegisteredを削除
            urlParams.delete('justRegistered');
            const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
            window.history.replaceState({}, '', newUrl);

            // sessionStorageからも登録完了フラグを削除
            sessionStorage.removeItem('justRegistered');

            // 【重要】守護神が未決定の場合、自動的に儀式を開始
            if (!hasAssignedDeity) {
                console.log('[楓専用処理] 守護神が未決定のため、儀式を自動開始します');
                
                // 守護神の儀式開始メッセージを表示
                const characterName = ChatData.characterInfo[character]?.name || '楓';
                const ritualStartMessage = 'それではこれより守護神のイベントを開始いたします。\n画面が切り替わりますので、儀式を体験してください。';
                
                ChatUI.addMessage('character', ritualStartMessage, characterName);
                
                // DOM更新を待つ
                await new Promise(resolve => requestAnimationFrame(() => {
                    requestAnimationFrame(resolve);
                }));
                
                // スクロールしてメッセージを表示
                ChatUI.scrollToLatest();
                
                // メッセージ表示後、少し待ってからguardian-ritual.htmlに遷移
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒待つ
                
                // 【変更】guardian-ritual.htmlに遷移する際、userIdのみをURLパラメータに含める
                // 【重要】基本的にURLパラメータによるユーザー情報の保持は行わない（データベースから取得するため）
                // sessionStorageの使用を削除（データベースベースの判断に移行）
                // URLパラメータからuserIdを取得
                const urlParams = new URLSearchParams(window.location.search);
                const userId = urlParams.get('userId');
                
                // guardian-ritual.htmlへのURLを構築（userIdのみを使用）
                // 【修正】相対パスではなく、現在のページを基準に解決
                let ritualUrl = '../guardian-ritual.html';
                if (userId) {
                    // userIdのみを使用（データベースからユーザー情報を取得するため、birthYear, birthMonth, birthDay, nicknameは含めない）
                    // 【修正】window.location.hrefを基準にして相対パスを解決
                    const url = new URL(ritualUrl, window.location.href);
                    url.searchParams.set('userId', userId);
                    ritualUrl = url.pathname + url.search;
                    console.log('[楓専用処理] guardian-ritual.htmlに遷移（userIdのみ）:', ritualUrl);
                } else {
                    console.error('[楓専用処理] userIdが取得できませんでした');
                    ChatUI.addMessage('error', 'ユーザー情報の取得に失敗しました。', 'システム');
                    return false;
                }
                
                console.log('[楓専用処理] guardian-ritual.htmlに遷移:', ritualUrl);
                window.location.href = ritualUrl;
                
                return true; // 処理完了（遷移するため、以降の処理は実行されない）
            }

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

            // 会話履歴を取得（データベースから取得）
            const conversationHistory = (ChatData.conversationHistory?.recentMessages || []).map(entry => ({
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

        // 現在は最初からユーザー登録が必要なため、この関数は使用されない
        return false;

        // 儀式済み・表示済みの場合は何もしない
        const ritualAlreadyDone = sessionStorage.getItem('ritualCompleted') === 'true' || sessionStorage.getItem('guardianMessageShown') === 'true';
        if (ritualAlreadyDone) {
            return false;
        }

        const messageCount = ChatData.getUserMessageCount(character);

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
    },

    /**
     * 初期化時にHTMLの同意ボタンにイベントリスナーを設定
     */
    /**
     * 守護神の儀式への同意ボタンを動的に生成（楓専用）
     * HTMLに含めず、ハンドラー側で動的に生成することで、キャラクター固有の要素をチャットHTMLから分離
     */
    initRitualConsentButtons() {
        // 既に存在する場合は削除して再生成（重複を防ぐ）
        let ritualConsentContainer = document.getElementById('ritualConsentContainer');
        if (ritualConsentContainer) {
            ritualConsentContainer.remove();
        }
        
        // コンテナを動的に生成
        ritualConsentContainer = document.createElement('div');
        ritualConsentContainer.id = 'ritualConsentContainer';
        ritualConsentContainer.className = 'ritual-consent-container';
        ritualConsentContainer.style.display = 'none';
        
        // 質問テキスト
        const questionDiv = document.createElement('div');
        questionDiv.id = 'ritualConsentQuestion';
        questionDiv.className = 'ritual-consent-question';
        questionDiv.textContent = '守護神の儀式を始めますか？';
        
        // ボタンコンテナ
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'ritual-consent-buttons';
        
        // 「はい」ボタン
        const yesButton = document.createElement('button');
        yesButton.id = 'ritualYesButton';
        yesButton.className = 'ritual-consent-button';
        yesButton.textContent = 'はい';
        yesButton.addEventListener('click', () => {
            this.handleRitualConsent(true);
        });
        
        // 「いいえ」ボタン
        const noButton = document.createElement('button');
        noButton.id = 'ritualNoButton';
        noButton.className = 'ritual-consent-button no';
        noButton.textContent = 'いいえ';
        noButton.addEventListener('click', () => {
            this.handleRitualConsent(false);
        });
        
        // 構造を組み立て
        buttonsDiv.appendChild(yesButton);
        buttonsDiv.appendChild(noButton);
        ritualConsentContainer.appendChild(questionDiv);
        ritualConsentContainer.appendChild(buttonsDiv);
        
        // bodyに追加（input-areaの前に挿入）
        const inputArea = document.querySelector('.input-area');
        if (inputArea && inputArea.parentNode) {
            inputArea.parentNode.insertBefore(ritualConsentContainer, inputArea);
        } else {
            // input-areaが見つからない場合はbodyに直接追加
            document.body.appendChild(ritualConsentContainer);
        }
        
        console.log('[楓ハンドラー] 守護神の儀式への同意ボタンを動的に生成しました');
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
        // 楓の初回メッセージ（firstTimeGuest）の後に守護神の儀式を自動開始
        if ((type === 'welcome' || type === 'character') && 
            (text.includes('訪れていただきありがとうございます') ||
             text.includes('守護神を導き出すための儀式でございますので'))) {
            
            // 既に儀式が開始されているか、または守護神が決定済みの場合はスキップ
            const ritualCompleted = sessionStorage.getItem('ritualCompleted') === 'true';
            const guardianMessageShown = sessionStorage.getItem('guardianMessageShown') === 'true';
            const ritualStarted = sessionStorage.getItem('ritualStarted') === 'true';
            
            if (ritualCompleted || guardianMessageShown || ritualStarted) {
                console.log('[楓ハンドラー] 儀式は既に開始済みまたは完了済みのため、スキップします');
                return;
            }
            
            console.log('[楓ハンドラー] 初回メッセージを検出 - 守護神の儀式を自動開始します');
            
            // 儀式開始フラグを設定（二重実行を防ぐ）
            sessionStorage.setItem('ritualStarted', 'true');
            
            // メッセージ表示後、少し待ってから自動的に守護神の儀式を開始
            setTimeout(async () => {
                if (window.ChatInit && typeof window.ChatInit.startGuardianRitual === 'function') {
                    console.log('[楓ハンドラー] 守護神の儀式を自動開始します');
                    await window.ChatInit.startGuardianRitual(this.characterId);
                } else {
                    console.error('[楓ハンドラー] ChatInit.startGuardianRitualが見つかりません');
                    // ChatInitが読み込まれていない場合、少し待ってから再試行
                    setTimeout(async () => {
                        if (window.ChatInit && typeof window.ChatInit.startGuardianRitual === 'function') {
                            console.log('[楓ハンドラー] 守護神の儀式を自動開始します（リトライ）');
                            await window.ChatInit.startGuardianRitual(this.characterId);
                        } else {
                            console.error('[楓ハンドラー] ChatInit.startGuardianRitualが見つかりません（リトライ失敗）');
                            // リトライ失敗時はフラグをクリア
                            sessionStorage.removeItem('ritualStarted');
                        }
                    }, 500);
                }
            }, 2000); // 2秒後に儀式を開始
            
            console.log('[楓ハンドラー] 初回守護神の儀式自動開始設定完了');
        }
    },

    /**
     * 管理者モードの分析パネルにキャラクター固有の機能を追加（楓専用）
     * HTMLに含めず、ハンドラー側で動的に生成することで、キャラクター固有の要素をチャットHTMLから分離
     */
    initAdminFeatures() {
        // 管理者モードでない場合は何もしない
        const urlParams = new URLSearchParams(window.location.search);
        const isAdminMode = urlParams.has('admin') || urlParams.get('admin') === 'true' || urlParams.get('admin') === '1';
        if (!isAdminMode) {
            return;
        }
        
        // 分析パネルのキャラクター固有機能エリアを取得
        const adminCharacterFeatures = document.getElementById('adminCharacterFeatures');
        if (!adminCharacterFeatures) {
            console.warn('[楓ハンドラー] adminCharacterFeatures要素が見つかりません');
            return;
        }
        
        // 既に追加されている場合は削除して再生成（重複を防ぐ）
        adminCharacterFeatures.innerHTML = '';
        
        // 守護神の儀式再発動セクションを動的に生成
        const ritualSection = document.createElement('div');
        ritualSection.id = 'adminRitualSection';
        ritualSection.style.display = 'none'; // 初期状態は非表示（条件に応じて表示）
        
        const sectionTitle = document.createElement('h4');
        sectionTitle.style.cssText = 'margin: 0 0 10px; font-size: 14px; color: #c7cdff; font-weight: 600;';
        sectionTitle.textContent = 'テスト用機能';
        
        const sectionContent = document.createElement('div');
        sectionContent.className = 'analysis-content';
        
        const ritualButton = document.createElement('button');
        ritualButton.id = 'adminRitualButton';
        ritualButton.style.cssText = 'width: 100%; padding: 10px; font-size: 14px; background: rgba(139, 61, 255, 0.6); border: 1px solid rgba(139, 61, 255, 0.8); border-radius: 8px; color: white; cursor: pointer; transition: background 0.3s ease;';
        ritualButton.textContent = '🔮 守護神の儀式を再発動';
        ritualButton.addEventListener('click', () => {
            this.handleAdminRitualButton();
        });
        
        const ritualDescription = document.createElement('p');
        ritualDescription.style.cssText = 'margin-top: 8px; font-size: 11px; color: #9da2c6;';
        ritualDescription.textContent = '現在の会話履歴を使って、守護神の儀式を再度開始します';
        
        sectionContent.appendChild(ritualButton);
        sectionContent.appendChild(ritualDescription);
        ritualSection.appendChild(sectionTitle);
        ritualSection.appendChild(sectionContent);
        adminCharacterFeatures.appendChild(ritualSection);
        
        // 条件に応じて表示/非表示を切り替える関数
        const updateRitualSectionVisibility = () => {
            const character = ChatData?.currentCharacter || 'unknown';
            const isRegistered = window.AuthState?.isRegistered() || false;
            
            if (character === 'kaede' && isRegistered) {
                ritualSection.style.display = 'block';
            } else {
                ritualSection.style.display = 'none';
            }
        };
        
        // 初期表示状態を設定
        // ChatDataとAuthStateが読み込まれるまで待機
        const checkAndUpdate = () => {
            if (typeof ChatData !== 'undefined' && typeof window.AuthState !== 'undefined') {
                updateRitualSectionVisibility();
            } else {
                setTimeout(checkAndUpdate, 100);
            }
        };
        checkAndUpdate();
        
        // グローバルのupdateAdminAnalysisPanel関数が呼ばれたときにも更新
        const originalUpdateAdminAnalysisPanel = window.updateAdminAnalysisPanel;
        if (originalUpdateAdminAnalysisPanel) {
            window.updateAdminAnalysisPanel = function() {
                originalUpdateAdminAnalysisPanel();
                updateRitualSectionVisibility();
            };
        } else {
            // updateAdminAnalysisPanelが存在しない場合は、定期的にチェック
            setInterval(updateRitualSectionVisibility, 2000);
        }
        
        console.log('[楓ハンドラー] 管理者モードの分析パネルに守護神の儀式再発動ボタンを動的に生成しました');
    },
    
    /**
     * 管理者用の守護神の儀式再発動ボタンの処理
     */
    async handleAdminRitualButton() {
        const character = ChatData?.currentCharacter || 'unknown';
        const isRegistered = window.AuthState?.isRegistered() || false;
        
        if (!isRegistered) {
            alert('守護神の儀式は登録済みユーザーのみ利用できます。');
            return;
        }
        
        if (character !== 'kaede') {
            alert('守護神の儀式は楓（カエデ）のみ利用できます。');
            return;
        }
        
        if (!confirm('守護神の儀式を再発動しますか？\n\n現在の会話履歴を使って、儀式を再度開始します。')) {
            return;
        }
        
        const ritualBtn = document.getElementById('adminRitualButton');
        if (ritualBtn) {
            ritualBtn.disabled = true;
            ritualBtn.textContent = '発動中...';
        }
        
        try {
            // 「それでは守護神の儀式を始めます」というメッセージを表示
            const ritualStartMessage = 'それでは守護神の儀式を始めます';
            ChatUI.addMessage('character', ritualStartMessage, ChatData.characterInfo[character].name);
            
            // 1秒待機後、守護神の儀式を開始
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 会話履歴はAPIから取得されるため、パラメータは不要
            if (window.ChatInit && typeof window.ChatInit.startGuardianRitual === 'function') {
                await window.ChatInit.startGuardianRitual(character);
            } else {
                alert('守護神の儀式を開始できませんでした。ページをリロードしてください。');
            }
        } catch (error) {
            console.error('[管理者モード] 守護神の儀式再発動エラー:', error);
            alert('守護神の儀式の開始に失敗しました: ' + error.message);
        } finally {
            if (ritualBtn) {
                ritualBtn.disabled = false;
                ritualBtn.textContent = '🔮 守護神の儀式を再発動';
            }
        }
    },

    /**
     * 守護神が既に決定されている場合、firstTimeGuestメッセージをスキップするかどうかを判定
     * @param {Object} historyData - 会話履歴データ
     * @returns {boolean} スキップするかどうか
     */
    shouldSkipFirstMessageForDeity(historyData) {
        const hasAssignedDeity = historyData && historyData.assignedDeity && historyData.assignedDeity.trim() !== '';
        return hasAssignedDeity;
    },

    /**
     * 守護神確認メッセージを取得
     * @param {Object} historyData - 会話履歴データ
     * @param {string} userNickname - ユーザーのニックネーム
     * @returns {string|null} 守護神確認メッセージ（表示しない場合はnull）
     */
    getGuardianConfirmationMessage(historyData, userNickname) {
        const hasAssignedDeity = historyData && historyData.assignedDeity && historyData.assignedDeity.trim() !== '';
        if (hasAssignedDeity) {
            const guardianName = historyData.assignedDeity;
            return `${userNickname}の守護神は${guardianName}です\nこれからは、私と守護神である${guardianName}が鑑定を進めていきます。\n${userNickname}が鑑定してほしいこと、再度、伝えていただけませんでしょうか。`;
        }
        return null;
    }
};

// グローバルスコープに公開
window.KaedeHandler = KaedeHandler;

// 後方互換性のため、旧名称でも公開
window.KaedeRitualHandler = KaedeHandler;


