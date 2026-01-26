/**
 * ヘルパー関数
 * 共通で使用するユーティリティ関数
 */

/**
 * ランダムな要素を配列から選択
 * @param {Array} array - 選択元の配列
 * @returns {*} ランダムに選択された要素
 */
export function randomChoice(array) {
  if (!Array.isArray(array) || array.length === 0) {
    return null;
  }
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 複数のランダムな要素を配列から選択
 * @param {Array} array - 選択元の配列
 * @param {number} count - 選択する数
 * @returns {Array} ランダムに選択された要素の配列
 */
export function randomChoices(array, count) {
  if (!Array.isArray(array) || array.length === 0 || count <= 0) {
    return [];
  }
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * 文字列を正規化（小文字化、空白削除）
 * @param {string} str - 正規化する文字列
 * @returns {string} 正規化された文字列
 */
export function normalizeString(str) {
  if (typeof str !== 'string') {
    return '';
  }
  return str.toLowerCase().trim().replace(/\s+/g, '');
}

/**
 * テンプレート文字列を置換
 * @param {string} template - テンプレート文字列（{key}形式）
 * @param {Object} values - 置換する値のオブジェクト
 * @returns {string} 置換された文字列
 */
export function replaceTemplate(template, values = {}) {
  if (typeof template !== 'string') {
    return '';
  }
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key] !== undefined ? String(values[key]) : match;
  });
}

/**
 * 配列をシャッフル
 * @param {Array} array - シャッフルする配列
 * @returns {Array} シャッフルされた新しい配列
 */
export function shuffleArray(array) {
  if (!Array.isArray(array)) {
    return [];
  }
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 日付をフォーマット
 * @param {Date} date - フォーマットする日付
 * @param {string} format - フォーマット文字列
 * @returns {string} フォーマットされた日付文字列
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  if (!(date instanceof Date)) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day);
}

