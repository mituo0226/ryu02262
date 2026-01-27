/**
 * page-loading-manager.js
 * ページ初期化時の段階的ローディング管理
 * user-statusエリアを活用して、フェーズを表示
 */

const PageLoadingManager = {
    /**
     * ローディングフェーズの定義
     */
    phases: {
        PHASE_1: { id: 1, text: 'ユーザー情報を読み込んでいます...', delay: 0 },
        PHASE_2: { id: 2, text: '守護神とつながっています...', delay: 3000 },
        PHASE_3: { id: 3, text: '鑑定を準備しています...', delay: 8000 }
    },

    /**
     * 現在のフェーズ
     */
    currentPhase: 0,

    /**
     * タイマー参照
     */
    phaseTimers: [],

    /**
     * ページローディングを開始
     * @param {string} characterName - キャラクター名（オプション）
     */
    start(characterName = null) {
        const userStatusDiv = document.getElementById('userStatus');
        if (!userStatusDiv) {
            console.warn('[PageLoadingManager] userStatus要素が見つかりません');
            return;
        }

        // 既存のタイマーをクリア
        this.phaseTimers.forEach(timerId => clearTimeout(timerId));
        this.phaseTimers = [];
        this.currentPhase = 0;

        // フェーズ1を即座に表示
        this._setPhase(1, userStatusDiv);

        // フェーズ2を3秒後に表示
        const timer2 = setTimeout(() => {
            this._setPhase(2, userStatusDiv, characterName);
        }, this.phases.PHASE_2.delay);
        this.phaseTimers.push(timer2);

        // フェーズ3を8秒後に表示
        const timer3 = setTimeout(() => {
            this._setPhase(3, userStatusDiv);
        }, this.phases.PHASE_3.delay);
        this.phaseTimers.push(timer3);

        console.log('[PageLoadingManager] ページローディングを開始しました');
    },

    /**
     * フェーズを設定
     * @private
     */
    _setPhase(phaseId, element, characterName = null) {
        this.currentPhase = phaseId;
        let text = '';

        switch (phaseId) {
            case 1:
                text = this.phases.PHASE_1.text;
                break;
            case 2:
                text = this.phases.PHASE_2.text;
                if (characterName) {
                    text += ` 【${characterName}】`;
                }
                break;
            case 3:
                text = this.phases.PHASE_3.text;
                break;
            default:
                text = 'ローディング中...';
        }

        // クラスを更新（アニメーション用）
        element.className = `user-status loading-phase-${phaseId}`;
        element.textContent = text;

        console.log(`[PageLoadingManager] フェーズ${phaseId}に移行: ${text}`);
    },

    /**
     * ローディングを完了
     */
    complete() {
        // すべてのタイマーをクリア
        this.phaseTimers.forEach(timerId => clearTimeout(timerId));
        this.phaseTimers = [];
        this.currentPhase = 0;

        const userStatusDiv = document.getElementById('userStatus');
        if (userStatusDiv) {
            // ローディング完了クラスを追加（フェードアウト）
            userStatusDiv.classList.add('loading-complete');
            console.log('[PageLoadingManager] ローディング完了');
        }
    },

    /**
     * ローディングをキャンセル
     */
    cancel() {
        this.phaseTimers.forEach(timerId => clearTimeout(timerId));
        this.phaseTimers = [];
        this.currentPhase = 0;

        const userStatusDiv = document.getElementById('userStatus');
        if (userStatusDiv) {
            userStatusDiv.className = 'user-status';
            console.log('[PageLoadingManager] ローディングをキャンセルしました');
        }
    }
};

// グローバル変数として公開
window.PageLoadingManager = PageLoadingManager;
