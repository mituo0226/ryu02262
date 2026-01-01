/**
 * guest-limit-manager.js
 * ゲストモードでのメッセージ制限管理（共通ロジック）
 * 
 * 全ての鑑定士に共通する「10通到達時の登録ボタン表示」を管理
 * キャラクター固有の処理は各キャラクターハンドラーの handleGuestLimit に委譲
 */

const GuestLimitManager = {
    /**
     * ゲストメッセージ制限をチェックし、必要に応じて登録ボタンを表示
     * @param {string} character - キャラクターID
     * @param {Object} apiResponse - API応答データ（オプション）
     * @returns {boolean} 処理が実行されたか
     */
    checkAndHandleGuestLimit(character, apiResponse = null) {
        // 登録済みユーザーはチェック不要
        if (window.AuthState && window.AuthState.isRegistered()) {
            return false;
        }

        // ゲストメッセージ数を取得
        const guestCount = ChatData.getGuestMessageCount(character);
        const limit = ChatData.GUEST_MESSAGE_LIMIT;

        console.log('[ゲスト制限管理] チェック:', {
            character,
            guestCount,
            limit,
            ritualConsentShown: ChatData.ritualConsentShown
        });

        // 10通目に到達していない場合は何もしない
        if (guestCount < limit) {
            return false;
        }

        // 既に登録ボタンが表示済みの場合はスキップ
        if (ChatData.ritualConsentShown) {
            console.log('[ゲスト制限管理] 既に登録ボタン表示済み - スキップ');
            return false;
        }

        // キャラクター固有のハンドラーを取得
        const handler = this.getCharacterHandler(character);
        
        if (handler && typeof handler.handleGuestLimit === 'function') {
            console.log('[ゲスト制限管理] キャラクターハンドラーの handleGuestLimit を呼び出します:', character);
            const handled = handler.handleGuestLimit(guestCount, apiResponse);
            
            if (handled) {
                console.log('[ゲスト制限管理] キャラクターハンドラーで処理完了:', character);
                return true;
            }
        }

        // ハンドラーがない、または処理されなかった場合は共通処理を実行
        console.log('[ゲスト制限管理] 共通処理を実行:', character);
        return this.handleCommonGuestLimit(character, guestCount);
    },

    /**
     * キャラクター固有のハンドラーを取得
     * @param {string} character - キャラクターID
     * @returns {Object|null} キャラクターハンドラー
     */
    getCharacterHandler(character) {
        const handlers = {
            'kaede': window.KaedeHandler,
            'yukino': window.YukinoHandler,
            'sora': window.SoraHandler,
            'kaon': window.KaonHandler
        };

        return handlers[character] || null;
    },

    /**
     * 共通の10通到達時の処理（ハンドラーがない場合のフォールバック）
     * @param {string} character - キャラクターID
     * @param {number} guestCount - ゲストメッセージ数
     * @returns {boolean} 処理が実行されたか
     */
    handleCommonGuestLimit(character, guestCount) {
        console.log('[ゲスト制限管理] 共通処理: 10通目到達', { character, guestCount });

        // システムメッセージを表示
        const characterName = ChatData.characterInfo[character]?.name || '鑑定士';
        ChatUI.addMessage('error', 'ユーザー登録への同意が検出されました。ボタンが表示されます。', 'システム');

        // フラグを保存
        sessionStorage.setItem('acceptedGuardianRitual', 'true');
        ChatData.ritualConsentShown = true;

        // 登録ボタンを表示
        setTimeout(() => {
            ChatUI.showRitualConsentButtons();
        }, 2000);

        return true;
    }
};

// グローバルスコープに公開
window.GuestLimitManager = GuestLimitManager;
