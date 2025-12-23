/**
 * chat-ui.js
 * UI更新とレンダリングを担当
 */

const ChatUI = {
    // DOM要素の参照
    messagesDiv: null,
    messageInput: null,
    sendButton: null,
    userStatus: null,
    characterHeader: null,
    characterHeaderImage: null,
    characterHeaderName: null,
    mobileHeaderTitle: null,

    /**
     * DOM要素を初期化
     */
    init() {
        this.messagesDiv = document.getElementById('messages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.userStatus = document.getElementById('userStatus');
        this.characterHeader = document.getElementById('characterHeader');
        this.characterHeaderImage = document.getElementById('characterHeaderImage');
        this.characterHeaderName = document.getElementById('characterHeaderName');
        this.mobileHeaderTitle = document.getElementById('mobileHeaderTitle');
    },

    /**
     * 鑑定士を設定（ヘッダー表示を更新）
     * @param {string} characterId - キャラクターID
     * @param {Object} characterInfo - キャラクター情報
     */
    setCurrentCharacter(characterId, characterInfo) {
        // #region agent log
        console.log('🔍🔍🔍 [ChatUI.setCurrentCharacter]', {
            引数のcharacterId: characterId,
            characterInfoが存在: !!characterInfo,
            characterInfoのキー: characterInfo ? Object.keys(characterInfo) : [],
            指定されたキャラクターが存在: characterInfo ? !!characterInfo[characterId] : false
        });
        // #endregion
        
        if (!characterInfo[characterId]) {
            console.warn('[ChatUI.setCurrentCharacter] ⚠️ characterInfo[' + characterId + '] が存在しないため、kaedeにフォールバックします');
            characterId = 'kaede';
        }
        
        const info = characterInfo[characterId];
        
        // PC版ヘッダー
        if (this.characterHeaderImage && this.characterHeaderName) {
            this.characterHeaderImage.src = info.image;
            this.characterHeaderImage.alt = info.name;
            this.characterHeaderName.textContent = info.name;
        }
        
        // モバイル版ヘッダー
        if (this.mobileHeaderTitle) {
            this.mobileHeaderTitle.innerHTML = '';
            
            const profileLink = document.createElement('a');
            profileLink.href = info.profileUrl;
            profileLink.style.textDecoration = 'none';
            profileLink.style.color = '#ffffff';
            profileLink.style.display = 'flex';
            profileLink.style.alignItems = 'center';
            profileLink.style.justifyContent = 'center';
            profileLink.style.gap = '8px';
            
            const iconImg = document.createElement('img');
            iconImg.src = info.image;
            iconImg.alt = info.name;
            iconImg.className = 'mobile-character-icon';
            
            const nameText = document.createElement('span');
            nameText.textContent = info.name;
            
            profileLink.appendChild(iconImg);
            profileLink.appendChild(nameText);
            this.mobileHeaderTitle.appendChild(profileLink);
        }
    },

    /**
     * ユーザーステータスを更新
     * @param {boolean} isRegistered - 登録済みかどうか
     * @param {Object} userData - ユーザーデータ（オプション）
     */
    updateUserStatus(isRegistered, userData = null) {
        if (!this.userStatus) return;
        
        if (isRegistered) {
            const nickname = userData?.nickname || localStorage.getItem('userNickname') || '鑑定者';
            const deityId = userData?.assignedDeity || localStorage.getItem('assignedDeity') || '未割当';
            const birthYear = userData?.birthYear || null;
            const birthMonth = userData?.birthMonth || null;
            const birthDay = userData?.birthDay || null;
            
            // 守護神名（データベースに日本語で保存されているのでそのまま使用）
            const deity = deityId;
            
            let statusText = `鑑定名義: ${nickname}`;
            
            if (birthYear && birthMonth && birthDay) {
                statusText += ` ｜ 生年月日: ${birthYear}年${birthMonth}月${birthDay}日`;
            }
            
            if (deity && deity !== '未割当') {
                statusText += ` ｜ 守護: ${deity}`;
            }
            
            this.userStatus.textContent = statusText;
            this.userStatus.className = 'user-status registered';
        } else {
            const guestCount = ChatData.getGuestMessageCount(ChatData.currentCharacter);
            const statusText = `ゲストモード（${guestCount}/${ChatData.GUEST_MESSAGE_LIMIT}通目）`;
            this.userStatus.textContent = statusText;
            this.userStatus.className = 'user-status guest';
        }
    },

    /**
     * メッセージを追加
     * @param {string} type - メッセージタイプ ('user', 'character', 'welcome', 'error', 'loading')
     * @param {string} text - メッセージテキスト
     * @param {string} sender - 送信者名
     * @param {Object} options - オプション
     * @returns {string} メッセージ要素のID
     */
    addMessage(type, text, sender, options = {}) {
        // #region agent log
        if (type === 'welcome') {
            fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-ui.js:133',message:'addMessage welcome呼び出し',data:{type,sender,textLength:text.length,textPreview:text.substring(0,200),containsOldMessage:text.includes('あなたさん、初めまして')||text.includes('システムからお聞き'),containsNewMessage:text.includes('はじめまして、笹岡雪乃です')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        }
        // #endregion
        if (!this.messagesDiv) return null;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        // IDを生成（指定されていない場合）
        const messageId = options.id || `message-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        messageDiv.id = messageId;
        
        if (type === 'character') {
            messageDiv.style.background = 'rgba(75, 0, 130, 0.9)';
            messageDiv.style.color = '#ffffff';
            messageDiv.style.border = 'none';
            messageDiv.style.boxShadow = 'none';
        }

        if (sender) {
            const headerDiv = document.createElement('div');
            headerDiv.className = 'message-header';
            headerDiv.textContent = sender;
            
            if (type === 'character') {
                headerDiv.style.color = 'rgba(255, 255, 255, 0.9)';
            }
            else if (type === 'user') {
                headerDiv.style.color = '#b794ff';
            }
            
            messageDiv.appendChild(headerDiv);
        }

        let displayText = text;
        const cardPattern = /【(過去|現在|未来)】([^\n]+)/g;
        const hasCardInfo = cardPattern.test(text);
        
        if (hasCardInfo) {
            displayText = text.replace(/【(過去|現在|未来)】[^\n]+\n?/g, '').trim();
            displayText = displayText.replace(/\n{3,}/g, '\n\n');
        }
        
        const textDiv = document.createElement('div');
        textDiv.textContent = displayText;
        messageDiv.appendChild(textDiv);

        if ((type === 'character' || type === 'welcome') && window.CharacterFeatures) {
            const sendMessageCallback = typeof window.sendMessage === 'function' ? window.sendMessage : null;
            if (window.CharacterFeatures.detect(ChatData.currentCharacter, text)) {
                window.CharacterFeatures.display(ChatData.currentCharacter, text, messageDiv, sendMessageCallback);
            }
        }

        this.messagesDiv.appendChild(messageDiv);
        
        // 雪乃のメッセージに「タロットカードを1枚引いてみましょう」が含まれている場合、1枚のカード鑑定を開始
        if ((type === 'character' || type === 'assistant') && 
            ChatData.currentCharacter === 'yukino' && 
            (text.includes('タロットカードを1枚引いてみましょう') || 
             text.includes('カードを1枚引いてみましょう') ||
             text.includes('タロットカードを1枚めくってみましょう') ||
             text.includes('カードを1枚めくってみましょう') ||
             text.includes('タロットカードを引いてみましょう') ||
             text.includes('タロットを1枚引いてみましょう') ||
             text.includes('タロットを引いてみましょう') ||
             text.includes('1枚引いてみましょう'))) {
            
            console.log('[chat-ui] 1枚のタロット鑑定を検出しました');
            
            // 安全策：入力欄が無効化されている場合（3枚鑑定中）はスキップ
            const messageInput = document.getElementById('messageInput');
            if (messageInput && messageInput.disabled) {
                console.log('[chat-ui] タロット鑑定中のため、1枚鑑定の自動開始をスキップします');
                return;
            }
            
            // 少し待ってから1枚のカード鑑定を開始
            setTimeout(() => {
                if (window.YukinoTarot && typeof window.YukinoTarot.startSingleCard === 'function') {
                    window.YukinoTarot.startSingleCard();
                } else {
                    console.error('[タロット占い] YukinoTarot.startSingleCardが見つかりません');
                }
            }, 500);
        }
        
        // 雪乃の初回メッセージの後に「タロット占い開始」ボタンを追加
        if ((type === 'welcome' || type === 'character') && 
            ChatData.currentCharacter === 'yukino' && 
            text.includes('それではまず、過去のカードをめくってみましょう')) {
            
            const buttonWrapper = document.createElement('div');
            buttonWrapper.style.width = '100%';
            buttonWrapper.style.display = 'flex';
            buttonWrapper.style.justifyContent = 'center';
            buttonWrapper.style.marginTop = '16px';
            buttonWrapper.style.marginBottom = '16px';
            
            const startButton = document.createElement('button');
            startButton.textContent = 'タロット占い開始';
            startButton.style.padding = '12px 32px';
            startButton.style.fontSize = '16px';
            startButton.style.fontWeight = '600';
            startButton.style.color = '#ffffff';
            startButton.style.backgroundColor = 'rgba(138, 43, 226, 0.8)';
            startButton.style.border = '2px solid rgba(138, 43, 226, 1)';
            startButton.style.borderRadius = '8px';
            startButton.style.cursor = 'pointer';
            startButton.style.transition = 'all 0.2s ease';
            startButton.style.boxShadow = '0 4px 16px rgba(138, 43, 226, 0.4)';
            
            startButton.addEventListener('mouseenter', () => {
                startButton.style.backgroundColor = 'rgba(138, 43, 226, 1)';
                startButton.style.transform = 'scale(1.05)';
            });
            startButton.addEventListener('mouseleave', () => {
                startButton.style.backgroundColor = 'rgba(138, 43, 226, 0.8)';
                startButton.style.transform = 'scale(1)';
            });
            
            startButton.addEventListener('click', () => {
                startButton.disabled = true;
                startButton.style.opacity = '0.5';
                startButton.style.cursor = 'not-allowed';
                
                // タロット占いを開始
                if (window.YukinoTarot && typeof window.YukinoTarot.start === 'function') {
                    window.YukinoTarot.start();
                } else {
                    console.error('[タロット占い] YukinoTarot.startが見つかりません');
                }
            });
            
            buttonWrapper.appendChild(startButton);
            messageDiv.appendChild(buttonWrapper);
            
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
            
            console.log('[chat-ui] 初回タロット鑑定ボタン表示 - 入力欄を無効化しました');
        }
        
        requestAnimationFrame(() => {
            this.scrollToLatest();
        });
        
        // メッセージIDを返す（待機メッセージの削除などに使用）
        return messageId;
    },

    /**
     * スクロールを最新に
     */
    scrollToLatest() {
        if (!this.messagesDiv) return;
        setTimeout(() => {
            this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;
        }, 50);
    },

    /**
     * 送信ボタンの表示/非表示を更新
     * 【重要】入力欄に文字が入力された時、いかなる場合でも送信ボタンが表示される
     */
    updateSendButtonVisibility() {
        if (!this.sendButton || !this.messageInput) return;
        
        if (this.messageInput.value.trim().length > 0) {
            // 入力欄に文字がある → 送信ボタンを表示（いかなる場合でも）
            this.sendButton.classList.add('visible');
            this.sendButton.disabled = false;
        } else {
            // 入力欄が空 → 送信ボタンを非表示
            this.sendButton.classList.remove('visible');
        }
    },

    /**
     * 守護神の儀式への同意ボタンを表示
     */
    showRitualConsentButtons() {
        // 既に表示されている、または一度表示された場合は表示しない
        if (ChatData.ritualConsentShown) {
            return;
        }
        
        const ritualConsentContainer = document.getElementById('ritualConsentContainer');
        if (ritualConsentContainer) {
            // 既に表示されている場合は表示しない
            if (ritualConsentContainer.classList.contains('visible')) {
                return;
            }
            
            ChatData.ritualConsentShown = true;
            ritualConsentContainer.style.display = 'block';
            requestAnimationFrame(() => {
                ritualConsentContainer.classList.add('visible');
            });
        }
    },

    /**
     * 守護神の儀式への同意ボタンを非表示
     */
    hideRitualConsentButtons() {
        const ritualConsentContainer = document.getElementById('ritualConsentContainer');
        if (ritualConsentContainer) {
            ritualConsentContainer.classList.remove('visible');
            setTimeout(() => {
                ritualConsentContainer.style.display = 'none';
            }, 500);
        }
    },

    /**
     * 守護神の儀式開始ボタンをメッセージの下に追加
     * @param {HTMLElement} messageElement - メッセージ要素
     * @param {Function} onClickHandler - ボタンクリック時のハンドラ
     */
    addRitualStartButton(messageElement, onClickHandler) {
        console.log('[addRitualStartButton] 呼び出されました', { messageElement, hasOnClickHandler: !!onClickHandler });
        if (!messageElement) {
            console.error('[addRitualStartButton] messageElementがnullです');
            return null;
        }
        
        // 既にボタンが追加されている場合は削除
        const existingButton = messageElement.querySelector('.ritual-start-button');
        if (existingButton) {
            console.log('[addRitualStartButton] 既存のボタンを削除します');
            existingButton.remove();
        }
        
        // ボタンコンテナを作成
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'ritual-start-button-container';
        buttonContainer.style.marginTop = '15px';
        buttonContainer.style.paddingTop = '15px';
        buttonContainer.style.borderTop = '1px solid rgba(255, 255, 255, 0.2)';
        
        // ボタンを作成
        const button = document.createElement('button');
        button.className = 'ritual-start-button';
        button.textContent = '守護神の儀式を始める';
        button.style.cssText = `
            width: 100%;
            padding: 12px 24px;
            background: linear-gradient(135deg, #8B3DFF 0%, #6A0DAD 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(139, 61, 255, 0.3);
        `;
        
        // ホバー効果
        button.addEventListener('mouseenter', () => {
            button.style.background = 'linear-gradient(135deg, #9B4DFF 0%, #7A1DBD 100%)';
            button.style.boxShadow = '0 6px 16px rgba(139, 61, 255, 0.4)';
            button.style.transform = 'translateY(-2px)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.background = 'linear-gradient(135deg, #8B3DFF 0%, #6A0DAD 100%)';
            button.style.boxShadow = '0 4px 12px rgba(139, 61, 255, 0.3)';
            button.style.transform = 'translateY(0)';
        });
        
        // クリックハンドラ
        button.addEventListener('click', async () => {
            button.disabled = true;
            button.textContent = '儀式を開始しています...';
            button.style.opacity = '0.7';
            button.style.cursor = 'wait';
            
            try {
                await onClickHandler();
            } catch (error) {
                console.error('[守護神の儀式] 開始エラー:', error);
                button.disabled = false;
                button.textContent = '守護神の儀式を始める';
                button.style.opacity = '1';
                button.style.cursor = 'pointer';
                ChatUI.addMessage('error', '守護神の儀式の開始中にエラーが発生しました。もう一度お試しください。', 'システム');
            }
        });
        
        buttonContainer.appendChild(button);
        messageElement.appendChild(buttonContainer);
        console.log('[addRitualStartButton] ボタンを追加しました', { messageElement, buttonContainer, button });
        
        // スクロールを最新に
        requestAnimationFrame(() => {
            this.scrollToLatest();
        });
        
        return button;
    },

    /**
     * 守護神の儀式開始ボタンが表示されているかチェック
     * @returns {boolean} ボタンが表示されているか
     */
    isRitualStartButtonVisible() {
        // 非表示になっているボタンは除外
        const button = document.querySelector('.ritual-start-button');
        if (!button) return false;
        
        // display: none が設定されていない、かつdisabledでないボタンを探す
        const visibleButton = Array.from(document.querySelectorAll('.ritual-start-button')).find(btn => {
            const style = window.getComputedStyle(btn);
            return style.display !== 'none' && !btn.disabled;
        });
        
        return visibleButton !== undefined;
    },

    /**
     * 守護神の儀式開始ボタンを再表示（メッセージ送信時に呼ばれる）
     */
    showRitualStartPrompt() {
        // 「まずは守護神の儀式を始めてください」メッセージを表示
        ChatUI.addMessage('error', 'まずは守護神の儀式を始めてください。上の「守護神の儀式を始める」ボタンを押してください。', 'システム');
        
        // 「それでは守護神の儀式を始めます」というメッセージを探して、ボタンを再表示
        const messages = document.querySelectorAll('#messages .message.character');
        for (let i = messages.length - 1; i >= 0; i--) {
            const message = messages[i];
            if (message.textContent.includes('それでは守護神の儀式を始めます')) {
                // 既にボタンがあるかチェック
                const existingButton = message.querySelector('.ritual-start-button');
                if (existingButton) {
                    // ボタンが非表示になっている場合は再表示
                    const buttonStyle = window.getComputedStyle(existingButton);
                    if (buttonStyle.display === 'none') {
                        existingButton.style.display = '';
                        const container = existingButton.closest('.ritual-start-button-container');
                        if (container) {
                            container.style.display = '';
                        }
                        console.log('[守護神の儀式] 既存のボタンを再表示しました');
                    }
                } else {
                    // ボタンが存在しない場合は、グローバルに公開された関数を使用して追加
                    console.log('[守護神の儀式] ボタンを新規追加します');
                    if (window.ChatInit && typeof window.ChatInit.addRitualStartButtonToMessage === 'function') {
                        window.ChatInit.addRitualStartButtonToMessage(message);
                    }
                }
                break;
            }
        }
    }
};

// グローバルスコープに公開（iframeからアクセスできるようにする）
window.ChatUI = ChatUI;

