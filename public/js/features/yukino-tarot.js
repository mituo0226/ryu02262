/**
 * 笹岡雪乃のタロットカード機能（完全新規実装）
 * シンプルなステートマシン方式で確実に動作
 */

(function() {
    'use strict';

    /**
     * タロットカードのCSSスタイルを動的に追加
     * chat.htmlに直接記述するのではなく、必要な時のみ追加する
     */
    function injectTarotStyles() {
        // 既にスタイルが追加されているかチェック
        if (document.getElementById('yukino-tarot-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'yukino-tarot-styles';
        style.textContent = `
            /* タロットカード画像のスタイル */
            .tarot-card-image {
                width: 80px;
                height: auto;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(138, 43, 226, 0.4);
                cursor: pointer;
                transition: transform 0.2s ease;
            }

            .tarot-card-image:hover {
                transform: scale(1.1);
            }

            @media (max-width: 768px) {
                .tarot-card-image {
                    width: 60px;
                }
            }
        `;
        document.head.appendChild(style);
        console.log('[タロット機能] CSSスタイルを動的に追加しました');
    }

    // 初期化時にCSSスタイルを追加
    injectTarotStyles();

    // タロットカード名から画像ファイル名へのマッピング
    const TAROT_CARDS = {
        '愚者': 'The Fool.png',
        '魔術師': 'The Magician.png',
        '女教皇': 'THE HIGH PRIESTESS.png',
        '女帝': 'THE EMPRESS.png',
        '皇帝': 'THE EMPEROR.png',
        '教皇': 'THE HIEROPHANT.png',
        '恋人': 'THE LOVERS.png',
        '戦車': 'THE CHARIOT.png',
        '力': 'STRENGTH.png',
        '隠者': 'THE HERMIT.png',
        '運命の輪': 'WHEEL OF FORTUNE.png',
        '正義': 'JUSTICE.png',
        '吊るされた男': 'THE HANGED MAN.png',
        '死神': 'DEATH.png',
        '節制': 'TEMPERANCE.png',
        '悪魔': 'THE DEVIL.png',
        '塔': 'THE TOWER.png',
        '星': 'THE STAR.png',
        '月': 'THE MOON.png',
        '太陽': 'THE SUN.png',
        '審判': 'JUDGEMENT.png',
        '世界': 'THE WORLD.png',
    };

    // 現在の状態
    let currentState = {
        phase: null, // 'past' | 'present' | 'future' | 'summary'
        cards: [], // 選択された3枚のカード
        isCardFlipped: false,
        isExplanationShown: false
    };

    /**
     * 3枚のカードをランダムに選択
     */
    function selectThreeCards() {
        const allCards = Object.keys(TAROT_CARDS);
        const shuffled = [...allCards].sort(() => Math.random() - 0.5);
        
        return [
            { position: '過去', name: shuffled[0], image: TAROT_CARDS[shuffled[0]] },
            { position: '現在', name: shuffled[1], image: TAROT_CARDS[shuffled[1]] },
            { position: '未来', name: shuffled[2], image: TAROT_CARDS[shuffled[2]] }
        ];
    }

    /**
     * 1枚のカードをランダムに選択
     */
    function selectSingleCard() {
        const allCards = Object.keys(TAROT_CARDS);
        const randomIndex = Math.floor(Math.random() * allCards.length);
        const cardName = allCards[randomIndex];
        
        return {
            position: '現在',
            name: cardName,
            image: TAROT_CARDS[cardName]
        };
    }

    /**
     * ローディングオーバーレイを表示
     */
    function showLoadingOverlay(message = 'タロットカードの解説を作成中...') {
        let overlay = document.getElementById('yukinoTarotLoadingOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'yukinoTarotLoadingOverlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100vw';
            overlay.style.height = '100vh';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            overlay.style.zIndex = '9998';
            overlay.style.display = 'flex';
            overlay.style.flexDirection = 'column';
            overlay.style.justifyContent = 'center';
            overlay.style.alignItems = 'center';
            overlay.style.color = '#ffffff';
            overlay.style.fontSize = '18px';
            overlay.style.fontWeight = '600';
            
            const spinner = document.createElement('div');
            spinner.style.width = '50px';
            spinner.style.height = '50px';
            spinner.style.border = '5px solid rgba(138, 43, 226, 0.3)';
            spinner.style.borderTop = '5px solid rgba(138, 43, 226, 1)';
            spinner.style.borderRadius = '50%';
            spinner.style.animation = 'spin 1s linear infinite';
            spinner.style.marginBottom = '20px';
            
            const style = document.createElement('style');
            style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
            document.head.appendChild(style);
            
            const text = document.createElement('div');
            text.id = 'yukinoTarotLoadingText';
            text.textContent = message;
            
            overlay.appendChild(spinner);
            overlay.appendChild(text);
            document.body.appendChild(overlay);
        } else {
            overlay.style.display = 'flex';
            document.getElementById('yukinoTarotLoadingText').textContent = message;
        }
    }

    /**
     * ローディングオーバーレイを非表示
     */
    function hideLoadingOverlay() {
        const overlay = document.getElementById('yukinoTarotLoadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    /**
     * カード拡大モーダルを表示
     */
    function showCardModal(cardName, imageFile) {
        const modal = document.createElement('div');
        modal.id = 'yukinoTarotCardModal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        modal.style.zIndex = '9999';
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        
        // カード名
        const cardNameLabel = document.createElement('div');
        cardNameLabel.textContent = cardName;
        cardNameLabel.style.color = '#FFD700';
        cardNameLabel.style.fontSize = '24px';
        cardNameLabel.style.fontWeight = '700';
        cardNameLabel.style.marginBottom = '20px';
        cardNameLabel.style.textShadow = '0 2px 8px rgba(255, 215, 0, 0.5)';
        
        // カード画像
        const cardImage = document.createElement('img');
        cardImage.src = `../../photo/TAROT/${imageFile}`;
        cardImage.alt = cardName;
        cardImage.style.maxWidth = '80vw';
        cardImage.style.maxHeight = '70vh';
        cardImage.style.objectFit = 'contain';
        cardImage.style.borderRadius = '12px';
        cardImage.style.boxShadow = '0 8px 32px rgba(138, 43, 226, 0.8)';
        
        // 閉じるボタン
        const closeButton = document.createElement('div');
        closeButton.textContent = '×';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '20px';
        closeButton.style.right = '20px';
        closeButton.style.width = '40px';
        closeButton.style.height = '40px';
        closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        closeButton.style.borderRadius = '50%';
        closeButton.style.display = 'flex';
        closeButton.style.justifyContent = 'center';
        closeButton.style.alignItems = 'center';
        closeButton.style.fontSize = '32px';
        closeButton.style.color = '#ffffff';
        closeButton.style.cursor = 'pointer';
        closeButton.style.transition = 'background-color 0.2s ease';
        
        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
        });
        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        });
        closeButton.addEventListener('click', () => {
            modal.remove();
        });
        
        modal.appendChild(cardNameLabel);
        modal.appendChild(cardImage);
        modal.appendChild(closeButton);
        
        // 背景クリックで閉じる
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
    }

    /**
     * カードを表示（裏面、クリックでめくる）
     */
    function displayCard(card, container) {
        currentState.isCardFlipped = false;
        
        const cardWrapper = document.createElement('div');
        cardWrapper.style.display = 'flex';
        cardWrapper.style.flexDirection = 'column';
        cardWrapper.style.alignItems = 'center';
        cardWrapper.style.gap = '12px';
        cardWrapper.style.marginTop = '16px';
        
        // カード位置ラベル
        const positionLabel = document.createElement('div');
        positionLabel.textContent = `～あなたの${card.position}～`;
        positionLabel.style.fontSize = '14px';
        positionLabel.style.color = 'rgba(255, 255, 255, 0.9)';
        positionLabel.style.fontWeight = '600';
        
        // カードコンテナ（3D flip用）
        const cardContainer = document.createElement('div');
        cardContainer.style.position = 'relative';
        cardContainer.style.width = '120px';
        cardContainer.style.height = '180px';
        cardContainer.style.perspective = '1000px';
        cardContainer.style.cursor = 'pointer';
        
        // カード本体
        const cardInner = document.createElement('div');
        cardInner.style.position = 'relative';
        cardInner.style.width = '100%';
        cardInner.style.height = '100%';
        cardInner.style.transition = 'transform 0.6s';
        cardInner.style.transformStyle = 'preserve-3d';
        
        // 裏面
        const cardBack = document.createElement('div');
        cardBack.style.position = 'absolute';
        cardBack.style.width = '100%';
        cardBack.style.height = '100%';
        cardBack.style.backfaceVisibility = 'hidden';
        cardBack.style.borderRadius = '8px';
        cardBack.style.overflow = 'hidden';
        cardBack.style.boxShadow = '0 4px 12px rgba(138, 43, 226, 0.4)';
        
        const backImage = document.createElement('img');
        backImage.src = '../../photo/TAROT/card back.png';
        backImage.alt = 'カードの裏';
        backImage.style.width = '100%';
        backImage.style.height = '100%';
        backImage.style.objectFit = 'cover';
        cardBack.appendChild(backImage);
        
        // 表面
        const cardFront = document.createElement('div');
        cardFront.style.position = 'absolute';
        cardFront.style.width = '100%';
        cardFront.style.height = '100%';
        cardFront.style.backfaceVisibility = 'hidden';
        cardFront.style.transform = 'rotateY(180deg)';
        cardFront.style.borderRadius = '8px';
        cardFront.style.overflow = 'hidden';
        cardFront.style.boxShadow = '0 4px 12px rgba(138, 43, 226, 0.6)';
        
        const frontImage = document.createElement('img');
        frontImage.src = `../../photo/TAROT/${card.image}`;
        frontImage.alt = card.name;
        frontImage.style.width = '100%';
        frontImage.style.height = '100%';
        frontImage.style.objectFit = 'cover';
        cardFront.appendChild(frontImage);
        
        cardInner.appendChild(cardBack);
        cardInner.appendChild(cardFront);
        cardContainer.appendChild(cardInner);
        
        // カード名（めくった後に表示）
        const cardNameLabel = document.createElement('div');
        cardNameLabel.textContent = card.name;
        cardNameLabel.style.fontSize = '14px';
        cardNameLabel.style.color = 'rgba(255, 255, 255, 0.9)';
        cardNameLabel.style.fontWeight = '600';
        cardNameLabel.style.opacity = '0';
        cardNameLabel.style.transition = 'opacity 0.3s ease';
        
        // ヒントテキスト
        const hint = document.createElement('div');
        hint.textContent = 'カードをタップしてめくってください';
        hint.style.fontSize = '12px';
        hint.style.color = 'rgba(255, 255, 255, 0.7)';
        hint.style.marginTop = '8px';
        
        // カードクリックでめくる
        cardContainer.addEventListener('click', () => {
            if (!currentState.isCardFlipped) {
                currentState.isCardFlipped = true;
                cardInner.style.transform = 'rotateY(180deg)';
                cardNameLabel.style.opacity = '1';
                hint.remove();
                
                // めくった後、「雪乃の解説」ボタンと拡大モーダルを表示
                setTimeout(() => {
                    // 拡大表示ボタン
                    const expandButton = document.createElement('button');
                    expandButton.textContent = '拡大する';
                    expandButton.style.padding = '8px 16px';
                    expandButton.style.fontSize = '12px';
                    expandButton.style.color = '#ffffff';
                    expandButton.style.backgroundColor = 'rgba(138, 43, 226, 0.8)';
                    expandButton.style.border = 'none';
                    expandButton.style.borderRadius = '6px';
                    expandButton.style.cursor = 'pointer';
                    expandButton.style.marginTop = '8px';
                    expandButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        showCardModal(card.name, card.image);
                    });
                    
                    // 「雪乃の解説」ボタン
                    const explanationButton = document.createElement('button');
                    explanationButton.textContent = '雪乃の解説';
                    explanationButton.style.padding = '12px 32px';
                    explanationButton.style.fontSize = '16px';
                    explanationButton.style.fontWeight = '600';
                    explanationButton.style.color = '#ffffff';
                    explanationButton.style.backgroundColor = 'rgba(138, 43, 226, 0.8)';
                    explanationButton.style.border = '2px solid rgba(138, 43, 226, 1)';
                    explanationButton.style.borderRadius = '8px';
                    explanationButton.style.cursor = 'pointer';
                    explanationButton.style.marginTop = '16px';
                    explanationButton.style.boxShadow = '0 4px 16px rgba(138, 43, 226, 0.4)';
                    explanationButton.style.transition = 'all 0.2s ease';
                    
                    explanationButton.addEventListener('mouseenter', () => {
                        explanationButton.style.backgroundColor = 'rgba(138, 43, 226, 1)';
                        explanationButton.style.transform = 'scale(1.05)';
                    });
                    explanationButton.addEventListener('mouseleave', () => {
                        explanationButton.style.backgroundColor = 'rgba(138, 43, 226, 0.8)';
                        explanationButton.style.transform = 'scale(1)';
                    });
                    
                    explanationButton.addEventListener('click', async () => {
                        explanationButton.disabled = true;
                        explanationButton.style.opacity = '0.5';
                        explanationButton.style.cursor = 'not-allowed';
                        
                        // AI解説をリクエスト
                        await requestExplanation(card);
                    });
                    
                    cardWrapper.appendChild(expandButton);
                    cardWrapper.appendChild(explanationButton);
                }, 600);
            }
        });
        
        cardWrapper.appendChild(positionLabel);
        cardWrapper.appendChild(cardContainer);
        cardWrapper.appendChild(cardNameLabel);
        cardWrapper.appendChild(hint);
        
        container.appendChild(cardWrapper);
        
        // スクロール
        if (window.ChatUI && window.ChatUI.scrollToLatest) {
            window.ChatUI.scrollToLatest();
        }
    }

    /**
     * AI解説をリクエスト（オーバーレイ方式）
     */
    async function requestExplanation(card) {
        // 動的メッセージリスト（待機中のメッセージ）
        const waitingMessages = [
            { text: 'タロットカードの解説を作成しています', delay: 0 },
            { text: 'あなたの運勢を読み解いています', delay: 4000 },
            { text: 'カードの意味を詳しく鑑定しています', delay: 9000 },
            { text: '詳しい解説を作成しています', delay: 15000 },
            { text: 'もうすぐ完了します', delay: 22000 }
        ];
        
        // ローディングオーバーレイを表示
        showLoadingOverlay(waitingMessages);
        
        try {
            const character = 'yukino';
            
            // メッセージを作成
            const message = `以下のタロットカードについて、詳しく解説してください。

カード：${card.name}
位置：${card.position}

このカードが示す${card.position}の意味、私の状況にどのように関連しているか、そして私の状況に合わせた具体的なアドバイスをお願いします。`;
            
            console.log('[タロット解説] APIリクエスト送信:', { character, cardName: card.name, position: card.position });
            
            // 会話履歴を取得
            let conversationHistory = [];
            if (window.ChatData) {
                const isGuest = !(window.ChatData.conversationHistory && window.ChatData.conversationHistory.userId);
                if (isGuest) {
                    conversationHistory = window.ChatData.getGuestHistory ? window.ChatData.getGuestHistory(character) || [] : [];
                } else {
                    conversationHistory = window.ChatData.conversationHistory?.recentMessages || [];
                }
            }
            
            // 会話履歴の形式を変換
            const clientHistory = conversationHistory.map(entry => {
                if (typeof entry === 'string') {
                    return { role: 'user', content: entry };
                }
                return {
                    role: entry.role || 'user',
                    content: entry.content || entry.message || ''
                };
            });
            
            // ユーザー情報を取得
            const urlParams = new URLSearchParams(window.location.search);
            let userId = null;
            const userIdParam = urlParams.get('userId');
            if (userIdParam) {
                userId = Number(userIdParam);
                if (!Number.isFinite(userId) || userId <= 0) {
                    userId = null;
                }
            }
            
            if (!userId && window.ChatData && window.ChatData.conversationHistory && window.ChatData.conversationHistory.userId) {
                userId = window.ChatData.conversationHistory.userId;
            }
            
            // ペイロードを作成
            const payload = {
                message: message,
                character: character,
                clientHistory: clientHistory,
                userId: userId || undefined
            };
            
            // ゲストメタデータを追加（必要な場合）
            if (window.ChatData && window.ChatData.getGuestMessageCount) {
                const messageCount = window.ChatData.getGuestMessageCount(character);
                payload.guestMetadata = { messageCount: messageCount };
            }
            
            // APIリクエストを送信
            const response = await fetch('/api/consult', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `APIエラー (${response.status})`;
                try {
                    const errorData = JSON.parse(errorText);
                    if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch {}
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            
            // エラーレスポンスのチェック
            if (data.error && !data.message) {
                throw new Error(data.error || '解説の取得に失敗しました');
            }
            
            // ローディングオーバーレイを非表示
            hideLoadingOverlay();
            
            // 雪乃の解説を表示
            if (window.ChatUI && typeof window.ChatUI.addMessage === 'function') {
                window.ChatUI.addMessage('character', data.message, '笹岡雪乃');
                window.ChatUI.scrollToLatest();
            }
            
            // 会話履歴に追加
            if (window.ChatData && typeof window.ChatData.addToHistory === 'function') {
                window.ChatData.addToHistory(character, 'user', message);
                window.ChatData.addToHistory(character, 'assistant', data.message);
            }
            
            // 「次のカードの鑑定」ボタンを表示
            displayNextStepButton();
            
        } catch (error) {
            hideLoadingOverlay();
            console.error('[タロット解説] エラー:', error);
            const errorMessage = error instanceof Error ? error.message : '解説の取得に失敗しました。もう一度お試しください。';
            alert(errorMessage);
            enableMessageInput();
        }
    }

    /**
     * 次のステップボタンを表示
     */
    function displayNextStepButton() {
        const messagesDiv = document.getElementById('messages');
        if (!messagesDiv) return;
        
        const buttonWrapper = document.createElement('div');
        buttonWrapper.style.width = '100%';
        buttonWrapper.style.display = 'flex';
        buttonWrapper.style.justifyContent = 'center';
        buttonWrapper.style.marginTop = '16px';
        buttonWrapper.style.marginBottom = '16px';
        
        let buttonLabel = '';
        let nextAction = null;
        
        if (currentState.phase === '過去') {
            buttonLabel = '次のカードの鑑定';
            nextAction = () => {
                currentState.phase = '現在';
                const nextCard = currentState.cards.find(c => c.position === '現在');
                if (window.ChatUI && window.ChatUI.addMessage) {
                    window.ChatUI.addMessage('character', 'それでは次に現在のカードをめくってみましょう。', '笹岡雪乃');
                    window.ChatUI.scrollToLatest();
                }
                setTimeout(() => {
                    displayCard(nextCard, messagesDiv);
                }, 500);
            };
        } else if (currentState.phase === '現在') {
            buttonLabel = '次のカードの鑑定';
            nextAction = () => {
                currentState.phase = '未来';
                const nextCard = currentState.cards.find(c => c.position === '未来');
                if (window.ChatUI && window.ChatUI.addMessage) {
                    window.ChatUI.addMessage('character', 'それでは次に未来のカードをめくってみましょう。', '笹岡雪乃');
                    window.ChatUI.scrollToLatest();
                }
                setTimeout(() => {
                    displayCard(nextCard, messagesDiv);
                }, 500);
            };
        } else if (currentState.phase === '未来') {
            buttonLabel = '雪乃のまとめ';
            nextAction = async () => {
                currentState.phase = 'summary';
                await requestSummary();
            };
        }
        
        const button = document.createElement('button');
        button.textContent = buttonLabel;
        button.style.padding = '12px 32px';
        button.style.fontSize = '16px';
        button.style.fontWeight = '600';
        button.style.color = '#ffffff';
        button.style.backgroundColor = 'rgba(138, 43, 226, 0.8)';
        button.style.border = '2px solid rgba(138, 43, 226, 1)';
        button.style.borderRadius = '8px';
        button.style.cursor = 'pointer';
        button.style.transition = 'all 0.2s ease';
        button.style.boxShadow = '0 4px 16px rgba(138, 43, 226, 0.4)';
        
        button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = 'rgba(138, 43, 226, 1)';
            button.style.transform = 'scale(1.05)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = 'rgba(138, 43, 226, 0.8)';
            button.style.transform = 'scale(1)';
        });
        
        button.addEventListener('click', () => {
            button.disabled = true;
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
            buttonWrapper.remove();
            
            if (nextAction) {
                nextAction();
            }
        });
        
        buttonWrapper.appendChild(button);
        messagesDiv.appendChild(buttonWrapper);
        
        if (window.ChatUI && window.ChatUI.scrollToLatest) {
            window.ChatUI.scrollToLatest();
        }
    }

    /**
     * まとめの解説をリクエスト
     */
    async function requestSummary() {
        try {
            const character = 'yukino';
            
            const cardNames = currentState.cards.map(c => `${c.position}：${c.name}`).join('\n');
            const message = `これまでに見た3枚のタロットカードを総合的に解釈して、まとめの鑑定をお願いします。

${cardNames}

過去、現在、未来の流れを踏まえて、今のあなたへの具体的なアドバイスと励ましの言葉をください。最後に「それでは、もし私に相談したいことがあれば、いつでもどうぞ」と締めくくってください。`;
            
            // 動的メッセージリスト（待機中のメッセージ）
            const waitingMessages = [
                { text: 'タロットカードのまとめを作成しています', delay: 0 },
                { text: '過去・現在・未来の流れを読み解いています', delay: 4000 },
                { text: '総合的な鑑定を作成しています', delay: 9000 },
                { text: 'あなたへのアドバイスをまとめています', delay: 15000 },
                { text: 'もうすぐ完了します', delay: 22000 }
            ];
            
            // ローディングオーバーレイを表示
            showLoadingOverlay(waitingMessages);
            
            console.log('[タロットまとめ] APIリクエスト送信:', { character, cardCount: currentState.cards.length });
            
            // 会話履歴を取得
            let conversationHistory = [];
            if (window.ChatData) {
                const isGuest = !(window.ChatData.conversationHistory && window.ChatData.conversationHistory.userId);
                if (isGuest) {
                    conversationHistory = window.ChatData.getGuestHistory ? window.ChatData.getGuestHistory(character) || [] : [];
                } else {
                    conversationHistory = window.ChatData.conversationHistory?.recentMessages || [];
                }
            }
            
            // 会話履歴の形式を変換
            const clientHistory = conversationHistory.map(entry => {
                if (typeof entry === 'string') {
                    return { role: 'user', content: entry };
                }
                return {
                    role: entry.role || 'user',
                    content: entry.content || entry.message || ''
                };
            });
            
            // ユーザー情報を取得
            const urlParams = new URLSearchParams(window.location.search);
            let userId = null;
            const userIdParam = urlParams.get('userId');
            if (userIdParam) {
                userId = Number(userIdParam);
                if (!Number.isFinite(userId) || userId <= 0) {
                    userId = null;
                }
            }
            
            if (!userId && window.ChatData && window.ChatData.conversationHistory && window.ChatData.conversationHistory.userId) {
                userId = window.ChatData.conversationHistory.userId;
            }
            
            // ペイロードを作成
            const payload = {
                message: message,
                character: character,
                clientHistory: clientHistory,
                userId: userId || undefined
            };
            
            // ゲストメタデータを追加（必要な場合）
            if (window.ChatData && window.ChatData.getGuestMessageCount) {
                const messageCount = window.ChatData.getGuestMessageCount(character);
                payload.guestMetadata = { messageCount: messageCount };
            }
            
            // APIリクエストを送信
            const response = await fetch('/api/consult', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `APIエラー (${response.status})`;
                try {
                    const errorData = JSON.parse(errorText);
                    if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch {}
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            
            // エラーレスポンスのチェック
            if (data.error && !data.message) {
                throw new Error(data.error || 'まとめの取得に失敗しました');
            }
            
            // ローディングオーバーレイを非表示
            hideLoadingOverlay();
            
            // 雪乃のまとめを表示
            if (window.ChatUI && typeof window.ChatUI.addMessage === 'function') {
                window.ChatUI.addMessage('character', data.message, '笹岡雪乃');
                window.ChatUI.scrollToLatest();
            }
            
            // 会話履歴に追加
            if (window.ChatData && typeof window.ChatData.addToHistory === 'function') {
                window.ChatData.addToHistory(character, 'user', message);
                window.ChatData.addToHistory(character, 'assistant', data.message);
            }
            
            // タロット占い完了 - 定型文とシステムメッセージを送信
            console.log('[タロット占い] 完了しました');
            await sendCompletionMessages(character);
            
        } catch (error) {
            console.error('[タロットまとめ] エラー:', error);
            const errorMessage = error instanceof Error ? error.message : 'まとめの取得に失敗しました。もう一度お試しください。';
            alert(errorMessage);
            
            // エラー時も入力欄を有効化
            enableMessageInput();
        }
    }

    /**
     * タロット鑑定完了メッセージを送信（定型文とボタンを表示）
     */
    async function sendCompletionMessages(character) {
        try {
            // 1. 雪乃の定型文を通常の吹き出しで表示
            // ニックネームを取得
            let nickname = 'あなた';
            if (window.ChatData) {
                if (window.ChatData.conversationHistory && window.ChatData.conversationHistory.nickname) {
                    nickname = window.ChatData.conversationHistory.nickname;
                } else if (window.ChatData.userNickname) {
                    nickname = window.ChatData.userNickname;
                }
            }
            
            const completionMessage = `${nickname}さんの過去、現在、未来の運勢をタロットカードで占った結果は、いかがでしたか?\nこれを踏まえて今度は、${nickname}さんの個人的なご相談をぜひ私に教えてください。\n私はあなたとつながって、誰よりも${nickname}さんのことを理解している鑑定士になりたいです。`;
            
            // ChatUI.addMessage() を使って通常のメッセージとして表示
            if (window.ChatUI && window.ChatUI.addMessage) {
                window.ChatUI.addMessage('character', completionMessage, '笹岡雪乃');
            }
            
            // 会話履歴に追加
            if (window.ChatData && typeof window.ChatData.addToHistory === 'function') {
                window.ChatData.addToHistory(character, 'assistant', completionMessage);
            }
            
            // 少し待ってから個別鑑定への移行メッセージを表示
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 2. 個別鑑定への移行メッセージを表示
            const consultationMessage = 'これから先は個別鑑定をしますので、何でも質問してくださいね';
            
            if (window.ChatUI && window.ChatUI.addMessage) {
                window.ChatUI.addMessage('character', consultationMessage, '笹岡雪乃');
                window.ChatUI.scrollToLatest();
            }
            
            // 会話履歴に追加
            if (window.ChatData && typeof window.ChatData.addToHistory === 'function') {
                window.ChatData.addToHistory(character, 'assistant', consultationMessage);
            }
            
            // 3. 個別相談モードを設定
            sessionStorage.setItem('yukinoConsultationStarted', 'true');
            sessionStorage.setItem('yukinoConsultationMessageCount', '0');
            sessionStorage.setItem('yukinoSummaryShown', 'true');
            
            // 4. 入力欄を有効化
            enableMessageInput();
            
            console.log('[タロット占い] 個別鑑定モードに移行しました。入力欄を有効化しました。');
            
            
        } catch (error) {
            console.error('[タロット完了メッセージ] エラー:', error);
            // エラーが発生しても、入力欄を有効化
            enableMessageInput();
        }
    }

    /**
     * 入力欄を無効化（タロット鑑定中）
     */
    function disableMessageInput() {
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        
        if (messageInput) {
            messageInput.disabled = true;
            messageInput.placeholder = 'タロット鑑定中です...鑑定が終わったら質問してくださいね';
            messageInput.style.backgroundColor = 'rgba(200, 200, 200, 0.3)';
            messageInput.style.cursor = 'not-allowed';
            
            // プレースホルダーの色を白くしてコントラストを改善
            messageInput.classList.add('tarot-disabled');
            
            // スタイルが存在しない場合は追加
            if (!document.getElementById('tarot-disabled-style')) {
                const style = document.createElement('style');
                style.id = 'tarot-disabled-style';
                style.textContent = `
                    #messageInput.tarot-disabled::placeholder {
                        color: #fff !important;
                        opacity: 1 !important;
                    }
                `;
                document.head.appendChild(style);
            }
        }
        
        if (sendButton) {
            sendButton.disabled = true;
            sendButton.style.opacity = '0.5';
            sendButton.style.cursor = 'not-allowed';
        }
        
        console.log('[タロット占い] 入力欄を無効化しました');
    }

    /**
     * 入力欄を有効化（タロット鑑定終了後）
     */
    function enableMessageInput() {
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        
        if (messageInput) {
            messageInput.disabled = false;
            messageInput.placeholder = 'メッセージを入力';
            messageInput.style.backgroundColor = '';
            messageInput.style.cursor = '';
            
            // プレースホルダーのスタイルクラスを削除
            messageInput.classList.remove('tarot-disabled');
        }
        
        if (sendButton) {
            sendButton.disabled = false;
            sendButton.style.opacity = '';
            sendButton.style.cursor = '';
        }
        
        console.log('[タロット占い] 入力欄を有効化しました');
    }

    /**
     * タロット占いを開始
     */
    function startTarotReading() {
        // 3枚のカードを選択
        currentState.cards = selectThreeCards();
        currentState.phase = '過去';
        
        console.log('[タロット占い] 開始:', currentState.cards);
        
        // 入力欄を無効化
        disableMessageInput();
        
        // 雪乃のメッセージを表示
        const messagesDiv = document.getElementById('messages');
        if (!messagesDiv) {
            console.error('[タロット占い] messages要素が見つかりません');
            return;
        }
        
        if (window.ChatUI && window.ChatUI.addMessage) {
            window.ChatUI.addMessage('character', 'それではまず過去のタロットから占いますね。カードを伏せておきますので、めくってください。', '笹岡雪乃');
            window.ChatUI.scrollToLatest();
        }
        
        // 最初のカードを表示
        setTimeout(() => {
            const firstCard = currentState.cards.find(c => c.position === '過去');
            displayCard(firstCard, messagesDiv);
        }, 500);
    }

    /**
     * 1枚のカード鑑定を開始
     */
    function startSingleCardReading() {
        console.log('[タロット占い] 1枚のカード鑑定を開始');
        
        // 1枚のカードを選択
        const singleCard = selectSingleCard();
        currentState.phase = '1枚鑑定';
        currentState.cards = [singleCard];
        currentState.isCardFlipped = false;
        currentState.isExplanationShown = false;
        
        // 入力欄を無効化
        disableMessageInput();
        
        // メッセージエリアを取得
        const messagesDiv = document.getElementById('messages');
        if (!messagesDiv) {
            console.error('[タロット占い] メッセージエリアが見つかりません');
            return;
        }
        
        // 雪乃のメッセージを表示
        if (window.ChatUI && typeof window.ChatUI.addMessage === 'function') {
            window.ChatUI.addMessage('character', 'それでは、カードを伏せておきますので、めくってください。', '笹岡雪乃');
            window.ChatUI.scrollToLatest();
        }
        
        // カードを表示
        setTimeout(() => {
            displaySingleCard(singleCard, messagesDiv);
        }, 500);
    }

    /**
     * 1枚のカードを表示
     */
    function displaySingleCard(card, container) {
        console.log('[タロット占い] 1枚のカードを表示:', card.name);
        
        const cardContainer = document.createElement('div');
        cardContainer.style.width = '100%';
        cardContainer.style.display = 'flex';
        cardContainer.style.justifyContent = 'center';
        cardContainer.style.marginTop = '16px';
        cardContainer.style.marginBottom = '16px';
        
        const cardWrapper = document.createElement('div');
        cardWrapper.style.position = 'relative';
        cardWrapper.style.width = '200px';
        cardWrapper.style.textAlign = 'center';
        
        // カード位置ラベル
        const cardLabel = document.createElement('div');
        cardLabel.textContent = `～現在のあなた～`;
        cardLabel.style.fontSize = '16px';
        cardLabel.style.fontWeight = 'bold';
        cardLabel.style.color = '#8a2be2';
        cardLabel.style.marginBottom = '12px';
        cardLabel.style.opacity = '1';
        cardWrapper.appendChild(cardLabel);
        
        // カード画像コンテナ
        const cardImageWrapper = document.createElement('div');
        cardImageWrapper.style.position = 'relative';
        cardImageWrapper.style.width = '200px';
        cardImageWrapper.style.height = '320px';
        cardImageWrapper.style.cursor = 'pointer';
        cardImageWrapper.style.perspective = '1000px';
        
        // 裏面画像
        const backImage = document.createElement('img');
        backImage.src = '/photo/TAROT/card back.png';
        backImage.alt = 'カードの裏';
        backImage.style.position = 'absolute';
        backImage.style.top = '0';
        backImage.style.left = '0';
        backImage.style.width = '100%';
        backImage.style.height = '100%';
        backImage.style.objectFit = 'contain';
        backImage.style.borderRadius = '8px';
        backImage.style.transition = 'opacity 0.6s ease';
        backImage.style.opacity = '1';
        
        // 表面画像
        const frontImage = document.createElement('img');
        frontImage.src = `/photo/TAROT/${card.image}`;
        frontImage.alt = card.name;
        frontImage.style.position = 'absolute';
        frontImage.style.top = '0';
        frontImage.style.left = '0';
        frontImage.style.width = '100%';
        frontImage.style.height = '100%';
        frontImage.style.objectFit = 'contain';
        frontImage.style.borderRadius = '8px';
        frontImage.style.transition = 'opacity 0.6s ease';
        frontImage.style.opacity = '0';
        
        cardImageWrapper.appendChild(backImage);
        cardImageWrapper.appendChild(frontImage);
        cardWrapper.appendChild(cardImageWrapper);
        
        // カード名表示エリア
        const cardNameLabel = document.createElement('div');
        cardNameLabel.style.fontSize = '18px';
        cardNameLabel.style.fontWeight = 'bold';
        cardNameLabel.style.color = '#333';
        cardNameLabel.style.marginTop = '12px';
        cardNameLabel.style.opacity = '0';
        cardNameLabel.style.transition = 'opacity 0.3s ease';
        cardWrapper.appendChild(cardNameLabel);
        
        // めくるガイド
        const flipGuide = document.createElement('div');
        flipGuide.textContent = 'カードをタップしてめくってください';
        flipGuide.style.fontSize = '14px';
        flipGuide.style.color = '#666';
        flipGuide.style.marginTop = '8px';
        flipGuide.style.opacity = '1';
        flipGuide.style.transition = 'opacity 0.3s ease';
        cardWrapper.appendChild(flipGuide);
        
        // カードをめくる処理
        let isFlipped = false;
        cardImageWrapper.addEventListener('click', () => {
            if (isFlipped) return;
            
            isFlipped = true;
            backImage.style.opacity = '0';
            frontImage.style.opacity = '1';
            
            setTimeout(() => {
                cardNameLabel.textContent = card.name;
                cardNameLabel.style.opacity = '1';
                flipGuide.style.opacity = '0';
                
                // 拡大ボタンと解説ボタンを表示
                const expandButton = document.createElement('button');
                expandButton.textContent = '拡大する';
                expandButton.style.marginTop = '12px';
                expandButton.style.padding = '8px 16px';
                expandButton.style.fontSize = '14px';
                expandButton.style.backgroundColor = '#8a2be2';
                expandButton.style.color = '#fff';
                expandButton.style.border = 'none';
                expandButton.style.borderRadius = '4px';
                expandButton.style.cursor = 'pointer';
                expandButton.style.marginRight = '8px';
                expandButton.addEventListener('click', () => {
                    showCardModal(card.name, card.image);
                });
                
                const explainButton = document.createElement('button');
                explainButton.textContent = '雪乃の解説';
                explainButton.style.marginTop = '12px';
                explainButton.style.padding = '8px 16px';
                explainButton.style.fontSize = '14px';
                explainButton.style.backgroundColor = '#ff69b4';
                explainButton.style.color = '#fff';
                explainButton.style.border = 'none';
                explainButton.style.borderRadius = '4px';
                explainButton.style.cursor = 'pointer';
                explainButton.addEventListener('click', () => {
                    explainButton.disabled = true;
                    explainButton.style.opacity = '0.5';
                    explainButton.style.cursor = 'not-allowed';
                    requestSingleCardExplanation(card);
                });
                
                cardWrapper.appendChild(expandButton);
                cardWrapper.appendChild(explainButton);
            }, 300);
        });
        
        cardContainer.appendChild(cardWrapper);
        container.appendChild(cardContainer);
        
        if (window.ChatUI && typeof window.ChatUI.scrollToLatest === 'function') {
            window.ChatUI.scrollToLatest();
        }
    }

    /**
     * 1枚のカードの解説をAPIにリクエスト
     */
    async function requestSingleCardExplanation(card) {
        console.log('[タロット占い] 1枚のカード解説をリクエスト:', card.name);
        
        // 最初のメッセージを表示（「タロットを引いています」を削除）
        showLoadingOverlay('');
        
        // 10秒後に2番目のメッセージに更新
        const message2Timeout = setTimeout(() => {
            const loadingText = document.getElementById('yukinoTarotLoadingText');
            if (loadingText) {
                loadingText.textContent = '運勢を鑑定しています';
            }
        }, 10000);
        
        // 20秒後に3番目のメッセージに更新
        const message3Timeout = setTimeout(() => {
            const loadingText = document.getElementById('yukinoTarotLoadingText');
            if (loadingText) {
                loadingText.textContent = '返信を書き込んでいます';
            }
        }, 20000);
        
        try {
            const character = 'yukino';
            
            // 【変更】ユーザー情報をChatData.conversationHistoryから取得（データベースベースの判断）
            // localStorageからの取得を削除
            let nickname = '';
            let birthYear = null;
            let birthMonth = null;
            let birthDay = null;
            
            if (window.ChatData && window.ChatData.conversationHistory) {
                nickname = window.ChatData.conversationHistory.nickname || '';
                birthYear = window.ChatData.conversationHistory.birthYear || null;
                birthMonth = window.ChatData.conversationHistory.birthMonth || null;
                birthDay = window.ChatData.conversationHistory.birthDay || null;
            }
            
            // ユーザー情報の検証
            if (!nickname || !birthYear || !birthMonth || !birthDay) {
                throw new Error('ユーザー情報が取得できませんでした。ページをリロードして再度お試しください。');
            }
            
            // 数値に変換
            birthYear = parseInt(birthYear, 10);
            birthMonth = parseInt(birthMonth, 10);
            birthDay = parseInt(birthDay, 10);
            
            // リクエストペイロードを作成（chat-api.jsのsendMessageと同じ形式）
            const payload = {
                message: `[TAROT_SINGLE_CARD:${card.name}]`,
                character: character,
                nickname,
                birthYear,
                birthMonth,
                birthDay
            };
            
            console.log('[タロット占い] 1枚カード解説APIリクエスト送信:', { character, cardName: card.name });
            
            const response = await fetch('/api/consult', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                // エラーレスポンスの詳細を取得
                let errorMessage = `APIエラー (${response.status})`;
                try {
                    const errorText = await response.text();
                    if (errorText) {
                        const errorData = JSON.parse(errorText);
                        errorMessage = errorData.error || errorData.message || errorMessage;
                    }
                } catch (e) {
                    console.error('[タロット占い] エラーレスポンスの解析に失敗:', e);
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            
            // エラーレスポンスのチェック
            if (data.error && !data.message) {
                throw new Error(data.error || 'カードの解説の取得に失敗しました');
            }
            
            // デバッグ: APIレスポンスの構造を確認
            console.log('[タロット解説（個別）] APIレスポンス:', {
                hasMessage: 'message' in data,
                messageType: typeof data.message,
                messageValue: data.message,
                fullData: data
            });
            
            // data.messageが文字列でない場合の処理
            if (!data.message || typeof data.message !== 'string') {
                console.error('[タロット解説（個別）] ⚠️ data.messageが文字列ではありません！', {
                    messageType: typeof data.message,
                    messageValue: data.message,
                    fullData: data
                });
                throw new Error('APIレスポンスの形式が不正です。');
            }
            
            // タイマーをクリア（APIレスポンスが返ってきたら即座に非表示）
            clearTimeout(message2Timeout);
            clearTimeout(message3Timeout);
            hideLoadingOverlay();
            
            // 雪乃の解説を表示
            if (window.ChatUI && typeof window.ChatUI.addMessage === 'function') {
                window.ChatUI.addMessage('character', data.message, '笹岡雪乃');
                window.ChatUI.scrollToLatest();
            }
            
            // 会話履歴に追加
            if (window.ChatData && typeof window.ChatData.addToHistory === 'function') {
                window.ChatData.addToHistory(character, 'user', `[TAROT_SINGLE_CARD:${card.name}]`);
                window.ChatData.addToHistory(character, 'assistant', data.message);
            }
            
            console.log('[タロット占い] 1枚のカード鑑定完了');
            
            // 1枚のカード鑑定完了後、自動的に入力欄を有効化
            enableMessageInput();
            
        } catch (error) {
            // タイマーをクリア（エラー時もクリア）
            clearTimeout(message2Timeout);
            clearTimeout(message3Timeout);
            console.error('[タロット占い] エラー:', error);
            hideLoadingOverlay();
            const errorMessage = error instanceof Error ? error.message : 'カードの解説の取得に失敗しました。もう一度お試しください。';
            alert(errorMessage);
            enableMessageInput();
        }
    }

    /**
     * 初期化処理（ハンドラーから呼び出される）
     */
    function initTarot() {
        console.log('[タロット機能] 初期化処理を実行');
        // 特に初期化処理は不要（状態は必要に応じてリセットされる）
        currentState = {
            phase: null,
            cards: [],
            isCardFlipped: false,
            isExplanationShown: false
        };
    }

    // グローバルに公開
    window.YukinoTarot = {
        init: initTarot,
        start: startTarotReading,
        startSingleCard: startSingleCardReading,
        displayNextCardButton: displayNextStepButton,
        sendCompletionMessages: sendCompletionMessages
    };
    
    console.log('[タロット機能] 初期化完了（新規実装）');
})();


