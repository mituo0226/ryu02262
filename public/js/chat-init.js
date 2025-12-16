/**
 * chat-init.js
 * 初期化とメインロジックを担当
 */

const ChatInit = {
    /**
     * ページを初期化
     */
    async initPage() {
        // ChatUIを初期化
        if (ChatUI && typeof ChatUI.init === 'function') {
            ChatUI.init();
        }
        
        // AuthStateを初期化
        if (window.AuthState && typeof AuthState.init === 'function') {
            AuthState.init();
        }
        
        // 守護神の儀式への同意ボタンの表示フラグをリセット（ページ読み込み時）
        ChatData.ritualConsentShown = false;
        
        const isGuestMode = !AuthState.isRegistered();

        // キャラクター情報を読み込む
        await ChatData.loadCharacterData();
        
        if (Object.keys(ChatData.characterInfo).length === 0) {
            console.error('Failed to load character data');
            return;
        }

        // フェードインアニメーション
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.5s ease';
        requestAnimationFrame(() => {
            document.body.style.opacity = '1';
        });

        // キャラクターを設定
        const character = ChatData.getCharacterFromURL();
        ChatData.currentCharacter = character;
        ChatUI.setCurrentCharacter(character, ChatData.characterInfo);
        
        // ユーザー情報を設定
        if (AuthState.isRegistered() && AuthState.getUserToken()) {
            ChatData.userNickname = localStorage.getItem('userNickname') || null;
        } else {
            ChatData.userNickname = null;
        }
        
        // 登録完了フラグをチェック
        const urlParams = new URLSearchParams(window.location.search);
        const justRegisteredParam = urlParams.get('justRegistered') === 'true';
        
        // sessionStorageにも登録完了フラグをチェック（URLパラメータが失われた場合の代替手段）
        const justRegisteredSession = sessionStorage.getItem('justRegistered') === 'true';
        const justRegistered = justRegisteredParam || justRegisteredSession;
        
        // さらに、userTokenがあり、ゲスト履歴がpendingGuestHistoryMigrationに存在する場合も登録完了と判定
        const hasUserToken = !!localStorage.getItem('userToken');
        const hasPendingMigration = !!sessionStorage.getItem('pendingGuestHistoryMigration');
        const shouldTriggerRegistrationFlow = justRegistered || (hasUserToken && hasPendingMigration && !AuthState.isRegistered());
        
        // justRegisteredがtrueの場合、localStorageから直接userTokenをチェック
        // （AuthStateの初期化が完了する前でも、登録完了処理を実行できるようにするため）
        const hasValidToken = justRegistered || shouldTriggerRegistrationFlow ? hasUserToken : AuthState.isRegistered();
        console.log('[初期化] justRegistered:', justRegistered, 'justRegisteredParam:', justRegisteredParam, 'justRegisteredSession:', justRegisteredSession, 'hasUserToken:', hasUserToken, 'hasPendingMigration:', hasPendingMigration, 'shouldTriggerRegistrationFlow:', shouldTriggerRegistrationFlow, 'hasValidToken:', hasValidToken, 'isRegistered:', AuthState.isRegistered(), 'character:', character);
        
        // ユーザーステータスを更新（登録完了時はすぐに表示）
        if ((justRegistered || shouldTriggerRegistrationFlow) && hasValidToken) {
            const nickname = localStorage.getItem('userNickname') || '鑑定者';
            const deity = localStorage.getItem('assignedDeity') || '未割当';
            const birthYear = localStorage.getItem('birthYear') || null;
            const birthMonth = localStorage.getItem('birthMonth') || null;
            const birthDay = localStorage.getItem('birthDay') || null;
            
            ChatUI.updateUserStatus(true, {
                nickname: nickname,
                birthYear: birthYear ? parseInt(birthYear) : null,
                birthMonth: birthMonth ? parseInt(birthMonth) : null,
                birthDay: birthDay ? parseInt(birthDay) : null,
                assignedDeity: deity
            });
        } else {
            ChatUI.updateUserStatus(!isGuestMode);
        }

        // 登録完了時の処理を先にチェック（会話履歴を読み込む前に実行）
        if ((justRegistered || shouldTriggerRegistrationFlow) && hasValidToken) {
            console.log('[登録完了処理] 開始 - character:', character);
            
            // カエデの場合は、まず儀式完了フラグをチェック（会話履歴読み込み後に処理するため、ここではフラグのみチェック）
            let guardianMessageShown = false;
            let shouldSendGuardianConfirmation = false;
            let guardianConfirmationData = null;
            
            if (character === 'kaede') {
                const ritualCompleted = sessionStorage.getItem('ritualCompleted');
                const assignedDeity = localStorage.getItem('assignedDeity');
                console.log('[登録完了処理] ritualCompletedフラグをチェック:', ritualCompleted, 'assignedDeity:', assignedDeity, 'character:', character);
                
                // 【重要】ritualCompletedフラグまたはassignedDeityが存在する場合、守護神の儀式は既に完了している
                if ((ritualCompleted === 'true' || assignedDeity) && sessionStorage.getItem('guardianMessageShown') !== 'true') {
                    console.log('[登録完了処理] 守護神の儀式は既に完了しています。会話履歴読み込み後にAPIに報告します。');
                    const userNickname = localStorage.getItem('userNickname') || 'あなた';
                    const guardianName = assignedDeity;
                    
                    shouldSendGuardianConfirmation = true;
                    guardianConfirmationData = {
                        userNickname,
                        guardianName,
                        confirmationMessage: `守護神の儀式が完了しました。私の守護神は${guardianName}です。`
                    };
                    
                    // 守護神の儀式完了メッセージを表示する前に、guardianMessageShownフラグを設定
                    // （その後の通常の初期化処理でゲスト履歴が表示されないようにするため）
                    sessionStorage.setItem('guardianMessageShown', 'true');
                    console.log('[登録完了処理] 守護神の儀式完了メッセージ表示前にguardianMessageShownフラグを設定しました');
                    
                    // URLパラメータからjustRegisteredを削除
                    urlParams.delete('justRegistered');
                    const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
                    window.history.replaceState({}, '', newUrl);
                    // sessionStorageからも登録完了フラグを削除
                    sessionStorage.removeItem('justRegistered');
                }
            }
            
            try {
                // 会話履歴を読み込む（登録完了処理で使用するため）
                // 守護神メッセージ表示後も、その後の会話履歴を読み込んでAPIを通して鑑定を進める
                const historyData = await ChatAPI.loadConversationHistory(character);
                
                // 【重要】守護神確認メッセージを送信（会話履歴読み込み後）
                if (shouldSendGuardianConfirmation && guardianConfirmationData) {
                    console.log('[登録完了処理] 🚀 守護神の儀式完了メッセージを表示します:', guardianConfirmationData);
                    
                    // 守護神の儀式を行った日（今日）の最初のユーザーメッセージを取得
                    let firstQuestion = '';
                    
                    // 今日の日付を取得（YYYY-MM-DD形式）
                    const today = new Date();
                    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
                    console.log('[登録完了処理] 守護神の儀式を行った日（今日）:', todayStr);
                    
                    // 会話履歴から、今日の日付の最初のユーザーメッセージを抽出
                    const currentHistory = historyData?.recentMessages || [];
                    let firstUserMessageOfDay = null;
                    
                    if (currentHistory.length > 0) {
                        // created_atが今日の日付で始まるメッセージをフィルタリング
                        const todayMessages = currentHistory.filter(msg => {
                            if (!msg || msg.role !== 'user') return false;
                            if (!msg.created_at) return false;
                            // created_atがISO形式（YYYY-MM-DDTHH:mm:ss...）の場合
                            return msg.created_at.startsWith(todayStr);
                        });
                        
                        // 今日のメッセージの中から最初のユーザーメッセージを取得（時系列順に並んでいる想定）
                        if (todayMessages.length > 0) {
                            firstUserMessageOfDay = todayMessages[0];
                            console.log('[登録完了処理] 今日の最初のユーザーメッセージを発見:', firstUserMessageOfDay.content.substring(0, 50) + '...');
                        }
                    }
                    
                    // 今日のメッセージが見つからない場合は、ゲスト履歴から最初のユーザーメッセージを取得
                    if (!firstUserMessageOfDay) {
                        console.log('[登録完了処理] 今日の会話履歴から最初の質問が見つかりません。ゲスト履歴を確認します。');
                        const guestHistory = this.getGuestHistoryForMigration(character);
                        if (guestHistory && guestHistory.length > 0) {
                            firstUserMessageOfDay = guestHistory.find(msg => msg && msg.role === 'user');
                            console.log('[登録完了処理] ゲスト履歴から最初のユーザーメッセージを発見:', firstUserMessageOfDay ? firstUserMessageOfDay.content.substring(0, 50) + '...' : 'なし');
                        }
                    }
                    
                    if (firstUserMessageOfDay && firstUserMessageOfDay.content) {
                        firstQuestion = firstUserMessageOfDay.content.trim();
                    }
                    
                    // 定型文を構築
                    const characterName = ChatData.characterInfo[character]?.name || '楓';
                    const welcomeMessage = `儀式により${guardianConfirmationData.userNickname}様の守護神の${guardianConfirmationData.guardianName}を呼び出すことができました。

今後は私と${guardianConfirmationData.guardianName}であなたの運命を導いてまいります。

鑑定を続けてまいりましょう。${firstQuestion ? `\n\n「${firstQuestion}」` : ''}

${firstQuestion ? `この質問を再度深く、${guardianConfirmationData.guardianName}と共に掘り下げましょうか、それとも他のテーマで鑑定を進めますか？` : 'どのようなことについて鑑定を進めますか？'}`;
                    
                    // 【重要】ユーザー登録後はUIをゼロからスタート
                    // 守護神の儀式完了メッセージを表示する直前（会話履歴読み込み後、メッセージ表示直前）にUIをクリア
                    // これにより、ゲスト時代のメッセージやデータベースから読み込んだ不要なメッセージを確実に削除
                    if (ChatUI.messagesDiv) {
                        const beforeClearCount = ChatUI.messagesDiv.children.length;
                        console.log('[登録完了処理] 守護神メッセージ表示直前、UIを完全にクリアします（ゼロからスタート）', {
                            beforeClearCount: beforeClearCount,
                            messagesDiv: ChatUI.messagesDiv
                        });
                        ChatUI.messagesDiv.innerHTML = '';
                        console.log('[登録完了処理] UIクリア完了。メッセージ数:', beforeClearCount, '→ 0');
                    } else {
                        console.warn('[登録完了処理] ⚠️ ChatUI.messagesDivが見つかりません');
                    }
                    
                    // UIに守護神の儀式完了メッセージのみを表示（UIは完全にクリアされた状態）
                    ChatUI.addMessage('character', welcomeMessage, characterName);
                    
                    // 会話履歴に追加
                    if (ChatData.conversationHistory && ChatData.conversationHistory.recentMessages) {
                        ChatData.conversationHistory.recentMessages.push({
                            role: 'assistant',
                            content: welcomeMessage
                        });
                    }
                    
                    guardianMessageShown = true;
                    
                    // フラグは既に守護神の儀式完了メッセージ表示前に設定済み
                    // sessionStorage.setItem('guardianMessageShown', 'true'); // 削除（既に設定済み）
                    
                    // メッセージ入力欄をクリア（守護神の儀式完了後に残っているメッセージを削除）
                    if (ChatUI.messageInput) {
                        ChatUI.messageInput.value = '';
                        console.log('[登録完了処理] メッセージ入力欄をクリアしました');
                    }
                    
                    // 守護神の儀式完了フラグをクリア
                    sessionStorage.removeItem('acceptedGuardianRitual');
                    sessionStorage.removeItem('ritualCompleted');
                    console.log('[登録完了処理] ritualCompletedフラグとacceptedGuardianRitualフラグをクリアしました');
                    
                    // 守護神の儀式完了メッセージを表示した後、処理を終了
                    // （その後の通常の初期化処理でゲスト履歴が表示されないようにするため）
                    console.log('[登録完了処理] 守護神の儀式完了メッセージを表示しました。処理を終了します。');
                    return;
                }
                
                // カエデの場合は守護神の儀式を開始
                if (character === 'kaede') {
                    // 儀式が既に完了している場合はスキップ（guardian-ritual.htmlからリダイレクトされた場合）
                    const ritualCompleted = sessionStorage.getItem('ritualCompleted');
                    
                    // 既に守護神確認メッセージを表示済みの場合は、儀式開始処理をスキップ
                    // ただし、会話履歴の読み込み後の処理は実行する（ユーザーデータの更新など）
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
                        
                        // 儀式開始処理をスキップ（会話履歴の読み込み後の処理は続行）
                        // return; を削除して、その後の処理を実行する
                    }
                    
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
                    
                    // 儀式完了フラグのチェックは既に会話履歴読み込み前に行われている
                    // ここでは、会話履歴読み込み後に再度チェック（二重チェック）
                    const ritualCompletedCheck = sessionStorage.getItem('ritualCompleted');
                    const shouldSkipRitual = ritualCompletedCheck === 'true' && sessionStorage.getItem('guardianMessageShown') === 'true';
                    
                    if (!shouldSkipRitual) {
                        // 【重要】守護神の鑑定を受け入れた場合のみ、儀式を自動開始
                        // 11回目の制限で登録した場合は、儀式を自動開始しない
                        const acceptedGuardianRitual = sessionStorage.getItem('acceptedGuardianRitual');
                        console.log('[登録完了処理] カエデの場合、守護神の儀式を開始するかチェック:', {
                            acceptedGuardianRitual: acceptedGuardianRitual
                        });
                        
                        if (acceptedGuardianRitual !== 'true') {
                            console.log('[登録完了処理] 守護神の鑑定を受け入れていないため、儀式を自動開始しません');
                            
                            // URLパラメータからjustRegisteredを削除
                            urlParams.delete('justRegistered');
                            const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
                            window.history.replaceState({}, '', newUrl);
                            
                            // sessionStorageからも登録完了フラグを削除
                            sessionStorage.removeItem('justRegistered');
                            
                            // 登録ユーザーとして通常の会話を続ける
                            return;
                        }
                        
                        console.log('[登録完了処理] 守護神の鑑定を受け入れているため、儀式を自動開始します');
                        
                        // 【重要】ゲスト会話履歴を取得して保存（守護神の儀式で使用するため）
                        console.log('[登録完了処理] ゲスト履歴取得を開始:', character);
                        
                        // デバッグ: sessionStorageの状態を確認
                        const guestHistoryKeyPrefix = 'guestConversationHistory_';
                        const guestHistoryKey = guestHistoryKeyPrefix + character;
                        const rawStoredHistory = sessionStorage.getItem(guestHistoryKey);
                        const pendingMigration = sessionStorage.getItem('pendingGuestHistoryMigration');
                        console.log('[登録完了処理] sessionStorage状態:', {
                            historyKey: guestHistoryKey,
                            rawStoredHistory: rawStoredHistory ? '存在' : 'なし',
                            rawStoredHistoryLength: rawStoredHistory ? JSON.parse(rawStoredHistory).length : 0,
                            pendingMigration: pendingMigration ? '存在' : 'なし'
                        });
                        
                        let guestHistory = this.getGuestHistoryForMigration(character);
                        console.log('[登録完了処理] getGuestHistoryForMigration結果:', {
                            historyLength: guestHistory.length,
                            userMessages: guestHistory.filter(msg => msg && msg.role === 'user').length
                        });
                        
                        if (guestHistory.length === 0) {
                            // フォールバック: ChatDataから直接取得
                            console.log('[登録完了処理] ChatDataから直接取得を試行');
                            guestHistory = ChatData.getGuestHistory(character) || [];
                            console.log('[登録完了処理] ChatData.getGuestHistory結果:', {
                                historyLength: guestHistory.length,
                                userMessages: guestHistory.filter(msg => msg && msg.role === 'user').length
                            });
                        }
                        
                        console.log('[登録完了処理] ゲスト会話履歴を取得:', {
                            historyLength: guestHistory.length,
                            userMessages: guestHistory.filter(msg => msg && msg.role === 'user').length,
                            fullHistory: guestHistory
                        });
                        
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
                            console.log('[登録完了処理] ゲスト履歴をpendingRitualGuestHistoryに保存:', {
                                historyLength: guestHistoryForRitual.length,
                                userMessages: guestHistoryForRitual.filter(msg => msg && msg.role === 'user').length
                            });
                        }
                        
                        // 自動的に守護神の儀式を開始
                        console.log('[登録完了処理] 守護神の儀式を自動的に開始します');
                        const ChatInitInstance = window.ChatInit || this;
                        if (ChatInitInstance && typeof ChatInitInstance.startGuardianRitual === 'function') {
                            // 少し待ってから開始（UIの更新を待つため）
                            setTimeout(async () => {
                                await ChatInitInstance.startGuardianRitual(character, guestHistoryForRitual);
                                
                                // 守護神の儀式開始後、ゲスト履歴とフラグをクリア
                                if (window.AuthState && typeof window.AuthState.clearGuestHistory === 'function') {
                                    AuthState.clearGuestHistory(character);
                                }
                                sessionStorage.removeItem(historyKey);
                                sessionStorage.removeItem('pendingGuestHistoryMigration');
                                sessionStorage.removeItem('pendingRitualGuestHistory');
                                sessionStorage.removeItem('acceptedGuardianRitual'); // フラグをクリア
                                ChatData.setGuestMessageCount(character, 0);
                            }, 500);
                        } else {
                            console.error('[登録完了処理] startGuardianRitual関数が見つかりません');
                        }
                        
                        // URLパラメータからjustRegisteredを削除
                        urlParams.delete('justRegistered');
                        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
                        window.history.replaceState({}, '', newUrl);
                        
                        // sessionStorageからも登録完了フラグを削除
                        sessionStorage.removeItem('justRegistered');
                        
                        return;
                    } else {
                        // 儀式完了済みの場合、URLパラメータからjustRegisteredを削除
                        urlParams.delete('justRegistered');
                        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
                        window.history.replaceState({}, '', newUrl);
                        
                        // sessionStorageからも登録完了フラグを削除
                        sessionStorage.removeItem('justRegistered');
                        
                        // 会話履歴の読み込み後の処理は続行（初期メッセージの表示など）
                        // return; はしない
                    }
                } else {
                    // カエデ以外の場合はゲスト履歴をクリア
                    if (window.AuthState && typeof window.AuthState.clearGuestHistory === 'function') {
                        AuthState.clearGuestHistory(character);
                    }
                    const GUEST_HISTORY_KEY_PREFIX = 'guestConversationHistory_';
                    const historyKey = GUEST_HISTORY_KEY_PREFIX + character;
                    sessionStorage.removeItem(historyKey);
                    sessionStorage.removeItem('pendingGuestHistoryMigration');
                    ChatData.setGuestMessageCount(character, 0);
                    
                    // 他のキャラクターの場合、通常の初回メッセージを表示
                    const info = ChatData.characterInfo[character];
                    const firstTimeMessage = ChatData.generateFirstTimeMessage(character, ChatData.userNickname || 'あなた');
                    ChatUI.addMessage('welcome', firstTimeMessage, info.name);
                    
                    // URLパラメータからjustRegisteredを削除
                    urlParams.delete('justRegistered');
                    const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
                    window.history.replaceState({}, '', newUrl);
                    
                    // sessionStorageからも登録完了フラグを削除
                    sessionStorage.removeItem('justRegistered');
                    
                    return;
                }
            } catch (error) {
                console.error('[登録完了処理] エラー:', error);
                ChatUI.addMessage('error', '登録完了処理中にエラーが発生しました。ページを再読み込みしてください。', 'システム');
                return;
            }
        }
        
        try {
            // 守護神の儀式完了直後のフラグを事前にチェック
            const guardianMessageShown = sessionStorage.getItem('guardianMessageShown') === 'true';
            
            // 会話履歴を読み込む
            const historyData = await ChatAPI.loadConversationHistory(character);
            
            // ゲスト履歴を取得
            let guestHistory = this.getGuestHistoryForMigration(character);
            
            if (guestHistory.length === 0 && isGuestMode) {
                guestHistory = ChatData.getGuestHistory(character);
            }
            
            // ゲスト履歴を表示
            // 守護神の儀式完了直後（guardianMessageShown）の場合は、ゲスト履歴を表示しない
            // （既に守護神の儀式完了メッセージが表示されているため）
            // 【重要】sessionStorageから直接読み取る（let変数のスコープ外のため）
            const guardianMessageShownFromStorage = sessionStorage.getItem('guardianMessageShown') === 'true';
            console.log('[初期化] ゲスト履歴表示チェック:', {
                guestHistoryLength: guestHistory.length,
                guardianMessageShownFromStorage: guardianMessageShownFromStorage,
                willDisplay: guestHistory.length > 0 && !guardianMessageShownFromStorage
            });
            if (guestHistory.length > 0 && !guardianMessageShownFromStorage) {
                console.log('[初期化] ゲスト履歴を表示します:', guestHistory.length, '件');
                const info = ChatData.characterInfo[character];
                
                guestHistory.forEach((entry) => {
                    const type = entry.role === 'user' ? 'user' : 'character';
                    const sender = entry.role === 'user' ? 'あなた' : info.name;
                    ChatUI.addMessage(type, entry.content, sender);
                });
                
                // ゲストユーザーの場合、会話履歴からメッセージカウントを再計算して設定
                if (isGuestMode) {
                    const historyUserMessages = guestHistory.filter(msg => msg && msg.role === 'user').length;
                    const currentCount = ChatData.getGuestMessageCount(character);
                    
                    console.log('[初期化] ゲスト履歴からメッセージカウントを再計算:', {
                        character,
                        historyLength: guestHistory.length,
                        historyUserMessages: historyUserMessages,
                        currentCount: currentCount
                    });
                    
                    // 会話履歴から計算した値の方が大きい、または現在のカウントが0の場合は更新
                    if (historyUserMessages > currentCount || currentCount === 0) {
                        console.log('[初期化] ⚠️ メッセージカウントを修正:', {
                            oldCount: currentCount,
                            newCount: historyUserMessages,
                            reason: currentCount === 0 ? 'カウントが0のため' : '履歴の方が大きいため'
                        });
                        ChatData.setGuestMessageCount(character, historyUserMessages);
                    }
                }
            }
            
            // 初回メッセージを表示
            // ただし、守護神の儀式完了直後（guardianMessageShown）の場合は、既に守護神確認メッセージを表示済みなのでスキップ
            // ※guardianMessageShownは上で既に定義済み
            
            if (historyData && historyData.hasHistory) {
                ChatData.conversationHistory = historyData;
                ChatData.userNickname = historyData.nickname || ChatData.userNickname;
                
                // 守護神確認メッセージがpendingGuardianMessageに保存されている場合、会話履歴に追加
                const pendingGuardianMessage = sessionStorage.getItem('pendingGuardianMessage');
                if (pendingGuardianMessage && ChatData.conversationHistory && ChatData.conversationHistory.recentMessages) {
                    // 既に会話履歴に守護神確認メッセージが含まれているかチェック
                    const hasGuardianMessage = ChatData.conversationHistory.recentMessages.some(msg => 
                        msg.role === 'assistant' && msg.content && msg.content.includes('の守護神は')
                    );
                    
                    if (!hasGuardianMessage) {
                        ChatData.conversationHistory.recentMessages.push({
                            role: 'assistant',
                            content: pendingGuardianMessage
                        });
                        console.log('[会話履歴読み込み] 守護神確認メッセージを会話履歴に追加しました');
                    }
                    sessionStorage.removeItem('pendingGuardianMessage');
                }
                
                // 守護神の儀式が完了している場合、会話履歴に守護神確認メッセージが含まれているか確認
                // 含まれていない場合は追加（APIが儀式完了を認識できるように）
                // 【重要】ritualCompletedフラグまたはassignedDeityが存在する場合、守護神の儀式は既に完了している
                const ritualCompleted = sessionStorage.getItem('ritualCompleted');
                const assignedDeity = localStorage.getItem('assignedDeity');
                if ((ritualCompleted === 'true' || assignedDeity) && ChatData.conversationHistory && ChatData.conversationHistory.recentMessages) {
                    const hasGuardianMessage = ChatData.conversationHistory.recentMessages.some(msg => 
                        msg.role === 'assistant' && msg.content && msg.content.includes('の守護神は')
                    );
                    
                    if (!hasGuardianMessage && assignedDeity) {
                        const userNickname = localStorage.getItem('userNickname') || 'あなた';
                        // 守護神名（データベースに日本語で保存されているのでそのまま使用）
                        const guardianName = assignedDeity;
                        const guardianConfirmationMessage = `${userNickname}の守護神は${guardianName}です\nこれからは、私と守護神である${guardianName}が鑑定を進めていきます。\n${userNickname}が鑑定してほしいこと、再度、伝えていただけませんでしょうか。`;
                        
                        ChatData.conversationHistory.recentMessages.push({
                            role: 'assistant',
                            content: guardianConfirmationMessage
                        });
                        console.log('[会話履歴読み込み] 守護神確認メッセージを会話履歴に追加しました（ritualCompleted/assignedDeityチェック）');
                    }
                }
                
                // ユーザーデータを更新
                if (historyData.birthYear && historyData.birthMonth && historyData.birthDay) {
                    ChatUI.updateUserStatus(true, {
                        nickname: historyData.nickname,
                        birthYear: historyData.birthYear,
                        birthMonth: historyData.birthMonth,
                        birthDay: historyData.birthDay,
                        assignedDeity: historyData.assignedDeity
                    });
                }
                
                if (guestHistory.length === 0 && !guardianMessageShown) {
                    const initialMessage = ChatData.generateInitialMessage(character, historyData);
                    ChatUI.addMessage('welcome', initialMessage, ChatData.characterInfo[character].name);
                }
            } else if (historyData && historyData.nickname) {
                ChatData.userNickname = historyData.nickname;
                const info = ChatData.characterInfo[character];
                if (guestHistory.length === 0 && !guardianMessageShown) {
                    const firstTimeMessage = ChatData.generateFirstTimeMessage(character, ChatData.userNickname);
                    ChatUI.addMessage('welcome', firstTimeMessage, info.name);
                }
            } else {
                const info = ChatData.characterInfo[character];
                if (guestHistory.length === 0 && !guardianMessageShown) {
                    const firstTimeMessage = ChatData.generateFirstTimeMessage(character, ChatData.userNickname || 'あなた');
                    ChatUI.addMessage('welcome', firstTimeMessage, info.name);
                }
            }
            
            // 守護神確認メッセージを表示した場合は、フラグをクリア
            if (guardianMessageShown) {
                sessionStorage.removeItem('guardianMessageShown');
                sessionStorage.removeItem('ritualCompleted');
            }
        } catch (error) {
            console.error('Error loading conversation history:', error);
            const character = ChatData.currentCharacter;
            const info = ChatData.characterInfo[character];
            let guestHistory = this.getGuestHistoryForMigration(character);
            
            if (guestHistory.length === 0 && isGuestMode) {
                guestHistory = ChatData.getGuestHistory(character);
            }
            
            if (guestHistory.length > 0) {
                guestHistory.forEach((entry) => {
                    const type = entry.role === 'user' ? 'user' : 'character';
                    const sender = entry.role === 'user' ? 'あなた' : info.name;
                    ChatUI.addMessage(type, entry.content, sender);
                });
                
                // ゲストユーザーの場合、会話履歴からメッセージカウントを再計算して設定
                if (isGuestMode) {
                    const historyUserMessages = guestHistory.filter(msg => msg && msg.role === 'user').length;
                    const currentCount = ChatData.getGuestMessageCount(character);
                    
                    console.log('[初期化] エラー時: ゲスト履歴からメッセージカウントを再計算:', {
                        character,
                        historyLength: guestHistory.length,
                        historyUserMessages: historyUserMessages,
                        currentCount: currentCount
                    });
                    
                    // 会話履歴から計算した値の方が大きい、または現在のカウントが0の場合は更新
                    if (historyUserMessages > currentCount || currentCount === 0) {
                        console.log('[初期化] エラー時: ⚠️ メッセージカウントを修正:', {
                            oldCount: currentCount,
                            newCount: historyUserMessages
                        });
                        ChatData.setGuestMessageCount(character, historyUserMessages);
                    }
                }
            } else {
                const firstTimeMessage = ChatData.generateFirstTimeMessage(character, ChatData.userNickname || 'あなた');
                ChatUI.addMessage('welcome', firstTimeMessage, info.name);
            }
        }

        // イベントリスナーを設定
        ChatUI.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                window.sendMessage();
            }
        });
        
        ChatUI.messageInput.addEventListener('input', () => {
            ChatUI.updateSendButtonVisibility();
        });
        
        ChatUI.updateSendButtonVisibility();
    },

    /**
     * ゲスト履歴の移行データを取得
     * @param {string} character - キャラクターID
     * @returns {Array} ゲスト履歴
     */
    getGuestHistoryForMigration(character) {
        console.log('[getGuestHistoryForMigration] 開始:', character);
        
        // まずsessionStorageから直接取得を試みる
        const guestHistoryKeyPrefixForMigration = 'guestConversationHistory_';
        const guestHistoryKeyForMigration = guestHistoryKeyPrefixForMigration + character;
        const rawStoredHistory = sessionStorage.getItem(guestHistoryKeyForMigration);
        if (rawStoredHistory) {
            try {
                const parsedHistory = JSON.parse(rawStoredHistory);
                console.log('[getGuestHistoryForMigration] sessionStorageから取得:', {
                    historyLength: parsedHistory.length,
                    userMessages: parsedHistory.filter(msg => msg && msg.role === 'user').length
                });
                if (parsedHistory.length > 0) {
                    return parsedHistory;
                }
            } catch (error) {
                console.error('[getGuestHistoryForMigration] sessionStorage解析エラー:', error);
            }
        }
        
        const pendingMigration = sessionStorage.getItem('pendingGuestHistoryMigration');
        console.log('[getGuestHistoryForMigration] pendingMigrationチェック:', {
            exists: !!pendingMigration
        });
        
        if (pendingMigration) {
            try {
                const migrationData = JSON.parse(pendingMigration);
                console.log('[getGuestHistoryForMigration] pendingMigrationデータ:', {
                    character: migrationData.character,
                    historyLength: migrationData.history ? migrationData.history.length : 0
                });
                if (migrationData.character === character && migrationData.history) {
                    console.log('[getGuestHistoryForMigration] pendingMigrationから返却');
                    return migrationData.history;
                }
            } catch (error) {
                console.error('[getGuestHistoryForMigration] pendingMigration解析エラー:', error);
            }
        }
        
        if (window.AuthState && typeof window.AuthState.getGuestHistory === 'function') {
            console.log('[getGuestHistoryForMigration] AuthState.getGuestHistoryを呼び出し');
            const history = AuthState.getGuestHistory(character) || [];
            console.log('[getGuestHistoryForMigration] AuthState.getGuestHistory結果:', {
                historyLength: history.length,
                userMessages: history.filter(msg => msg && msg.role === 'user').length
            });
            if (history.length > 0) {
                sessionStorage.setItem('pendingGuestHistoryMigration', JSON.stringify({
                    character: character,
                    history: history
                }));
                console.log('[getGuestHistoryForMigration] pendingGuestHistoryMigrationに保存');
            }
            return history;
        }
        
        console.log('[getGuestHistoryForMigration] 空配列を返却');
        return [];
    },

    /**
     * メッセージを送信
     * @param {boolean} skipUserMessage - ユーザーメッセージをスキップするか
     * @param {boolean} skipAnimation - アニメーションをスキップするか
     */
    async sendMessage(skipUserMessage = false, skipAnimation = false) {
        const message = ChatUI.messageInput.value.trim();
        const character = ChatData.currentCharacter;

        if (!message) {
            return;
        }
        
        // 守護神の儀式開始ボタンが表示されている場合は、メッセージ送信をブロック
        if (ChatUI.isRitualStartButtonVisible()) {
            ChatUI.showRitualStartPrompt();
            return;
        }

        const isGuest = !AuthState.isRegistered();
        
        // メッセージ送信ボタンを押した時点で、即座にカウントを開始
        if (isGuest) {
            // メッセージ送信前：現在のカウントを取得して制限をチェック
            const currentCount = ChatData.getGuestMessageCount(character);
            
            if (currentCount >= ChatData.GUEST_MESSAGE_LIMIT) {
                ChatUI.addMessage('error', 'これ以上鑑定を続けるには正式な登録が必要です。登録ボタンから手続きをお願いします。', 'システム');
                
                // 【重要】登録画面に遷移する前に、ゲスト会話履歴を保存
                const guestHistory = ChatData.getGuestHistory(character) || [];
                console.log('[メッセージ制限] ゲスト履歴を保存:', {
                    character: character,
                    historyLength: guestHistory.length,
                    userMessages: guestHistory.filter(msg => msg && msg.role === 'user').length
                });
                
                if (guestHistory.length > 0) {
                    sessionStorage.setItem('pendingGuestHistoryMigration', JSON.stringify({
                        character: character,
                        history: guestHistory
                    }));
                    console.log('[メッセージ制限] pendingGuestHistoryMigrationに保存完了');
                }
                
                setTimeout(() => {
                    window.location.href = '../auth/register.html?redirect=' + encodeURIComponent(window.location.href);
                }, 2000);
                return;
            }
            
            // 送信ボタンを押した時点で、会話履歴にメッセージを追加してカウントを更新
            // これにより、メッセージ数が確実に1からスタートし、以降は自動的に増える
            ChatData.addToGuestHistory(character, 'user', message);
            
            // 会話履歴が正しく保存されたことを確認
            const savedHistory = ChatData.getGuestHistory(character);
            console.log('[メッセージ送信] 会話履歴に追加後の確認:', {
                character,
                historyLength: savedHistory.length,
                userMessages: savedHistory.filter(msg => msg && msg.role === 'user').length,
                lastMessage: savedHistory.length > 0 ? savedHistory[savedHistory.length - 1] : null
            });
            
            // 会話履歴に追加した後、最新のカウントを取得（これが送信時のカウント）
            const messageCount = ChatData.getGuestMessageCount(character);
            
            const isFirstMessage = currentCount === 0;
            if (isFirstMessage) {
                console.log('[メッセージ送信] 🎯 最初のメッセージを送信しました（カウント=1からスタート）:', {
                    character,
                    message: message.substring(0, 50) + '...',
                    messageCount: messageCount,
                    historyLength: savedHistory.length
                });
            } else {
                console.log('[メッセージ送信] メッセージを送信しました:', {
                    character,
                    message: message.substring(0, 50) + '...',
                    beforeCount: currentCount,
                    afterCount: messageCount,
                    historyLength: savedHistory.length
                });
            }
            
            // reading-animation.htmlでAPIリクエスト時にメッセージカウントを送信できるように、sessionStorageに保存
            // この時点で、会話履歴にメッセージが追加されていることを確認済み
            sessionStorage.setItem('lastGuestMessageCount', String(messageCount));
            console.log('[メッセージ送信] sessionStorageにメッセージカウントを保存:', {
                key: 'lastGuestMessageCount',
                value: messageCount,
                historyKey: `guestConversationHistory_${character}`,
                historyExists: !!sessionStorage.getItem(`guestConversationHistory_${character}`)
            });
            
                    // メッセージ送信直後に親ウィンドウに通知（分析パネル更新用）
                    if (window.parent && window.parent !== window) {
                        try {
                            window.parent.postMessage({
                                type: 'CHAT_MESSAGE_SENT',
                                character: character,
                                userType: 'guest',
                                messageCount: messageCount,
                                timestamp: Date.now()
                            }, '*');
                            console.log('[iframe] メッセージ送信を親ウィンドウに通知しました（送信時）', {
                                character,
                                messageCount
                            });
                        } catch (error) {
                            console.error('[iframe] メッセージ送信通知エラー:', error);
                        }
                    }
                    
                    // 管理者モードの分析パネルを更新（自分自身のウィンドウ）
                    if (typeof window.updateAdminAnalysisPanel === 'function') {
                        setTimeout(() => {
                            window.updateAdminAnalysisPanel();
                        }, 300);
                    } else {
                        // カスタムイベントを発火
                        document.dispatchEvent(new CustomEvent('adminPanelUpdate'));
                    }
            
            ChatUI.updateUserStatus(false);
        }

        if (!skipUserMessage) {
            ChatUI.addMessage('user', message, 'あなた');
            await this.delay(100);
            ChatUI.scrollToLatest();
        }

        ChatUI.messageInput.value = '';
        ChatUI.updateSendButtonVisibility();
        
        if (ChatUI.sendButton) ChatUI.sendButton.disabled = true;
        
        const messageToSend = message;
        
        if (skipAnimation) {
            const currentUrl = window.location.href;
            const waitingUrl = `tarot-waiting.html?character=${character}&return=${encodeURIComponent(currentUrl)}&message=${encodeURIComponent(messageToSend)}`;
            
            document.body.style.transition = 'opacity 0.5s ease';
            document.body.style.opacity = '0';
            
            await this.delay(500);
            window.location.href = waitingUrl;
            return;
        }
        
        if (!skipUserMessage) {
            // メッセージカウントを取得（既にゲストユーザーの場合は上で取得済み）
            let messageCount = 0;
            if (isGuest) {
                messageCount = ChatData.getGuestMessageCount(character);
            } else {
                // 登録ユーザーの場合：会話履歴からユーザーメッセージ数を計算
                const conversationHistory = ChatData.conversationHistory?.recentMessages || [];
                messageCount = conversationHistory.filter(msg => msg && msg.role === 'user').length + 1; // 現在送信中のメッセージを含める
            }
            
            const userMessageData = {
                message: messageToSend,
                character: character,
                timestamp: new Date().toISOString(),
                messageCount: messageCount // メッセージカウントも含める
            };
            sessionStorage.setItem('lastUserMessage', JSON.stringify(userMessageData));
        }
        
        // reading-animation.htmlへの遷移をスキップし、チャット画面で直接APIリクエストを送信
        // 待機メッセージを表示
        const waitingMessageId = ChatUI.addMessage('loading', '返信が来るまで少しお待ちください...', 'システム');
        
        try {
            // 会話履歴を取得（メッセージ送信前に追加されたメッセージを含む）
            let conversationHistory = [];
            if (isGuest) {
                conversationHistory = ChatData.getGuestHistory(character) || [];
            } else {
                conversationHistory = ChatData.conversationHistory?.recentMessages || [];
                
                // 守護神の儀式完了後、会話履歴に守護神確認メッセージが含まれているか確認
                // 含まれていない場合は追加（APIが儀式完了を認識できるように）
                const ritualCompleted = sessionStorage.getItem('ritualCompleted');
                if (ritualCompleted === 'true') {
                    const hasGuardianMessage = conversationHistory.some(msg => 
                        msg.role === 'assistant' && msg.content && msg.content.includes('の守護神は')
                    );
                    
                    if (!hasGuardianMessage) {
                        const assignedDeity = localStorage.getItem('assignedDeity');
                        const userNickname = localStorage.getItem('userNickname') || 'あなた';
                        
                        if (assignedDeity) {
                            // 守護神名（データベースに日本語で保存されているのでそのまま使用）
                            const guardianName = assignedDeity;
                            const guardianConfirmationMessage = `${userNickname}の守護神は${guardianName}です\nこれからは、私と守護神である${guardianName}が鑑定を進めていきます。\n${userNickname}が鑑定してほしいこと、再度、伝えていただけませんでしょうか。`;
                            
                            conversationHistory.push({
                                role: 'assistant',
                                content: guardianConfirmationMessage
                            });
                            
                            // ChatData.conversationHistoryも更新
                            if (ChatData.conversationHistory) {
                                if (!ChatData.conversationHistory.recentMessages) {
                                    ChatData.conversationHistory.recentMessages = [];
                                }
                                ChatData.conversationHistory.recentMessages.push({
                                    role: 'assistant',
                                    content: guardianConfirmationMessage
                                });
                            }
                            
                            console.log('[メッセージ送信] 守護神確認メッセージを会話履歴に追加しました（API送信前）');
                        }
                    }
                }
            }
            
            // メッセージカウントを取得
            // API側では guestMetadata.messageCount を「これまでのメッセージ数（今回送信するメッセージを含まない）」として扱い、
            // 内部で +1 して計算するため、ここでは「これまでのメッセージ数」を送信する必要がある
            let messageCountForAPI = 0;
            if (isGuest) {
                // ゲストユーザーの場合、会話履歴には既に今回送信するメッセージが含まれているため、
                // 会話履歴からユーザーメッセージ数を取得して -1 する（今回送信するメッセージを除く）
                const currentCount = ChatData.getGuestMessageCount(character);
                // 会話履歴には既に今回送信するメッセージが含まれているため、-1 して「これまでのメッセージ数」を計算
                messageCountForAPI = Math.max(0, currentCount - 1);
            } else {
                // 登録ユーザーの場合、会話履歴から計算（今回送信するメッセージは含まれていない）
                messageCountForAPI = conversationHistory.filter(msg => msg && msg.role === 'user').length;
            }
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:695',message:'APIリクエスト前のメッセージカウント確認',data:{character:character,isGuest:isGuest,messageCountForAPI:messageCountForAPI,historyLength:conversationHistory.length,userMessagesInHistory:conversationHistory.filter(msg => msg && msg.role === 'user').length,expectedPhaseAfterAPI:messageCountForAPI + 1 === 1 ? 'フェーズ1' : messageCountForAPI + 1 === 2 ? 'フェーズ2' : messageCountForAPI + 1 === 3 ? 'フェーズ3' : 'フェーズ4'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            
            // APIリクエストのオプション
            // guestMetadata.messageCount は「これまでのメッセージ数（今回送信するメッセージを含まない）」
            const options = {
                guestMetadata: isGuest ? { messageCount: messageCountForAPI } : undefined
            };
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:702',message:'APIリクエスト送信',data:{character:character,message:messageToSend.substring(0,50)+'...',guestMetadata:options.guestMetadata,historyLength:conversationHistory.length,expectedPhaseAfterAPI:messageCountForAPI + 1 === 1 ? 'フェーズ1' : messageCountForAPI + 1 === 2 ? 'フェーズ2' : messageCountForAPI + 1 === 3 ? 'フェーズ3' : 'フェーズ4'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            
            // APIリクエストを送信
            const response = await ChatAPI.sendMessage(messageToSend, character, conversationHistory, options);
            
            // 待機メッセージを削除
            if (waitingMessageId) {
                const waitingElement = document.getElementById(waitingMessageId);
                if (waitingElement) {
                    waitingElement.remove();
                }
            }
            
            // 応答を処理
            if (response.error) {
                ChatUI.addMessage('error', `エラーが発生しました: ${response.error}`, 'システム');
                if (ChatUI.sendButton) ChatUI.sendButton.disabled = false;
                return;
            }
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:717',message:'API応答受信',data:{character:character,messageCountForAPI:messageCountForAPI,expectedPhaseAfterAPI:messageCountForAPI + 1 === 1 ? 'フェーズ1' : messageCountForAPI + 1 === 2 ? 'フェーズ2' : messageCountForAPI + 1 === 3 ? 'フェーズ3' : 'フェーズ4',responseLength:response.message ? response.message.length : 0,responsePreview:response.message ? response.message.substring(0,100)+'...' : 'なし',hasThreeChoices:response.message ? /(家族|理想|経済|穏やか|笑い合う|相手|余裕)/.test(response.message) : false,registrationSuggested:response.registrationSuggested},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            
            // 応答メッセージを表示
            const characterName = ChatData.characterInfo[character]?.name || character;
            const responseText = response.message || response.response || '応答を取得できませんでした';
            const messageId = ChatUI.addMessage('character', responseText, characterName);
            ChatUI.scrollToLatest();
            
            // 会話履歴を更新
            if (isGuest) {
                ChatData.addToGuestHistory(character, 'assistant', responseText);
                
                // 守護神の儀式に関するメッセージの場合、ボタンを追加
                // 「ニックネームと生年月日を入力」という言葉が実際にメッセージに含まれている場合のみボタンを表示
                // 太字マークダウン（**）が含まれている可能性があるため、両方をチェック
                // または「それでは守護神の儀式を始めます」というメッセージの後にボタンを追加
                const hasRegistrationInput = responseText.includes('ニックネームと生年月日を入力') || 
                                             responseText.includes('**ニックネームと生年月日を入力**');
                if (hasRegistrationInput || responseText.includes('それでは守護神の儀式を始めます')) {
                    console.log('[API応答] 守護神の儀式に関するメッセージを検出。ボタンを追加します。', {
                        hasRegistrationInput: responseText.includes('ニックネームと生年月日を入力'),
                        hasRitualStart: responseText.includes('それでは守護神の儀式を始めます'),
                        messagePreview: responseText.substring(0, 100) + '...'
                    });
                    // メッセージ表示後に少し待ってからボタンを追加（メッセージが完全に表示された後）
                    setTimeout(() => {
                        const messageElement = messageId ? document.getElementById(messageId) : null;
                        if (messageElement && typeof ChatUI.addRitualStartButton === 'function') {
                            ChatUI.addRitualStartButton(messageElement, async () => {
                                console.log('[守護神の儀式] ボタンがクリックされました');
                                
                                // 【重要】守護神の鑑定を受け入れたフラグを保存
                                // ゲストユーザーが登録画面にリダイレクトされる場合に使用
                                sessionStorage.setItem('acceptedGuardianRitual', 'true');
                                console.log('[守護神の儀式] acceptedGuardianRitualフラグを保存しました');
                                
                                const ChatInitInstance = window.ChatInit || this;
                                if (ChatInitInstance && typeof ChatInitInstance.startGuardianRitual === 'function') {
                                    await ChatInitInstance.startGuardianRitual(character);
                                }
                            });
                        }
                    }, 1000); // メッセージが完全に表示されるまで1秒待つ
                }
                
                // ゲストユーザーの場合、registrationSuggestedをチェック
                console.log('[API応答] registrationSuggestedチェック:', {
                    registrationSuggested: response.registrationSuggested,
                    ritualConsentShown: ChatData.ritualConsentShown,
                    character: character,
                    responseKeys: Object.keys(response)
                });
                
                if (response.registrationSuggested && !ChatData.ritualConsentShown) {
                    console.log('[API応答] registrationSuggestedがtrueです。登録ボタンを表示します。');
                    const characterNameForButton = ChatData.characterInfo[character]?.name || '鑑定士';
                    ChatUI.addMessage('error', `${characterNameForButton === '楓' ? '守護神の儀式' : 'ユーザー登録'}への同意が検出されました。ボタンが表示されます。`, 'システム');
                    
                    // 【重要】守護神の鑑定を受け入れたフラグを保存
                    // 登録後に守護神の儀式を自動開始するかどうかの判定に使用
                    sessionStorage.setItem('acceptedGuardianRitual', 'true');
                    console.log('[API応答] acceptedGuardianRitualフラグを保存しました');
                    
                    setTimeout(() => {
                        ChatUI.showRitualConsentButtons();
                    }, 2000);
                } else {
                    console.log('[API応答] 登録ボタンを表示しません:', {
                        registrationSuggested: response.registrationSuggested,
                        ritualConsentShown: ChatData.ritualConsentShown
                    });
                }
            } else {
                // 登録ユーザーの場合、会話履歴はAPIから取得されるため、ここでは更新しない
                // 必要に応じて、会話履歴を再読み込み
            }
            
            // 送信ボタンを再有効化
            if (ChatUI.sendButton) ChatUI.sendButton.disabled = false;
            
            // 管理者モードの分析パネルを更新
            if (typeof window.updateAdminAnalysisPanel === 'function') {
                setTimeout(() => {
                    window.updateAdminAnalysisPanel();
                }, 300);
            } else {
                document.dispatchEvent(new CustomEvent('adminPanelUpdate'));
            }
            
        } catch (error) {
            console.error('メッセージ送信エラー:', error);
            
            // 待機メッセージを削除
            if (waitingMessageId) {
                const waitingElement = document.getElementById(waitingMessageId);
                if (waitingElement) {
                    waitingElement.remove();
                }
            }
            
            ChatUI.addMessage('error', `エラーが発生しました: ${error.message || 'メッセージの送信に失敗しました'}`, 'システム');
            if (ChatUI.sendButton) ChatUI.sendButton.disabled = false;
        }
    },

    /**
     * アニメーション画面から戻ってきた時の処理
     */
    handleReturnFromAnimation() {
        const lastUserMessage = sessionStorage.getItem('lastUserMessage');
        const consultResponse = sessionStorage.getItem('lastConsultResponse');
        const consultError = sessionStorage.getItem('lastConsultError');

        if (consultError) {
            ChatUI.addMessage('error', `エラーが発生しました: ${consultError}`, 'システム');
            sessionStorage.removeItem('lastConsultError');
            if (ChatUI.sendButton) ChatUI.sendButton.disabled = false;
            return;
        }

        if (lastUserMessage) {
            try {
                const userMsgData = JSON.parse(lastUserMessage);
                const messageToCheck = userMsgData.message.trim();
                
                if (messageToCheck.includes('以下のタロットカードについて') || 
                    messageToCheck.includes('このカードの意味、私の状況にどのように関連しているか')) {
                    sessionStorage.removeItem('lastUserMessage');
                    return;
                }
                
                const existingUserMessages = ChatUI.messagesDiv.querySelectorAll('.message.user');
                const messageTexts = Array.from(existingUserMessages).map(msg => {
                    const textDiv = msg.querySelector('div:last-child');
                    return textDiv ? textDiv.textContent.trim() : '';
                });
                
                const messageExists = messageTexts.some(text => text.trim() === messageToCheck);
                
                if (!messageExists) {
                    ChatUI.addMessage('user', userMsgData.message, 'あなた');
                    if (ChatUI.messageInput) ChatUI.messageInput.blur();
                    setTimeout(() => ChatUI.scrollToLatest(), 200);
                }
                
                sessionStorage.removeItem('lastUserMessage');
            } catch (error) {
                console.error('Error parsing user message:', error);
            }
        }

        if (consultResponse) {
            try {
                const data = JSON.parse(consultResponse);
                
                if (data.needsRegistration || (data.error && (data.error.includes('user not found') || data.error.includes('invalid user token')))) {
                    const isGuest = !AuthState.isRegistered();
                    if (isGuest) {
                        if (data.message) {
                            ChatUI.addMessage('error', data.message, 'システム');
                        }
                        if (data.needsRegistration) {
                            ChatUI.addMessage('error', '登録が必要です。守護神の儀式への同意ボタンが表示されます。', 'システム');
                            setTimeout(() => {
                                ChatUI.showRitualConsentButtons();
                            }, 3000);
                        } else if (data.registrationSuggested) {
                            // 既にボタンが表示されている場合は表示しない
                            if (!ChatData.ritualConsentShown) {
                                const characterName = ChatData.characterInfo[ChatData.currentCharacter]?.name || '鑑定士';
                                ChatUI.addMessage('error', `${characterName === '楓' ? '守護神の儀式' : 'ユーザー登録'}への同意が検出されました。ボタンが表示されます。`, 'システム');
                                setTimeout(() => {
                                    ChatUI.showRitualConsentButtons();
                                }, 2000);
                            }
                        } else {
                            setTimeout(() => {
                                this.openRegistrationModal();
                            }, 2000);
                        }
                    } else {
                        if (window.AuthState && typeof window.AuthState.clearAuth === 'function') {
                            AuthState.clearAuth();
                        } else {
                            localStorage.removeItem('userToken');
                            localStorage.removeItem('userNickname');
                            localStorage.removeItem('assignedDeity');
                        }
                        window.location.href = '../auth/login.html?redirect=' + encodeURIComponent(window.location.href);
                    }
                    if (ChatUI.sendButton) ChatUI.sendButton.disabled = false;
                    return;
                }
                
                if (data.error) {
                    ChatUI.addMessage('error', data.error, 'システム');
                } else if (data.isInappropriate) {
                    ChatUI.addMessage('warning', data.message, data.characterName);
                } else if (data.message) {
                    ChatUI.addMessage('character', data.message, data.characterName);
                    
                    // 親ウィンドウにメッセージ送信完了を通知（分析パネル更新用）
                    if (window.parent && window.parent !== window) {
                        try {
                            const character = ChatData?.currentCharacter || 'unknown';
                            const isRegistered = window.AuthState?.isRegistered() || false;
                            const messageCount = ChatData?.getGuestMessageCount(character) || 0;
                            
                            console.log('[応答受信] 親ウィンドウに通知:', {
                                character,
                                userType: isRegistered ? 'registered' : 'guest',
                                messageCount
                            });
                            
                            window.parent.postMessage({
                                type: 'CHAT_MESSAGE_SENT',
                                character: character,
                                userType: isRegistered ? 'registered' : 'guest',
                                messageCount: messageCount,
                                timestamp: Date.now()
                            }, '*');
                            console.log('[iframe] メッセージ送信完了を親ウィンドウに通知しました（応答受信後）', {
                                character,
                                messageCount
                            });
                        } catch (error) {
                            console.error('[iframe] メッセージ送信通知エラー:', error);
                        }
                    }
                    
                    const isGuest = !AuthState.isRegistered();
                    if (isGuest) {
                        ChatData.addToGuestHistory(ChatData.currentCharacter, 'assistant', data.message);
                        
                        // アニメーション画面から戻ってきた時、会話履歴からメッセージ数を再計算して保存
                        const history = ChatData.getGuestHistory(ChatData.currentCharacter);
                        if (history && Array.isArray(history)) {
                            const historyUserMessages = history.filter(msg => msg && msg.role === 'user').length;
                            const currentCount = ChatData.getGuestMessageCount(ChatData.currentCharacter);
                            
                            console.log('[応答受信] メッセージカウントを再確認:', {
                                character: ChatData.currentCharacter,
                                currentCount: currentCount,
                                historyUserMessages: historyUserMessages,
                                historyLength: history.length
                            });
                            
                            // 会話履歴から計算した値の方が大きい、または現在のカウントが0の場合は更新
                            if (historyUserMessages > currentCount || currentCount === 0) {
                                console.log('[応答受信] ⚠️ メッセージカウントを修正:', {
                                    oldCount: currentCount,
                                    newCount: historyUserMessages
                                });
                                ChatData.setGuestMessageCount(ChatData.currentCharacter, historyUserMessages);
                            }
                        }
                        
                        const guestCount = ChatData.getGuestMessageCount(ChatData.currentCharacter);
                        console.log('[応答受信] 最終的なゲストカウント:', guestCount);
                        ChatUI.updateUserStatus(false);
                        
                        if (guestCount >= ChatData.GUEST_MESSAGE_LIMIT) {
                            ChatUI.addMessage('error', 'これ以上鑑定を続けるには正式な登録が必要です。登録ボタンから手続きをお願いします。', 'システム');
                            setTimeout(() => {
                                this.openRegistrationModal();
                            }, 2000);
                        }
                        else if (data.needsRegistration) {
                            // 既にボタンが表示されている場合は表示しない
                            if (!ChatData.ritualConsentShown) {
                                ChatUI.addMessage('error', '登録が必要です。守護神の儀式への同意ボタンが表示されます。', 'システム');
                                setTimeout(() => {
                                    ChatUI.showRitualConsentButtons();
                                }, 3000);
                            }
                        } else if (data.registrationSuggested) {
                            // 既にボタンが表示されている場合は表示しない
                            if (!ChatData.ritualConsentShown) {
                                const characterName = ChatData.characterInfo[ChatData.currentCharacter]?.name || '鑑定士';
                                ChatUI.addMessage('error', `${characterName === '楓' ? '守護神の儀式' : 'ユーザー登録'}への同意が検出されました。ボタンが表示されます。`, 'システム');
                                setTimeout(() => {
                                    ChatUI.showRitualConsentButtons();
                                }, 2000);
                            }
                        }
                    }
                    
                    if (ChatUI.messageInput) ChatUI.messageInput.blur();
                    setTimeout(() => ChatUI.scrollToLatest(), 100);
                } else {
                    ChatUI.addMessage('error', '返信が取得できませんでした', 'システム');
                }
                
                const pendingMigration = sessionStorage.getItem('pendingGuestHistoryMigration');
                if (pendingMigration) {
                    try {
                        const migrationData = JSON.parse(pendingMigration);
                        if (migrationData.character === ChatData.currentCharacter) {
                            if (window.AuthState && typeof window.AuthState.clearGuestHistory === 'function') {
                                AuthState.clearGuestHistory(migrationData.character);
                            }
                            sessionStorage.removeItem('pendingGuestHistoryMigration');
                        }
                    } catch (error) {
                        console.error('Error clearing guest history:', error);
                    }
                }
                
                sessionStorage.removeItem('lastConsultResponse');
            } catch (error) {
                console.error('Error parsing consult response:', error);
            }
        }
        
        if (ChatUI.sendButton) ChatUI.sendButton.disabled = false;
        if (ChatUI.messageInput) ChatUI.messageInput.blur();
        
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    },

    /**
     * 守護神の儀式への同意処理
     * @param {boolean} consent - 同意するかどうか
     */
    handleRitualConsent(consent) {
        ChatUI.hideRitualConsentButtons();
        
        // フラグをリセット（一度処理したので、再度表示されないようにする）
        ChatData.ritualConsentShown = true;
        
        if (consent) {
            // 「はい」を押した場合
            const characterName = ChatData.characterInfo[ChatData.currentCharacter]?.name || '鑑定士';
            ChatUI.addMessage('character', 'ユーザー登録をすることにより、守護神の儀式を進めます', characterName);
            
            // メッセージを表示した後、少し待ってから登録画面に遷移
            setTimeout(() => {
                this.openRegistrationModal();
            }, 2000);
        } else {
            // 「いいえ」を押した場合
            ChatUI.addMessage('error', '守護神の儀式をスキップしました。ゲストモードで会話を続けます。', 'システム');
        }
    },

    /**
     * 登録モーダルを開く
     */
    openRegistrationModal() {
        // 【重要】登録画面に遷移する前に、ゲスト会話履歴を保存
        const character = ChatData.currentCharacter;
        if (character) {
            const guestHistory = ChatData.getGuestHistory(character) || [];
            console.log('[登録画面遷移] ゲスト履歴を保存:', {
                character: character,
                historyLength: guestHistory.length,
                userMessages: guestHistory.filter(msg => msg && msg.role === 'user').length
            });
            
            if (guestHistory.length > 0) {
                // pendingGuestHistoryMigrationに保存（登録完了後に取得するため）
                sessionStorage.setItem('pendingGuestHistoryMigration', JSON.stringify({
                    character: character,
                    history: guestHistory
                }));
                console.log('[登録画面遷移] pendingGuestHistoryMigrationに保存完了');
            }
        }
        
        window.location.href = '../auth/register.html?redirect=' + encodeURIComponent(window.location.href);
    },

    /**
     * 守護神の儀式を開始
     * @param {string} character - キャラクターID
     * @param {Array} guestHistory - ゲスト会話履歴（オプション、登録直後の場合に使用）
     */
    async startGuardianRitual(character, guestHistory = null) {
        console.log('[守護神の儀式] 開始:', character, 'guestHistory:', guestHistory ? guestHistory.length : 0);
        
        // 【重要】ゲストユーザーの場合は登録画面にリダイレクト
        if (!AuthState.isRegistered()) {
            console.log('[守護神の儀式] ゲストユーザーを登録画面にリダイレクトします');
            
            // ゲスト会話履歴を保存
            if (!guestHistory || guestHistory.length === 0) {
                guestHistory = ChatData.getGuestHistory(character) || [];
            }
            
            if (guestHistory.length > 0) {
                sessionStorage.setItem('pendingGuestHistoryMigration', JSON.stringify({
                    character: character,
                    history: guestHistory
                }));
                console.log('[守護神の儀式] ゲスト履歴を保存:', {
                    historyLength: guestHistory.length,
                    userMessages: guestHistory.filter(msg => msg && msg.role === 'user').length
                });
            }
            
            // acceptedGuardianRitualフラグは既に保存されている（ボタンクリック時に保存済み）
            
            // 登録画面にリダイレクト
            this.openRegistrationModal();
            return;
        }
        
        // 【登録ユーザーの場合のみ、以下の処理を実行】
        console.log('[守護神の儀式] 登録ユーザーとして儀式を開始します');
        
        // 送信ボタンを無効化
        if (ChatUI.sendButton) ChatUI.sendButton.disabled = true;
        
        try {
            // 会話履歴を取得（登録直後は空のはず）
            const historyData = await ChatAPI.loadConversationHistory(character);
            console.log('[守護神の儀式] 会話履歴データ:', historyData);
            
            // 会話履歴の決定（優先順位順）
            let conversationHistory = [];
            
            // 1. 登録ユーザーの会話履歴がある場合はそれを使用
            if (historyData && historyData.hasHistory && historyData.recentMessages && historyData.recentMessages.length > 0) {
                conversationHistory = [...historyData.recentMessages];
                console.log('[守護神の儀式] 登録ユーザーの会話履歴を使用:', conversationHistory.length);
                
                // ChatData.conversationHistoryを更新
                ChatData.conversationHistory = historyData;
            } 
            // 2. ゲスト会話履歴が渡されている場合はそれを使用（登録直後の場合）
            else if (guestHistory && guestHistory.length > 0) {
                conversationHistory = guestHistory.map(entry => ({
                    role: entry.role || 'user',
                    content: entry.content || entry.message || ''
                }));
                console.log('[守護神の儀式] ゲスト会話履歴を使用:', conversationHistory.length, {
                    userMessages: conversationHistory.filter(msg => msg.role === 'user').length,
                    assistantMessages: conversationHistory.filter(msg => msg.role === 'assistant').length
                });
            } 
            // 3. どちらもない場合は空配列
            else {
                conversationHistory = [];
                console.log('[守護神の儀式] 会話履歴が空です（新規会話）');
            }
            
            console.log('[守護神の儀式] 使用する会話履歴:', conversationHistory);
            
            // 【重要】ユーザー登録後は、守護神の儀式開始前にカエデのメッセージを表示
            // これにより、儀式完了後にユーザーの履歴が残らない（カエデが最後のメッセージになる）
            const characterName = ChatData.characterInfo[character]?.name || '楓';
            const ritualStartMessage = 'それではこれより守護神のイベントを開始いたします。\n画面が切り替わりますので、儀式を体験してください。';
            
            console.log('[守護神の儀式] 儀式開始前のメッセージを表示:', ritualStartMessage);
            ChatUI.addMessage('character', ritualStartMessage, characterName);
            
            // 会話履歴に追加（ただし、データベースには保存しない）
            conversationHistory.push({ role: 'assistant', content: ritualStartMessage });
            
            // 会話履歴を保存（登録ユーザーの場合）
            // 注：このメッセージはデータベースに保存しない（儀式開始前のメッセージのため）
            // ただし、ChatDataには追加しておく（次の処理で使用する可能性があるため）
            if (AuthState.isRegistered() && ChatData.conversationHistory) {
                // このメッセージはデータベースには保存しない（一時的なメッセージ）
                // ChatData.conversationHistory.recentMessages = conversationHistory;
                console.log('[守護神の儀式] 儀式開始メッセージはデータベースに保存しません（一時メッセージ）');
            }
            
            ChatUI.scrollToLatest();
            
            // メッセージ表示後、少し待ってからguardian-ritual.htmlに遷移
            await this.delay(2000); // 2秒待つ（ユーザーがメッセージを読む時間を確保）
            
            // guardian-ritual.htmlに遷移
            // 現在のチャット画面のURLを保存（儀式完了後に戻るため）
            const currentChatUrl = window.location.href;
            sessionStorage.setItem('postRitualChatUrl', currentChatUrl);
            
            console.log('[守護神の儀式] guardian-ritual.htmlに遷移:', currentChatUrl);
            window.location.href = '../guardian-ritual.html';
            return; // 遷移するため、以降の処理は実行されない
            
        } catch (error) {
            console.error('[守護神の儀式] 例外エラー:', error);
            ChatUI.addMessage('error', '守護神の儀式の開始に失敗しました: ' + error.message, 'システム');
        } finally {
            // 送信ボタンを再有効化（遷移する場合は実行されないが、エラー時は必要）
            if (ChatUI.sendButton) ChatUI.sendButton.disabled = false;
            if (ChatUI.messageInput) ChatUI.messageInput.focus();
        }
    },

    /**
     * 遅延処理
     * @param {number} ms - ミリ秒
     * @returns {Promise} Promise
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * メッセージ要素に守護神の儀式開始ボタンを追加（再表示用）
     * @param {HTMLElement} messageElement - メッセージ要素
     */
    addRitualStartButtonToMessage(messageElement) {
        if (!messageElement) return;
        
        const character = ChatData.currentCharacter;
        
        // ボタンを追加
        ChatUI.addRitualStartButton(messageElement, async () => {
            console.log('[守護神の儀式] ボタンがクリックされました（再表示）');
            
            // 【重要】守護神の鑑定を受け入れたフラグを保存
            // ゲストユーザーが登録画面にリダイレクトされる場合に使用
            sessionStorage.setItem('acceptedGuardianRitual', 'true');
            console.log('[守護神の儀式] acceptedGuardianRitualフラグを保存しました（再表示）');
            
            // 保存されたゲスト履歴を取得
            const pendingRitualHistory = sessionStorage.getItem('pendingRitualGuestHistory');
            let ritualGuestHistory = [];
            
            if (pendingRitualHistory) {
                try {
                    const ritualData = JSON.parse(pendingRitualHistory);
                    if (ritualData.character === character && ritualData.history) {
                        ritualGuestHistory = ritualData.history;
                        console.log('[守護神の儀式] 保存されたゲスト履歴を取得（再表示）:', {
                            historyLength: ritualGuestHistory.length,
                            userMessages: ritualGuestHistory.filter(msg => msg && msg.role === 'user').length
                        });
                    }
                } catch (error) {
                    console.error('[守護神の儀式] ゲスト履歴の取得エラー（再表示）:', error);
                }
            }
            
            // ゲスト履歴が取得できない場合は、再度取得を試みる
            if (ritualGuestHistory.length === 0) {
                console.log('[守護神の儀式] ゲスト履歴を再取得（再表示）');
                ritualGuestHistory = this.getGuestHistoryForMigration(character);
                if (ritualGuestHistory.length === 0) {
                    ritualGuestHistory = ChatData.getGuestHistory(character) || [];
                }
            }
            
            console.log('[守護神の儀式] 使用するゲスト履歴（再表示）:', {
                historyLength: ritualGuestHistory.length,
                userMessages: ritualGuestHistory.filter(msg => msg && msg.role === 'user').length
            });
            
            // ボタンを非表示
            const button = messageElement.querySelector('.ritual-start-button');
            if (button) {
                button.style.display = 'none';
            }
            
            // 守護神の儀式を開始
            await this.startGuardianRitual(character, ritualGuestHistory);
            
            // 守護神の儀式開始後、ゲスト履歴とフラグをクリア
            if (window.AuthState && typeof window.AuthState.clearGuestHistory === 'function') {
                AuthState.clearGuestHistory(character);
            }
            const GUEST_HISTORY_KEY_PREFIX = 'guestConversationHistory_';
            const historyKey = GUEST_HISTORY_KEY_PREFIX + character;
            sessionStorage.removeItem(historyKey);
            sessionStorage.removeItem('pendingGuestHistoryMigration');
            sessionStorage.removeItem('pendingRitualGuestHistory');
            sessionStorage.removeItem('acceptedGuardianRitual'); // フラグをクリア
            ChatData.setGuestMessageCount(character, 0);
        });
    }
};

// グローバルスコープに公開（iframeからアクセスできるようにする）
window.ChatInit = ChatInit;

// グローバル関数として公開
window.sendMessage = () => ChatInit.sendMessage();
window.handleRitualConsent = (consent) => ChatInit.handleRitualConsent(consent);

// postMessage関連の初期化（DOMContentLoadedの外で即座に実行）
(function initPostMessageCommunication() {
    'use strict';
    
    console.log('[iframe] postMessage通信を初期化しています...', {
        documentReadyState: document.readyState,
        hasParent: window.parent && window.parent !== window,
        origin: window.location.origin
    });
    
    // 親ウィンドウに準備完了を通知する関数
    function notifyParentReady() {
        if (window.parent && window.parent !== window) {
            try {
                // URLパラメータからcharacterを取得
                const urlParams = new URLSearchParams(window.location.search);
                const character = urlParams.get('character') || 'unknown';
                
                window.parent.postMessage({
                    type: 'CHAT_IFRAME_READY',
                    character: character,
                    userType: 'guest', // 初期状態ではゲストとして扱う
                    messageCount: 0,
                    timestamp: Date.now(),
                    ready: true
                }, '*');
                
                console.log('[iframe] ✅ 親ウィンドウに準備完了を通知しました（初期通知）', {
                    character,
                    origin: window.location.origin
                });
                return true;
            } catch (error) {
                console.error('[iframe] ❌ 親ウィンドウへの通知エラー:', error);
                return false;
            }
        } else {
            // 通常のブラウジングの場合はログを出力しない
            return false;
        }
    }
    
    // 親ウィンドウが存在する場合のみ、通知を試行
    let hasNotified = false; // スコープを外に移動
    if (window.parent && window.parent !== window) {
        if (document.readyState === 'loading') {
            // まだ読み込み中の場合は、DOMContentLoaded時に通知
            document.addEventListener('DOMContentLoaded', () => {
                if (!hasNotified) {
                    hasNotified = notifyParentReady();
                }
            });
        } else {
            // 既に読み込み済みの場合は即座に通知
            hasNotified = notifyParentReady();
        }
        
        // window.load時にも通知
        if (document.readyState !== 'complete') {
            window.addEventListener('load', () => {
                if (!hasNotified) {
                    hasNotified = notifyParentReady();
                }
            });
        } else {
            if (!hasNotified) {
                hasNotified = notifyParentReady();
            }
        }
    }
    
    // REQUEST_CHAT_DATAハンドラーを即座に設定（DOMContentLoadedを待たない）
    window.addEventListener('message', (event) => {
        // セキュリティチェック
        if (event.origin !== window.location.origin) {
            return;
        }
        
        if (event.data && event.data.type === 'REQUEST_CHAT_DATA') {
            console.log('[iframe] 📨 REQUEST_CHAT_DATAを受信しました（初期ハンドラー）');
            
            // 簡単な応答を即座に返す
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const character = urlParams.get('character') || 'unknown';
                
                const responseData = {
                    type: 'CHAT_DATA_RESPONSE',
                    data: {
                        character: character,
                        userType: 'guest',
                        messageCount: 0,
                        conversationHistory: [],
                        currentState: {
                            character: character,
                            userType: 'guest',
                            messageCount: 0,
                            conversationHistoryLength: 0,
                            isRegistered: false
                        },
                        timestamp: Date.now()
                    }
                };
                
                if (event.source && event.source.postMessage) {
                    event.source.postMessage(responseData, event.origin);
                    console.log('[iframe] ✅ 初期ハンドラーでチャットデータを送信しました');
                } else if (window.parent && window.parent !== window) {
                    window.parent.postMessage(responseData, '*');
                    console.log('[iframe] ✅ 初期ハンドラーでwindow.parentに送信しました');
                }
            } catch (error) {
                console.error('[iframe] ❌ 初期ハンドラーでエラー:', error);
            }
        }
    });
    
    console.log('[iframe] postMessage通信の初期化完了', {
        hasParent: window.parent && window.parent !== window,
        documentReadyState: document.readyState
    });
})();

// DOMContentLoaded時に初期化
window.addEventListener('DOMContentLoaded', async () => {
    // URLから.htmlを除去
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const pathParts = currentPath.split('/').filter(part => part !== '');
    
    if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart.includes('.html')) {
            const correctPath = '/' + pathParts.slice(0, -1).join('/') + currentSearch;
            history.replaceState(null, '', correctPath);
        }
    }
    
    document.body.classList.add('fade-in');
    
    // UIを初期化
    ChatUI.init();
    
    // ページを初期化
    await ChatInit.initPage();
    
    // アニメーション画面から戻ってきた時の処理
    setTimeout(() => {
        ChatInit.handleReturnFromAnimation();
    }, 100);
    
    // 親ウィンドウに準備完了を通知（分析パネル用）
    function notifyParentReady() {
        if (window.parent && window.parent !== window) {
            try {
                const character = ChatData?.currentCharacter || 'unknown';
                const isRegistered = window.AuthState?.isRegistered() || false;
                const messageCount = ChatData?.getGuestMessageCount(character) || 0;
                
                window.parent.postMessage({
                    type: 'CHAT_IFRAME_READY',
                    character: character,
                    userType: isRegistered ? 'registered' : 'guest',
                    messageCount: messageCount,
                    timestamp: Date.now()
                }, '*');
                console.log('[iframe] ✅ 親ウィンドウに準備完了を通知しました', {
                    character,
                    userType: isRegistered ? 'registered' : 'guest',
                    messageCount,
                    origin: window.location.origin
                });
            } catch (error) {
                console.error('[iframe] ❌ 親ウィンドウへの通知エラー:', error);
            }
        }
        // 通常のブラウジングの場合はログを出力しない（不要な情報のため）
    }
    
    // 初期化完了後に準備完了を通知（複数のタイミングで確実に通知）
    let notifyAttempts = 0;
    const maxNotifyAttempts = 10;
    let notifyInterval = null;
    let hasNotified = false; // 既に通知済みかどうか
    let noParentLogged = false; // 親ウィンドウ不在のログを既に出力したか
    
    // 通知を送信する関数（重複を防ぐ）
    function tryNotifyParent() {
        if (hasNotified) {
            console.log('[iframe] 通知は既に送信済みです');
            return true; // 既に通知済みの場合は成功として扱う
        }
        
        // ChatDataとAuthStateが利用可能かチェック
        const hasChatData = typeof ChatData !== 'undefined' && ChatData !== null;
        const hasAuthState = typeof window.AuthState !== 'undefined' && window.AuthState !== null;
        
        console.log('[iframe] 通知を送信しようとしています...', {
            hasChatData: hasChatData,
            hasAuthState: hasAuthState,
            currentCharacter: ChatData?.currentCharacter || 'unknown',
            documentReadyState: document.readyState
        });
        
        // ChatDataとAuthStateがなくても、最小限の準備完了通知を送信
        // （親ウィンドウは準備完了を検知できれば、後でデータをリクエストできる）
        if (window.parent && window.parent !== window) {
            try {
                const character = ChatData?.currentCharacter || new URLSearchParams(window.location.search).get('character') || 'unknown';
                const isRegistered = (hasAuthState && window.AuthState?.isRegistered()) || false;
                const messageCount = (hasChatData && typeof ChatData?.getGuestMessageCount === 'function') 
                    ? (ChatData.getGuestMessageCount(character) || 0) 
                    : 0;
                
                window.parent.postMessage({
                    type: 'CHAT_IFRAME_READY',
                    character: character,
                    userType: isRegistered ? 'registered' : 'guest',
                    messageCount: messageCount,
                    timestamp: Date.now(),
                    ready: true
                }, '*');
                
                console.log('[iframe] ✅ 親ウィンドウに準備完了を通知しました（最小限の情報）', {
                    character,
                    userType: isRegistered ? 'registered' : 'guest',
                    messageCount,
                    hasChatData,
                    hasAuthState
                });
                
                hasNotified = true; // 成功したらマーク
                if (notifyInterval) {
                    clearInterval(notifyInterval);
                    notifyInterval = null;
                }
                return true;
            } catch (error) {
                console.error('[iframe] ❌ 準備完了通知の送信エラー:', error);
                return false;
            }
        } else {
            // 親ウィンドウが存在しない場合（通常のブラウジング）
            // ログは最初の1回だけ出力
            if (!noParentLogged) {
                console.log('[iframe] 親ウィンドウが存在しないため、準備完了通知をスキップしました（通常のブラウジング）');
                noParentLogged = true;
            }
            return false;
        }
    }
    
    // 親ウィンドウが存在する場合のみ、イベントリスナーを登録
    const hasParentWindow = window.parent && window.parent !== window;
    
    if (hasParentWindow) {
        // 1. DOMContentLoaded時に即座に1回通知
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                console.log('[iframe] DOMContentLoaded - 準備完了通知を送信（1秒後）');
                setTimeout(() => {
                    tryNotifyParent();
                }, 1000);
            });
        } else {
            // 既にDOMContentLoaded済みの場合は即座に実行
            console.log('[iframe] DOMContentLoaded済み - 準備完了通知を送信（1秒後）');
            setTimeout(() => {
                tryNotifyParent();
            }, 1000);
        }
        
        // 2. window.load時に1回通知（リソース読み込み完了後）
        if (document.readyState !== 'complete') {
            window.addEventListener('load', () => {
                console.log('[iframe] window.load - 準備完了通知を送信（1秒後）');
                setTimeout(() => {
                    tryNotifyParent();
                }, 1000);
            });
        } else {
            // 既にload済みの場合も試行
            console.log('[iframe] window.load済み - 準備完了通知を送信（1秒後）');
            setTimeout(() => {
                tryNotifyParent();
            }, 1000);
        }
    } else {
        console.log('[iframe] 親ウィンドウが存在しないため、イベントリスナーの登録をスキップします（通常のブラウジング）');
    }
    
    // 3. 念のため定期通知（最大10回、2秒ごと）
    // ただし、親ウィンドウが存在する場合のみ実行
    if (window.parent && window.parent !== window) {
        notifyInterval = setInterval(() => {
            notifyAttempts++;
            console.log(`[iframe] 定期通知 - 試行${notifyAttempts}/${maxNotifyAttempts}`);
            if (tryNotifyParent()) {
                // 通知成功したら停止
                console.log('[iframe] 定期通知を終了（通知成功）');
                return;
            }
            
            if (notifyAttempts >= maxNotifyAttempts) {
                clearInterval(notifyInterval);
                console.warn('[iframe] 準備完了通知の最大試行回数に達しました', {
                    attempts: notifyAttempts,
                    hasChatData: !!ChatData,
                    hasAuthState: !!window.AuthState
                });
            }
        }, 2000); // 2秒ごとに試行
    } else {
        console.log('[iframe] 親ウィンドウが存在しないため、定期通知をスキップします');
    }
    
    // デバッグ用: notifyParentReadyをグローバルに公開
    window.notifyParentReady = notifyParentReady;
    
    console.log('[iframe] postMessage通信が初期化されました', {
        hasChatData: typeof ChatData !== 'undefined',
        hasAuthState: typeof window.AuthState !== 'undefined',
        hasParent: window.parent && window.parent !== window,
        documentReadyState: document.readyState
    });
    
    // 即座に1回通知を試行（ChatData/AuthStateの初期化を待たない）
    console.log('[iframe] 即座に準備完了通知を試行（0.5秒後）...');
    setTimeout(() => {
        tryNotifyParent();
    }, 500);
    
    // 管理者用コマンドハンドラー（postMessage）
    window.addEventListener('message', async (event) => {
        // デバッグ: すべてのメッセージをログに記録
        console.log('[iframe] メッセージ受信:', {
            type: event.data?.type,
            origin: event.origin,
            expectedOrigin: window.location.origin,
            isParent: window.parent && window.parent !== window
        });
        
        // セキュリティのため、同じオリジンのみ受け入れる
        if (event.origin !== window.location.origin) {
            console.warn('[iframe] オリジン不一致:', {
                received: event.origin,
                expected: window.location.origin
            });
            return;
        }
        
        const { type, character, token, nickname, assignedDeity } = event.data || {};
        
        switch (type) {
            case 'ADMIN_RESET_CONVERSATION':
                // 会話をリセット
                if (character && ChatData) {
                    ChatData.setGuestHistory(character, []);
                    ChatData.setGuestMessageCount(character, 0);
                }
                if (window.AuthState) {
                    window.AuthState.resetGuestProgress({ keepHistory: false });
                }
                // sessionStorageもクリア
                const keys = Object.keys(sessionStorage);
                keys.forEach(key => {
                    if (key.startsWith('guest') || key.includes('guest') || key.startsWith('auth.guest')) {
                        sessionStorage.removeItem(key);
                    }
                });
                location.reload();
                break;
                
            case 'ADMIN_RESET_PHASE':
                // フェーズをリセット（メッセージカウントを0に）
                if (character && ChatData) {
                    ChatData.setGuestMessageCount(character, 0);
                }
                if (window.AuthState) {
                    window.AuthState.setGuestMessageCount(0);
                }
                sessionStorage.setItem(`guestMessageCount_${character}`, '0');
                sessionStorage.setItem('auth.guestMessageCount', '0');
                break;
                
            case 'ADMIN_TRIGGER_RITUAL':
                // 守護神の儀式を発動
                if (character && ChatInit && window.AuthState && window.AuthState.isRegistered()) {
                    await ChatInit.startGuardianRitual(character);
                }
                break;
                
            case 'ADMIN_SIMULATE_REGISTRATION':
                // テスト用ユーザー登録をシミュレート
                if (token && window.AuthState) {
                    window.AuthState.setAuth(token, nickname, assignedDeity);
                    localStorage.setItem('userToken', token);
                    if (nickname) localStorage.setItem('userNickname', nickname);
                    if (assignedDeity) localStorage.setItem('assignedDeity', assignedDeity);
                    localStorage.setItem('hasAccount', 'true');
                    location.reload();
                }
                break;
                
            case 'ADMIN_LOGOUT':
                // ログアウト
                if (window.AuthState) {
                    window.AuthState.clearAuth();
                    window.AuthState.resetGuestProgress({ keepHistory: false });
                }
                localStorage.removeItem('userToken');
                localStorage.removeItem('userNickname');
                localStorage.removeItem('assignedDeity');
                localStorage.removeItem('hasAccount');
                sessionStorage.clear();
                location.reload();
                break;
                
            case 'REQUEST_CHAT_DATA':
                // 分析パネルからのデータリクエスト
                console.log('[iframe] 📨 メッセージ受信: REQUEST_CHAT_DATA');
                console.log('[iframe] 📨 REQUEST_CHAT_DATAを受信しました');
                try {
                    // ChatData, AuthState の存在確認
                    if (typeof ChatData === 'undefined') {
                        console.error('[iframe] ChatDataが未定義です');
                        throw new Error('ChatDataが初期化されていません');
                    }
                    
                    if (typeof window.AuthState === 'undefined') {
                        console.error('[iframe] AuthStateが未定義です');
                        throw new Error('AuthStateが初期化されていません');
                    }
                    
                    const character = ChatData?.currentCharacter || 'unknown';
                    const isRegistered = window.AuthState?.isRegistered() || false;
                    
                    console.log('[iframe] データ取得開始:', {
                        character,
                        isRegistered,
                        hasChatData: !!ChatData,
                        hasAuthState: !!window.AuthState
                    });
                    
                    // メッセージカウントを取得
                    let messageCount = 0;
                    let conversationHistory = [];
                    
                    if (isRegistered) {
                        // 登録ユーザーの場合
                        const historyData = ChatData?.conversationHistory;
                        if (historyData && historyData.recentMessages) {
                            conversationHistory = Array.isArray(historyData.recentMessages) ? historyData.recentMessages : [];
                            messageCount = conversationHistory.filter(msg => msg && msg.role === 'user').length;
                        }
                    } else {
                        // ゲストユーザーの場合
                        if (typeof ChatData?.getGuestMessageCount === 'function') {
                            messageCount = ChatData.getGuestMessageCount(character) || 0;
                            console.log('[iframe] ゲストメッセージ数を取得:', {
                                character,
                                messageCount,
                                method: 'getGuestMessageCount'
                            });
                        } else {
                            console.warn('[iframe] ChatData.getGuestMessageCountが関数ではありません');
                        }
                        
                        if (typeof ChatData?.getGuestHistory === 'function') {
                            conversationHistory = ChatData.getGuestHistory(character) || [];
                            console.log('[iframe] ゲスト会話履歴を取得:', {
                                character,
                                historyLength: conversationHistory.length,
                                userMessages: conversationHistory.filter(msg => msg && msg.role === 'user').length
                            });
                        } else {
                            console.warn('[iframe] ChatData.getGuestHistoryが関数ではありません');
                        }
                        
                        // 会話履歴からもメッセージ数を計算（フォールバック）
                        // messageCountが0でも、会話履歴があれば正しい値を計算
                        if (conversationHistory && conversationHistory.length > 0) {
                            const historyUserMessages = conversationHistory.filter(msg => msg && msg.role === 'user').length;
                            console.log('[iframe] 会話履歴からメッセージ数を計算:', {
                                historyLength: conversationHistory.length,
                                userMessages: historyUserMessages,
                                currentMessageCount: messageCount
                            });
                            
                            // messageCountが0または、履歴から計算した値の方が大きい場合は更新
                            if (messageCount === 0 || historyUserMessages > messageCount) {
                                console.log('[iframe] ⚠️ メッセージ数を修正:', {
                                    oldCount: messageCount,
                                    newCount: historyUserMessages,
                                    reason: messageCount === 0 ? 'messageCountが0のため' : '履歴の方が大きいため'
                                });
                                messageCount = historyUserMessages;
                                
                                // 修正した値をsessionStorageに保存（次回から正しい値が取得できるように）
                                if (typeof ChatData?.setGuestMessageCount === 'function') {
                                    ChatData.setGuestMessageCount(character, historyUserMessages);
                                    console.log('[iframe] ✅ 修正したメッセージ数をsessionStorageに保存しました');
                                }
                            }
                        } else if (messageCount === 0) {
                            console.warn('[iframe] ⚠️ メッセージ数が0で、会話履歴も空です');
                        }
                    }
                    
                    // 現在の状態を取得
                    const currentState = {
                        character: character,
                        userType: isRegistered ? 'registered' : 'guest',
                        messageCount: messageCount,
                        conversationHistoryLength: conversationHistory.length,
                        isRegistered: isRegistered
                    };
                    
                    const responseData = {
                        type: 'CHAT_DATA_RESPONSE',
                        data: {
                            character: character,
                            userType: isRegistered ? 'registered' : 'guest',
                            messageCount: messageCount,
                            conversationHistory: conversationHistory,
                            currentState: currentState,
                            timestamp: Date.now()
                        }
                    };
                    
                    console.log('[iframe] 📤 チャットデータを送信します:', {
                        character,
                        messageCount,
                        historyLength: conversationHistory.length,
                        targetOrigin: event.origin,
                        hasEventSource: !!event.source
                    });
                    
                    // 親ウィンドウにデータを送信
                    if (event.source && event.source.postMessage) {
                        event.source.postMessage(responseData, event.origin);
                        console.log('[iframe] ✅ チャットデータを親ウィンドウに送信しました', currentState);
                    } else {
                        console.error('[iframe] ❌ event.sourceが無効です:', event.source);
                        // フォールバック: window.parentに送信
                        if (window.parent && window.parent !== window) {
                            window.parent.postMessage(responseData, '*');
                            console.log('[iframe] ✅ フォールバック: window.parentに送信しました');
                        }
                    }
                } catch (error) {
                    console.error('[iframe] ❌ チャットデータ取得エラー:', error);
                    const errorResponse = {
                        type: 'CHAT_DATA_ERROR',
                        error: error.message
                    };
                    
                    if (event.source && event.source.postMessage) {
                        event.source.postMessage(errorResponse, event.origin);
                    } else if (window.parent && window.parent !== window) {
                        window.parent.postMessage(errorResponse, '*');
                    }
                }
                break;
        }
    });
});

