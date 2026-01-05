/**
 * guest-limit-manager.js
 * 【削除済み】10通制限が廃止されたため、このファイルは無効化されました
 * 後方互換性のため、空のオブジェクトを公開します
 */

const GuestLimitManager = {
    /**
     * 【削除済み】10通制限が廃止されたため、常にfalseを返します
     */
    checkAndHandleGuestLimit(character, apiResponse = null) {
        // 10通制限は廃止されました
        return false;
    },

    /**
     * 【削除済み】10通制限が廃止されたため、常にnullを返します
     */
    getCharacterHandler(character) {
        return null;
    },

    /**
     * 【削除済み】10通制限が廃止されたため、常にfalseを返します
     */
    handleCommonGuestLimit(character, guestCount) {
        // 10通制限は廃止されました
        return false;
    }
};

// グローバルスコープに公開（後方互換性のため）
window.GuestLimitManager = GuestLimitManager;
