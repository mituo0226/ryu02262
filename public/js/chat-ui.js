/**
 * chat-ui.js
 * UI更新とレンダリングを担当
 * 
 * 重要: このファイルの変更は、chat-test.html（テスト環境）にも必ず反映してください。
 * chat-test.html は本番環境のチャットの動きを簡易的に試験するために設置されたテスト版です。
 * 詳細は docs/CHAT_TEST_SYNC_REQUIREMENT.md を参照してください。
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
        if (!characterInfo[characterId]) {
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
            const deity = userData?.assignedDeity || localStorage.getItem('assignedDeity') || '未割当';
            const birthYear = userData?.birthYear || null;
            const birthMonth = userData?.birthMonth || null;
            const birthDay = userData?.birthDay || null;
            
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
     */
    addMessage(type, text, sender, options = {}) {
        if (!this.messagesDiv) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        if (options.id) {
            messageDiv.id = options.id;
        }
        
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

        if (type === 'character' && window.CharacterFeatures) {
            const sendMessageCallback = typeof window.sendMessage === 'function' ? window.sendMessage : null;
            if (window.CharacterFeatures.detect(ChatData.currentCharacter, text)) {
                window.CharacterFeatures.display(ChatData.currentCharacter, text, messageDiv, sendMessageCallback);
            }
        }

        this.messagesDiv.appendChild(messageDiv);
        
        requestAnimationFrame(() => {
            this.scrollToLatest();
        });
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
     */
    updateSendButtonVisibility() {
        if (!this.sendButton || !this.messageInput) return;
        
        if (this.messageInput.value.trim().length > 0) {
            this.sendButton.classList.add('visible');
        } else {
            this.sendButton.classList.remove('visible');
        }
    },

    /**
     * 守護神の儀式への同意ボタンを表示
     */
    showRitualConsentButtons() {
        const ritualConsentContainer = document.getElementById('ritualConsentContainer');
        if (ritualConsentContainer) {
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
    }
};

