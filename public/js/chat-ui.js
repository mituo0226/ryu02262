/**
 * chat-ui.js
 * UI更新とレンダリングを担当
 */

// ============================================
// 定数定義
// ============================================

// デバッグ設定
const DEBUG_MODE = true; // デバッグ用: 問題追跡中のため有効化

/**
 * デバッグログ出力（本番では無効化）
 * @param {...any} args - console.logに渡す引数
 */
function debugLog(...args) {
    if (DEBUG_MODE) {
        const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
        if (typeof addToTimeline === 'function') {
            addToTimeline('chat-ui.js', message);
        }
        console.log(...args);
    }
}

// カラー定数
const COLORS = {
    // キャラクターメッセージ
    CHARACTER_BG: 'rgba(75, 0, 130, 0.9)',
    CHARACTER_BG_LOADING: 'rgba(75, 0, 130, 0.95)',
    CHARACTER_TEXT: '#ffffff',
    CHARACTER_HEADER_TEXT: 'rgba(255, 255, 255, 0.9)',
    // ローディング
    LOADING_TEXT: '#ffd700',
    LOADING_SHADOW_PRIMARY: 'rgba(255, 215, 0, 0.3)',
    LOADING_SHADOW_SECONDARY: 'rgba(138, 43, 226, 0.2)',
    // モバイルヘッダー
    MOBILE_HEADER_TEXT: '#ffffff',
};

// タイミング定数（ミリ秒）
const TIMING = {
    THINKING_REPLACE_DELAY: 200,
    SCROLL_DELAY: 100,
    FADE_IN_DELAY: 100,
    SCROLL_REQUEST_DELAY: 200,
};

// メッセージタイプ定数
const MESSAGE_TYPES = {
    USER: 'user',
    CHARACTER: 'character',
    WELCOME: 'welcome',
    ERROR: 'error',
    LOADING: 'loading',
};

// CSS クラス名定数
const CSS_CLASSES = {
    MESSAGE: 'message',
    LOADING_MESSAGE: 'loading-message',
    MESSAGE_HEADER: 'message-header',
    MESSAGE_TEXT: 'message-text',
    THINKING: 'thinking',
    VISIBLE: 'visible',
    WELCOME: 'welcome',
    MOBILE_CHARACTER_ICON: 'mobile-character-icon',
    MOBILE_PROFILE_LINK: 'mobile-profile-link',
    USER_STATUS_REGISTERED: 'user-status registered',
};

// デフォルト値定数
const DEFAULTS = {
    NICKNAME: '鑑定者',
    DEITY: '未割当',
    FALLBACK_CHARACTER: 'kaede',
};

// 正規表現パターン
const PATTERNS = {
    CARD_INFO: /【(過去|現在|未来)】([^\n]+)/g,
    CARD_TAG: /【(過去|現在|未来)】[^\n]+\n?/g,
    MULTIPLE_NEWLINES: /\n{3,}/g,
    SUGGEST_TAROT_TAG: /\[SUGGEST_TAROT\]/g,
};

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
        debugLog('🔍🔍🔍 [ChatUI.setCurrentCharacter]', {
            引数のcharacterId: characterId,
            characterInfoが存在: !!characterInfo,
            characterInfoのキー: characterInfo ? Object.keys(characterInfo) : [],
            指定されたキャラクターが存在: characterInfo ? !!characterInfo[characterId] : false
        });
        
        if (!characterInfo || typeof characterInfo !== 'object') {
            console.error('[ChatUI.setCurrentCharacter] characterInfoが無効です');
            return;
        }
        
        if (!characterInfo[characterId]) {
            console.warn(`[ChatUI.setCurrentCharacter] characterInfo[${characterId}] が存在しないため、${DEFAULTS.FALLBACK_CHARACTER}にフォールバックします`);
            characterId = DEFAULTS.FALLBACK_CHARACTER;
            if (!characterInfo[characterId]) {
                console.error(`[ChatUI.setCurrentCharacter] フォールバック先 (${DEFAULTS.FALLBACK_CHARACTER}) も存在しません`);
                return;
            }
        }
        
        const info = characterInfo[characterId];
        
        if (this.characterHeaderImage && this.characterHeaderName) {
            this.characterHeaderImage.src = info.image;
            this.characterHeaderImage.alt = info.name;
            this.characterHeaderName.textContent = info.name;
        }
        
        if (this.mobileHeaderTitle) {
            this.mobileHeaderTitle.innerHTML = '';
            const profileLink = document.createElement('a');
            profileLink.href = info.profileUrl;
            profileLink.className = CSS_CLASSES.MOBILE_PROFILE_LINK;
            const iconImg = document.createElement('img');
            iconImg.src = info.image;
            iconImg.alt = info.name;
            iconImg.className = CSS_CLASSES.MOBILE_CHARACTER_ICON;
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
        if (!this.userStatus) {
            console.warn('[ChatUI.updateUserStatus] userStatus要素が見つかりません');
            return;
        }
        if (!userData) {
            console.warn('[ChatUI.updateUserStatus] userDataが提供されていません');
            this.userStatus.textContent = `鑑定名義: ${DEFAULTS.NICKNAME}`;
            this.userStatus.className = CSS_CLASSES.USER_STATUS_REGISTERED;
            return;
        }
        const nickname = userData.nickname || DEFAULTS.NICKNAME;
        const deityId = userData.assignedDeity || DEFAULTS.DEITY;
        const birthYear = userData.birthYear || null;
        const birthMonth = userData.birthMonth || null;
        const birthDay = userData.birthDay || null;
        
        // 守護神名（データベースに日本語で保存されているのでそのまま使用）
        const deity = deityId;
        
        let statusText = `鑑定名義: ${nickname}`;
        
        if (birthYear && birthMonth && birthDay) {
            statusText += ` ｜ 生年月日: ${birthYear}年${birthMonth}月${birthDay}日`;
        }
        
        if (deity && deity !== DEFAULTS.DEITY) {
            statusText += ` ｜ 守護: ${deity}`;
        }
        this.userStatus.textContent = statusText;
        this.userStatus.className = CSS_CLASSES.USER_STATUS_REGISTERED;
    },

    /**
     * メッセージを追加
     * @param {('user'|'character'|'welcome'|'error'|'loading')} type - メッセージタイプ
     * @param {string} text - メッセージテキスト
     * @param {string} sender - 送信者名
     * @param {Object} [options={}] - オプション
     * @param {string} [options.id] - メッセージID（指定しない場合は自動生成）
     * @returns {string|null} メッセージ要素のID、または追加できなかった場合はnull
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
        if (type === MESSAGE_TYPES.WELCOME) {
            const existingMessages = this.messagesDiv?.querySelectorAll(`.${CSS_CLASSES.MESSAGE}.${CSS_CLASSES.WELCOME}`) || [];
            const isDuplicate = Array.from(existingMessages).some(msg => {
                const textDiv = msg.querySelector(`.${CSS_CLASSES.MESSAGE_TEXT}`);
                return textDiv && textDiv.textContent === text;
            });
            
            if (isDuplicate) {
                console.warn('[ChatUI] 重複したwelcomeメッセージをスキップ', text.substring(0, 100));
                return null;
            }
        }
        
        // 3. メッセージ ID の生成
        const messageId = options.id || `message-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        
        // 4. テキスト処理（タグの削除、カード情報の抽出など）
        let displayText = text;
        PATTERNS.CARD_INFO.lastIndex = 0;
        const hasCardInfo = PATTERNS.CARD_INFO.test(text);
        if (hasCardInfo) {
            displayText = text.replace(PATTERNS.CARD_TAG, '').trim();
            displayText = displayText.replace(PATTERNS.MULTIPLE_NEWLINES, '\n\n');
        }
        const displayTextWithoutTag = displayText.replace(PATTERNS.SUGGEST_TAROT_TAG, '');
        
        // 5. messageDiv の作成
        const messageDiv = document.createElement('div');
        messageDiv.id = messageId;
        
        // type に応じたクラス設定
        if (type === MESSAGE_TYPES.LOADING) {
            messageDiv.className = `${CSS_CLASSES.MESSAGE} ${CSS_CLASSES.LOADING_MESSAGE}`;
        } else {
            messageDiv.className = `${CSS_CLASSES.MESSAGE} ${type}`;
        }
        
        // 6. スタイルはCSSクラスで適用（chat-ui.css）
        // 7. ヘッダー（送信者名）の作成
        if (sender) {
            const headerDiv = document.createElement('div');
            headerDiv.className = CSS_CLASSES.MESSAGE_HEADER;
            headerDiv.textContent = sender;
            if (type === MESSAGE_TYPES.USER) {
                headerDiv.style.color = '#b794ff';
            }
            messageDiv.appendChild(headerDiv);
        }
        
        // 8. テキスト表示用の div を作成
        const textDiv = document.createElement('div');
        textDiv.className = CSS_CLASSES.MESSAGE_TEXT;
        textDiv.textContent = displayTextWithoutTag;
        messageDiv.appendChild(textDiv);
        
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
     * スクロールを最新に（スムーズスクロール対応）
     */
    scrollToLatest() {
        if (!this.messagesDiv) return;
        setTimeout(() => {
            this.messagesDiv.scrollTo({
                top: this.messagesDiv.scrollHeight,
                behavior: 'smooth'
            });
        }, TIMING.SCROLL_DELAY);
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
        messageDiv.className = `${CSS_CLASSES.MESSAGE} assistant ${CSS_CLASSES.WELCOME} ${CSS_CLASSES.THINKING}`;
        
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
        debugLog('[ChatUI.replaceThinkingMessage] メッセージを置き換えます:', {
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
            textDiv.className = CSS_CLASSES.MESSAGE_TEXT;
            // [SUGGEST_TAROT]タグを表示テキストから削除（ユーザーには見えないようにする）
            // onMessageAddedには元のcleanedMessage（削除前）を渡すことで、検出できるようにする
            const displayMessageWithoutTag = cleanedMessage.replace(PATTERNS.SUGGEST_TAROT_TAG, '');
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
            
            thinkingElement.classList.remove(CSS_CLASSES.THINKING);
            this.scrollToLatest();
            debugLog('[ChatUI.replaceThinkingMessage] メッセージの置き換えが完了しました');
        }, TIMING.THINKING_REPLACE_DELAY);
    },

    /**
     * 送信ボタンの表示/非表示を更新
     * 【重要】入力欄に文字が入力された時、いかなる場合でも送信ボタンが表示される
     */
    updateSendButtonVisibility() {
        if (!this.sendButton || !this.messageInput) return;
        
        if (this.messageInput.value.trim().length > 0) {
            this.sendButton.classList.add(CSS_CLASSES.VISIBLE);
            this.sendButton.disabled = false;
        } else {
            this.sendButton.classList.remove(CSS_CLASSES.VISIBLE);
        }
    },

};

// グローバルスコープに公開（iframeからアクセスできるようにする）
window.ChatUI = ChatUI;
