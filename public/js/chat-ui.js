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
        
        // 【変更】現在はすべて登録済みユーザーのみなので、常に登録済みとして扱う
        // userDataが提供されていない場合は、デフォルト値を表示
        if (!userData) {
            console.warn('[ChatUI] updateUserStatus: userDataが提供されていません');
            this.userStatus.textContent = '鑑定名義: 鑑定者';
            this.userStatus.className = 'user-status registered';
            return;
        }
        
        const nickname = userData.nickname || '鑑定者';
        const deityId = userData.assignedDeity || '未割当';
        const birthYear = userData.birthYear || null;
        const birthMonth = userData.birthMonth || null;
        const birthDay = userData.birthDay || null;
        
        // 守護神名（データベースに日本語で保存されているのでそのまま使用）
        const deity = deityId;
        
        let statusText = `�定名義: ${nickname}`;
        
        if (birthYear && birthMonth && birthDay) {
            statusText += ` ｜ 生年月日: ${birthYear}年${birthMonth}月${birthDay}日`;
        }
        
        if (deity && deity !== '未割当') {
            statusText += ` ｜ 守護: ${deity}`;
        }
        
        this.userStatus.textContent = statusText;
        this.userStatus.className = 'user-status registered';
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
        // 1. 入力値の検証
        if (!this.messagesDiv) return null;
        
        if (typeof text !== 'string') {
            console.error('[ChatUI.addMessage] テキストが文字列ではありません', {
                type,
                sender,
                textType: typeof text,
            });
            if (Array.isArray(text)) {
                text = text.map(item => typeof item === 'object' ? JSON.stringify(item) : String(item)).join(', ');
            } else if (text && typeof text === 'object') {
                text = text.message || text.content || JSON.stringify(text);
            } else {
                text = String(text);
            }
        }
        
        // 2. 重複チェック（welcomeの場合）
        if (type === 'welcome') {
            const existingMessages = this.messagesDiv?.querySelectorAll('.message.welcome') || [];
            const isDuplicate = Array.from(existingMessages).some(msg => {
                const textDiv = msg.querySelector('.message-text');
                return textDiv && textDiv.textContent === text;
            });
            
            if (isDuplicate) {
                console.warn('[ChatUI] 重複したwelcomeメッセージをスキップ', text.substring(0, 100));
                return null;
            }
        }
        
        // 3. メッセージ ID の生成
        const messageId = options.id || `message-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // 4. テキスト処理（タグの削除、カード情報の抽出など）
        let displayText = text;
        const cardPattern = /【(過去|現在|未来)】([^\n]+)/g;
        const hasCardInfo = cardPattern.test(text);
        
        if (hasCardInfo) {
            displayText = text.replace(/【(過去|現在|未来)】[^\n]+\n?/g, '').trim();
            displayText = displayText.replace(/\n{3,}/g, '\n\n');
        }
        
        const displayTextWithoutTag = displayText.replace(/\[SUGGEST_TAROT\]/g, '');
        
        // 5. messageDiv の作成
        const messageDiv = document.createElement('div');
        messageDiv.id = messageId;
        
        // type に応じたクラス設定
        if (type === 'loading') {
            messageDiv.className = 'message loading-message';
        } else {
            messageDiv.className = `message ${type}`;
        }
        
        // 6. type 別のスタイル設定
        if (type === 'character') {
            messageDiv.style.background = 'rgba(75, 0, 130, 0.9)';
            messageDiv.style.color = '#ffffff';
        } else if (type === 'loading') {
            messageDiv.style.background = 'rgba(75, 0, 130, 0.95)';
            messageDiv.style.color = '#ffd700';
            messageDiv.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.3), 0 0 40px rgba(138, 43, 226, 0.2)';
        }
        
        // 7. ヘッダー（送信者名）の作成
        if (sender) {
            const headerDiv = document.createElement('div');
            headerDiv.className = 'message-header';
            headerDiv.textContent = sender;
            
            if (type === 'character') {
                headerDiv.style.color = 'rgba(255, 255, 255, 0.9)';
            } else if (type === 'loading') {
                headerDiv.style.color = '#ffd700';
                headerDiv.style.textShadow = '0 0 10px rgba(255, 215, 0, 0.8), 0 0 20px rgba(138, 43, 226, 0.6)';
            } else if (type === 'user') {
                headerDiv.style.color = '#b794ff';
            }
            
            messageDiv.appendChild(headerDiv);
        }
        
        // 8. テキスト表示用の div を作成
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.textContent = displayTextWithoutTag;
        
        if (type === 'loading') {
            textDiv.style.color = '#ffd700';
            textDiv.style.textShadow = '0 0 10px rgba(255, 215, 0, 0.8), 0 0 20px rgba(138, 43, 226, 0.6), 0 0 30px rgba(255, 107, 157, 0.4)';
            textDiv.style.textAlign = 'center';
            textDiv.style.lineHeight = '1.8';
        }
        
        messageDiv.appendChild(textDiv);
        
        // 9. loading タイプの特殊処理
        if (type === 'loading') {
            // チャットコンテナに waiting-for-response クラスを追加
            const chatContainer = this.messagesDiv.closest('.chat-container');
            if (chatContainer) {
                chatContainer.classList.add('waiting-for-response');
            }
            
            // 動的メッセージ変更機能を設定
            this._setupLoadingMessageAnimation(messageDiv, textDiv);
        }
        
        // 10. messageDiv を DOM に追加（先頭に挿入）
        if (this.messagesDiv.firstChild) {
            this.messagesDiv.insertBefore(messageDiv, this.messagesDiv.firstChild);
        } else {
            this.messagesDiv.appendChild(messageDiv);
        }
        
        // 11. onMessageAdded コールバックを実行
        if (this.onMessageAdded) {
            this.onMessageAdded(type, text, sender);
        }
        
        return messageId;
    }

    /**
     * loading メッセージのアニメーション処理（改善版：神秘的で落ち着きのある演出）
     */
    _setupLoadingMessageAnimation(messageDiv, textDiv) {
        const waitingMessages = [
            '深く思索しています...',
            'あなたの心を感じ取っています...',
            'タロットの導きを求めています...',
            '未来の糸を辿っています...',
            '答えの光を探しています...'
        ];
        
        let messageIndex = 0;
        
        // 2.5秒ごとにメッセージを変更（落ち着きのあるペース）
        const messageChangeInterval = setInterval(() => {
            // メッセージが削除されたら停止
            if (!messageDiv.parentNode) {
                clearInterval(messageChangeInterval);
                return;
            }
            
            // メッセージインデックスを更新
            messageIndex = (messageIndex + 1) % waitingMessages.length;
            
            // テキストをフェードアウト（0.6秒）
            textDiv.style.transition = 'opacity 0.6s ease-in-out';
            textDiv.style.opacity = '0.4';
            
            // 600ms後にテキストを変更してフェードイン
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    textDiv.textContent = waitingMessages[messageIndex];
                    textDiv.style.transition = 'opacity 0.8s ease-in-out';
                    textDiv.style.opacity = '1';
                }
            }, 600);
        }, 2500);
        
        // インターバル ID を保存（後でクリア可能にするため）
        messageDiv.dataset.messageChangeInterval = messageChangeInterval;
    },

    /**
     * スクロールを最新に（スムーズスクロール対応）
     */
    scrollToLatest() {
        if (!this.messagesDiv) return;
        setTimeout(() => {
            this.messagesDiv.scrollTo({
                top: this.messagesDiv.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    },

    /**
     * メッセージをすべてクリア
     */
    clearMessages() {
        if (!this.messagesDiv) return;
        this.messagesDiv.innerHTML = '';
    },

    /**
     * 「考え中...」メッセージを追加
     * @param {string} characterName - キャラクター名
     * @returns {HTMLElement} 作成されたメッセージ要素
     */
    addThinkingMessage(characterName) {
        if (!this.messagesDiv) return null;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant welcome thinking';
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.textContent = characterName ? characterName[0] : '?';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'thinking-indicator';
        thinkingDiv.innerHTML = `
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
        `;
        
        contentDiv.appendChild(thinkingDiv);
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        this.messagesDiv.appendChild(messageDiv);
        this.scrollToLatest();
        
        return messageDiv;
    },

    /**
     * 「考え中...」を実際のメッセージに置き換え
     * @param {HTMLElement} thinkingElement - 「考え中...」要素
     * @param {string} message - 置き換えるメッセージ
     */
    replaceThinkingMessage(thinkingElement, message) {
        if (!thinkingElement || !this.messagesDiv) {
            console.warn('[ChatUI.replaceThinkingMessage] 無効な引数:', {
                thinkingElement: !!thinkingElement,
                messagesDiv: !!this.messagesDiv
            });
            return;
        }
        
        const contentDiv = thinkingElement.querySelector('.message-content');
        if (!contentDiv) {
            console.error('[ChatUI.replaceThinkingMessage] .message-contentが見つかりません:', thinkingElement);
            return;
        }
        
        // [SUGGEST_TAROT]タグは削除しない
        // onMessageAddedで検出してボタンを表示するためのマーカーとして使用する
        const cleanedMessage = message;
        
        console.log('[ChatUI.replaceThinkingMessage] メッセージを置き換えます:', {
            messageLength: cleanedMessage?.length || 0,
            hasContentDiv: !!contentDiv
        });
        
        // アニメーション付きで置き換え
        contentDiv.style.transition = 'opacity 0.2s ease';
        contentDiv.style.opacity = '0';
        
        setTimeout(() => {
            // thinking-indicatorを削除
            const thinkingIndicator = contentDiv.querySelector('.thinking-indicator');
            if (thinkingIndicator) {
                thinkingIndicator.remove();
            }
            
            contentDiv.innerHTML = '';
            const textDiv = document.createElement('div');
            textDiv.className = 'message-text';
            // [SUGGEST_TAROT]タグを表示テキストから削除（ユーザーには見えないようにする）
            // onMessageAddedには元のcleanedMessage（削除前）を渡すことで、検出できるようにする
            const displayMessageWithoutTag = cleanedMessage.replace(/\[SUGGEST_TAROT\]/g, '');
            textDiv.textContent = displayMessageWithoutTag;
            contentDiv.appendChild(textDiv);
            contentDiv.style.opacity = '1';
            
            // キャラクター固有の処理をハンドラーのonMessageAddedに委譲
            // replaceThinkingMessageでもonMessageAddedを呼び出すことで、キャラクター固有の処理を統一
            if (window.CharacterRegistry && ChatData && ChatData.currentCharacter) {
                const handler = CharacterRegistry.get(ChatData.currentCharacter);
                if (handler && typeof handler.onMessageAdded === 'function') {
                    // thinkingElementをmessageDivとして扱う
                    const messageDiv = thinkingElement;
                    const messageId = messageDiv.id || `message-${Date.now()}`;
                    try {
                        // typeを推測（thinkingElementのクラスから）
                        const messageType = thinkingElement.classList.contains('welcome') ? 'welcome' : 
                                           thinkingElement.classList.contains('character') ? 'character' : 'assistant';
                        const sender = ChatData.characterInfo?.[ChatData.currentCharacter]?.name || 'キャラクター';
                        handler.onMessageAdded(messageType, cleanedMessage, sender, messageDiv, messageId, {});
                    } catch (error) {
                        console.error(`[ChatUI.replaceThinkingMessage] onMessageAddedでエラーが発生しました (${ChatData.currentCharacter}):`, error);
                    }
                }
            }
            
            // thinkingクラスを削除
            thinkingElement.classList.remove('thinking');
            
            this.scrollToLatest();
            console.log('[ChatUI.replaceThinkingMessage] メッセージの置き換えが完了しました');
        }, 200);
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
     * 注意: ボタン要素はハンドラー側で動的に生成されます（HTMLには含めない）
     */
    showRitualConsentButtons(questionText = '守護神の儀式を始めますか？') {
        // 既に表示されている、または一度表示された場合は表示しない
        if (ChatData.ritualConsentShown) {
            return;
        }
        
        const ritualConsentContainer = document.getElementById('ritualConsentContainer');
        const ritualConsentQuestion = document.getElementById('ritualConsentQuestion');
        
        // 要素が存在しない場合は何もしない（ハンドラー側で事前に生成する必要がある）
        if (!ritualConsentContainer) {
            console.warn('[ChatUI] 守護神の儀式への同意ボタンが存在しません。ハンドラー側で事前に生成してください。');
            return;
        }
        
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
