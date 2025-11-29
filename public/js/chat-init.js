/**
 * chat-init.js
 * 初期化とメインロジックを担当
 */

const ChatInit = {
    /**
     * ページを初期化
     */
    async initPage() {
        // AuthStateを初期化
        if (window.AuthState && typeof AuthState.init === 'function') {
            AuthState.init();
        }
        
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
        
        // ユーザーステータスを更新
        ChatUI.updateUserStatus(!isGuestMode);

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
                            const characterName = ChatData.characterInfo[ChatData.currentCharacter]?.name || '鑑定士';
                            ChatUI.addMessage('error', `${characterName === '楓' ? '守護神の儀式' : 'ユーザー登録'}への同意が検出されました。ボタンが表示されます。`, 'システム');
                            setTimeout(() => {
                                ChatUI.showRitualConsentButtons();
                            }, 2000);
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
                            ChatUI.addMessage('error', '登録が必要です。守護神の儀式への同意ボタンが表示されます。', 'システム');
                            setTimeout(() => {
                                ChatUI.showRitualConsentButtons();
                            }, 3000);
                        } else if (data.registrationSuggested) {
                            const characterName = ChatData.characterInfo[ChatData.currentCharacter]?.name || '鑑定士';
                            ChatUI.addMessage('error', `${characterName === '楓' ? '守護神の儀式' : 'ユーザー登録'}への同意が検出されました。ボタンが表示されます。`, 'システム');
                            setTimeout(() => {
                                ChatUI.showRitualConsentButtons();
                            }, 2000);
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
        if (consent) {
            this.openRegistrationModal();
        } else {
            ChatUI.hideRitualConsentButtons();
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
     * 遅延処理
     * @param {number} ms - ミリ秒
     * @returns {Promise} Promise
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

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
});

