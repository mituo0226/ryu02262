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
        
        let statusText = `鑑定名義: ${nickname}`;
        
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
        // デバッグ: オブジェクトが渡されている場合、詳細ログを出力
        if (typeof text !== 'string') {
            console.error('[ChatUI.addMessage] ⚠️ オブジェクトが渡されています！', {
                type,
                sender,
                textType: typeof text,
                textValue: text,
                textStringified: JSON.stringify(text),
                stackTrace: new Error().stack
            });
            // エラーとして処理：オブジェクトを文字列に変換
            if (Array.isArray(text)) {
                console.error('[ChatUI.addMessage] 配列が渡されました。最初の要素を表示します。', text);
                text = text.map(item => typeof item === 'object' ? JSON.stringify(item) : String(item)).join(', ');
            } else if (text && typeof text === 'object') {
                text = text.message || text.content || JSON.stringify(text);
            } else {
                text = String(text);
            }
        }
        
        // #region agent log
        if (type === 'welcome') {
            const stackTrace = new Error().stack;
            // 重複チェック: 同じ内容のwelcomeメッセージが既に表示されているか確認
            const existingMessages = this.messagesDiv?.querySelectorAll('.message.welcome') || [];
            const isDuplicate = Array.from(existingMessages).some(msg => {
                const textDiv = msg.querySelector('.message-text');
                return textDiv && textDiv.textContent === text;
            });
            
            // ロギングサーバーへの接続は開発環境でのみ有効（コメントアウト）
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-ui.js:138',message:'addMessage welcome呼び出し',data:{type,sender,textLength:text.length,textPreview:text.substring(0,200),containsReturningMessage:text.includes('また私に会いに来てくれてありがとう'),isDuplicate,existingWelcomeCount:existingMessages.length,stackTrace:stackTrace?.split('\n').slice(0,10).join(' | ')},timestamp:Date.now(),runId:'debug-run',hypothesisId:'E'})}).catch(()=>{});
            // }
            
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

        // loadingタイプのメッセージの特別な処理
        if (type === 'loading') {
            messageDiv.className = 'message loading-message';
            messageDiv.style.background = 'rgba(75, 0, 130, 0.95)';
            messageDiv.style.color = '#ffd700';
            messageDiv.style.border = 'none';
            messageDiv.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.3), 0 0 40px rgba(138, 43, 226, 0.2)';
            messageDiv.style.position = 'relative';
            messageDiv.style.overflow = 'visible';
            messageDiv.style.willChange = 'transform, background, box-shadow';
            
            // アニメーションを即座に開始
            requestAnimationFrame(() => {
                messageDiv.style.transition = 'transform 0.3s ease, background 0.3s ease, box-shadow 0.3s ease';
            });
            
            // 神秘的なローディングアニメーションコンテナを作成
            const loadingContainer = document.createElement('div');
            loadingContainer.className = 'kaede-mystic-loading-container';
            loadingContainer.style.cssText = `
                display: flex;
                justify-content: center;
                align-items: center;
                margin: 0 auto 12px;
                position: relative;
                width: 60px;
                height: 60px;
            `;
            
            // アニメーションスタイルを動的に追加（まだ存在しない場合）
            if (!document.getElementById('kaede-mystic-loading-styles')) {
                const style = document.createElement('style');
                style.id = 'kaede-mystic-loading-styles';
                style.textContent = `
                    @keyframes kaede-mystic-pattern1 {
                        0%, 100% {
                            transform: scale(0.9);
                            opacity: 0.75;
                            box-shadow: 
                                0 0 12px rgba(138, 43, 226, 0.4),
                                inset 0 0 12px rgba(138, 43, 226, 0.6),
                                0 0 24px rgba(255, 215, 0, 0.3);
                        }
                        50% {
                            transform: scale(1.08);
                            opacity: 1;
                            box-shadow: 
                                0 0 24px rgba(255, 215, 0, 0.8),
                                0 0 40px rgba(138, 43, 226, 0.6),
                                inset 0 0 20px rgba(255, 215, 0, 0.4),
                                0 0 48px rgba(255, 215, 0, 0.5);
                        }
                    }
                    @keyframes kaede-mystic-pattern2 {
                        0% {
                            transform: rotate(0deg) scale(0.8);
                            opacity: 0.6;
                            box-shadow: 0 0 20px rgba(255, 215, 0, 0.4), 0 0 40px rgba(138, 43, 226, 0.3);
                        }
                        50% {
                            transform: rotate(180deg) scale(1.1);
                            opacity: 1;
                            box-shadow: 0 0 30px rgba(255, 107, 157, 0.6), 0 0 60px rgba(138, 43, 226, 0.5), 0 0 80px rgba(255, 215, 0, 0.4);
                        }
                        100% {
                            transform: rotate(360deg) scale(0.8);
                            opacity: 0.6;
                            box-shadow: 0 0 20px rgba(255, 215, 0, 0.4), 0 0 40px rgba(138, 43, 226, 0.3);
                        }
                    }
                    @keyframes kaede-mystic-pattern3 {
                        0%, 100% {
                            transform: scale(1);
                            border-radius: 50%;
                            box-shadow: 
                                0 0 15px rgba(255, 215, 0, 0.5),
                                0 0 30px rgba(138, 43, 226, 0.4),
                                inset 0 0 15px rgba(255, 107, 157, 0.3);
                        }
                        33% {
                            transform: scale(1.1);
                            border-radius: 40%;
                            box-shadow: 
                                0 0 25px rgba(255, 107, 157, 0.7),
                                0 0 50px rgba(138, 43, 226, 0.6),
                                inset 0 0 20px rgba(255, 215, 0, 0.5);
                        }
                        66% {
                            transform: scale(0.95);
                            border-radius: 30%;
                            box-shadow: 
                                0 0 20px rgba(138, 43, 226, 0.6),
                                0 0 40px rgba(255, 215, 0, 0.5),
                                inset 0 0 18px rgba(255, 107, 157, 0.4);
                        }
                    }
                    @keyframes kaede-mystic-pattern4 {
                        0% {
                            transform: rotate(0deg) scale(0.9);
                            filter: hue-rotate(0deg);
                            box-shadow: 
                                0 0 12px rgba(255, 215, 0, 0.4),
                                0 0 24px rgba(138, 43, 226, 0.3);
                        }
                        25% {
                            transform: rotate(90deg) scale(1.05);
                            filter: hue-rotate(90deg);
                            box-shadow: 
                                0 0 20px rgba(255, 107, 157, 0.5),
                                0 0 40px rgba(255, 215, 0, 0.4);
                        }
                        50% {
                            transform: rotate(180deg) scale(1.1);
                            filter: hue-rotate(180deg);
                            box-shadow: 
                                0 0 25px rgba(138, 43, 226, 0.6),
                                0 0 50px rgba(255, 107, 157, 0.5);
                        }
                        75% {
                            transform: rotate(270deg) scale(1.05);
                            filter: hue-rotate(270deg);
                            box-shadow: 
                                0 0 20px rgba(255, 215, 0, 0.5),
                                0 0 40px rgba(138, 43, 226, 0.4);
                        }
                        100% {
                            transform: rotate(360deg) scale(0.9);
                            filter: hue-rotate(360deg);
                            box-shadow: 
                                0 0 12px rgba(255, 215, 0, 0.4),
                                0 0 24px rgba(138, 43, 226, 0.3);
                        }
                    }
                    @keyframes kaede-mystic-inner-glow {
                        0%, 100% {
                            opacity: 0.6;
                            transform: translate(-50%, -50%) scale(0.8);
                        }
                        50% {
                            opacity: 1;
                            transform: translate(-50%, -50%) scale(1.2);
                        }
                    }
                    @keyframes kaede-mystic-particle-rotate {
                        0% {
                            transform: translate(-50%, -50%) translate(25px, 0) rotate(0deg);
                            opacity: 0.8;
                        }
                        50% {
                            opacity: 1;
                        }
                        100% {
                            transform: translate(-50%, -50%) translate(25px, 0) rotate(360deg);
                            opacity: 0.8;
                        }
                    }
                    @keyframes kaede-mystic-wave {
                        0%, 100% {
                            transform: translate(-50%, -50%) scale(1);
                            opacity: 0.4;
                        }
                        50% {
                            transform: translate(-50%, -50%) scale(1.5);
                            opacity: 0;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
            
            // メインのローディングアイコンを作成
            const loadingIcon = document.createElement('div');
            loadingIcon.className = 'kaede-mystic-loading-icon';
            loadingIcon.style.cssText = `
                width: 40px;
                height: 40px;
                border-radius: 50%;
                border: 2px solid rgba(255, 215, 0, 0.6);
                box-shadow: 
                    0 0 12px rgba(138, 43, 226, 0.4),
                    inset 0 0 12px rgba(138, 43, 226, 0.6),
                    0 0 24px rgba(255, 215, 0, 0.3);
                animation: kaede-mystic-pattern1 2s ease-in-out infinite;
                margin: 0 auto;
                position: relative;
            `;
            
            // 内側の光る円
            const innerGlow = document.createElement('div');
            innerGlow.className = 'kaede-mystic-inner-glow';
            innerGlow.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(255, 215, 0, 0.8), rgba(138, 43, 226, 0.4));
                box-shadow: 0 0 16px rgba(255, 215, 0, 0.6);
                animation: kaede-mystic-inner-glow 2s ease-in-out infinite;
                transform: translate(-50%, -50%);
            `;
            loadingIcon.appendChild(innerGlow);
            
            // 外側の粒子（6個）
            for (let i = 0; i < 6; i++) {
                const particle = document.createElement('div');
                const angle = (i * 60) * (Math.PI / 180);
                const radius = 25;
                particle.className = `kaede-mystic-particle-${i}`;
                particle.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 4px;
                    height: 4px;
                    border-radius: 50%;
                    background: rgba(255, 215, 0, 0.8);
                    box-shadow: 0 0 8px rgba(255, 215, 0, 0.9);
                    transform: translate(-50%, -50%) translate(${Math.cos(angle) * radius}px, ${Math.sin(angle) * radius}px);
                    animation: kaede-mystic-particle-rotate 3s linear infinite;
                    animation-delay: ${i * 0.5}s;
                `;
                loadingIcon.appendChild(particle);
            }
            
            // 波動エフェクト（外側の輪）
            for (let i = 0; i < 2; i++) {
                const wave = document.createElement('div');
                wave.className = `kaede-mystic-wave-${i}`;
                wave.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: 1px solid rgba(255, 215, 0, 0.3);
                    transform: translate(-50%, -50%);
                    animation: kaede-mystic-wave 2s ease-out infinite;
                    animation-delay: ${i * 1}s;
                `;
                loadingContainer.appendChild(wave);
            }
            
            loadingContainer.appendChild(loadingIcon);
            messageDiv.appendChild(loadingContainer);
            
            // 数秒ごとにアニメーションパターンを変更（4秒ごと）
            let currentPattern = 1;
            const patternInterval = setInterval(() => {
                if (!messageDiv.parentNode) {
                    clearInterval(patternInterval);
                    return;
                }
                
                currentPattern = (currentPattern % 4) + 1;
                loadingIcon.style.animation = `kaede-mystic-pattern${currentPattern} 2s ease-in-out infinite`;
            }, 4000); // 4秒ごとに変更
            
            // メッセージが削除されたらタイマーをクリア
            messageDiv.dataset.animationInterval = patternInterval;
            
            // 動的なメッセージ変更機能を追加（時間が経過しても待機を続けられるように）
            // この機能は textDiv が作成された後に設定される（下記参照）
            messageDiv.dataset.enableDynamicMessage = 'true';
            
            // チャットウィンドウ全体に微細なアニメーションを追加（待機中のみ）
            const messagesDiv = this.messagesDiv;
            if (messagesDiv && messagesDiv.parentElement) {
                const chatContainer = messagesDiv.closest('.chat-container');
                if (chatContainer) {
                    chatContainer.classList.add('waiting-for-response');
                    messageDiv.dataset.chatContainerAnimated = 'true';
                }
            }
        }

        if (sender) {
            const headerDiv = document.createElement('div');
            headerDiv.className = 'message-header';
            headerDiv.textContent = sender;
            
            if (type === 'character') {
                headerDiv.style.color = 'rgba(255, 255, 255, 0.9)';
            }
            else if (type === 'loading') {
                headerDiv.style.color = '#ffd700';
                headerDiv.style.textShadow = '0 0 10px rgba(255, 215, 0, 0.8), 0 0 20px rgba(138, 43, 226, 0.6)';
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
        
        // [SUGGEST_TAROT]タグはonMessageAddedで検出してボタンを表示するため、元のtextパラメータには残す
        // ただし、表示テキストからは削除する（ユーザーには見えないようにする）
        // onMessageAddedには元のtextパラメータ（削除前）を渡すことで、検出できるようにする
        const displayTextWithoutTag = displayText.replace(/\[SUGGEST_TAROT\]/g, '');
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        if (type === 'loading') {
            // アニメーションを即座に適用（will-changeで最適化）
            textDiv.style.cssText = `
                color: #ffd700;
                text-shadow: 
                    0 0 10px rgba(255, 215, 0, 0.8),
                    0 0 20px rgba(138, 43, 226, 0.6),
                    0 0 30px rgba(255, 107, 157, 0.4);
                animation: 
                    guardian-mystic-glow-text 3s ease-in-out infinite,
                    textPulse 1.5s ease-in-out infinite,
                    textColorShift 3s ease-in-out infinite,
                    textShake 2.5s ease-in-out infinite,
                    textGlowPulse 2.5s ease-in-out infinite;
                text-align: center;
                line-height: 1.8;
                transform: scale(1);
                display: inline-block;
                will-change: transform, color, text-shadow, opacity;
            `;
            
            // アニメーションを強制的に開始（requestAnimationFrameで確実に適用）
            requestAnimationFrame(() => {
                textDiv.style.animationPlayState = 'running';
            });
            
            // テキストのパルスアニメーション、色変化、揺れ効果をCSSに追加（まだ存在しない場合）
            if (!document.getElementById('text-pulse-animation')) {
                const style = document.createElement('style');
                style.id = 'text-pulse-animation';
                style.textContent = `
                    @keyframes textPulse {
                        0%, 100% {
                            transform: scale(1);
                            opacity: 1;
                        }
                        50% {
                            transform: scale(1.02);
                            opacity: 0.95;
                        }
                    }
                    @keyframes textColorShift {
                        0% {
                            color: #ffd700;
                            filter: hue-rotate(0deg);
                        }
                        25% {
                            color: #ffb347;
                            filter: hue-rotate(15deg);
                        }
                        50% {
                            color: #ff6b9d;
                            filter: hue-rotate(30deg);
                        }
                        75% {
                            color: #c77dff;
                            filter: hue-rotate(45deg);
                        }
                        100% {
                            color: #ffd700;
                            filter: hue-rotate(0deg);
                        }
                    }
                    @keyframes textShake {
                        0%, 100% {
                            transform: translateX(0) translateY(0) rotate(0deg);
                        }
                        10% {
                            transform: translateX(-1px) translateY(-1px) rotate(-0.5deg);
                        }
                        20% {
                            transform: translateX(1px) translateY(1px) rotate(0.5deg);
                        }
                        30% {
                            transform: translateX(-1px) translateY(0) rotate(-0.3deg);
                        }
                        40% {
                            transform: translateX(1px) translateY(-1px) rotate(0.3deg);
                        }
                        50% {
                            transform: translateX(0) translateY(1px) rotate(0deg);
                        }
                        60% {
                            transform: translateX(-1px) translateY(0) rotate(-0.2deg);
                        }
                        70% {
                            transform: translateX(1px) translateY(1px) rotate(0.2deg);
                        }
                        80% {
                            transform: translateX(-1px) translateY(-1px) rotate(-0.1deg);
                        }
                        90% {
                            transform: translateX(1px) translateY(0) rotate(0.1deg);
                        }
                    }
                    @keyframes textGlowPulse {
                        0%, 100% {
                            text-shadow: 
                                0 0 10px rgba(255, 215, 0, 0.8),
                                0 0 20px rgba(138, 43, 226, 0.6),
                                0 0 30px rgba(255, 107, 157, 0.4);
                        }
                        25% {
                            text-shadow: 
                                0 0 15px rgba(255, 179, 71, 0.9),
                                0 0 25px rgba(138, 43, 226, 0.7),
                                0 0 35px rgba(255, 107, 157, 0.5);
                        }
                        50% {
                            text-shadow: 
                                0 0 20px rgba(255, 107, 157, 1),
                                0 0 30px rgba(199, 125, 255, 0.8),
                                0 0 40px rgba(255, 215, 0, 0.6);
                        }
                        75% {
                            text-shadow: 
                                0 0 15px rgba(199, 125, 255, 0.9),
                                0 0 25px rgba(138, 43, 226, 0.7),
                                0 0 35px rgba(255, 179, 71, 0.5);
                        }
                    }
                `;
                document.head.appendChild(style);
            }
        }
        textDiv.textContent = displayTextWithoutTag;
        messageDiv.appendChild(textDiv);
        
        // loadingタイプの場合、動的なメッセージ変更機能を有効化
        if (type === 'loading' && messageDiv.dataset.enableDynamicMessage === 'true') {
            const waitingMessages = [
                '考えています...',
                '深く考えています...',
                'あなたの言葉を大切に受け止めています...',
                '最適な返答を探しています...',
                'もう少しお待ちください...',
                '考えをまとめています...'
            ];
            
            let messageIndex = 0;
            const startTime = Date.now();
            
            // 最初からメッセージボックスにアニメーションを適用
            messageDiv.style.transition = 'transform 0.3s ease, background 0.3s ease, box-shadow 0.3s ease';
            
            // 最初のアニメーションを即座に開始（パルス効果）
            let pulseDirection = 1;
            const initialPulse = setInterval(() => {
                if (!messageDiv.parentNode) {
                    clearInterval(initialPulse);
                    return;
                }
                if (pulseDirection === 1) {
                    messageDiv.style.transform = 'scale(1.01)';
                    messageDiv.style.boxShadow = '0 0 25px rgba(255, 215, 0, 0.4), 0 0 50px rgba(138, 43, 226, 0.3)';
                    pulseDirection = -1;
                } else {
                    messageDiv.style.transform = 'scale(1)';
                    messageDiv.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.3), 0 0 40px rgba(138, 43, 226, 0.2)';
                    pulseDirection = 1;
                }
            }, 800); // 0.8秒ごとにパルス（より頻繁に）
            
            messageDiv.dataset.initialPulseInterval = initialPulse;
            
            // 最初のメッセージ変更を即座に実行（0.8秒後）
            setTimeout(() => {
                if (messageDiv.parentNode && messageIndex === 0) {
                    messageIndex = 1;
                    const textDivElement = messageDiv.querySelector('.message-text');
                    if (textDivElement) {
                        messageDiv.style.transition = 'transform 0.3s ease, background 0.3s ease, box-shadow 0.3s ease';
                        messageDiv.style.transform = 'scale(0.98) translateY(-2px)';
                        messageDiv.style.background = 'rgba(106, 13, 173, 0.95)';
                        
                        textDivElement.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                        textDivElement.style.opacity = '0.3';
                        textDivElement.style.transform = 'translateY(-5px)';
                        
                        setTimeout(() => {
                            textDivElement.textContent = waitingMessages[messageIndex];
                            textDivElement.style.opacity = '1';
                            textDivElement.style.transform = 'translateY(0)';
                            messageDiv.style.transform = 'scale(1) translateY(0)';
                            messageDiv.style.boxShadow = '0 0 25px rgba(255, 215, 0, 0.4), 0 0 50px rgba(138, 43, 226, 0.3)';
                            
                            setTimeout(() => {
                                messageDiv.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.3), 0 0 40px rgba(138, 43, 226, 0.2)';
                            }, 300);
                        }, 100);
                    }
                }
            }, 800); // 0.8秒後に最初の変更
            
            // メッセージ変更のタイマーを設定（0.8秒ごとに変更）
            const messageChangeInterval = setInterval(() => {
                if (!messageDiv.parentNode) {
                    clearInterval(messageChangeInterval);
                    if (messageDiv.dataset.initialPulseInterval) {
                        clearInterval(Number(messageDiv.dataset.initialPulseInterval));
                    }
                    return;
                }
                
                // 経過時間を計算
                const elapsed = Date.now() - startTime;
                
                // 0.8秒ごとにメッセージを変更
                const secondsElapsed = Math.floor(elapsed / 800);
                if (secondsElapsed > messageIndex) {
                    messageIndex = secondsElapsed % waitingMessages.length;
                    
                    // テキスト要素を更新
                    const textDivElement = messageDiv.querySelector('.message-text');
                    if (textDivElement) {
                        // メッセージボックス全体にアニメーションを適用
                        messageDiv.style.transition = 'transform 0.4s ease, background 0.4s ease, box-shadow 0.4s ease';
                        messageDiv.style.transform = 'scale(0.98) translateY(-2px)';
                        
                        // 背景色を変化させる
                        const backgroundColors = [
                            'rgba(75, 0, 130, 0.95)',
                            'rgba(106, 13, 173, 0.95)',
                            'rgba(75, 0, 130, 0.95)',
                            'rgba(139, 61, 255, 0.95)',
                            'rgba(75, 0, 130, 0.95)',
                            'rgba(106, 13, 173, 0.95)'
                        ];
                        messageDiv.style.background = backgroundColors[messageIndex];
                        
                        // テキストのフェードアウト
                        textDivElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                        textDivElement.style.opacity = '0.3';
                        textDivElement.style.transform = 'translateY(-5px)';
                        
                        setTimeout(() => {
                            // テキストを更新
                            textDivElement.textContent = waitingMessages[messageIndex];
                            
                            // フェードインとアニメーション
                            setTimeout(() => {
                                textDivElement.style.opacity = '1';
                                textDivElement.style.transform = 'translateY(0)';
                                
                                // メッセージボックスを元に戻す
                                messageDiv.style.transform = 'scale(1) translateY(0)';
                                
                                // ボックスシャドウを強化
                                messageDiv.style.boxShadow = '0 0 25px rgba(255, 215, 0, 0.4), 0 0 50px rgba(138, 43, 226, 0.3), 0 0 75px rgba(255, 107, 157, 0.2)';
                                
                                // 少し後に元のシャドウに戻す
                                setTimeout(() => {
                                    messageDiv.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.3), 0 0 40px rgba(138, 43, 226, 0.2)';
                                }, 500);
                            }, 50);
                        }, 150);
                    }
                }
            }, 200); // 200msごとにチェック（より頻繁にチェック）
            
            // メッセージが削除されたらタイマーをクリア
            messageDiv.dataset.messageChangeInterval = messageChangeInterval;
        }

        if ((type === 'character' || type === 'welcome') && window.CharacterFeatures) {
            const sendMessageCallback = typeof window.sendMessage === 'function' ? window.sendMessage : null;
            if (window.CharacterFeatures.detect(ChatData.currentCharacter, text)) {
                window.CharacterFeatures.display(ChatData.currentCharacter, text, messageDiv, sendMessageCallback);
            }
        }

        this.messagesDiv.appendChild(messageDiv);
        
        // メッセージ追加後、ハンドラーのコールバックを呼び出す（鑑定士固有の処理を委譲）
        // これにより、chat-ui.jsに鑑定士固有の処理を記述する必要がなくなる
        
        // [SUGGEST_TAROT]が含まれている場合、必ずログを出力して原因を特定
        if (text && typeof text === 'string' && text.includes('[SUGGEST_TAROT]')) {
            console.log('[ChatUI.addMessage] [SUGGEST_TAROT]検出 - デバッグ情報:', {
                type,
                sender,
                character: ChatData?.currentCharacter,
                hasRegistry: !!window.CharacterRegistry,
                hasChatData: !!ChatData,
                textPreview: text.substring(0, 100),
                registeredIds: window.CharacterRegistry ? CharacterRegistry.getRegisteredIds() : []
            });
        }
        
        if (window.CharacterRegistry && ChatData && ChatData.currentCharacter) {
            // #region agent log - コンソールログのみ（確実に読み取れる）
            if (text && typeof text === 'string' && text.includes('[SUGGEST_TAROT]')) {
                console.group('🔍 [DEBUG] [SUGGEST_TAROT]検出 - ハンドラー取得前');
                console.log('キャラクター:', ChatData.currentCharacter);
                console.log('CharacterRegistry存在:', !!window.CharacterRegistry);
                console.log('ChatData存在:', !!ChatData);
                console.log('登録済みハンドラー:', CharacterRegistry.getRegisteredIds());
                console.log('yukinoハンドラー登録済み:', CharacterRegistry.has('yukino'));
                console.log('yukinoハンドラー:', CharacterRegistry.get('yukino'));
                console.groupEnd();
            }
            // #endregion
            const handler = CharacterRegistry.get(ChatData.currentCharacter);
            // #region agent log - コンソールログのみ（確実に読み取れる）
            if (text && typeof text === 'string' && text.includes('[SUGGEST_TAROT]')) {
                console.group('🔍 [DEBUG] [SUGGEST_TAROT]検出 - ハンドラー取得後');
                console.log('ハンドラー存在:', !!handler);
                console.log('ハンドラータイプ:', handler ? typeof handler.onMessageAdded : 'null');
                console.log('onMessageAdded存在:', handler && typeof handler.onMessageAdded === 'function');
                console.log('ハンドラーのキー:', handler ? Object.keys(handler) : []);
                if (handler) {
                    console.log('ハンドラー全体:', handler);
                }
                console.groupEnd();
            }
            // #endregion
            if (handler && typeof handler.onMessageAdded === 'function') {
                try {
                    handler.onMessageAdded(type, text, sender, messageDiv, messageId, options);
                } catch (error) {
                    console.error(`[chat-ui] ハンドラーのonMessageAddedでエラーが発生しました (${ChatData.currentCharacter}):`, error);
                    if (text && typeof text === 'string' && text.includes('[SUGGEST_TAROT]')) {
                        console.error('[ChatUI.addMessage] [SUGGEST_TAROT]検出 - onMessageAddedでエラー:', error);
                    }
                }
            } else {
                // デバッグ: ハンドラーが見つからない場合
                if (text && typeof text === 'string' && text.includes('[SUGGEST_TAROT]')) {
                    console.error('[ChatUI.addMessage] [SUGGEST_TAROT]検出 - ハンドラーが見つかりません:', {
                        type,
                        sender,
                        character: ChatData.currentCharacter,
                        hasRegistry: !!window.CharacterRegistry,
                        hasChatData: !!ChatData,
                        hasHandler: !!handler,
                        handlerType: handler ? typeof handler.onMessageAdded : 'null',
                        registeredIds: CharacterRegistry.getRegisteredIds()
                    });
                }
            }
        } else {
            // デバッグ: CharacterRegistryまたはChatDataが存在しない場合
            if (text && typeof text === 'string' && text.includes('[SUGGEST_TAROT]')) {
                console.error('[ChatUI.addMessage] [SUGGEST_TAROT]検出 - CharacterRegistryまたはChatDataが存在しません:', {
                    type,
                    sender,
                    hasRegistry: !!window.CharacterRegistry,
                    hasChatData: !!ChatData,
                    currentCharacter: ChatData?.currentCharacter
                });
            }
        }
        
        requestAnimationFrame(() => {
            this.scrollToLatest();
        });
        
        // loadingタイプのメッセージの場合、削除時にタイマーをクリアする処理を追加
        if (type === 'loading') {
            // 元のremoveメソッドを保存
            const originalRemove = messageDiv.remove.bind(messageDiv);
            
            // removeメソッドをオーバーライドしてタイマーをクリア
            messageDiv.remove = function() {
                // アニメーションタイマーをクリア
                if (this.dataset.animationInterval) {
                    clearInterval(Number(this.dataset.animationInterval));
                }
                // メッセージ変更タイマーをクリア
                if (this.dataset.messageChangeInterval) {
                    clearInterval(Number(this.dataset.messageChangeInterval));
                }
                // 初期パルスアニメーションをクリア
                if (this.dataset.initialPulseInterval) {
                    clearInterval(Number(this.dataset.initialPulseInterval));
                }
                
                // チャットウィンドウのアニメーションを解除
                if (this.dataset.chatContainerAnimated === 'true') {
                    const messagesDiv = document.getElementById('messages');
                    if (messagesDiv && messagesDiv.parentElement) {
                        const chatContainer = messagesDiv.closest('.chat-container');
                        if (chatContainer) {
                            chatContainer.classList.remove('waiting-for-response');
                        }
                    }
                }
                
                // 元のremoveメソッドを呼び出し
                originalRemove();
            };
        }
        
        // メッセージIDを返す（待機メッセージの削除などに使用）
        return messageId;
    },

    /**
     * メッセージを先頭に追加（会話履歴の遅延表示用）
     * @param {string} type - メッセージタイプ ('user', 'character', 'welcome', 'error', 'loading')
     * @param {string} text - メッセージテキスト
     * @param {string} sender - 送信者名
     * @param {Object} options - オプション
     * @returns {string} メッセージ要素のID
     */
    prependMessage(type, text, sender, options = {}) {
        if (!this.messagesDiv) return null;
        
        // addMessageと同じロジックでメッセージ要素を作成（簡略版）
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
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.textContent = text;
        messageDiv.appendChild(textDiv);
        
        if (sender) {
            const senderDiv = document.createElement('div');
            senderDiv.className = 'message-sender';
            senderDiv.textContent = sender;
            messageDiv.appendChild(senderDiv);
        }
        
        // 先頭に追加（insertBeforeを使用）
        if (this.messagesDiv.firstChild) {
            this.messagesDiv.insertBefore(messageDiv, this.messagesDiv.firstChild);
        } else {
            this.messagesDiv.appendChild(messageDiv);
        }
        
        // スクロールは行わない（古いメッセージを先頭に追加するため）
        
        return messageId;
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

