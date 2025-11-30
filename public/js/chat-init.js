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
        const justRegistered = urlParams.get('justRegistered') === 'true';
        console.log('[初期化] justRegistered:', justRegistered, 'isRegistered:', AuthState.isRegistered(), 'character:', character);
        
        // ユーザーステータスを更新（登録完了時はすぐに表示）
        if (justRegistered && AuthState.isRegistered()) {
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

        try {
            // 会話履歴を読み込む
            const historyData = await ChatAPI.loadConversationHistory(character);
            
            // 登録完了時の処理
            if (justRegistered && AuthState.isRegistered()) {
                console.log('[登録完了処理] 開始 - character:', character);
                // ゲスト履歴を完全にクリア（全キャラクター共通）
                if (window.AuthState && typeof window.AuthState.clearGuestHistory === 'function') {
                    AuthState.clearGuestHistory(character);
                }
                // sessionStorageのゲスト履歴もクリア
                const GUEST_HISTORY_KEY_PREFIX = 'guestConversationHistory_';
                const historyKey = GUEST_HISTORY_KEY_PREFIX + character;
                sessionStorage.removeItem(historyKey);
                sessionStorage.removeItem('pendingGuestHistoryMigration');
                // ゲストメッセージカウントもリセット
                ChatData.setGuestMessageCount(character, 0);
                
                // カエデの場合は守護神の儀式を自動開始
                if (character === 'kaede') {
                    console.log('[登録完了処理] カエデの場合、守護神の儀式を開始');
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
                    ChatUI.addMessage('character', ritualStartMessage, ChatData.characterInfo[character].name);
                    
                    // 自動的に守護神の儀式を開始（APIにメッセージを送信）
                    console.log('[登録完了処理] 1秒待機後に守護神の儀式を開始');
                    await this.delay(1000);
                    console.log('[登録完了処理] 守護神の儀式を開始します');
                    await this.startGuardianRitual(character);
                    
                    // URLパラメータからjustRegisteredを削除
                    urlParams.delete('justRegistered');
                    const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
                    window.history.replaceState({}, '', newUrl);
                    
                    return;
                } else {
                    // 他のキャラクターの場合、通常の初回メッセージを表示
                    const info = ChatData.characterInfo[character];
                    const firstTimeMessage = ChatData.generateFirstTimeMessage(character, ChatData.userNickname || 'あなた');
                    ChatUI.addMessage('welcome', firstTimeMessage, info.name);
                    
                    // URLパラメータからjustRegisteredを削除
                    urlParams.delete('justRegistered');
                    const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
                    window.history.replaceState({}, '', newUrl);
                    
                    return;
                }
            }
            
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
        const pendingMigration = sessionStorage.getItem('pendingGuestHistoryMigration');
        if (pendingMigration) {
            try {
                const migrationData = JSON.parse(pendingMigration);
                if (migrationData.character === character && migrationData.history) {
                    return migrationData.history;
                }
            } catch (error) {
                console.error('Error parsing pending guest history migration:', error);
            }
        }
        
        if (window.AuthState && typeof window.AuthState.getGuestHistory === 'function') {
            const history = AuthState.getGuestHistory(character) || [];
            if (history.length > 0) {
                sessionStorage.setItem('pendingGuestHistoryMigration', JSON.stringify({
                    character: character,
                    history: history
                }));
            }
            return history;
        }
        
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

        const isGuest = !AuthState.isRegistered();
        if (isGuest) {
            const guestCount = ChatData.getGuestMessageCount(character);
            
            if (guestCount >= ChatData.GUEST_MESSAGE_LIMIT) {
                ChatUI.addMessage('error', 'これ以上鑑定を続けるには正式な登録が必要です。登録ボタンから手続きをお願いします。', 'システム');
                setTimeout(() => {
                    window.location.href = '../auth/register.html?redirect=' + encodeURIComponent(window.location.href);
                }, 2000);
                return;
            }
            
            ChatData.setGuestMessageCount(character, guestCount + 1);
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
            const userMessageData = {
                message: messageToSend,
                character: character,
                timestamp: new Date().toISOString()
            };
            sessionStorage.setItem('lastUserMessage', JSON.stringify(userMessageData));
            
            if (isGuest) {
                ChatData.addToGuestHistory(character, 'user', messageToSend);
                
                // メッセージ送信直後に親ウィンドウに通知（分析パネル更新用）
                if (window.parent && window.parent !== window) {
                    try {
                        const messageCount = ChatData.getGuestMessageCount(character);
                        window.parent.postMessage({
                            type: 'CHAT_MESSAGE_SENT',
                            character: character,
                            userType: 'guest',
                            messageCount: messageCount,
                            timestamp: Date.now()
                        }, '*');
                        console.log('[iframe] メッセージ送信を親ウィンドウに通知しました（送信時）');
                    } catch (error) {
                        console.error('[iframe] メッセージ送信通知エラー:', error);
                    }
                }
            }
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
                            
                            window.parent.postMessage({
                                type: 'CHAT_MESSAGE_SENT',
                                character: character,
                                userType: isRegistered ? 'registered' : 'guest',
                                messageCount: messageCount,
                                timestamp: Date.now()
                            }, '*');
                            console.log('[iframe] メッセージ送信完了を親ウィンドウに通知しました（応答受信後）');
                        } catch (error) {
                            console.error('[iframe] メッセージ送信通知エラー:', error);
                        }
                    }
                    
                    const isGuest = !AuthState.isRegistered();
                    if (isGuest) {
                        ChatData.addToGuestHistory(ChatData.currentCharacter, 'assistant', data.message);
                        
                        const guestCount = ChatData.getGuestMessageCount(ChatData.currentCharacter);
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
        window.location.href = '../auth/register.html?redirect=' + encodeURIComponent(window.location.href);
    },

    /**
     * 守護神の儀式を開始
     * @param {string} character - キャラクターID
     */
    async startGuardianRitual(character) {
        console.log('[守護神の儀式] 開始:', character);
        
        // 送信ボタンを無効化
        if (ChatUI.sendButton) ChatUI.sendButton.disabled = true;
        
        try {
            // 会話履歴を取得（登録直後は空のはず）
            const historyData = await ChatAPI.loadConversationHistory(character);
            console.log('[守護神の儀式] 会話履歴データ:', historyData);
            
            // 登録直後は会話履歴が空なので、空配列を使用
            let conversationHistory = (historyData && historyData.hasHistory && historyData.recentMessages) 
                ? [...historyData.recentMessages] // コピーを作成
                : [];
            
            // ChatData.conversationHistoryを更新（存在する場合）
            if (historyData) {
                ChatData.conversationHistory = historyData;
            }
            
            console.log('[守護神の儀式] 使用する会話履歴:', conversationHistory);
            
            // 守護神の儀式開始メッセージを会話履歴に追加（表示はしない）
            const ritualMessage = '守護神の儀式を始めてください';
            conversationHistory.push({ role: 'user', content: ritualMessage });
            
            console.log('[守護神の儀式] APIに送信:', ritualMessage);
            
            // 共通のAPI関数を使用（現在のメッセージを除く）
            const response = await ChatAPI.sendMessage(
                ritualMessage,
                character,
                conversationHistory.slice(0, -1) // 現在のメッセージを除く
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
    }
};

// グローバルスコープに公開（iframeからアクセスできるようにする）
window.ChatInit = ChatInit;

// グローバル関数として公開
window.sendMessage = () => ChatInit.sendMessage();
window.handleRitualConsent = (consent) => ChatInit.handleRitualConsent(consent);

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
    const maxNotifyAttempts = 5;
    let notifyInterval = null;
    
    // 1. DOMContentLoaded時に即座に1回通知
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                if (ChatData && window.AuthState) {
                    notifyParentReady();
                }
            }, 500);
        });
    } else {
        // 既にDOMContentLoaded済みの場合は即座に実行
        setTimeout(() => {
            if (ChatData && window.AuthState) {
                notifyParentReady();
            }
        }, 500);
    }
    
    // 2. window.load時に1回通知（リソース読み込み完了後）
    if (document.readyState !== 'complete') {
        window.addEventListener('load', () => {
            setTimeout(() => {
                if (ChatData && window.AuthState) {
                    notifyParentReady();
                }
            }, 500);
        });
    }
    
    // 3. 念のため定期通知（最大5回）
    notifyInterval = setInterval(() => {
        notifyAttempts++;
        if (ChatData && window.AuthState) {
            notifyParentReady();
            if (notifyAttempts >= 3) {
                // 3回通知したら停止（DOMContentLoaded、load、定期で十分）
                clearInterval(notifyInterval);
            }
        } else if (notifyAttempts >= maxNotifyAttempts) {
            clearInterval(notifyInterval);
            console.warn('[iframe] 準備完了通知の最大試行回数に達しました');
        }
    }, 1500); // 1.5秒ごとに試行
    
    // 管理者用コマンドハンドラー（postMessage）
    window.addEventListener('message', async (event) => {
        // セキュリティのため、同じオリジンのみ受け入れる
        if (event.origin !== window.location.origin) {
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
                try {
                    const character = ChatData?.currentCharacter || 'unknown';
                    const isRegistered = window.AuthState?.isRegistered() || false;
                    
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
                        messageCount = ChatData?.getGuestMessageCount(character) || 0;
                        conversationHistory = ChatData?.getGuestHistory(character) || [];
                    }
                    
                    // 現在の状態を取得
                    const currentState = {
                        character: character,
                        userType: isRegistered ? 'registered' : 'guest',
                        messageCount: messageCount,
                        conversationHistoryLength: conversationHistory.length,
                        isRegistered: isRegistered
                    };
                    
                    // 親ウィンドウにデータを送信
                    event.source.postMessage({
                        type: 'CHAT_DATA_RESPONSE',
                        data: {
                            character: character,
                            userType: isRegistered ? 'registered' : 'guest',
                            messageCount: messageCount,
                            conversationHistory: conversationHistory,
                            currentState: currentState,
                            timestamp: Date.now()
                        }
                    }, event.origin);
                    
                    console.log('[iframe] チャットデータを親ウィンドウに送信しました', currentState);
                } catch (error) {
                    console.error('[iframe] チャットデータ取得エラー:', error);
                    event.source.postMessage({
                        type: 'CHAT_DATA_ERROR',
                        error: error.message
                    }, event.origin);
                }
                break;
        }
    });
});

