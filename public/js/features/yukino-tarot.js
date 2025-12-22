/**
 * 笹岡雪乃のタロットカード機能
 * タロットカードの検出、表示、インタラクションを管理
 */

(function() {
    'use strict';

    // タロットカード名から画像ファイル名へのマッピング
    const tarotCardImageMap = {
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

    // タロットカードの検出キーワード
    const tarotKeywords = ['タロットカードをめくってみましょうね', 'タロットカードを引きました', 'タロットカード'];

    /**
     * タロットカードが含まれているか検出
     * @param {string} text - 検出するテキスト
     * @returns {boolean} タロットカードが含まれているか
     */
    function detectTarotCards(text) {
        return tarotKeywords.some(keyword => text.includes(keyword));
    }

    /**
     * カード拡大表示モーダル
     * @param {string} cardName - カード名
     * @param {string} imageFile - 画像ファイル名
     */
    function showCardModal(cardName, imageFile) {
        // 既存のモーダルがあれば削除
        const existingModal = document.getElementById('tarotCardModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = 'tarotCardModal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        modal.style.zIndex = '10000';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        
        const cardImage = document.createElement('img');
        cardImage.src = `../../photo/TAROT/${imageFile}`;
        cardImage.alt = cardName;
        cardImage.style.maxWidth = '90vw';
        cardImage.style.maxHeight = '90vh';
        cardImage.style.objectFit = 'contain';
        cardImage.style.borderRadius = '12px';
        cardImage.style.boxShadow = '0 8px 32px rgba(138, 43, 226, 0.6)';
        
        // ×印のボタン
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
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            modal.remove();
        });
        
        modal.appendChild(cardImage);
        modal.appendChild(closeButton);
        document.body.appendChild(modal);
        
        // 背景をクリックしても閉じる
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * カードをめくった瞬間に画面いっぱいに表示してフェードアウト
     * @param {string} cardName - カード名
     * @param {string} imageFile - 画像ファイル名
     */
    function showCardFullscreenFade(cardName, imageFile) {
        const fullscreenOverlay = document.createElement('div');
        fullscreenOverlay.style.position = 'fixed';
        fullscreenOverlay.style.top = '0';
        fullscreenOverlay.style.left = '0';
        fullscreenOverlay.style.width = '100vw';
        fullscreenOverlay.style.height = '100vh';
        fullscreenOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
        fullscreenOverlay.style.zIndex = '9999';
        fullscreenOverlay.style.display = 'flex';
        fullscreenOverlay.style.justifyContent = 'center';
        fullscreenOverlay.style.alignItems = 'center';
        fullscreenOverlay.style.opacity = '1';
        fullscreenOverlay.style.transition = 'opacity 1s ease-out';
        
        const cardImage = document.createElement('img');
        cardImage.src = `../../photo/TAROT/${imageFile}`;
        cardImage.alt = cardName;
        cardImage.style.maxWidth = '90vw';
        cardImage.style.maxHeight = '90vh';
        cardImage.style.objectFit = 'contain';
        cardImage.style.borderRadius = '12px';
        cardImage.style.boxShadow = '0 8px 32px rgba(138, 43, 226, 0.8)';
        
        fullscreenOverlay.appendChild(cardImage);
        document.body.appendChild(fullscreenOverlay);
        
        // 1秒後にフェードアウト
        setTimeout(() => {
            fullscreenOverlay.style.opacity = '0';
            setTimeout(() => {
                fullscreenOverlay.remove();
            }, 1000);
        }, 1000);
    }

    /**
     * タロットカードをランダムに選択して裏面カードを表示（クリックでめくれる）
     * @param {string} text - メッセージテキスト
     * @param {HTMLElement} container - カードを表示するコンテナ
     * @param {Function} sendMessageCallback - メッセージ送信コールバック関数 (skipUserMessage, skipAnimation)
     */
    function displayTarotCards(text, container, sendMessageCallback) {
        // タロット占いが開始されたかどうかを検出
        const hasTarotReading = detectTarotCards(text);
        
        // タロット占いが開始された場合、ランダムに1枚のカードを選択
        let selectedCards = [];
        if (hasTarotReading) {
            const allCardNames = Object.keys(tarotCardImageMap);
            const shuffled = [...allCardNames].sort(() => Math.random() - 0.5);
            
            // 1枚のカードをランダムに選択
            selectedCards = [
                { position: '', name: shuffled[0], image: tarotCardImageMap[shuffled[0]] }
            ];
        }
        
        // カードを裏面から表示（クリックでめくれる）
        if (selectedCards.length > 0) {
            const cardsContainer = document.createElement('div');
            cardsContainer.style.display = 'flex';
            cardsContainer.style.flexWrap = 'wrap';
            cardsContainer.style.gap = '12px';
            cardsContainer.style.marginTop = '12px';
            cardsContainer.style.justifyContent = 'center';
            cardsContainer.style.alignItems = 'center';
            
            // 選択されたカード情報をコンテナに保存
            cardsContainer.dataset.tarotCards = JSON.stringify(selectedCards);
            
            selectedCards.forEach(card => {
                const cardWrapper = document.createElement('div');
                cardWrapper.style.display = 'flex';
                cardWrapper.style.flexDirection = 'column';
                cardWrapper.style.alignItems = 'center';
                cardWrapper.style.gap = '6px';
                
                // カードラベル（めくった後に表示）
                const cardLabel = document.createElement('div');
                cardLabel.textContent = '';
                cardLabel.style.fontSize = '12px';
                cardLabel.style.color = 'rgba(255, 255, 255, 0.8)';
                cardLabel.style.fontWeight = '600';
                cardLabel.style.opacity = '0';
                cardLabel.style.transition = 'opacity 0.3s ease';
                
                // カード名ラベル（めくった後に表示）
                const cardNameLabel = document.createElement('div');
                cardNameLabel.textContent = card.name;
                cardNameLabel.style.fontSize = '11px';
                cardNameLabel.style.color = 'rgba(255, 255, 255, 0.9)';
                cardNameLabel.style.fontWeight = '500';
                cardNameLabel.style.marginTop = '4px';
                cardNameLabel.style.opacity = '0';
                cardNameLabel.style.transition = 'opacity 0.3s ease';
                
                // カードコンテナ（3D flip用）
                const cardContainer = document.createElement('div');
                cardContainer.className = 'tarot-flip-card';
                cardContainer.style.position = 'relative';
                cardContainer.style.width = '80px';
                cardContainer.style.height = '120px';
                cardContainer.style.perspective = '1000px';
                cardContainer.style.cursor = 'pointer';
                
                // カード本体
                const cardInner = document.createElement('div');
                cardInner.className = 'tarot-flip-card-inner';
                cardInner.style.position = 'relative';
                cardInner.style.width = '100%';
                cardInner.style.height = '100%';
                cardInner.style.transition = 'transform 0.6s';
                cardInner.style.transformStyle = 'preserve-3d';
                
                // 裏面（カードの裏）
                const cardBack = document.createElement('div');
                cardBack.className = 'tarot-flip-card-back';
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
                
                // 表面（カードの画像）
                const cardFront = document.createElement('div');
                cardFront.className = 'tarot-flip-card-front';
                cardFront.style.position = 'absolute';
                cardFront.style.width = '100%';
                cardFront.style.height = '100%';
                cardFront.style.backfaceVisibility = 'hidden';
                cardFront.style.transform = 'rotateY(180deg)';
                cardFront.style.borderRadius = '8px';
                cardFront.style.overflow = 'hidden';
                
                const cardImage = document.createElement('img');
                cardImage.src = `../../photo/TAROT/${card.image}`;
                cardImage.alt = card.name;
                cardImage.title = card.name;
                cardImage.style.width = '100%';
                cardImage.style.height = '100%';
                cardImage.style.objectFit = 'cover';
                cardImage.style.cursor = 'pointer';
                
                // クリックで拡大表示
                cardImage.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showCardModal(card.name, card.image);
                });
                
                cardFront.appendChild(cardImage);
                
                cardInner.appendChild(cardBack);
                cardInner.appendChild(cardFront);
                cardContainer.appendChild(cardInner);
                
                // クリックでカードをめくる
                let isFlipped = false;
                const flippedCards = new Set();
                
                cardContainer.addEventListener('click', () => {
                    if (!isFlipped) {
                        isFlipped = true;
                        cardInner.style.transform = 'rotateY(180deg)';
                        flippedCards.add(card.position);
                        
                        // カードをめくった瞬間に画面いっぱいに表示してフェードアウト
                        showCardFullscreenFade(card.name, card.image);
                        
                        // カードをめくった後にラベルを表示
                        setTimeout(() => {
                            cardLabel.style.opacity = '1';
                            cardNameLabel.style.opacity = '1';
                        }, 300);
                        
                        // すべてのカードがめくられたかチェック（1枚のカードなので、めくったらすぐに自動的にAPIにメッセージを送信）
                        if (flippedCards.size === selectedCards.length) {
                            console.log('すべてのカードがめくられました。自動的に鑑定をリクエストします。');
                            
                            // カード情報をメッセージとして送信
                            const cardInfo = selectedCards.map(card => card.name).join('\n');
                            const message = `以下のタロットカードについて、詳しく解説してください。\n${cardInfo}\n\nこのカードの意味、私の状況にどのように関連しているか、そして私の状況に合わせた具体的なアドバイスをお願いします。`;
                            
                            console.log('タロットカード解説リクエスト（自動送信）:', message);
                            
                            // 少し遅延を入れてから自動的にメッセージを送信
                            setTimeout(async () => {
                                const messageInputEl = document.getElementById('messageInput');
                                if (messageInputEl && sendMessageCallback) {
                                    messageInputEl.value = message;
                                    await sendMessageCallback(true, true); // skipUserMessage = true, skipAnimation = true
                                } else {
                                    console.error('メッセージ送信に失敗: messageInputEl=', messageInputEl, 'sendMessageCallback=', sendMessageCallback);
                                }
                            }, 1000); // 1秒後に送信
                        }
                    }
                });
                
                // カードを拡大するリンク
                const expandLink = document.createElement('div');
                expandLink.textContent = 'カードを拡大する';
                expandLink.style.fontSize = '12px';
                expandLink.style.color = 'rgba(255, 255, 255, 0.8)';
                expandLink.style.cursor = 'pointer';
                expandLink.style.marginTop = '8px';
                expandLink.style.textDecoration = 'underline';
                expandLink.style.transition = 'color 0.2s ease';
                expandLink.addEventListener('mouseenter', () => {
                    expandLink.style.color = 'rgba(255, 255, 255, 1)';
                });
                expandLink.addEventListener('mouseleave', () => {
                    expandLink.style.color = 'rgba(255, 255, 255, 0.8)';
                });
                expandLink.addEventListener('click', () => {
                    showCardModal(card.name, card.image);
                });
                
                cardWrapper.appendChild(cardLabel);
                cardWrapper.appendChild(cardContainer);
                cardWrapper.appendChild(cardNameLabel);
                cardWrapper.appendChild(expandLink);
                cardsContainer.appendChild(cardWrapper);
            });
            
            // ヒントメッセージ
            const hint = document.createElement('div');
            hint.style.width = '100%';
            hint.style.textAlign = 'center';
            hint.style.marginTop = '8px';
            hint.style.fontSize = '12px';
            hint.style.color = 'rgba(255, 255, 255, 0.7)';
            hint.textContent = 'カードをタップしてめくってください';
            hint.id = 'tarot-hint';
            cardsContainer.appendChild(hint);
            
            container.appendChild(cardsContainer);
        }
    }

    /**
     * 解説後に「次のカードの鑑定」または「雪乃のまとめ」ボタンを表示
     * @param {string} cardPosition - カードの位置（過去/現在/未来）
     * @param {HTMLElement} container - ボタンを表示するコンテナ
     */
    function displayNextCardButton(cardPosition, container) {
        const characterName = '笹岡雪乃';
        
        // ボタンのラベルとメッセージを決定
        let buttonLabel = '';
        let nextMessage = '';
        let isLastCard = false;
        
        if (cardPosition === '過去') {
            buttonLabel = '次のカードの鑑定';
            nextMessage = 'それでは次に現在のカードをめくってみましょう。';
        } else if (cardPosition === '現在') {
            buttonLabel = '次のカードの鑑定';
            nextMessage = 'それでは次に未来のカードをめくってみましょう。';
        } else if (cardPosition === '未来') {
            buttonLabel = '雪乃のまとめ';
            nextMessage = '';
            isLastCard = true;
        }
        
        // ボタンを作成
        const buttonWrapper = document.createElement('div');
        buttonWrapper.style.width = '100%';
        buttonWrapper.style.display = 'flex';
        buttonWrapper.style.justifyContent = 'center';
        buttonWrapper.style.marginTop = '16px';
        buttonWrapper.style.marginBottom = '16px';
        
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
        
        // ホバー効果
        button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = 'rgba(138, 43, 226, 1)';
            button.style.transform = 'scale(1.05)';
            button.style.boxShadow = '0 6px 20px rgba(138, 43, 226, 0.6)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = 'rgba(138, 43, 226, 0.8)';
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 16px rgba(138, 43, 226, 0.4)';
        });
        
        // ボタンクリック時の処理
        button.addEventListener('click', () => {
            // ボタンを無効化
            button.disabled = true;
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
            
            if (isLastCard) {
                // 「雪乃のまとめ」の場合
                // displaySummaryButton(container);を呼び出すのではなく、まとめボタンを直接表示
                buttonWrapper.remove();
                
                // まとめボタンを作成
                const summaryButtonWrapper = document.createElement('div');
                summaryButtonWrapper.style.width = '100%';
                summaryButtonWrapper.style.display = 'flex';
                summaryButtonWrapper.style.justifyContent = 'center';
                summaryButtonWrapper.style.marginTop = '16px';
                summaryButtonWrapper.style.marginBottom = '16px';
                
                const summaryButton = document.createElement('button');
                summaryButton.textContent = '雪乃のまとめ';
                summaryButton.style.padding = '12px 32px';
                summaryButton.style.fontSize = '16px';
                summaryButton.style.fontWeight = '600';
                summaryButton.style.color = '#ffffff';
                summaryButton.style.backgroundColor = 'rgba(138, 43, 226, 0.8)';
                summaryButton.style.border = '2px solid rgba(138, 43, 226, 1)';
                summaryButton.style.borderRadius = '8px';
                summaryButton.style.cursor = 'pointer';
                summaryButton.style.transition = 'all 0.2s ease';
                summaryButton.style.boxShadow = '0 4px 16px rgba(138, 43, 226, 0.4)';
                
                summaryButton.addEventListener('mouseenter', () => {
                    summaryButton.style.backgroundColor = 'rgba(138, 43, 226, 1)';
                    summaryButton.style.transform = 'scale(1.05)';
                    summaryButton.style.boxShadow = '0 6px 20px rgba(138, 43, 226, 0.6)';
                });
                summaryButton.addEventListener('mouseleave', () => {
                    summaryButton.style.backgroundColor = 'rgba(138, 43, 226, 0.8)';
                    summaryButton.style.transform = 'scale(1)';
                    summaryButton.style.boxShadow = '0 4px 16px rgba(138, 43, 226, 0.4)';
                });
                
                summaryButton.addEventListener('click', () => {
                    summaryButton.disabled = true;
                    summaryButton.style.opacity = '0.5';
                    
                    // まとめの解説をリクエスト
                    if (window.ChatInit && window.ChatInit.sendMessage) {
                        const summaryMessage = '[TAROT_SUMMARY_REQUEST]';
                        window.ChatInit.sendMessage(summaryMessage, true, true); // skipUserMessage, skipAnimation
                    }
                });
                
                summaryButtonWrapper.appendChild(summaryButton);
                container.appendChild(summaryButtonWrapper);
            } else {
                // 次のカードへ進む
                buttonWrapper.remove();
                
                // 雪乃のメッセージを表示
                if (window.ChatUI && window.ChatUI.addMessage) {
                    window.ChatUI.addMessage('character', nextMessage, characterName);
                    window.ChatUI.scrollToLatest();
                }
                
                // 次のカードの裏面を表示
                setTimeout(() => {
                    const remainingCardsStr = sessionStorage.getItem('yukinoRemainingCards');
                    if (remainingCardsStr) {
                        const remainingCards = JSON.parse(remainingCardsStr);
                        if (remainingCards.length > 0) {
                            const nextCard = remainingCards[0];
                            displayTarotCards('', container, window.ChatInit.sendMessage, [nextCard], { skipButtonDisplay: true });
                        }
                    }
                }, 500);
            }
        });
        
        buttonWrapper.appendChild(button);
        container.appendChild(buttonWrapper);
        
        console.log(`[タロットカード] ${cardPosition}の解説後、「${buttonLabel}」ボタンを表示しました。`);
    }

    // グローバルに公開
    window.YukinoTarot = {
        detect: detectTarotCards,
        display: displayTarotCards,
        displayNextCardButton: displayNextCardButton
    };
})();
