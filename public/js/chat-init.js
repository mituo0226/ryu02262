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
            
            try {
                // 会話履歴を読み込む（登録完了処理で使用するため）
                const historyData = await ChatAPI.loadConversationHistory(character);
                
                // カエデの場合は守護神の儀式を開始
                if (character === 'kaede') {
                    console.log('[登録完了処理] カエデの場合、守護神の儀式を開始');
                    
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
                    
                    // ユーザーデータを更新（会話履歴から取得、なければlocalStorageから）
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
                    
                    // 会話履歴をクリア（新規登録なので空から始める）
                    ChatData.conversationHistory = null;
                    
                    // 前置きなしで「それでは守護神の儀式を始めます」と表示
                    const ritualStartMessage = 'それでは守護神の儀式を始めます';
                    console.log('[登録完了処理] メッセージを表示:', ritualStartMessage);
                    const messageElement = ChatUI.addMessage('character', ritualStartMessage, ChatData.characterInfo[character].name);
                    
                    // ゲスト会話履歴を一時的に保存（ボタンクリック時に使用するため）
                    // sessionStorageに保存して、ボタンクリック時に取得できるようにする
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
                    
                    // メッセージの下に守護神の儀式開始ボタンを追加
                    if (messageElement) {
                        ChatUI.addRitualStartButton(messageElement, async () => {
                            console.log('[守護神の儀式] ボタンがクリックされました');
                            
                            // 保存されたゲスト履歴を取得
                            const pendingRitualHistory = sessionStorage.getItem('pendingRitualGuestHistory');
                            let ritualGuestHistory = [];
                            
                            if (pendingRitualHistory) {
                                try {
                                    const ritualData = JSON.parse(pendingRitualHistory);
                                    if (ritualData.character === character && ritualData.history) {
                                        ritualGuestHistory = ritualData.history;
                                        console.log('[守護神の儀式] 保存されたゲスト履歴を取得:', {
                                            historyLength: ritualGuestHistory.length,
                                            userMessages: ritualGuestHistory.filter(msg => msg && msg.role === 'user').length
                                        });
                                    }
                                } catch (error) {
                                    console.error('[守護神の儀式] ゲスト履歴の取得エラー:', error);
                                }
                            }
                            
                            // ゲスト履歴が取得できない場合は、再度取得を試みる
                            if (ritualGuestHistory.length === 0) {
                                console.log('[守護神の儀式] ゲスト履歴を再取得');
                                const ChatInitInstance = window.ChatInit || this;
                                if (ChatInitInstance && typeof ChatInitInstance.getGuestHistoryForMigration === 'function') {
                                    ritualGuestHistory = ChatInitInstance.getGuestHistoryForMigration(character);
                                }
                                if (ritualGuestHistory.length === 0) {
                                    ritualGuestHistory = ChatData.getGuestHistory(character) || [];
                                }
                            }
                            
                            console.log('[守護神の儀式] 使用するゲスト履歴:', {
                                historyLength: ritualGuestHistory.length,
                                userMessages: ritualGuestHistory.filter(msg => msg && msg.role === 'user').length
                            });
                            
                            // ボタンを非表示
                            const button = messageElement.querySelector('.ritual-start-button');
                            if (button) {
                                button.style.display = 'none';
                            }
                            
                            // 守護神の儀式を開始
                            const ChatInitInstance = window.ChatInit || this;
                            if (ChatInitInstance && typeof ChatInitInstance.startGuardianRitual === 'function') {
                                await ChatInitInstance.startGuardianRitual(character, ritualGuestHistory);
                            } else {
                                console.error('[守護神の儀式] startGuardianRitual関数が見つかりません');
                            }
                            
                            // 守護神の儀式開始後、ゲスト履歴をクリア
                            if (window.AuthState && typeof window.AuthState.clearGuestHistory === 'function') {
                                AuthState.clearGuestHistory(character);
                            }
                            sessionStorage.removeItem(historyKey);
                            sessionStorage.removeItem('pendingGuestHistoryMigration');
                            sessionStorage.removeItem('pendingRitualGuestHistory');
                            ChatData.setGuestMessageCount(character, 0);
                        });
                    }
                    
                    // URLパラメータからjustRegisteredを削除
                    urlParams.delete('justRegistered');
                    const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
                    window.history.replaceState({}, '', newUrl);
                    
                    // sessionStorageからも登録完了フラグを削除
                    sessionStorage.removeItem('justRegistered');
                    
                    return;
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
            // 会話履歴を読み込む
            const historyData = await ChatAPI.loadConversationHistory(character);
            
            // ゲスト履歴を取得
            let guestHistory = this.getGuestHistoryForMigration(character);
            
            if (guestHistory.length === 0 && isGuestMode) {
                guestHistory = ChatData.getGuestHistory(character);
            }
            
            // ゲスト履歴を表示
            if (guestHistory.length > 0) {
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
            if (historyData && historyData.hasHistory) {
                ChatData.conversationHistory = historyData;
                ChatData.userNickname = historyData.nickname || ChatData.userNickname;
                
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
                
                if (guestHistory.length === 0) {
                    const initialMessage = ChatData.generateInitialMessage(character, historyData);
                    ChatUI.addMessage('welcome', initialMessage, ChatData.characterInfo[character].name);
                }
            } else if (historyData && historyData.nickname) {
                ChatData.userNickname = historyData.nickname;
                const info = ChatData.characterInfo[character];
                if (guestHistory.length === 0) {
                    const firstTimeMessage = ChatData.generateFirstTimeMessage(character, ChatData.userNickname);
                    ChatUI.addMessage('welcome', firstTimeMessage, info.name);
                }
            } else {
                const info = ChatData.characterInfo[character];
                if (guestHistory.length === 0) {
                    const firstTimeMessage = ChatData.generateFirstTimeMessage(character, ChatData.userNickname || 'あなた');
                    ChatUI.addMessage('welcome', firstTimeMessage, info.name);
                }
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
        
        const currentUrl = window.location.href;
        const animationUrl = `reading-animation.html?character=${character}&return=${encodeURIComponent(currentUrl)}&message=${encodeURIComponent(messageToSend)}`;
        
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '0';
        
        await this.delay(500);
        window.location.href = animationUrl;
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
            
            // 守護神の儀式開始メッセージを会話履歴に追加（表示はしない）
            const ritualMessage = '守護神の儀式を始めてください';
            conversationHistory.push({ role: 'user', content: ritualMessage });
            
            // ユーザーメッセージ数を計算（守護神の儀式開始メッセージを含めない）
            const userMessagesBeforeRitual = conversationHistory.slice(0, -1).filter(msg => msg.role === 'user').length;
            const ritualUserMessageCount = userMessagesBeforeRitual + 1; // 守護神の儀式開始メッセージを含める
            
            console.log('[守護神の儀式] APIに送信:', ritualMessage, {
                conversationHistoryLength: conversationHistory.length,
                userMessagesBeforeRitual: userMessagesBeforeRitual,
                ritualUserMessageCount: ritualUserMessageCount
            });
            
            // 共通のAPI関数を使用（現在のメッセージを除く）
            // ゲスト履歴がある場合は、migrateHistoryオプションを追加
            const options = {
                migrateHistory: guestHistory && guestHistory.length > 0
            };
            
            const response = await ChatAPI.sendMessage(
                ritualMessage,
                character,
                conversationHistory.slice(0, -1), // 現在のメッセージを除く
                options
            );
            
            console.log('[守護神の儀式] APIレスポンス:', response);
            
            if (response.error) {
                console.error('[守護神の儀式] エラー:', response.error);
                ChatUI.addMessage('error', response.error, 'システム');
                // エラーの場合、追加したユーザーメッセージを削除
                conversationHistory.pop();
                return;
            }
            
            if (response.message) {
                console.log('[守護神の儀式] 成功、メッセージを表示:', response.message);
                ChatUI.addMessage('character', response.message, response.characterName || ChatData.characterInfo[character].name);
                
                // 会話履歴を更新（assistantの応答を追加）
                conversationHistory.push({ role: 'assistant', content: response.message });
                
                // 会話履歴を保存（登録ユーザーの場合）
                if (AuthState.isRegistered() && ChatData.conversationHistory) {
                    ChatData.conversationHistory.recentMessages = conversationHistory;
                }
                
                ChatUI.scrollToLatest();
                
                // アニメーション画面に遷移せず、直接メッセージを表示
            } else {
                console.error('[守護神の儀式] レスポンスにメッセージがありません:', response);
                ChatUI.addMessage('error', '守護神の儀式の開始に失敗しました（メッセージが空です）', 'システム');
                // エラーの場合、追加したユーザーメッセージを削除
                conversationHistory.pop();
            }
        } catch (error) {
            console.error('[守護神の儀式] 例外エラー:', error);
            ChatUI.addMessage('error', '守護神の儀式の開始に失敗しました: ' + error.message, 'システム');
        } finally {
            // 送信ボタンを再有効化
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
            
            // 守護神の儀式開始後、ゲスト履歴をクリア
            if (window.AuthState && typeof window.AuthState.clearGuestHistory === 'function') {
                AuthState.clearGuestHistory(character);
            }
            const GUEST_HISTORY_KEY_PREFIX = 'guestConversationHistory_';
            const historyKey = GUEST_HISTORY_KEY_PREFIX + character;
            sessionStorage.removeItem(historyKey);
            sessionStorage.removeItem('pendingGuestHistoryMigration');
            sessionStorage.removeItem('pendingRitualGuestHistory');
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
            console.log('[iframe] 親ウィンドウが存在しないため、準備完了通知をスキップしました');
            return false;
        }
    }
    
    // 即座に1回通知を試行
    let hasNotified = false;
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
        hasNotified,
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
        } else {
            console.log('[iframe] 親ウィンドウが存在しないため、準備完了通知をスキップしました');
        }
    }
    
    // 初期化完了後に準備完了を通知（複数のタイミングで確実に通知）
    let notifyAttempts = 0;
    const maxNotifyAttempts = 10;
    let notifyInterval = null;
    let hasNotified = false; // 既に通知済みかどうか
    
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
            console.log('[iframe] 親ウィンドウが存在しないため、準備完了通知をスキップしました');
            return false;
        }
    }
    
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
    
    // 3. 念のため定期通知（最大10回、2秒ごと）
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

