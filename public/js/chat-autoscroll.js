/**
 * チャット画面のオートスクロール機能（LINE風）
 * PC、Mobile、iPhone、Androidすべてで適切に動作するように実装
 */

(function() {
    'use strict';
    
    let messagesDiv = null;
    let isUserScrolling = false;
    let scrollTimeout = null;
    let mutationObserver = null;
    let resizeObserver = null;
    let isInitialized = false;
    
    /**
     * メッセージエリアの最下部へスクロール（LINE風の滑らかな動作）
     * @param {boolean} smooth - スムーズスクロールを使用するか
     * @param {number} delay - 遅延時間（ミリ秒）
     */
    function scrollToBottom(smooth = true, delay = 0) {
        if (!messagesDiv) return;
        
        const scroll = () => {
            try {
                // スクロール位置を計算（最下部）
                const scrollHeight = messagesDiv.scrollHeight;
                const clientHeight = messagesDiv.clientHeight;
                const maxScroll = scrollHeight - clientHeight;
                
                // 既に最下部付近にいる場合はスクロールしない（ユーザーが手動スクロール中の場合）
                const currentScroll = messagesDiv.scrollTop;
                const threshold = 150; // 150px以内なら最下部とみなす（LINE風）
                
                // ユーザーが手動スクロール中で、かつ最下部から離れている場合はスクロールしない
                if (isUserScrolling && (maxScroll - currentScroll) > threshold) {
                    return;
                }
                
                // LINE風の滑らかなスクロール
                if (smooth) {
                    // 複数回スクロールを試みる（DOM更新のタイミングを考慮）
                    messagesDiv.scrollTo({
                        top: scrollHeight,
                        behavior: 'smooth'
                    });
                    // 念のため、少し遅れて再度スクロール
                    setTimeout(() => {
                        if (messagesDiv) {
                            messagesDiv.scrollTop = messagesDiv.scrollHeight;
                        }
                    }, 100);
                } else {
                    // 即座にスクロール（アニメーションなし）
                    messagesDiv.scrollTop = scrollHeight;
                }
            } catch (error) {
                // scrollToが使えない場合はscrollTopを使用
                try {
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                } catch (e) {
                    console.warn('[オートスクロール] スクロールエラー:', e);
                }
            }
        };
        
        if (delay > 0) {
            setTimeout(scroll, delay);
        } else {
            // requestAnimationFrameを使用してより確実にスクロール（LINE風）
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    scroll();
                });
            });
        }
    }
    
    /**
     * ユーザーが手動でスクロールしているかチェック
     */
    function handleUserScroll() {
        if (!messagesDiv) return;
        
        isUserScrolling = true;
        
        // スクロールタイムアウトをクリア
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        
        // 一定時間スクロールがなければ、ユーザーがスクロールをやめたと判断
        scrollTimeout = setTimeout(() => {
            isUserScrolling = false;
        }, 1000);
        
        // 最下部に近い場合は自動スクロールを再開
        const scrollHeight = messagesDiv.scrollHeight;
        const clientHeight = messagesDiv.clientHeight;
        const scrollTop = messagesDiv.scrollTop;
        const threshold = 150; // 150px以内なら最下部とみなす
        
        if ((scrollHeight - clientHeight - scrollTop) <= threshold) {
            isUserScrolling = false;
        }
    }
    
    /**
     * メッセージエリアのパディングを入力エリアの高さに応じて動的に調整
     */
    function adjustMessagesPadding() {
        if (!messagesDiv) return;
        
        const inputArea = document.querySelector('.input-area');
        if (!inputArea) return;
        
        // 入力エリアの高さを取得
        const inputAreaHeight = inputArea.offsetHeight;
        
        // モバイルの場合
        if (window.innerWidth <= 768) {
            // 入力エリアの高さ + 余白（20px）
            const paddingBottom = inputAreaHeight + 20;
            messagesDiv.style.paddingBottom = `${paddingBottom}px`;
        } else {
            // PC版も入力エリアの高さに応じて調整（より柔軟に）
            const paddingBottom = inputAreaHeight + 18;
            messagesDiv.style.paddingBottom = `${paddingBottom}px`;
        }
        
        // パディング調整後、最下部にスクロール（ユーザーが手動スクロール中でない場合）
        if (!isUserScrolling) {
            setTimeout(() => {
                scrollToBottom(true, 0);
            }, 50);
        }
    }
    
    /**
     * メッセージが追加されたときの処理（LINE風の自動スクロール）
     */
    function handleMessageAdded() {
        if (!messagesDiv) return;
        
        // ユーザーが手動スクロール中でない場合、または最下部付近にいる場合のみ自動スクロール
        const scrollHeight = messagesDiv.scrollHeight;
        const clientHeight = messagesDiv.clientHeight;
        const scrollTop = messagesDiv.scrollTop;
        const threshold = 200; // 200px以内なら最下部とみなす
        
        // メッセージエリアのパディングを調整
        adjustMessagesPadding();
        
        if (!isUserScrolling || (scrollHeight - clientHeight - scrollTop) <= threshold) {
            // LINE風の滑らかなスクロール（複数回試行）
            scrollToBottom(true, 0);
            scrollToBottom(true, 50);
            scrollToBottom(true, 150);
            scrollToBottom(true, 300);
        }
    }
    
    /**
     * 入力エリアにフォーカスしたときの処理（キーボード表示時）
     */
    function handleInputFocus() {
        // キーボード表示時のスクロール調整（LINE風）
        // 複数回スクロールを試みる（キーボードの表示アニメーションに合わせる）
        setTimeout(() => {
            scrollToBottom(true, 0);
        }, 100);
        setTimeout(() => {
            scrollToBottom(true, 0);
        }, 300);
        setTimeout(() => {
            scrollToBottom(true, 0);
        }, 500);
        
        // メッセージエリアのパディングを調整（入力エリアの高さに応じて）
        adjustMessagesPadding();
    }
    
    /**
     * 入力エリアからフォーカスが外れたときの処理
     */
    function handleInputBlur() {
        // キーボード非表示時のスクロール調整
        setTimeout(() => {
            scrollToBottom(true, 0);
        }, 100);
        
        // メッセージエリアのパディングを調整
        adjustMessagesPadding();
    }
    
    /**
     * ウィンドウリサイズ時の処理
     */
    function handleResize() {
        // リサイズ後、最下部にスクロール
        adjustMessagesPadding();
        setTimeout(() => {
            if (!isUserScrolling) {
                scrollToBottom(false, 100);
            }
        }, 100);
    }
    
    /**
     * 初期化
     */
    function init() {
        if (isInitialized) return;
        
        // メッセージエリアを取得
        messagesDiv = document.getElementById('messages');
        if (!messagesDiv) {
            // 要素がまだ存在しない場合は再試行
            setTimeout(init, 100);
            return;
        }
        
        // スクロールイベントリスナー
        messagesDiv.addEventListener('scroll', handleUserScroll, { passive: true });
        
        // MutationObserverでメッセージ追加を監視
        mutationObserver = new MutationObserver((mutations) => {
            let shouldScroll = false;
            for (let mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    // メッセージ要素が追加されたかチェック
                    for (let node of mutation.addedNodes) {
                        if (node.nodeType === 1) { // Element node
                            if (node.classList && (
                                node.classList.contains('message') ||
                                node.querySelector('.message')
                            )) {
                                shouldScroll = true;
                                break;
                            }
                        }
                    }
                    if (shouldScroll) break;
                }
            }
            if (shouldScroll) {
                handleMessageAdded();
            }
        });
        
        mutationObserver.observe(messagesDiv, {
            childList: true,
            subtree: true
        });
        
        // 入力エリアのフォーカス/ブラーイベント
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('focus', handleInputFocus, { passive: true });
            messageInput.addEventListener('blur', handleInputBlur, { passive: true });
            // 入力中の高さ変化を監視（複数行入力対応）
            messageInput.addEventListener('input', () => {
                adjustMessagesPadding();
            }, { passive: true });
        }
        
        // 入力エリアの高さ変化を監視（ResizeObserver）
        const inputArea = document.querySelector('.input-area');
        if (inputArea && window.ResizeObserver) {
            const inputAreaResizeObserver = new ResizeObserver(() => {
                adjustMessagesPadding();
            });
            inputAreaResizeObserver.observe(inputArea);
        }
        
        // ウィンドウリサイズイベント
        window.addEventListener('resize', handleResize, { passive: true });
        
        // ResizeObserverでメッセージエリアのサイズ変化を監視
        if (window.ResizeObserver) {
            resizeObserver = new ResizeObserver(() => {
                if (!isUserScrolling) {
                    scrollToBottom(false, 50);
                }
            });
            resizeObserver.observe(messagesDiv);
        }
        
        // 初期スクロール（既存のメッセージがある場合）
        setTimeout(() => {
            adjustMessagesPadding();
            scrollToBottom(false, 0);
        }, 200);
        
        // ビューポートの高さ変化を監視（キーボード表示/非表示）
        if (window.VisualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                adjustMessagesPadding();
                if (!isUserScrolling) {
                    scrollToBottom(true, 100);
                }
            });
        }
        
        isInitialized = true;
        console.log('[オートスクロール] 初期化完了（LINE風）');
    }
    
    /**
     * グローバル関数として公開
     */
    window.scrollToBottom = function(smooth = true) {
        scrollToBottom(smooth, 0);
    };
    
    /**
     * 手動スクロールフラグをリセット
     */
    window.resetUserScrolling = function() {
        isUserScrolling = false;
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
            scrollTimeout = null;
        }
    };
    
    // DOMContentLoadedで初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
    
    // 少し遅れてからも初期化を試みる（動的に追加される要素に対応）
    setTimeout(init, 500);
    setTimeout(init, 1000);
    
    // Enterキー送信の処理（既存のコードと統合）
    function initEnterKeyHandler() {
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        
        if (!messageInput || !sendButton) {
            setTimeout(initEnterKeyHandler, 100);
            return;
        }
        
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
                e.preventDefault();
                e.stopPropagation();
                
                if (!sendButton.disabled) {
                    sendButton.click();
                }
            }
        }, { passive: false });
    }
    
    // Enterキーハンドラーの初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEnterKeyHandler, { once: true });
    } else {
        initEnterKeyHandler();
    }
    
})();
