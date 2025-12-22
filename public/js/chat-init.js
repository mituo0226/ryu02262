/**
 * chat-init.js
 * 初期化とメインロジックを担当
 */

const ChatInit = {
    /**
     * ページを初期化
     */
    async initPage() {
        // ⚠️ 【最優先】雪乃のタロット：初期化の最初にsessionStorageからカード情報をチェック
        // tarot-waitingから戻ってきた場合のカード情報を、フラグクリア前に取得
        const yukinoCardInfo = (() => {
            const currentChar = new URLSearchParams(window.location.search).get('character');
            if (currentChar === 'yukino') {
                const cardInfoStr = sessionStorage.getItem('yukinoTarotCardForExplanation');
                if (cardInfoStr) {
                    try {
                        const card = JSON.parse(cardInfoStr);
                        console.log('[初期化タロット自動処理] sessionStorageからカード情報を検出（最優先取得）:', {
                            position: card.position,
                            name: card.name
                        });
                        // sessionStorageをクリア
                        sessionStorage.removeItem('yukinoTarotCardForExplanation');
                        return card;
                    } catch (error) {
                        console.error('[初期化タロット自動処理] カード情報の解析エラー:', error);
                    }
                }
            }
            return null;
        })();
        
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:27',message:'loadCharacterData呼び出し前',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        await ChatData.loadCharacterData();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:29',message:'loadCharacterData呼び出し後',data:{characterInfoKeys:Object.keys(ChatData.characterInfo),characterInfoLength:Object.keys(ChatData.characterInfo).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        if (Object.keys(ChatData.characterInfo).length === 0) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:30',message:'characterInfoが空→早期リターン',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
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
        
        // #region agent log
        console.log('🔍🔍🔍 [キャラクター初期化]', {
            URLから取得: character,
            現在のURL: window.location.href,
            URLSearchParams: Object.fromEntries(new URLSearchParams(window.location.search)),
            以前のcurrentCharacter: ChatData.currentCharacter,
            sessionStorage_kaede履歴: sessionStorage.getItem('guestConversationHistory_kaede') ? 'あり' : 'なし',
            sessionStorage_yukino履歴: sessionStorage.getItem('guestConversationHistory_yukino') ? 'あり' : 'なし'
        });
        // #endregion
        
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
            
            // 楓専用の処理：守護神の儀式完了チェック（会話履歴読み込み後に処理するため、ここではフラグのみチェック）
            let guardianMessageShown = false;
            let shouldSendGuardianConfirmation = false;
            let guardianConfirmationData = null;
            
            // 楓専用の処理を独立したファイルから呼び出す
            if (character === 'kaede' && window.KaedeRitualHandler) {
                guardianConfirmationData = window.KaedeRitualHandler.checkGuardianRitualCompletion(character, urlParams);
                if (guardianConfirmationData) {
                    shouldSendGuardianConfirmation = true;
                }
            }
            
            try {
                // 会話履歴を読み込む（登録完了処理で使用するため）
                // 守護神メッセージ表示後も、その後の会話履歴を読み込んでAPIを通して鑑定を進める
                const historyData = await ChatAPI.loadConversationHistory(character);
                
                    // 【重要】守護神確認メッセージを送信（会話履歴読み込み後）
                    // 楓専用の処理を独立したファイルから呼び出す
                    if (shouldSendGuardianConfirmation && guardianConfirmationData) {
                        if (character === 'kaede' && window.KaedeRitualHandler) {
                            const completed = await window.KaedeRitualHandler.handleGuardianRitualCompletion(
                                character,
                                guardianConfirmationData,
                                historyData
                            );
                            if (completed) {
                                guardianMessageShown = true;
                                console.log('[登録完了処理] 守護神の儀式完了メッセージを表示しました。処理を終了します。');
                                return; // 処理終了
                            }
                        }
                    }
                
                // 楓専用の処理：守護神の儀式開始処理（独立したファイルから呼び出す）
                if (character === 'kaede' && window.KaedeRitualHandler) {
                    const ritualHandled = await window.KaedeRitualHandler.handlePostRegistrationRitualStart(
                        character,
                        historyData,
                        urlParams
                    );
                    if (ritualHandled) {
                        // 儀式準備が完了した、または処理がスキップされた
                        // 処理は続行しない（returnしない - 他の処理も必要かもしれないため）
                        // ただし、儀式を開始しない場合はここで終了
                        const acceptedGuardianRitual = sessionStorage.getItem('acceptedGuardianRitual');
                        if (acceptedGuardianRitual !== 'true') {
                            return; // 儀式を開始しない場合は処理終了
                        }
                    }
                } else if (character === 'kaede') {
                    // KaedeRitualHandlerが読み込まれていない場合のフォールバック（エラー回避）
                    console.warn('[登録完了処理] KaedeRitualHandlerが見つかりません。楓専用の処理をスキップします。');
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
                    
                    // 雪乃の場合、タロット関連のsessionStorageもクリア
                    if (character === 'yukino') {
                        sessionStorage.removeItem('yukinoThreeCardsPrepared');
                        sessionStorage.removeItem('yukinoAllThreeCards');
                        sessionStorage.removeItem('yukinoRemainingCards');
                        sessionStorage.removeItem('yukinoTarotCardForExplanation');
                        sessionStorage.removeItem('yukinoSummaryShown');
                        sessionStorage.removeItem('yukinoFirstMessageInSession'); // セッション最初のメッセージもクリア
                        console.log('[登録完了処理] 雪乃のタロット関連フラグをクリアしました');
                    }
                    
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
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:217',message:'loadConversationHistory呼び出し前',data:{character,isGuestMode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            const historyData = await ChatAPI.loadConversationHistory(character);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:220',message:'loadConversationHistory呼び出し後',data:{character,hasHistoryData:!!historyData,hasHistory:historyData?.hasHistory,hasNickname:!!historyData?.nickname,nickname:historyData?.nickname,recentMessagesLength:historyData?.recentMessages?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            console.log('[初期化] historyData取得結果:', {
                hasHistoryData: !!historyData,
                hasHistory: historyData?.hasHistory,
                hasNickname: !!historyData?.nickname,
                nickname: historyData?.nickname
            });
            
            // ゲスト履歴を取得
            let guestHistory = this.getGuestHistoryForMigration(character);
            
            if (guestHistory.length === 0 && isGuestMode) {
                guestHistory = ChatData.getGuestHistory(character);
                
                // 会話履歴が空の場合、雪乃のタロット関連フラグもクリア（新規会話として扱う）
                // ⚠️ ただし、yukinoTarotCardForExplanationは初期化タロット処理で使うため、後でクリアする
                if (guestHistory.length === 0 && character === 'yukino') {
                    // 即座にクリアするフラグ（新規会話用）
                    sessionStorage.removeItem('yukinoThreeCardsPrepared');
                    sessionStorage.removeItem('yukinoSummaryShown');
                    sessionStorage.removeItem('yukinoFirstMessageInSession'); // セッション最初のメッセージもクリア
                    console.log('[初期化] 雪乃の新規会話：一部タロット関連フラグをクリアしました（カード情報は初期化タロット処理後にクリア）');
                }
            }
            
            // ゲスト履歴を表示
            // 守護神の儀式完了直後（guardianMessageShown）の場合は、ゲスト履歴を表示しない
            // （既に守護神の儀式完了メッセージが表示されているため）
            // 【重要】sessionStorageから直接読み取る（let変数のスコープ外のため）
            const guardianMessageShownFromStorage = sessionStorage.getItem('guardianMessageShown') === 'true';
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:232',message:'ゲスト履歴表示チェック',data:{guestHistoryLength:guestHistory.length,guardianMessageShownFromStorage,willDisplay:guestHistory.length>0&&!guardianMessageShownFromStorage,character},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
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
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:277',message:'初回メッセージ表示判定開始',data:{hasHistoryData:!!historyData,hasHistory:historyData?.hasHistory,hasNickname:!!historyData?.nickname,guestHistoryLength:guestHistory.length,guardianMessageShown,character},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            
                    if (historyData && historyData.hasHistory) {
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:377',message:'分岐1-1: returningメッセージ生成開始',data:{character,hasHistory:historyData.hasHistory,recentMessagesLength:historyData.recentMessages?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                        // #endregion
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
                // 【重要】guardianMessageShownがtrueの場合は、楓専用の定型文が既に表示されているためスキップ
                const ritualCompleted = sessionStorage.getItem('ritualCompleted');
                const assignedDeity = localStorage.getItem('assignedDeity');
                const guardianMessageShownCheck = sessionStorage.getItem('guardianMessageShown') === 'true';
                
                if ((ritualCompleted === 'true' || assignedDeity) && !guardianMessageShownCheck && ChatData.conversationHistory && ChatData.conversationHistory.recentMessages) {
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
                
                // 【重要】登録済みユーザーが楓のチャットにアクセスし、守護神（guardian）が未登録の場合、自動的に儀式を開始
                // 守護神の判定はデータベース（historyData.assignedDeity = guardianカラム）を優先
                // 会話履歴の有無に関わらず、guardianが未登録であれば儀式を開始（楓専用）
                if (!isGuestMode && character === 'kaede' && !justRegistered && !shouldTriggerRegistrationFlow) {
                    // データベースのguardianカラムから取得した値（優先）
                    const hasAssignedDeity = historyData.assignedDeity && historyData.assignedDeity.trim() !== '';
                    
                    // 守護神が未決定（データベースのguardianカラムが未設定）の場合、自動的に儀式を開始
                    if (!hasAssignedDeity) {
                        console.log('[楓専用処理] 登録済みユーザーが楓にアクセス。守護神（guardian）が未登録（DB確認）のため、自動的に儀式を開始します。', {
                            assignedDeityFromDB: historyData.assignedDeity,
                            hasHistory: historyData.hasHistory,
                            recentMessagesLength: historyData.recentMessages?.length || 0
                        });
                        
                        // 自動的に守護神の儀式を開始するためのフラグを設定
                        sessionStorage.setItem('acceptedGuardianRitual', 'true');
                        
                        // 自動的に守護神の儀式を開始
                        if (window.ChatInit && typeof window.ChatInit.startGuardianRitual === 'function') {
                            await window.ChatInit.startGuardianRitual(character, null);
                            return; // 儀式開始後は処理を終了
                        }
                    }
                }
                
                if (guestHistory.length === 0 && !guardianMessageShown) {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:369',message:'初回メッセージ表示判定開始',data:{guestHistoryLength:guestHistory.length,guardianMessageShown,hasHistoryData:!!historyData,hasHistory:historyData?.hasHistory,character},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                    // #endregion
                    // ゲストユーザーで会話履歴が空の場合：初回メッセージを表示
                    // 会話履歴がある場合はreturning、ない場合はfirstTimeGuest
                    console.log('[初期化] 初回メッセージ表示判定:', {
                        guestHistoryLength: guestHistory.length,
                        guardianMessageShown,
                        hasHistoryData: !!historyData,
                        hasHistory: historyData?.hasHistory
                    });
                    if (historyData && historyData.hasHistory) {
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:398',message:'分岐1-1: returningメッセージ生成開始',data:{character,hasHistory:historyData.hasHistory,recentMessagesLength:historyData.recentMessages?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                        // #endregion
                        console.log('[初期化] returningメッセージを生成します');
                        const initialMessage = ChatData.generateInitialMessage(character, historyData);
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:404',message:'分岐1-1: returningメッセージ生成完了→addMessage呼び出し',data:{character,messagePreview:initialMessage.substring(0,200),containsOldMessage:initialMessage.includes('あなたさん、初めまして')||initialMessage.includes('システムからお聞き')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
                        // #endregion
                        ChatUI.addMessage('welcome', initialMessage, ChatData.characterInfo[character].name);
                    } else {
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:406',message:'分岐1-2: firstTimeGuestメッセージ生成開始',data:{character},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                        // #endregion
                        // 各鑑定士の初回メッセージ（firstTimeGuest）を使用
                        console.log('[初期化] firstTimeGuestメッセージを生成します');
                        const firstTimeMessage = ChatData.generateFirstTimeMessage(
                            character, 
                            ChatData.userNickname || 'あなた'
                        );
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:415',message:'分岐1-2: メッセージ生成完了→addMessage呼び出し',data:{character,messageLength:firstTimeMessage.length,messagePreview:firstTimeMessage.substring(0,200),containsOldMessage:firstTimeMessage.includes('あなたさん、初めまして')||firstTimeMessage.includes('システムからお聞き'),containsNewMessage:firstTimeMessage.includes('はじめまして、笹岡雪乃です')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
                        // #endregion
                        console.log('[初期化] 生成されたメッセージ:', firstTimeMessage.substring(0, 100) + '...');
                        ChatUI.addMessage('welcome', firstTimeMessage, ChatData.characterInfo[character].name);
                    }
                    } else {
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:400',message:'分岐1: 初回メッセージスキップ（条件不成立）',data:{guestHistoryLength:guestHistory.length,guardianMessageShown,character},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                        // #endregion
                    console.log('[初期化] 初回メッセージをスキップ:', {
                        guestHistoryLength: guestHistory.length,
                        guardianMessageShown
                    });
                }
            } else if (historyData && historyData.nickname) {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:398',message:'分岐2: historyData.nickname存在',data:{character,hasHistoryData:!!historyData,hasHistory:historyData?.hasHistory,hasNickname:!!historyData?.nickname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                ChatData.userNickname = historyData.nickname;
                
                // 【重要】登録済みユーザーが楓のチャットにアクセスし、守護神（guardian）が未登録の場合、自動的に儀式を開始
                // 守護神の判定はデータベース（historyData.assignedDeity = guardianカラム）を優先
                // 会話履歴の有無に関わらず、guardianが未登録であれば儀式を開始（楓専用）
                if (!isGuestMode && character === 'kaede' && !justRegistered && !shouldTriggerRegistrationFlow) {
                    // データベースのguardianカラムから取得した値（優先）
                    const hasAssignedDeity = historyData.assignedDeity && historyData.assignedDeity.trim() !== '';
                    
                    // 守護神が未決定（データベースのguardianカラムが未設定）の場合、自動的に儀式を開始
                    if (!hasAssignedDeity) {
                        console.log('[楓専用処理] 登録済みユーザーが楓にアクセス。守護神（guardian）が未登録（DB確認）のため、自動的に儀式を開始します。', {
                            assignedDeityFromDB: historyData.assignedDeity,
                            nickname: historyData.nickname
                        });
                        
                        // 自動的に守護神の儀式を開始するためのフラグを設定
                        sessionStorage.setItem('acceptedGuardianRitual', 'true');
                        
                        // 自動的に守護神の儀式を開始
                        if (window.ChatInit && typeof window.ChatInit.startGuardianRitual === 'function') {
                            await window.ChatInit.startGuardianRitual(character, null);
                            return; // 儀式開始後は処理を終了
                        }
                    }
                }
                
                const info = ChatData.characterInfo[character];
                if (guestHistory.length === 0 && !guardianMessageShown) {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:427',message:'分岐2: firstTimeGuestメッセージ生成',data:{character},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                    // #endregion
                    // 各鑑定士の初回メッセージ（firstTimeGuest）を使用
                    const firstTimeMessage = ChatData.generateFirstTimeMessage(
                        character, 
                        ChatData.userNickname || 'あなた'
                    );
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:432',message:'分岐2: メッセージ生成完了',data:{character,messagePreview:firstTimeMessage.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
                    // #endregion
                    ChatUI.addMessage('welcome', firstTimeMessage, info.name);
                }
            } else {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:415',message:'分岐3: historyDataなしまたはnicknameなし',data:{character,hasHistoryData:!!historyData,hasHistory:historyData?.hasHistory,hasNickname:!!historyData?.nickname,isGuestMode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                // 【重要】登録済みユーザーが楓のチャットにアクセスし、守護神（guardian）が未登録の場合、自動的に儀式を開始
                // この分岐ではhistoryDataが取得できなかった場合のため、会話履歴を再取得してデータベースのguardianカラムを確認
                // 会話履歴の有無に関わらず、guardianが未登録であれば儀式を開始（楓専用）
                if (!isGuestMode && character === 'kaede' && !justRegistered && !shouldTriggerRegistrationFlow) {
                    // 会話履歴を再取得してデータベースのguardianカラムを確認
                    try {
                        const recheckHistoryData = await ChatAPI.loadConversationHistory(character);
                        const hasAssignedDeity = recheckHistoryData && recheckHistoryData.assignedDeity && recheckHistoryData.assignedDeity.trim() !== '';
                        
                        // 守護神が未決定（データベースのguardianカラムが未設定）の場合、自動的に儀式を開始
                        if (!hasAssignedDeity) {
                            console.log('[楓専用処理] 登録済みユーザーが楓にアクセス。守護神（guardian）が未登録（DB再確認）のため、自動的に儀式を開始します。', {
                                assignedDeityFromDB: recheckHistoryData?.assignedDeity
                            });
                            
                            // 自動的に守護神の儀式を開始するためのフラグを設定
                            sessionStorage.setItem('acceptedGuardianRitual', 'true');
                            
                            // 自動的に守護神の儀式を開始
                            if (window.ChatInit && typeof window.ChatInit.startGuardianRitual === 'function') {
                                await window.ChatInit.startGuardianRitual(character, null);
                                return; // 儀式開始後は処理を終了
                            }
                        }
                    } catch (error) {
                        console.error('[楓専用処理] 会話履歴の再取得に失敗:', error);
                        // エラー時は処理を続行（通常の初回メッセージを表示）
                    }
                }
                
                const info = ChatData.characterInfo[character];
                if (guestHistory.length === 0 && !guardianMessageShown) {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:427',message:'分岐2: firstTimeGuestメッセージ生成',data:{character},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                    // #endregion
                    // 各鑑定士の初回メッセージ（firstTimeGuest）を使用
                    const firstTimeMessage = ChatData.generateFirstTimeMessage(
                        character, 
                        ChatData.userNickname || 'あなた'
                    );
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:432',message:'分岐2: メッセージ生成完了',data:{character,messagePreview:firstTimeMessage.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
                    // #endregion
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
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:520',message:'エラー分岐: firstTimeGuestメッセージ生成',data:{character},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                // 会話履歴が空の場合：各鑑定士の初回メッセージ（firstTimeGuest）を使用
                const firstTimeMessage = ChatData.generateFirstTimeMessage(
                    character, 
                    ChatData.userNickname || 'あなた'
                );
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:525',message:'エラー分岐: メッセージ生成完了',data:{character,messagePreview:firstTimeMessage.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
                // #endregion
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
    async sendMessage(skipUserMessage = false, skipAnimation = false, messageOverride = null) {
        // メッセージの取得：オーバーライドが指定されている場合はそれを使用、そうでなければ入力欄から取得
        const message = messageOverride || ChatUI.messageInput.value.trim();
        const character = ChatData.currentCharacter;

        if (!message) {
            return;
        }
        
        const isGuest = !AuthState.isRegistered();
        
        // タロットカード解説トリガーマーカーを検出
        const isTarotExplanationTrigger = message.includes('[TAROT_EXPLANATION_TRIGGER:');
        
        // メッセージ送信ボタンを押した時点で、即座にカウントを開始
        if (isGuest && !isTarotExplanationTrigger) {
            // メッセージ送信前：現在のカウントを取得（10通目以降は強制的に儀式開始へ）
            const currentCount = ChatData.getGuestMessageCount(character);
            if (currentCount >= ChatData.GUEST_MESSAGE_LIMIT) {
                console.log('[メッセージ制限] 10通目以降のため、守護神の儀式を強制開始します');
                if (window.KaedeRitualHandler && typeof window.KaedeRitualHandler.forceStartGuardianRitual === 'function') {
                    await window.KaedeRitualHandler.forceStartGuardianRitual(character);
                } else if (window.KaedeRitualHandler && typeof window.KaedeRitualHandler.handleRitualConsent === 'function') {
                    await window.KaedeRitualHandler.handleRitualConsent(true);
                }
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

            // 10通目に到達したら、会話を続けず儀式を強制開始
            if (messageCount >= ChatData.GUEST_MESSAGE_LIMIT) {
                console.log('[メッセージ制限] 10通目に到達したため、守護神の儀式を強制開始します');
                if (window.KaedeRitualHandler && typeof window.KaedeRitualHandler.forceStartGuardianRitual === 'function') {
                    await window.KaedeRitualHandler.forceStartGuardianRitual(character);
                } else if (window.KaedeRitualHandler && typeof window.KaedeRitualHandler.handleRitualConsent === 'function') {
                    await window.KaedeRitualHandler.handleRitualConsent(true);
                }
                return;
            }
            
            const isFirstMessage = currentCount === 0;
            if (isFirstMessage) {
                console.log('[メッセージ送信] 🎯 最初のメッセージを送信しました（カウント=1からスタート）:', {
                    character,
                    message: message.substring(0, 50) + '...',
                    messageCount: messageCount,
                    historyLength: savedHistory.length
                });
                
                // 雪乃の場合、そのセッションで最初のメッセージを記録（まとめ鑑定で使用）
                if (character === 'yukino' && !isTarotExplanationTrigger) {
                    sessionStorage.setItem('yukinoFirstMessageInSession', message);
                    console.log('[メッセージ送信] 雪乃のセッション最初のメッセージを記録:', message.substring(0, 50));
                }
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

        // ユーザーメッセージの追加は、API応答を確認してから行う（楓の場合の条件分岐のため）
        // ただし、会話履歴には先に追加する必要がある（APIが認識できるように）
        const messageToSend = message;
        
        // 【重要】ユーザーメッセージを送信時点で即座に表示（ユーザーが送信を確認できるように）
        // タロットカード解説トリガーマーカーの場合は表示しない
        if (!skipUserMessage && !isTarotExplanationTrigger) {
            ChatUI.addMessage('user', messageToSend, 'あなた');
            await this.delay(100);
            ChatUI.scrollToLatest();
        }
        
        ChatUI.messageInput.value = '';
        ChatUI.updateSendButtonVisibility();
        // 注意：updateSendButtonVisibility()内でdisabledが設定されるため、ここでの設定は不要
        
        if (skipAnimation) {
            const currentUrl = window.location.href;
            const waitingUrl = `tarot-waiting.html?character=${character}&return=${encodeURIComponent(currentUrl)}&message=${encodeURIComponent(messageToSend)}`;
            
            document.body.style.transition = 'opacity 0.5s ease';
            document.body.style.opacity = '0';
            
            await this.delay(500);
            window.location.href = waitingUrl;
            return;
        }
        
        // タロットカード解説トリガーマーカーの場合は、sessionStorageに保存しない
        if (!skipUserMessage && !isTarotExplanationTrigger) {
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
                const currentCount = ChatData.getGuestMessageCount(character);
                
                // 楓専用：会話履歴には既に今回送信するメッセージが含まれているため、-1する
                // 他の鑑定士：currentCountをそのまま使用
                if (character === 'kaede') {
                    // 楓の場合、会話履歴には既に今回送信するメッセージが含まれているため、
                    // -1 して「これまでのメッセージ数」を計算
                    messageCountForAPI = Math.max(0, currentCount - 1);
                } else {
                    // 他の鑑定士（花音、空、雪乃）の場合、currentCountをそのまま使用
                    // タロット解説トリガーは会話履歴に追加されないため、currentCountが自動的に正しい値になる
                    messageCountForAPI = currentCount;
                }
                
                console.log('[メッセージ送信] APIに送信するメッセージカウント:', {
                    鑑定士: character,
                    送信メッセージ: messageToSend.substring(0, 50),
                    タロット解説トリガー: isTarotExplanationTrigger,
                    会話履歴のユーザーメッセージ数: currentCount,
                    '楓専用_マイナス1適用': character === 'kaede',
                    APIに送信する値: messageCountForAPI,
                    API側で計算される最終値: messageCountForAPI + 1
                });
            } else {
                // 登録ユーザーの場合、会話履歴から計算（今回送信するメッセージは含まれていない）
                messageCountForAPI = conversationHistory.filter(msg => msg && msg.role === 'user').length;
                
                // 雪乃の場合、そのセッションで最初のメッセージを記録（まとめ鑑定で使用）
                // yukinoFirstMessageInSessionがまだ設定されていない場合、そのセッションで最初のメッセージ
                if (character === 'yukino' && !isTarotExplanationTrigger) {
                    const existingFirstMessage = sessionStorage.getItem('yukinoFirstMessageInSession');
                    if (!existingFirstMessage) {
                        sessionStorage.setItem('yukinoFirstMessageInSession', messageToSend);
                        console.log('[メッセージ送信] 登録ユーザー（雪乃）のセッション最初のメッセージを記録:', messageToSend.substring(0, 50));
                    }
                }
            }
            
            // APIリクエストのオプション
            // guestMetadata.messageCount は「これまでのメッセージ数（今回送信するメッセージを含まない）」
            const options = {
                guestMetadata: isGuest ? { messageCount: messageCountForAPI } : undefined
            };
            
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
            
            // 応答メッセージを表示
            const characterName = ChatData.characterInfo[character]?.name || character;
            const responseText = response.message || response.response || '応答を取得できませんでした';
            
            // 楓専用の処理：「ニックネームと生年月日を入力」が含まれる場合は、ユーザーメッセージを表示しない
            // それ以外の場合は、ユーザーメッセージを表示する
            let shouldShowUserMessage = !skipUserMessage;
            if (isGuest && character === 'kaede') {
                const hasRegistrationInput = responseText.includes('ニックネームと生年月日を入力') || 
                                             responseText.includes('**ニックネームと生年月日を入力**') ||
                                             responseText.includes('生年月日を入力');
                if (hasRegistrationInput) {
                    shouldShowUserMessage = false;
                    console.log('[楓専用処理] 「ニックネームと生年月日を入力」を検出。ユーザーメッセージを表示しません。');
                }
            }
            
            // ユーザーメッセージは既に送信時に表示済み（588行目付近）
            // 「ニックネームと生年月日を入力」が含まれる場合は、表示されたユーザーメッセージを削除
            if (!shouldShowUserMessage && !skipUserMessage) {
                // 最後のユーザーメッセージを削除
                const userMessages = ChatUI.messagesDiv.querySelectorAll('.message.user');
                if (userMessages.length > 0) {
                    const lastUserMessage = userMessages[userMessages.length - 1];
                    const messageText = lastUserMessage.querySelector('div:last-child')?.textContent?.trim();
                    if (messageText === messageToSend) {
                        lastUserMessage.remove();
                        console.log('[楓専用処理] ユーザーメッセージを削除しました:', messageToSend);
                    }
                }
            }
            
            const messageId = ChatUI.addMessage('character', responseText, characterName);
            ChatUI.scrollToLatest();
            
            // 雪乃のタロット：AIの解説後に自動的に次のステップを実行
            // sessionStorageからカード情報を取得して次のステップを判定
            if (character === 'yukino') {
                const cardInfoStr = sessionStorage.getItem('yukinoTarotCardForExplanation');
                if (cardInfoStr) {
                    try {
                        const card = JSON.parse(cardInfoStr);
                        console.log('[タロット自動処理] カード解説後の自動処理を実行:', {
                            position: card.position,
                            name: card.name
                        });
                        
                        // sessionStorageをクリア（次回の解説まで残さない）
                        sessionStorage.removeItem('yukinoTarotCardForExplanation');
                        
                        // 少し待ってから次のステップを実行（ユーザーがAIの解説を読む時間を確保）
                        setTimeout(() => {
                            if (card.position === '過去') {
                                // システムメッセージを追加
                                const msgId = ChatUI.addMessage('character', 'それでは次に現在のカードをめくりましょう！', characterName);
                                ChatUI.scrollToLatest();
                                
                                // 現在のカードの裏面を表示
                                if (window.YukinoTarot && window.YukinoTarot.displayNextTarotCard) {
                                    window.YukinoTarot.displayNextTarotCard({ skipButtonDisplay: true });
                                }
                            } else if (card.position === '現在') {
                                // システムメッセージを追加
                                const msgId = ChatUI.addMessage('character', 'それでは次に未来のカードをめくりましょう！', characterName);
                                ChatUI.scrollToLatest();
                                
                                // 未来のカードの裏面を表示
                                if (window.YukinoTarot && window.YukinoTarot.displayNextTarotCard) {
                                    window.YukinoTarot.displayNextTarotCard({ skipButtonDisplay: true });
                                }
                            } else if (card.position === '未来') {
                                // システムメッセージを追加
                                const msgId = ChatUI.addMessage('character', 'それでは、まとめて解説しましょう！！', characterName);
                                ChatUI.scrollToLatest();
                                
                                // 「雪乃のまとめ」ボタンを表示
                                if (window.YukinoTarot && window.YukinoTarot.displaySummaryButton) {
                                    const messagesDiv = document.getElementById('messages');
                                    if (messagesDiv) {
                                        window.YukinoTarot.displaySummaryButton(messagesDiv);
                                    }
                                }
                            }
                        }, 1500); // 1.5秒待ってから次のステップを実行
                    } catch (error) {
                        console.error('[タロット自動処理] カード情報の解析エラー:', error);
                    }
                }
            }
            
            // 会話履歴を更新
            if (isGuest) {
                ChatData.addToGuestHistory(character, 'assistant', responseText);
                const guestMessageCount = ChatData.getGuestMessageCount(character);
                
                // 楓専用の処理：守護神の儀式開始ボタンを追加
                if (character === 'kaede' && window.KaedeRitualHandler) {
                    window.KaedeRitualHandler.addRitualStartButtonToMessageIfNeeded(
                        responseText,
                        messageId,
                        character
                    );
                }
                
                // ゲストユーザーの場合、registrationSuggestedをチェック
                console.log('[API応答] registrationSuggestedチェック:', {
                    registrationSuggested: response.registrationSuggested,
                    ritualConsentShown: ChatData.ritualConsentShown,
                    character: character,
                    responseKeys: Object.keys(response)
                });
                
                if (response.registrationSuggested && !ChatData.ritualConsentShown && guestMessageCount >= 5 && guestMessageCount < ChatData.GUEST_MESSAGE_LIMIT) {
                    // 楓は「守護神の儀式を始めますか？」の同意ダイアログを8〜9通目で出すと不自然なため、
                    // ここではダイアログは出さず「上限が近い」案内だけ表示する。
                    if (character === 'kaede') {
                        const preLimitNoticeKey = 'kaedeGuestPreLimitNoticeShown';
                        if (sessionStorage.getItem(preLimitNoticeKey) !== 'true') {
                            const remaining = Math.max(0, ChatData.GUEST_MESSAGE_LIMIT - guestMessageCount);
                            ChatUI.addMessage(
                                'error',
                                `まもなく無料でお話できる回数の上限です。残り${remaining}通です。10通目以降はユーザー登録が必要になります。`,
                                'システム'
                            );
                            sessionStorage.setItem(preLimitNoticeKey, 'true');
                        }
                    } else {
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
                    }
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
        
        // 【重要】守護神の儀式完了後（guardianMessageShownフラグが設定されている場合）は、lastUserMessageを表示しない
        const guardianMessageShown = sessionStorage.getItem('guardianMessageShown') === 'true';
        if (guardianMessageShown && lastUserMessage) {
            console.log('[handleReturnFromAnimation] 守護神の儀式完了後です。lastUserMessageを表示しません。');
            sessionStorage.removeItem('lastUserMessage');
        }

        if (consultError) {
            ChatUI.addMessage('error', `エラーが発生しました: ${consultError}`, 'システム');
            sessionStorage.removeItem('lastConsultError');
            if (ChatUI.sendButton) ChatUI.sendButton.disabled = false;
            return;
        }

        if (lastUserMessage && !guardianMessageShown) {
            try {
                const userMsgData = JSON.parse(lastUserMessage);
                const messageToCheck = userMsgData.message.trim();
                
                // タロットカードの解説リクエストメッセージ・トリガーマーカーは表示しない
                if (messageToCheck.includes('以下のタロットカードについて') || 
                    messageToCheck.includes('このカードの意味、私の') ||
                    messageToCheck.includes('のカード「') ||
                    messageToCheck.includes('について、詳しく解説してください') ||
                    messageToCheck.includes('[TAROT_EXPLANATION_TRIGGER:')) {
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
                        const currentGuestCount = ChatData.getGuestMessageCount(ChatData.currentCharacter);
                        if (data.message) {
                            ChatUI.addMessage('error', data.message, 'システム');
                        }
                        if (data.needsRegistration && currentGuestCount < ChatData.GUEST_MESSAGE_LIMIT) {
                            // 楓は同意ダイアログを出さず、案内のみ表示
                            if (ChatData.currentCharacter === 'kaede') {
                                ChatUI.addMessage(
                                    'error',
                                    'まもなく無料でお話できる回数の上限です。10通目以降はユーザー登録が必要になります。',
                                    'システム'
                                );
                            } else {
                                ChatUI.addMessage('error', '登録が必要です。守護神の儀式への同意ボタンが表示されます。', 'システム');
                                setTimeout(() => {
                                    ChatUI.showRitualConsentButtons();
                                }, 3000);
                            }
                        } else if (data.registrationSuggested && currentGuestCount < ChatData.GUEST_MESSAGE_LIMIT) {
                            // 楓は同意ダイアログを出さず、案内のみ表示
                            if (ChatData.currentCharacter === 'kaede') {
                                const preLimitNoticeKey = 'kaedeGuestPreLimitNoticeShown';
                                if (sessionStorage.getItem(preLimitNoticeKey) !== 'true') {
                                    const remaining = Math.max(0, ChatData.GUEST_MESSAGE_LIMIT - currentGuestCount);
                                    ChatUI.addMessage(
                                        'error',
                                        `まもなく無料でお話できる回数の上限です。残り${remaining}通です。10通目以降はユーザー登録が必要になります。`,
                                        'システム'
                                    );
                                    sessionStorage.setItem(preLimitNoticeKey, 'true');
                                }
                            } else {
                                // 既にボタンが表示されている場合は表示しない
                                if (!ChatData.ritualConsentShown) {
                                    const characterName = ChatData.characterInfo[ChatData.currentCharacter]?.name || '鑑定士';
                                    ChatUI.addMessage('error', `${characterName === '楓' ? '守護神の儀式' : 'ユーザー登録'}への同意が検出されました。ボタンが表示されます。`, 'システム');
                                    setTimeout(() => {
                                        ChatUI.showRitualConsentButtons();
                                    }, 2000);
                                }
                            }
                        } else if (currentGuestCount >= ChatData.GUEST_MESSAGE_LIMIT) {
                            // 10通目（上限）に達している場合は案内を出して強制的に登録・儀式へ
                            ChatUI.addMessage('error', '会話が10通を超えたため、これより先はユーザー登録が必要です。登録画面へ移動します。', 'システム');
                            setTimeout(() => {
                                this.openRegistrationModal();
                            }, 3000);
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
                            ChatUI.addMessage('error', '会話が10通を超えたため、これより先はユーザー登録が必要です。登録画面へ移動します。', 'システム');
                            setTimeout(() => {
                                this.openRegistrationModal();
                            }, 3000);
                        }
                        else if (data.needsRegistration && guestCount < ChatData.GUEST_MESSAGE_LIMIT) {
                            // 楓は同意ダイアログを出さず、案内のみ表示
                            if (ChatData.currentCharacter === 'kaede') {
                                ChatUI.addMessage(
                                    'error',
                                    'まもなく無料でお話できる回数の上限です。10通目以降はユーザー登録が必要になります。',
                                    'システム'
                                );
                            } else {
                                // 既にボタンが表示されている場合は表示しない
                                if (!ChatData.ritualConsentShown) {
                                    ChatUI.addMessage('error', '登録が必要です。守護神の儀式への同意ボタンが表示されます。', 'システム');
                                    setTimeout(() => {
                                        ChatUI.showRitualConsentButtons();
                                    }, 3000);
                                }
                            }
                        } else if (data.registrationSuggested && guestCount < ChatData.GUEST_MESSAGE_LIMIT) {
                            // 楓は同意ダイアログを出さず、案内のみ表示
                            if (ChatData.currentCharacter === 'kaede') {
                                const preLimitNoticeKey = 'kaedeGuestPreLimitNoticeShown';
                                if (sessionStorage.getItem(preLimitNoticeKey) !== 'true') {
                                    const remaining = Math.max(0, ChatData.GUEST_MESSAGE_LIMIT - guestCount);
                                    ChatUI.addMessage(
                                        'error',
                                        `まもなく無料でお話できる回数の上限です。残り${remaining}通です。10通目以降はユーザー登録が必要になります。`,
                                        'システム'
                                    );
                                    sessionStorage.setItem(preLimitNoticeKey, 'true');
                                }
                            } else {
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
    async handleRitualConsent(consent) {
        const character = ChatData.currentCharacter;
        
        // 楓専用の処理を独立したファイルから呼び出す
        if (character === 'kaede' && window.KaedeRitualHandler) {
            const handled = await window.KaedeRitualHandler.handleRitualConsent(consent);
            if (handled) {
                return; // 楓専用の処理が完了した
            }
        }
        
        // 楓以外、またはKaedeRitualHandlerが存在しない場合のフォールバック処理
        ChatUI.hideRitualConsentButtons();
        
        // フラグをリセット（一度処理したので、再度表示されないようにする）
        ChatData.ritualConsentShown = true;
        
        if (consent) {
            // 「はい」を押した場合
            const characterName = ChatData.characterInfo[character]?.name || '鑑定士';
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
            // 会話履歴を取得（データベースのguardianカラムを確認するため）
            const historyData = await ChatAPI.loadConversationHistory(character);
            console.log('[守護神の儀式] 会話履歴データ:', historyData);
            
            // 【重要】データベースのguardianカラムから守護神が既に決定されているかチェック（優先）
            if (historyData && historyData.assignedDeity && historyData.assignedDeity.trim() !== '') {
                console.log('[守護神の儀式] データベースで守護神が既に決定されていることを確認（' + historyData.assignedDeity + '）。儀式を開始しません。');
                // localStorageにも同期（表示用）
                localStorage.setItem('assignedDeity', historyData.assignedDeity);
                if (ChatUI.sendButton) ChatUI.sendButton.disabled = false;
                return; // 儀式を開始しない
            }
            
            // 会話履歴の決定（優先順位順）
            let conversationHistory = [];
            let needsMigration = false; // ゲスト履歴の移行が必要かどうか
            
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
                needsMigration = true; // ゲスト履歴をデータベースに移行する必要がある
                console.log('[守護神の儀式] ゲスト会話履歴を使用:', conversationHistory.length, {
                    userMessages: conversationHistory.filter(msg => msg.role === 'user').length,
                    assistantMessages: conversationHistory.filter(msg => msg.role === 'assistant').length,
                    needsMigration: needsMigration
                });
            } 
            // 3. どちらもない場合は空配列
            else {
                conversationHistory = [];
                console.log('[守護神の儀式] 会話履歴が空です（新規会話）');
            }
            
            console.log('[守護神の儀式] 使用する会話履歴:', conversationHistory);
            
            // 【重要】ゲスト履歴の移行が必要な場合は、ダミーメッセージを送信してデータベースに保存
            if (needsMigration && conversationHistory.length > 0) {
                console.log('[守護神の儀式] ゲスト履歴をデータベースに移行します:', conversationHistory.length, '件');
                
                // 最初のユーザーメッセージを取得してsessionStorageに保存
                const firstUserMessage = conversationHistory.find(msg => msg.role === 'user');
                if (firstUserMessage && firstUserMessage.content) {
                    sessionStorage.setItem('firstQuestionBeforeRitual', firstUserMessage.content);
                    console.log('[守護神の儀式] 最初の質問をsessionStorageに保存:', firstUserMessage.content.substring(0, 50) + '...');
                }
                
                try {
                    // ダミーメッセージを送信（守護神の儀式開始を通知）
                    await ChatAPI.sendMessage(
                        '守護神の儀式を開始します',
                        character,
                        conversationHistory,
                        {
                            migrateHistory: true, // ゲスト履歴をデータベースに移行
                            ritualStart: true // 儀式開始フラグ
                        }
                    );
                    console.log('[守護神の儀式] ゲスト履歴の移行が完了しました');
                } catch (error) {
                    console.error('[守護神の儀式] ゲスト履歴の移行に失敗:', error);
                    // エラーでも処理は続行（儀式は開始できる）
                }
            }
            
            // 【重要】ユーザー登録後は、守護神の儀式開始前にカエデのメッセージを表示
            // これにより、儀式完了後にユーザーの履歴が残らない（カエデが最後のメッセージになる）
            const characterName = ChatData.characterInfo[character]?.name || '楓';
            const ritualStartMessage = 'それではこれより守護神のイベントを開始いたします。\n画面が切り替わりますので、儀式を体験してください。';
            
            console.log('[守護神の儀式] 儀式開始前のメッセージを表示:', ritualStartMessage);
            
            // メッセージを確実に表示するため、DOM更新を待つ
            ChatUI.addMessage('character', ritualStartMessage, characterName);
            
            // DOM更新を待つ
            await new Promise(resolve => requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
            }));
            
            // スクロールしてメッセージを表示
            ChatUI.scrollToLatest();
            
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
window.sendMessage = (skipUserMessage, skipAnimation, messageOverride) => ChatInit.sendMessage(skipUserMessage, skipAnimation, messageOverride);
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
    
    // 雪乃のタロット：yukinoCardInfoが存在する場合、1.5秒後に次のステップを実行
    if (yukinoCardInfo) {
        setTimeout(() => {
            const card = yukinoCardInfo;
            const characterName = ChatData.characterInfo['yukino'].name;
            
            if (card.position === '過去') {
                ChatUI.addMessage('character', 'それでは次に現在のカードをめくりましょう！', characterName);
                ChatUI.scrollToLatest();
                if (window.YukinoTarot && window.YukinoTarot.displayNextTarotCard) {
                    window.YukinoTarot.displayNextTarotCard({ skipButtonDisplay: true });
                }
            } else if (card.position === '現在') {
                ChatUI.addMessage('character', 'それでは次に未来のカードをめくりましょう！', characterName);
                ChatUI.scrollToLatest();
                if (window.YukinoTarot && window.YukinoTarot.displayNextTarotCard) {
                    window.YukinoTarot.displayNextTarotCard({ skipButtonDisplay: true });
                }
            } else if (card.position === '未来') {
                ChatUI.addMessage('character', 'それでは、まとめて解説しましょう！！', characterName);
                ChatUI.scrollToLatest();
                if (window.YukinoTarot && window.YukinoTarot.displaySummaryButton) {
                    const messagesDiv = document.getElementById('messages');
                    if (messagesDiv) {
                        window.YukinoTarot.displaySummaryButton(messagesDiv);
                    }
                }
            }
        }, 1500);
    } else {
        // カード情報がない場合、新規会話なので残りのフラグもクリア
        const currentChar = new URLSearchParams(window.location.search).get('character');
        if (currentChar === 'yukino') {
            console.log('[初期化タロット自動処理] カード情報なし。残りのタロットフラグをクリアします。');
            sessionStorage.removeItem('yukinoAllThreeCards');
            sessionStorage.removeItem('yukinoRemainingCards');
        }
    }
    
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

