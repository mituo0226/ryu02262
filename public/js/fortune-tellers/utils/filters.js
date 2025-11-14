/**
 * キーワードフィルター
 * テキストから特定のキーワードを検出・抽出する機能
 */

/**
 * キーワードマッチング結果
 */
export class KeywordMatch {
  constructor(keyword, matched, context = '') {
    this.keyword = keyword;
    this.matched = matched;
    this.context = context;
  }
}

/**
 * キーワードフィルタークラス
 */
export class KeywordFilter {
  constructor(keywords = []) {
    this.keywords = keywords.map(k => normalizeKeyword(k));
  }

  /**
   * キーワードを正規化
   * @param {string} keyword - 正規化するキーワード
   * @returns {string} 正規化されたキーワード
   */
  normalizeKeyword(keyword) {
    if (typeof keyword !== 'string') {
      return '';
    }
    return keyword.toLowerCase().trim();
  }

  /**
   * テキストにキーワードが含まれているかチェック
   * @param {string} text - チェックするテキスト
   * @returns {boolean} キーワードが含まれているか
   */
  hasKeyword(text) {
    if (typeof text !== 'string') {
      return false;
    }
    const normalizedText = this.normalizeKeyword(text);
    return this.keywords.some(keyword => normalizedText.includes(keyword));
  }

  /**
   * マッチしたキーワードを取得
   * @param {string} text - チェックするテキスト
   * @returns {Array<string>} マッチしたキーワードの配列
   */
  getMatchedKeywords(text) {
    if (typeof text !== 'string') {
      return [];
    }
    const normalizedText = this.normalizeKeyword(text);
    return this.keywords.filter(keyword => normalizedText.includes(keyword));
  }

  /**
   * キーワードを追加
   * @param {string|Array<string>} keywords - 追加するキーワード
   */
  addKeywords(keywords) {
    const keywordArray = Array.isArray(keywords) ? keywords : [keywords];
    keywordArray.forEach(keyword => {
      const normalized = this.normalizeKeyword(keyword);
      if (normalized && !this.keywords.includes(normalized)) {
        this.keywords.push(normalized);
      }
    });
  }

  /**
   * キーワードを削除
   * @param {string} keyword - 削除するキーワード
   */
  removeKeyword(keyword) {
    const normalized = this.normalizeKeyword(keyword);
    this.keywords = this.keywords.filter(k => k !== normalized);
  }
}

/**
 * キーワードを正規化（内部関数）
 */
function normalizeKeyword(keyword) {
  if (typeof keyword !== 'string') {
    return '';
  }
  return keyword.toLowerCase().trim();
}

/**
 * 不適切なキーワードのフィルター
 */
export const inappropriateKeywords = [
  '宝くじ', '当選', '当選番号', '当選確率',
  'ギャンブル', 'パチンコ', 'スロット', '競馬', '競艇',
  '不倫', '浮気', '裏切り', '悪意',
  '破壊', '傷害', '殺害', '自殺',
];

/**
 * 不適切なキーワードフィルターのインスタンスを作成
 * @returns {KeywordFilter} フィルターインスタンス
 */
export function createInappropriateFilter() {
  return new KeywordFilter(inappropriateKeywords);
}

