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
     * カードを拡大表示し、「雪乃の解説」ボタンを表示
     * @param {string} cardName - カード名
     * @param {string} imageFile - 画像ファイル名
     * @param {string} cardPosition - カードの位置（過去/現在/未来）
     * @param {Function} onExplanationClick - 解説ボタンがクリックされたときのコールバック
     */
    function showCardFullscreenWithExplanation(cardName, imageFile, cardPosition, onExplanationClick) {
        // 既存のオーバーレイがあれば削除
        const existingOverlay = document.getElementById('tarotCardFullscreenOverlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        const fullscreenOverlay = document.createElement('div');
        fullscreenOverlay.id = 'tarotCardFullscreenOverlay';
        fullscreenOverlay.style.position = 'fixed';
        fullscreenOverlay.style.top = '0';
        fullscreenOverlay.style.left = '0';
        fullscreenOverlay.style.width = '100vw';
        fullscreenOverlay.style.height = '100vh';
        fullscreenOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
        fullscreenOverlay.style.zIndex = '9999';
        fullscreenOverlay.style.display = 'flex';
        fullscreenOverlay.style.flexDirection = 'column';
        fullscreenOverlay.style.justifyContent = 'center';
        fullscreenOverlay.style.alignItems = 'center';
        fullscreenOverlay.style.opacity = '0';
        fullscreenOverlay.style.transition = 'opacity 0.5s ease-in';
        
        const cardImage = document.createElement('img');
        cardImage.src = `../../photo/TAROT/${imageFile}`;
        cardImage.alt = cardName;
        cardImage.style.maxWidth = '70vw';
        cardImage.style.maxHeight = '70vh';
        cardImage.style.objectFit = 'contain';
        cardImage.style.borderRadius = '12px';
        cardImage.style.boxShadow = '0 8px 32px rgba(138, 43, 226, 0.8)';
        cardImage.style.marginBottom = '24px';
        
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
        explanationButton.style.transition = 'all 0.2s ease';
        explanationButton.style.boxShadow = '0 4px 16px rgba(138, 43, 226, 0.4)';
        
        // ボタンのホバー効果
        explanationButton.addEventListener('mouseenter', () => {
            explanationButton.style.backgroundColor = 'rgba(138, 43, 226, 1)';
            explanationButton.style.transform = 'scale(1.05)';
            explanationButton.style.boxShadow = '0 6px 20px rgba(138, 43, 226, 0.6)';
        });
        explanationButton.addEventListener('mouseleave', () => {
            explanationButton.style.backgroundColor = 'rgba(138, 43, 226, 0.8)';
            explanationButton.style.transform = 'scale(1)';
            explanationButton.style.boxShadow = '0 4px 16px rgba(138, 43, 226, 0.4)';
        });
        
        // ボタンクリック時の処理
        explanationButton.addEventListener('click', () => {
            // オーバーレイをフェードアウト
            fullscreenOverlay.style.opacity = '0';
            setTimeout(() => {
                fullscreenOverlay.remove();
                // 解説を開始
                if (onExplanationClick) {
                    onExplanationClick();
                }
            }, 500);
        });
        
        fullscreenOverlay.appendChild(cardImage);
        fullscreenOverlay.appendChild(explanationButton);
        document.body.appendChild(fullscreenOverlay);
        
        // フェードイン
        setTimeout(() => {
            fullscreenOverlay.style.opacity = '1';
        }, 10);
    }

    /**
     * 次のタロットカードを表示する関数（過去→現在→未来の順番）
     * @param {Object} card - 表示するカード情報
     * @param {HTMLElement} container - カードを表示するコンテナ
     * @param {Function} sendMessageCallback - メッセージ送信コールバック
     */
    function displayNextTarotCard(card, container, sendMessageCallback) {
        console.log('[タロットカード] displayNextTarotCard 呼び出し', card);
        // displayTarotCards関数を再利用（forcedCardsとして1枚のカードを渡す）
        displayTarotCards('', container, sendMessageCallback, [card]);
    }

    /**
     * タロットカードをランダムに選択して表示
     * ゲストモードの最初の挨拶では、過去・現在・未来の3枚を順番に自動的にめくった状態で表示
     * @param {string} text - メッセージテキスト
     * @param {HTMLElement} container - カードを表示するコンテナ
     * @param {Function} sendMessageCallback - メッセージ送信コールバック関数 (skipUserMessage, skipAnimation)
     */
    function displayTarotCards(text, container, sendMessageCallback, forcedCards = null) {
        // forcedCardsが指定されている場合、それを使用
        let selectedCards = [];
        if (forcedCards) {
            selectedCards = forcedCards;
        } else {
            // タロット占いが開始されたかどうかを検出
            const hasTarotReading = detectTarotCards(text);
            
            // ゲストモードの最初の挨拶かどうかを判定（過去・現在・未来の3枚を表示）
            const isFirstGreeting = text.includes('過去・現在・未来') || text.includes('過去、現在、未来');
            
            // タロット占いが開始された場合、カードを選択
            if (hasTarotReading) {
                const allCardNames = Object.keys(tarotCardImageMap);
                const shuffled = [...allCardNames].sort(() => Math.random() - 0.5);
                
                if (isFirstGreeting) {
                    // ゲストモードの最初の挨拶：過去・現在・未来の3枚を選択
                    selectedCards = [
                        { position: '過去', name: shuffled[0], image: tarotCardImageMap[shuffled[0]] },
                        { position: '現在', name: shuffled[1], image: tarotCardImageMap[shuffled[1]] },
                        { position: '未来', name: shuffled[2], image: tarotCardImageMap[shuffled[2]] }
                    ];
                } else {
                    // 通常のタロット占い：1枚のカードをランダムに選択
                    selectedCards = [
                        { position: '', name: shuffled[0], image: tarotCardImageMap[shuffled[0]] }
                    ];
                }
            }
        }
        
        // カードを表示
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
            
            // ゲストモードの最初の挨拶かどうか
            const isFirstGreeting = selectedCards.length === 3 && selectedCards[0].position === '過去';
            
            // isFirstGreetingの場合、残りのカードをsessionStorageに保存し、最初のカードだけを表示
            if (isFirstGreeting) {
                sessionStorage.setItem('yukinoRemainingCards', JSON.stringify(selectedCards.slice(1)));
                console.log('[タロットカード] 3枚のカードを準備しました。最初は過去のカードのみ表示します。', {
                    displayCard: selectedCards[0],
                    remainingCards: selectedCards.slice(1)
                });
            }
            
            // 表示するカードを決定（isFirstGreetingの場合は最初のカードのみ）
            const cardsToProcess = isFirstGreeting ? [selectedCards[0]] : selectedCards;
            
            cardsToProcess.forEach((card, index) => {
                const cardWrapper = document.createElement('div');
                cardWrapper.style.display = 'flex';
                cardWrapper.style.flexDirection = 'column';
                cardWrapper.style.alignItems = 'center';
                cardWrapper.style.gap = '6px';
                cardWrapper.dataset.cardIndex = index.toString(); // カードのインデックスを保存
                cardWrapper.dataset.cardPosition = card.position; // カードの位置を保存
                
                // カードラベル（位置：過去・現在・未来）- 最初は非表示
                const cardLabel = document.createElement('div');
                cardLabel.textContent = card.position || '';
                cardLabel.style.fontSize = '12px';
                cardLabel.style.color = 'rgba(255, 255, 255, 0.8)';
                cardLabel.style.fontWeight = '600';
                cardLabel.style.opacity = '0'; // 最初は非表示
                cardLabel.style.transition = 'opacity 0.3s ease';
                
                // カード名ラベル - 最初は非表示
                const cardNameLabel = document.createElement('div');
                cardNameLabel.textContent = card.name;
                cardNameLabel.style.fontSize = '11px';
                cardNameLabel.style.color = 'rgba(255, 255, 255, 0.9)';
                cardNameLabel.style.fontWeight = '500';
                cardNameLabel.style.marginTop = '4px';
                cardNameLabel.style.opacity = '0'; // 最初は非表示
                cardNameLabel.style.transition = 'opacity 0.3s ease';
                
                // 「カードをめくる」ガイダンスボタン（ゲストモードの最初の挨拶の場合のみ）
                const flipButton = document.createElement('button');
                flipButton.textContent = 'カードをめくる';
                flipButton.style.marginTop = '8px';
                flipButton.style.padding = '8px 16px';
                flipButton.style.fontSize = '12px';
                flipButton.style.color = '#ffffff';
                flipButton.style.backgroundColor = 'rgba(138, 43, 226, 0.6)';
                flipButton.style.border = '1px solid rgba(138, 43, 226, 0.8)';
                flipButton.style.borderRadius = '6px';
                flipButton.style.cursor = 'pointer';
                flipButton.style.transition = 'all 0.2s ease';
                flipButton.style.opacity = isFirstGreeting ? '1' : '0';
                flipButton.style.pointerEvents = isFirstGreeting ? 'auto' : 'none';
                
                // ボタンのホバー効果
                flipButton.addEventListener('mouseenter', () => {
                    flipButton.style.backgroundColor = 'rgba(138, 43, 226, 0.8)';
                    flipButton.style.transform = 'scale(1.05)';
                });
                flipButton.addEventListener('mouseleave', () => {
                    flipButton.style.backgroundColor = 'rgba(138, 43, 226, 0.6)';
                    flipButton.style.transform = 'scale(1)';
                });
                
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
                
                // カードをめくったかどうかのフラグ
                let isFlipped = false;
                
                // カードをめくる処理（共通関数）
                const flipCard = () => {
                    if (isFlipped || cardContainer.style.pointerEvents !== 'auto') {
                        return;
                    }
                    
                    isFlipped = true;
                    cardInner.style.transform = 'rotateY(180deg)';
                    
                    // ガイダンスボタンを非表示
                    flipButton.style.opacity = '0';
                    flipButton.style.pointerEvents = 'none';
                    
                    // カードをめくった後にラベルを表示
                    setTimeout(() => {
                        cardLabel.style.opacity = '1';
                        cardNameLabel.style.opacity = '1';
                    }, 300);
                    
                    // カードを拡大表示し、「雪乃の解説」ボタンを表示
                    const onExplanationClick = () => {
                        // カード情報をsessionStorageに保存（AIに解説の指示を出すため）
                        const cardInfo = {
                            name: card.name,
                            position: card.position,
                            image: card.image
                        };
                        sessionStorage.setItem('yukinoTarotCardForExplanation', JSON.stringify(cardInfo));
                        
                        console.log(`[タロットカード] ${card.position}のカードの解説をリクエストします（sessionStorageに保存）。`, {
                            cardName: card.name,
                            position: card.position,
                            cardInfo: cardInfo
                        });
                        
                        // 空のメッセージを送信してAI応答をトリガー（ユーザーメッセージは表示しない）
                        setTimeout(async () => {
                            if (sendMessageCallback) {
                                if (typeof sendMessageCallback === 'function') {
                                    // sendMessage(skipUserMessage, skipAnimation, messageOverride)
                                    // messageOverrideに特別なマーカーを含めて、システムプロンプトで検出できるようにする
                                    const triggerMessage = `[TAROT_EXPLANATION_TRIGGER:${card.position}:${card.name}]`;
                                    await sendMessageCallback(true, true, triggerMessage); // skipUserMessage = true, skipAnimation = true
                                } else {
                                    console.error('メッセージ送信に失敗: sendMessageCallbackが関数ではありません', sendMessageCallback);
                                }
                            } else {
                                console.error('メッセージ送信に失敗: sendMessageCallbackが存在しません');
                            }
                        }, 100);
                        
                        // 次のカードを表示（isFirstGreetingの場合のみ、sessionStorageから取得）
                        if (isFirstGreeting) {
                            setTimeout(() => {
                                const remainingCardsStr = sessionStorage.getItem('yukinoRemainingCards');
                                if (remainingCardsStr) {
                                    const remainingCards = JSON.parse(remainingCardsStr);
                                    if (remainingCards.length > 0) {
                                        const nextCard = remainingCards[0];
                                        const updatedRemaining = remainingCards.slice(1);
                                        sessionStorage.setItem('yukinoRemainingCards', JSON.stringify(updatedRemaining));
                                        
                                        console.log('[タロットカード] 次のカードを表示します。', {
                                            nextCard: nextCard,
                                            remainingAfter: updatedRemaining
                                        });
                                        
                                        // 次のカードを表示（container = チャットメッセージのコンテナ）
                                        displayNextTarotCard(nextCard, container, sendMessageCallback);
                                    } else {
                                        console.log('[タロットカード] すべてのカードの解説が完了しました。');
                                        sessionStorage.removeItem('yukinoRemainingCards');
                                    }
                                }
                            }, 1000);
                        }
                    };
                    
                    // カードを拡大表示（「雪乃の解説」ボタン付き）
                    showCardFullscreenWithExplanation(card.name, card.image, card.position, onExplanationClick);
                };
                
                // ゲストモードの最初の挨拶の場合、順番にカードを表示し、ユーザーがめくらせる
                if (isFirstGreeting) {
                    // カードは裏面から表示（ユーザーがクリックでめくる）
                    // 過去のカードから順番に表示
                    cardContainer.style.opacity = '0';
                    cardContainer.style.pointerEvents = 'none'; // まだ表示されていないカードはクリック不可
                    
                    // 過去のカード（index === 0）を最初に表示
                    if (index === 0) {
                        setTimeout(() => {
                            cardContainer.style.transition = 'opacity 0.5s ease';
                            cardContainer.style.opacity = '1';
                            cardContainer.style.pointerEvents = 'auto';
                        }, 500);
                    }
                    
                    // クリックでカードをめくる
                    cardContainer.addEventListener('click', flipCard);
                    flipButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        flipCard();
                    });
                } else {
                    // 通常のタロット占い：クリックでカードをめくる
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
                        }
                    });
                }
                
                cardWrapper.appendChild(cardLabel);
                cardWrapper.appendChild(cardContainer);
                cardWrapper.appendChild(cardNameLabel);
                if (isFirstGreeting) {
                    cardWrapper.appendChild(flipButton);
                }
                cardsContainer.appendChild(cardWrapper);
            });
            
            // ヒントメッセージ（通常のタロット占いの場合のみ表示）
            if (!isFirstGreeting) {
                const hint = document.createElement('div');
                hint.style.width = '100%';
                hint.style.textAlign = 'center';
                hint.style.marginTop = '8px';
                hint.style.fontSize = '12px';
                hint.style.color = 'rgba(255, 255, 255, 0.7)';
                hint.textContent = 'カードをタップしてめくってください';
                hint.id = 'tarot-hint';
                cardsContainer.appendChild(hint);
            }
            
            container.appendChild(cardsContainer);
        }
    }

    // グローバルに公開
    window.YukinoTarot = {
        detect: detectTarotCards,
        display: displayTarotCards
    };
})();

