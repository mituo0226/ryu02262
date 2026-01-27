/**
 * chat-utils.js
 * チャットシステムのユーティリティ関数
 * 
 * 機能:
 * - デバッグログ出力
 * - URLパラメータ取得
 * - userIdバリデーション
 */

// ============================================
// デバッグ設定
// ============================================
const DEBUG_MODE = true; // デバッグ用: 本番では false に設定

// ============================================
// タイムライン記録機能
// ============================================
if (!window._debugTimeline) {
    window._debugTimeline = [];
    window._timelineStartTime = Date.now();
    window._testMode = false; // テストモードフラグ
}

/**
 * タイムラインにエントリを追加
 * @param {string} source - ログソース（chat-engine.js など）
 * @param {string} message - ログメッセージ
 */
function addToTimeline(source, message) {
    if (!window._testMode) return; // テストモード時のみ記録
    
    const elapsed = Date.now() - window._timelineStartTime;
    window._debugTimeline.push({
        timestamp: new Date().toLocaleTimeString('ja-JP', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }),
        elapsed: `${elapsed}ms`,
        source: source,
        message: typeof message === 'string' ? message : JSON.stringify(message)
    });
}

/**
 * デバッグログ出力（本番では無効化）
 * @param {...any} args - console.logに渡す引数
 */
function debugLog(...args) {
    if (DEBUG_MODE) {
        const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
        addToTimeline('debugLog', message);
        console.log(...args);
    }
}

// ============================================
// ユーティリティ関数
// ============================================

/**
 * URLパラメータを取得（キャッシュ付き）
 * @returns {URLSearchParams} URLパラメータ
 */
function getUrlParams() {
    if (!window._chatUrlParams) {
        window._chatUrlParams = new URLSearchParams(window.location.search);
    }
    return window._chatUrlParams;
}

/**
 * userIdを数値型にパース（バリデーション付き）
 * @param {any} value - パース対象の値
 * @returns {number|null} 有効なuserIdまたはnull
 */
function parseUserId(value) {
    // 数値型の場合
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value;
    }

    // 文字列型の場合
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }
    }

    return null;
}
