/**
 * 母性的な温かい応答
 * 水野ソラの温かく母性的な応答機能
 */
import { randomChoice, replaceTemplate } from '../../utils/helpers.js';

/**
 * 母性的な応答テンプレート
 */
const motherlyResponses = [
  '大丈夫ですよ。あなたは一人じゃありません。一緒に考えていきましょう。',
  '無理をしなくても大丈夫です。あなたのペースで、ゆっくりと進んでいけばいいのです。',
  'どうか、自分を責めないでください。あなたは、あなたのままで十分に素晴らしいのです。',
  '心配しないでください。どんな困難も、必ず乗り越えられます。私は信じています。',
  'あなたの気持ち、よくわかります。一人で抱え込まないで、話してください。',
  '大丈夫です。焦らなくてもいいのです。一歩ずつ、着実に進んでいきましょう。',
];

/**
 * 励ましの言葉
 */
const encouragingWords = [
  'あなたは強い人です。きっと乗り越えられます。',
  'あなたには、困難を乗り越える力があります。',
  'あなたは一人じゃありません。私がついています。',
  'あなたの努力は、必ず報われます。',
  'あなたは、あなたのままで素晴らしいのです。',
];

/**
 * 共感の言葉
 */
const empatheticWords = [
  'その気持ち、よくわかります。',
  'あなたの気持ち、痛いほどわかります。',
  'その辛さ、私も経験したことがあります。',
  'あなたの苦しみ、よく理解できます。',
];

/**
 * 母性的な応答モジュールクラス
 */
export class MotherlyModule {
  /**
   * 母性的な応答を生成
   * @param {string} userMessage - ユーザーのメッセージ
   * @returns {string} 応答テキスト
   */
  generateResponse(userMessage = '') {
    // ユーザーのメッセージの内容に応じて応答を選択
    const lowerMessage = userMessage.toLowerCase();
    
    // 悩みや困っている様子を検出
    if (lowerMessage.includes('困') || lowerMessage.includes('悩') || lowerMessage.includes('辛')) {
      const empathetic = randomChoice(empatheticWords);
      const response = randomChoice(motherlyResponses);
      return `${empathetic} ${response}`;
    }
    
    // 不安や心配を検出
    if (lowerMessage.includes('不安') || lowerMessage.includes('心配') || lowerMessage.includes('怖')) {
      const encouraging = randomChoice(encouragingWords);
      const response = randomChoice(motherlyResponses);
      return `${response} ${encouraging}`;
    }
    
    // デフォルトの応答
    return randomChoice(motherlyResponses);
  }

  /**
   * 励ましの言葉を追加
   * @param {string} baseResponse - ベースとなる応答
   * @returns {string} 励ましの言葉を含む応答
   */
  addEncouragement(baseResponse) {
    const encouragement = randomChoice(encouragingWords);
    return `${baseResponse}\n\n${encouragement}`;
  }

  /**
   * 共感の言葉を追加
   * @param {string} baseResponse - ベースとなる応答
   * @returns {string} 共感の言葉を含む応答
   */
  addEmpathy(baseResponse) {
    const empathy = randomChoice(empatheticWords);
    return `${empathy} ${baseResponse}`;
  }

  /**
   * 温かい応答を生成（複数の要素を組み合わせ）
   * @param {string} userMessage - ユーザーのメッセージ
   * @returns {string} 応答テキスト
   */
  generateWarmResponse(userMessage = '') {
    const baseResponse = this.generateResponse(userMessage);
    
    // ランダムに励ましや共感を追加
    if (Math.random() > 0.5) {
      return this.addEncouragement(baseResponse);
    }
    
    return baseResponse;
  }
}

/**
 * 母性的な応答モジュールのインスタンスを作成
 * @returns {MotherlyModule} モジュールインスタンス
 */
export function createMotherlyModule() {
  return new MotherlyModule();
}

