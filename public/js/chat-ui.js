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
            // 【変更】userDataからのみ取得（localStorageは使用しない）
            if (!userData) {
                console.warn('[ChatUI] updateUserStatus: userDataが提供されていません');
                return;
            }
            
            const nickname = userData.nickname || '鑑定者';
            const deityId = userData.assignedDeity || '未割当';
            const birthYear = userData.birthYear || null;
            const birthMonth = userData.birthMonth || null;
            const birthDay = userData.birthDay || null;
            
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
            const statusText = `ゲストモード`;
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
            const stackTrace = new Error().stack;
            // 重複チェック: 同じ内容のwelcomeメッセージが既に表示されているか確認
            const existingMessages = this.messagesDiv?.querySelectorAll('.message.welcome') || [];
            const isDuplicate = Array.from(existingMessages).some(msg => {
                const textDiv = msg.querySelector('.message-text');
                return textDiv && textDiv.textContent === text;
            });
            
            fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-ui.js:138',message:'addMessage welcome呼び出し',data:{type,sender,textLength:text.length,textPreview:text.substring(0,200),containsReturningMessage:text.includes('また私に会いに来てくれてありがとう'),isDuplicate,existingWelcomeCount:existingMessages.length,stackTrace:stackTrace?.split('\n').slice(0,10).join(' | ')},timestamp:Date.now(),runId:'debug-run',hypothesisId:'E'})}).catch(()=>{});
            
            if (isDuplicate) {
                console.warn('[ChatUI] 重複したwelcomeメッセージを検出しました。スキップします。', text.substring(0, 100));
                return null;
            }
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
        textDiv.className = 'message-text';
        textDiv.textContent = displayText;
        messageDiv.appendChild(textDiv);

        if ((type === 'character' || type === 'welcome') && window.CharacterFeatures) {
            const sendMessageCallback = typeof window.sendMessage === 'function' ? window.sendMessage : null;
            if (window.CharacterFeatures.detect(ChatData.currentCharacter, text)) {
                window.CharacterFeatures.display(ChatData.currentCharacter, text, messageDiv, sendMessageCallback);
            }
        }

        this.messagesDiv.appendChild(messageDiv);
        
        // メッセージ追加後、ハンドラーのコールバックを呼び出す（鑑定士固有の処理を委譲）
        // これにより、chat-ui.jsに鑑定士固有の処理を記述する必要がなくなる
        if (window.CharacterRegistry && ChatData && ChatData.currentCharacter) {
            const handler = CharacterRegistry.get(ChatData.currentCharacter);
            if (handler && typeof handler.onMessageAdded === 'function') {
                try {
                    handler.onMessageAdded(type, text, sender, messageDiv, messageId, options);
                } catch (error) {
                    console.error(`[chat-ui] ハンドラーのonMessageAddedでエラーが発生しました (${ChatData.currentCharacter}):`, error);
                }
            }
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
     * メッセージをすべてクリア
     */
    clearMessages() {
        if (!this.messagesDiv) return;
        this.messagesDiv.innerHTML = '';
        console.log('[ChatUI] メッセージをクリアしました');
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
     * 守護神の儀式への同意ボタンを表示（汎用関数）
     * 注意: キャラクター固有のロジックはハンドラー側で処理されます
     */
    showRitualConsentButtons(questionText = '守護神の儀式を始めますか？') {
        // 既に表示されている、または一度表示された場合は表示しない
        if (ChatData.ritualConsentShown) {
            return;
        }
        
        const ritualConsentContainer = document.getElementById('ritualConsentContainer');
        const ritualConsentQuestion = document.getElementById('ritualConsentQuestion');
        
        if (ritualConsentContainer) {
            // 既に表示されている場合は表示しない
            if (ritualConsentContainer.classList.contains('visible')) {
                return;
            }
            
            // 質問テキストを設定（ハンドラーから渡されたテキストを使用）
            if (ritualConsentQuestion) {
                ritualConsentQuestion.textContent = questionText;
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
     * 注意: この関数は削除されました。必要に応じてハンドラー側で処理してください。
     * @deprecated この関数は削除されました。ハンドラー側で処理してください。
     */
    showRitualStartPrompt() {
        // この関数は削除されました。ハンドラー側で処理してください。
        console.warn('[chat-ui] showRitualStartPrompt()は削除されました。ハンドラー側で処理してください。');
    }
};

// グローバルスコープに公開（iframeからアクセスできるようにする）
window.ChatUI = ChatUI;

