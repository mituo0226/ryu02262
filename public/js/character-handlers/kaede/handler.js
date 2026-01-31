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
        
        // 管理者機能の初期化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initAdminFeatures();
            });
        } else {
            // 既に読み込み完了している場合は即座に実行
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
     * @param {string} waitingMessageId - 待機メッセージのID
     * @returns {boolean} true: 待機画面処理は完了、false: 共通処理で削除
     */
    onResponseReceived(waitingMessageId) {
        console.log('[楓ハンドラー] API応答受信 - 共通処理に委譲');
        return false;  // false を返すと、共通処理で削除される
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

        // 【変更】守護神の儀式開始処理は削除されました
        // requireGuardianConsentフラグで処理するため、この処理は不要
        // （後方互換性のためメソッド自体は残すが、呼び出しは行わない）

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
            console.log('[楓専用処理] バックエンドからrequireGuardianConsentフラグが設定されています。儀式ボタンを表示します。');
            
            // welcomeMessageはバックエンドで生成済み（守護神未決定を考慮したメッセージ）
            console.log('[楓専用処理] welcomeMessage確認:', {
                hasWelcomeMessage: !!historyData.welcomeMessage,
                welcomeMessagePreview: historyData.welcomeMessage ? historyData.welcomeMessage.substring(0, 50) : 'なし'
            });
            
            if (historyData.welcomeMessage) {
                const info = ChatData.characterInfo[this.characterId];
                const messageId = ChatUI.addMessage('welcome', historyData.welcomeMessage, info.name);
                
                console.log('[楓専用処理] ウェルカムメッセージを表示しました。messageId:', messageId);
                
                // メッセージ表示後、少し待ってからボタンを追加
                setTimeout(() => {
                    const messageElement = document.getElementById(messageId);
                    console.log('[楓専用処理] ボタン追加開始:', {
                        messageId,
                        messageElement: !!messageElement,
                        hasAddRitualStartButton: typeof this.addRitualStartButton === 'function'
                    });
                    
                    if (messageElement) {
                        // 「守護神の儀式を始める」ボタンを表示
                        this.addRitualStartButton(messageElement, async () => {
                            console.log('[楓専用処理] 守護神の儀式開始ボタンがクリックされました');
                            
                            if (window.ChatInit && typeof window.ChatInit.startGuardianRitual === 'function') {
                                await window.ChatInit.startGuardianRitual(this.characterId);
                            } else {
                                console.error('[楓専用処理] ChatInit.startGuardianRitualが見つかりません');
                            }
                        });
                        console.log('[楓専用処理] ボタン追加完了');
                    } else {
                        console.error('[楓専用処理] メッセージ要素が見つかりません:', messageId);
                    }
                }, 500);
            } else {
                console.warn('[楓専用処理] welcomeMessageが存在しません。フォールバックメッセージを表示します。');
                
                // フォールバックメッセージを表示
                const fallbackMessage = `訪れていただき、ありがとうございます。\n楓と申します。よろしくお願いいたします。\nまずは守護神の儀式を開始させていただきます。`;
                const info = ChatData.characterInfo[this.characterId];
                const messageId = ChatUI.addMessage('welcome', fallbackMessage, info.name);
                
                // メッセージ表示後、少し待ってからボタンを追加
                setTimeout(() => {
                    const messageElement = document.getElementById(messageId);
                    if (messageElement) {
                        this.addRitualStartButton(messageElement, async () => {
                            console.log('[楓専用処理] 守護神の儀式開始ボタンがクリックされました');
                            
                            if (window.ChatInit && typeof window.ChatInit.startGuardianRitual === 'function') {
                                await window.ChatInit.startGuardianRitual(this.characterId);
                            } else {
                                console.error('[楓専用処理] ChatInit.startGuardianRitualが見つかりません');
                            }
                        });
                    }
                }, 500);
            }
            
            // 入力欄を無効化
            this.disableInputWithGuidance();
            
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

        console.log('[楓ハンドラー] 守護神の儀式完了処理を開始:', guardianConfirmationData);

        // 守護神名とニックネームを取得
        const guardianName = guardianConfirmationData?.guardianName;
        const userNickname = guardianConfirmationData?.userNickname || 'あなた';
        
        if (!guardianName) {
            console.error('[楓ハンドラー] 守護神名が取得できませんでした');
            return false;
        }

        // セッションストレージに保存
        sessionStorage.setItem('currentUserGuardian', guardianName);
        sessionStorage.setItem('currentUserNickname', userNickname);
        console.log('[楓ハンドラー] ✓ 守護神名をセッションストレージに保存しました:', guardianName);

        // チャット画面をクリア（守護神の儀式完了後は会話をゼロからスタート）
        const shouldClearChat = (historyData && historyData.clearChat) || true;
        if (shouldClearChat && ChatUI.messagesDiv) {
            ChatUI.messagesDiv.innerHTML = '';
            console.log('[楓ハンドラー] ✓ チャット画面をクリアしました');
        }

        // ゲスト履歴をクリア
        if (window.AuthState && typeof window.AuthState.clearGuestHistory === 'function') {
            AuthState.clearGuestHistory(character);
        }
        const GUEST_HISTORY_KEY_PREFIX = 'guestConversationHistory_';
        const historyKey = GUEST_HISTORY_KEY_PREFIX + character;
        sessionStorage.removeItem(historyKey);
        ChatData.setUserMessageCount(character, 0);

        // recentMessagesをクリア
        if (historyData && historyData.recentMessages) {
            historyData.recentMessages = [];
        }
        if (ChatData.conversationHistory && ChatData.conversationHistory.recentMessages) {
            ChatData.conversationHistory.recentMessages = [];
        }

        // フラグをクリア
        sessionStorage.removeItem('acceptedGuardianRitual');
        sessionStorage.removeItem('ritualCompleted');
        sessionStorage.removeItem('lastUserMessage');
        
        // ローディング画面を非表示（定型文表示前）
        if (typeof hideLoadingScreen === 'function') {
            hideLoadingScreen();
            console.log('[楓ハンドラー] ローディング画面を非表示にしました');
        }
        
        // フロントエンド定型文を表示（APIを呼ばない）
        await this.sendRitualCompletionMessages(guardianName, userNickname);
        
        console.log('[楓ハンドラー] 守護神の儀式完了処理が完了しました');
        
        // 処理完了を返す（これ以上の処理は不要）
        return true;
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
        const guardianMessageShown = sessionStorage.getItem('guardianMessageShown') === 'true';
        
        // 【変更】sessionStorageから守護神名とニックネームを取得（guardian-ritual.htmlで保存済み）
        const completedGuardianName = sessionStorage.getItem('completedGuardianName');
        const completedUserNickname = sessionStorage.getItem('completedUserNickname');
        
        console.log('[楓専用処理] ritualCompletedフラグをチェック:', {
            ritualCompleted,
            guardianMessageShown,
            completedGuardianName,
            completedUserNickname
        });

        // 【重要】ritualCompletedフラグが存在し、まだメッセージを表示していない場合
        if (ritualCompleted === 'true' && !guardianMessageShown && completedGuardianName) {
            console.log('[楓専用処理] 守護神の儀式は既に完了しています。定型文を表示します。');
            
            const userNickname = completedUserNickname || 'あなた';
            const guardianName = completedGuardianName;

            // 【フェーズ3対応】守護神情報はChatData.conversationHistoryから取得するため、セッションストレージへの保存は不要

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

            // 【変更】自動遷移は削除されました
            // 儀式はボタンクリックで開始する方式に変更
            // initPageで既にボタン表示と入力欄無効化が行われている
            
            return false; // 処理は続行（initPageでボタン表示済み）
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
        console.log('[楓専用処理] 守護神の儀式を強制開始します');
        if (window.ChatInit && typeof window.ChatInit.startGuardianRitual === 'function') {
            await window.ChatInit.startGuardianRitual(character);
            return true;
        }
        return false;
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
            if (messageElement && typeof this.addRitualStartButton === 'function') {
                this.addRitualStartButton(messageElement, async () => {
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

                    if (window.ChatInit && typeof window.ChatInit.startGuardianRitual === 'function') {
                        await window.ChatInit.startGuardianRitual(character);
                    }
                });
                console.log('[楓専用処理] 守護神の儀式開始ボタンを追加しました');
            } else {
                console.warn('[楓専用処理] メッセージ要素またはaddRitualStartButtonが見つかりません', {
                    messageId,
                    messageElement: !!messageElement,
                    hasAddRitualStartButton: typeof this.addRitualStartButton === 'function'
                });
            }
        }, 500); // メッセージが完全に表示されるまで少し待つ

        return true; // ボタンが追加された
    },

    /**
     * 守護神の儀式開始ボタンをメッセージの下に追加
     * @param {HTMLElement} messageElement - メッセージ要素
     * @param {Function} onClickHandler - ボタンクリック時のハンドラ
     * @returns {HTMLButtonElement|null} 作成したボタン要素
     */
    addRitualStartButton(messageElement, onClickHandler) {
        console.log('[楓ハンドラー] 儀式開始ボタンを追加:', { messageElement, hasOnClickHandler: !!onClickHandler });
        if (!messageElement) {
            console.error('[楓ハンドラー] messageElementがnullです');
            return null;
        }
        const existingButton = messageElement.querySelector('.ritual-start-button');
        if (existingButton) {
            console.log('[楓ハンドラー] 既存のボタンを削除します');
            existingButton.remove();
        }
        // CSSアニメーションを動的に追加
        if (!document.getElementById('ritual-button-animation-styles')) {
            const style = document.createElement('style');
            style.id = 'ritual-button-animation-styles';
            style.textContent = `
                @keyframes mysticGlow {
                    0%, 100% {
                        box-shadow: 0 0 20px rgba(139, 61, 255, 0.6),
                                    0 0 40px rgba(139, 61, 255, 0.4),
                                    0 0 60px rgba(139, 61, 255, 0.2),
                                    inset 0 0 20px rgba(255, 255, 255, 0.1);
                    }
                    50% {
                        box-shadow: 0 0 30px rgba(139, 61, 255, 0.8),
                                    0 0 60px rgba(139, 61, 255, 0.6),
                                    0 0 90px rgba(139, 61, 255, 0.4),
                                    inset 0 0 30px rgba(255, 255, 255, 0.2);
                    }
                }
                
                @keyframes shimmer {
                    0% {
                        background-position: -200% center;
                    }
                    100% {
                        background-position: 200% center;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'ritual-start-button-container';
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: center;
            align-items: center;
            margin-top: 20px;
            padding: 20px 0;
        `;
        
        const button = document.createElement('button');
        button.className = 'ritual-start-button';
        button.textContent = '守護神の儀式を始める';
        button.style.cssText = `
            padding: 16px 48px;
            background: linear-gradient(135deg, #8B3DFF 0%, #6A0DAD 100%);
            background-size: 200% auto;
            color: white;
            border: 2px solid rgba(139, 61, 255, 0.5);
            border-radius: 50px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            animation: mysticGlow 2s ease-in-out infinite, shimmer 3s linear infinite;
            position: relative;
            overflow: hidden;
            min-width: 280px;
            max-width: 90%;
            
            @media (max-width: 768px) {
                font-size: 16px;
                padding: 14px 40px;
                min-width: 240px;
            }
        `;
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-3px) scale(1.05)';
            button.style.filter = 'brightness(1.2)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0) scale(1)';
            button.style.filter = 'brightness(1)';
        });
        button.addEventListener('click', async () => {
            button.disabled = true;
            button.textContent = '儀式を開始しています...';
            button.style.opacity = '0.7';
            button.style.cursor = 'wait';
            try {
                await onClickHandler();
            } catch (error) {
                console.error('[楓ハンドラー] 儀式開始エラー:', error);
                button.disabled = false;
                button.textContent = '守護神の儀式を始める';
                button.style.opacity = '1';
                button.style.cursor = 'pointer';
                if (window.ChatUI && typeof window.ChatUI.addMessage === 'function') {
                    window.ChatUI.addMessage('error', '守護神の儀式の開始中にエラーが発生しました。もう一度お試しください。', 'システム');
                }
            }
        });
        buttonContainer.appendChild(button);
        messageElement.appendChild(buttonContainer);
        console.log('[楓ハンドラー] 儀式開始ボタンを追加しました');
        requestAnimationFrame(() => {
            if (window.ChatUI && typeof window.ChatUI.scrollToLatest === 'function') {
                window.ChatUI.scrollToLatest();
            }
        });
        return button;
    },

    /**
     * 守護神の儀式開始ボタンが表示されているかチェック
     * @returns {boolean} ボタンが表示されているか
     */
    isRitualStartButtonVisible() {
        const buttons = document.querySelectorAll('.ritual-start-button');
        if (buttons.length === 0) return false;
        const visibleButton = Array.from(buttons).find(btn => {
            const style = window.getComputedStyle(btn);
            return style.display !== 'none' && !btn.disabled;
        });
        return !!visibleButton;
    },

    /**
     * 入力欄を無効化（守護神の儀式完了まで）
     */
    disableInputWithGuidance() {
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        
        if (messageInput) {
            messageInput.disabled = true;
            messageInput.placeholder = '守護神の儀式の完了後にメッセージを入力できます';
            messageInput.style.backgroundColor = 'rgba(200, 200, 200, 0.3)';
            messageInput.style.cursor = 'not-allowed';
        }
        
        if (sendButton) {
            sendButton.disabled = true;
            sendButton.style.opacity = '0.5';
            sendButton.style.cursor = 'not-allowed';
        }
        
        console.log('[楓ハンドラー] 入力欄を無効化しました（守護神の儀式完了まで）');
    },

    /**
     * 入力欄を有効化（守護神の儀式完了後）
     */
    enableInputAfterRitual() {
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        
        if (messageInput) {
            messageInput.disabled = false;
            messageInput.placeholder = 'メッセージを入力';
            messageInput.style.backgroundColor = '';
            messageInput.style.cursor = '';
        }
        
        if (sendButton) {
            sendButton.disabled = false;
            sendButton.style.opacity = '';
            sendButton.style.cursor = '';
        }
        
        console.log('[楓ハンドラー] 入力欄を有効化しました（守護神の儀式完了）');
    },

    /**
     * 守護神の儀式完了後のメッセージを表示（フロントエンド定型文）
     * @param {string} guardianName - 守護神の名前
     * @param {string} userNickname - ユーザーのニックネーム
     */
    async sendRitualCompletionMessages(guardianName, userNickname) {
        const character = this.characterId;
        const characterName = ChatData.characterInfo[character]?.name || '楓';
        
        try {
            // 1. 守護神決定の確認メッセージ
            const confirmationMessage = `導かれた守護神は「${guardianName}」
これからは、私と守護神である${guardianName}と共に運命を導いてまいります。`;
            
            if (window.ChatUI && window.ChatUI.addMessage) {
                window.ChatUI.addMessage('character', confirmationMessage, characterName);
            }
            
            // 会話履歴に追加
            if (window.ChatData && typeof window.ChatData.addToHistory === 'function') {
                window.ChatData.addToHistory(character, 'assistant', confirmationMessage);
            }
            
            // 2. 1秒待機
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 3. 初回相談への移行メッセージ
            const consultationMessage = `${userNickname}さんが今、心の中で抱えていること、私と守護神様に伝わっていることもございます。
しかしまずは${userNickname}さんの言葉から始めるのが望ましいでしょう。
どんな言葉から始めても構いません。
私と${guardianName}、これから先ずっとお支えしていきます。
思い浮かんだ心の声をお伝えくださいませ。`;
            
            if (window.ChatUI && window.ChatUI.addMessage) {
                window.ChatUI.addMessage('character', consultationMessage, characterName);
                window.ChatUI.scrollToLatest();
            }
            
            // 会話履歴に追加
            if (window.ChatData && typeof window.ChatData.addToHistory === 'function') {
                window.ChatData.addToHistory(character, 'assistant', consultationMessage);
            }
            
            // 4. 儀式完了フラグを設定
            sessionStorage.setItem('guardianRitualCompleted', 'true');
            sessionStorage.setItem('guardianMessageShown', 'true');
            
            // 5. 入力欄を有効化
            this.enableInputAfterRitual();
            
            console.log('[楓ハンドラー] 守護神の儀式完了メッセージを表示しました。入力欄を有効化しました。');
            
        } catch (error) {
            console.error('[楓ハンドラー] sendRitualCompletionMessages エラー:', error);
            // エラー時も入力欄を有効化
            this.enableInputAfterRitual();
        }
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
        // 自動開始処理は削除されました
        // ボタンクリックで儀式を開始する方式に変更
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


