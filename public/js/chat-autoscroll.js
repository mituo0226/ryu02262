/**
 * チャット画面のオートスクロール機能
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
     * メッセージエリアの最下部へスクロール
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
                const threshold = 100; // 100px以内なら最下部とみなす
                
                if (!isUserScrolling || (maxScroll - currentScroll) <= threshold) {
                    if (smooth) {
                        messagesDiv.scrollTo({
                            top: scrollHeight,
                            behavior: 'smooth'
                        });
                    } else {
                        messagesDiv.scrollTop = scrollHeight;
                    }
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
            // requestAnimationFrameを使用してより確実にスクロール
            requestAnimationFrame(() => {
                requestAnimationFrame(scroll);
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
     * メッセージが追加されたときの処理
     */
    function handleMessageAdded() {
        if (!messagesDiv) return;
        
        // ユーザーが手動スクロール中でない場合、または最下部付近にいる場合のみ自動スクロール
        const scrollHeight = messagesDiv.scrollHeight;
        const clientHeight = messagesDiv.clientHeight;
        const scrollTop = messagesDiv.scrollTop;
        const threshold = 200; // 200px以内なら最下部とみなす
        
        if (!isUserScrolling || (scrollHeight - clientHeight - scrollTop) <= threshold) {
            // 複数回スクロールを試みる（DOM更新のタイミングを考慮）
            scrollToBottom(true, 50);
            scrollToBottom(true, 150);
            scrollToBottom(true, 300);
        }
    }
    
    /**
     * 入力エリアにフォーカスしたときの処理
     */
    function handleInputFocus() {
        // キーボード表示時のスクロール調整
        setTimeout(() => {
            scrollToBottom(true, 100);
            scrollToBottom(true, 300);
        }, 100);
    }
    
    /**
     * ウィンドウリサイズ時の処理
     */
    function handleResize() {
        // リサイズ後、最下部にスクロール
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
        
        // 入力エリアのフォーカスイベント
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('focus', handleInputFocus, { passive: true });
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
            scrollToBottom(false, 100);
        }, 200);
        
        isInitialized = true;
        console.log('[オートスクロール] 初期化完了');
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
