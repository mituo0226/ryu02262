/**
 * handler.js
 * 三崎花音（kaon）専用のチャットロジック
 * 三崎花音固有の処理を管理
 * BaseCharacterHandlerを継承
 */

class KaonHandler extends BaseCharacterHandler {
    constructor() {
        super('kaon', '三崎花音');
    }

    /**
     * 初期化
     */
    init() {
        super.init();
    }

    // 【削除】handleGuestLimit関数は削除されました（10通制限が廃止されたため）

    /**
     * メッセージ送信前の処理
     * @param {string} message - 送信するメッセージ
     * @returns {Object} { proceed: boolean, modifiedMessage?: string }
     */
    beforeMessageSent(message) {
        console.log('[三崎花音ハンドラー] メッセージ送信前処理:', message);
        
        // 特に変更なし、そのまま送信
        return super.beforeMessageSent(message);
    }

    /**
     * API レスポンス受信後の処理
     * @param {Object} response - API レスポンス
     * @param {string} character - キャラクターID
     * @returns {boolean} 処理が完了したか（true: ハンドラーで処理済み、false: 共通処理を続行）
     */
    async handleResponse(response, character) {
        if (character !== this.characterId) {
            return false; // 三崎花音以外は処理しない
        }

        console.log('[三崎花音ハンドラー] レスポンス処理:', response);

        // 現在は特殊な処理なし、共通処理を続行
        return super.handleResponse(response, character);
    }

    /**
     * 登録完了後の処理
     * @param {Object} historyData - 会話履歴データ
     * @returns {boolean} 処理が完了したか
     */
    async handlePostRegistration(historyData) {
        console.log('[三崎花音ハンドラー] 登録完了後の処理');

        // 【重要】送信ボタンの表示状態を更新
        // 登録後にページがリロードされた際、イベントリスナーは設定されているが
        // updateSendButtonVisibility()が呼ばれていない場合があるため、明示的に呼び出す
        setTimeout(() => {
            if (window.ChatUI && typeof window.ChatUI.updateSendButtonVisibility === 'function') {
                window.ChatUI.updateSendButtonVisibility();
                console.log('[三崎花音ハンドラー] 送信ボタンの表示状態を更新しました');
            }
        }, 100);

        // 親クラスの処理を呼び出し
        return super.handlePostRegistration(historyData);
    }

    /**
     * 同意メッセージを取得
     * @returns {string} 同意メッセージ
     */
    getConsentMessage() {
        return 'ユーザー登録への同意が検出されました。ボタンが表示されます。';
    }

    /**
     * 拒否メッセージを取得
     * @returns {string} 拒否メッセージ
     */
    getDeclineMessage() {
        return 'ユーザー登録をスキップしました。引き続きゲストモードでお話しできます。';
    }
}

// グローバルスコープに公開（インスタンスを作成）
window.KaonHandler = new KaonHandler();
