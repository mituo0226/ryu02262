/**
 * chat-loading-animation.js
 * ローディング画面の管理と制御
 * 
 * 【機能】
 * - APIリクエスト時にローディング画面表示
 * - キャラクター別のメッセージ表示
 * - 動画ループとキャラクター画像のオーバーレイ
 * - APIレスポンス受信時にローディング画面非表示
 * 
 * 【依存関係】
 * - chat-transitions.css: フェード演出のスタイル
 * - chat.html: ローディング画面のHTML要素
 */

/**
 * ChatLoadingAnimation
 * ローディング画面全体を管理するオブジェクト
 */
const ChatLoadingAnimation = {
    // ローディング画面の要素
    loadingScreen: null,
    loadingVideo: null,
    loadingMessages: null,
    loadingCharacterName: null,
    
    // キャラクター設定
    characterConfig: {
        kaede: {
            name: '楓',
            icon: '../../photo/kaede.png',
            messages: [
                '{nickname}さんの心を読み込んでいます',
                '守護神を呼び出しています',
                'もうすぐメッセージが届きます'
            ]
        },
        kaon: {
            name: '三崎花音',
            icon: '../../photo/kaon.png',
            messages: [
                '{nickname}さんとの交信を準備しています',
                'メッセージが届きます、お待ちください',
                'もうすぐメッセージが届きます'
            ]
        },
        yukino: {
            name: '笹岡雪乃',
            icon: '../../photo/yukino.png',
            messages: [
                '{nickname}さんとの交信を準備しています',
                'メッセージが届きます、お待ちください',
                'もうすぐメッセージが届きます'
            ]
        },
        sora: {
            name: '水野ソラ',
            icon: '../../photo/sora.png',
            messages: [
                '{nickname}さんとの交信を準備しています',
                'メッセージが届きます、お待ちください',
                'もうすぐメッセージが届きます'
            ]
        }
    },
    
    // 現在の状態
    currentCharacter: null,
    currentNickname: null,
    currentMessageIndex: 0,
    messageUpdateInterval: null,
    isVisible: false,
    
    /**
     * 初期化処理
     * DOMContentLoadedまたはスクリプト読み込み後に呼び出す
     */
    init: function() {
        // DOM要素の取得
        this.loadingScreen = document.getElementById('loadingScreen');
        this.loadingVideo = document.getElementById('loadingVideo');
        this.loadingMessages = document.getElementById('loadingMessages');
        this.loadingCharacterName = document.getElementById('loadingCharacterName');
        
        if (!this.loadingScreen) {
            console.warn('[ChatLoadingAnimation] ローディング画面要素が見つかりません');
            return;
        }
        
        console.log('[ChatLoadingAnimation] 初期化完了');
    },
    
    /**
     * ローディング画面を表示
     * @param {string} character - キャラクターID（kaede/kaon/yukino/sora）
     * @param {string} nickname - ユーザーのニックネーム
     */
    show: function(character, nickname) {
        if (!this.loadingScreen) {
            console.warn('[ChatLoadingAnimation] ローディング画面が初期化されていません');
            return;
        }
        
        if (this.isVisible) {
            console.log('[ChatLoadingAnimation] ローディング画面は既に表示中です');
            return;
        }
        
        // 状態を保存
        this.currentCharacter = character;
        this.currentNickname = nickname;
        this.currentMessageIndex = 0;
        this.isVisible = true;
        
        console.log('[ChatLoadingAnimation] ローディング画面表示:', { character, nickname });
        
        // キャラクター設定を取得
        const config = this.characterConfig[character];
        if (!config) {
            console.warn('[ChatLoadingAnimation] 不明なキャラクター:', character);
            return;
        }
        
        // キャラクター名を設定
        if (this.loadingCharacterName) {
            this.loadingCharacterName.textContent = config.name;
            // アニメーションリセット
            this.loadingCharacterName.style.animation = 'none';
            setTimeout(() => {
                this.loadingCharacterName.style.animation = 'fadeInDown 0.6s ease-out forwards';
            }, 10);
        }
        
        // 背景画像をオーバーレイ（キャラクター画像を半透明で重ね合わせ）
        this._applyCharacterOverlay(character, config.icon);
        
        // 最初のメッセージを表示
        this._displayMessage(0, config.messages);
        
        // メッセージを順番に更新（3秒ごと）
        this._startMessageUpdater(config.messages);
        
        // ローディング画面をフェードイン
        this.loadingScreen.classList.remove('fade-out');
        this.loadingScreen.classList.add('fade-element');
    },
    
    /**
     * キャラクター画像をオーバーレイとして追加
     * @private
     */
    _applyCharacterOverlay: function(character, iconPath) {
        if (!this.loadingScreen) return;
        
        // 既存のオーバーレイを削除
        const existingOverlay = this.loadingScreen.querySelector('.loading-character-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        // 新しいオーバーレイを作成
        const overlay = document.createElement('div');
        overlay.className = 'loading-character-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url('${iconPath}');
            background-size: cover;
            background-position: center;
            opacity: 0.15;
            z-index: 5;
            pointer-events: none;
            mix-blend-mode: overlay;
        `;
        
        const videoContainer = this.loadingScreen.querySelector('.loading-video-container');
        if (videoContainer) {
            videoContainer.appendChild(overlay);
            console.log('[ChatLoadingAnimation] キャラクター画像オーバーレイを追加:', character);
        }
    },
    
    /**
     * メッセージを表示
     * @private
     */
    _displayMessage: function(index, messages) {
        if (!this.loadingMessages || !messages || index >= messages.length) {
            return;
        }
        
        const message = messages[index];
        const processedMessage = this._processMessage(message);
        
        // メッセージHTMLを生成
        const messageHtml = `
            <div class="loading-message message-fade" style="animation-delay: ${index * 0.5}s;">
                <span>${processedMessage}</span>
            </div>
        `;
        
        // 既存のメッセージをクリア（最初のメッセージのみ）
        if (index === 0) {
            this.loadingMessages.innerHTML = '';
        }
        
        // 新しいメッセージを追加
        this.loadingMessages.insertAdjacentHTML('beforeend', messageHtml);
        
        console.log('[ChatLoadingAnimation] メッセージ表示（${index + 1}/${messages.length}）:', processedMessage);
    },
    
    /**
     * メッセージテンプレートを処理（ニックネーム等を置換）
     * @private
     */
    _processMessage: function(message) {
        let processed = message;
        
        // キャラクター名を置換
        if (this.currentCharacter) {
            const config = this.characterConfig[this.currentCharacter];
            if (config) {
                processed = processed.replace('{character}', config.name);
            }
        }
        
        // ニックネームを置換
        if (this.currentNickname) {
            processed = processed.replace('{nickname}', this.currentNickname);
        }
        
        return processed;
    },
    
    /**
     * メッセージを順番に更新
     * @private
     */
    _startMessageUpdater: function(messages) {
        // 既存のインターバルをクリア
        if (this.messageUpdateInterval) {
            clearInterval(this.messageUpdateInterval);
        }
        
        this.currentMessageIndex = 0;
        
        // 最初のメッセージを表示
        this._displayMessage(0, messages);
        
        // 3秒ごとに次のメッセージを表示
        this.messageUpdateInterval = setInterval(() => {
            this.currentMessageIndex++;
            
            if (this.currentMessageIndex < messages.length) {
                this._displayMessage(this.currentMessageIndex, messages);
            } else {
                // すべてのメッセージを表示したらインターバルをクリア
                clearInterval(this.messageUpdateInterval);
                this.messageUpdateInterval = null;
                console.log('[ChatLoadingAnimation] すべてのメッセージ表示完了');
            }
        }, 3000); // 3秒ごと
    },
    
    /**
     * ローディング画面を非表示（フェードアウト）
     */
    hide: function() {
        if (!this.loadingScreen) {
            console.warn('[ChatLoadingAnimation] ローディング画面が初期化されていません');
            return;
        }
        
        if (!this.isVisible) {
            console.log('[ChatLoadingAnimation] ローディング画面は既に非表示です');
            return;
        }
        
        console.log('[ChatLoadingAnimation] ローディング画面をフェードアウト');
        
        // メッセージアップデーターをクリア
        if (this.messageUpdateInterval) {
            clearInterval(this.messageUpdateInterval);
            this.messageUpdateInterval = null;
        }
        
        // フェードアウト
        this.loadingScreen.classList.add('fade-out');
        this.isVisible = false;
        
        // フェードアウト完了後、要素を非表示にする
        setTimeout(() => {
            if (this.loadingScreen) {
                this.loadingScreen.style.display = 'none';
            }
        }, 500);
    },
    
    /**
     * ローディング画面をリセット
     */
    reset: function() {
        if (this.messageUpdateInterval) {
            clearInterval(this.messageUpdateInterval);
            this.messageUpdateInterval = null;
        }
        
        this.currentCharacter = null;
        this.currentNickname = null;
        this.currentMessageIndex = 0;
        this.isVisible = false;
        
        if (this.loadingMessages) {
            this.loadingMessages.innerHTML = '';
        }
        
        console.log('[ChatLoadingAnimation] リセット完了');
    },
    
    /**
     * 動画のループ再生を確認
     */
    ensureVideoLoops: function() {
        if (!this.loadingVideo) return;
        
        this.loadingVideo.loop = true;
        this.loadingVideo.autoplay = true;
        this.loadingVideo.muted = true;
        
        // 動画再生の失敗をキャッチ
        this.loadingVideo.addEventListener('error', (event) => {
            console.error('[ChatLoadingAnimation] 動画読み込みエラー:', event);
        });
        
        console.log('[ChatLoadingAnimation] 動画ループ設定完了');
    }
};

/**
 * ページ読み込み時の初期化
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        ChatLoadingAnimation.init();
        ChatLoadingAnimation.ensureVideoLoops();
    });
} else {
    ChatLoadingAnimation.init();
    ChatLoadingAnimation.ensureVideoLoops();
}

/**
 * グローバルスコープに公開（他のスクリプトから利用可能にする）
 */
window.ChatLoadingAnimation = ChatLoadingAnimation;
