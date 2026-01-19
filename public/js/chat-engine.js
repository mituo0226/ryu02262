/**
 * chat-engine.js
 * チャットエンジン - 完全にキャラクター非依存のチャット機能を提供
 * 
 * 【重要】キャラクター固有の処理は一切含まれません。
 * すべてのキャラクター固有の処理は各ハンドラーファイルに委譲されます。
 * 
 * ハンドラーの取得は CharacterRegistry を使用します。
 * CharacterRegistry は character-registry.js で定義されています。
 */

// ChatUIのエイリアス（chat-ui.jsが読み込まれた後に利用可能になる）
const ChatUI = window.ChatUI || {};

const ChatInit = {
    /**
     * ページを初期化
     */
    async initPage() {
        // 重複実行を防ぐフラグをチェック
        if (this._initPageRunning) {
            console.warn('[初期化] initPageが既に実行中です。重複実行をスキップします。');
            // #region agent log (開発環境のみ - コメントアウト)
            // ローカルロギングサーバーへの接続は開発環境でのみ有効
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:19',message:'initPage重複実行検出→スキップ',data:{url:window.location.href,character:new URLSearchParams(window.location.search).get('character')},timestamp:Date.now(),runId:'debug-run',hypothesisId:'B'})}).catch(()=>{});
            // }
            // #endregion
            return;
        }
        if (this._initPageCompleted) {
            console.warn('[初期化] initPageは既に完了しています。重複実行をスキップします。');
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:26',message:'initPage完了済み検出→スキップ',data:{url:window.location.href,character:new URLSearchParams(window.location.search).get('character')},timestamp:Date.now(),runId:'debug-run',hypothesisId:'B'})}).catch(()=>{});
            // }
            // #endregion
            return;
        }
        this._initPageRunning = true;
        
        // #region agent log (開発環境のみ - コメントアウト)
        // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:27',message:'initPage関数開始',data:{url:window.location.href,character:new URLSearchParams(window.location.search).get('character')},timestamp:Date.now(),runId:'debug-run',hypothesisId:'B'})}).catch(()=>{});
        // }
        // #endregion
        // テストモードチェックは、chat-engine.jsの最初（DOMContentLoadedの外）で実行されるため、
        // ここでは実行しない（重複を避ける）
        
        // 待機画面を非表示にする（初期化開始時）
        const waitingOverlay = document.getElementById('waitingOverlay');
        if (waitingOverlay) {
            waitingOverlay.classList.add('hidden');
            console.log('[初期化] 待機画面を非表示にしました（初期化開始時）');
        }
        
        // キャラクター固有の初期化処理はハンドラーに委譲
        // ハンドラーが読み込まれる前に必要な処理がある場合は、ハンドラーのinit()で処理されます
        
        // ChatUIを初期化
        if (window.ChatUI && typeof window.ChatUI.init === 'function') {
            window.ChatUI.init();
        }
        
        // AuthStateを初期化
        if (window.AuthState && typeof AuthState.init === 'function') {
            AuthState.init();
        }
        
        // 守護神の儀式への同意ボタンの表示フラグをリセット（ページ読み込み時）
        ChatData.ritualConsentShown = false;
        
        // 会話履歴はデータベースから取得（すべて登録ユーザー）

        // キャラクター情報を読み込む（単一キャラクターのみ）
        // #region agent log (開発環境のみ - コメントアウト)
        // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:27',message:'loadCharacterData呼び出し前',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // }
        // #endregion
        // characterIdを指定して単一キャラクターデータのみ読み込む（効率化）
        await ChatData.loadCharacterData(character);
        // #region agent log (開発環境のみ - コメントアウト)
        // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:29',message:'loadCharacterData呼び出し後',data:{characterInfoKeys:Object.keys(ChatData.characterInfo),characterInfoLength:Object.keys(ChatData.characterInfo).length},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // }
        // #endregion
        if (Object.keys(ChatData.characterInfo).length === 0) {
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:30',message:'characterInfoが空→早期リターン',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // }
            // #endregion
            console.error('Failed to load character data');
            return;
        }
        
        // キャラクターを設定
        const character = ChatData.getCharacterFromURL();

        // 以前のキャラクターを保存（キャラクター切り替え判定用）
        const previousCharacter = ChatData.currentCharacter;
        
        // キャラクターが切り替わった場合、lastUserMessageとguardianMessageShownフラグをクリア
        if (previousCharacter && previousCharacter !== character) {
            sessionStorage.removeItem('lastUserMessage');
            sessionStorage.removeItem('guardianMessageShown');
            console.log('[初期化] キャラクターが切り替わりました。lastUserMessageとguardianMessageShownをクリアしました:', {
                previousCharacter,
                newCharacter: character
            });
        }
        
        // #region agent log
        console.log('🔍🔍🔍 [キャラクター初期化]', {
            URLから取得: character,
            現在のURL: window.location.href,
            URLSearchParams: Object.fromEntries(new URLSearchParams(window.location.search)),
            以前のcurrentCharacter: previousCharacter,
        });
        // #endregion
        
        ChatData.currentCharacter = character;
        if (window.ChatUI) {
            window.ChatUI.setCurrentCharacter(character, ChatData.characterInfo);
        }
        
        // 【変更】ユーザー情報の設定はhistoryDataの取得後に実行
        // （データベースベースの判断に移行するため、初期化時はnull）
        ChatData.userNickname = null;
        
        // 登録完了フラグをチェック
        const urlParams = new URLSearchParams(window.location.search);
        const justRegisteredParam = urlParams.get('justRegistered') === 'true';
        
        // sessionStorageにも登録完了フラグをチェック（URLパラメータが失われた場合の代替手段）
        const justRegisteredSession = sessionStorage.getItem('justRegistered') === 'true';
        const justRegistered = justRegisteredParam || justRegisteredSession;
        
        // 【変更】登録完了時の判定はhistoryDataの取得後に実行
        // （データベースベースの判断に移行するため、ここではURLパラメータのみをチェック）
        const shouldTriggerRegistrationFlow = justRegistered;
        
        console.log('[初期化] justRegistered:', justRegistered, 'justRegisteredParam:', justRegisteredParam, 'justRegisteredSession:', justRegisteredSession, 'shouldTriggerRegistrationFlow:', shouldTriggerRegistrationFlow, 'character:', character);

        // 登録完了時の処理を先にチェック（会話履歴を読み込む前に実行）
        // 【変更】hasValidSessionのチェックを削除（historyDataの取得後に判定）
        if (justRegistered || shouldTriggerRegistrationFlow) {
            console.log('[登録完了処理] 開始 - character:', character);
            
            // 待機画面を表示
            const waitingOverlay = document.getElementById('waitingOverlay');
            if (waitingOverlay) {
                waitingOverlay.classList.remove('hidden');
                console.log('[登録完了処理] 待機画面を表示しました');
            }
            
            try {
                // 【重要】データベースから最新のユーザー情報を取得
                // これにより、APIが確実にデータベースからユーザー情報を読み込んでいることを確認
                console.log('[登録完了処理] データベースからユーザー情報を取得中...');
                let historyData = null;
                let dbUserNickname = null;
                try {
                    historyData = await ChatAPI.loadConversationHistory(character);
                    if (historyData && historyData.nickname) {
                        dbUserNickname = historyData.nickname;
                        // 【変更】データベースから取得した情報をlocalStorageに保存しない
                        ChatData.userNickname = dbUserNickname;
                        console.log('[登録完了処理] データベースからユーザー情報を取得しました:', {
                            nickname: dbUserNickname,
                            hasHistory: historyData.hasHistory
                        });
                    } else {
                        // データベースにユーザー情報がない場合（初回登録直後）
                        console.log('[登録完了処理] データベースにユーザー情報が見つかりません（初回登録のため正常）');
                        // 【変更】localStorageから取得しない（データベースベースの判断）
                        dbUserNickname = 'あなた';
                        ChatData.userNickname = dbUserNickname;
                    }
                } catch (error) {
                    console.error('[登録完了処理] データベースからの情報取得エラー:', error);
                    // エラーハンドリング
                    if (error instanceof Error) {
                        if (error.message === 'USER_NOT_FOUND') {
                            // ユーザー情報が登録されていない場合：登録画面にリダイレクト
                            console.error('[登録完了処理] ユーザー情報が登録されていません。登録画面にリダイレクトします。');
                            alert('あなたのユーザー情報が登録されていることが確認できません。恐れ入りますが、再度ユーザー登録をお願いします。');
                            window.location.href = '../auth/register.html';
                            return;
                        } else if (error.message === 'NETWORK_ERROR') {
                            // ネットワーク接続エラーの場合
                            console.error('[登録完了処理] ネットワーク接続エラーが発生しました');
                            ChatUI.addMessage('error', 'インターネット接続エラーが発生しました。しばらく経ってから再度お試しください。', 'システム');
                            // エラー時はデフォルト値を使用
                            dbUserNickname = 'あなた';
                            ChatData.userNickname = dbUserNickname;
                            return;
                        }
                    }
                    // その他のエラー：デフォルト値を使用
                    console.warn('[登録完了処理] エラーが発生しましたが、処理を続行します');
                    dbUserNickname = 'あなた';
                    ChatData.userNickname = dbUserNickname;
                    historyData = null;
                }
                
                // 待機画面を非表示
                if (waitingOverlay) {
                    waitingOverlay.classList.add('hidden');
                    console.log('[登録完了処理] 待機画面を非表示にしました');
                }
                
                // キャラクター専用ハンドラーの初期化処理を呼び出す
                const handler = CharacterRegistry.get(character);
                if (handler && typeof handler.initPage === 'function') {
                    const result = await handler.initPage(urlParams, historyData, justRegistered, shouldTriggerRegistrationFlow);
                    if (result && result.completed) {
                        console.log('[登録完了処理] ハンドラーで処理完了。処理を終了します。');
                        return; // 処理終了
                    }
                    if (result && result.skip) {
                        console.log('[登録完了処理] ハンドラーで処理スキップ。処理を終了します。');
                        return; // 処理終了
                    }
                }
                
                // 会話履歴はhistoryDataから取得（登録完了後はデータベースから取得）
                let conversationHistory = [];
                if (historyData && historyData.recentMessages) {
                    conversationHistory = historyData.recentMessages;
                }
                
                // キャラクター専用ハンドラーの登録完了後処理を呼び出す
                if (handler && typeof handler.handlePostRegistration === 'function') {
                    await handler.handlePostRegistration(historyData);
                }
                
                const info = ChatData.characterInfo[character];
                
                // 会話履歴を表示（historyDataから取得）
                if (conversationHistory.length > 0) {
                    console.log('[登録完了処理] 会話履歴を画面に表示します:', conversationHistory.length, '件');
                    
                    // 【重要】先に会話履歴を画面に表示
                    conversationHistory.forEach((entry) => {
                        // システムメッセージ（isSystemMessage: true）は画面に表示しない
                        if (entry.isSystemMessage) {
                            const content = entry.content || entry.message || '';
                            if (content) {
                                console.log('[登録完了処理] システムメッセージをスキップ:', typeof content === 'string' ? content.substring(0, 30) + '...' : '[非文字列コンテンツ]');
                            }
                            return;
                        }
                        const type = entry.role === 'user' ? 'user' : 'character';
                        const sender = entry.role === 'user' ? 'あなた' : info.name;
                        // contentを安全に取得（messageプロパティも確認）
                        const content = entry.content || entry.message || '';
                        ChatUI.addMessage(type, content, sender);
                    });
                    console.log('[登録完了処理] 会話履歴の表示完了');
                    
                    // 最後のユーザーメッセージを抽出
                    let lastUserMessage = '';
                    for (let i = conversationHistory.length - 1; i >= 0; i--) {
                        if (conversationHistory[i].role === 'user') {
                            lastUserMessage = conversationHistory[i].content;
                            break;
                        }
                    }
                    
                    // 【変更】ニックネームをhistoryDataから取得
                    const userNickname = (historyData && historyData.nickname) || dbUserNickname || 'あなた';
                    
                    // 定型文を生成（ハンドラーから取得、なければ汎用メッセージ）
                    let welcomeBackMessage = null;
                    if (handler && typeof handler.getWelcomeBackMessage === 'function') {
                        welcomeBackMessage = handler.getWelcomeBackMessage(userNickname, lastUserMessage);
                    }
                    
                    if (!welcomeBackMessage) {
                        // ハンドラーがnullを返した場合、またはメソッドがない場合は汎用メッセージ
                        welcomeBackMessage = `${userNickname}さん、おかえりなさい。ユーザー登録ありがとうございます。それでは、続きを始めましょうか。`;
                    }
                    
                    // 定型文を画面に表示
                    ChatUI.addMessage('character', welcomeBackMessage, info.name);
                    console.log('[登録完了処理] おかえりなさいメッセージを表示しました');
                } else {
                    // 会話履歴がない場合：新規ユーザーとして初回メッセージを表示
                    // 【重要】データベースから取得したニックネームを使用
                    console.log('[登録完了処理] 会話履歴なし。新規ユーザーとして初回メッセージを表示します');
                    const nicknameForMessage = dbUserNickname || ChatData.userNickname || 'あなた';
                    console.log('[登録完了処理] 初回メッセージに使用するニックネーム:', nicknameForMessage);
                    // 登録直後のため、他のキャラクターとの会話履歴はないと仮定
                    const firstTimeMessage = ChatData.generateFirstTimeMessage(character, nicknameForMessage, false, false);
                    ChatUI.addMessage('welcome', firstTimeMessage, info.name);
                }
                
                // ゲスト履歴とカウントをクリア（データベースに移行済みのため）
                // 会話履歴はデータベースで管理されるため、sessionStorageのクリアは不要
                ChatData.setUserMessageCount(character, 0);
                
                // 【重要】登録後のイベントリスナーを設定
                console.log('[登録完了処理] イベントリスナーを設定します');
                if (ChatUI.messageInput) {
                    // 既存のリスナーを削除（重複登録を防ぐ）
                    const newInput = ChatUI.messageInput.cloneNode(true);
                    ChatUI.messageInput.parentNode.replaceChild(newInput, ChatUI.messageInput);
                    ChatUI.messageInput = newInput;
                    
                    ChatUI.messageInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            window.sendMessage();
                        }
                    });
                    
                    ChatUI.messageInput.addEventListener('input', () => {
                        ChatUI.updateSendButtonVisibility();
                    });
                    
                    console.log('[登録完了処理] イベントリスナーの設定完了');
                }
                
                // キャラクター固有のフラグをクリア（ハンドラーに委譲）
                // 注意: handlerは121行目で既に宣言されているため、再宣言しない
                if (handler && typeof handler.clearCharacterFlags === 'function') {
                    handler.clearCharacterFlags();
                }
                
                // URLパラメータからjustRegisteredを削除
                urlParams.delete('justRegistered');
                const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
                window.history.replaceState({}, '', newUrl);
                
                // sessionStorageからも登録完了フラグを削除
                sessionStorage.removeItem('justRegistered');
                
                return;
            } catch (error) {
                console.error('[登録完了処理] エラー:', error);
                ChatUI.addMessage('error', '登録完了処理中にエラーが発生しました。ページを再読み込みしてください。', 'システム');
                return;
            }
        }
        
        try {
            // キャラクターが切り替わった場合のみ、会話履歴を読み込む前にメッセージをクリア
            if (previousCharacter && previousCharacter !== character) {
                if (ChatUI && typeof ChatUI.clearMessages === 'function') {
                    ChatUI.clearMessages();
                    console.log('[初期化] キャラクターが切り替わりました。メッセージをクリアしました:', {
                        previousCharacter,
                        newCharacter: character
                    });
                }
            }
            
            // 守護神の儀式完了直後のフラグを事前にチェック
            const guardianMessageShown = sessionStorage.getItem('guardianMessageShown') === 'true';
            
            // 会話履歴を読み込む
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:217',message:'loadConversationHistory呼び出し前',data:{character},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // }
            // #endregion
            let historyData = null;
            try {
                historyData = await ChatAPI.loadConversationHistory(character);
            } catch (error) {
                // エラーハンドリング
                if (error instanceof Error) {
                    if (error.message === 'USER_NOT_FOUND') {
                        // ユーザー情報が登録されていない場合：登録画面にリダイレクト
                        console.error('[初期化] ユーザー情報が登録されていません。登録画面にリダイレクトします。');
                        alert('あなたのユーザー情報が登録されていることが確認できません。恐れ入りますが、再度ユーザー登録をお願いします。');
                        window.location.href = '../auth/register.html';
                        return;
                    } else if (error.message === 'NETWORK_ERROR') {
                        // ネットワーク接続エラーの場合
                        console.error('[初期化] ネットワーク接続エラーが発生しました');
                        ChatUI.addMessage('error', 'インターネット接続エラーが発生しました。しばらく経ってから再度お試しください。', 'システム');
                        return;
                    }
                }
                // その他のエラー
                console.error('[初期化] 会話履歴の取得エラー:', error);
                ChatUI.addMessage('error', '会話履歴の取得に失敗しました。時間を置いて再度お試しください。', 'システム');
                return;
            }
            
            /**
             * 【統一化】すべての鑑定士で共通の初回メッセージ表示ロジック
             * 初回ユーザー（hasHistory === false）→ firstTimeGuestメッセージ
             * 再訪問ユーザー（hasHistory === true）→ returningメッセージ
             * @param {Object} options - オプション
             * @param {boolean} options.shouldShow - メッセージを表示するかどうか
             * @param {boolean} options.handlerSkippedFirstMessage - ハンドラーでスキップされたかどうか
             * @returns {Promise<boolean>} メッセージが表示されたかどうか
             */
            const showInitialMessage = async (options = {}) => {
                const { shouldShow = true, handlerSkippedFirstMessage = false } = options;
                
                // 表示条件をチェック
                if (!shouldShow || guardianMessageShown || handlerSkippedFirstMessage) {
                    return false;
                }
                
                const info = ChatData.characterInfo[character];
                if (!info) {
                    console.warn('[初期化] キャラクター情報が見つかりません:', character);
                    return false;
                }
                
                // 会話履歴がある場合：returningメッセージを表示
                // 【改善】バックエンドで生成されたreturningMessageを使用（二重API呼び出しを削減）
                if (historyData && historyData.hasHistory) {
                    console.log('[初期化] 再訪問ユーザー。バックエンドで生成されたreturningMessageを使用します');
                    
                    // バックエンドで生成されたreturningMessageを使用
                    if (historyData.returningMessage && historyData.returningMessage.trim()) {
                        ChatUI.addMessage('welcome', historyData.returningMessage, info.name);
                        console.log(`[初期化] ${info.name}の再訪問時：バックエンドで生成されたreturningMessageを表示しました`);
                        return true;
                    } else {
                        // returningMessageが生成されなかった場合のフォールバック
                        console.warn(`[初期化] ${info.name}の再訪問時：returningMessageが生成されていません。フォールバック処理を実行します`);
                        const initialMessage = ChatData.generateInitialMessage(character, historyData);
                        if (initialMessage && initialMessage.trim()) {
                            ChatUI.addMessage('welcome', initialMessage, info.name);
                        }
                        return true;
                    }
                }
                
                // 会話履歴がない場合の処理
                // 【重要】守護神が既に決定されている場合は、firstTimeGuestメッセージを表示しない
                // 楓の場合は、守護神が決定されている場合、ハンドラーで守護神確認メッセージが表示される
                // 【スケーラビリティ改善】守護神が既に決定されている場合の判定をハンドラーに委譲
                const handlerForFirstMessage = CharacterRegistry.get(character);
                let shouldSkipFirstMessageForDeity = false;
                
                if (handlerForFirstMessage && typeof handlerForFirstMessage.shouldSkipFirstMessageForDeity === 'function') {
                    shouldSkipFirstMessageForDeity = handlerForFirstMessage.shouldSkipFirstMessageForDeity(historyData);
                }
                
                // 【改善】バックエンドの判定結果（visitPattern）を使用（判定ロジックの一元化）
                const visitPattern = historyData?.visitPattern || (historyData?.hasHistory ? 'returning' : 'first_visit');
                
                if (!shouldSkipFirstMessageForDeity) {
                    // バックエンドの判定結果に基づいて処理を分岐
                    switch (visitPattern) {
                        case 'continuing':
                            // 【再訪問時（履歴なし）】継続セッションとして処理
                            console.log('[初期化] 再訪問ユーザー（履歴なし）。継続セッションとしてAPIから動的メッセージを生成します');
                            
                            try {
                                console.log(`[初期化] ${info.name}の再訪問時（履歴なし）：APIから返答を生成します`, {
                                    character,
                                    userNickname: historyData.nickname || ChatData.userNickname || 'あなた',
                                    visitPattern: 'continuing'
                                });
                                
                                // 継続セッションとして「前回の会話の継続」という返答をAPIから取得
                                const response = await ChatAPI.sendMessage(
                                    '前回の会話の続きです',
                                    character,
                                    [], // 会話履歴は空（データベースに履歴がないため）
                                    {}
                                );
                                
                                if (response && response.message) {
                                    ChatUI.addMessage('welcome', response.message, info.name);
                                    console.log(`[初期化] ${info.name}の再訪問時（履歴なし）：APIから返答を取得しました`);
                                    return true;
                                } else {
                                    console.warn(`[初期化] ${info.name}の再訪問時（履歴なし）：APIから返答を取得できませんでした`);
                                    // APIから返答を取得できなかった場合は、フォールバックとして定型文を試行
                                    const initialMessage = ChatData.generateInitialMessage(character, historyData);
                                    if (initialMessage && initialMessage.trim()) {
                                        ChatUI.addMessage('welcome', initialMessage, info.name);
                                    }
                                    return true;
                                }
                            } catch (error) {
                                console.error(`[初期化] ${info.name}の再訪問時（履歴なし）：API呼び出しエラー:`, error);
                                // エラーの場合は、フォールバックとして定型文を試行
                                const initialMessage = ChatData.generateInitialMessage(character, historyData);
                                if (initialMessage && initialMessage.trim()) {
                                    ChatUI.addMessage('welcome', initialMessage, info.name);
                                }
                                return true;
                            }
                        
                        case 'first_visit':
                            // 【初回訪問時】conversation-history APIから返されたwelcomeMessageを使用
                            console.log('[初期化] 初回ユーザー。conversation-history APIから返されたwelcomeMessageを使用します');
                            
                            // APIから返されたwelcomeMessageを使用
                            if (historyData && historyData.welcomeMessage) {
                                ChatUI.addMessage('welcome', historyData.welcomeMessage, info.name);
                                console.log(`[初期化] ${info.name}の初回訪問時：welcomeMessageを使用しました`);
                                return true;
                            } else {
                                // welcomeMessageが取得できなかった場合は、フォールバックとして定型文を試行
                                console.warn(`[初期化] ${info.name}の初回訪問時：welcomeMessageが取得できませんでした。定型文を使用します`);
                                const hasOtherCharacterHistory = historyData?.hasOtherCharacterHistory || false;
                                const firstTimeMessage = ChatData.generateFirstTimeMessage(
                                    character, 
                                    ChatData.userNickname || 'あなた',
                                    false,
                                    hasOtherCharacterHistory
                                );
                                if (firstTimeMessage && firstTimeMessage.trim()) {
                                    ChatUI.addMessage('welcome', firstTimeMessage, info.name);
                                }
                                return true;
                            }
                        
                        default:
                            // その他のパターン（returningなど）は既に処理済み
                            console.log(`[初期化] visitPattern: ${visitPattern} は既に処理済みです`);
                            break;
                    }
                } else if (handlerForFirstMessage && typeof handlerForFirstMessage.getGuardianConfirmationMessage === 'function' && !guardianMessageShown && !handlerSkippedFirstMessage) {
                    // 【スケーラビリティ改善】守護神確認メッセージの取得をハンドラーに委譲
                    const userNickname = historyData.nickname || ChatData.userNickname || 'あなた';
                    
                    // 【楓専用処理】楓の場合は、APIが守護神情報を確認して返答を生成する
                    if (character === 'kaede' && historyData && historyData.assignedDeity) {
                        try {
                            console.log('[初期化] 楓の再訪問時（履歴なし）：APIから返答を生成します', {
                                hasHistory: false,
                                assignedDeity: historyData.assignedDeity,
                                userNickname
                            });
                            
                            // 守護神情報を使用してAPIから返答を生成
                            const response = await ChatAPI.sendMessage(
                                '再訪問しました',
                                character,
                                [], // 会話履歴は空
                                {}
                            );
                            
                            if (response && response.message) {
                                ChatUI.addMessage('welcome', response.message, info.name);
                                console.log('[初期化] 楓の再訪問時（履歴なし）：APIから返答を取得しました');
                                return true;
                            } else {
                                console.warn('[初期化] 楓の再訪問時（履歴なし）：APIから返答を取得できませんでした。ハンドラーのメッセージを使用します');
                                // APIから返答を取得できなかった場合は、ハンドラーのメッセージを使用
                                const guardianConfirmationMessage = handlerForFirstMessage.getGuardianConfirmationMessage(historyData, userNickname);
                                if (guardianConfirmationMessage) {
                                    console.log('[初期化] 守護神が既に決定されているため、守護神確認メッセージを表示します');
                                    ChatUI.addMessage('welcome', guardianConfirmationMessage, info.name);
                                    return true;
                                }
                            }
                        } catch (error) {
                            console.error('[初期化] 楓の再訪問時（履歴なし）：API呼び出しエラー:', error);
                            // エラーの場合は、ハンドラーのメッセージを使用
                            const guardianConfirmationMessage = handlerForFirstMessage.getGuardianConfirmationMessage(historyData, userNickname);
                            if (guardianConfirmationMessage) {
                                console.log('[初期化] 守護神が既に決定されているため、守護神確認メッセージを表示します');
                                ChatUI.addMessage('welcome', guardianConfirmationMessage, info.name);
                                return true;
                            }
                        }
                    } else {
                        // 楓以外のキャラクターまたは守護神が決定されていない場合は、従来通りハンドラーのメッセージを使用
                        const guardianConfirmationMessage = handlerForFirstMessage.getGuardianConfirmationMessage(historyData, userNickname);
                        if (guardianConfirmationMessage) {
                            console.log('[初期化] 守護神が既に決定されているため、守護神確認メッセージを表示します');
                            ChatUI.addMessage('welcome', guardianConfirmationMessage, info.name);
                            return true;
                        }
                    }
                }
                
                return false;
            };
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:220',message:'loadConversationHistory呼び出し後',data:{character,hasHistoryData:!!historyData,hasHistory:historyData?.hasHistory,hasNickname:!!historyData?.nickname,nickname:historyData?.nickname,recentMessagesLength:historyData?.recentMessages?.length||0},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // }
            // #endregion
            console.log('[初期化] historyData取得結果:', {
                hasHistoryData: !!historyData,
                hasHistory: historyData?.hasHistory,
                hasNickname: !!historyData?.nickname,
                nickname: historyData?.nickname
            });
            
            // ユーザー情報を設定（historyDataから）
            if (historyData && historyData.nickname) {
                ChatData.userNickname = historyData.nickname;
            }
            
            // 会話履歴を取得（historyDataから）
            let conversationHistory = [];
            if (historyData && historyData.recentMessages) {
                conversationHistory = historyData.recentMessages;
            }
            
            // 【スケーラビリティ改善】新規会話時のフラグクリアをハンドラーに委譲
            // 注意: tempCardInfoはこのコードブロック内で定義されていない可能性があるため、
            // ハンドラー内でsessionStorageから直接取得して処理する
            const handlerForClearFlags = CharacterRegistry.get(character);
            if (handlerForClearFlags && typeof handlerForClearFlags.clearFlagsOnNewConversation === 'function') {
                handlerForClearFlags.clearFlagsOnNewConversation(conversationHistory, null);
            }
            
            // 会話履歴を表示
            // 守護神の儀式完了直後（guardianMessageShown）の場合は、会話履歴を表示しない
            // （既に守護神の儀式完了メッセージが表示されているため）
            const guardianMessageShownFromStorage = sessionStorage.getItem('guardianMessageShown') === 'true';
            
            if (conversationHistory.length > 0 && !guardianMessageShownFromStorage) {
                console.log('[初期化] 会話履歴を表示します:', conversationHistory.length, '件');
                const info = ChatData.characterInfo[character];
                
                // 【改善】会話履歴の遅延表示: 最新5件だけ即座に表示、残りを遅延表示
                const totalMessages = conversationHistory.length;
                const recentFive = conversationHistory.slice(-5); // 最新5件
                const olderMessages = conversationHistory.slice(0, -5); // 残りの履歴
                
                // 最新5件を即座に表示
                recentFive.forEach((entry) => {
                    // システムメッセージ（isSystemMessage: true）は画面に表示しない
                    if (entry.isSystemMessage) {
                        const content = entry.content || entry.message || '';
                        if (content) {
                            console.log('[初期化] システムメッセージをスキップ:', typeof content === 'string' ? content.substring(0, 30) + '...' : '[非文字列コンテンツ]');
                        }
                        return;
                    }
                    const type = entry.role === 'user' ? 'user' : 'character';
                    const sender = entry.role === 'user' ? 'あなた' : info.name;
                    // contentを安全に取得（messageプロパティも確認）
                    const content = entry.content || entry.message || '';
                    ChatUI.addMessage(type, content, sender);
                });
                
                // 残りの履歴を遅延表示（バックグラウンド）
                if (olderMessages.length > 0) {
                    console.log('[初期化] 残りの会話履歴を遅延表示します:', olderMessages.length, '件');
                    setTimeout(() => {
                        olderMessages.forEach((entry) => {
                            // システムメッセージ（isSystemMessage: true）は画面に表示しない
                            if (entry.isSystemMessage) {
                                const content = entry.content || entry.message || '';
                                if (content) {
                                    console.log('[初期化] システムメッセージをスキップ:', typeof content === 'string' ? content.substring(0, 30) + '...' : '[非文字列コンテンツ]');
                                }
                                return;
                            }
                            const type = entry.role === 'user' ? 'user' : 'character';
                            const sender = entry.role === 'user' ? 'あなた' : info.name;
                            // contentを安全に取得（messageプロパティも確認）
                            const content = entry.content || entry.message || '';
                            // 古いメッセージは先頭に追加（prependMessageを使用）
                            ChatUI.prependMessage(type, content, sender);
                        });
                        console.log('[初期化] 遅延表示完了:', olderMessages.length, '件');
                    }, 100); // 100ms後に表示
                }
            }
            
            // 雪乃の個別相談モード開始直後の定型文を表示（現在は使用されていない）
            if (false && character === 'yukino') {
                const consultationStarted = sessionStorage.getItem('yukinoConsultationStarted') === 'true';
                const messageCount = parseInt(sessionStorage.getItem('yukinoConsultationMessageCount') || '0', 10);
                
                if (consultationStarted && messageCount === 0) {
                    console.log('[初期化] 雪乃の個別相談モード開始：定型文を表示');
                    const info = ChatData.characterInfo[character];
                    const welcomeMessage = 'あなたの運勢はタロットカードによって導かれました。これから先はあなたが私に相談したいことがあれば語りかけてください。どんな相談でもお答えいたします。';
                    ChatUI.addMessage('character', welcomeMessage, info.name);
                    
                    // メッセージ入力欄を有効化
                    if (ChatUI.messageInput) {
                        ChatUI.messageInput.disabled = false;
                        ChatUI.messageInput.placeholder = 'メッセージを入力...';
                    }
                    if (ChatUI.sendButton) {
                        ChatUI.sendButton.disabled = false;
                    }
                    
                    console.log('[初期化] 個別相談モード：メッセージ入力を有効化しました');
                    // 初回メッセージ表示をスキップするため、ここで処理を終了
                    return;
                }
            }
            
            // 初回メッセージを表示
            // ただし、守護神の儀式完了直後（guardianMessageShown）の場合は、既に守護神確認メッセージを表示済みなのでスキップ
            // ※guardianMessageShownは上で既に定義済み
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:277',message:'初回メッセージ表示判定開始',data:{hasHistoryData:!!historyData,hasHistory:historyData?.hasHistory,hasNickname:!!historyData?.nickname,guardianMessageShown,character},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // }
            // #endregion
            
            if (historyData && historyData.hasHistory) {
                // #region agent log (開発環境のみ - コメントアウト)
                // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:477',message:'historyData.hasHistory=trueブロック開始',data:{character,hasHistory:historyData.hasHistory,recentMessagesLength:historyData.recentMessages?.length||0,guardianMessageShown,handlerSkippedFirstMessage:false},timestamp:Date.now(),runId:'debug-run',hypothesisId:'A'})}).catch(()=>{});
                // }
                // #endregion
                ChatData.conversationHistory = historyData;
                ChatData.userNickname = historyData.nickname || ChatData.userNickname;
                
                // 守護神確認メッセージがpendingGuardianMessageに保存されている場合、会話履歴に追加
                const pendingGuardianMessage = sessionStorage.getItem('pendingGuardianMessage');
                if (pendingGuardianMessage && ChatData.conversationHistory && ChatData.conversationHistory.recentMessages) {
                    // 既に会話履歴に守護神確認メッセージが含まれているかチェック
                    const hasGuardianMessage = ChatData.conversationHistory.recentMessages.some(msg => 
                        msg.role === 'assistant' && msg.content && msg.content.includes('の守護神は')
                    );
                    
                    if (!hasGuardianMessage) {
                        ChatData.conversationHistory.recentMessages.push({
                            role: 'assistant',
                            content: pendingGuardianMessage
                        });
                        console.log('[会話履歴読み込み] 守護神確認メッセージを会話履歴に追加しました');
                    }
                    sessionStorage.removeItem('pendingGuardianMessage');
                }
                
                // 守護神の儀式が完了している場合、会話履歴に守護神確認メッセージが含まれているか確認
                // 含まれていない場合は追加（APIが儀式完了を認識できるように）
                // 【重要】ritualCompletedフラグまたはassignedDeityが存在する場合、守護神の儀式は既に完了している
                // 【重要】guardianMessageShownがtrueの場合は、楓専用の定型文が既に表示されているためスキップ
                const ritualCompleted = sessionStorage.getItem('ritualCompleted');
                // 【変更】assignedDeityをhistoryDataから取得（データベースベースの判断）
                const assignedDeity = (historyData && historyData.assignedDeity) || null;
                const guardianMessageShownCheck = sessionStorage.getItem('guardianMessageShown') === 'true';
                
                if ((ritualCompleted === 'true' || assignedDeity) && !guardianMessageShownCheck && ChatData.conversationHistory && ChatData.conversationHistory.recentMessages) {
                    const hasGuardianMessage = ChatData.conversationHistory.recentMessages.some(msg => 
                        msg.role === 'assistant' && msg.content && msg.content.includes('の守護神は')
                    );
                    
                    if (!hasGuardianMessage && assignedDeity) {
                        // 【変更】userNicknameをhistoryDataから取得（データベースベースの判断）
                        const userNickname = (historyData && historyData.nickname) || ChatData.userNickname || 'あなた';
                        // 守護神名（データベースに日本語で保存されているのでそのまま使用）
                        const guardianName = assignedDeity;
                        const guardianConfirmationMessage = `${userNickname}の守護神は${guardianName}です\nこれからは、私と守護神である${guardianName}が鑑定を進めていきます。\n${userNickname}が鑑定してほしいこと、再度、伝えていただけませんでしょうか。`;
                        
                        ChatData.conversationHistory.recentMessages.push({
                            role: 'assistant',
                            content: guardianConfirmationMessage
                        });
                        console.log('[会話履歴読み込み] 守護神確認メッセージを会話履歴に追加しました（ritualCompleted/assignedDeityチェック）');
                    }
                }
                
                // ユーザーデータを更新（historyDataから生年月日を取得して表示）
                ChatUI.updateUserStatus(true, {
                    nickname: historyData.nickname || '鑑定者',
                    birthYear: historyData.birthYear || null,
                    birthMonth: historyData.birthMonth || null,
                    birthDay: historyData.birthDay || null,
                    assignedDeity: historyData.assignedDeity || '未割当'
                });
                
                // 登録済みユーザーの特殊処理（ハンドラーに委譲）
                // 例: 楓の守護神判定などはハンドラーのinitPageで処理される
                
                // ハンドラーのinitPageを呼び出す（通常の初期化フロー）
                const handler = CharacterRegistry.get(character);
                let handlerSkippedFirstMessage = false;
                if (handler && typeof handler.initPage === 'function') {
                    const handlerResult = await handler.initPage(urlParams, historyData, justRegistered, shouldTriggerRegistrationFlow, {
                        guardianMessageShown
                    });
                    if (handlerResult && handlerResult.completed) {
                        console.log('[初期化] ハンドラーで処理完了。処理を終了します。');
                        return; // 処理終了
                    }
                    if (handlerResult && handlerResult.skip) {
                        console.log('[初期化] ハンドラーで処理スキップ。共通処理をスキップします。');
                        handlerSkippedFirstMessage = true; // 初回メッセージの表示はスキップ（ハンドラーで処理済み）
                    }
                }
                
                // 【統一化】共通の初回メッセージ表示ロジックを使用
                await showInitialMessage({ handlerSkippedFirstMessage });
            } else if (historyData && historyData.nickname) {
                // #region agent log (開発環境のみ - コメントアウト)
                // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:398',message:'分岐2: historyData.nickname存在',data:{character,hasHistoryData:!!historyData,hasHistory:historyData?.hasHistory,hasNickname:!!historyData?.nickname},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // }
                // #endregion
                // 【重要】hasHistoryがfalseでも、nicknameが存在する場合は登録済みユーザーとして扱う
                // ChatData.conversationHistoryを設定（データベースから読み込んだ情報を保存）
                ChatData.conversationHistory = historyData;
                ChatData.userNickname = historyData.nickname;
                
                // ユーザーデータを更新（historyDataから生年月日を取得して表示）
                ChatUI.updateUserStatus(true, {
                    nickname: historyData.nickname || '鑑定者',
                    birthYear: historyData.birthYear || null,
                    birthMonth: historyData.birthMonth || null,
                    birthDay: historyData.birthDay || null,
                    assignedDeity: historyData.assignedDeity || '未割当'
                });
                
                // ハンドラーのinitPageを呼び出す（通常の初期化フロー）
                // ハンドラーが読み込まれるのを待つ（最大5秒）
                let handler = CharacterRegistry.get(character);
                let attempts = 0;
                const maxAttempts = 50; // 5秒間待機（100ms × 50）
                while (!handler && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    handler = CharacterRegistry.get(character);
                    attempts++;
                }
                
                console.log('[初期化] ハンドラー取得結果:', {
                    character,
                    hasHandler: !!handler,
                    hasInitPage: handler && typeof handler.initPage === 'function',
                    handlerType: handler ? typeof handler : 'null',
                    attempts: attempts
                });
                let handlerSkippedFirstMessage = false;
                if (handler && typeof handler.initPage === 'function') {
                    console.log('[初期化] ハンドラーのinitPageを呼び出します:', character);
                    const handlerResult = await handler.initPage(urlParams, historyData, justRegistered, shouldTriggerRegistrationFlow, {
                        guardianMessageShown
                    });
                    console.log('[初期化] ハンドラーのinitPage呼び出し完了:', {
                        character,
                        result: handlerResult
                    });
                    if (handlerResult && handlerResult.completed) {
                        console.log('[初期化] ハンドラーで処理完了。処理を終了します。');
                        return; // 処理終了
                    }
                    if (handlerResult && handlerResult.skip) {
                        console.log('[初期化] ハンドラーで処理スキップ。共通処理をスキップします。');
                        handlerSkippedFirstMessage = true; // 初回メッセージの表示はスキップ（ハンドラーで処理済み）
                    }
                } else if (!handler) {
                    console.warn('[初期化] ハンドラーが読み込まれていません。後で再試行します。');
                    // ハンドラーが読み込まれた後に、もう一度initPageを呼び出すために、カスタムイベントを発火
                    // ただし、これは暫定的な解決策です。本来は、ハンドラーが読み込まれるのを待つべきです。
                }
                
                // 【統一化】共通の初回メッセージ表示ロジックを使用
                await showInitialMessage({ handlerSkippedFirstMessage });
            } else {
                // #region agent log (開発環境のみ - コメントアウト)
                // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-init.js:415',message:'分岐3: historyDataなしまたはnicknameなし',data:{character,hasHistoryData:!!historyData,hasHistory:historyData?.hasHistory,hasNickname:!!historyData?.nickname},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // }
                // #endregion
                
                // 【変更】登録済みユーザーの場合でも、historyDataがない場合は表示しない
                // （データベースベースの判断のため、localStorageは使用しない）
                // historyDataが存在する場合は、上記の分岐で既に処理されている
                if (historyData && historyData.nickname) {
                    // 【重要】hasHistoryがfalseでも、nicknameが存在する場合は登録済みユーザーとして扱う
                    // ChatData.conversationHistoryを設定（データベースから読み込んだ情報を保存）
                    ChatData.conversationHistory = historyData;
                    ChatData.userNickname = historyData.nickname;
                    
                    ChatUI.updateUserStatus(true, {
                        nickname: historyData.nickname || '鑑定者',
                        birthYear: historyData.birthYear || null,
                        birthMonth: historyData.birthMonth || null,
                        birthDay: historyData.birthDay || null,
                        assignedDeity: historyData.assignedDeity || '未割当'
                    });
                }
                
                // ハンドラーのinitPageを呼び出す（通常の初期化フロー）
                // ハンドラーが読み込まれるのを待つ（最大5秒）
                let handler = CharacterRegistry.get(character);
                let attempts = 0;
                const maxAttempts = 50; // 5秒間待機（100ms × 50）
                while (!handler && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    handler = CharacterRegistry.get(character);
                    attempts++;
                }
                
                let handlerSkippedFirstMessage = false;
                if (handler && typeof handler.initPage === 'function') {
                    console.log('[初期化] ハンドラーのinitPageを呼び出します（historyDataなし）:', character);
                    // historyDataが取得できなかった場合でも、ハンドラーにnullを渡して処理を委譲
                    const handlerResult = await handler.initPage(urlParams, historyData, justRegistered, shouldTriggerRegistrationFlow, {
                        guardianMessageShown
                    });
                    console.log('[初期化] ハンドラーのinitPage呼び出し完了（historyDataなし）:', {
                        character,
                        result: handlerResult
                    });
                    if (handlerResult && handlerResult.completed) {
                        console.log('[初期化] ハンドラーで処理完了。処理を終了します。');
                        return; // 処理終了
                    }
                    if (handlerResult && handlerResult.skip) {
                        console.log('[初期化] ハンドラーで処理スキップ。共通処理をスキップします。');
                        handlerSkippedFirstMessage = true; // 初回メッセージの表示はスキップ（ハンドラーで処理済み）
                    }
                } else if (!handler) {
                    console.warn('[初期化] ハンドラーが読み込まれていません（historyDataなし）。後で再試行します。');
                }
                
                // 【統一化】共通の初回メッセージ表示ロジックを使用
                await showInitialMessage({ handlerSkippedFirstMessage });
            }
            
            // 守護神確認メッセージを表示した場合は、フラグをクリア
            if (guardianMessageShown) {
                sessionStorage.removeItem('guardianMessageShown');
                sessionStorage.removeItem('ritualCompleted');
            }
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:820',message:'initPage関数終了（正常終了）',data:{character},timestamp:Date.now(),runId:'debug-run',hypothesisId:'B'})}).catch(()=>{});
            // }
            // #endregion
            this._initPageRunning = false;
            this._initPageCompleted = true;
        } catch (error) {
            // エラーが発生した場合、character変数がまだ定義されていない可能性があるため、
            // URLパラメータまたはChatData.currentCharacterから取得
            const urlParams = new URLSearchParams(window.location.search);
            let character = ChatData?.currentCharacter || urlParams.get('character') || 'kaede';
            
            // #region agent log (開発環境のみ - コメントアウト)
            // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            //     fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat-engine.js:825',message:'initPage関数エラー',data:{character,errorMessage:error?.message,errorStack:error?.stack?.split('\n').slice(0,5).join(' | ')},timestamp:Date.now(),runId:'debug-run',hypothesisId:'B'})}).catch(()=>{});
            // }
            // #endregion
            this._initPageRunning = false;
            this._initPageCompleted = true;
            console.error('Error loading conversation history:', error);
            const info = ChatData.characterInfo[character];
            
            // エラー時はハンドラーのinitPageを呼び出す
            const handler = CharacterRegistry.get(character);
            let handlerSkippedFirstMessage = false;
            if (handler && typeof handler.initPage === 'function') {
                // エラー分岐でもハンドラーに処理を委譲
                const handlerResult = await handler.initPage(urlParams, null, justRegistered, shouldTriggerRegistrationFlow, {
                    guardianMessageShown
                });
                if (handlerResult && handlerResult.completed) {
                    console.log('[初期化] ハンドラーで処理完了（エラー分岐）。処理を終了します。');
                    return; // 処理終了
                }
                if (handlerResult && handlerResult.skip) {
                    console.log('[初期化] ハンドラーで処理スキップ（エラー分岐）。共通処理をスキップします。');
                    handlerSkippedFirstMessage = true; // 初回メッセージの表示はスキップ（ハンドラーで処理済み）
                }
            }
            
            // 【統一化】共通の初回メッセージ表示ロジックを使用
            showInitialMessage({ handlerSkippedFirstMessage });
        }

        // イベントリスナーは window.addEventListener('load', ...) で設定されるため、ここでは設定しない
        // （重複登録を防ぐため。loadイベントでcloneNodeを使って確実に1回だけ登録される）
        
        // 待機画面を非表示にする（通常の初期化フロー）
        if (waitingOverlay) {
            waitingOverlay.classList.add('hidden');
            console.log('[初期化] 待機画面を非表示にしました');
        }
        
        ChatUI.updateSendButtonVisibility();
    },


    /**
     * メッセージを送信
     * @param {boolean} skipUserMessage - ユーザーメッセージをスキップするか
     * @param {boolean} skipAnimation - アニメーションをスキップするか
     */
    async sendMessage(skipUserMessage = false, skipAnimation = false, messageOverride = null) {
        // メッセージ送信中フラグをチェック（重複送信防止）
        if (this._sendingMessage) {
            console.warn('[メッセージ送信] ⚠️ メッセージ送信が既に進行中です。重複送信をブロックします');
            return;
        }
        
        // メッセージ入力欄が無効化されている場合は送信をブロック
        if (ChatUI.messageInput && ChatUI.messageInput.disabled) {
            console.log('[メッセージ送信] メッセージ入力欄が無効化されているため、送信をブロックします');
            return;
        }
        
        // メッセージの取得：オーバーライドが指定されている場合はそれを使用、そうでなければ入力欄から取得
        const message = messageOverride || ChatUI.messageInput.value.trim();
        const character = ChatData.currentCharacter;

        if (!message) {
            return;
        }
        
        // 送信中フラグを設定
        this._sendingMessage = true;
        
        // 【デバッグ】sendMessageの呼び出しを追跡
        const callStack = new Error().stack;
        console.log('[メッセージ送信] sendMessage呼び出し:', {
            message: message.substring(0, 50),
            character,
            skipUserMessage,
            skipAnimation,
            callStack: callStack?.split('\n').slice(0, 5).join(' | ')
        });
        
        // エラー時にもフラグをリセットするためにtry-finallyを使用
        try {
            // タロットカード解説トリガーマーカーを検出
            const isTarotExplanationTrigger = message.includes('[TAROT_EXPLANATION_TRIGGER:');
            
            // メッセージ送信ボタンを押した時点で、即座にカウントを開始
            if (!isTarotExplanationTrigger) {
                // 個別相談モードのチェック（ハンドラーに委譲）
                const handler = CharacterRegistry.get(character);
                const isConsultationMode = handler && typeof handler.isConsultationMode === 'function' 
                    ? handler.isConsultationMode() 
                    : false;
                
                // メッセージ送信前：現在のカウントを取得（ハンドラーに委譲）
                let currentCount;
                if (isConsultationMode && handler && typeof handler.getConsultationMessageCount === 'function') {
                    currentCount = handler.getConsultationMessageCount();
                } else {
                    // 通常のメッセージカウントを使用
                    currentCount = ChatData.getUserMessageCount(character);
                }

                // 送信ボタンを押した時点で、会話履歴にメッセージを追加してカウントを更新
                // これにより、メッセージ数が確実に1からスタートし、以降は自動的に増える
                ChatData.addToConversationHistory(character, 'user', message);
                
                // 会話履歴が正しく保存されたことを確認
                const savedHistory = ChatData.getConversationHistory(character);
                console.log('[メッセージ送信] 会話履歴に追加後の確認:', {
                    character,
                    historyLength: savedHistory.length,
                    userMessages: savedHistory.filter(msg => msg && msg.role === 'user').length,
                    lastMessage: savedHistory.length > 0 ? savedHistory[savedHistory.length - 1] : null
                });
                
                // メッセージカウントを取得（ハンドラーに委譲）
                let messageCount;
                if (isConsultationMode && handler && typeof handler.incrementConsultationMessageCount === 'function') {
                    messageCount = handler.incrementConsultationMessageCount();
                } else {
                    // 通常のカウントを取得
                    messageCount = ChatData.getUserMessageCount(character);
                }
                
                const isFirstMessage = currentCount === 0;
                if (isFirstMessage) {
                    console.log('[メッセージ送信] 🎯 最初のメッセージを送信しました（カウント=1からスタート）:', {
                        character,
                        message: message.substring(0, 50) + '...',
                        messageCount: messageCount,
                        historyLength: savedHistory.length
                    });
                    
                    // 【スケーラビリティ改善】セッション最初のメッセージ記録をハンドラーに委譲
                    const handlerForFirstMessage2 = CharacterRegistry.get(character);
                    if (handlerForFirstMessage2 && typeof handlerForFirstMessage2.onFirstMessageInSession === 'function') {
                        handlerForFirstMessage2.onFirstMessageInSession(message, isTarotExplanationTrigger);
                    }
                } else {
                    console.log('[メッセージ送信] メッセージを送信しました:', {
                        character,
                        message: message.substring(0, 50) + '...',
                        beforeCount: currentCount,
                        afterCount: messageCount,
                        historyLength: savedHistory.length
                    });
                }
                
                // reading-animation.htmlでAPIリクエスト時にメッセージカウントを送信できるように、sessionStorageに保存
                // この時点で、会話履歴にメッセージが追加されていることを確認済み
                sessionStorage.setItem('lastGuestMessageCount', String(messageCount));
                console.log('[メッセージ送信] sessionStorageにメッセージカウントを保存:', {
                    key: 'lastGuestMessageCount',
                    value: messageCount,
                });
                
                // メッセージ送信直後に親ウィンドウに通知（分析パネル更新用）
                if (window.parent && window.parent !== window) {
                    try {
                        window.parent.postMessage({
                            type: 'CHAT_MESSAGE_SENT',
                            character: character,
                            messageCount: messageCount,
                            timestamp: Date.now()
                        }, '*');
                        console.log('[iframe] メッセージ送信を親ウィンドウに通知しました（送信時）', {
                            character,
                            messageCount
                        });
                    } catch (error) {
                        console.error('[iframe] メッセージ送信通知エラー:', error);
                    }
                }
                
                // 管理者モードの分析パネルを更新（自分自身のウィンドウ）
                if (typeof window.updateAdminAnalysisPanel === 'function') {
                    setTimeout(() => {
                        window.updateAdminAnalysisPanel();
                    }, 300);
                } else {
                    // カスタムイベントを発火
                    document.dispatchEvent(new CustomEvent('adminPanelUpdate'));
                }
                
                // 【削除】ゲストモードは廃止されたため、updateUserStatus(false)の呼び出しを削除
                // 登録済みユーザーのみなので、userDataがない場合は何も表示しない
            }

            // ユーザーメッセージの追加は、API応答を確認してから行う（楓の場合の条件分岐のため）
            // ただし、会話履歴には先に追加する必要がある（APIが認識できるように）
            const messageToSend = message;
            
            // 【重要】ユーザーメッセージを送信時点で即座に表示（ユーザーが送信を確認できるように）
            // タロットカード解説トリガーマーカーの場合は表示しない
            if (!skipUserMessage && !isTarotExplanationTrigger) {
                // 【デバッグ】既に同じメッセージが表示されているかチェック
                const existingUserMessages = ChatUI.messagesDiv.querySelectorAll('.message.user');
                const messageTexts = Array.from(existingUserMessages).map(msg => {
                    const textDiv = msg.querySelector('div:last-child');
                    return textDiv ? textDiv.textContent.trim() : '';
                });
                const messageExists = messageTexts.some(text => text.trim() === messageToSend.trim());
                
                if (messageExists) {
                    console.warn('[メッセージ送信] ⚠️ 既に同じユーザーメッセージが表示されています。重複追加をスキップします:', messageToSend.substring(0, 50));
                } else {
                    console.log('[メッセージ送信] ユーザーメッセージを画面に追加:', messageToSend.substring(0, 50));
                    ChatUI.addMessage('user', messageToSend, 'あなた');
                    await this.delay(100);
                    ChatUI.scrollToLatest();
                }
            }
            
            ChatUI.messageInput.value = '';
            ChatUI.updateSendButtonVisibility();
            // 注意：updateSendButtonVisibility()内でdisabledが設定されるため、ここでの設定は不要
            
            // タロットカード解説トリガーマーカーの場合は、sessionStorageに保存しない
            if (!skipUserMessage && !isTarotExplanationTrigger) {
                // メッセージカウントを取得：会話履歴からユーザーメッセージ数を計算
                const conversationHistory = ChatData.conversationHistory?.recentMessages || [];
                const messageCount = conversationHistory.filter(msg => msg && msg.role === 'user').length + 1; // 現在送信中のメッセージを含める
                
                const userMessageData = {
                    message: messageToSend,
                    character: character,
                    timestamp: new Date().toISOString(),
                    messageCount: messageCount // メッセージカウントも含める
                };
                sessionStorage.setItem('lastUserMessage', JSON.stringify(userMessageData));
            }
            
            // reading-animation.htmlへの遷移をスキップし、チャット画面で直接APIリクエストを送信
            // 待機メッセージを表示（送信者名は表示しない）
            const waitingMessageId = ChatUI.addMessage('loading', '返信が来るまで少しお待ちください...', null);
            
            // 会話履歴を取得（メッセージ送信前に追加されたメッセージを含む）
                let conversationHistory = ChatData.conversationHistory?.recentMessages || [];
                
                // 守護神の儀式完了後、会話履歴に守護神確認メッセージが含まれているか確認
                // 含まれていない場合は追加（APIが儀式完了を認識できるように）
                const ritualCompleted = sessionStorage.getItem('ritualCompleted');
                if (ritualCompleted === 'true') {
                    const hasGuardianMessage = conversationHistory.some(msg => 
                        msg.role === 'assistant' && msg.content && msg.content.includes('の守護神は')
                    );
                    
                    if (!hasGuardianMessage) {
                        // 守護神情報はhistoryDataから取得
                        const assignedDeity = (ChatData.conversationHistory && ChatData.conversationHistory.assignedDeity) || null;
                        const userNickname = ChatData.userNickname || 'あなた';
                        
                        if (assignedDeity) {
                            // 守護神名（データベースに日本語で保存されているのでそのまま使用）
                            const guardianName = assignedDeity;
                            const guardianConfirmationMessage = `${userNickname}の守護神は${guardianName}です\nこれからは、私と守護神である${guardianName}が鑑定を進めていきます。\n${userNickname}が鑑定してほしいこと、再度、伝えていただけませんでしょうか。`;
                            
                            conversationHistory.push({
                                role: 'assistant',
                                content: guardianConfirmationMessage
                            });
                            
                            // ChatData.conversationHistoryも更新
                            if (ChatData.conversationHistory) {
                                if (!ChatData.conversationHistory.recentMessages) {
                                    ChatData.conversationHistory.recentMessages = [];
                                }
                                ChatData.conversationHistory.recentMessages.push({
                                    role: 'assistant',
                                    content: guardianConfirmationMessage
                                });
                            }
                            
                            console.log('[メッセージ送信] 守護神確認メッセージを会話履歴に追加しました（API送信前）');
                        }
                    }
                }
                
                // メッセージカウントを取得：会話履歴からユーザーメッセージ数を計算（今回送信するメッセージは含まれていない）
                let messageCountForAPI = conversationHistory.filter(msg => msg && msg.role === 'user').length;
                
                // 個別相談モードのチェック（ハンドラーに委譲）
                let handler = CharacterRegistry.get(character);
                const isConsultationMode = handler && typeof handler.isConsultationMode === 'function' 
                    ? handler.isConsultationMode() 
                    : false;
                
                if (isConsultationMode && handler && typeof handler.getConsultationMessageCount === 'function') {
                    // 個別相談モードの場合は、ハンドラーからカウントを取得
                    const currentCount = handler.getConsultationMessageCount();
                    messageCountForAPI = currentCount;
                    console.log('[個別相談] APIに送信するメッセージカウント:', {
                        鑑定士: character,
                        現在の個別相談カウント: currentCount,
                        APIに送信する値: messageCountForAPI,
                        API側で計算される最終値: messageCountForAPI + 1
                    });
                }
                
                // 雪乃の場合、そのセッションで最初のメッセージを記録（まとめ鑑定で使用）
                // セッション最初のメッセージを記録（ハンドラーに委譲）
                if (!isTarotExplanationTrigger) {
                    if (handler && typeof handler.recordFirstMessageInSession === 'function') {
                        handler.recordFirstMessageInSession(messageToSend);
                    }
                }
                
                // APIリクエストのオプション
                const options = {};
                
                // APIリクエストを送信
                const response = await ChatAPI.sendMessage(messageToSend, character, conversationHistory, options);
                
                // 待機メッセージを削除
                if (waitingMessageId) {
                    const waitingElement = document.getElementById(waitingMessageId);
                    if (waitingElement) {
                        waitingElement.remove();
                    }
                }
                
                // 応答を処理
                if (response.error) {
                    const errorMessage = response.message || response.error || 'エラーが発生しました';
                    console.error('[ChatEngine] APIエラー:', { error: response.error, message: response.message, fullResponse: response });
                    ChatUI.addMessage('error', `エラーが発生しました: ${errorMessage}`, 'システム');
                    if (ChatUI.sendButton) ChatUI.sendButton.disabled = false;
                    return;
                }

                // 汎用的なリダイレクト指示をチェック（特定のページへの依存を避ける）
                if (response.redirect && response.redirectUrl) {
                    console.log('[ChatEngine] リダイレクト指示を受信:', response.redirectUrl);
                    window.location.href = response.redirectUrl;
                    return;
                }
                
                // 応答メッセージを表示
                const characterName = ChatData.characterInfo[character]?.name || character;
                const responseText = response.message || response.response || '応答を取得できませんでした';
                
                // ユーザーメッセージを表示するかどうかを判定（ハンドラーに委譲）
                let shouldShowUserMessage = !skipUserMessage;
                if (!skipUserMessage) {
                    // handlerは既に宣言済みなので、再取得のみ
                    handler = handler || CharacterRegistry.get(character);
                    if (handler && typeof handler.shouldShowUserMessage === 'function') {
                        shouldShowUserMessage = handler.shouldShowUserMessage(responseText, false);
                    }
                }
                
                // ユーザーメッセージは既に送信時に表示済み（588行目付近）
                // 「ニックネームと生年月日を入力」が含まれる場合は、表示されたユーザーメッセージを削除
                if (!shouldShowUserMessage && !skipUserMessage) {
                    // 最後のユーザーメッセージを削除
                    const userMessages = ChatUI.messagesDiv.querySelectorAll('.message.user');
                    if (userMessages.length > 0) {
                        const lastUserMessage = userMessages[userMessages.length - 1];
                        const messageText = lastUserMessage.querySelector('div:last-child')?.textContent?.trim();
                        if (messageText === messageToSend) {
                            lastUserMessage.remove();
                            console.log('[楓専用処理] ユーザーメッセージを削除しました:', messageToSend);
                        }
                    }
                }
                
                const messageId = ChatUI.addMessage('character', responseText, characterName);
                ChatUI.scrollToLatest();
                
                // 【スケーラビリティ改善】レスポンス表示後の処理をハンドラーに委譲
                const handlerForResponseDisplay = CharacterRegistry.get(character);
                if (handlerForResponseDisplay && typeof handlerForResponseDisplay.handleAfterResponseDisplay === 'function') {
                    handlerForResponseDisplay.handleAfterResponseDisplay(messageId);
                }
                
                // キャラクター専用ハンドラーでレスポンスを処理（統一的に処理）
                // handlerは既に宣言済みなので、再取得のみ
                handler = handler || CharacterRegistry.get(character);
                if (handler && typeof handler.handleResponse === 'function') {
                    handlerProcessed = await handler.handleResponse(response, character);
                    
                    // ハンドラーで処理された場合は、以降の処理をスキップ
                    if (handlerProcessed) {
                        console.log('[キャラクターハンドラー] レスポンス処理が完了しました:', character);
                        // 送信ボタンを再有効化はハンドラー側で行う
                        return;
                    }
                }
                
                // 登録ユーザーの場合、会話履歴はAPIから取得されるため、ここでは更新しない
                // 必要に応じて、会話履歴を再読み込み
                
                // 送信ボタンを再有効化
                if (ChatUI.sendButton) ChatUI.sendButton.disabled = false;
                
                // 管理者モードの分析パネルを更新
                if (typeof window.updateAdminAnalysisPanel === 'function') {
                    setTimeout(() => {
                        window.updateAdminAnalysisPanel();
                    }, 300);
                } else {
                    document.dispatchEvent(new CustomEvent('adminPanelUpdate'));
                }
                
        } catch (error) {
            console.error('メッセージ送信エラー:', error);
                
            // 待機メッセージを削除
            if (waitingMessageId) {
                const waitingElement = document.getElementById(waitingMessageId);
                if (waitingElement) {
                    waitingElement.remove();
                }
            }
            
            ChatUI.addMessage('error', `エラーが発生しました: ${error.message || 'メッセージの送信に失敗しました'}`, 'システム');
            if (ChatUI.sendButton) ChatUI.sendButton.disabled = false;
        } finally {
            // 送信中フラグをリセット
            this._sendingMessage = false;
        }
    },

    /**
     * アニメーション画面から戻ってきた時の処理
     */
    handleReturnFromAnimation() {
        const lastUserMessage = sessionStorage.getItem('lastUserMessage');
        const consultResponse = sessionStorage.getItem('lastConsultResponse');
        const consultError = sessionStorage.getItem('lastConsultError');
        
        // 【デバッグ】handleReturnFromAnimationの呼び出しを追跡
        const callStack = new Error().stack;
        console.log('[handleReturnFromAnimation] 関数呼び出し:', {
            hasLastUserMessage: !!lastUserMessage,
            hasConsultResponse: !!consultResponse,
            hasConsultError: !!consultError,
            callStack: callStack?.split('\n').slice(0, 5).join(' | ')
        });
        
        // 【重要】守護神の儀式完了後（guardianMessageShownフラグが設定されている場合）は、lastUserMessageを表示しない
        const guardianMessageShown = sessionStorage.getItem('guardianMessageShown') === 'true';
        const ritualCompleted = sessionStorage.getItem('ritualCompleted') === 'true';
        
        console.log('[handleReturnFromAnimation] フラグ確認:', {
            guardianMessageShown,
            ritualCompleted,
            hasLastUserMessage: !!lastUserMessage
        });
        
        // 【修正】守護神の儀式完了直後（ritualCompletedまたはguardianMessageShown）の場合は、lastUserMessageを完全に無視
        if ((guardianMessageShown || ritualCompleted) && lastUserMessage) {
            console.log('[handleReturnFromAnimation] 守護神の儀式完了後です。lastUserMessageを表示しません。', {
                guardianMessageShown,
                ritualCompleted,
                lastUserMessage: lastUserMessage.substring(0, 50)
            });
            sessionStorage.removeItem('lastUserMessage');
            // ここでreturnしない（consultResponseの処理を続行するため）
        }

        if (consultError) {
            ChatUI.addMessage('error', `エラーが発生しました: ${consultError}`, 'システム');
            sessionStorage.removeItem('lastConsultError');
            if (ChatUI.sendButton) ChatUI.sendButton.disabled = false;
            return;
        }

        // 【重要】guardianMessageShownまたはritualCompletedが設定されている場合、lastUserMessageは完全に無視
        // （上で既に削除済みだが、念のため再度チェック）
        if (lastUserMessage && (guardianMessageShown || ritualCompleted)) {
            console.log('[handleReturnFromAnimation] 守護神の儀式完了後です。lastUserMessageを完全に無視します（2回目のチェック）');
            sessionStorage.removeItem('lastUserMessage');
            lastUserMessage = null; // 後続の処理で使用されないようにする
        }
        
        if (lastUserMessage && !guardianMessageShown && !ritualCompleted) {
            try {
                const userMsgData = JSON.parse(lastUserMessage);
                const messageToCheck = userMsgData.message.trim();
                
                // タロットカードの解説リクエストメッセージ・トリガーマーカーは表示しない
                if (messageToCheck.includes('以下のタロットカードについて') || 
                    messageToCheck.includes('このカードの意味、私の') ||
                    messageToCheck.includes('のカード「') ||
                    messageToCheck.includes('について、詳しく解説してください') ||
                    messageToCheck.includes('[TAROT_EXPLANATION_TRIGGER:')) {
                    sessionStorage.removeItem('lastUserMessage');
                    return;
                }
                
                // 既に同じメッセージが表示されているかチェック（重複防止）
                const existingUserMessages = ChatUI.messagesDiv.querySelectorAll('.message.user');
                const messageTexts = Array.from(existingUserMessages).map(msg => {
                    const textDiv = msg.querySelector('div:last-child');
                    return textDiv ? textDiv.textContent.trim() : '';
                });
                
                const messageExists = messageTexts.some(text => text.trim() === messageToCheck);
                
                if (!messageExists) {
                    console.log('[handleReturnFromAnimation] lastUserMessageからユーザーメッセージを表示:', messageToCheck.substring(0, 50));
                    ChatUI.addMessage('user', userMsgData.message, 'あなた');
                    if (ChatUI.messageInput) ChatUI.messageInput.blur();
                    setTimeout(() => ChatUI.scrollToLatest(), 200);
                } else {
                    console.log('[handleReturnFromAnimation] 既に同じメッセージが表示されているため、スキップします:', messageToCheck.substring(0, 50));
                }
                
                sessionStorage.removeItem('lastUserMessage');
            } catch (error) {
                console.error('Error parsing user message:', error);
                sessionStorage.removeItem('lastUserMessage');
            }
        }

        if (consultResponse) {
            try {
                const data = JSON.parse(consultResponse);
                
                // デバッグ: data.messageの型を確認
                if (data.message && typeof data.message !== 'string') {
                    console.error('[handleReturnFromAnimation] ⚠️ data.messageが文字列ではありません！', {
                        messageType: typeof data.message,
                        messageValue: data.message,
                        fullData: data,
                        consultResponse: consultResponse
                    });
                    debugger; // 開発者ツールで停止
                }
                
                // 【新仕様】userTokenは不要。エラーハンドリングを簡素化
                if (data.error && (data.error.includes('user not found') || data.error.includes('session'))) {
                    // 【変更】localStorageからの削除を削除（データベースベースの判断）
                    if (window.AuthState && typeof window.AuthState.clearAuth === 'function') {
                        AuthState.clearAuth();
                    }
                    window.location.href = '../auth/login.html?redirect=' + encodeURIComponent(window.location.href);
                    if (ChatUI.sendButton) ChatUI.sendButton.disabled = false;
                    return;
                }
                
                if (data.error) {
                    ChatUI.addMessage('error', data.error, 'システム');
                } else if (data.isInappropriate) {
                    ChatUI.addMessage('warning', data.message, data.characterName);
                } else if (data.message) {
                    // data.messageが文字列であることを確認
                    const messageText = typeof data.message === 'string' ? data.message : String(data.message);
                    ChatUI.addMessage('character', messageText, data.characterName);
                    
                    // 【スケーラビリティ改善】レスポンス表示後の処理をハンドラーに委譲
                    const characterForResponseDisplay = ChatData?.currentCharacter || 'unknown';
                    const handlerForResponseDisplay2 = CharacterRegistry.get(characterForResponseDisplay);
                    if (handlerForResponseDisplay2 && typeof handlerForResponseDisplay2.handleAfterResponseDisplay === 'function') {
                        // メッセージIDを生成（既存のロジックに合わせる）
                        const messageIdForHandler = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        handlerForResponseDisplay2.handleAfterResponseDisplay(messageIdForHandler);
                    }
                    
                    // 親ウィンドウにメッセージ送信完了を通知（分析パネル更新用）
                    if (window.parent && window.parent !== window) {
                        try {
                            const character = ChatData?.currentCharacter || 'unknown';
                            const isRegistered = window.AuthState?.isRegistered() || false;
                            const messageCount = ChatData?.getUserMessageCount(character) || 0;
                            
                            console.log('[応答受信] 親ウィンドウに通知:', {
                                character,
                                messageCount
                            });
                            
                            window.parent.postMessage({
                                type: 'CHAT_MESSAGE_SENT',
                                character: character,
                                messageCount: messageCount,
                                timestamp: Date.now()
                            }, '*');
                            console.log('[iframe] メッセージ送信完了を親ウィンドウに通知しました（応答受信後）', {
                                character,
                                messageCount
                            });
                        } catch (error) {
                            console.error('[iframe] メッセージ送信通知エラー:', error);
                        }
                    }
                    
                    // 会話履歴に追加（すべて登録ユーザーのため、常に実行）
                    ChatData.addToConversationHistory(ChatData.currentCharacter, 'assistant', data.message);
                    
                    // アニメーション画面から戻ってきた時、会話履歴からメッセージ数を再計算して保存
                    const history = ChatData.getConversationHistory(ChatData.currentCharacter);
                    if (history && Array.isArray(history)) {
                        const historyUserMessages = history.filter(msg => msg && msg.role === 'user').length;
                        const currentCount = ChatData.getUserMessageCount(ChatData.currentCharacter);
                        
                        console.log('[応答受信] メッセージカウントを再確認:', {
                            character: ChatData.currentCharacter,
                            currentCount: currentCount,
                            historyUserMessages: historyUserMessages,
                            historyLength: history.length
                        });
                        
                        // 会話履歴から計算した値の方が大きい、または現在のカウントが0の場合は更新
                        if (historyUserMessages > currentCount || currentCount === 0) {
                            console.log('[応答受信] ⚠️ メッセージカウントを修正:', {
                                oldCount: currentCount,
                                newCount: historyUserMessages
                            });
                            ChatData.setUserMessageCount(ChatData.currentCharacter, historyUserMessages);
                        }
                    }
                    
                    // 【削除】ゲストモードは廃止されたため、updateUserStatus(false)の呼び出しを削除
                // 登録済みユーザーのみなので、userDataがない場合は何も表示しない
                    
                    if (ChatUI.messageInput) ChatUI.messageInput.blur();
                    setTimeout(() => ChatUI.scrollToLatest(), 100);
                    
                } else {
                    ChatUI.addMessage('error', '返信が取得できませんでした', 'システム');
                }
                
                // 会話履歴はデータベースで管理されるため、sessionStorageのクリアは不要
                
                sessionStorage.removeItem('lastConsultResponse');
            } catch (error) {
                console.error('Error parsing consult response:', error);
            }
        }
        
        if (ChatUI.sendButton) ChatUI.sendButton.disabled = false;
        if (ChatUI.messageInput) ChatUI.messageInput.blur();
        
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    },

    /**
     * 守護神の儀式への同意処理
     * @param {boolean} consent - 同意するかどうか
     */
    async handleRitualConsent(consent) {
        const character = ChatData.currentCharacter;
        
        // キャラクター専用ハンドラーの同意処理を呼び出す
        const handler = CharacterRegistry.get(character);
        if (handler && typeof handler.handleRitualConsent === 'function') {
            const handled = await handler.handleRitualConsent(consent);
            if (handled) {
                return; // ハンドラーで処理完了
            }
        }
        
        // ハンドラーがない場合のフォールバック処理
        ChatUI.hideRitualConsentButtons();
        
        // フラグをリセット（一度処理したので、再度表示されないようにする）
        ChatData.ritualConsentShown = true;
        
        if (consent) {
            // 「はい」を押した場合
            const characterName = ChatData.characterInfo[character]?.name || '鑑定士';
            
            // キャラクターに応じてメッセージを取得（ハンドラーから）
            let consentMessage = 'ユーザー登録への同意が検出されました。ボタンが表示されます。'; // デフォルト
            if (handler && typeof handler.getConsentMessage === 'function') {
                const customMessage = handler.getConsentMessage();
                if (customMessage) {
                    consentMessage = customMessage;
                }
            }
            
            ChatUI.addMessage('character', consentMessage, characterName);
            
            // メッセージを表示した後、少し待ってから登録画面に遷移
            setTimeout(() => {
                this.openRegistrationModal();
            }, 2000);
        } else {
            // 「いいえ」を押した場合
            // キャラクターに応じてメッセージを取得（ハンドラーから）
            let declineMessage = 'ユーザー登録をスキップしました。引き続きゲストモードでお話しできます。'; // デフォルト
            if (handler && typeof handler.getDeclineMessage === 'function') {
                const customMessage = handler.getDeclineMessage();
                if (customMessage) {
                    declineMessage = customMessage;
                }
            }
            
            ChatUI.addMessage('error', declineMessage, 'システム');
        }
    },

    /**
     * 登録モーダルを開く
     */
    openRegistrationModal() {
        // 登録画面に遷移（会話履歴はデータベースで管理されるため、保存は不要）
        window.location.href = '../auth/register.html?redirect=' + encodeURIComponent(window.location.href);
    },

    /**
     * 守護神の儀式を開始
     * @param {string} character - キャラクターID
     */
    async startGuardianRitual(character) {
        console.log('[守護神の儀式] 開始:', character);
        
            // 【登録ユーザーの場合のみ、以下の処理を実行】
        console.log('[守護神の儀式] 登録ユーザーとして儀式を開始します');
        
        // 送信ボタンを無効化
        if (ChatUI.sendButton) ChatUI.sendButton.disabled = true;
        
        try {
            // 会話履歴を取得（データベースのguardianカラムを確認するため）
            let historyData = null;
            try {
                historyData = await ChatAPI.loadConversationHistory(character);
                console.log('[守護神の儀式] 会話履歴データ:', historyData);
            } catch (error) {
                // エラーハンドリング
                if (error instanceof Error) {
                    if (error.message === 'USER_NOT_FOUND') {
                        // ユーザー情報が登録されていない場合：登録画面にリダイレクト
                        console.error('[守護神の儀式] ユーザー情報が登録されていません。登録画面にリダイレクトします。');
                        alert('あなたのユーザー情報が登録されていることが確認できません。恐れ入りますが、再度ユーザー登録をお願いします。');
                        window.location.href = '../auth/register.html';
                        return;
                    } else if (error.message === 'NETWORK_ERROR') {
                        // ネットワーク接続エラーの場合
                        console.error('[守護神の儀式] ネットワーク接続エラーが発生しました');
                        ChatUI.addMessage('error', 'インターネット接続エラーが発生しました。しばらく経ってから再度お試しください。', 'システム');
                        if (ChatUI.sendButton) ChatUI.sendButton.disabled = false;
                        return;
                    }
                }
                // その他のエラー
                console.error('[守護神の儀式] 会話履歴の取得エラー:', error);
                ChatUI.addMessage('error', '会話履歴の取得に失敗しました。時間を置いて再度お試しください。', 'システム');
                if (ChatUI.sendButton) ChatUI.sendButton.disabled = false;
                return;
            }
            
            // 【重要】データベースのguardianカラムから守護神が既に決定されているかチェック（優先）
            if (historyData && historyData.assignedDeity && historyData.assignedDeity.trim() !== '') {
                console.log('[守護神の儀式] データベースで守護神が既に決定されていることを確認（' + historyData.assignedDeity + '）。儀式を開始しません。');
                // 【変更】localStorageに保存しない（データベースベースの判断）
                if (ChatUI.sendButton) ChatUI.sendButton.disabled = false;
                return; // 儀式を開始しない
            }
            
            // 会話履歴の決定（優先順位順）
            let conversationHistory = [];
            let needsMigration = false; // ゲスト履歴の移行が必要かどうか
            
            // 1. 登録ユーザーの会話履歴がある場合はそれを使用
            if (historyData && historyData.hasHistory && historyData.recentMessages && historyData.recentMessages.length > 0) {
                conversationHistory = [...historyData.recentMessages];
                console.log('[守護神の儀式] 登録ユーザーの会話履歴を使用:', conversationHistory.length);
                
                // ChatData.conversationHistoryを更新
                ChatData.conversationHistory = historyData;
            } 
            // 2. 会話履歴がない場合は空配列
            else {
                conversationHistory = [];
                console.log('[守護神の儀式] 会話履歴が空です（新規会話）');
            }
            
            console.log('[守護神の儀式] 使用する会話履歴:', conversationHistory);
            
            // 【重要】ゲスト履歴の移行が必要な場合は、ダミーメッセージを送信してデータベースに保存
            if (needsMigration && conversationHistory.length > 0) {
                console.log('[守護神の儀式] ゲスト履歴をデータベースに移行します:', conversationHistory.length, '件');
                
                // 最初のユーザーメッセージを取得してsessionStorageに保存
                const firstUserMessage = conversationHistory.find(msg => msg.role === 'user');
                if (firstUserMessage && firstUserMessage.content) {
                    sessionStorage.setItem('firstQuestionBeforeRitual', firstUserMessage.content);
                    console.log('[守護神の儀式] 最初の質問をsessionStorageに保存:', firstUserMessage.content.substring(0, 50) + '...');
                }
                
                // 会話履歴はデータベースで管理されるため、移行処理は不要
            }
            
            // 【重要】ユーザー登録後は、守護神の儀式開始前にカエデのメッセージを表示
            // これにより、儀式完了後にユーザーの履歴が残らない（カエデが最後のメッセージになる）
            const characterName = ChatData.characterInfo[character]?.name || '楓';
            const ritualStartMessage = 'それではこれより守護神のイベントを開始いたします。\n画面が切り替わりますので、儀式を体験してください。';
            
            console.log('[守護神の儀式] 儀式開始前のメッセージを表示:', ritualStartMessage);
            
            // メッセージを確実に表示するため、DOM更新を待つ
            ChatUI.addMessage('character', ritualStartMessage, characterName);
            
            // DOM更新を待つ
            await new Promise(resolve => requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
            }));
            
            // スクロールしてメッセージを表示
            ChatUI.scrollToLatest();
            
            // 会話履歴に追加（ただし、データベースには保存しない）
            conversationHistory.push({ role: 'assistant', content: ritualStartMessage });
            
            // 会話履歴を保存（登録ユーザーの場合）
            // 注：このメッセージはデータベースに保存しない（儀式開始前のメッセージのため）
            // ただし、ChatDataには追加しておく（次の処理で使用する可能性があるため）
            if (AuthState.isRegistered() && ChatData.conversationHistory) {
                // このメッセージはデータベースには保存しない（一時的なメッセージ）
                // ChatData.conversationHistory.recentMessages = conversationHistory;
                console.log('[守護神の儀式] 儀式開始メッセージはデータベースに保存しません（一時メッセージ）');
            }
            
            // メッセージ表示後、少し待ってからguardian-ritual.htmlに遷移
            await this.delay(2000); // 2秒待つ（ユーザーがメッセージを読む時間を確保）

            // guardian-ritual.htmlに遷移
            // 現在のチャット画面のURLを保存（儀式完了後に戻るため）
            const currentChatUrl = window.location.href;
            sessionStorage.setItem('postRitualChatUrl', currentChatUrl);

            // 【修正】userIdをURLパラメータに含める（データベースからユーザー情報を取得するため）
            let ritualUrl = '../guardian-ritual.html';
            if (historyData && historyData.userId) {
                // 【修正】window.location.hrefを基準にして相対パスを解決
                const url = new URL(ritualUrl, window.location.href);
                url.searchParams.set('userId', String(historyData.userId));
                ritualUrl = url.pathname + url.search;
                console.log('[守護神の儀式] userIdをURLパラメータに追加:', historyData.userId);
            } else {
                // historyDataにuserIdがない場合、現在のURLから取得を試みる
                const currentUrlParams = new URLSearchParams(window.location.search);
                const userId = currentUrlParams.get('userId');
                if (userId) {
                    // 【修正】window.location.hrefを基準にして相対パスを解決
                    const url = new URL(ritualUrl, window.location.href);
                    url.searchParams.set('userId', userId);
                    ritualUrl = url.pathname + url.search;
                    console.log('[守護神の儀式] 現在のURLからuserIdを取得して追加:', userId);
                }
            }

            console.log('[守護神の儀式] guardian-ritual.htmlに遷移:', ritualUrl);
            window.location.href = ritualUrl;
            return; // 遷移するため、以降の処理は実行されない
            
        } catch (error) {
            console.error('[守護神の儀式] 例外エラー:', error);
            ChatUI.addMessage('error', '守護神の儀式の開始に失敗しました: ' + error.message, 'システム');
        } finally {
            // 送信ボタンを再有効化（遷移する場合は実行されないが、エラー時は必要）
            if (ChatUI.sendButton) ChatUI.sendButton.disabled = false;
            if (ChatUI.messageInput) ChatUI.messageInput.focus();
        }
    },

    /**
     * 遅延処理
     * @param {number} ms - ミリ秒
     * @returns {Promise} Promise
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * メッセージ要素に守護神の儀式開始ボタンを追加（再表示用）
     * @param {HTMLElement} messageElement - メッセージ要素
     */
    addRitualStartButtonToMessage(messageElement) {
        if (!messageElement) return;
        
        const character = ChatData.currentCharacter;
        
        // ボタンを追加
        ChatUI.addRitualStartButton(messageElement, async () => {
            console.log('[守護神の儀式] ボタンがクリックされました（再表示）');
            
            // ボタンを非表示
            const button = messageElement.querySelector('.ritual-start-button');
            if (button) {
                button.style.display = 'none';
            }
            
            // 守護神の儀式を開始（会話履歴はデータベースから取得）
            await this.startGuardianRitual(character);
        });
    }
};

// グローバルスコープに公開（iframeからアクセスできるようにする）
window.ChatInit = ChatInit;

// ===== 開発者向けテストユーティリティ =====
/**
 * テスト用ユーティリティ関数
 * コンソールから呼び出して、ゲストモードのフラグをクリアできます
 * 
 * 使用例:
 * - ChatTestUtils.clearGuestFlags() // すべてのキャラクターのゲストフラグをクリア
 * - ChatTestUtils.clearGuestFlags('sora') // ソラのゲストフラグのみクリア
 * - ChatTestUtils.clearAllGuestData() // ゲストフラグとsessionStorageの履歴もクリア
 * - ChatTestUtils.checkGuestFlags() // 現在のゲストフラグの状態を確認
 */
window.ChatTestUtils = {
    /**
     * ゲストモードで会話したフラグをクリア
     * @param {string|null} characterId - キャラクターID（指定しない場合はすべてクリア）
     */
    clearGuestFlags(characterId = null) {
        // 【変更】localStorageの使用を削除（データベースベースの判断）
        // ゲストフラグはデータベースで管理されるため、localStorageのクリアは不要
        console.log('[ChatTestUtils] ゲストフラグのクリアはデータベースベースの判断に移行したため、localStorageのクリアは不要です。');
    },
    
    /**
     * すべてのゲスト関連データをクリア（フラグ + sessionStorageの履歴）
     * @param {string|null} characterId - キャラクターID（指定しない場合はすべてクリア）
     */
    clearAllGuestData(characterId = null) {
        const characters = ['kaede', 'yukino', 'sora', 'kaon'];
        const targets = characterId ? [characterId] : characters;
        
        // 【変更】localStorageの使用を削除（データベースベースの判断）
        // ゲストフラグはデータベースで管理されるため、localStorageのクリアは不要
        
        // sessionStorageの履歴をクリア
        targets.forEach(c => {
            const historyKey = `guestConversationHistory_${c}`;
            const countKey = `guestMessageCount_${c}`;
            if (sessionStorage.getItem(historyKey)) {
                sessionStorage.removeItem(historyKey);
                console.log(`[ChatTestUtils] ✅ ${historyKey} をクリアしました`);
            }
            if (sessionStorage.getItem(countKey)) {
                sessionStorage.removeItem(countKey);
                console.log(`[ChatTestUtils] ✅ ${countKey} をクリアしました`);
            }
        });
        
        // AuthStateの履歴もクリア
        if (window.AuthState && typeof window.AuthState.resetGuestProgress === 'function') {
            targets.forEach(c => {
                window.AuthState.clearGuestHistory(c);
            });
            console.log('[ChatTestUtils] ✅ AuthStateのゲスト履歴をクリアしました');
        }
        
        console.log('[ChatTestUtils] すべてのゲストデータのクリアが完了しました。ページをリロードしてください。');
    },
    
    /**
     * 現在のゲストフラグの状態を確認
     */
    checkGuestFlags() {
        const characters = ['kaede', 'yukino', 'sora', 'kaon'];
        const status = {};
        
        // 【変更】localStorageの使用を削除（データベースベースの判断）
        characters.forEach(c => {
            status[c] = {
                flag: 'データベースで管理',
                history: sessionStorage.getItem(`guestConversationHistory_${c}`) ? 'あり' : 'なし',
                count: sessionStorage.getItem(`guestMessageCount_${c}`) || '0'
            };
        });
        
        console.table(status);
        return status;
    }
};

// グローバル関数として公開
window.sendMessage = (skipUserMessage, skipAnimation, messageOverride) => ChatInit.sendMessage(skipUserMessage, skipAnimation, messageOverride);
window.handleRitualConsent = (consent) => ChatInit.handleRitualConsent(consent);

// ===== テストモードチェック（最優先で実行） =====
// URLパラメータに?test=trueがある場合、すべてのキャラクターのゲストフラグをクリア
// これはハンドラーが読み込まれる前に実行される必要があるため、ここで処理する
(function() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('test') === 'true') {
        console.log('[ChatEngine] テストモードが有効です。すべてのゲストフラグをクリアします...');
        // 【変更】localStorageの使用を削除（データベースベースの判断）
        // ゲストフラグはデータベースで管理されるため、localStorageのクリアは不要
        const characters = ['kaede', 'yukino', 'sora', 'kaon'];
        console.log('[ChatEngine] テストモード: ゲストフラグはデータベースで管理されるため、localStorageのクリアは不要です。');
        console.log('[ChatEngine] テストモード: すべてのゲストフラグのクリアが完了しました');
    }
})();

// postMessage関連の初期化（DOMContentLoadedの外で即座に実行）
(async function initPostMessageCommunication() {
    'use strict';
    
    console.log('[iframe] postMessage通信を初期化しています...', {
        documentReadyState: document.readyState,
        hasParent: window.parent && window.parent !== window,
        origin: window.location.origin
    });
    
    // 親ウィンドウに準備完了を通知する関数
    function notifyParentReady() {
        if (window.parent && window.parent !== window) {
            try {
                // URLパラメータからcharacterを取得
                const urlParams = new URLSearchParams(window.location.search);
                const character = urlParams.get('character') || 'unknown';
                
                window.parent.postMessage({
                    type: 'CHAT_IFRAME_READY',
                    character: character,
                    messageCount: 0,
                    timestamp: Date.now(),
                    ready: true
                }, '*');
                
                console.log('[iframe] ✅ 親ウィンドウに準備完了を通知しました（初期通知）', {
                    character,
                    origin: window.location.origin
                });
                return true;
            } catch (error) {
                console.error('[iframe] ❌ 親ウィンドウへの通知エラー:', error);
                return false;
            }
        } else {
            // 通常のブラウジングの場合はログを出力しない
            return false;
        }
    }
    
    // 親ウィンドウが存在する場合のみ、通知を試行
    let hasNotified = false; // スコープを外に移動
    if (window.parent && window.parent !== window) {
        if (document.readyState === 'loading') {
            // まだ読み込み中の場合は、DOMContentLoaded時に通知
            document.addEventListener('DOMContentLoaded', () => {
                if (!hasNotified) {
                    hasNotified = notifyParentReady();
                }
            });
        } else {
            // 既に読み込み済みの場合は即座に通知
            hasNotified = notifyParentReady();
        }
        
        // window.load時にも通知
        if (document.readyState !== 'complete') {
            window.addEventListener('load', () => {
                if (!hasNotified) {
                    hasNotified = notifyParentReady();
                }
            });
        } else {
            if (!hasNotified) {
                hasNotified = notifyParentReady();
            }
        }
    }
    
    // REQUEST_CHAT_DATAハンドラーを即座に設定（DOMContentLoadedを待たない）
    window.addEventListener('message', (event) => {
        // セキュリティチェック
        if (event.origin !== window.location.origin) {
            return;
        }
        
        if (event.data && event.data.type === 'REQUEST_CHAT_DATA') {
            console.log('[iframe] 📨 REQUEST_CHAT_DATAを受信しました（初期ハンドラー）');
            
            // 簡単な応答を即座に返す
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const character = urlParams.get('character') || 'unknown';
                
                const responseData = {
                    type: 'CHAT_DATA_RESPONSE',
                    data: {
                        character: character,
                        messageCount: 0,
                        conversationHistory: [],
                        currentState: {
                            character: character,
                            messageCount: 0,
                            conversationHistoryLength: 0,
                            isRegistered: false
                        },
                        timestamp: Date.now()
                    }
                };
                
                if (event.source && event.source.postMessage) {
                    event.source.postMessage(responseData, event.origin);
                    console.log('[iframe] ✅ 初期ハンドラーでチャットデータを送信しました');
                } else if (window.parent && window.parent !== window) {
                    window.parent.postMessage(responseData, '*');
                    console.log('[iframe] ✅ 初期ハンドラーでwindow.parentに送信しました');
                }
            } catch (error) {
                console.error('[iframe] ❌ 初期ハンドラーでエラー:', error);
            }
        }
    });
    
    console.log('[iframe] postMessage通信の初期化完了', {
        hasParent: window.parent && window.parent !== window,
        documentReadyState: document.readyState
    });
})();

// DOMContentLoaded時に初期化
window.addEventListener('DOMContentLoaded', async () => {
    // アニメーションページからの復帰を検知
    const urlParams = new URLSearchParams(window.location.search);
    const isTransitionComplete = urlParams.get('transition') === 'complete';
    
    if (isTransitionComplete) {
        console.log('[初期化] アニメーションページから復帰しました - フェードイン開始');
        
        // フェードインオーバーレイを作成
        const fadeOverlay = document.createElement('div');
        fadeOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000;
            z-index: 9999;
            opacity: 1;
            transition: opacity 1.2s ease;
            pointer-events: none;
        `;
        document.body.appendChild(fadeOverlay);
        
        // 即座にフェードアウト開始
        setTimeout(() => {
            fadeOverlay.style.opacity = '0';
        }, 50);
        
        // フェードアウト完了後にオーバーレイを削除
        setTimeout(() => {
            if (fadeOverlay.parentNode) {
                fadeOverlay.parentNode.removeChild(fadeOverlay);
            }
        }, 1600);
        
        // URLパラメータをクリーン
        window.history.replaceState({}, '', window.location.pathname + '?character=yukino');
    }

    
    // URLから.htmlを除去
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const pathParts = currentPath.split('/').filter(part => part !== '');
    
    // 【重要】ページ読み込み完了後、イベントリスナーを確実に設定
    window.addEventListener('load', () => {
        console.log('[DOMContentLoaded] load イベント: イベントリスナーを設定します');
        if (ChatUI.messageInput && ChatUI.sendButton) {
            // 既存のリスナーを削除（重複登録を防ぐ）
            const newInput = ChatUI.messageInput.cloneNode(true);
            ChatUI.messageInput.parentNode.replaceChild(newInput, ChatUI.messageInput);
            ChatUI.messageInput = newInput;
            
            ChatUI.messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    window.sendMessage();
                }
            });
            
            ChatUI.messageInput.addEventListener('input', () => {
                ChatUI.updateSendButtonVisibility();
            });
            
            console.log('[DOMContentLoaded] load イベント: イベントリスナーの設定完了');
        }
    });
    
    if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart.includes('.html')) {
            const correctPath = '/' + pathParts.slice(0, -1).join('/') + currentSearch;
            history.replaceState(null, '', correctPath);
        }
    }
    
    document.body.classList.add('fade-in');
    
    // UIを初期化
    ChatUI.init();
    
    // ページを初期化
    // 入口フォームが表示されている場合は初期化をスキップ（ただし、initEntryForm()が処理中の場合を除く）
    const entryFormContainer = document.getElementById('entryFormContainer');
    const chatContainer = document.getElementById('chatContainer');
    const isEntryFormVisible = entryFormContainer && !entryFormContainer.classList.contains('entry-form-hidden');
    
    if (isEntryFormVisible) {
        console.log('[chat-engine] 入口フォームが表示されているため、初期化をスキップします');
        // 【変更】initEntryForm()がチャット画面を表示した後、初期化を再試行するため、
        // 入口フォームが非表示になったら初期化を実行するイベントリスナーを設定
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const isNowHidden = entryFormContainer.classList.contains('entry-form-hidden');
                    if (isNowHidden) {
                        console.log('[chat-engine] 入口フォームが非表示になったため、初期化を実行します');
                        observer.disconnect();
                        // 重複実行を防ぐ: 既に実行中または完了している場合はスキップ
                        if (!ChatInit._initPageRunning && !ChatInit._initPageCompleted) {
                            ChatInit.initPage().catch(error => {
                                console.error('[chat-engine] 初期化エラー:', error);
                            });
                        } else {
                            console.log('[chat-engine] initPageは既に実行中または完了しているため、スキップします');
                        }
                    }
                }
            });
        });
        observer.observe(entryFormContainer, { attributes: true });
        return;
    }
    
    // 重複実行を防ぐ: 既に実行中または完了している場合はスキップ
    if (!ChatInit._initPageRunning && !ChatInit._initPageCompleted) {
        await ChatInit.initPage();
    } else {
        console.log('[chat-engine] initPageは既に実行中または完了しているため、スキップします');
    }
    
    // アニメーション画面から戻ってきた時の処理
    setTimeout(() => {
        ChatInit.handleReturnFromAnimation();
    }, 100);
    
    // 親ウィンドウに準備完了を通知（分析パネル用）
    function notifyParentReady() {
        if (window.parent && window.parent !== window) {
            try {
                const character = ChatData?.currentCharacter || 'unknown';
                const isRegistered = window.AuthState?.isRegistered() || false;
                const messageCount = ChatData?.getUserMessageCount(character) || 0;
                
                window.parent.postMessage({
                    type: 'CHAT_IFRAME_READY',
                    character: character,
                    messageCount: messageCount,
                    timestamp: Date.now()
                }, '*');
                console.log('[iframe] ✅ 親ウィンドウに準備完了を通知しました', {
                    character,
                    messageCount,
                    origin: window.location.origin
                });
            } catch (error) {
                console.error('[iframe] ❌ 親ウィンドウへの通知エラー:', error);
            }
        }
        // 通常のブラウジングの場合はログを出力しない（不要な情報のため）
    }
    
    // 初期化完了後に準備完了を通知（複数のタイミングで確実に通知）
    let notifyAttempts = 0;
    const maxNotifyAttempts = 10;
    let notifyInterval = null;
    let hasNotified = false; // 既に通知済みかどうか
    let noParentLogged = false; // 親ウィンドウ不在のログを既に出力したか
    
    // 通知を送信する関数（重複を防ぐ）
    function tryNotifyParent() {
        if (hasNotified) {
            console.log('[iframe] 通知は既に送信済みです');
            return true; // 既に通知済みの場合は成功として扱う
        }
        
        // ChatDataとAuthStateが利用可能かチェック
        const hasChatData = typeof ChatData !== 'undefined' && ChatData !== null;
        const hasAuthState = typeof window.AuthState !== 'undefined' && window.AuthState !== null;
        
        console.log('[iframe] 通知を送信しようとしています...', {
            hasChatData: hasChatData,
            hasAuthState: hasAuthState,
            currentCharacter: ChatData?.currentCharacter || 'unknown',
            documentReadyState: document.readyState
        });
        
        // ChatDataとAuthStateがなくても、最小限の準備完了通知を送信
        // （親ウィンドウは準備完了を検知できれば、後でデータをリクエストできる）
        if (window.parent && window.parent !== window) {
            try {
                const character = ChatData?.currentCharacter || new URLSearchParams(window.location.search).get('character') || 'unknown';
                const isRegistered = (hasAuthState && window.AuthState?.isRegistered()) || false;
                const messageCount = (hasChatData && typeof ChatData?.getUserMessageCount === 'function') 
                    ? (ChatData.getUserMessageCount(character) || 0) 
                    : 0;
                
                window.parent.postMessage({
                    type: 'CHAT_IFRAME_READY',
                    character: character,
                    messageCount: messageCount,
                    timestamp: Date.now(),
                    ready: true
                }, '*');
                
                console.log('[iframe] ✅ 親ウィンドウに準備完了を通知しました（最小限の情報）', {
                    character,
                    messageCount,
                    hasChatData,
                    hasAuthState
                });
                
                hasNotified = true; // 成功したらマーク
                if (notifyInterval) {
                    clearInterval(notifyInterval);
                    notifyInterval = null;
                }
                return true;
            } catch (error) {
                console.error('[iframe] ❌ 準備完了通知の送信エラー:', error);
                return false;
            }
        } else {
            // 親ウィンドウが存在しない場合（通常のブラウジング）
            // ログは最初の1回だけ出力
            if (!noParentLogged) {
                console.log('[iframe] 親ウィンドウが存在しないため、準備完了通知をスキップしました（通常のブラウジング）');
                noParentLogged = true;
            }
            return false;
        }
    }
    
    // 親ウィンドウが存在する場合のみ、イベントリスナーを登録
    const hasParentWindow = window.parent && window.parent !== window;
    
    if (hasParentWindow) {
        // 1. DOMContentLoaded時に即座に1回通知
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                console.log('[iframe] DOMContentLoaded - 準備完了通知を送信（1秒後）');
                setTimeout(() => {
                    tryNotifyParent();
                }, 1000);
            });
        } else {
            // 既にDOMContentLoaded済みの場合は即座に実行
            console.log('[iframe] DOMContentLoaded済み - 準備完了通知を送信（1秒後）');
            setTimeout(() => {
                tryNotifyParent();
            }, 1000);
        }
        
        // 2. window.load時に1回通知（リソース読み込み完了後）
        if (document.readyState !== 'complete') {
            window.addEventListener('load', () => {
                console.log('[iframe] window.load - 準備完了通知を送信（1秒後）');
                setTimeout(() => {
                    tryNotifyParent();
                }, 1000);
            });
        } else {
            // 既にload済みの場合も試行
            console.log('[iframe] window.load済み - 準備完了通知を送信（1秒後）');
            setTimeout(() => {
                tryNotifyParent();
            }, 1000);
        }
    } else {
        console.log('[iframe] 親ウィンドウが存在しないため、イベントリスナーの登録をスキップします（通常のブラウジング）');
    }
    
    // 3. 念のため定期通知（最大10回、2秒ごと）
    // ただし、親ウィンドウが存在する場合のみ実行
    if (window.parent && window.parent !== window) {
        notifyInterval = setInterval(() => {
            notifyAttempts++;
            console.log(`[iframe] 定期通知 - 試行${notifyAttempts}/${maxNotifyAttempts}`);
            if (tryNotifyParent()) {
                // 通知成功したら停止
                console.log('[iframe] 定期通知を終了（通知成功）');
                return;
            }
            
            if (notifyAttempts >= maxNotifyAttempts) {
                clearInterval(notifyInterval);
                console.warn('[iframe] 準備完了通知の最大試行回数に達しました', {
                    attempts: notifyAttempts,
                    hasChatData: !!ChatData,
                    hasAuthState: !!window.AuthState
                });
            }
        }, 2000); // 2秒ごとに試行
    } else {
        console.log('[iframe] 親ウィンドウが存在しないため、定期通知をスキップします');
    }
    
    // デバッグ用: notifyParentReadyをグローバルに公開
    window.notifyParentReady = notifyParentReady;
    
    console.log('[iframe] postMessage通信が初期化されました', {
        hasChatData: typeof ChatData !== 'undefined',
        hasAuthState: typeof window.AuthState !== 'undefined',
        hasParent: window.parent && window.parent !== window,
        documentReadyState: document.readyState
    });
    
    // 即座に1回通知を試行（ChatData/AuthStateの初期化を待たない）
    console.log('[iframe] 即座に準備完了通知を試行（0.5秒後）...');
    setTimeout(() => {
        tryNotifyParent();
    }, 500);
    
    // 管理者用コマンドハンドラー（postMessage）
    window.addEventListener('message', async (event) => {
        // デバッグ: すべてのメッセージをログに記録
        console.log('[iframe] メッセージ受信:', {
            type: event.data?.type,
            origin: event.origin,
            expectedOrigin: window.location.origin,
            isParent: window.parent && window.parent !== window
        });
        
        // セキュリティのため、同じオリジンのみ受け入れる
        if (event.origin !== window.location.origin) {
            console.warn('[iframe] オリジン不一致:', {
                received: event.origin,
                expected: window.location.origin
            });
            return;
        }
        
        const { type, character, token, nickname, assignedDeity } = event.data || {};
        
        switch (type) {
            case 'ADMIN_RESET_CONVERSATION':
                // 会話をリセット
                if (character && ChatData) {
                    ChatData.setGuestHistory(character, []);
                    ChatData.setUserMessageCount(character, 0);
                }
                if (window.AuthState) {
                    window.AuthState.resetGuestProgress({ keepHistory: false });
                }
                // sessionStorageもクリア
                const keys = Object.keys(sessionStorage);
                keys.forEach(key => {
                    if (key.startsWith('guest') || key.includes('guest') || key.startsWith('auth.guest')) {
                        sessionStorage.removeItem(key);
                    }
                });
                location.reload();
                break;
                
            case 'ADMIN_RESET_PHASE':
                // フェーズをリセット（メッセージカウントを0に）
                if (character && ChatData) {
                    ChatData.setUserMessageCount(character, 0);
                }
                if (window.AuthState) {
                    window.AuthState.setGuestMessageCount(0);
                }
                sessionStorage.setItem(`guestMessageCount_${character}`, '0');
                sessionStorage.setItem('auth.guestMessageCount', '0');
                break;
                
            case 'ADMIN_TRIGGER_RITUAL':
                // 守護神の儀式を発動
                if (character && ChatInit && window.AuthState && window.AuthState.isRegistered()) {
                    await ChatInit.startGuardianRitual(character);
                }
                break;
                
            case 'ADMIN_SIMULATE_REGISTRATION':
                // 【変更】テスト用ユーザー登録をシミュレート（localStorageの使用を削除）
                // データベースベースの判断に移行したため、localStorageへの保存は不要
                if (window.AuthState) {
                    window.AuthState.setAuth(null, nickname, assignedDeity);
                    // localStorageへの保存を削除
                    location.reload();
                }
                break;
                
            case 'ADMIN_LOGOUT':
                // ログアウト
                if (window.AuthState) {
                    window.AuthState.clearAuth();
                    window.AuthState.resetGuestProgress({ keepHistory: false });
                }
                // 【変更】localStorageからの削除を削除（データベースベースの判断）
                sessionStorage.clear();
                location.reload();
                break;
                
            case 'REQUEST_CHAT_DATA':
                // 分析パネルからのデータリクエスト
                console.log('[iframe] 📨 メッセージ受信: REQUEST_CHAT_DATA');
                console.log('[iframe] 📨 REQUEST_CHAT_DATAを受信しました');
                try {
                    // ChatData, AuthState の存在確認
                    if (typeof ChatData === 'undefined') {
                        console.error('[iframe] ChatDataが未定義です');
                        throw new Error('ChatDataが初期化されていません');
                    }
                    
                    if (typeof window.AuthState === 'undefined') {
                        console.error('[iframe] AuthStateが未定義です');
                        throw new Error('AuthStateが初期化されていません');
                    }
                    
                    const character = ChatData?.currentCharacter || 'unknown';
                    const isRegistered = window.AuthState?.isRegistered() || false;
                    
                    console.log('[iframe] データ取得開始:', {
                        character,
                        isRegistered,
                        hasChatData: !!ChatData,
                        hasAuthState: !!window.AuthState
                    });
                    
                    // メッセージカウントを取得
                    let messageCount = 0;
                    let conversationHistory = [];
                    
                    if (isRegistered) {
                        // 登録ユーザーの場合
                        const historyData = ChatData?.conversationHistory;
                        if (historyData && historyData.recentMessages) {
                            conversationHistory = Array.isArray(historyData.recentMessages) ? historyData.recentMessages : [];
                            messageCount = conversationHistory.filter(msg => msg && msg.role === 'user').length;
                        }
                    } else {
                        // ゲストユーザーの場合
                        if (typeof ChatData?.getUserMessageCount === 'function') {
                            messageCount = ChatData.getUserMessageCount(character) || 0;
                            console.log('[iframe] ゲストメッセージ数を取得:', {
                                character,
                                messageCount,
                                method: 'getGuestMessageCount'
                            });
                        } else {
                            console.warn('[iframe] ChatData.getUserMessageCountが関数ではありません');
                        }
                        
                        if (typeof ChatData?.getConversationHistory === 'function') {
                            conversationHistory = ChatData.getConversationHistory(character) || [];
                            console.log('[iframe] ゲスト会話履歴を取得:', {
                                character,
                                historyLength: conversationHistory.length,
                                userMessages: conversationHistory.filter(msg => msg && msg.role === 'user').length
                            });
                        } else {
                            console.warn('[iframe] ChatData.getConversationHistoryが関数ではありません');
                        }
                        
                        // 会話履歴からもメッセージ数を計算（フォールバック）
                        // messageCountが0でも、会話履歴があれば正しい値を計算
                        if (conversationHistory && conversationHistory.length > 0) {
                            const historyUserMessages = conversationHistory.filter(msg => msg && msg.role === 'user').length;
                            console.log('[iframe] 会話履歴からメッセージ数を計算:', {
                                historyLength: conversationHistory.length,
                                userMessages: historyUserMessages,
                                currentMessageCount: messageCount
                            });
                            
                            // messageCountが0または、履歴から計算した値の方が大きい場合は更新
                            if (messageCount === 0 || historyUserMessages > messageCount) {
                                console.log('[iframe] ⚠️ メッセージ数を修正:', {
                                    oldCount: messageCount,
                                    newCount: historyUserMessages,
                                    reason: messageCount === 0 ? 'messageCountが0のため' : '履歴の方が大きいため'
                                });
                                messageCount = historyUserMessages;
                                
                                // 修正した値をsessionStorageに保存（次回から正しい値が取得できるように）
                                if (typeof ChatData?.setGuestMessageCount === 'function') {
                                    ChatData.setUserMessageCount(character, historyUserMessages);
                                    console.log('[iframe] ✅ 修正したメッセージ数をsessionStorageに保存しました');
                                }
                            }
                        } else if (messageCount === 0) {
                            console.warn('[iframe] ⚠️ メッセージ数が0で、会話履歴も空です');
                        }
                    }
                    
                    // 現在の状態を取得
                    const currentState = {
                        character: character,
                        messageCount: messageCount,
                        conversationHistoryLength: conversationHistory.length,
                        isRegistered: isRegistered
                    };
                    
                    const responseData = {
                        type: 'CHAT_DATA_RESPONSE',
                        data: {
                            character: character,
                            messageCount: messageCount,
                            conversationHistory: conversationHistory,
                            currentState: currentState,
                            timestamp: Date.now()
                        }
                    };
                    
                    console.log('[iframe] 📤 チャットデータを送信します:', {
                        character,
                        messageCount,
                        historyLength: conversationHistory.length,
                        targetOrigin: event.origin,
                        hasEventSource: !!event.source
                    });
                    
                    // 親ウィンドウにデータを送信
                    if (event.source && event.source.postMessage) {
                        event.source.postMessage(responseData, event.origin);
                        console.log('[iframe] ✅ チャットデータを親ウィンドウに送信しました', currentState);
                    } else {
                        console.error('[iframe] ❌ event.sourceが無効です:', event.source);
                        // フォールバック: window.parentに送信
                        if (window.parent && window.parent !== window) {
                            window.parent.postMessage(responseData, '*');
                            console.log('[iframe] ✅ フォールバック: window.parentに送信しました');
                        }
                    }
                } catch (error) {
                    console.error('[iframe] ❌ チャットデータ取得エラー:', error);
                    const errorResponse = {
                        type: 'CHAT_DATA_ERROR',
                        error: error.message
                    };
                    
                    if (event.source && event.source.postMessage) {
                        event.source.postMessage(errorResponse, event.origin);
                    } else if (window.parent && window.parent !== window) {
                        window.parent.postMessage(errorResponse, '*');
                    }
                }
                break;
        }
    });
});

// ========================================
// 雪乃の登録ボタン表示関数
// ========================================
function showYukinoRegistrationButtons() {
    console.log('[雪乃登録ボタン] ボタン表示関数が呼ばれました');
    
    // 既存のコンテナがあれば削除
    const existingContainer = document.getElementById('yukinoRegistrationContainer');
    if (existingContainer) {
        console.log('[雪乃登録ボタン] 既存のボタンを削除します');
        existingContainer.remove();
    }
    
    const character = 'yukino';
    const info = ChatData.characterInfo[character];
    
    // 会話履歴はデータベースで管理されるため、sessionStorageへの保存は不要
    
    // コンテナを作成（メッセージコンテナ内に表示）
    const container = document.createElement('div');
    container.id = 'yukinoRegistrationContainer';
    container.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
        padding: 25px 30px;
        margin: 20px 10px 30px 10px;
        background: rgba(255, 255, 255, 0.98);
        border-radius: 16px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        border: 2px solid rgba(102, 126, 234, 0.2);
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.5s ease, transform 0.5s ease;
        visibility: visible !important;
    `;
    
    // 説明テキスト
    const explanation = document.createElement('p');
    explanation.textContent = 'ここから先はユーザー登録が必要となります。';
    explanation.style.cssText = 'margin: 0 0 10px 0; font-size: 16px; color: #333; text-align: center; line-height: 1.6; font-weight: 500;';
    container.appendChild(explanation);
    
    // 詳細説明（安心情報）
    const detailInfo = document.createElement('div');
    detailInfo.style.cssText = `
        margin: 0 0 15px 0;
        padding: 12px 16px;
        background: rgba(102, 126, 234, 0.05);
        border-radius: 8px;
        border-left: 3px solid rgba(102, 126, 234, 0.4);
    `;
    
    const detailText1 = document.createElement('p');
    detailText1.textContent = 'ニックネームと生年月日を登録するだけの作業、それ以外の個人情報の入力はありませんので安心してください。';
    detailText1.style.cssText = 'margin: 0 0 8px 0; font-size: 13px; color: #555; text-align: left; line-height: 1.7;';
    detailInfo.appendChild(detailText1);
    
    const detailText2 = document.createElement('p');
    detailText2.textContent = 'ユーザー登録で料金の請求の発生はありません。';
    detailText2.style.cssText = 'margin: 0; font-size: 13px; color: #555; text-align: left; line-height: 1.7; font-weight: 600;';
    detailInfo.appendChild(detailText2);
    
    container.appendChild(detailInfo);
    
    // 質問テキスト
    const question = document.createElement('p');
    question.textContent = 'ユーザー登録をしますか？';
    question.style.cssText = 'margin: 0 0 15px 0; font-size: 17px; font-weight: 600; color: #222; text-align: center;';
    container.appendChild(question);
    
    // ボタンコンテナ
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;';
    
    // 元のイベントを保存する配列
    const originalEvents = [];
    
    // 元の状態を復元する関数
    const restoreOriginalState = () => {
        // メッセージ入力欄を元に戻す
        if (ChatUI.messageInput) {
            ChatUI.messageInput.disabled = false;
            ChatUI.messageInput.placeholder = 'メッセージを入力...';
            console.log('[雪乃登録ボタン] メッセージ入力欄を有効化しました');
        }
        
        // タロットボタンを元に戻す
        originalEvents.forEach(({ button, originalOnClick }) => {
            button.onclick = originalOnClick;
            console.log('[雪乃登録ボタン] タロットカードボタンのイベントを復元しました:', button.textContent);
        });
    };
    
    // 「はい」ボタン
    const yesButton = document.createElement('button');
    yesButton.textContent = 'はい';
    yesButton.style.cssText = 'padding: 14px 40px; font-size: 16px; font-weight: 600; color: white; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 10px; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);';
    yesButton.onclick = () => {
        console.log('[雪乃登録ボタン] 「はい」がクリックされました');
        
        // タロットボタンと入力欄を元に戻す
        restoreOriginalState();
        
        container.remove();
        // 登録画面へ遷移
        setTimeout(() => {
            window.location.href = '../auth/register.html?redirect=' + encodeURIComponent(window.location.href);
        }, 300);
    };
    
    // ホバーエフェクト
    yesButton.onmouseenter = () => {
        yesButton.style.transform = 'translateY(-2px)';
        yesButton.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
    };
    yesButton.onmouseleave = () => {
        yesButton.style.transform = 'translateY(0)';
        yesButton.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
    };
    
    // 「いいえ」ボタン
    const noButton = document.createElement('button');
    noButton.textContent = 'いいえ';
    noButton.style.cssText = 'padding: 14px 40px; font-size: 16px; font-weight: 600; color: #666; background: #f5f5f5; border: 2px solid #ddd; border-radius: 10px; cursor: pointer; transition: all 0.3s ease;';
    noButton.onclick = () => {
        console.log('[雪乃登録ボタン] 「いいえ」がクリックされました');
        
        // タロットボタンと入力欄を元に戻す
        restoreOriginalState();
        
        // 笹岡のお別れメッセージを表示
        const farewellMessage = 'わかりました。それではまた何かあったら連絡ください。これまでの会話の中身は私は忘れてしまうと思うので、今度来た時にはゼロから話をしてくださいね。お待ちしています。';
        ChatUI.addMessage('character', farewellMessage, info.name);
        
        // 【変更】ゲストモードで会話したことを記録しない（データベースベースの判断）
        // localStorageへの保存を削除
        
        // ボタンを削除
        container.remove();
        
        // カウントをクリア
        ChatData.setUserMessageCount(character, 0);
        
        // 雪乃のタロット関連フラグをクリア
        sessionStorage.removeItem('yukinoThreeCardsPrepared');
        sessionStorage.removeItem('yukinoAllThreeCards');
        sessionStorage.removeItem('yukinoRemainingCards');
        sessionStorage.removeItem('yukinoTarotCardForExplanation');
        sessionStorage.removeItem('yukinoSummaryShown');
        sessionStorage.removeItem('yukinoFirstMessageInSession');
        sessionStorage.removeItem('yukinoConsultationStarted');
        sessionStorage.removeItem('yukinoConsultationMessageCount');
        sessionStorage.removeItem('yukinoRegistrationButtonShown');
        
        // 3秒後にmain.htmlへリダイレクト
        setTimeout(() => {
            window.location.href = '../main.html';
        }, 3000);
    };
    
    // ホバーエフェクト
    noButton.onmouseenter = () => {
        noButton.style.background = '#e8e8e8';
        noButton.style.borderColor = '#ccc';
    };
    noButton.onmouseleave = () => {
        noButton.style.background = '#f5f5f5';
        noButton.style.borderColor = '#ddd';
    };
    
    buttonContainer.appendChild(yesButton);
    buttonContainer.appendChild(noButton);
    container.appendChild(buttonContainer);
    
    // メッセージコンテナに追加
    if (ChatUI && ChatUI.messagesDiv) {
        ChatUI.messagesDiv.appendChild(container);
        console.log('[雪乃登録ボタン] メッセージコンテナに追加しました');
        
        // フェードインアニメーション
        setTimeout(() => {
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
            console.log('[雪乃登録ボタン] フェードイン完了');
        }, 100);
        
        // スクロールして表示
        setTimeout(() => {
            if (ChatUI.scrollToLatest) {
                ChatUI.scrollToLatest();
                console.log('[雪乃登録ボタン] スクロール完了');
            }
        }, 200);
        
        // メッセージ入力欄を無効化し、ガイダンスを表示
        if (ChatUI.messageInput) {
            ChatUI.messageInput.disabled = true;
            ChatUI.messageInput.placeholder = 'ユーザー登録後にメッセージの送信ができますのでお待ちください';
            console.log('[雪乃登録ボタン] メッセージ入力欄を無効化しました');
        }
        
        // タロットカードボタンが存在する場合、クリックイベントをオーバーライド
        const tarotButtons = document.querySelectorAll('button');
        tarotButtons.forEach(button => {
            if (button.textContent.includes('タロットカードを引く') || 
                button.textContent.includes('カードをめくる') ||
                button.textContent.includes('拡大する') ||
                button.textContent.includes('雪乃の解説')) {
                // 元のクリックイベントを保存
                const originalOnClick = button.onclick;
                originalEvents.push({ button, originalOnClick });
                
                // 新しいクリックイベントを設定
                button.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // ガイダンスメッセージを表示
                    ChatUI.addMessage(
                        'error',
                        'ユーザー登録案内中のため、タロットカードの表示はできません。ユーザー登録後に再度雪乃さんにタロットカードの鑑定を頼んでください。',
                        'システム'
                    );
                    
                    console.log('[雪乃登録ボタン] タロットカードボタンがクリックされましたが、登録案内中のため無効化しました');
                    
                    // スクロールして表示
                    setTimeout(() => {
                        if (ChatUI.scrollToLatest) {
                            ChatUI.scrollToLatest();
                        }
                    }, 100);
                };
                
                console.log('[雪乃登録ボタン] タロットカードボタンのクリックイベントをオーバーライドしました:', button.textContent);
            }
        });
        
    } else {
        console.error('[雪乃登録ボタン] ⚠️ ChatUI.messagesDiv が見つかりません');
    }
}