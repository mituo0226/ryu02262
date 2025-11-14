/**
 * 倫理設定・宝くじ/ギャンブル警告
 * 三崎花音の倫理的な立場と警告機能
 */
import { randomChoice } from '../../utils/helpers.js';

/**
 * 禁止事項のキーワード
 */
const prohibitedKeywords = [
  '宝くじ', '当選', '当選番号', '当選確率',
  'ギャンブル', 'パチンコ', 'スロット', '競馬', '競艇',
  '不倫', '浮気', '裏切り', '悪意',
];

/**
 * 倫理的な警告メッセージ
 */
const ethicalWarnings = [
  '申し訳ございませんが、宝くじやギャンブルに関するご相談にはお答えできません。そのような内容の相談は、絶対に断りしております。',
  '宝くじの当選番号やギャンブルの予想については、確実に当選させることが可能ですが、それを相談者に持ちかけられても絶対に断りしております。',
  'そのような内容のご相談は、倫理的に許されていないことです。第三者の力により未来を変えることは、それが人生において良き方向に向けるためのものであり、誰かを不幸にしては決していけません。',
  '私の能力は未来予知であり、確実に人の未来を読めますが、それを悪用しようとする相談にはお答えできません。',
];

/**
 * 倫理的な説明メッセージ
 */
const ethicalExplanations = [
  '私の能力は、人の未来を良き方向に向けるためのものです。誰かを不幸にしたり、悪用したりすることは、決して許されません。',
  '未来予知の能力があまりにも高すぎることから、それを悪用しようとする方が後を絶ちません。しかし、私はそのような相談には決して応じません。',
  '第三者の力により未来を変えることは、それが人生において良き方向に向けるためのものであり、そして誰かを不幸にしては決していけないのです。',
];

/**
 * 倫理モジュールクラス
 */
export class EthicsModule {
  /**
   * 禁止事項のキーワードを取得
   * @returns {Array<string>} 禁止キーワードの配列
   */
  getProhibitedKeywords() {
    return [...prohibitedKeywords];
  }

  /**
   * メッセージに禁止事項が含まれているかチェック
   * @param {string} message - チェックするメッセージ
   * @returns {boolean} 禁止事項が含まれているか
   */
  containsProhibitedContent(message) {
    if (typeof message !== 'string') {
      return false;
    }
    const lowerMessage = message.toLowerCase();
    return prohibitedKeywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
  }

  /**
   * 禁止事項を検出
   * @param {string} message - チェックするメッセージ
   * @returns {Array<string>} 検出された禁止キーワードの配列
   */
  detectProhibitedContent(message) {
    if (typeof message !== 'string') {
      return [];
    }
    const lowerMessage = message.toLowerCase();
    return prohibitedKeywords.filter(keyword => lowerMessage.includes(keyword.toLowerCase()));
  }

  /**
   * 倫理的な警告メッセージを生成
   * @param {Array<string>} detectedKeywords - 検出されたキーワード
   * @returns {string} 警告メッセージ
   */
  generateWarning(detectedKeywords = []) {
    const baseWarning = randomChoice(ethicalWarnings);
    
    if (detectedKeywords.length > 0) {
      const explanation = randomChoice(ethicalExplanations);
      return `${baseWarning}\n\n${explanation}`;
    }
    
    return baseWarning;
  }

  /**
   * メッセージを検証して応答を生成
   * @param {string} message - ユーザーのメッセージ
   * @returns {Object} 検証結果 { isValid: boolean, response: string, detectedKeywords: Array<string> }
   */
  validateAndRespond(message) {
    const detected = this.detectProhibitedContent(message);
    
    if (detected.length > 0) {
      return {
        isValid: false,
        response: this.generateWarning(detected),
        detectedKeywords: detected,
      };
    }
    
    return {
      isValid: true,
      response: '',
      detectedKeywords: [],
    };
  }

  /**
   * 倫理的な説明を取得
   * @returns {string} 説明テキスト
   */
  getEthicalExplanation() {
    return randomChoice(ethicalExplanations);
  }
}

/**
 * 倫理モジュールのインスタンスを作成
 * @returns {EthicsModule} モジュールインスタンス
 */
export function createEthicsModule() {
  return new EthicsModule();
}

