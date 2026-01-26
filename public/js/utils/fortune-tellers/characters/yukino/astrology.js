/**
 * 西洋占星術の知識
 * 笹岡雪乃の占星術に関する機能
 */
import { randomChoice } from '../../utils/helpers.js';

/**
 * 星座の情報
 */
const zodiacSigns = {
  '牡羊座': { element: '火', quality: '活動', ruler: '火星' },
  '牡牛座': { element: '土', quality: '固定', ruler: '金星' },
  '双子座': { element: '風', quality: '柔軟', ruler: '水星' },
  '蟹座': { element: '水', quality: '活動', ruler: '月' },
  '獅子座': { element: '火', quality: '固定', ruler: '太陽' },
  '乙女座': { element: '土', quality: '柔軟', ruler: '水星' },
  '天秤座': { element: '風', quality: '活動', ruler: '金星' },
  '蠍座': { element: '水', quality: '固定', ruler: '冥王星' },
  '射手座': { element: '火', quality: '柔軟', ruler: '木星' },
  '山羊座': { element: '土', quality: '活動', ruler: '土星' },
  '水瓶座': { element: '風', quality: '固定', ruler: '天王星' },
  '魚座': { element: '水', quality: '柔軟', ruler: '海王星' },
};

/**
 * 占星術のアドバイステンプレート
 */
const astrologyAdvice = [
  'あなたの星座は{sign}ですね。{element}のエレメントを持つ{sign}は、{quality}の性質があります。',
  '{sign}の支配星は{ruler}です。この星の影響を受けて、あなたは{quality}な性格を持っています。',
  '占星術によれば、{sign}の人は{element}のエレメントの力を借りて、運命を切り開いていけます。',
];

/**
 * 占星術モジュールクラス
 */
export class AstrologyModule {
  /**
   * 星座の情報を取得
   * @param {string} sign - 星座名
   * @returns {Object|null} 星座情報
   */
  getZodiacInfo(sign) {
    return zodiacSigns[sign] || null;
  }

  /**
   * すべての星座を取得
   * @returns {Array<string>} 星座名の配列
   */
  getAllSigns() {
    return Object.keys(zodiacSigns);
  }

  /**
   * 星座に基づくアドバイスを生成
   * @param {string} sign - 星座名
   * @returns {string} アドバイステキスト
   */
  generateAdvice(sign) {
    const info = this.getZodiacInfo(sign);
    if (!info) {
      return '申し訳ございませんが、その星座の情報が見つかりませんでした。';
    }

    const template = randomChoice(astrologyAdvice);
    return template
      .replace('{sign}', sign)
      .replace('{element}', info.element)
      .replace('{quality}', info.quality)
      .replace('{ruler}', info.ruler);
  }

  /**
   * エレメントに基づくアドバイスを生成
   * @param {string} element - エレメント（火、土、風、水）
   * @returns {string} アドバイステキスト
   */
  generateElementAdvice(element) {
    const elementMessages = {
      '火': '火のエレメントを持つあなたは、情熱的で行動力があります。',
      '土': '土のエレメントを持つあなたは、現実的で安定を求めます。',
      '風': '風のエレメントを持つあなたは、知性的でコミュニケーション能力に優れています。',
      '水': '水のエレメントを持つあなたは、感情的で直感的な力を持っています。',
    };

    return elementMessages[element] || 'エレメントの情報が見つかりませんでした。';
  }

  /**
   * ユーザーのメッセージから星座を推測してアドバイスを生成
   * @param {string} userMessage - ユーザーのメッセージ
   * @returns {string} アドバイステキスト
   */
  generateResponse(userMessage = '') {
    // メッセージから星座を検出
    for (const sign of this.getAllSigns()) {
      if (userMessage.includes(sign)) {
        return this.generateAdvice(sign);
      }
    }

    // 星座が見つからない場合、一般的なアドバイス
    return '占星術によれば、すべての人には独自の星の配置があります。あなたの星座を知ることで、より深い洞察が得られます。';
  }
}

/**
 * 占星術モジュールのインスタンスを作成
 * @returns {AstrologyModule} モジュールインスタンス
 */
export function createAstrologyModule() {
  return new AstrologyModule();
}

